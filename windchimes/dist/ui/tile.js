const WMO_EMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    56: '🌨️', 57: '🌨️',
    61: '🌦️', 63: '🌧️', 65: '🌧️',
    66: '🌨️', 67: '🌨️',
    71: '🌨️', 73: '🌨️', 75: '❄️', 77: '❄️',
    80: '🌦️', 81: '🌦️', 82: '⛈️',
    85: '🌨️', 86: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
};
export function wmoEmoji(code) {
    return WMO_EMOJI[code] ?? '🌡️';
}
function tileBackground(day) {
    const c = day.weatherCode;
    const t = day.tempMax;
    if (c >= 95)
        return 'rgba(80,50,140,0.20)';
    if (c >= 71 && c <= 77)
        return 'rgba(200,230,255,0.15)';
    if (c >= 45 && c <= 48)
        return 'rgba(150,155,165,0.15)';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 86))
        return 'rgba(80,130,200,0.15)';
    if (c === 3)
        return 'rgba(100,110,120,0.12)';
    // Clear / partly cloudy: temperature-driven amber ↔ icy blue
    const deviation = t - 65;
    const intensity = Math.min(Math.abs(deviation) / 35, 1);
    if (deviation >= 0) {
        const alpha = (0.06 + intensity * 0.10).toFixed(2);
        return `rgba(255,160,50,${alpha})`;
    }
    const alpha = (0.05 + intensity * 0.09).toFixed(2);
    return `rgba(100,180,255,${alpha})`;
}
export function renderTile(day, today) {
    const el = document.createElement('div');
    el.className = 'day-tile';
    el.dataset['date'] = day.date;
    if (day.date > today)
        el.classList.add('is-future');
    el.style.background = tileBackground(day);
    const dayNum = parseInt(day.date.slice(8), 10);
    const dateEl = document.createElement('div');
    dateEl.className = 'tile-date';
    dateEl.textContent = String(dayNum);
    const emojiEl = document.createElement('div');
    emojiEl.className = 'tile-emoji';
    emojiEl.textContent = wmoEmoji(day.weatherCode);
    const tempEl = document.createElement('div');
    tempEl.className = 'tile-temp';
    tempEl.textContent = `${Math.round(day.tempMax)}° / ${Math.round(day.tempMin)}°`;
    const windEl = document.createElement('div');
    windEl.className = 'tile-wind';
    windEl.textContent = `💨 ${Math.round(day.windSpeedMax)} mph`;
    el.append(dateEl, emojiEl, tempEl, windEl);
    if (day.precipSum > 0) {
        const precipEl = document.createElement('div');
        precipEl.className = 'tile-precip';
        precipEl.textContent = `${day.precipSum.toFixed(2)}"`;
        el.append(precipEl);
    }
    return el;
}
//# sourceMappingURL=tile.js.map