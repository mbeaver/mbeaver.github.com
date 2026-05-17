import { wmoEmoji } from './ui/tile.js';
import { mapWeatherToAudio } from './audio/mapping.js';
// ── Module-level state ────────────────────────────────────────────────────────
let canvas;
let ctx;
let burstParticles = [];
let ambientParticles = [];
let shootingStars = [];
let ufoActive = null;
let isNightClear = false;
let lastShootingStarTime = 0;
let nextShootingStarDelay = 0;
let lastUfoTime = 0;
let nextUfoDelay = 0;
let lightningAlpha = 0;
let lastLightningCheck = 0;
let animFrameId = null;
let engine = null;
let playing = false;
let currentLat = null;
let currentLng = null;
let currentLocationName = '';
let refreshTimestamps = [];
let lastAutoRefreshAttempt = 0;
const LOADING_FRAMES = [
    '|  |  |  |',
    '/  |  |  \\',
    '|  \\  /  |',
    '\\  |  |  /',
    '|  /  \\  |',
];
let loadingIntervalId = null;
let loadingShownAt = 0;
// ── Utilities ─────────────────────────────────────────────────────────────────
function degreesToCompass(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}
function feelsLike(tempF, windMph, humidity) {
    if (tempF <= 50 && windMph > 3) {
        return Math.round(35.74 + 0.6215 * tempF
            - 35.75 * Math.pow(windMph, 0.16)
            + 0.4275 * tempF * Math.pow(windMph, 0.16));
    }
    if (tempF >= 80) {
        const rh = humidity;
        return Math.round(-42.379 + 2.04901523 * tempF + 10.14333127 * rh
            - 0.22475541 * tempF * rh - 0.00683783 * tempF * tempF
            - 0.05481717 * rh * rh + 0.00122874 * tempF * tempF * rh
            + 0.00085282 * tempF * rh * rh - 0.00000199 * tempF * tempF * rh * rh);
    }
    return Math.round(tempF);
}
const WMO_LABELS = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy Fog',
    51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
    56: 'Freezing Drizzle', 57: 'Heavy Freezing Drizzle',
    61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
    66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
    71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
    80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
    85: 'Snow Showers', 86: 'Heavy Snow Showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ Hail', 99: 'Thunderstorm w/ Heavy Hail',
};
function wmoConditionLabel(code) {
    return WMO_LABELS[code] ?? 'Unknown';
}
function nowEmoji(code, isNight) {
    if (isNight && code <= 1)
        return '🌙';
    return wmoEmoji(code);
}
function materialHue(material) {
    const hues = {
        crystal: 200, glass: 180, aluminum: 210, bronze: 35, bamboo: 90, steel: 260,
    };
    return hues[material];
}
function classifyCondition(code) {
    if (code <= 1)
        return 'clear';
    if (code <= 3)
        return 'partlyCloudy';
    if (code >= 45 && code <= 48)
        return 'fog';
    if (code >= 51 && code <= 57)
        return 'drizzle';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
        return 'rain';
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
        return 'snow';
    if (code === 95)
        return 'storm';
    if (code === 96 || code === 99)
        return 'hail';
    return 'clear';
}
function parseColor(c) {
    if (c.startsWith('#')) {
        const v = parseInt(c.slice(1), 16);
        return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
    }
    const m = c.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
}
function lerpColor(a, b, t) {
    const [ar, ag, ab] = parseColor(a);
    const [br, bg, bb] = parseColor(b);
    return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}
