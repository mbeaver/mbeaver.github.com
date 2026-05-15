import { renderTile } from './tile.js';
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
function groupByMonth(days) {
    const groups = new Map();
    for (const day of days) {
        const key = day.date.slice(0, 7);
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key).push(day);
    }
    return groups;
}
// Returns 0=Mon … 6=Sun for the first day of the given month
function firstWeekdayOfMonth(year, month) {
    const jsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    return (jsDay + 6) % 7;
}
function shortMonth(yearMonth) {
    const m = parseInt(yearMonth.slice(5), 10);
    return `${MONTH_NAMES[m - 1].slice(0, 3)} ${yearMonth.slice(0, 4)}`;
}
function buildDayHeaders() {
    const row = document.createElement('div');
    row.className = 'cal-header-row';
    for (const h of DAY_HEADERS) {
        const el = document.createElement('div');
        el.className = 'cal-day-header';
        el.textContent = h;
        row.append(el);
    }
    return row;
}
function renderMonth(yearMonth, days, today) {
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const section = document.createElement('section');
    section.className = 'month-section';
    const label = document.createElement('h2');
    label.className = 'month-label';
    label.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
    section.append(label);
    const grid = document.createElement('div');
    grid.className = 'cal-grid';
    grid.append(buildDayHeaders());
    const startPad = firstWeekdayOfMonth(year, month);
    for (let i = 0; i < startPad; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-tile is-empty';
        grid.append(empty);
    }
    for (const day of days) {
        grid.append(renderTile(day, today));
    }
    section.append(grid);
    return section;
}
function updateSiteMeta(days) {
    const meta = document.getElementById('site-meta');
    if (!meta || days.length === 0)
        return;
    const first = days[0].date.slice(0, 7);
    const last = days[days.length - 1].date.slice(0, 7);
    meta.textContent = `Raleigh, NC  ·  ${shortMonth(first)} – ${shortMonth(last)}`;
}
export function renderGrid(days, container) {
    container.innerHTML = '';
    updateSiteMeta(days);
    const today = new Date().toISOString().slice(0, 10);
    const groups = groupByMonth(days);
    for (const [yearMonth, monthDays] of groups) {
        container.append(renderMonth(yearMonth, monthDays, today));
    }
}
export function renderSkeleton(container) {
    container.innerHTML = '';
    for (let m = 0; m < 3; m++) {
        const section = document.createElement('section');
        section.className = 'month-section';
        const label = document.createElement('h2');
        label.className = 'month-label';
        label.innerHTML = '&nbsp;';
        label.style.cssText = 'background:rgba(255,255,255,0.06);width:140px;border-radius:3px;color:transparent;';
        section.append(label);
        const grid = document.createElement('div');
        grid.className = 'cal-grid';
        grid.append(buildDayHeaders());
        for (let i = 0; i < 35; i++) {
            const tile = document.createElement('div');
            tile.className = 'day-tile is-skeleton';
            grid.append(tile);
        }
        section.append(grid);
        container.append(section);
    }
}
//# sourceMappingURL=grid.js.map