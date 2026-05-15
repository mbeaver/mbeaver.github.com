"use strict";
(() => {
  // src/weather.ts
  function defaultWeather() {
    return {
      temp: 68,
      windSpeed: 8,
      windDir: 225,
      cloudCover: 25,
      precip: 0,
      code: 1,
      isDay: 1,
      lat: 40,
      lon: -74
    };
  }
  function defaultForecast() {
    const today = /* @__PURE__ */ new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        code: 1,
        tempMax: 72,
        tempMin: 58,
        precipSum: 0,
        windMax: 10
      };
    });
  }
  async function fetchWeather(lat, lon) {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      `?latitude=${lat}&longitude=${lon}`,
      "&current=temperature_2m,precipitation,weather_code,cloud_cover",
      ",wind_speed_10m,wind_direction_10m,is_day",
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
      "&forecast_days=7",
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto"
    ].join("");
    const r = await fetch(url);
    const d = await r.json();
    const cur = d.current;
    const daily = d.daily;
    const current = {
      temp: cur.temperature_2m,
      windSpeed: cur.wind_speed_10m,
      windDir: cur.wind_direction_10m,
      cloudCover: cur.cloud_cover,
      precip: cur.precipitation,
      code: cur.weather_code,
      isDay: cur.is_day,
      lat,
      lon
    };
    const forecast = daily.time.map((date, i) => ({
      date,
      code: daily.weather_code[i],
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      precipSum: daily.precipitation_sum[i],
      windMax: daily.wind_speed_10m_max[i]
    }));
    return { current, forecast };
  }
  async function reverseGeocode(lat, lon) {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    const city = d.address?.city ?? d.address?.town ?? d.address?.village ?? "";
    const state = d.address?.state ?? "";
    return city ? `${city}${state ? ", " + state : ""}` : `${lat.toFixed(2)}\xB0, ${lon.toFixed(2)}\xB0`;
  }
  function getGPSLocation() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("no-geo"));
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8e3 });
    });
  }
  async function getIPLocation() {
    const r = await fetch("https://ipwho.is/");
    const d = await r.json();
    if (!d.success || !d.latitude) throw new Error("ip-geo-failed");
    return {
      lat: d.latitude,
      lon: d.longitude,
      city: d.city ?? "",
      region: d.region ?? ""
    };
  }
  async function searchLocations(query) {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    return d.map((item) => {
      const addr = item.address ?? {};
      const city = addr.city ?? addr.town ?? addr.village ?? "";
      const state = addr.state ?? "";
      const country = addr.country ?? "";
      const parts = [city, state, country].filter(Boolean);
      return {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        place: parts.length ? parts.join(", ") : item.display_name,
        source: "hardcoded"
      };
    });
  }
  async function resolveLocation() {
    try {
      const pos = await getGPSLocation();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const place = await reverseGeocode(lat, lon);
      return { lat, lon, place, source: "gps" };
    } catch (gpsErr) {
      console.info("GPS unavailable:", gpsErr.message, "\u2014 trying IP geolocation");
    }
    try {
      const ip = await getIPLocation();
      const place = ip.city ? `${ip.city}${ip.region ? ", " + ip.region : ""}` : `${ip.lat.toFixed(2)}\xB0, ${ip.lon.toFixed(2)}\xB0`;
      return { lat: ip.lat, lon: ip.lon, place, source: "ip" };
    } catch (ipErr) {
      console.info("IP geolocation unavailable:", ipErr.message, "\u2014 using default location");
    }
    return { lat: 35.9049, lon: -78.7003, place: "Raleigh, NC", source: "hardcoded" };
  }

  // src/sketch.ts
  var STRIP_H = 130;
  function startSketch(w, forecast, locStr, callbacks) {
    let _applyFn = null;
    new p5((sk) => {
      const W = 900, H = 560;
      const GND = H * 0.615;
      let _sf = 1, _oy = 0, _ox = 0;
      let _isPortrait = false;
      let temp = w.temp;
      let windSpeed = w.windSpeed;
      let windDir = w.windDir;
      let cloudCover = w.cloudCover;
      let code = w.code;
      let isDay = w.isDay;
      let isSnow = code >= 71 && code <= 77 || code === 85 || code === 86;
      let isRain = !isSnow && (code >= 51 && code <= 67 || code >= 80 && code <= 82);
      let isStorm = code >= 95 && code <= 99;
      const month = (/* @__PURE__ */ new Date()).getMonth();
      function computeSeason(lat) {
        const south = lat < 0;
        const mAdj = south ? (month + 6) % 12 : month;
        return mAdj <= 1 || mAdj === 11 ? "winter" : mAdj <= 4 ? "spring" : mAdj <= 7 ? "summer" : "fall";
      }
      let season = computeSeason(w.lat || 0);
      function localSolarTime(lon) {
        const now = /* @__PURE__ */ new Date();
        const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
        return (utcH + lon / 15 + 24) % 24;
      }
      let tod = localSolarTime(w.lon || 0);
      let windRad = windDir * Math.PI / 180;
      let cloudDriftX = -Math.sin(windRad);
      let cloudDriftY = Math.cos(windRad) * 0.18;
      let wf = Math.min(windSpeed / 25, 1.4);
      let _locStr = locStr;
      let _forecast = forecast;
      let _selectedTile = 0;
      const particles = [];
      const clouds = [];
      const grass = [];
      const gLeaves = [];
      let t = 0;
      let ltTimer = 0;
      sk.setup = () => {
        const cnv = sk.createCanvas(sk.windowWidth, sk.windowHeight);
        cnv.parent(document.body);
        sk.frameRate(30);
        sk.noSmooth();
        const NPART = isRain ? 280 : isSnow ? 180 : 0;
        for (let i = 0; i < NPART; i++) particles.push(mkParticle(true));
        const nc = Math.round(cloudCover / 18) + (isRain || isSnow ? 2 : 0) + (isStorm ? 2 : 0);
        for (let i = 0; i < Math.min(nc, 7); i++) {
          clouds.push({
            x: sk.random(W),
            y: sk.random(H * 0.05, H * 0.28),
            w: sk.random(130, 260),
            h: sk.random(45, 85),
            spd: sk.random(0.25, 0.65) * Math.max(windSpeed / 12, 0.15),
            op: sk.random(180, 245)
          });
        }
        for (let i = 0; i < 150; i++) {
          const gx = sk.random(W);
          if (gx > W * 0.36 && gx < W * 0.64) continue;
          grass.push({
            x: gx,
            y: GND + sk.random(0, 22),
            h: sk.random(9, 22),
            ph: sk.random(sk.TWO_PI),
            sw: sk.random(1, 2.5)
          });
        }
        if (season === "fall") {
          for (let i = 0; i < 50; i++) {
            gLeaves.push({
              x: sk.random(W),
              y: GND + sk.random(6, 35),
              sz: sk.random(7, 13),
              rot: sk.random(sk.TWO_PI),
              spd: sk.random(0.02, 0.1) * wf + 0.02,
              col: sk.random([
                [190, 75, 20],
                [210, 110, 25],
                [230, 150, 35],
                [165, 50, 15],
                [200, 60, 10]
              ])
            });
          }
        }
      };
      sk.windowResized = () => {
        sk.resizeCanvas(sk.windowWidth, sk.windowHeight);
      };
      function handleTap(x, y) {
        const sy = sk.windowHeight - STRIP_H;
        const infoH = 38;
        if (y >= sy && y < sy + infoH) {
          callbacks?.onInfoBarClick?.();
        } else if (y >= sy + infoH) {
          const i = Math.floor(x / (sk.windowWidth / 7));
          if (i >= 0 && i < 7) callbacks?.onForecastTileClick?.(i);
        }
      }
      sk.mousePressed = () => {
        handleTap(sk.mouseX, sk.mouseY);
      };
      sk.touchStarted = () => {
        const t0 = sk.touches[0];
        if (t0) handleTap(t0.x, t0.y);
        return false;
      };
      sk.mouseMoved = () => {
        document.body.style.cursor = sk.mouseY >= sk.windowHeight - STRIP_H ? "pointer" : "default";
      };
      function sceneTransform() {
        const availH = sk.windowHeight - STRIP_H;
        _isPortrait = sk.windowWidth / availH < 0.85;
        const sfx = sk.windowWidth / (_isPortrait ? 700 : W);
        const sfy = availH / H;
        _sf = Math.min(sfx, sfy);
        _ox = (sk.windowWidth - W * _sf) / 2;
        _oy = _isPortrait ? availH * 0.65 - GND * _sf : (availH - H * _sf) / 2;
        sk.translate(_ox, _oy);
        sk.scale(_sf, _sf);
      }
      sk.draw = () => {
        t++;
        sk.background(17);
        sk.push();
        sceneTransform();
        drawSky();
        drawCelestial();
        drawClouds();
        if (isStorm) drawLightningMaybe();
        drawGround();
        drawTree(230, GND);
        drawTree(670, GND);
        drawHouse();
        if (!_isPortrait) {
          drawThermometer();
          drawWindGauge();
        }
        drawGrassLayer();
        drawPrecipitation();
        if (season === "fall") drawGroundLeaves();
        sk.pop();
        if (_isPortrait) {
          drawThermometerPortrait();
          drawWindGaugePortrait();
        }
        drawForecastStrip();
      };
      function drawSky() {
        let tc, bc;
        const night = isDay === 0;
        if (night || tod < 5 || tod > 22.5) {
          tc = sk.color(4, 7, 28);
          bc = sk.color(12, 18, 48);
        } else if (tod < 6.5) {
          const f = (tod - 5) / 1.5;
          tc = sk.lerpColor(sk.color(4, 7, 28), sk.color(35, 55, 115), f);
          bc = sk.lerpColor(sk.color(12, 18, 48), sk.color(210, 110, 55), f);
        } else if (tod < 8) {
          const f = (tod - 6.5) / 1.5;
          tc = sk.lerpColor(sk.color(35, 55, 115), sk.color(75, 135, 215), f);
          bc = sk.lerpColor(sk.color(210, 110, 55), sk.color(175, 205, 240), f);
        } else if (tod < 17) {
          if (cloudCover > 65) {
            tc = sk.color(115, 125, 145);
            bc = sk.color(155, 162, 172);
          } else {
            tc = sk.color(75, 135, 215);
            bc = sk.color(175, 205, 240);
          }
        } else if (tod < 19.5) {
          const f = (tod - 17) / 2.5;
          tc = sk.lerpColor(sk.color(75, 135, 215), sk.color(38, 55, 115), f);
          bc = sk.lerpColor(sk.color(175, 205, 240), sk.color(215, 95, 45), f);
        } else if (tod < 22) {
          const f = (tod - 19.5) / 2.5;
          tc = sk.lerpColor(sk.color(38, 55, 115), sk.color(4, 7, 28), f);
          bc = sk.lerpColor(sk.color(215, 95, 45), sk.color(12, 18, 48), f);
        } else {
          tc = sk.color(4, 7, 28);
          bc = sk.color(12, 18, 48);
        }
        const skyTop = Math.floor(-Math.max(0, _oy) / _sf);
        for (let y = skyTop; y < GND; y++) {
          sk.stroke(sk.lerpColor(tc, bc, Math.max(0, y) / GND));
          sk.line(0, y, W, y);
        }
        sk.noStroke();
        const nightness = nightFactor();
        if (nightness > 0) {
          for (let i = 0; i < 90; i++) {
            const sx = (i * 139.7 + 37) % W;
            const starSpan = GND * 0.85 - skyTop;
            const sy = skyTop + (i * 93.1 + 19) % starSpan;
            const twk = 0.65 + 0.35 * Math.sin(t * 0.04 + i * 2.3);
            sk.fill(255, 255, 220, nightness * twk * 255);
            sk.noStroke();
            sk.ellipse(sx, sy, 2, 2);
          }
        }
      }
      function nightFactor() {
        if (isDay === 0) return 1;
        if (tod < 5 || tod > 22.5) return 1;
        if (tod < 6.5) return 1 - (tod - 5) / 1.5;
        if (tod > 21.5) return (tod - 21.5) / 1;
        return 0;
      }
      function drawCelestial() {
        const dayVisible = isDay === 1 && tod >= 6 && tod <= 20;
        const nightVisible = isDay === 0 || tod < 6 || tod > 20;
        const cx = W / 2;
        const sunR = 52, moonR = 19, margin = 8;
        const visLeft = _ox < 0 ? -_ox / _sf : 0;
        const visRight = _ox < 0 ? (sk.windowWidth - _ox) / _sf : W;
        const sunRx = Math.min(W * 0.44, Math.min(
          cx - visLeft - sunR - margin,
          visRight - cx - sunR - margin
        ));
        const moonRx = Math.min(W * 0.4, Math.min(
          cx - visLeft - moonR - margin,
          visRight - cx - moonR - margin
        ));
        if (dayVisible) {
          const prog = (tod - 6) / 14;
          const ang = sk.map(prog, 0, 1, sk.PI, 0);
          const rx = sunRx, ry = GND * 0.84;
          const sx = cx + rx * Math.cos(ang);
          const sy = GND - ry * Math.sin(ang);
          for (let r = 70; r > 0; r -= 8) {
            sk.fill(255, 235, 100, sk.map(r, 0, 70, 90, 0));
            sk.noStroke();
            sk.ellipse(sx, sy, r * 2, r * 2);
          }
          sk.fill(255, 218, 50);
          sk.noStroke();
          sk.ellipse(sx, sy, 52, 52);
          sk.stroke(255, 230, 80, 160);
          sk.strokeWeight(1.8);
          for (let a = 0; a < sk.TWO_PI; a += sk.PI / 7) {
            const rp = 3 * Math.sin(t * 0.025 + a);
            sk.line(
              sx + Math.cos(a) * (30 + rp),
              sy + Math.sin(a) * (30 + rp),
              sx + Math.cos(a) * (46 + rp),
              sy + Math.sin(a) * (46 + rp)
            );
          }
          sk.noStroke();
        }
        if (nightVisible) {
          let prog;
          if (tod >= 20) prog = (tod - 20) / 12;
          else prog = (tod + 4) / 12;
          prog = sk.constrain(prog, 0, 1);
          const ang = sk.map(prog, 0, 1, sk.PI, 0);
          const rx = moonRx, ry = GND * 0.76;
          const mx = cx + rx * Math.cos(ang);
          const my = GND - ry * Math.sin(ang);
          for (let r = 45; r > 0; r -= 7) {
            sk.fill(180, 210, 255, sk.map(r, 0, 45, 55, 0));
            sk.noStroke();
            sk.ellipse(mx, my, r * 2, r * 2);
          }
          {
            const ctx = sk.drawingContext;
            ctx.save();
            ctx.beginPath();
            ctx.arc(mx, my, 19, 0, Math.PI * 2);
            ctx.clip();
            ctx.beginPath();
            ctx.arc(mx, my, 19, 0, Math.PI * 2, false);
            ctx.arc(mx + 11, my, 16, 0, Math.PI * 2, true);
            ctx.fillStyle = "rgba(238,244,215,1)";
            ctx.fill("evenodd");
            ctx.restore();
          }
        }
      }
      function drawClouds() {
        for (const c of clouds) {
          c.x += cloudDriftX * c.spd;
          c.y += cloudDriftY * c.spd * 0.1;
          if (c.x > W + c.w) c.x = -c.w;
          if (c.x < -c.w) c.x = W + c.w;
          drawCloud(c.x, c.y, c.w, c.h, c.op);
        }
      }
      function drawCloud(x, y, cw, ch, op) {
        const dark = isRain || isSnow || isStorm;
        const r = dark ? 95 : 238;
        const g = dark ? 98 : 238;
        const b = dark ? 118 : 252;
        sk.fill(r, g, b, op);
        sk.noStroke();
        sk.ellipse(x, y, cw, ch);
        sk.ellipse(x - cw * 0.26, y + ch * 0.12, cw * 0.62, ch * 0.78);
        sk.ellipse(x + cw * 0.26, y + ch * 0.12, cw * 0.62, ch * 0.78);
        sk.ellipse(x - cw * 0.08, y - ch * 0.22, cw * 0.48, ch * 0.66);
        sk.ellipse(x + cw * 0.18, y - ch * 0.16, cw * 0.42, ch * 0.58);
      }
      function drawGround() {
        let gt, gb;
        const snowy = isSnow || season === "winter" && temp < 34;
        if (snowy) {
          gt = sk.color(238, 244, 255);
          gb = sk.color(198, 212, 240);
        } else if (season === "fall") {
          gt = sk.color(95, 85, 38);
          gb = sk.color(72, 65, 28);
        } else if (season === "spring") {
          gt = sk.color(78, 158, 58);
          gb = sk.color(48, 118, 38);
        } else {
          gt = sk.color(55, 135, 45);
          gb = sk.color(38, 105, 32);
        }
        const gndBot = Math.ceil(H + Math.max(0, _oy) / _sf);
        for (let y = GND; y <= gndBot; y++) {
          sk.stroke(sk.lerpColor(gt, gb, Math.min(1, (y - GND) / (H - GND))));
          sk.line(0, y, W, y);
        }
        sk.noStroke();
        sk.fill(155, 145, 128);
        sk.noStroke();
        sk.beginShape();
        sk.vertex(W * 0.435, GND);
        sk.vertex(W * 0.565, GND);
        sk.vertex(W * 0.655, H);
        sk.vertex(W * 0.345, H);
        sk.endShape(sk.CLOSE);
        sk.stroke(140, 130, 112);
        sk.strokeWeight(1);
        sk.line(W * 0.5, GND, W * 0.5, H);
        sk.noStroke();
        if (snowy) {
          sk.fill(248, 252, 255, 210);
          sk.noStroke();
          sk.ellipse(W * 0.28, GND + 5, 210, 22);
          sk.ellipse(W * 0.72, GND + 5, 160, 18);
          sk.ellipse(W * 0.5, GND + 3, 320, 16);
        }
      }
      function drawTree(x, baseY) {
        const trunkH = 85, trunkW = 15;
        const sway = Math.sin(t * 0.033) * wf * 9;
        if (season !== "winter") {
          let lc, lcDark, lcLight;
          if (season === "spring") {
            lc = sk.color(88, 188, 68, 218);
            lcDark = sk.color(52, 138, 40, 218);
            lcLight = sk.color(145, 225, 112, 185);
          } else if (season === "summer") {
            lc = sk.color(35, 128, 35, 218);
            lcDark = sk.color(18, 88, 18, 218);
            lcLight = sk.color(62, 168, 62, 185);
          } else {
            lc = sk.color(188, 85, 16, 218);
            lcDark = sk.color(138, 52, 8, 218);
            lcLight = sk.color(228, 138, 42, 185);
          }
          const ls = sway * 1.4;
          const cy = baseY - trunkH - 18;
          sk.noStroke();
          sk.fill(lcDark);
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * sk.TWO_PI;
            const lx = x + Math.cos(a) * 36 + ls * Math.sin(a + t * 0.045);
            const ly = cy + Math.sin(a) * 20 + 5;
            sk.ellipse(lx, ly, 56, 44);
          }
          sk.ellipse(x + ls * 0.5, cy + 5, 70, 60);
          sk.fill(lc);
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * sk.TWO_PI;
            const lx = x + Math.cos(a) * 36 + ls * Math.sin(a + t * 0.045);
            const ly = cy + Math.sin(a) * 20;
            const lw = 58 + Math.sin(a + t * 0.038) * wf * 11;
            const lh = 46 + Math.cos(a + t * 0.031) * wf * 8;
            sk.ellipse(lx, ly, lw, lh);
          }
          sk.ellipse(x + ls * 0.5, cy, 74, 62);
          sk.fill(lcLight);
          for (let i = 0; i < 7; i++) {
            const a = i / 7 * sk.PI - sk.PI * 0.1;
            const lx = x + Math.cos(a) * 22 + ls * 0.6;
            const ly = cy - 10 + Math.sin(a) * 12;
            sk.ellipse(lx, ly, 30, 22);
          }
          if (season === "fall") {
            for (let i = 0; i < 4; i++) {
              const fl = (t * 0.45 + i * 38) % 110;
              const fx = x + Math.sin(fl * 0.18 + i) * 35 * wf + ls;
              const fy = baseY - trunkH - 55 + fl * 1.4;
              if (fy < baseY) {
                sk.push();
                sk.translate(fx, fy);
                sk.rotate(fl * 0.12);
                sk.fill(195 + i * 8, 82 + i * 5, 18, 200);
                sk.noStroke();
                sk.ellipse(0, 0, 10, 7);
                sk.pop();
              }
            }
          }
        }
        sk.fill(75, 50, 26);
        sk.noStroke();
        sk.rect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH, 3, 3, 0, 0);
        sk.strokeWeight(1);
        for (let bx = x - trunkW / 2 + 3; bx < x + trunkW / 2 - 1; bx += 3.5) {
          const grain = Math.sin(bx * 5.3 + x) * 0.5 + 0.5;
          sk.stroke(grain > 0.5 ? sk.color(55, 34, 14) : sk.color(92, 62, 32));
          const segH = trunkH * (0.5 + grain * 0.45);
          sk.line(
            bx + Math.sin(bx * 2.1) * 1.2,
            baseY - 2,
            bx + Math.sin(bx * 1.7) * 1.5,
            baseY - segH
          );
        }
        sk.stroke(105, 74, 40);
        sk.strokeWeight(1.5);
        sk.line(
          x + trunkW / 2 - 3,
          baseY - 6,
          x + trunkW / 2 - 3,
          baseY - trunkH + 10
        );
        sk.noStroke();
        if (season === "winter") {
          sk.stroke(68, 46, 24);
          const br = [
            [0, -trunkH, sway, -trunkH - 40],
            [sway, -trunkH - 40, sway + 23, -trunkH - 68],
            [sway, -trunkH - 40, sway - 21, -trunkH - 63],
            [sway + 23, -trunkH - 68, sway + 33, -trunkH - 90],
            [sway + 23, -trunkH - 68, sway + 13, -trunkH - 87],
            [sway - 21, -trunkH - 63, sway - 32, -trunkH - 84],
            [sway - 21, -trunkH - 63, sway - 10, -trunkH - 81]
          ];
          for (let i = 0; i < br.length; i++) {
            sk.strokeWeight(i < 1 ? 4 : i < 3 ? 2.5 : 1.5);
            sk.line(
              x + br[i][0],
              baseY + br[i][1],
              x + br[i][2],
              baseY + br[i][3]
            );
          }
          sk.noStroke();
          sk.fill(245, 250, 255, 185);
          sk.ellipse(x + sway, baseY - trunkH - 44, 30, 8);
          sk.ellipse(x + sway + 18, baseY - trunkH - 70, 20, 7);
          sk.ellipse(x + sway - 16, baseY - trunkH - 65, 17, 6);
        }
      }
      function drawHouse() {
        const hcx = W * 0.5;
        const hcy = GND;
        const hw = 210, hh = 155, rh = 95;
        sk.fill(218, 198, 168);
        sk.stroke(178, 158, 128);
        sk.strokeWeight(1.8);
        sk.rect(hcx - hw / 2, hcy - hh, hw, hh);
        sk.stroke(195, 178, 148);
        sk.strokeWeight(0.8);
        for (let py = hcy - hh + 14; py < hcy; py += 14) {
          sk.line(hcx - hw / 2, py, hcx + hw / 2, py);
        }
        sk.fill(138, 76, 56);
        sk.stroke(108, 58, 42);
        sk.strokeWeight(2);
        sk.triangle(
          hcx - hw / 2 - 16,
          hcy - hh,
          hcx + hw / 2 + 16,
          hcy - hh,
          hcx,
          hcy - hh - rh
        );
        sk.stroke(95, 50, 36);
        sk.strokeWeight(3);
        sk.line(hcx - hw / 2 - 16, hcy - hh, hcx + hw / 2 + 16, hcy - hh);
        sk.noStroke();
        sk.fill(158, 98, 78);
        sk.noStroke();
        sk.rect(hcx + 38, hcy - hh - rh + 18, 30, 64, 3);
        sk.fill(108, 64, 50);
        sk.rect(hcx + 35, hcy - hh - rh + 14, 36, 9, 3);
        if (temp < 52 || season === "winter" || season === "fall") {
          const wd = windDir > 180 ? -1 : 1;
          for (let i = 0; i < 5; i++) {
            const sp = (t * 0.45 + i * 18) % 70;
            const sx = hcx + 53 + Math.sin(sp * 0.14 + i) * 9 * wf * wd;
            const sy = hcy - hh - rh + 12 - sp * 1.4;
            const sa = sk.map(sp, 0, 70, 145, 0);
            sk.fill(195, 195, 200, sa);
            sk.noStroke();
            sk.ellipse(sx, sy, sp * 0.45 + 6, sp * 0.45 + 6);
          }
        }
        sk.fill(95, 65, 36);
        sk.stroke(65, 45, 25);
        sk.strokeWeight(1.5);
        sk.rect(hcx - 22, hcy - 72, 44, 72, 5, 5, 0, 0);
        sk.stroke(75, 52, 28);
        sk.strokeWeight(1);
        sk.rect(hcx - 15, hcy - 65, 12, 16, 2);
        sk.rect(hcx + 3, hcy - 65, 12, 16, 2);
        sk.rect(hcx - 15, hcy - 44, 12, 16, 2);
        sk.rect(hcx + 3, hcy - 44, 12, 16, 2);
        sk.fill(195, 165, 48);
        sk.noStroke();
        sk.ellipse(hcx + 16, hcy - 36, 7, 7);
        drawWindow(hcx - 82, hcy - 128);
        drawWindow(hcx + 36, hcy - 128);
        sk.fill(175, 158, 135);
        sk.stroke(148, 132, 112);
        sk.strokeWeight(1);
        sk.rect(hcx - hw / 2, hcy - 9, hw, 9, 0, 0, 2, 2);
        drawShrub(hcx - 42, hcy);
        drawShrub(hcx + 42, hcy);
      }
      function drawWindow(wx, wy) {
        const ww = 46, wh = 40;
        sk.fill(175, 195, 218);
        sk.stroke(118, 98, 76);
        sk.strokeWeight(2);
        sk.rect(wx, wy, ww, wh, 3);
        sk.stroke(118, 98, 76);
        sk.strokeWeight(1.5);
        sk.line(wx + ww / 2, wy, wx + ww / 2, wy + wh);
        sk.line(wx, wy + wh / 2, wx + ww, wy + wh / 2);
        if (isDay === 0 || tod < 7 || tod > 20) {
          sk.fill(255, 238, 175, 145);
          sk.noStroke();
          sk.rect(wx + 2, wy + 2, ww - 4, wh - 4, 2);
        }
      }
      function drawShrub(cx, baseY) {
        const sw = Math.sin(t * 0.038 + cx * 0.05) * wf * 5;
        let sc, scDark, scLight;
        const snowy = season === "winter" && temp < 34;
        if (snowy) {
          sc = sk.color(58, 115, 42, 220);
          scDark = sk.color(35, 80, 25, 220);
          scLight = sk.color(245, 250, 255, 200);
        } else if (season === "fall") {
          sc = sk.color(175, 75, 15, 220);
          scDark = sk.color(125, 45, 8, 220);
          scLight = sk.color(218, 128, 38, 185);
        } else if (season === "spring") {
          sc = sk.color(75, 175, 55, 220);
          scDark = sk.color(42, 125, 30, 220);
          scLight = sk.color(135, 215, 98, 185);
        } else {
          sc = sk.color(42, 138, 35, 220);
          scDark = sk.color(22, 95, 18, 220);
          scLight = sk.color(68, 175, 55, 185);
        }
        sk.noStroke();
        sk.fill(scDark);
        sk.ellipse(cx + sw * 0.3, baseY - 14, 44, 28);
        sk.ellipse(cx - 14 + sw * 0.2, baseY - 10, 28, 22);
        sk.ellipse(cx + 14 + sw * 0.4, baseY - 10, 28, 22);
        sk.fill(sc);
        sk.ellipse(cx + sw, baseY - 16, 46, 30);
        sk.ellipse(cx - 13 + sw * 0.5, baseY - 12, 30, 24);
        sk.ellipse(cx + 13 + sw * 0.8, baseY - 12, 30, 24);
        sk.fill(scLight);
        sk.ellipse(cx - 5 + sw * 0.6, baseY - 22, 20, 14);
        sk.ellipse(cx + 8 + sw * 0.7, baseY - 20, 16, 11);
        if (snowy) {
          sk.fill(245, 250, 255, 200);
          sk.ellipse(cx + sw * 0.5, baseY - 23, 34, 10);
          sk.ellipse(cx - 10 + sw * 0.3, baseY - 18, 18, 7);
          sk.ellipse(cx + 12 + sw * 0.6, baseY - 18, 15, 6);
        }
      }
      function drawThermometer() {
        sk.push();
        sk.translate(310, GND + 131);
        sk.scale(1.5);
        sk.translate(-759, -(GND - 93));
        const tx = 750;
        const ty = GND - 145;
        const tH = 100;
        const tW = 16;
        sk.fill(248, 244, 236, 200);
        sk.stroke(180, 165, 145);
        sk.strokeWeight(1);
        sk.rect(tx - 20, ty - 22, 58, tH + 48, 5);
        sk.fill(238, 228, 212);
        sk.stroke(175, 158, 138);
        sk.strokeWeight(1);
        sk.rect(tx - tW / 2, ty, tW, tH, tW / 2, tW / 2, 0, 0);
        sk.fill(198, 48, 48);
        sk.stroke(155, 28, 28);
        sk.strokeWeight(1);
        sk.ellipse(tx, ty + tH + 8, 25, 25);
        const mH = sk.map(sk.constrain(temp, -20, 120), -20, 120, 0, tH);
        sk.fill(198, 48, 48);
        sk.noStroke();
        sk.rect(tx - tW / 2 + 2, ty + tH - mH, tW - 4, mH + 8, 2, 2, 0, 0);
        sk.stroke(108, 88, 68);
        sk.strokeWeight(1);
        sk.fill(55, 38, 18);
        sk.textSize(11);
        sk.textAlign(sk.LEFT, sk.CENTER);
        const labels = [-20, 0, 20, 40, 60, 80, 100, 120];
        for (const tv of labels) {
          const yt = ty + tH - sk.map(tv, -20, 120, 0, tH);
          sk.stroke(108, 88, 68);
          sk.line(tx + tW / 2, yt, tx + tW / 2 + 7, yt);
          sk.noStroke();
          sk.fill(55, 38, 18);
          sk.text(tv, tx + tW / 2 + 9, yt);
        }
        sk.noStroke();
        sk.fill(55, 38, 18);
        sk.textSize(13);
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.text(`${Math.round(temp)}\xB0F`, tx, ty - 10);
        sk.pop();
      }
      function drawWindGauge() {
        sk.push();
        sk.translate(620, GND + 131);
        sk.scale(1.5);
        sk.translate(-835, -(GND - 93));
        const tx = 750, ty = GND - 145, tH = 100;
        const panelT = ty - 22;
        const panelH = tH + 48;
        const panelL = 796;
        const panelW = 78;
        const gx = panelL + panelW / 2;
        const cr = 30;
        const cy = panelT + 22 + cr;
        sk.fill(248, 244, 236, 200);
        sk.stroke(180, 165, 145);
        sk.strokeWeight(1);
        sk.rect(panelL, panelT, panelW, panelH, 5);
        sk.noStroke();
        sk.fill(55, 38, 18);
        sk.textSize(11);
        sk.textAlign(sk.CENTER, sk.TOP);
        sk.text("WIND", gx, panelT + 6);
        sk.fill(238, 228, 212);
        sk.stroke(175, 158, 138);
        sk.strokeWeight(1.2);
        sk.ellipse(gx, cy, cr * 2, cr * 2);
        sk.stroke(160, 140, 118);
        sk.strokeWeight(1);
        for (let deg = 0; deg < 360; deg += 45) {
          const rad = sk.radians(deg - 90);
          const inner = deg % 90 === 0 ? cr - 7 : cr - 4;
          sk.line(
            gx + Math.cos(rad) * inner,
            cy + Math.sin(rad) * inner,
            gx + Math.cos(rad) * cr,
            cy + Math.sin(rad) * cr
          );
        }
        sk.textSize(8);
        sk.textAlign(sk.CENTER, sk.CENTER);
        const cards = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
        for (const [lbl, deg] of cards) {
          const rad = sk.radians(deg - 90);
          const dist = cr - 12;
          const lx = gx + Math.cos(rad) * dist;
          const ly = cy + Math.sin(rad) * dist;
          sk.fill(0, 0, 0, 90);
          sk.noStroke();
          sk.text(lbl, lx + 0.5, ly + 0.5);
          sk.fill(70, 50, 25);
          sk.text(lbl, lx, ly);
        }
        const wobble = Math.sin(t * 0.05) * wf * 0.06;
        const arrowAngle = sk.radians(windDir - 90) + wobble;
        const tipX = gx + Math.cos(arrowAngle) * (cr - 6);
        const tipY = cy + Math.sin(arrowAngle) * (cr - 6);
        const tailX = gx - Math.cos(arrowAngle) * (cr * 0.38);
        const tailY = cy - Math.sin(arrowAngle) * (cr * 0.38);
        sk.stroke(175, 38, 38);
        sk.strokeWeight(2.5);
        sk.line(tailX, tailY, tipX, tipY);
        sk.push();
        sk.translate(tipX, tipY);
        sk.rotate(arrowAngle);
        sk.fill(175, 38, 38);
        sk.noStroke();
        sk.triangle(5, 0, -7, -4, -7, 4);
        sk.pop();
        sk.fill(140, 115, 90);
        sk.noStroke();
        sk.ellipse(gx, cy, 5, 5);
        sk.noStroke();
        sk.fill(55, 38, 18);
        sk.textSize(16);
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.text(`${Math.round(windSpeed)}`, gx, panelT + panelH - 32);
        sk.textSize(10);
        sk.text("mph", gx, panelT + panelH - 16);
        sk.pop();
      }
      function drawThermometerPortrait() {
        const s = Math.max(0.7, Math.min(2, sk.windowWidth / 360));
        sk.push();
        sk.translate(88, sk.windowHeight - STRIP_H - 74 * s);
        sk.scale(s);
        sk.translate(-759, -(GND - 93));
        const tx = 750;
        const ty = GND - 145;
        const tH = 100;
        const tW = 16;
        sk.fill(248, 244, 236, 200);
        sk.stroke(180, 165, 145);
        sk.strokeWeight(1);
        sk.rect(tx - 20, ty - 22, 58, tH + 48, 5);
        sk.fill(238, 228, 212);
        sk.stroke(175, 158, 138);
        sk.strokeWeight(1);
        sk.rect(tx - tW / 2, ty, tW, tH, tW / 2, tW / 2, 0, 0);
        sk.fill(198, 48, 48);
        sk.stroke(155, 28, 28);
        sk.strokeWeight(1);
        sk.ellipse(tx, ty + tH + 8, 25, 25);
        const mH = sk.map(sk.constrain(temp, -20, 120), -20, 120, 0, tH);
        sk.fill(198, 48, 48);
        sk.noStroke();
        sk.rect(tx - tW / 2 + 2, ty + tH - mH, tW - 4, mH + 8, 2, 2, 0, 0);
        sk.stroke(108, 88, 68);
        sk.strokeWeight(1);
        sk.fill(55, 38, 18);
        sk.textSize(11);
        sk.textAlign(sk.LEFT, sk.CENTER);
        const labels = [-20, 0, 20, 40, 60, 80, 100, 120];
        for (const tv of labels) {
          const yt = ty + tH - sk.map(tv, -20, 120, 0, tH);
          sk.stroke(108, 88, 68);
          sk.line(tx + tW / 2, yt, tx + tW / 2 + 7, yt);
          sk.noStroke();
          sk.fill(55, 38, 18);
          sk.text(tv, tx + tW / 2 + 9, yt);
        }
        sk.noStroke();
        sk.fill(55, 38, 18);
        sk.textSize(13);
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.text(`${Math.round(temp)}\xB0F`, tx, ty - 10);
        sk.pop();
      }
      function drawWindGaugePortrait() {
        const s = Math.max(0.7, Math.min(2, sk.windowWidth / 360));
        sk.push();
        sk.translate(sk.windowWidth - 88, sk.windowHeight - STRIP_H - 74 * s);
        sk.scale(s);
        sk.translate(-835, -(GND - 93));
        const tx = 750, ty = GND - 145, tH = 100;
        const panelT = ty - 22;
        const panelH = tH + 48;
        const panelL = 796;
        const panelW = 78;
        const gx = panelL + panelW / 2;
        const cr = 30;
        const cy = panelT + 22 + cr;
        sk.fill(248, 244, 236, 200);
        sk.stroke(180, 165, 145);
        sk.strokeWeight(1);
        sk.rect(panelL, panelT, panelW, panelH, 5);
        sk.noStroke();
        sk.fill(55, 38, 18);
        sk.textSize(11);
        sk.textAlign(sk.CENTER, sk.TOP);
        sk.text("WIND", gx, panelT + 6);
        sk.fill(238, 228, 212);
        sk.stroke(175, 158, 138);
        sk.strokeWeight(1.2);
        sk.ellipse(gx, cy, cr * 2, cr * 2);
        sk.stroke(160, 140, 118);
        sk.strokeWeight(1);
        for (let deg = 0; deg < 360; deg += 45) {
          const rad = sk.radians(deg - 90);
          const inner = deg % 90 === 0 ? cr - 7 : cr - 4;
          sk.line(
            gx + Math.cos(rad) * inner,
            cy + Math.sin(rad) * inner,
            gx + Math.cos(rad) * cr,
            cy + Math.sin(rad) * cr
          );
        }
        sk.textSize(8);
        sk.textAlign(sk.CENTER, sk.CENTER);
        const cards = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
        for (const [lbl, deg] of cards) {
          const rad = sk.radians(deg - 90);
          const dist = cr - 12;
          const lx = gx + Math.cos(rad) * dist;
          const ly = cy + Math.sin(rad) * dist;
          sk.fill(0, 0, 0, 90);
          sk.noStroke();
          sk.text(lbl, lx + 0.5, ly + 0.5);
          sk.fill(70, 50, 25);
          sk.text(lbl, lx, ly);
        }
        const wobble = Math.sin(t * 0.05) * wf * 0.06;
        const arrowAngle = sk.radians(windDir - 90) + wobble;
        const tipX = gx + Math.cos(arrowAngle) * (cr - 6);
        const tipY = cy + Math.sin(arrowAngle) * (cr - 6);
        const tailX = gx - Math.cos(arrowAngle) * (cr * 0.38);
        const tailY = cy - Math.sin(arrowAngle) * (cr * 0.38);
        sk.stroke(175, 38, 38);
        sk.strokeWeight(2.5);
        sk.line(tailX, tailY, tipX, tipY);
        sk.push();
        sk.translate(tipX, tipY);
        sk.rotate(arrowAngle);
        sk.fill(175, 38, 38);
        sk.noStroke();
        sk.triangle(5, 0, -7, -4, -7, 4);
        sk.pop();
        sk.fill(140, 115, 90);
        sk.noStroke();
        sk.ellipse(gx, cy, 5, 5);
        sk.noStroke();
        sk.fill(55, 38, 18);
        sk.textSize(16);
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.text(`${Math.round(windSpeed)}`, gx, panelT + panelH - 32);
        sk.textSize(10);
        sk.text("mph", gx, panelT + panelH - 16);
        sk.pop();
      }
      function drawGrassLayer() {
        for (const g of grass) {
          const sw = Math.sin(t * 0.042 + g.ph) * wf * 14;
          let gc;
          if (season === "winter" && temp < 34) gc = sk.color(215, 225, 242);
          else if (season === "fall") gc = sk.color(118, 98, 45);
          else if (season === "spring") gc = sk.color(98, 195, 68);
          else gc = sk.color(65, 152, 48);
          sk.stroke(gc);
          sk.strokeWeight(g.sw);
          sk.line(g.x, g.y, g.x + sw, g.y - g.h);
          sk.noStroke();
        }
        if (season === "spring" || season === "summer") {
          const pals = [
            [252, 198, 50],
            [252, 115, 148],
            [198, 98, 198],
            [252, 158, 58],
            [148, 198, 252]
          ];
          for (let i = 0; i < 18; i++) {
            const fx = (i * 109 + 185) % (W - 120) + 60;
            if (fx > W * 0.33 && fx < W * 0.67) continue;
            const fy = GND + i * 71 % 28 + 6;
            const sw = Math.sin(t * 0.042 + i * 1.3) * wf * 7;
            sk.stroke(55, 142, 38);
            sk.strokeWeight(1.5);
            sk.line(fx, fy, fx + sw, fy - 17);
            const pc = pals[i % pals.length];
            sk.fill(pc[0], pc[1], pc[2], 215);
            sk.noStroke();
            for (let a = 0; a < sk.TWO_PI; a += sk.PI / 3) {
              sk.ellipse(
                fx + sw + Math.cos(a) * 5.5,
                fy - 17 + Math.sin(a) * 5.5,
                7.5,
                5.5
              );
            }
            sk.fill(255, 238, 95);
            sk.ellipse(fx + sw, fy - 17, 6.5, 6.5);
          }
        }
      }
      function mkParticle(scatter) {
        const driftX = -Math.sin(windRad) * wf * (isRain ? 3.5 : 1.5);
        const precipTop = Math.floor(-Math.max(0, _oy) / _sf);
        return {
          x: scatter ? sk.random(W) : sk.random(-20, W + 20),
          y: scatter ? sk.random(precipTop, 0) : precipTop,
          spd: isRain ? sk.random(10, 18) : sk.random(1, 3.5),
          dx: driftX + (isSnow ? Math.sin(sk.random(sk.TWO_PI)) * 0.4 : 0),
          sz: isRain ? sk.random(1, 2) : sk.random(3.5, 8),
          op: sk.random(140, 245)
        };
      }
      function drawPrecipitation() {
        if (!particles.length) return;
        const precipBot = Math.ceil(H + Math.max(0, _oy) / _sf);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.y += p.spd;
          p.x += p.dx;
          if (p.y > precipBot || p.x < -20 || p.x > W + 20) {
            particles[i] = mkParticle(false);
            continue;
          }
          if (isRain) {
            sk.stroke(145, 178, 215, p.op);
            sk.strokeWeight(p.sz);
            sk.line(p.x, p.y, p.x + p.dx * 2, p.y - 9);
          } else if (isSnow) {
            sk.fill(238, 246, 255, p.op);
            sk.noStroke();
            sk.ellipse(p.x, p.y, p.sz, p.sz);
          }
        }
        sk.noStroke();
      }
      function drawLightningMaybe() {
        ltTimer--;
        if (ltTimer > 0) return;
        ltTimer = Math.round(sk.random(55, 210));
        const lx = sk.random(W * 0.15, W * 0.85);
        sk.push();
        sk.stroke(255, 255, 200, 210);
        sk.strokeWeight(1.8);
        bolt(lx, 30, lx + sk.random(-25, 25), GND - 45, 5);
        sk.pop();
      }
      function bolt(x1, y1, x2, y2, depth) {
        if (depth <= 0 || y1 >= y2) return;
        const mx = (x1 + x2) / 2 + sk.random(-35, 35);
        const my = (y1 + y2) / 2;
        sk.line(x1, y1, mx, my);
        sk.line(mx, my, x2, y2);
        if (depth > 2) bolt(mx, my, x2 + sk.random(-18, 18), y2, depth - 1);
      }
      function drawGroundLeaves() {
        for (const l of gLeaves) {
          l.x += l.spd * (1 + 0.4 * Math.sin(t * 0.022 + l.y));
          l.rot += l.spd * 0.4;
          if (l.x > W + 15) l.x = -15;
          sk.push();
          sk.translate(l.x, l.y);
          sk.rotate(l.rot);
          sk.fill(l.col[0], l.col[1], l.col[2], 195);
          sk.noStroke();
          sk.ellipse(0, 0, l.sz, l.sz * 0.62);
          sk.pop();
        }
      }
      function applyWeatherState(nw, nf, ns, tile) {
        const prevIsRain = isRain;
        const prevIsSnow = isSnow;
        temp = nw.temp;
        windSpeed = nw.windSpeed;
        windDir = nw.windDir;
        cloudCover = nw.cloudCover;
        code = nw.code;
        isDay = nw.isDay;
        _forecast = nf;
        _locStr = ns;
        _selectedTile = tile;
        isSnow = code >= 71 && code <= 77 || code === 85 || code === 86;
        isRain = !isSnow && (code >= 51 && code <= 67 || code >= 80 && code <= 82);
        isStorm = code >= 95 && code <= 99;
        season = computeSeason(nw.lat || 0);
        tod = localSolarTime(nw.lon || 0);
        windRad = windDir * Math.PI / 180;
        cloudDriftX = -Math.sin(windRad);
        cloudDriftY = Math.cos(windRad) * 0.18;
        wf = Math.min(windSpeed / 25, 1.4);
        if (isRain !== prevIsRain || isSnow !== prevIsSnow) {
          particles.length = 0;
          const nPart = isRain ? 280 : isSnow ? 180 : 0;
          for (let i = 0; i < nPart; i++) particles.push(mkParticle(true));
        }
        clouds.length = 0;
        const nc = Math.round(cloudCover / 18) + (isRain || isSnow ? 2 : 0) + (isStorm ? 2 : 0);
        for (let i = 0; i < Math.min(nc, 7); i++) {
          clouds.push({
            x: sk.random(W),
            y: sk.random(H * 0.05, H * 0.28),
            w: sk.random(130, 260),
            h: sk.random(45, 85),
            spd: sk.random(0.25, 0.65) * Math.max(windSpeed / 12, 0.15),
            op: sk.random(180, 245)
          });
        }
      }
      _applyFn = applyWeatherState;
      function drawForecastStrip() {
        if (!_forecast.length) return;
        const stripH = STRIP_H;
        const infoH = 38;
        const sy = sk.windowHeight - stripH;
        const tileW = sk.windowWidth / 7;
        const tileY = sy + infoH;
        const tileH = stripH - infoH;
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        sk.push();
        sk.noSmooth();
        sk.fill(8, 18, 42, 220);
        sk.noStroke();
        sk.rect(0, sy, sk.windowWidth, stripH);
        sk.stroke(100, 140, 200, 70);
        sk.strokeWeight(1);
        sk.line(0, sy, sk.windowWidth, sy);
        sk.fill(255, 255, 255, 230);
        sk.noStroke();
        sk.textSize(18);
        sk.textStyle(sk.BOLD);
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.text(_locStr, sk.windowWidth / 2, sy + infoH / 2);
        sk.textStyle(sk.NORMAL);
        sk.stroke(100, 140, 200, 70);
        sk.strokeWeight(1);
        sk.line(0, tileY, sk.windowWidth, tileY);
        for (let i = 0; i < _forecast.length && i < 7; i++) {
          const fd = _forecast[i];
          const tx = i * tileW;
          const cx = tx + tileW / 2;
          if (i === 0) {
            sk.fill(60, 100, 180, 50);
            sk.noStroke();
            sk.rect(tx, tileY, tileW, tileH);
          }
          if (i === _selectedTile && _selectedTile > 0) {
            sk.fill(80, 130, 220, 80);
            sk.noStroke();
            sk.rect(tx, tileY, tileW, tileH);
            sk.stroke(180, 210, 255, 200);
            sk.strokeWeight(2);
            sk.line(tx, tileY, tx + tileW, tileY);
          }
          if (i > 0) {
            sk.stroke(100, 140, 200, 50);
            sk.strokeWeight(1);
            sk.line(tx, tileY, tx, tileY + tileH);
          }
          const d = /* @__PURE__ */ new Date(fd.date + "T12:00:00");
          const dayLabel = i === 0 ? "Today" : days[d.getDay()];
          sk.fill(255, 255, 255, 220);
          sk.noStroke();
          sk.textSize(13);
          sk.textAlign(sk.CENTER, sk.TOP);
          sk.text(dayLabel, cx, tileY + 6);
          drawForecastIcon(fd.code, cx, tileY + 44, 14);
          sk.fill(255, 255, 255, 200);
          sk.noStroke();
          sk.textSize(13);
          sk.textAlign(sk.CENTER, sk.BOTTOM);
          sk.text(
            `${Math.round(fd.tempMax)}\xB0 / ${Math.round(fd.tempMin)}\xB0`,
            cx,
            tileY + tileH - 5
          );
        }
        sk.pop();
      }
      function drawForecastIcon(code2, cx, cy, r) {
        sk.push();
        sk.noStroke();
        if (code2 <= 1) {
          sk.fill(255, 215, 50);
          sk.ellipse(cx, cy, r * 2, r * 2);
          sk.stroke(255, 215, 50, 190);
          sk.strokeWeight(1.5);
          for (let a = 0; a < sk.TWO_PI; a += sk.PI / 4) {
            sk.line(
              cx + Math.cos(a) * r * 1.4,
              cy + Math.sin(a) * r * 1.4,
              cx + Math.cos(a) * r * 2,
              cy + Math.sin(a) * r * 2
            );
          }
        } else if (code2 <= 3 || code2 >= 45 && code2 <= 48) {
          if (code2 === 2) {
            sk.fill(255, 215, 50);
            sk.ellipse(cx + r * 0.7, cy - r * 0.6, r * 1.5, r * 1.5);
          }
          sk.fill(
            code2 <= 2 ? sk.color(210, 215, 225, 235) : sk.color(170, 175, 185, 235)
          );
          sk.ellipse(cx, cy, r * 2.4, r * 1.5);
          sk.ellipse(cx - r * 0.6, cy + r * 0.4, r * 1.4, r);
          sk.ellipse(cx + r * 0.6, cy + r * 0.4, r * 1.4, r);
        } else if (code2 >= 51 && code2 <= 67 || code2 >= 80 && code2 <= 82) {
          sk.fill(155, 185, 215, 230);
          sk.ellipse(cx, cy - r * 0.4, r * 2.2, r * 1.4);
          sk.ellipse(cx - r * 0.6, cy + r * 0.2, r * 1.4, r);
          sk.ellipse(cx + r * 0.6, cy + r * 0.2, r * 1.4, r);
          sk.fill(100, 155, 210, 210);
          for (let d2 = -1; d2 <= 1; d2++) {
            sk.ellipse(cx + d2 * r * 0.7, cy + r * 1.2, r * 0.28, r * 0.65);
          }
        } else if (code2 >= 71 && code2 <= 77 || code2 === 85 || code2 === 86) {
          sk.fill(210, 225, 248, 230);
          sk.ellipse(cx, cy - r * 0.4, r * 2.2, r * 1.4);
          sk.ellipse(cx - r * 0.6, cy + r * 0.2, r * 1.4, r);
          sk.ellipse(cx + r * 0.6, cy + r * 0.2, r * 1.4, r);
          sk.fill(240, 248, 255, 220);
          for (let d2 = -1; d2 <= 1; d2++) {
            sk.ellipse(cx + d2 * r * 0.7, cy + r * 1.2, r * 0.55, r * 0.55);
          }
        } else if (code2 >= 95 && code2 <= 99) {
          sk.fill(110, 110, 140, 235);
          sk.ellipse(cx, cy - r * 0.5, r * 2.4, r * 1.5);
          sk.ellipse(cx - r * 0.6, cy + r * 0.1, r * 1.4, r);
          sk.ellipse(cx + r * 0.6, cy + r * 0.1, r * 1.4, r);
          sk.fill(255, 232, 50);
          sk.noStroke();
          sk.beginShape();
          sk.vertex(cx + r * 0.15, cy + r * 0.3);
          sk.vertex(cx - r * 0.45, cy + r * 0.9);
          sk.vertex(cx + r * 0.05, cy + r * 0.9);
          sk.vertex(cx - r * 0.35, cy + r * 1.6);
          sk.vertex(cx + r * 0.65, cy + r * 0.7);
          sk.vertex(cx + r * 0.15, cy + r * 0.7);
          sk.endShape(sk.CLOSE);
        } else {
          sk.fill(185, 190, 200, 200);
          sk.ellipse(cx, cy, r * 2.2, r * 1.4);
        }
        sk.pop();
      }
    });
    return {
      updateScene(nw, nf, ns, tile = 0) {
        _applyFn?.(nw, nf, ns, tile);
      }
    };
  }

  // src/main.ts
  var origWeather = defaultWeather();
  var origForecast = defaultForecast();
  var origLocStr = "";
  var sketchHandle;
  var currentLocStr = "";
  var currentWeather = defaultWeather();
  var currentForecast = defaultForecast();
  var currentBaseLocStr = "";
  var selectedSuggestion = null;
  var currentSuggestions = [];
  var debounceTimer = null;
  var activeIdx = -1;
  function el(id) {
    return document.getElementById(id);
  }
  function showDialog() {
    selectedSuggestion = null;
    currentSuggestions = [];
    activeIdx = -1;
    el("loc-dialog").classList.remove("loc-hidden");
    const inp = el("loc-input");
    inp.value = currentLocStr.split(" \xB7 ")[0] ?? currentLocStr;
    el("loc-suggestions").innerHTML = "";
    inp.focus();
    inp.select();
  }
  function hideDialog() {
    el("loc-dialog").classList.add("loc-hidden");
    el("loc-suggestions").innerHTML = "";
    selectedSuggestion = null;
    currentSuggestions = [];
    activeIdx = -1;
  }
  function renderSuggestions(results) {
    currentSuggestions = results;
    activeIdx = -1;
    const ul = el("loc-suggestions");
    ul.innerHTML = "";
    results.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r.place;
      li.addEventListener("pointerdown", (e) => {
        e.preventDefault();
      });
      li.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectedSuggestion = r;
        el("loc-input").value = r.place;
        ul.innerHTML = "";
        activeIdx = -1;
      });
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedSuggestion = r;
        el("loc-input").value = r.place;
        ul.innerHTML = "";
        activeIdx = -1;
      });
      ul.appendChild(li);
    });
  }
  function updateActiveItem() {
    const items = el("loc-suggestions").querySelectorAll("li");
    items.forEach((li, i) => li.classList.toggle("loc-active", i === activeIdx));
  }
  async function applyLocation(lat, lon, place) {
    try {
      const result = await fetchWeather(lat, lon);
      const newLocStr = `${place} \xB7 ${Math.round(result.current.temp)}\xB0F \xB7 ${Math.round(result.current.windSpeed)} mph`;
      currentLocStr = newLocStr;
      currentBaseLocStr = newLocStr;
      currentWeather = result.current;
      currentForecast = result.forecast;
      sketchHandle.updateScene(result.current, result.forecast, newLocStr, 0);
    } catch (e) {
      console.warn("Could not fetch weather for location:", e);
    }
  }
  async function handleOk() {
    const inp = el("loc-input");
    const target = selectedSuggestion ?? currentSuggestions[0] ?? null;
    if (target) {
      await applyLocation(target.lat, target.lon, target.place);
    } else if (inp.value.trim()) {
      const results = await searchLocations(inp.value.trim());
      if (results.length > 0) {
        await applyLocation(results[0].lat, results[0].lon, results[0].place);
      }
    }
    hideDialog();
  }
  async function init() {
    let w = defaultWeather();
    let forecast = defaultForecast();
    let locStr = "weather unavailable \u2014 showing default";
    try {
      let lat = 0, lon = 0, place = "";
      if (location.protocol === "file:") {
        lat = 35.9049;
        lon = -78.7003;
        place = "Raleigh, NC (27613)";
      } else {
        const loc = await resolveLocation();
        lat = loc.lat;
        lon = loc.lon;
        place = loc.place;
      }
      const result = await fetchWeather(lat, lon);
      w = result.current;
      forecast = result.forecast;
      locStr = `${place} \xB7 ${Math.round(w.temp)}\xB0F \xB7 ${Math.round(w.windSpeed)} mph`;
    } catch (e) {
      console.warn("Could not fetch weather:", e);
    }
    origWeather = w;
    origForecast = forecast;
    origLocStr = locStr;
    currentLocStr = locStr;
    currentWeather = w;
    currentForecast = forecast;
    currentBaseLocStr = locStr;
    sketchHandle = startSketch(w, forecast, locStr, {
      onInfoBarClick: showDialog,
      onForecastTileClick: (i) => {
        if (i === 0) {
          currentLocStr = currentBaseLocStr;
          sketchHandle.updateScene(currentWeather, currentForecast, currentBaseLocStr, 0);
          return;
        }
        const fd = currentForecast[i];
        if (!fd) return;
        const cloudCover = fd.code <= 1 ? 5 : fd.code === 2 ? 40 : fd.code === 3 ? 85 : 95;
        const synthW = {
          temp: fd.tempMax,
          windSpeed: fd.windMax,
          windDir: currentWeather.windDir,
          cloudCover,
          precip: fd.precipSum > 0 ? 1 : 0,
          code: fd.code,
          isDay: 1,
          lat: currentWeather.lat,
          lon: currentWeather.lon
        };
        const city = currentBaseLocStr.split(" \xB7 ")[0] ?? currentBaseLocStr;
        const d = /* @__PURE__ */ new Date(fd.date + "T12:00:00");
        const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const forecastLocStr = `${city} \xB7 ${DAY[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()} \xB7 ${Math.round(fd.tempMax)}\xB0 / ${Math.round(fd.tempMin)}\xB0F \xB7 ${Math.round(fd.windMax)} mph`;
        currentLocStr = forecastLocStr;
        sketchHandle.updateScene(synthW, currentForecast, forecastLocStr, i);
      }
    });
    const inp = el("loc-input");
    inp.addEventListener("input", () => {
      selectedSuggestion = null;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      const q = inp.value.trim();
      if (q.length < 2) {
        el("loc-suggestions").innerHTML = "";
        currentSuggestions = [];
        return;
      }
      debounceTimer = setTimeout(async () => {
        const results = await searchLocations(q);
        renderSuggestions(results);
      }, 300);
    });
    inp.addEventListener("keydown", (e) => {
      const items = Array.from(el("loc-suggestions").querySelectorAll("li"));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        updateActiveItem();
        if (activeIdx >= 0) {
          selectedSuggestion = currentSuggestions[activeIdx] ?? null;
          inp.value = items[activeIdx].textContent ?? inp.value;
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, -1);
        updateActiveItem();
        if (activeIdx >= 0) {
          selectedSuggestion = currentSuggestions[activeIdx] ?? null;
          inp.value = items[activeIdx].textContent ?? inp.value;
        } else {
          selectedSuggestion = null;
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        void handleOk();
      } else if (e.key === "Escape") {
        hideDialog();
      }
    });
    function wireTap(id, fn) {
      const btn = el(id);
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        fn();
      });
      btn.addEventListener("click", fn);
    }
    wireTap("loc-ok", () => void handleOk());
    wireTap("loc-cancel", hideDialog);
    wireTap("loc-reset", () => {
      currentLocStr = origLocStr;
      currentBaseLocStr = origLocStr;
      currentWeather = origWeather;
      currentForecast = origForecast;
      sketchHandle.updateScene(origWeather, origForecast, origLocStr, 0);
      hideDialog();
    });
    el("loc-overlay").addEventListener("touchend", (e) => {
      e.preventDefault();
      hideDialog();
    });
    el("loc-overlay").addEventListener("click", hideDialog);
  }
  init();
})();
