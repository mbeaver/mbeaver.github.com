import { wmoEmoji } from './ui/tile.js';
import { mapWeatherToAudio } from './audio/mapping.js';
// ── Utilities ────────────────────────────────────────────────────────────────
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
function materialHue(material) {
    const hues = {
        crystal: 200, glass: 180, aluminum: 210, bronze: 35, bamboo: 90, steel: 260,
    };
    return hues[material];
}
// ── API ───────────────────────────────────────────────────────────────────────
async function tryGeolocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), reject, { timeout: 10000 });
    });
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
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,cloud_cover_mean,relative_humidity_2m_max',
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
    };
    return { day, currentTemp: cur.temperature_2m };
}
let particles = [];
let canvas;
let ctx;
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
function spawnBurst(noteCount, day, hue) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = noteCount * (4 + Math.floor(Math.random() * 5));
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        particles.push({
            x: cx + (Math.random() - 0.5) * 40,
            y: cy + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 4,
            alpha: 0.7 + Math.random() * 0.3,
            decay: 0.008 + Math.random() * 0.012,
            hue: hue + (Math.random() - 0.5) * 30,
        });
    }
}
function tickParticles(day) {
    const windRad = ((day.windDirection + 180) % 360) * (Math.PI / 180);
    const windStrength = Math.min(day.windSpeedMax / 40, 0.8);
    const driftX = Math.sin(windRad) * windStrength * 0.15;
    const driftY = -Math.cos(windRad) * windStrength * 0.15;
    for (const p of particles) {
        p.vx = (p.vx + driftX) * 0.98;
        p.vy = (p.vy + driftY) * 0.98;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
    }
    particles = particles.filter((p) => p.alpha > 0);
}
function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 80%, ${p.alpha})`;
        ctx.fill();
    }
}
function startRenderLoop(day) {
    function frame() {
        tickParticles(day);
        drawParticles();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
// ── Display ───────────────────────────────────────────────────────────────────
function displayWeather(day, currentTemp, locationName, profile) {
    const get = (id) => document.getElementById(id);
    get('weather-emoji').textContent = wmoEmoji(day.weatherCode);
    get('location-name').textContent = locationName;
    get('current-temp').textContent = `${Math.round(currentTemp)}°`;
    get('condition-label').textContent = wmoConditionLabel(day.weatherCode);
    const fl = feelsLike(currentTemp, day.windSpeedMax, day.humidityMax);
    get('weather-details').innerHTML = [
        `<span>${degreesToCompass(day.windDirection)} ${Math.round(day.windSpeedMax)} mph</span>`,
        `<span>${day.humidityMax}% humidity</span>`,
        `<span>${day.cloudCover}% cloud</span>`,
        `<span>Feels ${fl}°</span>`,
        `<span>H: ${Math.round(day.tempMax)}° / L: ${Math.round(day.tempMin)}°</span>`,
    ].join('');
    get('audio-profile-label').textContent = `${profile.scaleLabel} · ${profile.material.charAt(0).toUpperCase() + profile.material.slice(1)}`;
    get('loading-state').setAttribute('hidden', '');
    get('weather-card').removeAttribute('hidden');
}
// ── City fallback ─────────────────────────────────────────────────────────────
function promptCityFallback() {
    return new Promise((resolve, reject) => {
        const loadingEl = document.getElementById('loading-state');
        const form = document.getElementById('city-form');
        const input = document.getElementById('city-input');
        loadingEl.setAttribute('hidden', '');
        form.removeAttribute('hidden');
        let errorEl = form.querySelector('.city-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if (!name)
                return;
            if (errorEl)
                errorEl.remove();
            try {
                const result = await geocodeCity(name);
                form.setAttribute('hidden', '');
                resolve(result);
            }
            catch {
                errorEl = document.createElement('div');
                errorEl.className = 'city-error';
                errorEl.textContent = `City "${name}" not found. Try again.`;
                form.appendChild(errorEl);
            }
        });
    });
}
function showError(message) {
    document.getElementById('loading-state').setAttribute('hidden', '');
    const errorEl = document.getElementById('error-state');
    errorEl.innerHTML = `<p>${message}</p><button onclick="location.reload()">Retry</button>`;
    errorEl.removeAttribute('hidden');
}
// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    canvas = document.getElementById('particle-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    let lat, lng, locationName;
    try {
        try {
            const pos = await tryGeolocation();
            lat = pos.lat;
            lng = pos.lng;
            locationName = await reverseGeocode(lat, lng);
        }
        catch {
            const fallback = await promptCityFallback();
            lat = fallback.lat;
            lng = fallback.lng;
            locationName = fallback.name;
        }
        const { day, currentTemp } = await fetchForecast(lat, lng);
        const profile = mapWeatherToAudio(day);
        const hue = materialHue(profile.material);
        displayWeather(day, currentTemp, locationName, profile);
        startRenderLoop(day);
        const btn = document.getElementById('play-btn');
        let playing = false;
        let engine = null;
        btn.addEventListener('click', async () => {
            if (!playing) {
                if (!engine) {
                    // Dynamic import so Tone.js only loads (and AudioContext only creates)
                    // after an explicit user gesture, satisfying browser autoplay policy.
                    const { AudioEngine } = await import('./audio/engine.js');
                    engine = new AudioEngine();
                    engine.onStrike = (n) => spawnBurst(n, day, hue);
                }
                await engine.start(profile);
                btn.textContent = 'Stop Chimes';
                playing = true;
            }
            else {
                engine.stop();
                btn.textContent = 'Play Chimes';
                playing = false;
            }
        });
    }
    catch (err) {
        showError('Could not load weather data. Check your connection and try again.');
        console.error(err);
    }
}
init();
//# sourceMappingURL=now.js.map