function skyLuminance(top, bot) {
    const [tr, tg, tb] = parseColor(top);
    const [br, bg, bb] = parseColor(bot);
    const r = (tr + br) / 2;
    const g = (tg + bg) / 2;
    const b = (tb + bb) / 2;
    return 0.299 * r + 0.587 * g + 0.114 * b;
}
function applyTextScheme(luminance) {
    const root = document.documentElement;
    if (luminance > 130) {
        root.style.setProperty('--now-text', '#1a2a3a');
        root.style.setProperty('--now-shadow-sm', '0 1px 4px rgba(255,255,255,0.3)');
        root.style.setProperty('--now-shadow-lg', '0 2px 6px rgba(255,255,255,0.2)');
        root.style.setProperty('--now-btn-border', 'rgba(0,0,0,0.2)');
    }
    else {
        root.style.setProperty('--now-text', '#ffffff');
        root.style.setProperty('--now-shadow-sm', '0 1px 8px rgba(0,0,0,0.6)');
        root.style.setProperty('--now-shadow-lg', '0 2px 12px rgba(0,0,0,0.5)');
        root.style.setProperty('--now-btn-border', 'rgba(255,255,255,0.18)');
    }
}
function parseLocalToUTC(dateStr, utcOffsetSeconds) {
    // Open-Meteo returns local times without timezone designator (e.g. "2026-05-15T05:55").
    // Appending Z treats the string as UTC; then subtracting the location offset converts
    // it to the true UTC instant. E.g. 05:55 HST (offset=-36000): 05:55Z - (-36000s) = 15:55Z.
    return new Date(new Date(dateStr + 'Z').getTime() - utcOffsetSeconds * 1000);
}
function windVector(day) {
    const toRad = ((day.windDirection + 180) % 360) * (Math.PI / 180);
    const strength = Math.min(day.windSpeedMax / 40, 1.0);
    return { vx: Math.sin(toRad) * strength, vy: -Math.cos(toRad) * strength, strength };
}
// ── Loading Animation ─────────────────────────────────────────────────────────
function startLoadingAnimation(text) {
    const el = document.getElementById('loading-state');
    el.removeAttribute('hidden');
    loadingShownAt = Date.now();
    const animEl = el.querySelector('.loading-anim');
    const textEl = el.querySelector('.loading-text');
    textEl.textContent = text;
    if (loadingIntervalId !== null)
        clearInterval(loadingIntervalId);
    let frame = 0;
    animEl.textContent = LOADING_FRAMES[0];
    loadingIntervalId = window.setInterval(() => {
        frame = (frame + 1) % LOADING_FRAMES.length;
        animEl.textContent = LOADING_FRAMES[frame];
    }, 180);
}
async function waitMinLoadTime() {
    const remaining = Math.max(0, 1000 - (Date.now() - loadingShownAt));
    if (remaining > 0)
        await new Promise(r => setTimeout(r, remaining));
}
function stopLoadingAnimation() {
    if (loadingIntervalId !== null) {
        clearInterval(loadingIntervalId);
        loadingIntervalId = null;
    }
    document.getElementById('loading-state').setAttribute('hidden', '');
}
// ── API ───────────────────────────────────────────────────────────────────────
async function tryGeolocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), reject, { timeout: 10000 });
    });
}
async function tryIPGeolocation() {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (!data.latitude || !data.longitude)
        throw new Error('IP geolocation unavailable');
    return {
        lat: data.latitude,
        lng: data.longitude,
        name: data.city || data.region || 'Your Location',
    };
}
async function geocodeCity(name) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results?.length)
        throw new Error('City not found');
    const r = data.results[0];
    return { lat: r.latitude, lng: r.longitude, name: r.name };
}
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        return data.address?.city ?? data.address?.town ?? data.address?.county ?? 'Your Location';
    }
    catch {
        return 'Your Location';
    }
}
async function fetchForecast(lat, lng) {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: 'weather_code,temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,cloud_cover',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,cloud_cover_mean,relative_humidity_2m_max,sunrise,sunset',
        forecast_days: '1',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
        timezone: 'auto',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok)
        throw new Error('Forecast fetch failed');
    const data = await res.json();
    const cur = data.current;
    const d = data.daily;
    const utcOffset = data.utc_offset_seconds ?? 0;
    const day = {
        date: d.time[0],
        weatherCode: cur.weather_code,
        windDirection: cur.wind_direction_10m,
        cloudCover: cur.cloud_cover,
        tempMax: d.temperature_2m_max[0],
        tempMin: d.temperature_2m_min[0],
        windSpeedMax: d.wind_speed_10m_max[0],
        humidityMax: d.relative_humidity_2m_max[0],
        precipSum: d.precipitation_sum[0],
        sunrise: parseLocalToUTC(d.sunrise[0], utcOffset),
        sunset: parseLocalToUTC(d.sunset[0], utcOffset),
    };
    return { day, currentTemp: cur.temperature_2m };
}
// ── Sky Gradient ──────────────────────────────────────────────────────────────
const SKY_PHASES = {
    night: { top: '#030408', bottom: '#07090f' },
    dawn: { top: '#1a0a2e', bottom: '#3d1c52' },
    sunrise: { top: '#ff6b35', bottom: '#ffc947' },
    morning: { top: '#4a8fd4', bottom: '#87ceeb' },
    day: { top: '#2a82d4', bottom: '#87ceef' },
    afternoon: { top: '#2d5fa0', bottom: '#f0a855' },
    goldenHour: { top: '#c4682a', bottom: '#f5c842' },
    dusk: { top: '#1a1a3a', bottom: '#4a2060' },
};
const CONDITION_MODS = {
    storm: { color: '#1a1520', weight: 0.60 },
    hail: { color: '#1a1520', weight: 0.60 },
    fog: { color: '#b0b4bc', weight: 0.50 },
    snow: { color: '#d8e8f0', weight: 0.35 },
    rain: { color: '#2a3a4a', weight: 0.30 },
    drizzle: { color: '#3a4a5a', weight: 0.25 },
    partlyCloudy: { color: '#6a7a8a', weight: 0.10 },
};
function updateSkyGradient(day, condition) {
    const now = Date.now();
    const sr = day.sunrise.getTime();
    const ss = day.sunset.getTime();
    const m = 60000;
    let from = 'night', to = 'night', t = 0;
    if (now >= ss + 60 * m || now < sr - 60 * m) {
        // Full night — defaults already set
    }
    else if (now >= ss) {
        from = 'goldenHour';
        to = 'dusk';
        t = (now - ss) / (60 * m);
    }
    else if (now >= ss - 30 * m) {
        from = 'afternoon';
        to = 'goldenHour';
        t = (now - (ss - 30 * m)) / (30 * m);
    }
    else if (now >= ss - 3 * 60 * m) {
        from = 'day';
        to = 'afternoon';
        t = (now - (ss - 3 * 60 * m)) / (2.5 * 60 * m);
    }
    else if (now >= sr + 3 * 60 * m) {
        // Stable day — quick morning→day transition then hold
        from = 'morning';
        to = 'day';
        t = Math.min(1, (now - (sr + 3 * 60 * m)) / (60 * m));
    }
    else if (now >= sr + 30 * m) {
        from = 'sunrise';
        to = 'morning';
        t = (now - (sr + 30 * m)) / (2.5 * 60 * m);
    }
    else if (now >= sr) {
        from = 'dawn';
        to = 'sunrise';
        t = (now - sr) / (30 * m);
    }
    else {
        from = 'night';
        to = 'dawn';
        t = (now - (sr - 60 * m)) / (60 * m);
    }
    t = Math.max(0, Math.min(1, t));
    const p1 = SKY_PHASES[from];
    const p2 = SKY_PHASES[to];
    let top = lerpColor(p1.top, p2.top, t);
    let bot = lerpColor(p1.bottom, p2.bottom, t);
    const mod = CONDITION_MODS[condition];
    if (mod) {
        top = lerpColor(top, mod.color, mod.weight);
        bot = lerpColor(bot, mod.color, mod.weight);
    }
    document.body.style.background = `linear-gradient(to bottom, ${top}, ${bot})`;
    applyTextScheme(skyLuminance(top, bot));
}
// ── Ambient Particles ─────────────────────────────────────────────────────────
function ambientTargetCount(day, condition) {
    switch (condition) {
        case 'rain': return Math.min(200, 100 + Math.round(day.precipSum * 40));
        case 'drizzle': return Math.min(120, 50 + Math.round(day.precipSum * 60));
        case 'snow': {
            const showers = day.weatherCode >= 85;
            return showers
                ? 40 + Math.floor(Math.random() * 31)
                : 60 + Math.floor(Math.random() * 41);
        }
        case 'hail': return 30 + Math.floor(Math.random() * 31);
        case 'fog': return 15 + Math.floor(Math.random() * 11);
        case 'storm': return 180;
        case 'clear':
            return day.windSpeedMax > 20 ? Math.min(30, Math.floor(day.windSpeedMax / 5)) : 0;
        case 'partlyCloudy':
            return day.windSpeedMax > 20 ? Math.min(15, Math.floor(day.windSpeedMax / 5)) : 0;
        default: return 0;
    }
}
function spawnEdgeCoords(wv) {
    const w = canvas.width, h = canvas.height;
    const ax = Math.abs(wv.vx), ay = Math.abs(wv.vy);
    if (ax < 0.05 && ay < 0.05)
        return { x: Math.random() * w, y: Math.random() * h };
    if (ax > 0.05 && ay > 0.05) {
        if (Math.random() < ax / (ax + ay)) {
            return { x: wv.vx > 0 ? -20 : w + 20, y: Math.random() * h };
        }
        return { x: Math.random() * w, y: wv.vy > 0 ? -20 : h + 20 };
    }
    if (ax > ay)
        return { x: wv.vx > 0 ? -20 : w + 20, y: Math.random() * h };
    return { x: Math.random() * w, y: wv.vy > 0 ? -20 : h + 20 };
}
function createAmbientParticle(condition, weatherCode, wv, prePopulate) {
    const w = canvas.width, h = canvas.height;
    const base = prePopulate ? { x: Math.random() * w, y: Math.random() * h } : spawnEdgeCoords(wv);
    if (condition === 'fog') {
        return { ...base, vx: wv.vx * 0.3, vy: wv.vy * 0.3,
            alpha: 0.04 + Math.random() * 0.06, type: 'fog',
            radius: 80 + Math.random() * 120 };
    }
    if (condition === 'snow') {
        const showers = weatherCode >= 85;
        const pvx = wv.vx * 2;
        const pvy = wv.vy * 2 + (showers ? 1.5 : 0.8);
        return { ...base, vx: pvx, vy: pvy,
            alpha: 0.6 + Math.random() * 0.3, type: 'snow',
            radius: (showers ? 3 : 2) + Math.random() * (showers ? 4 : 3),
            wobble: Math.random() * Math.PI * 2,
            wobbleAmp: 0.03 + Math.random() * 0.05 };
    }
    if (condition === 'hail') {
        const pvx = wv.vx * 10;
        const pvy = wv.vy * 10 + 12;
        return { ...base, vx: pvx, vy: pvy,
            alpha: 0.55 + Math.random() * 0.30, type: 'hail',
            radius: 3 + Math.random() * 3 };
    }
    if (condition === 'drizzle') {
        const pvx = wv.vx * 5;
        const pvy = wv.vy * 5 + 3;
        return { ...base, vx: pvx, vy: pvy,
            alpha: 0.20 + Math.random() * 0.25, type: 'rain',
            length: 8 + Math.random() * 10,
            angle: Math.atan2(pvy, pvx) };
    }
    if (condition === 'rain' || condition === 'storm') {
        const pvx = wv.vx * 8;
        const pvy = wv.vy * 8 + 6;
        return { ...base, vx: pvx, vy: pvy,
            alpha: 0.35 + Math.random() * 0.30, type: 'rain',
            length: 15 + Math.random() * 20,
            angle: Math.atan2(pvy, pvx) };
    }
    // clear / partlyCloudy — wind streaks
    const pvx = wv.vx * 12;
    const pvy = wv.vy * 12;
    return { ...base, vx: pvx, vy: pvy,
        alpha: 0.06 + Math.random() * 0.12, type: 'windstreak',
        length: 40 + Math.random() * 80,
        angle: Math.atan2(pvy, pvx) };
}
function wrapAmbientParticle(p) {
    const { width: w, height: h } = canvas;
    const pad = 25;
    if (p.x > w + pad) {
        p.x = -pad;
        p.y = Math.random() * h;
    }
    else if (p.x < -pad) {
        p.x = w + pad;
        p.y = Math.random() * h;
    }
    else if (p.y > h + pad) {
        p.y = -pad;
        p.x = Math.random() * w;
    }
    else if (p.y < -pad) {
        p.y = h + pad;
        p.x = Math.random() * w;
    }
}
function initAmbientParticles(day, condition, nightClear) {
    ambientParticles = [];
    shootingStars = [];
    ufoActive = null;
    isNightClear = nightClear;
    const wv = windVector(day);
    const target = ambientTargetCount(day, condition);
    for (let i = 0; i < target; i++) {
        const prePopulate = i < Math.floor(target / 2);
        ambientParticles.push(createAmbientParticle(condition, day.weatherCode, wv, prePopulate));
    }
    if (isNightClear) {
        const w = canvas.width, h = canvas.height;
        const starCount = 160;
        for (let i = 0; i < starCount; i++) {
            const baseAlpha = 0.4 + Math.random() * 0.6;
            const r = Math.random();
            // Most stars small, a few larger
            const radius = r < 0.7 ? 0.5 + Math.random() * 0.8 : r < 0.93 ? 1.2 + Math.random() * 0.8 : 2 + Math.random() * 0.8;
            ambientParticles.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.85, // stars in upper 85% of sky
                vx: 0, vy: 0,
                alpha: baseAlpha,
                baseAlpha,
                type: 'star',
                radius,
                phase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.0005 + Math.random() * 0.002,
            });
        }
        const now = Date.now();
        lastShootingStarTime = now;
        nextShootingStarDelay = 12000 + Math.random() * 10000;
        lastUfoTime = now;
        nextUfoDelay = 45000 + Math.random() * 45000;
    }
}
function tickAmbientParticles() {
    const now = performance.now();
    for (const p of ambientParticles) {
        if (p.type === 'star') {
            p.alpha = (p.baseAlpha ?? 0.7) * (0.55 + 0.45 * Math.sin(p.phase + now * p.twinkleSpeed));
            continue;
        }
        if (p.type === 'snow' && p.wobble !== undefined && p.wobbleAmp !== undefined) {
            p.vx += Math.sin(now * 0.002 + p.wobble) * p.wobbleAmp;
        }
        p.x += p.vx;
        p.y += p.vy;
        wrapAmbientParticle(p);
    }
}
function drawAmbientParticles(condition) {
    if (condition === 'fog') {
        ctx.fillStyle = 'rgba(160,165,175,0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    for (const p of ambientParticles) {
        switch (p.type) {
            case 'rain': {
                const isD = condition === 'drizzle';
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle ?? Math.PI / 2);
                ctx.fillStyle = `rgba(${isD ? '180,215,255' : '150,200,255'},${p.alpha})`;
                const lw = isD ? 1 : 1.5;
                ctx.fillRect(-(p.length ?? 20) / 2, -lw / 2, p.length ?? 20, lw);
                ctx.restore();
                break;
            }
            case 'snow': {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius ?? 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
                ctx.fill();
                break;
            }
            case 'hail': {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius ?? 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200,230,255,${p.alpha})`;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
                break;
            }
            case 'fog': {
                const r = p.radius ?? 120;
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                grad.addColorStop(0, `rgba(180,185,195,${p.alpha})`);
                grad.addColorStop(1, 'rgba(180,185,195,0)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
                break;
            }
            case 'windstreak': {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle ?? 0);
                ctx.strokeStyle = `rgba(255,255,255,${p.alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-(p.length ?? 60) / 2, 0);
                ctx.lineTo((p.length ?? 60) / 2, 0);
                ctx.stroke();
                ctx.restore();
                break;
            }
            case 'star': {
                const r = p.radius ?? 1;
                if (r > 1.5) {
                    // Larger stars get a soft glow
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
                    grad.addColorStop(0, `rgba(255,255,240,${p.alpha})`);
                    grad.addColorStop(1, 'rgba(255,255,240,0)');
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,245,${p.alpha})`;
                ctx.fill();
                break;
            }
        }
    }
}
// ── Lightning ─────────────────────────────────────────────────────────────────
function drawLightningFlash(condition) {
    const now = Date.now();
    if ((condition === 'storm' || condition === 'hail') && now - lastLightningCheck > 1000) {
        lastLightningCheck = now;
        if (Math.random() < 0.20) {
            lightningAlpha = 0.85 + Math.random() * 0.15;
        }
    }
    if (lightningAlpha > 0.001) {
        ctx.fillStyle = `rgba(220,230,255,${lightningAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        lightningAlpha *= 0.82;
    }
}
// ── Shooting Stars & UFO ──────────────────────────────────────────────────────
function spawnShootingStar() {
    const w = canvas.width, h = canvas.height;
    // Start from top-left quadrant, travel down-right at a shallow diagonal
    const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6); // 30°–60° below horizontal
    const x = Math.random() * w * 0.7;
    const y = Math.random() * h * 0.4;
    shootingStars.push({
        x, y,
        angle,
        speed: 14 + Math.random() * 10,
        length: 80 + Math.random() * 120,
        alpha: 0.9 + Math.random() * 0.1,
        done: false,
    });
}
function tickShootingStars() {
    for (const s of shootingStars) {
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.018;
        if (s.alpha <= 0 || s.x > canvas.width + 50 || s.y > canvas.height + 50)
            s.done = true;
    }
    shootingStars = shootingStars.filter((s) => !s.done);
    if (isNightClear) {
        const now = Date.now();
        if (now - lastShootingStarTime > nextShootingStarDelay) {
            spawnShootingStar();
            lastShootingStarTime = now;
            nextShootingStarDelay = 12000 + Math.random() * 10000;
        }
    }
}
function drawShootingStars() {
    for (const s of shootingStars) {
        const tailX = s.x - Math.cos(s.angle) * s.length;
        const tailY = s.y - Math.sin(s.angle) * s.length;
        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Bright tip
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
        ctx.restore();
    }
}
function spawnUFO() {
    const w = canvas.width, h = canvas.height;
    // Appears on left or right edge, cruises across the upper sky
    const fromLeft = Math.random() < 0.5;
    ufoActive = {
        x: fromLeft ? -30 : w + 30,
        y: h * (0.08 + Math.random() * 0.20),
        vx: fromLeft ? (0.4 + Math.random() * 0.5) : -(0.4 + Math.random() * 0.5),
        vy: (Math.random() - 0.5) * 0.15,
        alpha: 0,
        phase: 0,
        done: false,
    };
}
function tickUFO() {
    if (!isNightClear) {
        ufoActive = null;
        return;
    }
    const now = Date.now();
    if (!ufoActive && now - lastUfoTime > nextUfoDelay) {
        spawnUFO();
        lastUfoTime = now;
        nextUfoDelay = 45000 + Math.random() * 45000;
    }
    if (!ufoActive)
        return;
    const u = ufoActive;
    u.x += u.vx;
    u.y += u.vy;
    u.phase += 0.04;
    const w = canvas.width;
    // Fade in over first ~40px of travel, fade out over last ~40px
    const distFromEdge = u.vx > 0 ? u.x : w - u.x;
    if (distFromEdge < 60) {
        u.alpha = Math.min(u.alpha + 0.02, Math.min(1, distFromEdge / 60));
    }
    else {
        u.alpha = Math.min(u.alpha + 0.02, 1);
    }
    const offscreen = u.vx > 0 ? u.x > w + 40 : u.x < -40;
    if (offscreen) {
        ufoActive = null;
    }
}
function drawUFO() {
    if (!ufoActive)
        return;
    const u = ufoActive;
    const { x, y, alpha, phase } = u;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    // Subtle vertical bob
    const bob = Math.sin(phase) * 2;
    // Beam glow below
    const beamGrad = ctx.createRadialGradient(0, bob + 6, 0, 0, bob + 6, 18);
    beamGrad.addColorStop(0, 'rgba(100,255,160,0.18)');
    beamGrad.addColorStop(1, 'rgba(100,255,160,0)');
    ctx.beginPath();
    ctx.ellipse(0, bob + 6, 18, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = beamGrad;
    ctx.fill();
    // Body — dark disc with green-tinted rim
    ctx.beginPath();
    ctx.ellipse(0, bob, 12, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,36,40,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,255,160,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Dome on top
    ctx.beginPath();
    ctx.ellipse(0, bob - 3, 6, 4, 0, Math.PI, 0);
    ctx.fillStyle = 'rgba(80,200,140,0.4)';
    ctx.fill();
    // Blinking lights — alternate every ~40 frames using phase
    const blink = Math.sin(phase * 2.5) > 0;
    const lightColor = blink ? 'rgba(255,80,80,0.9)' : 'rgba(80,255,160,0.9)';
    ctx.beginPath();
    ctx.arc(-8, bob + 1, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = lightColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, bob + 1, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = blink ? 'rgba(80,255,160,0.9)' : 'rgba(255,80,80,0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, bob + 2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,120,0.9)';
    ctx.fill();
    ctx.restore();
}
// ── Burst Particles ───────────────────────────────────────────────────────────
function spawnBurst(noteCount, day, hue) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = noteCount * (4 + Math.floor(Math.random() * 5));
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 1.5;
        burstParticles.push({
            x: cx + (Math.random() - 0.5) * 40,
            y: cy + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 4,
            alpha: 0.7 + Math.random() * 0.3,
            decay: 0.003 + Math.random() * 0.004,
            hue: hue + (Math.random() - 0.5) * 30,
        });
    }
}
function tickBurstParticles(day) {
    const wv = windVector(day);
    const driftX = wv.vx * 0.5;
    const driftY = wv.vy * 0.5;
    for (const p of burstParticles) {
        p.vx = (p.vx + driftX) * 0.985;
        p.vy = (p.vy + driftY) * 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
    }
    burstParticles = burstParticles.filter((p) => p.alpha > 0);
}
function drawBurstParticles() {
    for (const p of burstParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},70%,80%,${p.alpha})`;
        ctx.fill();
    }
}
// ── Canvas + Render Loop ──────────────────────────────────────────────────────
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
function startRenderLoop(day, condition) {
    if (animFrameId !== null)
        cancelAnimationFrame(animFrameId);
    function frame() {
        updateSkyGradient(day, condition);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        tickAmbientParticles();
        drawAmbientParticles(condition);
        tickShootingStars();
        drawShootingStars();
        tickUFO();
        drawUFO();
        drawLightningFlash(condition);
        tickBurstParticles(day);
        drawBurstParticles();
        animFrameId = requestAnimationFrame(frame);
    }
    animFrameId = requestAnimationFrame(frame);
}
// ── Display ───────────────────────────────────────────────────────────────────
function displayWeather(day, currentTemp, locationName, profile, isNight) {
    const get = (id) => document.getElementById(id);
    get('weather-emoji').textContent = nowEmoji(day.weatherCode, isNight);
    get('location-name').textContent = locationName;
    get('current-temp').innerHTML = `${Math.round(currentTemp)}<span class="deg">°</span>`;
    get('condition-label').textContent = wmoConditionLabel(day.weatherCode);
    const fl = feelsLike(currentTemp, day.windSpeedMax, day.humidityMax);
    get('weather-details').innerHTML = [
        `<span>${degreesToCompass(day.windDirection)} ${Math.round(day.windSpeedMax)} mph</span>`,
        `<span>${day.humidityMax}% humidity</span>`,
        `<span>${day.cloudCover}% cloud</span>`,
        `<span>Feels ${fl}°</span>`,
        `<span>H: ${Math.round(day.tempMax)}° / L: ${Math.round(day.tempMin)}°</span>`,
    ].join('');
    get('play-btn-profile').textContent = `${profile.scaleLabel} · ${profile.material.charAt(0).toUpperCase() + profile.material.slice(1)}`;
    get('weather-card').removeAttribute('hidden');
}
function showError(message) {
    stopLoadingAnimation();
    const errorEl = document.getElementById('error-state');
    errorEl.innerHTML = `<p>${message}</p><button onclick="location.reload()">Retry</button>`;
    errorEl.removeAttribute('hidden');
}
// ── Location Loading ──────────────────────────────────────────────────────────
async function loadLocation(lat, lng, locationName, loadingText = 'Locating…') {
    currentLat = lat;
    currentLng = lng;
    currentLocationName = locationName;
    startLoadingAnimation(loadingText);
    document.getElementById('weather-card').setAttribute('hidden', '');
    document.getElementById('city-form').setAttribute('hidden', '');
    const { day, currentTemp } = await fetchForecast(lat, lng);
    const profile = mapWeatherToAudio(day);
    const hue = materialHue(profile.material);
    const condition = classifyCondition(day.weatherCode);
    const isNight = Date.now() < day.sunrise.getTime() || Date.now() > day.sunset.getTime();
    if (playing && engine) {
        engine.stop();
        playing = false;
    }
    await waitMinLoadTime();
    stopLoadingAnimation();
    displayWeather(day, currentTemp, locationName, profile, isNight);
    initAmbientParticles(day, condition, isNight && condition === 'clear');
    startRenderLoop(day, condition);
    const oldBtn = document.getElementById('play-btn');
    const btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);
    const btnLabel = btn.querySelector('#play-btn-label');
    btnLabel.textContent = 'Play Chimes';
    btn.addEventListener('click', async () => {
        if (!playing) {
            if (!engine) {
                const { AudioEngine } = await import('./audio/engine.js');
                engine = new AudioEngine();
            }
            engine.onStrike = (n) => spawnBurst(n, day, hue);
            await engine.start(profile);
            btnLabel.textContent = 'Stop Chimes';
            playing = true;
        }
        else {
            engine.stop();
            btnLabel.textContent = 'Play Chimes';
            playing = false;
        }
    });
}
// ── Refresh ───────────────────────────────────────────────────────────────────
async function doRefresh() {
    if (currentLat === null)
        return;
    const wasPlaying = playing;
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn)
        refreshBtn.disabled = true;
    try {
        await loadLocation(currentLat, currentLng, currentLocationName, 'Refreshing…');
        if (wasPlaying)
            document.getElementById('play-btn')?.dispatchEvent(new MouseEvent('click'));
    }
    finally {
        if (refreshBtn)
            refreshBtn.disabled = false;
    }
}
function tryAutoRefresh() {
    const now = Date.now();
    if (now - lastAutoRefreshAttempt < 5000)
        return;
    lastAutoRefreshAttempt = now;
    if (currentLat === null)
        return;
    refreshTimestamps = refreshTimestamps.filter(t => now - t < 60000);
    if (refreshTimestamps.length >= 3)
        return;
    refreshTimestamps.push(now);
    doRefresh().catch(() => { });
}
// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    canvas = document.getElementById('particle-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startLoadingAnimation('Locating…');
    const form = document.getElementById('city-form');
    const input = document.getElementById('city-input');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name)
            return;
        const existingError = form.querySelector('.city-error');
        if (existingError)
            existingError.remove();
        let result;
        try {
            result = await geocodeCity(name);
        }
        catch {
            const errorEl = document.createElement('div');
            errorEl.className = 'city-error';
            errorEl.textContent = `City "${name}" not found. Try again.`;
            form.appendChild(errorEl);
            return;
        }
        try {
            await loadLocation(result.lat, result.lng, result.name);
        }
        catch {
            showError('Could not load weather data. Check your connection and try again.');
        }
    });
    function closeCityForm() {
        form.setAttribute('hidden', '');
        const existingError = form.querySelector('.city-error');
        if (existingError)
            existingError.remove();
        if (currentLat !== null) {
            document.getElementById('weather-card').removeAttribute('hidden');
        }
    }
    document.getElementById('cancel-city-btn').addEventListener('click', closeCityForm);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !form.hasAttribute('hidden'))
            closeCityForm();
    });
    document.getElementById('refresh-btn').addEventListener('click', () => {
        doRefresh().catch(() => { });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible')
            tryAutoRefresh();
    });
    window.addEventListener('focus', tryAutoRefresh);
    document.getElementById('change-location-btn').addEventListener('click', () => {
        if (playing && engine) {
            engine.stop();
            playing = false;
        }
        document.getElementById('weather-card').setAttribute('hidden', '');
        document.getElementById('loading-state').setAttribute('hidden', '');
        input.value = '';
        const existingError = form.querySelector('.city-error');
        if (existingError)
            existingError.remove();
        form.removeAttribute('hidden');
    });
    try {
        const pos = await tryGeolocation();
        const name = await reverseGeocode(pos.lat, pos.lng);
        try {
            await loadLocation(pos.lat, pos.lng, name);
        }
        catch {
            showError('Could not load weather data. Check your connection and try again.');
        }
    }
    catch {
        try {
            document.querySelector('#loading-state .loading-text').textContent = 'Detecting location…';
            const ipLoc = await tryIPGeolocation();
            await loadLocation(ipLoc.lat, ipLoc.lng, ipLoc.name);
        }
        catch {
            stopLoadingAnimation();
            form.removeAttribute('hidden');
        }
    }
}
init();
//# sourceMappingURL=now.js.map