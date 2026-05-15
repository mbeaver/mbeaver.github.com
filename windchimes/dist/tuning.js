import { AudioEngine } from './audio/engine.js';
import { mapWeatherToAudio } from './audio/mapping.js';
import { renderTile } from './ui/tile.js';
const WMO_OPTIONS = [
    [0, 'Clear'], [1, 'Mainly Clear'], [2, 'Partly Cloudy'], [3, 'Overcast'],
    [45, 'Fog'], [51, 'Light Drizzle'], [55, 'Heavy Drizzle'],
    [61, 'Light Rain'], [63, 'Moderate Rain'], [65, 'Heavy Rain'],
    [71, 'Light Snow'], [75, 'Heavy Snow'], [80, 'Rain Showers'],
    [82, 'Violent Showers'], [95, 'Thunderstorm'], [99, 'Thunderstorm + Hail'],
];
let weatherCode = 2;
let tempMax = 65;
let windSpeedMax = 14;
let cloudCover = 40;
let humidityMax = 60;
const overrides = {};
const syncers = [];
const engine = new AudioEngine();
let isPlaying = false;
let engineUpdateTimer = null;
const TODAY = new Date().toISOString().slice(0, 10);
function makeDay() {
    const c = weatherCode;
    let precipSum = 0;
    if (c >= 51 && c <= 57)
        precipSum = 0.05;
    else if (c >= 61 && c <= 67)
        precipSum = 0.15;
    else if (c >= 71 && c <= 77)
        precipSum = 0.05;
    else if (c >= 80 && c <= 82)
        precipSum = 0.20;
    else if (c >= 85 && c <= 86)
        precipSum = 0.05;
    else if (c >= 95)
        precipSum = 0.30;
    return {
        date: TODAY, weatherCode: c,
        tempMax, tempMin: tempMax - 15,
        precipSum, windSpeedMax,
        windDirection: 180, cloudCover, humidityMax,
    };
}
function getDerived() { return mapWeatherToAudio(makeDay()); }
function getEffective() { return { ...getDerived(), ...overrides }; }
function refresh() {
    const wrap = document.getElementById('tile-wrap');
    wrap.innerHTML = '';
    wrap.append(renderTile(makeDay(), TODAY));
    const derived = getDerived();
    const eff = getEffective();
    const lbl = document.getElementById('profile-label');
    if (lbl)
        lbl.textContent = `${eff.material}  ·  ${derived.scaleLabel}`;
    syncers.forEach(fn => fn(derived));
}
function scheduleEngineUpdate() {
    if (engineUpdateTimer !== null)
        clearTimeout(engineUpdateTimer);
    engineUpdateTimer = setTimeout(() => {
        engineUpdateTimer = null;
        if (isPlaying)
            void engine.transition(getEffective());
    }, 300);
}
// ── Weather controls ────────────────────────────────────────────────────────
function buildWeatherControls() {
    const wrap = document.createElement('div');
    wrap.className = 'tuning-weather';
    function addSelect(label, options, init, onChange) {
        const field = document.createElement('div');
        field.className = 'tuning-field';
        const lbl = document.createElement('span');
        lbl.className = 'tuning-label';
        lbl.textContent = label;
        const sel = document.createElement('select');
        sel.className = 'tuning-select';
        for (const [val, name] of options) {
            const opt = document.createElement('option');
            opt.value = String(val);
            opt.textContent = name;
            if (val === init)
                opt.selected = true;
            sel.append(opt);
        }
        sel.addEventListener('change', () => { onChange(parseInt(sel.value, 10)); refresh(); scheduleEngineUpdate(); });
        field.append(lbl, sel);
        wrap.append(field);
    }
    function addRange(label, min, max, init, unit, onChange) {
        const field = document.createElement('div');
        field.className = 'tuning-field';
        const lbl = document.createElement('span');
        lbl.className = 'tuning-label';
        lbl.textContent = label;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'tuning-range';
        slider.min = String(min);
        slider.max = String(max);
        slider.step = '1';
        slider.value = String(init);
        const unitEl = document.createElement('span');
        unitEl.className = 'tuning-unit';
        unitEl.textContent = `${init}${unit}`;
        slider.addEventListener('input', () => {
            const v = parseInt(slider.value, 10);
            unitEl.textContent = `${v}${unit}`;
            onChange(v);
            refresh();
            scheduleEngineUpdate();
        });
        field.append(lbl, slider, unitEl);
        wrap.append(field);
    }
    addSelect('Condition', WMO_OPTIONS, weatherCode, v => { weatherCode = v; });
    addRange('Temp max', 0, 110, tempMax, '°F', v => { tempMax = v; });
    addRange('Wind speed', 0, 80, windSpeedMax, ' mph', v => { windSpeedMax = v; });
    addRange('Cloud cover', 0, 100, cloudCover, '%', v => { cloudCover = v; });
    addRange('Humidity', 0, 100, humidityMax, '%', v => { humidityMax = v; });
    return wrap;
}
// ── Audio parameter rows ────────────────────────────────────────────────────
function buildSliderRow(key, label, min, max, step, fmt) {
    const row = document.createElement('div');
    row.className = 'param-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'param-label';
    labelEl.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'param-slider';
    Object.assign(slider, { min: String(min), max: String(max), step: String(step) });
    const valueEl = document.createElement('span');
    valueEl.className = 'param-value';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'param-reset';
    resetBtn.textContent = '×';
    resetBtn.hidden = true;
    const init = getDerived()[key];
    slider.value = String(init);
    valueEl.textContent = fmt(init);
    slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        overrides[key] = v;
        row.classList.add('is-overridden');
        resetBtn.hidden = false;
        valueEl.textContent = fmt(v);
        scheduleEngineUpdate();
    });
    resetBtn.addEventListener('click', () => {
        delete overrides[key];
        row.classList.remove('is-overridden');
        resetBtn.hidden = true;
        const v = getDerived()[key];
        slider.value = String(v);
        valueEl.textContent = fmt(v);
        scheduleEngineUpdate();
    });
    syncers.push(derived => {
        if (!(key in overrides)) {
            const v = derived[key];
            slider.value = String(v);
            valueEl.textContent = fmt(v);
        }
    });
    row.append(labelEl, slider, valueEl, resetBtn);
    return row;
}
function buildToggleRow(key, label) {
    const row = document.createElement('div');
    row.className = 'param-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'param-label';
    labelEl.textContent = label;
    const btn = document.createElement('button');
    btn.className = 'param-toggle';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'param-reset';
    resetBtn.textContent = '×';
    resetBtn.hidden = true;
    function sync(val, fromOverride) {
        btn.textContent = val ? 'on' : 'off';
        btn.classList.toggle('is-on', val);
        row.classList.toggle('is-overridden', fromOverride);
        resetBtn.hidden = !fromOverride;
    }
    sync(getDerived()[key], false);
    btn.addEventListener('click', () => {
        const cur = key in overrides ? !!(overrides[key]) : getDerived()[key];
        overrides[key] = !cur;
        sync(!cur, true);
        scheduleEngineUpdate();
    });
    resetBtn.addEventListener('click', () => {
        delete overrides[key];
        sync(getDerived()[key], false);
        scheduleEngineUpdate();
    });
    syncers.push(derived => {
        if (!(key in overrides))
            sync(derived[key], false);
    });
    row.append(labelEl, btn, resetBtn);
    return row;
}
function buildDelayRow() {
    const DEFAULT_DELAY = 0.4;
    const row = document.createElement('div');
    row.className = 'param-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'param-label';
    labelEl.textContent = 'delayTime';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'param-toggle';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'param-slider';
    Object.assign(slider, { min: '0.05', max: '1.0', step: '0.05', value: String(DEFAULT_DELAY) });
    const valueEl = document.createElement('span');
    valueEl.className = 'param-value';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'param-reset';
    resetBtn.textContent = '×';
    resetBtn.hidden = true;
    function sync(delayVal, fromOverride) {
        const on = delayVal !== null;
        toggleBtn.textContent = on ? 'on' : 'off';
        toggleBtn.classList.toggle('is-on', on);
        slider.hidden = !on;
        valueEl.textContent = on ? `${delayVal.toFixed(2)} s` : '—';
        row.classList.toggle('is-overridden', fromOverride);
        resetBtn.hidden = !fromOverride;
    }
    const initDerived = getDerived();
    if (initDerived.delayTime !== null)
        slider.value = String(initDerived.delayTime);
    sync(initDerived.delayTime, false);
    toggleBtn.addEventListener('click', () => {
        const cur = 'delayTime' in overrides ? overrides.delayTime : getDerived().delayTime;
        const next = cur === null ? parseFloat(slider.value) : null;
        overrides.delayTime = next;
        sync(next, true);
        scheduleEngineUpdate();
    });
    slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        overrides.delayTime = v;
        sync(v, true);
        scheduleEngineUpdate();
    });
    resetBtn.addEventListener('click', () => {
        delete overrides.delayTime;
        const d = getDerived().delayTime;
        if (d !== null)
            slider.value = String(d);
        sync(d, false);
        scheduleEngineUpdate();
    });
    syncers.push(derived => {
        if (!('delayTime' in overrides)) {
            if (derived.delayTime !== null)
                slider.value = String(derived.delayTime);
            sync(derived.delayTime, false);
        }
    });
    row.append(labelEl, toggleBtn, slider, valueEl, resetBtn);
    return row;
}
// ── Copy text ───────────────────────────────────────────────────────────────
function buildCopyText() {
    const derived = getDerived();
    const eff = getEffective();
    const condName = WMO_OPTIONS.find(([c]) => c === weatherCode)?.[1] ?? `WMO ${weatherCode}`;
    function fmtVal(key, v) {
        if (key === 'tickIntervalMs')
            return `${v}ms`;
        if (key === 'reverbDecay' || key === 'noteDurationSec')
            return `${v.toFixed(1)}s`;
        if (key === 'delayTime')
            return v === null ? 'null (off)' : `${v.toFixed(2)}s`;
        if (key === 'maxSimultaneous')
            return String(v);
        if (typeof v === 'number')
            return v.toFixed(2);
        return String(v);
    }
    function ln(key) {
        const d = derived[key];
        const e = eff[key];
        const isOv = key in overrides;
        if (isOv)
            return `  ${key}: ${fmtVal(key, d)} → ${fmtVal(key, e)}   ← overridden`;
        return `  ${key}: ${fmtVal(key, e)}`;
    }
    return `Tuning session export for src/audio/mapping.ts

Simulated conditions:
  Condition: ${condName} (WMO ${weatherCode})
  Temp max: ${tempMax}°F  |  Wind: ${windSpeedMax} mph  |  Cloud: ${cloudCover}%  |  Humidity: ${humidityMax}%

Material: ${eff.material}  |  Scale: ${derived.scaleLabel}

Algorithm defaults → desired tuned values:
${ln('tickIntervalMs')}
${ln('strikeProbability')}
${ln('chordProbability')}
${ln('maxSimultaneous')}
${ln('reverbDecay')}
${ln('delayTime')}
${ln('delayFeedback')}
${ln('noteDurationSec')}
${ln('chorusEnabled')}
${ln('tremoloEnabled')}

Please update src/audio/mapping.ts so the above conditions produce the overridden
values. Make targeted changes to the relevant mapping functions (windToDensity,
cloudToReverb, conditionToEffects, materialToNoteDuration, etc.) — do not
hardcode profile patches.`;
}
// ── Main ────────────────────────────────────────────────────────────────────
function main() {
    // Tile preview
    const tileWrap = document.getElementById('tile-wrap');
    tileWrap.append(renderTile(makeDay(), TODAY));
    // Weather controls
    document.getElementById('weather-controls').append(buildWeatherControls());
    // Audio params
    const audioParams = document.getElementById('audio-params');
    audioParams.append(buildSliderRow('tickIntervalMs', 'tickIntervalMs', 50, 3000, 10, v => `${v} ms`), buildSliderRow('strikeProbability', 'strikeProbability', 0, 1, 0.01, v => v.toFixed(2)), buildSliderRow('chordProbability', 'chordProbability', 0, 1, 0.01, v => v.toFixed(2)), buildSliderRow('maxSimultaneous', 'maxSimultaneous', 1, 5, 1, v => String(Math.round(v))), buildSliderRow('reverbDecay', 'reverbDecay', 0.3, 12, 0.1, v => `${v.toFixed(1)} s`), buildDelayRow(), buildSliderRow('delayFeedback', 'delayFeedback', 0, 0.9, 0.01, v => v.toFixed(2)), buildSliderRow('noteDurationSec', 'noteDurationSec', 0.1, 6, 0.1, v => `${v.toFixed(1)} s`), buildToggleRow('chorusEnabled', 'chorusEnabled'), buildToggleRow('tremoloEnabled', 'tremoloEnabled'));
    // Initial profile label
    const derived = getDerived();
    const lbl = document.getElementById('profile-label');
    lbl.textContent = `${derived.material}  ·  ${derived.scaleLabel}`;
    // Play / Stop
    const playBtn = document.getElementById('play-btn');
    playBtn.addEventListener('click', () => {
        if (!isPlaying) {
            isPlaying = true;
            playBtn.textContent = 'Stop';
            void engine.transition(getEffective());
        }
        else {
            isPlaying = false;
            playBtn.textContent = 'Play';
            engine.stop();
        }
    });
    // Copy for LLM
    const copyBtn = document.getElementById('copy-btn');
    const copyFeedback = document.getElementById('copy-feedback');
    let feedbackTimer = null;
    copyBtn.addEventListener('click', () => {
        void navigator.clipboard.writeText(buildCopyText()).then(() => {
            copyFeedback.textContent = 'Copied!';
            copyFeedback.classList.add('visible');
            if (feedbackTimer !== null)
                clearTimeout(feedbackTimer);
            feedbackTimer = setTimeout(() => {
                copyFeedback.classList.remove('visible');
                feedbackTimer = null;
            }, 2000);
        });
    });
}
document.addEventListener('DOMContentLoaded', main);
//# sourceMappingURL=tuning.js.map