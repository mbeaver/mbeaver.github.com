const WMO_CONDITION = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime Fog',
    51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
    56: 'Freezing Drizzle', 57: 'Heavy Freezing Drizzle',
    61: 'Light Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
    66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
    71: 'Light Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
    80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Rain Showers',
    85: 'Snow Showers', 86: 'Heavy Snow Showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Thunderstorm + Heavy Hail',
};
const MATERIAL_LABEL = {
    aluminum: 'Aluminum Chimes',
    bronze: 'Bronze Chimes',
    bamboo: 'Bamboo Chimes',
    glass: 'Glass Chimes',
    crystal: 'Crystal Chimes',
    steel: 'Steel Chimes',
};
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}
function setText(parts) {
    const text = document.getElementById('status-text');
    if (text)
        text.textContent = parts.join('  ·  ');
}
function setVisible(visible) {
    const bar = document.getElementById('status-bar');
    if (!bar)
        return;
    if (visible)
        bar.removeAttribute('hidden');
    else
        bar.setAttribute('hidden', '');
}
export function showStatus(day, profile) {
    setText([
        formatDate(day.date),
        WMO_CONDITION[day.weatherCode] ?? 'Unknown',
        `${Math.round(day.tempMax)}°F`,
        profile.scaleLabel,
        MATERIAL_LABEL[profile.material],
        `${Math.round(day.windSpeedMax)} mph winds`,
    ]);
    setVisible(true);
}
export function showLoading() {
    setText(['Fetching Raleigh weather data…']);
    setVisible(true);
}
export function hideStatus() {
    setVisible(false);
}
//# sourceMappingURL=statusBar.js.map