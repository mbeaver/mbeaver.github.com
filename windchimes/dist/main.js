import { fetchWeather } from './api/weather.js';
import { AudioEngine } from './audio/engine.js';
import { mapWeatherToAudio } from './audio/mapping.js';
import { renderGrid, renderSkeleton } from './ui/grid.js';
import { showStatus, hideStatus, showLoading } from './ui/statusBar.js';
void (async () => {
    const gridRoot = document.getElementById('grid-root');
    renderSkeleton(gridRoot);
    showLoading();
    let days;
    try {
        days = await fetchWeather();
    }
    catch {
        gridRoot.innerHTML = '<p class="error-message">Could not load weather data. Check your connection and reload.</p>';
        hideStatus();
        return;
    }
    hideStatus();
    renderGrid(days, gridRoot);
    const engine = new AudioEngine();
    let activeTile = null;
    const hintEl = document.getElementById('click-hint');
    gridRoot.addEventListener('click', async (e) => {
        const tile = e.target.closest('[data-date]');
        if (!tile)
            return;
        hintEl?.classList.add('hidden');
        if (tile === activeTile) {
            engine.stop();
            tile.classList.remove('is-playing');
            activeTile = null;
            hideStatus();
            return;
        }
        const date = tile.dataset['date'];
        const day = days.find(d => d.date === date);
        if (!day)
            return;
        const profile = mapWeatherToAudio(day);
        if (activeTile)
            activeTile.classList.remove('is-playing');
        activeTile = tile;
        tile.classList.add('is-playing');
        await engine.transition(profile);
        showStatus(day, profile);
    });
})();
//# sourceMappingURL=main.js.map