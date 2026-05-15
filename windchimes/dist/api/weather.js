const CACHE_KEY = 'wc_weather_cache';
const CACHE_DATE_KEY = 'wc_cache_date';
const API_URL = 'https://archive-api.open-meteo.com/v1/archive';
const LAT = 35.7796;
const LON = -78.6382;
function todayString() {
    return new Date().toISOString().slice(0, 10);
}
function sixMonthsAgoString() {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
}
function normalize(raw) {
    const d = raw.daily;
    return d.time.map((date, i) => ({
        date,
        weatherCode: d.weather_code[i] ?? 0,
        tempMax: d.temperature_2m_max[i] ?? 65,
        tempMin: d.temperature_2m_min[i] ?? 55,
        precipSum: d.precipitation_sum[i] ?? 0,
        windSpeedMax: d.wind_speed_10m_max[i] ?? 0,
        windDirection: d.wind_direction_10m_dominant[i] ?? 0,
        cloudCover: d.cloud_cover_mean[i] ?? 50,
        humidityMax: d.relative_humidity_2m_max[i] ?? 50,
    }));
}
async function fetchFromApi() {
    const params = new URLSearchParams({
        latitude: String(LAT),
        longitude: String(LON),
        start_date: sixMonthsAgoString(),
        end_date: todayString(),
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'wind_speed_10m_max',
            'wind_direction_10m_dominant',
            'cloud_cover_mean',
            'relative_humidity_2m_max',
        ].join(','),
        timezone: 'America/New_York',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
    });
    const res = await fetch(`${API_URL}?${params}`);
    if (!res.ok)
        throw new Error(`Open-Meteo error: ${res.status}`);
    const raw = (await res.json());
    return normalize(raw);
}
export async function fetchWeather() {
    const today = todayString();
    const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedDate === today && cachedData) {
        try {
            return JSON.parse(cachedData);
        }
        catch {
            // fall through to re-fetch
        }
    }
    try {
        const days = await fetchFromApi();
        localStorage.setItem(CACHE_KEY, JSON.stringify(days));
        localStorage.setItem(CACHE_DATE_KEY, today);
        return days;
    }
    catch (err) {
        if (cachedData) {
            try {
                return JSON.parse(cachedData);
            }
            catch {
                // fall through
            }
        }
        throw err;
    }
}
//# sourceMappingURL=weather.js.map