(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  }

  function grp(cls, children) {
    const g = el('g', cls ? { class: cls } : {});
    children.forEach(c => g.appendChild(c));
    return g;
  }

  function buildLashes(cx, cy) {
    // 7 lash strokes — longer center lashes, radiating from upper arc
    return [-60, -38, -18, 0, 18, 38, 60].map(deg => {
      const rad = (deg - 90) * Math.PI / 180;
      const len = Math.abs(deg) < 25 ? 7 : 5;
      return el('line', {
        x1: (cx + 11 * Math.cos(rad)).toFixed(2),
        y1: (cy + 13 * Math.sin(rad)).toFixed(2),
        x2: (cx + (11 + len) * Math.cos(rad)).toFixed(2),
        y2: (cy + (13 + len) * Math.sin(rad)).toFixed(2),
        stroke: '#111', 'stroke-width': 1.5, 'stroke-linecap': 'round'
      });
    });
  }

  function buildEye(cx, cy, side) {
    return grp('eye-' + side, [
      el('ellipse', { cx, cy, rx: 11, ry: 13, fill: 'white', stroke: '#111', 'stroke-width': 2, class: 'eye-white' }),
      el('circle',  { cx, cy, r: 7, fill: '#1a1a1a' }),
      el('circle',  { cx, cy, r: 3.5, fill: '#111' }),
      el('circle',  { cx: cx + 2, cy: cy - 3, r: 1.5, fill: 'white' }),
      ...buildLashes(cx, cy)
    ]);
  }

  function buildBrowHatches(x0, x1, cpX, cpY, y0, y1) {
    // Hatch marks along a quadratic bezier brow arc
    return Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      const x = (1-t)*(1-t)*x0 + 2*t*(1-t)*cpX + t*t*x1;
      const y = (1-t)*(1-t)*y0 + 2*t*(1-t)*cpY + t*t*y1;
      return el('line', {
        x1: x.toFixed(1), y1: (y - 4).toFixed(1),
        x2: (x + 1.5).toFixed(1), y2: (y + 3).toFixed(1),
        stroke: '#111', 'stroke-width': 1.5, 'stroke-linecap': 'round'
      });
    });
  }

  function buildSVG() {
    const svg = el('svg', { viewBox: '0 0 120 180', width: 400, height: 600, style: 'overflow:visible' });

    // Full-bounding-box hit area so clicking anywhere on Cliffert triggers the click event
    svg.appendChild(el('rect', { x: 0, y: 0, width: 120, height: 180, fill: 'none', 'pointer-events': 'all' }));

    // Neck
    svg.appendChild(el('path', {
      d: 'M 50,114 L 48,143 L 72,143 L 70,114',
      fill: '#dff0df', stroke: '#111', 'stroke-width': 2.5
    }));

    // Upper chest / body
    svg.appendChild(el('path', {
      d: 'M 26,143 Q 60,136 94,143 L 98,175 L 22,175 Z',
      fill: '#dff0df', stroke: '#111', 'stroke-width': 2
    }));

    // Necklace pendant
    svg.appendChild(el('path', { d: 'M 51,124 Q 60,131 69,124', stroke: '#111', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }));
    svg.appendChild(el('circle', { cx: 60, cy: 134, r: 5, fill: 'none', stroke: '#111', 'stroke-width': 1.5 }));
    svg.appendChild(el('circle', { cx: 60, cy: 134, r: 2, fill: '#111' }));

    // Left raised hand (arm-left for walking animation)
    svg.appendChild(grp('arm-left', [
      el('path', {
        d: 'M 6,50 Q 2,60 4,74 Q 7,80 16,78 Q 23,76 21,62 Q 21,52 17,46 Z',
        fill: '#dff0df', stroke: '#111', 'stroke-width': 2, 'stroke-linejoin': 'round'
      }),
      el('line', { x1: 9,  y1: 52, x2: 5,  y2: 30, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('line', { x1: 13, y1: 48, x2: 11, y2: 26, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('line', { x1: 17, y1: 47, x2: 17, y2: 25, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('line', { x1: 20, y1: 49, x2: 22, y2: 28, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    ]));

    // Right raised hand (arm-right for walking animation)
    svg.appendChild(grp('arm-right', [
      el('path', {
        d: 'M 114,50 Q 118,60 116,74 Q 113,80 104,78 Q 97,76 99,62 Q 99,52 103,46 Z',
        fill: '#dff0df', stroke: '#111', 'stroke-width': 2, 'stroke-linejoin': 'round'
      }),
      el('line', { x1: 111, y1: 52, x2: 115, y2: 30, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('line', { x1: 107, y1: 48, x2: 109, y2: 26, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('line', { x1: 103, y1: 47, x2: 103, y2: 25, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('line', { x1: 100, y1: 49, x2: 98,  y2: 28, stroke: '#111', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    ]));

    // Head — large oval, pale mint green skin
    svg.appendChild(el('ellipse', { cx: 60, cy: 65, rx: 44, ry: 52, fill: '#dff0df', stroke: '#111', 'stroke-width': 2.5 }));

    // Short hair — sketchy hatching strokes at the top of the head
    svg.appendChild(el('path', { d: 'M 22,28 Q 60,14 98,28', stroke: '#111', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }));
    Array.from({ length: 16 }, (_, i) => {
      const t = i / 15;
      const x = 22 + t * 76;
      const y = 28 - 14 * Math.sin(t * Math.PI);
      svg.appendChild(el('line', {
        x1: x.toFixed(1), y1: y.toFixed(1),
        x2: (x + 1).toFixed(1), y2: (y - 9).toFixed(1),
        stroke: '#111', 'stroke-width': 1.5, 'stroke-linecap': 'round'
      }));
    });

    // Left ear
    svg.appendChild(el('path', { d: 'M 17,60 Q 6,70 17,82', stroke: '#111', 'stroke-width': 2.5, fill: '#dff0df', 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { d: 'M 17,62 Q 12,70 17,80', stroke: '#111', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }));

    // Right ear
    svg.appendChild(el('path', { d: 'M 103,60 Q 114,70 103,82', stroke: '#111', 'stroke-width': 2.5, fill: '#dff0df', 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { d: 'M 103,62 Q 108,70 103,80', stroke: '#111', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }));

    // Left eyebrow — very thick and bushy with hatching
    svg.appendChild(grp('brow-left', [
      el('path', { d: 'M 20,38 Q 34,26 56,34', stroke: '#111', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }),
      el('path', { d: 'M 21,36 Q 35,24 55,32', stroke: '#111', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }),
      ...buildBrowHatches(20, 56, 34, 26, 38, 34)
    ]));

    // Right eyebrow — mirrored
    svg.appendChild(grp('brow-right', [
      el('path', { d: 'M 64,34 Q 86,26 100,38', stroke: '#111', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }),
      el('path', { d: 'M 65,32 Q 87,24 99,36', stroke: '#111', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }),
      ...buildBrowHatches(64, 100, 86, 26, 34, 38)
    ]));

    // Eyes
    svg.appendChild(buildEye(38, 55, 'left'));
    svg.appendChild(buildEye(82, 55, 'right'));

    // Nose — elongated, pen-drawn style
    svg.appendChild(el('path', {
      d: 'M 58,70 L 54,88 Q 53,95 58,96 Q 62,97 67,96 Q 72,95 66,88 L 62,70',
      stroke: '#111', 'stroke-width': 1.5, fill: 'none',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    svg.appendChild(el('path', { d: 'M 54,94 Q 56,98 60,95', stroke: '#111', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { d: 'M 67,94 Q 65,98 60,95', stroke: '#111', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }));

    // Mouth — very dark filled lips, key feature from drawing
    svg.appendChild(grp('mouth-normal', [
      el('path', { d: 'M 40,106 Q 60,98 80,106 Q 60,120 40,106 Z', fill: '#111', stroke: '#111', 'stroke-width': 1.5 }),
      el('path', { d: 'M 40,106 Q 50,102 60,98 Q 70,102 80,106', stroke: '#444', 'stroke-width': 1, fill: 'none' }),
    ]));

    // Mouth — whistle O (hidden unless .whistling)
    svg.appendChild(grp('mouth-whistle', [
      el('ellipse', { cx: 60, cy: 108, rx: 10, ry: 12, fill: '#111', stroke: '#111', 'stroke-width': 1.5 })
    ]));

    return svg;
  }

  // ── Constants ──
  const LERP         = 0.045;
  const BOUNDARY_PAD = 60;
  const SVG_W        = 400;
  const SVG_H        = 600;
  const IDLE_DIST    = 12;

  // ── Mount ──
  const wrap = document.getElementById('cliffert-wrap');
  wrap.appendChild(buildSVG());
  wrap.style.cursor = 'pointer';

  wrap.addEventListener('click', () => {
    if (currentState === 'WHISTLING') transitionTo('IDLE');
    else transitionTo('WHISTLING');
  });

  // ── Blink ──
  const eyeWhites = wrap.querySelectorAll('.eye-white');

  function scheduleBlink() {
    setTimeout(() => {
      eyeWhites.forEach(e => e.setAttribute('ry', '1'));
      setTimeout(() => {
        eyeWhites.forEach(e => e.setAttribute('ry', '13'));
        scheduleBlink();
      }, 120);
    }, 3000 + Math.random() * 2000);
  }

  scheduleBlink();

  // ── Audio ──
  let audioCtx    = null;
  let activeOsc   = null;
  let activeOsc2  = null;
  let activeLfo   = null;
  let activeGain  = null;
  let melodyTimer = null;
  let melodyIdx   = 0;
  let whistleCount = 0;

  const MELODY     = [880, 988, 1109, 988, 880, 831, 880, 988];
  const HUM_MELODY = [220, 196, 220, 247, 220, 196];

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function startWhistle() {
    ensureAudio();
    whistleCount++;
    melodyIdx = 0;

    const useHum   = whistleCount % 2 === 0;
    const melody   = useHum ? HUM_MELODY : MELODY;
    const interval = useHum ? 600 : 420;
    const baseFreq = melody[0];
    const baseVol  = useHum ? 0.25 : 0.7;

    activeOsc = audioCtx.createOscillator();
    activeOsc.type = useHum ? 'sawtooth' : 'sine';
    activeOsc.frequency.value = baseFreq;

    activeGain = audioCtx.createGain();
    activeGain.gain.value = baseVol;

    if (useHum) {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      activeOsc.connect(filter);
      filter.connect(activeGain);
    } else {
      // Vibrato LFO: depth ramps 0 → 20 Hz over 1.2s for delayed human buildup
      activeLfo = audioCtx.createOscillator();
      activeLfo.type = 'sine';
      activeLfo.frequency.value = 5.5;
      const lfoGain = audioCtx.createGain();
      const now0 = audioCtx.currentTime;
      lfoGain.gain.setValueAtTime(0, now0);
      lfoGain.gain.linearRampToValueAtTime(20, now0 + 1.2);
      activeLfo.connect(lfoGain);
      lfoGain.connect(activeOsc.frequency);
      activeLfo.start();

      // Chorus: second osc at +6 cents (freq * 1.00347), 30% mix
      activeOsc2 = audioCtx.createOscillator();
      activeOsc2.type = 'sine';
      activeOsc2.frequency.value = baseFreq * 1.00347;
      const chorusGain = audioCtx.createGain();
      chorusGain.gain.value = 0.3;
      activeOsc2.connect(chorusGain);
      chorusGain.connect(activeGain);
      activeOsc2.start();

      activeOsc.connect(activeGain);

      // Soft attack: ramp gain 0 → 0.55 over 150ms
      activeGain.gain.setValueAtTime(0, now0);
      activeGain.gain.linearRampToValueAtTime(0.55, now0 + 0.15);
    }

    activeGain.connect(audioCtx.destination);
    activeOsc.start();

    melodyTimer = setInterval(() => {
      if (!activeOsc || !audioCtx) return;
      melodyIdx = (melodyIdx + 1) % melody.length;
      const now = audioCtx.currentTime;
      // Per-note micro-tuning: ±4 Hz random variation, portamento 0.04
      const micro = (Math.random() * 8 - 4);
      activeOsc.frequency.setTargetAtTime(melody[melodyIdx] + micro, now, 0.04);
      if (activeOsc2) activeOsc2.frequency.setTargetAtTime((melody[melodyIdx] + micro) * 1.00347, now, 0.04);
      const g = activeGain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(baseVol * 0.7, now + 0.07);
      g.linearRampToValueAtTime(baseVol * 1.1, now + 0.2);
    }, interval);
  }

  function stopWhistle() {
    clearInterval(melodyTimer);
    melodyTimer = null;
    if (activeOsc && audioCtx) {
      const now = audioCtx.currentTime;
      const g = activeGain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + 0.4);
      activeOsc.stop(now + 0.4);
      if (activeLfo)  activeLfo.stop(now + 0.4);
      if (activeOsc2) activeOsc2.stop(now + 0.4);
    }
    activeOsc  = null;
    activeOsc2 = null;
    activeLfo  = null;
    activeGain = null;
  }

  // ── Note spawning ──
  const stage = document.getElementById('stage');
  let noteSpawnTimer = null;

  function spawnNote() {
    const note = document.createElement('div');
    note.className = 'music-note';
    note.textContent = Math.random() < 0.5 ? '♪' : '♫';
    note.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px');
    note.style.left = (pos.x + SVG_W / 2 + (Math.random() * 20 - 10)) + 'px';
    note.style.top  = (pos.y + SVG_H * 0.65) + 'px';
    stage.appendChild(note);
    note.addEventListener('animationend', () => note.remove());
  }

  // ── State machine ──
  let currentState = 'WALKING';

  function transitionTo(state) {
    if (currentState === state) return;
    if (currentState === 'WHISTLING') exitWhistling();
    currentState = state;
    wrap.classList.remove('walking', 'idle', 'whistling');

    if (state === 'WALKING') {
      wrap.classList.add('walking');
    } else if (state === 'IDLE') {
      wrap.classList.add('idle');
    } else if (state === 'WHISTLING') {
      enterWhistling();
    }
  }

  function enterWhistling() {
    wrap.classList.add('whistling');
    startWhistle();
    noteSpawnTimer = setInterval(spawnNote, 600);
  }

  function exitWhistling() {
    clearInterval(noteSpawnTimer);
    noteSpawnTimer = null;
    stopWhistle();
  }

  // Initial state
  wrap.classList.add('walking');

  // ── Pointer tracking ──
  const pos        = { x: window.innerWidth / 2 - SVG_W / 2, y: window.innerHeight / 2 - SVG_H / 2 };
  const target     = { x: pos.x, y: pos.y };
  const lastTarget = { x: pos.x, y: pos.y };
  let prevPosX     = pos.x;
  let flipScale    = 1;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ── Pointer events ──
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerdown', e => {
    e.target.setPointerCapture(e.pointerId);
    onPointerMove(e);
  });

  function onPointerMove(e) {
    if (!e.isPrimary) return;
    const newX = e.clientX - SVG_W / 2;
    const newY = e.clientY - SVG_H / 2;
    const moved = Math.hypot(newX - lastTarget.x, newY - lastTarget.y);
    target.x = newX;
    target.y = newY;
    if (moved > 5) {
      lastTarget.x = newX;
      lastTarget.y = newY;
      if (currentState !== 'WALKING' && currentState !== 'WHISTLING') transitionTo('WALKING');
    }
  }

  // ── Love bubbles ──
  function spawnLoveBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'love-bubble';
    bubble.textContent = 'cliffert loves you!';
    bubble.style.left = (pos.x + SVG_W / 2) + 'px';
    bubble.style.top  = (pos.y + 10) + 'px';
    stage.appendChild(bubble);
    bubble.addEventListener('animationend', () => {
      bubble.remove();
      scheduleLoveBubble();
    });
  }

  function scheduleLoveBubble() {
    setTimeout(spawnLoveBubble, 12000 + Math.random() * 20000);
  }

  scheduleLoveBubble();

  // ── Animation loop ──
  function loop(timestamp) {
    pos.x += (target.x - pos.x) * LERP;
    pos.y += (target.y - pos.y) * LERP;

    pos.x = clamp(pos.x, BOUNDARY_PAD - SVG_W / 2, window.innerWidth  - BOUNDARY_PAD - SVG_W / 2);
    pos.y = clamp(pos.y, BOUNDARY_PAD - SVG_H / 2, window.innerHeight - BOUNDARY_PAD - SVG_H / 2);

    const dx = pos.x - prevPosX;
    if (dx > 0.3)       flipScale = 1;
    else if (dx < -0.3) flipScale = -1;
    prevPosX = pos.x;

    const walkBob = currentState === 'WALKING' ? Math.sin(timestamp * 0.008) * 4 : 0;

    wrap.style.setProperty('--flip-scale', flipScale);
    wrap.style.left = pos.x.toFixed(1) + 'px';
    wrap.style.top  = (pos.y + walkBob).toFixed(1) + 'px';

    if (currentState === 'WALKING' && Math.hypot(pos.x - target.x, pos.y - target.y) < IDLE_DIST) {
      transitionTo('IDLE');
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
