// src/session/session.ts
function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
function createSession() {
  return {
    id: randomId(),
    startedAt: Date.now(),
    key: null,
    keyConfirmed: false,
    events: [],
    circuits: []
  };
}
function appendChord(session, chord, source, confidence) {
  const lastEvent = session.events[session.events.length - 1];
  if (lastEvent?.chord.name === chord.name) return session;
  const event = {
    id: randomId(),
    timestamp: Date.now(),
    chord,
    source,
    ...confidence !== void 0 ? { confidence } : {}
  };
  return { ...session, events: [...session.events, event] };
}

// src/theory/cadences.ts
var CADENCE_PATTERNS = [
  { name: "ii\u2013V\u2013I", degrees: [2, 5, 1], type: "authentic", tensionResolved: true },
  { name: "V\u2013I", degrees: [5, 1], type: "authentic", tensionResolved: true },
  { name: "IV\u2013I", degrees: [4, 1], type: "plagal", tensionResolved: true },
  { name: "V\u2013vi", degrees: [5, 6], type: "deceptive", tensionResolved: false },
  { name: "ii\u2013V", degrees: [2, 5], type: "half", tensionResolved: false },
  { name: "I\u2013V", degrees: [1, 5], type: "half", tensionResolved: false }
];

// src/engine/cadence-detector.ts
function scanCadences(history2, key) {
  if (history2.length < 2) return [];
  const degrees = history2.map((chord) => {
    const idx = key.scaleNotes.indexOf(chord.root);
    return idx === -1 ? 0 : idx + 1;
  });
  const matches = [];
  for (let len = 3; len >= 2; len--) {
    for (let i = 0; i <= degrees.length - len; i++) {
      const window2 = degrees.slice(i, i + len);
      if (window2.some((d) => d === 0)) continue;
      for (const pattern of CADENCE_PATTERNS) {
        if (pattern.degrees.length !== len) continue;
        if (pattern.degrees.every((d, j) => d === window2[j])) {
          if (len === 2) {
            const alreadyCovered = matches.some(
              (m) => m.pattern.degrees.length === 3 && m.endIndex === i + len - 1 && m.degrees.slice(-2).every((d, j) => d === window2[j])
            );
            if (alreadyCovered) continue;
          }
          matches.push({
            pattern,
            startIndex: i,
            endIndex: i + len - 1,
            degrees: window2
          });
        }
      }
    }
  }
  return matches;
}

// src/session/circuit-tracker.ts
function randomId2() {
  return Math.random().toString(36).slice(2, 10);
}
function buildNashvilleNotation(chords, key) {
  return chords.map((chord) => {
    const idx = key.scaleNotes.indexOf(chord.root);
    if (idx === -1) return chord.name;
    const degree = idx + 1;
    const isMinor = chord.quality === "min" || chord.quality === "min7";
    const isDim = chord.quality === "dim" || chord.quality === "dim7";
    return `${degree}${isMinor ? "m" : isDim ? "\xB0" : ""}`;
  }).join("\u2192");
}
var CircuitTracker = class {
  history = [];
  processNewChord(chord, key) {
    if (this.history[this.history.length - 1]?.name === chord.name) return null;
    this.history = [...this.history, chord];
    const matches = scanCadences(this.history, key);
    const lastIdx = this.history.length - 1;
    const resolvingMatch = matches.find(
      (m) => m.pattern.tensionResolved && m.endIndex === lastIdx
    );
    if (!resolvingMatch) return null;
    const uniqueRoots = new Set(this.history.map((c) => c.root));
    if (uniqueRoots.size < 3) return null;
    const circuit = {
      id: randomId2(),
      startIndex: 0,
      endIndex: lastIdx,
      chords: [...this.history],
      cadences: matches,
      nashvilleNotation: buildNashvilleNotation(this.history, key),
      tensionResolved: resolvingMatch.pattern.tensionResolved,
      completedAt: Date.now()
    };
    this.history = [];
    return circuit;
  }
  getOpenCircuit() {
    return [...this.history];
  }
  reset() {
    this.history = [];
  }
};

// src/theory/notes.ts
var NOTE_NAMES_SHARP = {
  0: "C",
  1: "C#",
  2: "D",
  3: "D#",
  4: "E",
  5: "F",
  6: "F#",
  7: "G",
  8: "G#",
  9: "A",
  10: "A#",
  11: "B"
};
var NOTE_NAMES_FLAT = {
  0: "C",
  1: "Db",
  2: "D",
  3: "Eb",
  4: "E",
  5: "F",
  6: "Gb",
  7: "G",
  8: "Ab",
  9: "A",
  10: "Bb",
  11: "B"
};
function noteName(pc, preferFlats) {
  return preferFlats ? NOTE_NAMES_FLAT[pc] : NOTE_NAMES_SHARP[pc];
}

// src/theory/chords.ts
var CHORD_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  min7b5: [0, 3, 6, 10]
};
var QUALITY_SUFFIX = {
  maj: "",
  min: "m",
  dom7: "7",
  maj7: "maj7",
  min7: "m7",
  dim: "\xB0",
  dim7: "\xB07",
  sus2: "sus2",
  sus4: "sus4",
  min7b5: "\xF87"
};
var MOOD_WORDS = {
  "warm-gold": "Tonic",
  "orange": "Dominant",
  "cool-blue": "Pre-dominant",
  "green": "Color",
  "purple": "Leading tone",
  "neutral": "Chromatic"
};
function buildChord(root, quality, preferFlats = false, nashvilleNumeral = "", nashvilleIndex = 0, color = "neutral") {
  const intervals = CHORD_INTERVALS[quality];
  const pitchClasses = intervals.map((i) => (root + i) % 12);
  const rootName = noteName(root, preferFlats);
  const name = rootName + QUALITY_SUFFIX[quality];
  const moodWord = MOOD_WORDS[color];
  return { root, quality, name, nashvilleNumeral, nashvilleIndex, color, moodWord, pitchClasses };
}

// src/theory/keys.ts
var MAJOR_INTERVALS = [2, 2, 1, 2, 2, 2, 1];
var MINOR_INTERVALS = [2, 1, 2, 2, 1, 2, 2];
var MAJOR_QUALITIES = ["maj", "min", "min", "maj", "dom7", "min", "dim"];
var MINOR_QUALITIES = ["min", "dim", "maj", "min", "min", "maj", "maj"];
var MAJOR_NUMERALS = ["1", "2m", "3m", "4", "5", "6m", "7\xB0"];
var MINOR_NUMERALS = ["1m", "2\xB0", "3", "4m", "5m", "6", "7"];
var MAJOR_COLORS = ["warm-gold", "cool-blue", "green", "warm-gold", "orange", "green", "purple"];
var MINOR_COLORS = ["green", "purple", "warm-gold", "cool-blue", "cool-blue", "warm-gold", "orange"];
var TENSION_SCORES = [0, 0.55, 0.25, 0.45, 0.85, 0.15, 1];
var FLAT_KEYS = /* @__PURE__ */ new Set([5, 10, 3, 8, 1, 6]);
function buildKey(tonic, mode) {
  const intervals = mode === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const qualities = mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  const numerals = mode === "major" ? MAJOR_NUMERALS : MINOR_NUMERALS;
  const colors2 = mode === "major" ? MAJOR_COLORS : MINOR_COLORS;
  const preferFlats = FLAT_KEYS.has(tonic);
  const scaleNotes = [tonic];
  let current = tonic;
  for (let i = 0; i < 6; i++) {
    current = (current + (intervals[i] ?? 0)) % 12;
    scaleNotes.push(current);
  }
  const diatonicChords = scaleNotes.map((root, i) => {
    const degree = i + 1;
    const quality = qualities[i] ?? "maj";
    const numeral = numerals[i] ?? String(degree);
    const color = colors2[i] ?? "neutral";
    const tension = TENSION_SCORES[i] ?? 0;
    const chord = buildChord(root, quality, preferFlats, numeral, degree, color);
    return { degree, chord, nashvilleNumeral: numeral, tensionScore: tension };
  });
  const tonicName = noteName(tonic, preferFlats);
  const modeName = mode === "major" ? "Major" : "Minor";
  const name = `${tonicName} ${modeName}`;
  return { tonic, mode, name, preferFlats, scaleNotes, diatonicChords };
}
var ALL_KEYS = (() => {
  const keys = [];
  for (let pc = 0; pc < 12; pc++) {
    keys.push(buildKey(pc, "major"));
    keys.push(buildKey(pc, "minor"));
  }
  return keys;
})();

// src/engine/key-inference.ts
function inferKey(chordHistory) {
  if (chordHistory.length === 0) return ALL_KEYS.map((key) => ({ key, score: 0 }));
  const observedPCs = /* @__PURE__ */ new Set();
  for (const chord of chordHistory) {
    for (const pc of chord.pitchClasses) {
      observedPCs.add(pc);
    }
  }
  const totalObserved = observedPCs.size;
  const rootHistory = chordHistory.map((c) => c.root);
  const candidates = ALL_KEYS.map((key) => {
    const keyPCSet = new Set(key.scaleNotes);
    let matched = 0;
    for (const pc of observedPCs) {
      if (keyPCSet.has(pc)) matched++;
    }
    const coverage = matched / totalObserved;
    const tonicBoost = rootHistory.some((r) => r === key.tonic) ? 0.15 : 0;
    const dominantRoot = key.scaleNotes[4];
    const dominantBoost = dominantRoot !== void 0 && rootHistory.some((r) => r === dominantRoot) ? 0.1 : 0;
    const authenticBoost = hasRecentAuthenticCadence(rootHistory, key) ? 0.25 : 0;
    const score = coverage + tonicBoost + dominantBoost + authenticBoost;
    return { key, score };
  });
  return candidates.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) < 1e-4) {
      if (a.key.mode === "major" && b.key.mode === "minor") return -1;
      if (a.key.mode === "minor" && b.key.mode === "major") return 1;
    }
    return diff;
  });
}
function hasRecentAuthenticCadence(rootHistory, key) {
  if (rootHistory.length < 2) return false;
  const dominant = key.scaleNotes[4];
  const tonic = key.tonic;
  if (dominant === void 0) return false;
  const last = rootHistory[rootHistory.length - 1];
  const prev = rootHistory[rootHistory.length - 2];
  return prev === dominant && last === tonic;
}

// src/engine/gps-suggestions.ts
function rankNextChords(current, key, history2, circuits2) {
  const candidates = key.diatonicChords.map((dc) => ({
    dc,
    score: dc.tensionScore,
    reasons: []
  }));
  const currentDegreeIdx = key.scaleNotes.indexOf(current.root);
  const currentDegree = currentDegreeIdx === -1 ? 0 : currentDegreeIdx + 1;
  if (currentDegree > 0) {
    for (const candidate of candidates) {
      const candDegree = candidate.dc.degree;
      for (const pattern of CADENCE_PATTERNS) {
        const precursor = pattern.degrees.indexOf(candDegree);
        if (precursor <= 0) continue;
        if (pattern.degrees[precursor - 1] !== currentDegree) continue;
        if (pattern.tensionResolved) {
          candidate.score -= 0.3;
          candidate.reasons.push(`Resolves via ${pattern.name}`);
        } else {
          candidate.score -= 0.15;
          candidate.reasons.push(`Builds via ${pattern.name}`);
        }
      }
    }
  }
  if (history2.length > 0) {
    for (const candidate of candidates) {
      const plays = history2.filter((c) => c.root === candidate.dc.chord.root).length;
      const boost = Math.min(plays * 0.05, 0.2);
      if (boost > 0) {
        candidate.score += boost;
        candidate.reasons.push(`Played ${plays}x before`);
      }
    }
  }
  if (circuits2.length > 0 && history2.length > 0) {
    for (const candidate of candidates) {
      for (const circuit of circuits2) {
        const circuitDegrees = circuit.chords.map((c) => {
          const idx = key.scaleNotes.indexOf(c.root);
          return idx === -1 ? 0 : idx + 1;
        });
        for (let len = 1; len < circuitDegrees.length; len++) {
          const histSlice = history2.slice(-len).map((c) => {
            const idx = key.scaleNotes.indexOf(c.root);
            return idx === -1 ? 0 : idx + 1;
          });
          if (histSlice.every((d, i) => d === circuitDegrees[i])) {
            const nextCircuitDegree = circuitDegrees[len];
            if (nextCircuitDegree !== void 0 && nextCircuitDegree === candidate.dc.degree) {
              candidate.score -= 0.2;
              candidate.reasons.push("Circuit continuation");
            }
          }
        }
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates.map((c) => ({
    chord: c.dc.chord,
    tensionScore: c.score,
    reasons: c.reasons,
    nashvilleNumeral: c.dc.nashvilleNumeral,
    voicings: []
  }));
}

// src/voicings/voicing-lookup.ts
var CAGED_TEMPLATES = [
  // ── E shape  (root string 6, open root = E = PC 4) ───────────
  { shape: "E", quality: "maj", openRootString: 6, openRootPitchClass: 4, frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  { shape: "E", quality: "min", openRootString: 6, openRootPitchClass: 4, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  { shape: "E", quality: "dom7", openRootString: 6, openRootPitchClass: 4, frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  { shape: "E", quality: "maj7", openRootString: 6, openRootPitchClass: 4, frets: [0, 2, 1, 1, 0, 0], fingers: [0, 2, 1, 1, 0, 0] },
  { shape: "E", quality: "min7", openRootString: 6, openRootPitchClass: 4, frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0] },
  { shape: "E", quality: "dim", openRootString: 6, openRootPitchClass: 4, frets: [0, 1, 2, 0, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },
  // ── A shape  (root string 5, open root = A = PC 9) ───────────
  { shape: "A", quality: "maj", openRootString: 5, openRootPitchClass: 9, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 3, 2, 1, 0] },
  { shape: "A", quality: "min", openRootString: 5, openRootPitchClass: 9, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  { shape: "A", quality: "dom7", openRootString: 5, openRootPitchClass: 9, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  { shape: "A", quality: "maj7", openRootString: 5, openRootPitchClass: 9, frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  { shape: "A", quality: "min7", openRootString: 5, openRootPitchClass: 9, frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  { shape: "A", quality: "dim", openRootString: 5, openRootPitchClass: 9, frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 0, 1, 2, 1, 0] },
  // ── G shape  (root string 6, open root = G = PC 7) ───────────
  { shape: "G", quality: "maj", openRootString: 6, openRootPitchClass: 7, frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4] },
  { shape: "G", quality: "min", openRootString: 6, openRootPitchClass: 7, frets: [3, 1, 0, 0, 3, 3], fingers: [3, 1, 0, 0, 4, 2] },
  { shape: "G", quality: "dom7", openRootString: 6, openRootPitchClass: 7, frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  { shape: "G", quality: "maj7", openRootString: 6, openRootPitchClass: 7, frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1] },
  { shape: "G", quality: "min7", openRootString: 6, openRootPitchClass: 7, frets: [3, 1, 0, 0, 3, 1], fingers: [3, 1, 0, 0, 4, 1] },
  { shape: "G", quality: "dim", openRootString: 6, openRootPitchClass: 7, frets: [3, 1, -1, 3, 2, -1], fingers: [3, 1, 0, 4, 2, 0] },
  // ── D shape  (root string 4, open root = D = PC 2) ───────────
  { shape: "D", quality: "maj", openRootString: 4, openRootPitchClass: 2, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  { shape: "D", quality: "min", openRootString: 4, openRootPitchClass: 2, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  { shape: "D", quality: "dom7", openRootString: 4, openRootPitchClass: 2, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 3, 1, 2] },
  { shape: "D", quality: "maj7", openRootString: 4, openRootPitchClass: 2, frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  { shape: "D", quality: "min7", openRootString: 4, openRootPitchClass: 2, frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  { shape: "D", quality: "dim", openRootString: 4, openRootPitchClass: 2, frets: [-1, -1, 0, 1, 3, 1], fingers: [0, 0, 0, 1, 4, 1] },
  // ── C shape  (root string 5, open root = C = PC 0) ───────────
  { shape: "C", quality: "maj", openRootString: 5, openRootPitchClass: 0, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  { shape: "C", quality: "min", openRootString: 5, openRootPitchClass: 0, frets: [-1, 3, 1, 0, 1, 3], fingers: [0, 3, 1, 0, 1, 4] },
  { shape: "C", quality: "dom7", openRootString: 5, openRootPitchClass: 0, frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  { shape: "C", quality: "maj7", openRootString: 5, openRootPitchClass: 0, frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  { shape: "C", quality: "min7", openRootString: 5, openRootPitchClass: 0, frets: [-1, 3, 1, 3, 1, 3], fingers: [0, 3, 1, 4, 1, 4] },
  { shape: "C", quality: "dim", openRootString: 5, openRootPitchClass: 0, frets: [-1, 3, 4, 5, 4, 2], fingers: [0, 2, 3, 4, 3, 1] }
];
function toTemplateQuality(quality) {
  switch (quality) {
    case "maj":
    case "sus2":
    case "sus4":
      return "maj";
    case "min":
      return "min";
    case "dom7":
      return "dom7";
    case "maj7":
      return "maj7";
    case "min7":
    case "min7b5":
      return "min7";
    case "dim":
    case "dim7":
      return "dim";
    default:
      return "maj";
  }
}
function transposeShape(template, targetRoot, chord) {
  const shift = (targetRoot - template.openRootPitchClass + 12) % 12;
  const baseFret = shift;
  if (baseFret > 12) return null;
  const stringNumbers = [6, 5, 4, 3, 2, 1];
  const positions = stringNumbers.map((str, i) => {
    const openFret = template.frets[i] ?? -1;
    return {
      string: str,
      fret: openFret === -1 ? -1 : openFret + shift
    };
  });
  const label = `${chord.name} (${template.shape}-shape, fret ${baseFret})`;
  if (shift > 0) {
    return {
      chord,
      shape: template.shape,
      baseFret,
      positions,
      barre: { fret: shift, fromString: template.openRootString, toString: 1 },
      label
    };
  }
  return { chord, shape: template.shape, baseFret, positions, label };
}
function resolveVoicings(chord, _key) {
  const tq = toTemplateQuality(chord.quality);
  const voicings = [];
  for (const template of CAGED_TEMPLATES) {
    if (template.quality !== tq) continue;
    const v = transposeShape(template, chord.root, chord);
    if (v) voicings.push(v);
  }
  voicings.sort((a, b) => {
    if (a.baseFret === 0 && b.baseFret !== 0) return -1;
    if (b.baseFret === 0 && a.baseFret !== 0) return 1;
    return a.baseFret - b.baseFret;
  });
  return voicings.slice(0, 3);
}

// src/ui/render.ts
var bus = new EventTarget();
function emit(event) {
  bus.dispatchEvent(new CustomEvent(event.type, { detail: event }));
}
function on(type, handler) {
  bus.addEventListener(type, (e) => {
    handler(e.detail);
  });
}

// src/ui/components.ts
function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === "class") element.className = val;
    else element.setAttribute(key, val);
  }
  for (const child of children) {
    element.append(child);
  }
  return element;
}
function patchText(element, text) {
  if (element && element.textContent !== text) {
    element.textContent = text;
  }
}
function qs(selector, root = document) {
  const found = root.querySelector(selector);
  if (!found) throw new Error(`Element not found: ${selector}`);
  return found;
}

// src/ui/key-bar.ts
var keyBtn;
var toastEl;
var pickerOverlay;
var pendingCandidates = [];
var selectedMode = "major";
function initKeyBar() {
  keyBtn = qs("#key-btn");
  toastEl = qs("#key-toast");
  pickerOverlay = qs("#key-picker-overlay");
  keyBtn.addEventListener("click", () => openPicker());
  on("key:candidate", (event) => {
    pendingCandidates = event.candidates;
    showToast(event.candidates);
  });
  on("key:changed", (event) => {
    patchText(keyBtn, `Key: ${event.key.name} \u25BE`);
    hideToast();
    closePicker();
  });
  on("session:reset", () => {
    pendingCandidates = [];
    patchText(keyBtn, "Key: ? (detecting\u2026)");
    hideToast();
    closePicker();
  });
}
function isRelativePair(a, b) {
  if (a.key.mode === b.key.mode) return false;
  const major = a.key.mode === "major" ? a.key : b.key;
  const minor = a.key.mode === "minor" ? a.key : b.key;
  return (major.tonic + 9) % 12 === minor.tonic;
}
function showToast(candidates) {
  const top = candidates[0];
  const second = candidates[1];
  if (!top || top.score <= 0.8) {
    hideToast();
    return;
  }
  const isAmbiguous = second !== void 0 && Math.abs(top.score - second.score) < 0.05 && isRelativePair(top, second);
  const label = isAmbiguous ? `${top.key.name} / ${second.key.name}` : top.key.name;
  toastEl.innerHTML = "";
  const confirmBtn = el("button", { class: "toast-confirm" }, "Confirm");
  const dismissBtn = el("button", { class: "toast-dismiss" }, "\xD7");
  confirmBtn.addEventListener("click", () => {
    if (top) emit({ type: "key:changed", key: top.key });
  });
  dismissBtn.addEventListener("click", () => {
    hideToast();
    emit({ type: "key:dismissed" });
  });
  toastEl.append(
    el("span", { class: "toast-label" }, `Key detected: ${label}`),
    confirmBtn,
    dismissBtn
  );
  toastEl.classList.remove("hidden");
}
function hideToast() {
  toastEl.classList.add("hidden");
}
function openPicker() {
  buildPickerContent();
  pickerOverlay.classList.remove("hidden");
}
function closePicker() {
  pickerOverlay.classList.add("hidden");
}
function buildPickerContent() {
  pickerOverlay.innerHTML = "";
  const panel = el("div", { class: "picker-panel" });
  const closeBtn = el("button", { class: "picker-close" }, "\xD7");
  closeBtn.addEventListener("click", closePicker);
  panel.append(
    el(
      "div",
      { class: "picker-header" },
      el("h3", {}, "Select Key"),
      closeBtn
    )
  );
  const majorBtn = el("button", { class: `mode-btn${selectedMode === "major" ? " active" : ""}` }, "Major");
  const minorBtn = el("button", { class: `mode-btn${selectedMode === "minor" ? " active" : ""}` }, "Minor");
  majorBtn.addEventListener("click", () => {
    selectedMode = "major";
    majorBtn.classList.add("active");
    minorBtn.classList.remove("active");
  });
  minorBtn.addEventListener("click", () => {
    selectedMode = "minor";
    minorBtn.classList.add("active");
    majorBtn.classList.remove("active");
  });
  panel.append(el("div", { class: "picker-mode-row" }, majorBtn, minorBtn));
  const noteGrid = el("div", { class: "picker-note-grid" });
  for (let pc = 0; pc < 12; pc++) {
    const sharp = NOTE_NAMES_SHARP[pc] ?? String(pc);
    const flat = NOTE_NAMES_FLAT[pc] ?? String(pc);
    const label = sharp === flat ? sharp : `${sharp}/${flat}`;
    const btn = el("button", { class: "note-btn" }, label);
    btn.addEventListener("click", () => {
      emit({ type: "key:changed", key: buildKey(pc, selectedMode) });
    });
    noteGrid.append(btn);
  }
  panel.append(noteGrid);
  const validCandidates = pendingCandidates.filter((c) => c.score > 0.6);
  if (validCandidates.length > 0) {
    const suggRow = el("div", { class: "picker-suggestions" });
    suggRow.append(el("p", { class: "sugg-label" }, "Detected:"));
    for (const cand of validCandidates.slice(0, 3)) {
      const btn = el(
        "button",
        { class: "sugg-btn" },
        `${cand.key.name} (${Math.round(cand.score * 100)}%)`
      );
      btn.addEventListener("click", () => emit({ type: "key:changed", key: cand.key }));
      suggRow.append(btn);
    }
    panel.append(suggRow);
  }
  pickerOverlay.append(panel);
  pickerOverlay.addEventListener("click", (e) => {
    if (e.target === pickerOverlay) closePicker();
  }, { once: true });
}

// src/ui/chord-diagram.ts
var W = 150;
var H = 145;
var SX = [12, 28, 44, 60, 76, 92];
var MARKER_Y = 12;
var NUT_Y = 26;
var FRET_H = 22;
var NUM_FRETS = 4;
var R = 8;
function stringX(stringNum) {
  return SX[6 - stringNum] ?? SX[0] ?? 12;
}
function buildDiagramSVG(voicing) {
  const isOpen = voicing.baseFret === 0;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="chord-diagram">`);
  if (!isOpen) {
    const labelX = (SX[5] ?? 92) + 12;
    parts.push(
      `<text x="${labelX}" y="${NUT_Y - 6}" font-size="15" fill="var(--text)" text-anchor="start" font-family="monospace" font-weight="600">${voicing.baseFret}fr</text>`
    );
  }
  for (const x of SX) {
    parts.push(
      `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${NUT_Y + NUM_FRETS * FRET_H}" stroke="var(--border)" stroke-width="1.5"/>`
    );
  }
  for (let f = 0; f <= NUM_FRETS; f++) {
    const y = NUT_Y + f * FRET_H;
    const x1 = SX[0] ?? 12;
    const x2 = SX[5] ?? 92;
    if (f === 0 && isOpen) {
      parts.push(`<rect x="${x1}" y="${y - 3}" width="${x2 - x1}" height="5" rx="1" fill="var(--text)"/>`);
    } else {
      parts.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`);
    }
  }
  if (voicing.barre) {
    const { fret, fromString, toString: toStr } = voicing.barre;
    const row = fret - voicing.baseFret;
    const cy = NUT_Y + row * FRET_H + FRET_H / 2;
    const x1 = stringX(fromString);
    const x2 = stringX(toStr);
    parts.push(
      `<rect x="${x1 - R}" y="${cy - R}" width="${x2 - x1 + R * 2}" height="${R * 2}" rx="${R}" fill="var(--text)"/>`
    );
  }
  for (const pos of voicing.positions) {
    const x = stringX(pos.string);
    if (pos.fret === -1) {
      parts.push(
        `<text x="${x}" y="${MARKER_Y + 4}" font-size="12" fill="var(--text-dim)" text-anchor="middle">\xD7</text>`
      );
    } else if (pos.fret === 0 && isOpen) {
      parts.push(
        `<circle cx="${x}" cy="${MARKER_Y}" r="5" fill="none" stroke="var(--text)" stroke-width="1.5"/>`
      );
    } else {
      const row = isOpen ? pos.fret - 1 : pos.fret - voicing.baseFret;
      if (row >= 0 && row < NUM_FRETS) {
        const onBarre = voicing.barre !== void 0 && pos.fret === voicing.barre.fret;
        if (!onBarre) {
          const cy = NUT_Y + row * FRET_H + FRET_H / 2;
          parts.push(`<circle cx="${x}" cy="${cy}" r="${R}" fill="var(--text)"/>`);
        }
      }
    }
  }
  parts.push("</svg>");
  return parts.join("");
}

// src/ui/gps-panel.ts
var COLOR_VAR = {
  "warm-gold": "var(--color-tonic)",
  "orange": "var(--color-dominant)",
  "cool-blue": "var(--color-subdominant)",
  "green": "var(--color-mediant)",
  "purple": "var(--color-leading)",
  "neutral": "var(--color-chromatic)"
};
var MOOD = {
  "warm-gold": "Tonic",
  "orange": "Dominant",
  "cool-blue": "Pre-dominant",
  "green": "Color",
  "purple": "Leading tone",
  "neutral": "Chromatic"
};
var currentKey = null;
var currentChord = null;
var currentVoicings = [];
var activeShapeIdx = 0;
var suggestions = [];
var history = [];
var centerPanel;
var leftPanel;
var rightPanel;
var historyBar;
function initGpsPanel() {
  centerPanel = qs("#current-chord-panel");
  leftPanel = qs("#suggestions-left");
  rightPanel = qs("#suggestions-right");
  historyBar = qs("#history-bar");
  renderPlaceholder();
  on("chord:confirmed", (event) => {
    hidePendingOverlay();
    currentChord = event.chord;
    if (history[history.length - 1]?.name !== event.chord.name) {
      history = [...history, event.chord];
    }
    currentVoicings = resolveVoicings(event.chord);
    activeShapeIdx = 0;
    renderCurrentChord();
    updateHistoryBar();
  });
  on("chord:pending", (event) => {
    showPendingOverlay(event.guess);
  });
  on("chord:rejected", () => {
    hidePendingOverlay();
  });
  on("key:changed", (event) => {
    currentKey = event.key;
    if (currentChord) renderCurrentChord();
    renderSuggestions();
    updateHistoryBar();
  });
  on("circuit:completed", (event) => {
    flashCircuitChips(event.circuit.chords.length);
  });
  on("session:reset", () => {
    currentKey = null;
    currentChord = null;
    currentVoicings = [];
    activeShapeIdx = 0;
    suggestions = [];
    history = [];
    historyBar.innerHTML = "";
    renderPlaceholder();
  });
}
function updateSuggestions(next) {
  suggestions = next;
  renderSuggestions();
}
function renderPlaceholder() {
  centerPanel.innerHTML = "";
  centerPanel.append(
    el(
      "div",
      { class: "current-placeholder" },
      el("p", {}, "Play a chord or click"),
      el("p", {}, "+ Manual to begin")
    )
  );
  leftPanel.innerHTML = "";
  rightPanel.innerHTML = "";
}
function resolvedColor(chord) {
  if (!currentKey) return chord.color;
  const idx = currentKey.scaleNotes.indexOf(chord.root);
  if (idx === -1) return "neutral";
  return currentKey.diatonicChords[idx]?.chord.color ?? "neutral";
}
function resolvedNumeral(chord) {
  if (!currentKey) return "?";
  const idx = currentKey.scaleNotes.indexOf(chord.root);
  if (idx === -1) return chord.name;
  return currentKey.diatonicChords[idx]?.nashvilleNumeral ?? chord.name;
}
function tensionScore(chord) {
  if (!currentKey) return 0.5;
  const idx = currentKey.scaleNotes.indexOf(chord.root);
  if (idx === -1) return 0.5;
  return currentKey.diatonicChords[idx]?.tensionScore ?? 0.5;
}
function renderCurrentChord() {
  if (!currentChord) return;
  const chord = currentChord;
  const color = resolvedColor(chord);
  const numeral = resolvedNumeral(chord);
  const tension = tensionScore(chord);
  const mood = MOOD[color];
  const voicing = currentVoicings[activeShapeIdx];
  centerPanel.innerHTML = "";
  const nameRow = el("div", { class: "chord-name-row" });
  nameRow.append(
    el("span", { class: "chord-name" }, chord.name),
    el("span", { class: "chord-numeral", style: `color: ${COLOR_VAR[color]}` }, numeral)
  );
  const moodEl = el("div", { class: "chord-mood", style: `color: ${COLOR_VAR[color]}` }, mood);
  const tensionPct = Math.round(tension * 100);
  const barFill = el("div", { class: "tension-fill", style: `width: ${tensionPct}%; background: ${COLOR_VAR[color]}` });
  const barWrap = el("div", { class: "tension-bar" }, barFill);
  const tensionRow = el(
    "div",
    { class: "tension-row" },
    el("span", { class: "tension-label" }, "Tension"),
    barWrap,
    el("span", { class: "tension-pct" }, `${tensionPct}%`)
  );
  const diagramEl = el("div", { class: "diagram-wrap" });
  if (voicing) {
    diagramEl.innerHTML = buildDiagramSVG(voicing);
  } else {
    diagramEl.append(el("p", { class: "no-diagram" }, "No diagram"));
  }
  const shapeTabs = el("div", { class: "shape-tabs" });
  const shapes = ["C", "A", "G", "E", "D"];
  for (const shape of shapes) {
    const vIdx = currentVoicings.findIndex((v) => v.shape === shape);
    const available = vIdx !== -1;
    const isActive2 = available && vIdx === activeShapeIdx;
    const btn = el("button", {
      class: `shape-tab${isActive2 ? " active" : ""}${!available ? " disabled" : ""}`
    }, shape);
    btn.disabled = !available;
    if (available) {
      const capturedIdx = vIdx;
      btn.addEventListener("click", () => {
        activeShapeIdx = capturedIdx;
        renderCurrentChord();
      });
    }
    shapeTabs.append(btn);
  }
  centerPanel.append(nameRow, moodEl, tensionRow, diagramEl, shapeTabs);
}
function flashCircuitChips(circuitLength) {
  const chips = Array.from(historyBar.querySelectorAll(".history-chip"));
  const toFlash = chips.slice(-circuitLength);
  for (const chip of toFlash) {
    chip.classList.remove("flash");
    void chip.offsetWidth;
    chip.classList.add("flash");
  }
}
function renderSuggestions() {
  leftPanel.innerHTML = "";
  rightPanel.innerHTML = "";
  if (suggestions.length === 0 || !currentKey) {
    if (currentChord) {
      leftPanel.append(el("p", { class: "suggestions-hint" }, "No key detected yet"));
      rightPanel.append(el("p", { class: "suggestions-hint" }, "Play a few more chords"));
    }
    return;
  }
  const others = suggestions.filter((s) => !currentChord || s.chord.root !== currentChord.root);
  const degree2Root = currentKey.scaleNotes[1];
  const degree4Root = currentKey.scaleNotes[3];
  const iimSug = others.find((s) => s.chord.root === degree2Root);
  const ivSug = others.find((s) => s.chord.root === degree4Root);
  const rest = others.filter((s) => s !== iimSug && s !== ivSug);
  const leftFill = [...rest].sort((a, b) => b.tensionScore - a.tensionScore).slice(0, iimSug ? 2 : 3);
  const leftCards = [...leftFill, ...iimSug ? [iimSug] : []].sort((a, b) => b.tensionScore - a.tensionScore);
  const rightFill = [...rest].sort((a, b) => a.tensionScore - b.tensionScore).slice(0, ivSug ? 2 : 3);
  const rightCards = [...rightFill, ...ivSug ? [ivSug] : []].sort((a, b) => a.tensionScore - b.tensionScore);
  for (const sug of leftCards) renderSuggestionCard(sug, leftPanel);
  for (const sug of rightCards) renderSuggestionCard(sug, rightPanel);
}
function renderSuggestionCard(sug, container2) {
  const color = resolvedColor(sug.chord);
  const numeral = sug.nashvilleNumeral || resolvedNumeral(sug.chord);
  const mood = MOOD[color];
  const tensionPct = Math.round(sug.tensionScore * 100);
  const card = el("div", {
    class: "suggestion-card",
    style: `--card-color: ${COLOR_VAR[color]}`
  });
  const barFill = el("div", { class: "sug-tension-fill", style: `width: ${tensionPct}%` });
  const diagramEl = el("div", { class: "sug-diagram" });
  const voicings = resolveVoicings(sug.chord);
  const voicing = voicings[0];
  if (voicing) diagramEl.innerHTML = buildDiagramSVG(voicing);
  card.append(
    el(
      "div",
      { class: "sug-header" },
      el("div", { class: "sug-numeral", style: `color: ${COLOR_VAR[color]}` }, numeral),
      el("div", { class: "sug-name" }, sug.chord.name),
      el("div", { class: "sug-mood" }, mood)
    ),
    diagramEl,
    el("div", { class: "sug-tension-bar" }, barFill)
  );
  card.addEventListener("click", () => {
    emit({ type: "chord:confirmed", chord: sug.chord, source: "manual" });
  });
  container2.append(card);
}
var pendingOverlayEl = null;
var pendingName = null;
function showPendingOverlay(guess) {
  if (guess.chord.name === pendingName) return;
  pendingName = guess.chord.name;
  hidePendingOverlay();
  const pct = Math.round(guess.confidence * 100);
  const overlay2 = el("div", { class: "pending-overlay" });
  const confirmBtn = el("button", { class: "pending-confirm" }, "\u2713 Confirm");
  const dismissBtn = el("button", { class: "pending-dismiss" }, "\u2717 Dismiss");
  confirmBtn.addEventListener("click", () => {
    emit({ type: "chord:confirmed", chord: guess.chord, source: "mic" });
  });
  dismissBtn.addEventListener("click", () => {
    emit({ type: "chord:rejected" });
  });
  overlay2.append(
    el("div", { class: "pending-chord-name" }, guess.chord.name),
    el("div", { class: "pending-confidence" }, `${pct}% confidence`),
    el("div", { class: "pending-label" }, "Confirm?"),
    el("div", { class: "pending-actions" }, confirmBtn, dismissBtn)
  );
  centerPanel.style.position = "relative";
  centerPanel.append(overlay2);
  pendingOverlayEl = overlay2;
}
function hidePendingOverlay() {
  pendingOverlayEl?.remove();
  pendingOverlayEl = null;
  pendingName = null;
}
function updateHistoryBar() {
  historyBar.innerHTML = "";
  const recent = history.slice(-8);
  for (const chord of recent) {
    const numeral = resolvedNumeral(chord);
    const color = resolvedColor(chord);
    const chip = el("div", {
      class: "history-chip",
      style: `--chip-color: ${COLOR_VAR[color]}`
    });
    chip.append(
      el("span", { class: "chip-numeral" }, numeral),
      el("span", { class: "chip-name" }, chord.name)
    );
    historyBar.append(chip);
  }
  if (recent.length > 0) {
    historyBar.lastElementChild?.scrollIntoView({ behavior: "smooth", inline: "end" });
  }
}

// src/ui/chord-picker.ts
var QUALITIES = [
  { quality: "maj", label: "Major" },
  { quality: "min", label: "Minor" },
  { quality: "dom7", label: "Dom 7" },
  { quality: "maj7", label: "Maj 7" },
  { quality: "min7", label: "Min 7" },
  { quality: "dim", label: "Dim" }
];
var overlay;
var selectedPc = null;
var selectedQuality = "maj";
function initChordPicker() {
  overlay = qs("#chord-picker-overlay");
  qs("#manual-btn").addEventListener("click", openPicker2);
  buildPickerContent2();
}
function openPicker2() {
  selectedPc = null;
  selectedQuality = "maj";
  buildPickerContent2();
  overlay.classList.remove("hidden");
}
function closePicker2() {
  overlay.classList.add("hidden");
}
function buildPickerContent2() {
  overlay.innerHTML = "";
  const panel = el("div", { class: "picker-panel" });
  const closeBtn = el("button", { class: "picker-close" }, "\xD7");
  closeBtn.addEventListener("click", closePicker2);
  panel.append(
    el(
      "div",
      { class: "picker-header" },
      el("h3", {}, "Select Chord"),
      closeBtn
    )
  );
  const noteGrid = el("div", { class: "picker-note-grid" });
  for (let pc = 0; pc < 12; pc++) {
    const sharp = NOTE_NAMES_SHARP[pc] ?? String(pc);
    const flat = NOTE_NAMES_FLAT[pc] ?? String(pc);
    const label = sharp === flat ? sharp : `${sharp}/${flat}`;
    const btn = el("button", { class: "note-btn", "data-pc": String(pc) }, label);
    btn.addEventListener("click", () => {
      selectedPc = pc;
      noteGrid.querySelectorAll(".note-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    noteGrid.append(btn);
  }
  panel.append(el("p", { class: "picker-section-label" }, "Root"), noteGrid);
  const qualityGrid = el("div", { class: "picker-quality-grid" });
  for (const { quality, label } of QUALITIES) {
    const btn = el("button", {
      class: `quality-btn${quality === selectedQuality ? " active" : ""}`,
      "data-quality": quality
    }, label);
    btn.addEventListener("click", () => {
      selectedQuality = quality;
      qualityGrid.querySelectorAll(".quality-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    qualityGrid.append(btn);
  }
  panel.append(el("p", { class: "picker-section-label" }, "Quality"), qualityGrid);
  const confirmBtn = el("button", { class: "picker-confirm-btn" }, "Add Chord");
  confirmBtn.addEventListener("click", () => {
    if (selectedPc === null) return;
    const chord = buildChord(selectedPc, selectedQuality);
    emit({ type: "chord:confirmed", chord, source: "manual" });
    closePicker2();
  });
  panel.append(confirmBtn);
  overlay.append(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePicker2();
  }, { once: true });
}

// src/ui/session-log.ts
var logList;
var exportBtn;
var circuits = [];
var currentKey2 = null;
var sessionStartedAt = 0;
function initSessionLog(startedAt) {
  sessionStartedAt = startedAt;
  const sidebar = qs("#session-log");
  sidebar.innerHTML = "";
  const header = el("div", { class: "log-header" }, "Session Log");
  logList = el("div", { class: "log-list" });
  logList.append(
    el(
      "div",
      { class: "log-empty" },
      "No circuits yet.",
      el("br", {}),
      "Play a resolving progression to capture one."
    )
  );
  exportBtn = el("button", { class: "export-btn" }, "Export Chart");
  sidebar.append(header, logList, exportBtn);
  on("circuit:completed", (event) => {
    circuits = [...circuits, event.circuit];
    appendCircuitEntry(event.circuit);
  });
  on("key:changed", (event) => {
    currentKey2 = event.key;
  });
  on("session:reset", () => {
    circuits = [];
    currentKey2 = null;
    sessionStartedAt = Date.now();
    logList.innerHTML = "";
    logList.append(
      el(
        "div",
        { class: "log-empty" },
        "No circuits yet.",
        el("br", {}),
        "Play a resolving progression to capture one."
      )
    );
  });
  exportBtn.addEventListener("click", handleExport);
}
function elapsedTime(ts) {
  const secs = Math.floor((ts - sessionStartedAt) / 1e3);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function appendCircuitEntry(circuit) {
  const empty = logList.querySelector(".log-empty");
  if (empty) empty.remove();
  const resolvedIcon = circuit.tensionResolved ? "\u2713" : "\u21BA";
  const resolvedClass = circuit.tensionResolved ? "resolved" : "deceptive";
  const cadenceLabel = circuit.cadences[0]?.pattern.name ?? "";
  const entry = el("div", { class: "circuit-entry" });
  entry.append(
    el("div", { class: "circuit-notation" }, circuit.nashvilleNotation),
    el(
      "div",
      { class: "circuit-meta" },
      el("span", { class: `circuit-resolved ${resolvedClass}` }, resolvedIcon),
      el("span", { class: "circuit-cadence" }, cadenceLabel),
      el("span", { class: "circuit-time" }, elapsedTime(circuit.completedAt))
    )
  );
  logList.append(entry);
  entry.scrollIntoView({ behavior: "smooth", block: "end" });
}
function handleExport() {
  const keyLine = currentKey2 ? `Key: ${currentKey2.name}` : "Key: Unknown";
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ");
  const lines = [keyLine, `Session: ${dateStr}`, ""];
  for (const circuit of circuits) {
    const degrees = circuit.nashvilleNotation.split("\u2192");
    lines.push(degrees.join("  |  "));
  }
  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    exportBtn.textContent = "Copied!";
    setTimeout(() => {
      exportBtn.textContent = "Export Chart";
    }, 2e3);
  }).catch(() => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chord-a-long.txt";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// src/game/wave-data.ts
var WAVES = [
  { label: "I\u2013IV\u2013V Blues Wave", rows: 2, cols: 8, speed: 30 },
  { label: "ii\u2013V\u2013I Cadential Wave", rows: 3, cols: 8, speed: 40 },
  { label: "I\u2013V\u2013VIm\u2013IV Pop Wave", rows: 3, cols: 10, speed: 45 },
  { label: "IV\u2013I\u2013V\u2013V Plagal Wave", rows: 4, cols: 10, speed: 50 },
  { label: "I\u2013IIm\u2013V\u2013I Jazz Turnaround", rows: 4, cols: 12, speed: 55 }
];

// src/game/chord-caster.ts
var W2 = 800;
var H2 = 400;
var SHIP_X = 60;
var EVADE_COOLDOWN_MS = 1500;
var EVADE_DODGE_PX = 130;
var EVADE_DUR = 0.5;
var ENEMY_W = 20;
var ENEMY_H = 14;
var ENEMY_COL_SPACING = 48;
var ENEMY_ROW_SPACING = 32;
var ENEMY_START_Y = 44;
var PROJ_W = 18;
var PROJ_H = 6;
var PROJ_SPEED = 500;
var SHIELD_FLASH_DUR = 0.35;
var WAVE_LABEL_DUR = 3;
var PARTICLE_DUR = 0.6;
var NUM_STARS = 80;
var ChordCasterGame = class {
  canvas;
  ctx;
  rafId = null;
  lastTime = 0;
  status = "idle";
  selectedKey = null;
  targetY = H2 / 2;
  targetX = SHIP_X;
  shipY = H2 / 2;
  shipX = SHIP_X;
  hull = 3;
  score = 0;
  waveIndex = 0;
  waveLabel = "";
  waveLabelTimer = 0;
  enemies = [];
  projectiles = [];
  particles = [];
  shieldActive = false;
  shieldFlashTimer = 0;
  healFlashTimer = 0;
  evadeTimer = 0;
  lastEvadeTime = 0;
  spellCooldowns = { fire: 0, shield: 0, heal: 0, rapidFire: 0 };
  rapidFireQueue = 0;
  rapidFireTimer = 0;
  stars = [];
  countdownValue = 3;
  countdownTimer = 1;
  enemySpeed = 30;
  // Tutorial state
  tutPhase = 0;
  // 0=steer, 1=fire, 2=done
  tutTimer = 0;
  tutTargetY = H2 / 2;
  tutFired = false;
  onTutorialPhaseChange;
  colorDominant = "#d4621a";
  colorTonic = "#c9a227";
  onGameOver;
  constructor(canvas3) {
    this.canvas = canvas3;
    const ctx3 = canvas3.getContext("2d");
    if (!ctx3) throw new Error("Canvas 2d context unavailable");
    this.ctx = ctx3;
    this.generateStars();
  }
  // ── Public API ───────────────────────────────────────────────────────────
  start(key) {
    this.selectedKey = key;
    this.hull = 3;
    this.score = 0;
    this.waveIndex = 0;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.shieldActive = false;
    this.shieldFlashTimer = 0;
    this.healFlashTimer = 0;
    this.spellCooldowns = { fire: 0, shield: 0, heal: 0, rapidFire: 0 };
    this.rapidFireQueue = 0;
    this.rapidFireTimer = 0;
    this.shipY = H2 / 2;
    this.shipX = SHIP_X;
    this.targetY = H2 / 2;
    this.targetX = SHIP_X;
    this.evadeTimer = 0;
    this.lastEvadeTime = 0;
    this.countdownValue = 3;
    this.countdownTimer = 1;
    this.status = "countdown";
    this.readColors();
    this.startLoop();
  }
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.status = "idle";
  }
  skipTutorial() {
    if (this.status !== "tutorial") return;
    this.enemies = [];
    this.projectiles = [];
    this.status = "playing";
    this.spawnWave(0);
    this.onTutorialPhaseChange?.(-1);
  }
  castSpell(numeral, now) {
    if (this.status !== "playing" && this.status !== "tutorial") return;
    if (numeral === "5" && now > this.spellCooldowns.fire) {
      if (this.status === "playing") this.snapToNearestEnemyRow();
      this.spawnProjectile();
      this.tutFired = true;
      this.spellCooldowns.fire = now + 400;
    } else if (numeral === "7\xB0" && now > this.spellCooldowns.rapidFire) {
      this.snapToNearestEnemyRow();
      this.rapidFireQueue = 10;
      this.rapidFireTimer = 0;
      this.spellCooldowns.rapidFire = now + 4e3;
    } else if (numeral === "1" && now > this.spellCooldowns.shield) {
      this.shieldActive = true;
      this.spellCooldowns.shield = now + 800;
    } else if (numeral === "4" && now > this.spellCooldowns.heal && this.hull < 3) {
      this.hull++;
      this.healFlashTimer = 0.5;
      this.spellCooldowns.heal = now + 4e3;
    }
  }
  triggerEvade(now) {
    if (this.status !== "playing" && this.status !== "tutorial") return;
    if (now - this.lastEvadeTime < EVADE_COOLDOWN_MS) return;
    this.lastEvadeTime = now;
    this.evadeTimer = EVADE_DUR;
    const nearby = this.enemies.filter((e) => e.x > this.shipX && e.x < this.shipX + 250);
    const above = nearby.filter((e) => e.y < this.shipY).length;
    const below = nearby.filter((e) => e.y > this.shipY).length;
    const dodgeUp = below >= above;
    this.targetY = dodgeUp ? Math.max(20, this.shipY - EVADE_DODGE_PX) : Math.min(H2 - 20, this.shipY + EVADE_DODGE_PX);
  }
  handleClick(e) {
    if (this.status !== "gameover") return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W2 / rect.width);
    const y = (e.clientY - rect.top) * (H2 / rect.height);
    if (x >= 290 && x <= 510 && y >= 250 && y <= 290) {
      if (this.selectedKey) this.start(this.selectedKey);
    }
  }
  // ── Private: init ─────────────────────────────────────────────────────────
  generateStars() {
    for (let i = 0; i < NUM_STARS; i++) {
      this.stars.push({ x: Math.random() * W2, y: Math.random() * H2 });
    }
  }
  readColors() {
    const cs = getComputedStyle(document.documentElement);
    const dom = cs.getPropertyValue("--color-dominant").trim();
    const ton = cs.getPropertyValue("--color-tonic").trim();
    if (dom) this.colorDominant = dom;
    if (ton) this.colorTonic = ton;
  }
  startLoop() {
    if (this.rafId !== null) return;
    const tick = (timestamp) => {
      const dt = this.lastTime > 0 ? Math.min((timestamp - this.lastTime) / 1e3, 0.1) : 0;
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      if (this.status !== "idle") {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.lastTime = 0;
    this.rafId = requestAnimationFrame(tick);
  }
  // ── Private: update ───────────────────────────────────────────────────────
  update(dt) {
    if (this.status === "countdown") {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.countdownValue--;
        if (this.countdownValue < 0) {
          this.startTutorial();
        } else {
          this.countdownTimer = this.countdownValue === 0 ? 0.6 : 1;
        }
      }
      return;
    }
    const inPlay = this.status === "playing" || this.status === "tutorial";
    if (!inPlay) return;
    this.shipY += (this.targetY - this.shipY) * (1 - Math.pow(0.88, dt * 60));
    this.shipX += (this.targetX - this.shipX) * (1 - Math.pow(0.88, dt * 60));
    if (this.evadeTimer > 0) this.evadeTimer -= dt;
    if (this.rapidFireQueue > 0) {
      this.rapidFireTimer -= dt;
      if (this.rapidFireTimer <= 0) {
        this.spawnProjectile();
        this.rapidFireQueue--;
        this.rapidFireTimer = 0.08;
      }
    }
    for (const p of this.projectiles) p.x += PROJ_SPEED * dt;
    for (const e of this.enemies) e.x -= this.enemySpeed * dt;
    for (const proj of this.projectiles) {
      if (proj.dead) continue;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        if (proj.x < enemy.x + ENEMY_W && proj.x + PROJ_W > enemy.x && proj.y < enemy.y + ENEMY_H && proj.y + PROJ_H > enemy.y) {
          proj.dead = true;
          enemy.dead = true;
          if (this.status === "playing") this.score += 10;
          this.spawnParticles(enemy.x + ENEMY_W / 2, enemy.y + ENEMY_H / 2);
        }
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.x + ENEMY_W > 0) continue;
      enemy.dead = true;
      if (this.status === "tutorial") continue;
      if (this.shieldActive) {
        this.shieldActive = false;
        this.shieldFlashTimer = SHIELD_FLASH_DUR;
      } else {
        this.hull--;
        if (this.hull <= 0) {
          this.hull = 0;
          this.status = "gameover";
          this.onGameOver?.(this.score);
          return;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead && p.x < W2 + PROJ_W);
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt / PARTICLE_DUR;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.waveLabelTimer > 0) this.waveLabelTimer -= dt;
    if (this.shieldFlashTimer > 0) this.shieldFlashTimer -= dt;
    if (this.healFlashTimer > 0) this.healFlashTimer -= dt;
    if (this.status === "tutorial") {
      this.updateTutorial(dt);
    } else if (this.enemies.length === 0) {
      this.waveIndex++;
      this.spawnWave(this.waveIndex);
    }
  }
  updateTutorial(dt) {
    this.tutTimer += dt;
    if (this.tutPhase === 0) {
      if (Math.abs(this.shipY - this.tutTargetY) < 35 || this.tutTimer > 8) {
        this.advanceTutorialPhase();
      }
    } else if (this.tutPhase === 1) {
      if (this.tutFired || this.enemies.length === 0 || this.tutTimer > 8) {
        this.advanceTutorialPhase();
      }
    } else if (this.tutPhase === 2) {
      if (this.tutTimer > 1.5) {
        this.status = "playing";
        this.spawnWave(0);
        this.onTutorialPhaseChange?.(-1);
      }
    }
  }
  advanceTutorialPhase() {
    this.tutPhase = this.tutPhase + 1;
    this.tutTimer = 0;
    this.onTutorialPhaseChange?.(this.tutPhase);
    if (this.tutPhase === 1) {
      this.tutFired = false;
      this.spawnTutorialEnemies();
    }
  }
  // ── Private: render ───────────────────────────────────────────────────────
  render() {
    const { ctx: ctx3 } = this;
    ctx3.clearRect(0, 0, W2, H2);
    ctx3.fillStyle = "#000009";
    ctx3.fillRect(0, 0, W2, H2);
    for (const s of this.stars) {
      ctx3.fillStyle = "rgba(255,255,255,0.8)";
      ctx3.fillRect(s.x, s.y, 1, 1);
    }
    if (this.status === "countdown") {
      this.renderCountdown();
      return;
    }
    if (this.status === "gameover") {
      this.renderGameOver();
      return;
    }
    if (this.status !== "playing" && this.status !== "tutorial") return;
    for (const p of this.particles) {
      ctx3.globalAlpha = Math.max(0, p.life);
      ctx3.fillStyle = p.color;
      ctx3.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx3.globalAlpha = 1;
    for (const e of this.enemies) this.drawEnemy(e.x, e.y);
    for (const p of this.projectiles) this.drawProjectile(p.x, p.y);
    if (this.evadeTimer > 0) {
      ctx3.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 40));
    }
    this.drawShip(Math.round(this.shipX), Math.round(this.shipY));
    ctx3.globalAlpha = 1;
    if (this.shieldActive) {
      ctx3.strokeStyle = this.colorTonic;
      ctx3.lineWidth = 2;
      ctx3.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 200);
      ctx3.beginPath();
      ctx3.arc(this.shipX, this.shipY, 24, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.globalAlpha = 1;
    }
    if (this.shieldFlashTimer > 0) {
      ctx3.fillStyle = this.colorTonic;
      ctx3.globalAlpha = this.shieldFlashTimer / SHIELD_FLASH_DUR * 0.45;
      ctx3.beginPath();
      ctx3.arc(this.shipX, this.shipY, 32, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.globalAlpha = 1;
    }
    if (this.healFlashTimer > 0) {
      ctx3.fillStyle = this.colorTonic;
      ctx3.globalAlpha = this.healFlashTimer / 0.5 * 0.22;
      ctx3.fillRect(0, 0, W2, H2);
      ctx3.globalAlpha = 1;
    }
    this.renderHUD();
    this.renderWaveLabel();
    if (this.status === "tutorial") this.renderTutorialOverlay();
  }
  renderCountdown() {
    const { ctx: ctx3 } = this;
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    ctx3.fillStyle = this.countdownValue === 0 ? this.colorDominant : "#ffffff";
    ctx3.font = "80px 'Press Start 2P', monospace";
    ctx3.fillText(this.countdownValue > 0 ? String(this.countdownValue) : "GO!", W2 / 2, H2 / 2);
    ctx3.textAlign = "left";
    ctx3.textBaseline = "alphabetic";
  }
  renderGameOver() {
    const { ctx: ctx3 } = this;
    ctx3.fillStyle = "rgba(0,0,0,0.72)";
    ctx3.fillRect(0, 0, W2, H2);
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    ctx3.fillStyle = this.colorDominant;
    ctx3.font = "40px 'Press Start 2P', monospace";
    ctx3.fillText("GAME OVER", W2 / 2, H2 / 2 - 70);
    ctx3.fillStyle = "#ffffff";
    ctx3.font = "16px 'Press Start 2P', monospace";
    ctx3.fillText(`SCORE  ${this.score}`, W2 / 2, H2 / 2 - 10);
    ctx3.fillStyle = this.colorDominant;
    ctx3.fillRect(290, 250, 220, 40);
    ctx3.fillStyle = "#0d0d1a";
    ctx3.font = "10px 'Press Start 2P', monospace";
    ctx3.fillText("PLAY AGAIN", W2 / 2, 270);
    ctx3.textAlign = "left";
    ctx3.textBaseline = "alphabetic";
  }
  renderHUD() {
    const { ctx: ctx3 } = this;
    for (let i = 0; i < 3; i++) {
      ctx3.globalAlpha = i < this.hull ? 1 : 0.2;
      this.drawShipIcon(12 + i * 24, 16);
    }
    ctx3.globalAlpha = 1;
    ctx3.font = "8px 'Press Start 2P', monospace";
    ctx3.fillStyle = "#aaaaaa";
    ctx3.textAlign = "right";
    ctx3.fillText(String(this.score).padStart(6, "0"), W2 - 10, 20);
    if (this.selectedKey) {
      ctx3.fillStyle = this.colorTonic;
      ctx3.fillText(this.selectedKey.name.toUpperCase(), W2 - 10, 34);
    }
    ctx3.textAlign = "left";
  }
  renderWaveLabel() {
    if (this.waveLabelTimer <= 0 || !this.waveLabel) return;
    const { ctx: ctx3 } = this;
    const fadeIn = Math.min(1, (WAVE_LABEL_DUR - this.waveLabelTimer) * 4);
    const fadeOut = Math.min(1, this.waveLabelTimer * 2);
    ctx3.globalAlpha = Math.min(fadeIn, fadeOut);
    ctx3.fillStyle = "#ffffff";
    ctx3.font = "8px 'Press Start 2P', monospace";
    ctx3.textAlign = "center";
    ctx3.fillText(this.waveLabel, W2 / 2, 22);
    ctx3.textAlign = "left";
    ctx3.globalAlpha = 1;
  }
  // ── Private: drawing ──────────────────────────────────────────────────────
  drawShip(cx, cy) {
    const { ctx: ctx3 } = this;
    ctx3.fillStyle = "#99ccff";
    ctx3.fillRect(cx - 12, cy - 5, 22, 10);
    ctx3.fillRect(cx + 10, cy - 3, 10, 6);
    ctx3.fillStyle = "#223355";
    ctx3.fillRect(cx - 2, cy - 3, 8, 6);
    ctx3.fillStyle = "#6699cc";
    ctx3.fillRect(cx - 18, cy - 10, 8, 6);
    ctx3.fillRect(cx - 18, cy + 4, 8, 6);
    ctx3.fillStyle = this.colorDominant;
    ctx3.fillRect(cx - 16, cy - 2, 5, 4);
  }
  drawShipIcon(cx, cy) {
    const { ctx: ctx3 } = this;
    ctx3.fillStyle = "#99ccff";
    ctx3.fillRect(cx - 7, cy - 3, 14, 6);
    ctx3.fillRect(cx + 7, cy - 2, 5, 4);
    ctx3.fillRect(cx - 11, cy - 6, 5, 4);
    ctx3.fillRect(cx - 11, cy + 2, 5, 4);
  }
  drawEnemy(x, y) {
    const { ctx: ctx3 } = this;
    ctx3.fillStyle = "#cc3333";
    ctx3.fillRect(x, y, ENEMY_W, ENEMY_H);
    ctx3.fillStyle = "#ff6666";
    ctx3.fillRect(x + 3, y + 3, 4, 4);
    ctx3.fillRect(x + 13, y + 3, 4, 4);
    ctx3.fillStyle = "#992222";
    ctx3.fillRect(x + 4, y - 4, 2, 4);
    ctx3.fillRect(x + 14, y - 4, 2, 4);
    for (let i = 0; i < 3; i++) {
      ctx3.fillRect(x + 3 + i * 5, y + 9, 3, 2);
    }
  }
  drawProjectile(x, y) {
    const { ctx: ctx3 } = this;
    const grad = ctx3.createLinearGradient(x, 0, x + PROJ_W, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, this.colorDominant);
    ctx3.fillStyle = grad;
    ctx3.fillRect(x, y + 1, PROJ_W, PROJ_H - 2);
    ctx3.fillStyle = "#ffffff";
    ctx3.fillRect(x + PROJ_W - 4, y + 2, 4, PROJ_H - 4);
  }
  // ── Private: spawning ─────────────────────────────────────────────────────
  snapToNearestEnemyRow() {
    const candidates = this.enemies.filter((e) => !e.dead && e.x > this.shipX).map((e) => e.y + ENEMY_H / 2);
    if (candidates.length === 0) return;
    const rowYs = [...new Set(candidates)];
    let nearest = rowYs[0];
    for (const y of rowYs) {
      if (Math.abs(y - this.shipY) < Math.abs(nearest - this.shipY)) nearest = y;
    }
    this.shipY = nearest;
    this.targetY = nearest;
  }
  spawnProjectile() {
    this.projectiles.push({
      x: this.shipX + 12,
      y: this.shipY - PROJ_H / 2,
      dead: false
    });
  }
  spawnParticles(cx, cy) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count + Math.random() * 0.4;
      const speed = 50 + Math.random() * 90;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: this.colorDominant
      });
    }
  }
  startTutorial() {
    this.status = "tutorial";
    this.tutPhase = 0;
    this.tutTimer = 0;
    this.tutFired = false;
    this.enemies = [];
    this.projectiles = [];
    this.tutTargetY = H2 * 0.25;
    this.onTutorialPhaseChange?.(0);
  }
  spawnTutorialEnemies() {
    this.enemySpeed = 18;
    const rowY = this.shipY - ENEMY_H / 2;
    const startX = W2 * 0.55;
    for (let col = 0; col < 4; col++) {
      this.enemies.push({
        x: startX + col * ENEMY_COL_SPACING,
        y: rowY,
        dead: false
      });
    }
  }
  renderTutorialOverlay() {
    const { ctx: ctx3 } = this;
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 600));
    if (this.tutPhase === 0) {
      const tx = W2 * 0.65;
      const ty = this.tutTargetY;
      ctx3.strokeStyle = this.colorTonic;
      ctx3.lineWidth = 2;
      ctx3.globalAlpha = pulse;
      ctx3.beginPath();
      ctx3.arc(tx, ty, 18, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(tx - 24, ty);
      ctx3.lineTo(tx - 14, ty);
      ctx3.moveTo(tx + 14, ty);
      ctx3.lineTo(tx + 24, ty);
      ctx3.moveTo(tx, ty - 24);
      ctx3.lineTo(tx, ty - 14);
      ctx3.moveTo(tx, ty + 14);
      ctx3.lineTo(tx, ty + 24);
      ctx3.stroke();
      ctx3.globalAlpha = 1;
      ctx3.setLineDash([4, 6]);
      ctx3.strokeStyle = this.colorTonic;
      ctx3.globalAlpha = 0.3;
      ctx3.beginPath();
      ctx3.moveTo(this.shipX + 20, this.shipY);
      ctx3.lineTo(tx - 20, ty);
      ctx3.stroke();
      ctx3.setLineDash([]);
      ctx3.globalAlpha = 1;
      const dir = ty < this.shipY ? -1 : 1;
      ctx3.fillStyle = this.colorTonic;
      ctx3.globalAlpha = pulse;
      const ax = this.shipX + 4;
      const ay = this.shipY + dir * 18;
      ctx3.beginPath();
      ctx3.moveTo(ax, ay + dir * 8);
      ctx3.lineTo(ax - 6, ay);
      ctx3.lineTo(ax + 6, ay);
      ctx3.closePath();
      ctx3.fill();
      ctx3.globalAlpha = 1;
      this.drawInstructionBox(
        W2 / 2,
        H2 - 50,
        ["STEER YOUR SHIP", "HIGHER NOTE = UP  /  LOWER NOTE = DOWN"]
      );
    } else if (this.tutPhase === 1) {
      const vChordName = this.selectedKey?.diatonicChords[4]?.chord.name ?? "V chord";
      this.drawInstructionBox(
        W2 / 2,
        H2 - 50,
        [`V CHORD \u2192 FIRE`, `PLAY ${vChordName.toUpperCase()}`]
      );
    } else if (this.tutPhase === 2) {
      ctx3.textAlign = "center";
      ctx3.textBaseline = "middle";
      ctx3.font = "32px 'Press Start 2P', monospace";
      ctx3.fillStyle = this.colorDominant;
      ctx3.globalAlpha = pulse;
      ctx3.fillText("READY!", W2 / 2, H2 / 2);
      ctx3.globalAlpha = 1;
      ctx3.textAlign = "left";
      ctx3.textBaseline = "alphabetic";
    }
  }
  drawInstructionBox(cx, cy, lines) {
    const { ctx: ctx3 } = this;
    const pad = 14;
    const lineH = 18;
    const boxH = lines.length * lineH + pad * 2;
    const boxW = 440;
    const x = cx - boxW / 2;
    const y = cy - boxH / 2;
    ctx3.fillStyle = "rgba(0,0,9,0.82)";
    ctx3.fillRect(x, y, boxW, boxH);
    ctx3.strokeStyle = this.colorTonic;
    ctx3.lineWidth = 1;
    ctx3.strokeRect(x, y, boxW, boxH);
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    lines.forEach((line, i) => {
      ctx3.font = i === 0 ? "10px 'Press Start 2P', monospace" : "7px 'Press Start 2P', monospace";
      ctx3.fillStyle = i === 0 ? "#ffffff" : "#888888";
      ctx3.fillText(line, cx, y + pad + lineH * i + lineH / 2);
    });
    ctx3.textAlign = "left";
    ctx3.textBaseline = "alphabetic";
  }
  spawnWave(idx) {
    const cycle = Math.floor(idx / WAVES.length);
    const def = WAVES[idx % WAVES.length];
    if (!def) return;
    this.enemySpeed = def.speed * (1 + cycle * 0.2);
    this.waveLabel = def.label;
    this.waveLabelTimer = WAVE_LABEL_DUR;
    this.enemies = [];
    for (let row = 0; row < def.rows; row++) {
      for (let col = 0; col < def.cols; col++) {
        this.enemies.push({
          x: W2 + 50 + col * ENEMY_COL_SPACING,
          y: ENEMY_START_Y + row * ENEMY_ROW_SPACING,
          dead: false
        });
      }
    }
  }
};

// src/ui/game-panel.ts
var CANVAS_H = 400;
var CANVAS_PAD = 20;
var SEMITONE_THRESHOLD = 1.5;
var PX_PER_SEMITONE = 20;
var SILENCE_RESET_FRAMES = 30;
var BEND_WINDOW_MS = 300;
var BEND_MIN_MS = 180;
var BEND_SEMITONES = 2;
var BEND_MAX_REVERSALS = 1;
var BEND_COOLDOWN_MS = 1200;
var BEND_STEP_PX = 70;
var MIN_SHIP_X = 30;
var MAX_SHIP_X = 150;
var TRILL_WINDOW_MS = 300;
var TRILL_MIN_REVERSALS = 4;
var TRILL_COOLDOWN_MS = 1200;
var KEY_PC = {
  G: 7,
  C: 0,
  D: 2,
  A: 9,
  E: 4,
  F: 5,
  Bb: 10
};
var game = null;
var lastNoteFreq = 0;
var silenceFrames = 0;
var freqWindow = [];
var lastBendTime = 0;
var lastTrillTime = 0;
function resetPitchState() {
  lastNoteFreq = 0;
  silenceFrames = 0;
  freqWindow = [];
  lastBendTime = 0;
  lastTrillTime = 0;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function initGamePanel() {
  const gamePanel = qs("#game-panel");
  const canvas3 = qs("#game-canvas");
  const startBtn = qs("#game-start-btn");
  const quitBtn = qs("#game-quit-btn");
  const skipTutBtn = qs("#game-tutorial-skip-btn");
  const toggleBtn = qs("#game-toggle-btn");
  const keyBtns = Array.from(document.querySelectorAll(".game-key-btn"));
  game = new ChordCasterGame(canvas3);
  game.onTutorialPhaseChange = (phase) => {
    skipTutBtn.classList.toggle("hidden", phase < 0);
  };
  let selectedKeyName = null;
  toggleBtn.addEventListener("click", () => {
    const isOpen = !gamePanel.classList.contains("hidden");
    if (isOpen) {
      closePanel();
    } else {
      gamePanel.classList.remove("hidden");
      toggleBtn.classList.add("active");
    }
  });
  quitBtn.addEventListener("click", () => closePanel());
  skipTutBtn.addEventListener("click", () => {
    game?.skipTutorial();
    skipTutBtn.classList.add("hidden");
  });
  function closePanel() {
    game?.stop();
    gamePanel.classList.add("hidden");
    gamePanel.classList.remove("game-running");
    toggleBtn.classList.remove("active");
    skipTutBtn.classList.add("hidden");
    resetPitchState();
  }
  for (const btn of keyBtns) {
    btn.addEventListener("click", () => {
      keyBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedKeyName = btn.dataset["key"] ?? null;
      startBtn.classList.add("ready");
    });
  }
  startBtn.addEventListener("click", () => {
    if (!selectedKeyName) return;
    const pc = KEY_PC[selectedKeyName];
    if (pc === void 0) return;
    const key = buildKey(pc, "major");
    resetPitchState();
    gamePanel.classList.add("game-running");
    game.start(key);
  });
  canvas3.addEventListener("click", (e) => game?.handleClick(e));
  on("pitch:detected", ({ frequency, confidence }) => {
    if (!game || game.status !== "playing") return;
    const now = performance.now();
    if (confidence < 0.5) {
      silenceFrames++;
      if (silenceFrames >= SILENCE_RESET_FRAMES) lastNoteFreq = 0;
      return;
    }
    silenceFrames = 0;
    if (lastNoteFreq === 0) {
      lastNoteFreq = frequency;
    } else {
      const semitoneDelta = 12 * Math.log2(frequency / lastNoteFreq);
      if (Math.abs(semitoneDelta) >= SEMITONE_THRESHOLD) {
        const yDelta = -Math.sign(semitoneDelta) * Math.abs(semitoneDelta) * PX_PER_SEMITONE;
        game.targetY = clamp(game.targetY + yDelta, CANVAS_PAD, CANVAS_H - CANVAS_PAD);
        lastNoteFreq = frequency;
      }
    }
    freqWindow.push({ freq: frequency, t: now });
    freqWindow = freqWindow.filter((s) => now - s.t < BEND_WINDOW_MS);
    if (freqWindow.length >= 4) {
      const oldest = freqWindow[0];
      const newest = freqWindow[freqWindow.length - 1];
      const windowMs = newest.t - oldest.t;
      const totalSemitones = 12 * Math.log2(newest.freq / oldest.freq);
      let reversals = 0;
      for (let i = 1; i < freqWindow.length - 1; i++) {
        const up = freqWindow[i].freq > freqWindow[i - 1].freq;
        const up2 = freqWindow[i + 1].freq > freqWindow[i].freq;
        if (up !== up2) reversals++;
      }
      if (windowMs >= BEND_MIN_MS && Math.abs(totalSemitones) >= BEND_SEMITONES && reversals <= BEND_MAX_REVERSALS && now - lastBendTime > BEND_COOLDOWN_MS) {
        if (totalSemitones > 0) {
          game.targetX = Math.min(game.targetX + BEND_STEP_PX, MAX_SHIP_X);
        } else {
          game.targetX = Math.max(game.targetX - BEND_STEP_PX, MIN_SHIP_X);
        }
        lastBendTime = now;
        freqWindow = [];
      }
      const trillSlice = freqWindow.filter((s) => now - s.t < TRILL_WINDOW_MS);
      if (trillSlice.length >= 6 && now - lastTrillTime > TRILL_COOLDOWN_MS) {
        let trillReversals = 0;
        for (let i = 1; i < trillSlice.length - 1; i++) {
          const up = trillSlice[i].freq > trillSlice[i - 1].freq;
          const up2 = trillSlice[i + 1].freq > trillSlice[i].freq;
          if (up !== up2) trillReversals++;
        }
        if (trillReversals >= TRILL_MIN_REVERSALS) {
          game.triggerEvade(now);
          lastTrillTime = now;
        }
      }
    }
  });
  on("chord:confirmed", ({ chord }) => {
    if (!game || game.status !== "playing" || !game.selectedKey) return;
    const degree = game.selectedKey.scaleNotes.indexOf(chord.root);
    if (degree === -1) return;
    const numeral = game.selectedKey.diatonicChords[degree]?.nashvilleNumeral ?? "";
    game.castSpell(numeral, performance.now());
  });
}
function stopGamePanel() {
  if (!game) return;
  game.stop();
  const gamePanel = document.getElementById("game-panel");
  const toggleBtn = document.getElementById("game-toggle-btn");
  gamePanel?.classList.add("hidden");
  gamePanel?.classList.remove("game-running");
  toggleBtn?.classList.remove("active");
}

// src/theory/modes.ts
var MODES = {
  Ionian: { name: "Ionian", degreeOffset: 0, character: "Bright, happy", intervals: [2, 2, 1, 2, 2, 2, 1] },
  Dorian: { name: "Dorian", degreeOffset: 1, character: "Jazzy, bittersweet", intervals: [2, 1, 2, 2, 2, 1, 2] },
  Phrygian: { name: "Phrygian", degreeOffset: 2, character: "Spanish, dark", intervals: [1, 2, 2, 2, 1, 2, 2] },
  Lydian: { name: "Lydian", degreeOffset: 3, character: "Dreamy, ethereal", intervals: [2, 2, 2, 1, 2, 2, 1] },
  Mixolydian: { name: "Mixolydian", degreeOffset: 4, character: "Bluesy, rock", intervals: [2, 2, 1, 2, 2, 1, 2] },
  Aeolian: { name: "Aeolian", degreeOffset: 5, character: "Sad, natural minor", intervals: [2, 1, 2, 2, 1, 2, 2] },
  Locrian: { name: "Locrian", degreeOffset: 6, character: "Tense, unstable", intervals: [1, 2, 2, 1, 2, 2, 2] }
};
function getModeRoot(key, mode) {
  const offset = MODES[mode].degreeOffset;
  const pc = key.scaleNotes[offset];
  if (pc === void 0) throw new Error(`No scale note at offset ${offset}`);
  return pc;
}
function buildModeScale(root, intervals) {
  const notes = [root];
  let current = root;
  for (let i = 0; i < intervals.length - 1; i++) {
    current = (current + (intervals[i] ?? 0)) % 12;
    notes.push(current);
  }
  return notes;
}

// src/engine/tab-generator.ts
var STRING_LABELS = ["e", "B", "G", "D", "A", "E"];
var OPEN_PC = [4, 11, 7, 2, 9, 4];
function generateTab(key, mode) {
  const modeData = MODES[mode];
  const modeRoot = getModeRoot(key, mode);
  const modeScale = buildModeScale(modeRoot, modeData.intervals);
  const scalePCSet = new Set(modeScale);
  const tonicName = key.name.split(" ")[0] ?? "";
  const header = `${tonicName} ${mode} \u2014 ${modeData.character}`;
  const lines = STRING_LABELS.map((label, i) => {
    const openPC = OPEN_PC[i];
    const frets = [];
    for (let fret = 0; fret <= 12; fret++) {
      const pc = (openPC + fret) % 12;
      if (scalePCSet.has(pc)) {
        frets.push(fret);
      }
    }
    const noteStr = frets.map((f) => f < 10 ? `-${f}` : `${f}`).join("-");
    return `${label}|--${noteStr}--|`;
  });
  return [header, ...lines].join("\n");
}

// src/ui/modes-panel.ts
var MODE_NAMES = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
var STRINGS = [
  { label: "E\u2082", pitchClass: 4, octave: 2 },
  { label: "A\u2082", pitchClass: 9, octave: 2 },
  { label: "D\u2083", pitchClass: 2, octave: 3 },
  { label: "G\u2083", pitchClass: 7, octave: 3 },
  { label: "B\u2083", pitchClass: 11, octave: 3 },
  { label: "E\u2084", pitchClass: 4, octave: 4 }
];
var tabDisplay;
var activeMode = "Ionian";
var currentKey3 = null;
var modeTabBtns = /* @__PURE__ */ new Map();
var tunerActive = false;
var audioActive = false;
var tunerBtn = null;
var gameTabBtn = null;
var tunerWrap = null;
var tunerNoteEl = null;
var tunerCentsEl = null;
var tunerNeedle = null;
var tunerStringChips = [];
function midiNote(pitchClass, octave) {
  return (octave + 1) * 12 + pitchClass;
}
function nearestStringIdx(pitchClass, octave) {
  const detectedMidi = midiNote(pitchClass, octave);
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < STRINGS.length; i++) {
    const s = STRINGS[i];
    if (!s) continue;
    const dist = Math.abs(detectedMidi - midiNote(s.pitchClass, s.octave));
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}
function renderTuner(panel) {
  tunerWrap = el("div", { class: "tuner-wrap" });
  const topRow = el("div", { class: "tuner-top-row" });
  tunerNoteEl = el("div", { class: "tuner-note" }, audioActive ? "\u2013" : "\u2013");
  tunerCentsEl = el("div", { class: "tuner-cents" }, "");
  topRow.append(tunerNoteEl, tunerCentsEl);
  const trackWrap = el("div", { class: "tuner-track-wrap" });
  const trackLabels = el("div", { class: "tuner-track-labels" });
  trackLabels.append(
    el("span", {}, "\u221250\xA2"),
    el("span", {}, "0"),
    el("span", {}, "+50\xA2")
  );
  const track = el("div", { class: "tuner-track" });
  tunerNeedle = el("div", { class: "tuner-needle" });
  track.append(tunerNeedle);
  trackWrap.append(track, trackLabels);
  const stringsRow = el("div", { class: "tuner-strings" });
  tunerStringChips = [];
  for (const s of STRINGS) {
    const chip = el("div", { class: "tuner-string-chip" }, s.label);
    tunerStringChips.push(chip);
    stringsRow.append(chip);
  }
  tunerWrap.append(topRow, trackWrap, stringsRow);
  panel.append(tunerWrap);
  setTunerIdle();
}
function setTunerIdle() {
  if (!tunerNoteEl || !tunerCentsEl || !tunerNeedle) return;
  tunerNoteEl.textContent = "\u2013";
  tunerNoteEl.className = "tuner-note";
  tunerCentsEl.textContent = "";
  tunerNeedle.style.left = "50%";
  tunerNeedle.className = "tuner-needle";
  for (const chip of tunerStringChips) chip.classList.remove("active");
}
function updateTuner(pitchClass, octave, cents) {
  if (!tunerNoteEl || !tunerCentsEl || !tunerNeedle) return;
  const noteName2 = NOTE_NAMES_SHARP[pitchClass] ?? "?";
  tunerNoteEl.textContent = `${noteName2}${octave}`;
  const sign = cents >= 0 ? "+" : "";
  tunerCentsEl.textContent = `${sign}${cents}\xA2`;
  const absCents = Math.abs(cents);
  const tuneClass = absCents <= 5 ? "in-tune" : absCents <= 20 ? "close" : "off";
  tunerNoteEl.className = `tuner-note ${tuneClass}`;
  tunerCentsEl.className = `tuner-cents ${tuneClass}`;
  tunerNeedle.className = `tuner-needle ${tuneClass}`;
  const pct = 50 + Math.max(-50, Math.min(50, cents));
  tunerNeedle.style.left = `${pct}%`;
  const nearIdx = nearestStringIdx(pitchClass, octave);
  for (let i = 0; i < tunerStringChips.length; i++) {
    tunerStringChips[i]?.classList.toggle("active", i === nearIdx);
  }
}
function renderPanelContent(panel) {
  while (panel.children.length > 1) panel.removeChild(panel.lastChild);
  tunerWrap = null;
  tunerNoteEl = null;
  tunerCentsEl = null;
  tunerNeedle = null;
  tunerStringChips = [];
  if (tunerActive) {
    renderTuner(panel);
  } else {
    tabDisplay = el("pre", { class: "tab-display" });
    panel.append(tabDisplay);
    renderTab();
  }
}
function initModesPanel() {
  const panel = qs("#modes-panel");
  const gamePanel = qs("#game-panel");
  panel.innerHTML = "";
  let gameTabActive = false;
  const tabBar = el("div", { class: "mode-tab-bar" });
  for (const mode of MODE_NAMES) {
    const btn = el("button", {
      class: `mode-tab-btn${mode === activeMode ? " active" : ""}`
    }, mode);
    btn.addEventListener("click", () => {
      if (gameTabActive) {
        gameTabActive = false;
        gameTabBtn?.classList.remove("active");
        gamePanel.classList.add("hidden");
      }
      if (tunerActive) {
        tunerActive = false;
        if (tunerBtn) tunerBtn.classList.remove("active");
        renderPanelContent(panel);
      }
      emit({ type: "mode:changed", mode });
    });
    modeTabBtns.set(mode, btn);
    tabBar.append(btn);
  }
  tunerBtn = el("button", { class: "mode-tab-btn tuner-tab-btn" }, "\u2669 Tuner");
  tunerBtn.addEventListener("click", () => {
    if (gameTabActive) {
      gameTabActive = false;
      gameTabBtn?.classList.remove("active");
      gamePanel.classList.add("hidden");
    }
    tunerActive = !tunerActive;
    tunerBtn.classList.toggle("active", tunerActive);
    if (tunerActive) {
      for (const btn of modeTabBtns.values()) btn.classList.remove("active");
    } else {
      modeTabBtns.get(activeMode)?.classList.add("active");
    }
    renderPanelContent(panel);
  });
  tabBar.append(tunerBtn);
  gameTabBtn = el("button", { class: "mode-tab-btn game-tab-btn" }, "\u2694 Game");
  gameTabBtn.addEventListener("click", () => {
    gameTabActive = !gameTabActive;
    gameTabBtn.classList.toggle("active", gameTabActive);
    if (gameTabActive) {
      if (tunerActive) {
        tunerActive = false;
        tunerBtn?.classList.remove("active");
      }
      for (const btn of modeTabBtns.values()) btn.classList.remove("active");
      gamePanel.classList.remove("hidden");
    } else {
      stopGamePanel();
      gamePanel.classList.add("hidden");
      if (!tunerActive) modeTabBtns.get(activeMode)?.classList.add("active");
      renderPanelContent(panel);
    }
  });
  tabBar.append(gameTabBtn);
  panel.append(tabBar);
  tabDisplay = el("pre", { class: "tab-display" }, "Select a key to see mode tablature");
  panel.append(tabDisplay);
  on("key:changed", (event) => {
    currentKey3 = event.key;
    const defaultMode = event.key.mode === "minor" ? "Aeolian" : "Ionian";
    if (activeMode !== defaultMode) {
      const prev = modeTabBtns.get(activeMode);
      if (prev) prev.classList.remove("active");
      activeMode = defaultMode;
      const next = modeTabBtns.get(activeMode);
      if (next && !tunerActive) next.classList.add("active");
    }
    if (!tunerActive) renderTab();
  });
  on("mode:changed", (event) => {
    const prev = modeTabBtns.get(activeMode);
    if (prev) prev.classList.remove("active");
    activeMode = event.mode;
    const next = modeTabBtns.get(activeMode);
    if (next) next.classList.add("active");
    if (!tunerActive) renderTab();
  });
  on("audio:started", () => {
    audioActive = true;
  });
  on("audio:stopped", () => {
    audioActive = false;
    if (tunerActive) setTunerIdle();
  });
  on("pitch:detected", (event) => {
    if (!tunerActive) return;
    updateTuner(event.pitchClass, event.octave, event.cents);
  });
  on("session:reset", () => {
    if (tunerActive) setTunerIdle();
  });
}
function renderTab() {
  if (!tabDisplay) return;
  if (!currentKey3) {
    patchText(tabDisplay, "Select a key to see mode tablature");
    return;
  }
  patchText(tabDisplay, generateTab(currentKey3, activeMode));
}

// src/audio/mic-input.ts
var audioCtx = null;
var analyser = null;
var stream = null;
var rafId = null;
async function startListening(onFrame, deviceId) {
  if (audioCtx) return;
  const audioConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  };
  if (deviceId !== void 0) audioConstraints.deviceId = { exact: deviceId };
  stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 8192;
  analyser.smoothingTimeConstant = 0.8;
  const source = audioCtx.createMediaStreamSource(stream);
  if (source.channelCount > 1) {
    const splitter = audioCtx.createChannelSplitter(source.channelCount);
    source.connect(splitter);
    splitter.connect(analyser, 0);
  } else {
    source.connect(analyser);
  }
  function loop() {
    onFrame();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}
function stopListening() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  analyser?.disconnect();
  analyser = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  void audioCtx?.close();
  audioCtx = null;
}
function getAnalyser() {
  return analyser;
}
function getSampleRate() {
  return audioCtx?.sampleRate ?? 44100;
}
function isListening() {
  return audioCtx !== null;
}

// src/ui/audio-viz.ts
var MIN_FREQ = 80;
var MAX_FREQ = 1318;
var DB_FLOOR = -90;
var DB_CEIL = -10;
var BAND_BOUNDARIES = [80, 246, 523, 880, 1318];
var BAND_VARS = [
  "--color-subdominant",
  // 80–246 Hz:  bass/root strings
  "--color-tonic",
  // 246–523 Hz: core chord tones
  "--color-dominant",
  // 523–880 Hz: upper partials
  "--color-leading"
  // 880–1318 Hz: high harmonics
];
var container;
var canvas;
var ctx;
var freqBuffer = null;
var rafId2 = null;
var isActive = false;
var xPositions = new Float32Array(0);
var colorMap = new Uint8Array(0);
var colors = ["", "", "", ""];
var minBin = 0;
var numBins = 0;
function initAudioViz() {
  container = qs("#audio-viz");
  canvas = qs("#viz-canvas");
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return;
  ctx = maybeCtx;
  colors = BAND_VARS.map(
    (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
  );
  const ro = new ResizeObserver(() => {
    recomputeLayout();
  });
  ro.observe(container);
  recomputeLayout();
  on("audio:started", () => {
    startViz();
  });
  on("audio:stopped", () => {
    stopViz();
  });
}
function recomputeLayout() {
  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = container.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.scale(dpr, dpr);
  const analyser2 = getAnalyser();
  const sr = analyser2 ? getSampleRate() : 44100;
  const fftSize = analyser2 ? analyser2.fftSize : 8192;
  const hzPerBin = sr / fftSize;
  minBin = Math.ceil(MIN_FREQ / hzPerBin);
  const maxBin = Math.floor(MAX_FREQ / hzPerBin);
  numBins = maxBin - minBin;
  const logMin = Math.log(MIN_FREQ);
  const logMax = Math.log(MAX_FREQ);
  xPositions = new Float32Array(numBins + 1);
  colorMap = new Uint8Array(numBins);
  for (let i = 0; i <= numBins; i++) {
    const hz = (minBin + i) * hzPerBin;
    const t = (Math.log(hz) - logMin) / (logMax - logMin);
    xPositions[i] = t * w;
  }
  for (let i = 0; i < numBins; i++) {
    const hz = (minBin + i) * hzPerBin;
    let band = 0;
    for (let b = 1; b < BAND_BOUNDARIES.length - 1; b++) {
      const boundary = BAND_BOUNDARIES[b];
      if (boundary !== void 0 && hz >= boundary) band = b;
    }
    colorMap[i] = band;
  }
  if (freqBuffer === null && analyser2) {
    freqBuffer = new Float32Array(analyser2.frequencyBinCount);
  }
}
function startViz() {
  const analyser2 = getAnalyser();
  if (!analyser2) return;
  if (freqBuffer === null || freqBuffer.length !== analyser2.frequencyBinCount) {
    freqBuffer = new Float32Array(analyser2.frequencyBinCount);
  }
  container.classList.add("active");
  isActive = true;
  if (rafId2 === null) {
    rafId2 = requestAnimationFrame(rafLoop);
  }
}
function stopViz() {
  isActive = false;
  container.classList.remove("active");
  if (rafId2 !== null) {
    cancelAnimationFrame(rafId2);
    rafId2 = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function rafLoop() {
  if (!isActive) {
    rafId2 = null;
    return;
  }
  const analyser2 = getAnalyser();
  if (!analyser2 || !freqBuffer) {
    rafId2 = null;
    return;
  }
  analyser2.getFloatFrequencyData(freqBuffer);
  drawFrame();
  rafId2 = requestAnimationFrame(rafLoop);
}
function drawFrame() {
  if (!freqBuffer) return;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < numBins; i++) {
    const db = freqBuffer[minBin + i] ?? DB_FLOOR;
    const t = Math.max(0, Math.min(1, (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)));
    const barH = t * h;
    if (barH < 0.5) continue;
    const x1 = xPositions[i] ?? 0;
    const x2 = (xPositions[i + 1] ?? x1 + 1) - 1;
    const bw = Math.max(1, x2 - x1);
    ctx.fillStyle = colors[colorMap[i] ?? 0] ?? "";
    ctx.fillRect(x1, h - barH, bw, barH);
  }
}

// src/ui/visualizer.ts
var MAX_RINGS = 20;
var RING_POINTS = 80;
var RINGS_PER_CHORD = 2;
var COLOR_HEX = {
  "warm-gold": "#c49a14",
  "orange": "#d4621a",
  "cool-blue": "#3a72b8",
  "green": "#2d8a40",
  "purple": "#7b3aab",
  "neutral": "#666680"
};
var COLOR_RGB = {
  "warm-gold": [196, 154, 20],
  "orange": [212, 98, 26],
  "cool-blue": [58, 114, 184],
  "green": [45, 138, 64],
  "purple": [123, 58, 171],
  "neutral": [102, 102, 128]
};
var COLOR_TENSION = {
  "warm-gold": 0.05,
  "cool-blue": 0.4,
  "green": 0.3,
  "orange": 0.85,
  "purple": 0.95,
  "neutral": 0.5
};
var screen;
var canvas2;
var ctx2;
var vizBtn;
var active = false;
var rafId3 = null;
var theoryDepth = 1;
var shimmerAmount = 0;
var startTime = 0;
var rings = [];
var currentChord2 = null;
var currentKey4 = null;
var bgTarget = [0, 0, 0];
var bgCurrent = [0, 0, 0];
function initVisualizer() {
  screen = qs("#viz-screen");
  canvas2 = qs("#aurora-canvas");
  vizBtn = qs("#viz-toggle-btn");
  const maybeCtx = canvas2.getContext("2d");
  if (!maybeCtx) return;
  ctx2 = maybeCtx;
  const style = getComputedStyle(document.documentElement);
  const CSS_VAR_MAP = [
    ["warm-gold", "--color-tonic"],
    ["orange", "--color-dominant"],
    ["cool-blue", "--color-subdominant"],
    ["green", "--color-mediant"],
    ["purple", "--color-leading"],
    ["neutral", "--color-chromatic"]
  ];
  for (const [key, varName] of CSS_VAR_MAP) {
    const val = style.getPropertyValue(varName).trim();
    if (val) COLOR_HEX[key] = val;
  }
  screen.querySelectorAll(".viz-depth-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = parseInt(btn.dataset["depth"] ?? "1", 10);
      if (d === 1 || d === 2 || d === 3) {
        theoryDepth = d;
        screen.querySelectorAll(".viz-depth-btn").forEach((b) => b.classList.toggle("active", b === btn));
      }
    });
  });
  vizBtn.addEventListener("click", enter);
  qs("#viz-back-btn").addEventListener("click", exit);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && active) exit();
  });
  const ro = new ResizeObserver(() => {
    if (active) resizeCanvas();
  });
  ro.observe(screen);
  on("chord:confirmed", (e) => {
    currentChord2 = e.chord;
    spawnRing(e.chord);
    bgTarget = [...COLOR_RGB[e.chord.color] ?? [0, 0, 0]];
  });
  on("pitch:detected", (e) => {
    shimmerAmount = e.confidence;
  });
  on("circuit:completed", () => {
    bloomAllRings();
  });
  on("key:changed", (e) => {
    currentKey4 = e.key;
  });
  on("session:reset", () => {
    rings = [];
    currentChord2 = null;
    currentKey4 = null;
    shimmerAmount = 0;
    bgTarget = [0, 0, 0];
    bgCurrent = [0, 0, 0];
  });
}
function enter() {
  active = true;
  screen.classList.add("active");
  vizBtn.classList.add("active");
  startTime = performance.now();
  requestAnimationFrame(() => {
    resizeCanvas();
    if (rafId3 === null) rafId3 = requestAnimationFrame(rafLoop2);
  });
}
function exit() {
  active = false;
  screen.classList.remove("active");
  vizBtn.classList.remove("active");
  if (rafId3 !== null) {
    cancelAnimationFrame(rafId3);
    rafId3 = null;
  }
}
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas2.clientWidth;
  const h = canvas2.clientHeight;
  if (w === 0 || h === 0) return;
  canvas2.width = Math.round(w * dpr);
  canvas2.height = Math.round(h * dpr);
}
function spawnRing(chord) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas2.width / dpr;
  const h = canvas2.height / dpr;
  const corner = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
  const tension = COLOR_TENSION[chord.color] ?? 0.5;
  const color = COLOR_HEX[chord.color] ?? "#666680";
  for (let i = 0; i < RINGS_PER_CHORD; i++) {
    if (rings.length >= MAX_RINGS) rings.shift();
    const startProgress = i * 0.07;
    rings.push({
      color,
      radius: corner * startProgress,
      maxRadius: corner,
      initialOpacity: 0.88 - i * 0.1,
      strokeWidth: 2.8 + tension * 3.2 - i * 0.45,
      expandRate: 7e-3 + tension * 25e-4
    });
  }
}
function bloomAllRings() {
  for (const ring of rings) {
    ring.initialOpacity = Math.min(1, ring.initialOpacity * 1.4);
    ring.expandRate = 0.016;
  }
}
function shimmerOffset(angle, t, amp) {
  return amp * (Math.sin(angle * 3 + t * 2.1) * 0.5 + Math.sin(angle * 7 + t * 1.3) * 0.3 + Math.sin(angle * 13 + t * 0.7) * 0.2);
}
function rafLoop2() {
  if (!active) {
    rafId3 = null;
    return;
  }
  renderFrame();
  rafId3 = requestAnimationFrame(rafLoop2);
}
function renderFrame() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas2.width / dpr;
  const h = canvas2.height / dpr;
  if (w === 0 || h === 0) return;
  const cx = w / 2;
  const cy = h / 2;
  const t = (performance.now() - startTime) / 1e3;
  const [r0, g0, b0] = bgCurrent;
  const [rt, gt, bt] = bgTarget;
  bgCurrent = [
    r0 + (rt - r0) * 0.015,
    g0 + (gt - g0) * 0.015,
    b0 + (bt - b0) * 0.015
  ];
  ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [rc, gc, bc] = bgCurrent;
  ctx2.fillStyle = `rgb(${Math.round(13 + rc * 0.1)},${Math.round(13 + gc * 0.07)},${Math.round(18 + bc * 0.1)})`;
  ctx2.fillRect(0, 0, w, h);
  for (let ri = rings.length - 1; ri >= 0; ri--) {
    const ring = rings[ri];
    if (!ring) continue;
    ring.radius = Math.min(ring.maxRadius, ring.radius + ring.maxRadius * ring.expandRate);
    const progress = ring.radius / ring.maxRadius;
    const opacity = ring.initialOpacity * Math.pow(1 - progress, 1.4);
    if (opacity <= 8e-3) {
      rings.splice(ri, 1);
      continue;
    }
    ctx2.save();
    ctx2.globalAlpha = opacity;
    ctx2.strokeStyle = ring.color;
    ctx2.lineWidth = ring.strokeWidth;
    ctx2.shadowBlur = 22;
    ctx2.shadowColor = ring.color;
    const shimAmp = shimmerAmount * ring.radius * 0.025;
    ctx2.beginPath();
    for (let pi = 0; pi <= RING_POINTS; pi++) {
      const angle = pi / RING_POINTS * Math.PI * 2;
      const r2 = ring.radius + shimmerOffset(angle, t, shimAmp);
      const x = cx + Math.cos(angle) * r2;
      const y = cy + Math.sin(angle) * r2;
      if (pi === 0) ctx2.moveTo(x, y);
      else ctx2.lineTo(x, y);
    }
    ctx2.closePath();
    ctx2.stroke();
    ctx2.restore();
  }
  if (theoryDepth >= 2 && currentChord2) {
    const cc = COLOR_HEX[currentChord2.color] ?? "#ffffff";
    ctx2.save();
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillStyle = cc;
    ctx2.globalAlpha = 0.2;
    ctx2.font = `bold ${Math.round(w * 0.11)}px system-ui, sans-serif`;
    ctx2.fillText(currentChord2.name, cx, cy - h * 0.03);
    if (currentChord2.nashvilleNumeral) {
      ctx2.globalAlpha = 0.12;
      ctx2.font = `${Math.round(w * 0.055)}px system-ui, sans-serif`;
      ctx2.fillText(currentChord2.nashvilleNumeral, cx, cy + h * 0.095);
    }
    ctx2.restore();
  }
  if (theoryDepth >= 3) {
    drawChromaticWheel(cx, cy, Math.min(w, h));
  }
}
function drawChromaticWheel(cx, cy, minDim) {
  const arcR = minDim * 0.435;
  const thick = minDim * 0.055;
  const labelR = minDim * 0.475;
  const TAU = Math.PI * 2;
  const gapRad = 0.03;
  const chordPCs = new Set(currentChord2?.pitchClasses ?? []);
  const scalePCs = new Set(currentKey4?.scaleNotes ?? []);
  const chordColor = currentChord2 ? COLOR_HEX[currentChord2.color] ?? "#ffffff" : "#ffffff";
  for (let pc = 0; pc < 12; pc++) {
    const startAngle = pc / 12 * TAU - Math.PI / 2 + gapRad / 2;
    const endAngle = (pc + 1) / 12 * TAU - Math.PI / 2 - gapRad / 2;
    const inChord = chordPCs.has(pc);
    const inScale = scalePCs.has(pc);
    const segColor = inChord ? chordColor : "#ffffff";
    const alpha = inChord ? 0.9 : inScale ? 0.28 : 0.07;
    ctx2.save();
    ctx2.globalAlpha = alpha;
    ctx2.strokeStyle = segColor;
    ctx2.lineWidth = thick;
    ctx2.shadowBlur = inChord ? 12 : 0;
    ctx2.shadowColor = segColor;
    ctx2.lineCap = "butt";
    ctx2.beginPath();
    ctx2.arc(cx, cy, arcR, startAngle, endAngle);
    ctx2.stroke();
    ctx2.restore();
    const mid = (startAngle + endAngle) / 2;
    const lx = cx + Math.cos(mid) * labelR;
    const ly = cy + Math.sin(mid) * labelR;
    ctx2.save();
    ctx2.globalAlpha = inChord ? 0.9 : inScale ? 0.35 : 0.1;
    ctx2.fillStyle = "#ffffff";
    ctx2.font = `${Math.round(minDim * 0.026)}px system-ui, sans-serif`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(NOTE_NAMES_SHARP[pc] ?? "", lx, ly);
    ctx2.restore();
  }
}

// src/audio/pitch-detector.ts
var MIN_FREQ2 = 80;
var MAX_FREQ2 = 500;
var THRESHOLD_DB = -60;
function freqToPitchClass(freq) {
  const midi = 12 * Math.log2(freq / 440) + 69;
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const pc = (rounded % 12 + 12) % 12;
  return { pitchClass: pc, octave };
}
function detectPitches(analyser2, sampleRate) {
  const bufLen = analyser2.fftSize;
  const binCount = analyser2.frequencyBinCount;
  const hzPerBin = sampleRate / bufLen;
  const freqData = new Float32Array(binCount);
  analyser2.getFloatFrequencyData(freqData);
  const minBin2 = Math.max(1, Math.ceil(MIN_FREQ2 / hzPerBin));
  const maxBin = Math.min(binCount - 2, Math.floor(MAX_FREQ2 / hzPerBin));
  const peaks = [];
  for (let i = minBin2; i <= maxBin; i++) {
    const db = freqData[i] ?? -200;
    if (db > THRESHOLD_DB && db >= (freqData[i - 1] ?? -200) && db >= (freqData[i + 1] ?? -200)) {
      peaks.push({ bin: i, db });
    }
  }
  peaks.sort((a, b) => b.db - a.db);
  const fundamentals = [];
  outer: for (const peak of peaks) {
    const freq = peak.bin * hzPerBin;
    for (const f of fundamentals) {
      const fFreq = f.bin * hzPerBin;
      for (const n of [2, 3]) {
        if (Math.abs(freq - fFreq * n) / (fFreq * n) < 0.04) continue outer;
      }
    }
    fundamentals.push(peak);
  }
  const timeData = new Float32Array(bufLen);
  analyser2.getFloatTimeDomainData(timeData);
  const yin = yinPitch(timeData, sampleRate);
  const results = [];
  if (yin && yin.confidence > 0.6) {
    const { pitchClass, octave } = freqToPitchClass(yin.frequency);
    results.push({
      frequency: yin.frequency,
      confidence: yin.confidence,
      pitchClass,
      octave
    });
  }
  for (const f of fundamentals.slice(0, 6)) {
    const freq = f.bin * hzPerBin;
    const { pitchClass, octave } = freqToPitchClass(freq);
    if (results.some((r) => r.pitchClass === pitchClass)) continue;
    const conf = Math.max(
      0,
      Math.min(1, (f.db - THRESHOLD_DB) / -THRESHOLD_DB)
    );
    if (conf >= 0.3) {
      results.push({ frequency: freq, confidence: conf, pitchClass, octave });
    }
  }
  return results;
}
function yinPitch(buf, sampleRate) {
  const halfN = Math.min(2048, Math.floor(buf.length / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / MAX_FREQ2));
  const maxTau = Math.min(halfN - 1, Math.ceil(sampleRate / MIN_FREQ2));
  const diff = new Float32Array(maxTau + 1);
  for (let tau2 = 1; tau2 <= maxTau; tau2++) {
    let sum = 0;
    for (let i = 0; i < halfN; i++) {
      const d = (buf[i] ?? 0) - (buf[i + tau2] ?? 0);
      sum += d * d;
    }
    diff[tau2] = sum;
  }
  const cmndf = new Float32Array(maxTau + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau2 = 1; tau2 <= maxTau; tau2++) {
    runningSum += diff[tau2] ?? 0;
    cmndf[tau2] = runningSum > 0 ? (diff[tau2] ?? 0) * tau2 / runningSum : 0;
  }
  const THRESHOLD = 0.15;
  let tau = -1;
  for (let t = minTau; t < maxTau; t++) {
    if ((cmndf[t] ?? 1) < THRESHOLD) {
      while (t + 1 <= maxTau && (cmndf[t + 1] ?? 1) < (cmndf[t] ?? 1)) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;
  let betterTau = tau;
  if (tau > minTau && tau < maxTau) {
    const s0 = cmndf[tau - 1] ?? 1;
    const s1 = cmndf[tau] ?? 1;
    const s2 = cmndf[tau + 1] ?? 1;
    const denom = 2 * s1 - s2 - s0;
    if (Math.abs(denom) > 1e-6) {
      betterTau = tau + (s2 - s0) / (2 * denom);
    }
  }
  const frequency = sampleRate / betterTau;
  if (frequency < MIN_FREQ2 || frequency > MAX_FREQ2) return null;
  return { frequency, confidence: 1 - (cmndf[tau] ?? 1) };
}

// src/audio/chord-recognizer.ts
var ALL_ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
var QUALITIES2 = ["maj", "min", "dom7", "maj7", "min7", "dim"];
function recognizeChord(pitches, _key) {
  if (pitches.length === 0) return null;
  const detectedPCs = new Set(pitches.map((p) => p.pitchClass));
  let bestScore = -Infinity;
  let bestGuess = null;
  for (const root of ALL_ROOTS) {
    for (const quality of QUALITIES2) {
      const intervals = CHORD_INTERVALS[quality];
      const chordPCs = intervals.map((i) => (root + i) % 12);
      let hits = 0;
      for (const pc of chordPCs) {
        if (detectedPCs.has(pc)) hits++;
      }
      const extraNotes = Math.max(0, detectedPCs.size - hits);
      const score = hits / chordPCs.length - 0.2 * extraNotes;
      if (score > bestScore) {
        bestScore = score;
        bestGuess = { chord: buildChord(root, quality), confidence: Math.max(0, Math.min(1, score)) };
      }
    }
  }
  if (!bestGuess || bestScore < 0.6) return null;
  return bestGuess;
}

// src/main.ts
var state = {
  session: createSession(),
  currentChord: null,
  suggestions: [],
  keyCandidates: [],
  activeMode: "Ionian",
  audioRunning: false
};
var circuitTracker = new CircuitTracker();
function confirmedKey() {
  return state.session.keyConfirmed ? state.session.key : null;
}
function enrichWithKey(chord, key) {
  const idx = key.scaleNotes.indexOf(chord.root);
  if (idx === -1) return chord;
  const dc = key.diatonicChords[idx];
  if (!dc || dc.chord.quality !== chord.quality) return chord;
  return dc.chord;
}
function recomputeSuggestions() {
  const key = confirmedKey();
  if (!key || !state.currentChord) {
    updateSuggestions([]);
    return;
  }
  const chords = state.session.events.map((e) => e.chord);
  const raw = rankNextChords(state.currentChord, key, chords, state.session.circuits);
  state.suggestions = raw.map((s) => ({
    ...s,
    voicings: resolveVoicings(s.chord, key)
  }));
  updateSuggestions(state.suggestions);
}
on("chord:confirmed", (event) => {
  lastPendingName = event.chord.name;
  lastConfirmedChord = event.chord;
  lastConfirmedTime = Date.now();
  const key = confirmedKey();
  const chord = key ? enrichWithKey(event.chord, key) : event.chord;
  state.session = appendChord(state.session, chord, event.source);
  state.currentChord = chord;
  if (key) {
    const circuit = circuitTracker.processNewChord(chord, key);
    if (circuit) {
      state.session = { ...state.session, circuits: [...state.session.circuits, circuit] };
      emit({ type: "circuit:completed", circuit });
    }
  }
  const chordHistory = state.session.events.map((e) => e.chord);
  const candidates = inferKey(chordHistory);
  state.keyCandidates = candidates;
  if (chordHistory.length >= 3 && !state.session.keyConfirmed && !keyToastSuppressed) {
    emit({ type: "key:candidate", candidates });
  }
  recomputeSuggestions();
});
on("key:changed", (event) => {
  state.session = { ...state.session, key: event.key, keyConfirmed: true };
  keyToastSuppressed = true;
  circuitTracker.reset();
  recomputeSuggestions();
});
on("key:dismissed", () => {
  keyToastSuppressed = true;
});
on("mode:changed", (event) => {
  state.activeMode = event.mode;
});
var voteBuffer = [];
var VOTE_WINDOW_MS = 500;
var VOTES_NEEDED = 3;
var DEBOUNCE_MS = 1500;
var lastConfirmedChord = null;
var lastConfirmedTime = 0;
var lastPendingName = null;
var confirmationEnabled = true;
var keyToastSuppressed = false;
function onAudioFrame() {
  const analyser2 = getAnalyser();
  if (!analyser2) return;
  const pitches = detectPitches(analyser2, getSampleRate());
  const best = pitches[0];
  if (best && best.confidence > 0.6) {
    const midi = 12 * Math.log2(best.frequency / 440) + 69;
    const roundedMidi = Math.round(midi);
    const targetHz = 440 * Math.pow(2, (roundedMidi - 69) / 12);
    const cents = Math.round(1200 * Math.log2(best.frequency / targetHz));
    emit({ type: "pitch:detected", frequency: best.frequency, pitchClass: best.pitchClass, octave: best.octave, cents, confidence: best.confidence });
  }
  const guess = recognizeChord(pitches, confirmedKey());
  if (!guess || guess.confidence < 0.6) {
    if (lastPendingName !== null) {
      lastPendingName = null;
      emit({ type: "chord:rejected" });
    }
    return;
  }
  const now = Date.now();
  if (guess.confidence < 0.7) {
    if (confirmationEnabled) {
      if (lastConfirmedChord?.name === guess.chord.name && now - lastConfirmedTime < DEBOUNCE_MS) {
        return;
      }
      if (guess.chord.name !== lastPendingName) {
        lastPendingName = guess.chord.name;
        emit({ type: "chord:pending", guess });
      }
      return;
    }
  }
  if (lastPendingName !== null) {
    lastPendingName = null;
    emit({ type: "chord:rejected" });
  }
  voteBuffer.push({ name: guess.chord.name, chord: guess.chord, ts: now });
  while (voteBuffer.length > 0 && now - (voteBuffer[0]?.ts ?? now) > VOTE_WINDOW_MS) {
    voteBuffer.shift();
  }
  const counts = /* @__PURE__ */ new Map();
  for (const v of voteBuffer) {
    const entry = counts.get(v.name);
    if (entry) {
      entry.count++;
    } else {
      counts.set(v.name, { count: 1, chord: v.chord });
    }
  }
  for (const [name, { count, chord }] of counts) {
    if (count >= VOTES_NEEDED) {
      if (lastConfirmedChord?.name === name && now - lastConfirmedTime < DEBOUNCE_MS) break;
      lastConfirmedChord = chord;
      lastConfirmedTime = now;
      voteBuffer.length = 0;
      emit({ type: "chord:confirmed", chord, source: "mic" });
      break;
    }
  }
}
function initClearButton() {
  const btn = qs("#clear-btn");
  btn.addEventListener("click", () => {
    state.session = createSession();
    state.currentChord = null;
    state.suggestions = [];
    state.keyCandidates = [];
    circuitTracker.reset();
    lastConfirmedChord = null;
    lastConfirmedTime = 0;
    lastPendingName = null;
    keyToastSuppressed = false;
    voteBuffer.length = 0;
    emit({ type: "session:reset" });
  });
}
function init() {
  initKeyBar();
  initGpsPanel();
  initChordPicker();
  initSessionLog(state.session.startedAt);
  initModesPanel();
  initListenButton();
  initConfirmToggle();
  initClearButton();
  initAudioViz();
  initVisualizer();
  initGamePanel();
  console.log("Chord-A-Long loaded");
}
async function populateDevicePicker(sel) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === "audioinput");
  const current = sel.value;
  sel.innerHTML = '<option value="">Default mic</option>';
  inputs.forEach((d, i) => {
    const opt = document.createElement("option");
    opt.value = d.deviceId;
    opt.textContent = d.label || `Input ${i + 1}`;
    if (d.deviceId === current) opt.selected = true;
    sel.appendChild(opt);
  });
}
var CONFIRM_STORAGE_KEY = "chord-a-long:confirm";
function initConfirmToggle() {
  const btn = qs("#confirm-toggle");
  if (localStorage.getItem(CONFIRM_STORAGE_KEY) === "0") {
    confirmationEnabled = false;
    btn.textContent = "Confirm: Off";
    btn.classList.remove("on");
  }
  btn.addEventListener("click", () => {
    confirmationEnabled = !confirmationEnabled;
    localStorage.setItem(CONFIRM_STORAGE_KEY, confirmationEnabled ? "1" : "0");
    btn.textContent = confirmationEnabled ? "Confirm: On" : "Confirm: Off";
    btn.classList.toggle("on", confirmationEnabled);
    if (!confirmationEnabled && lastPendingName !== null) {
      lastPendingName = null;
      emit({ type: "chord:rejected" });
    }
  });
}
function initListenButton() {
  const listenBtn = qs("#listen-btn");
  const deniedBanner = qs("#mic-denied-banner");
  const deviceSel = qs("#audio-device-select");
  void populateDevicePicker(deviceSel);
  listenBtn.addEventListener("click", () => {
    void (async () => {
      if (isListening()) {
        stopListening();
        state.audioRunning = false;
        listenBtn.textContent = "\u25CF Mic Off";
        listenBtn.classList.remove("active");
        emit({ type: "audio:stopped" });
        return;
      }
      deniedBanner.classList.remove("visible");
      try {
        listenBtn.textContent = "\u22EF Connecting\u2026";
        listenBtn.disabled = true;
        const selectedLabel = deviceSel.options[deviceSel.selectedIndex]?.text ?? "";
        let deviceId = deviceSel.value || void 0;
        await startListening(onAudioFrame, deviceId);
        await populateDevicePicker(deviceSel);
        if (!deviceId && selectedLabel && selectedLabel !== "Default mic") {
          const match = Array.from(deviceSel.options).find((o) => o.text === selectedLabel && o.value);
          if (match) {
            stopListening();
            deviceId = match.value;
            await startListening(onAudioFrame, deviceId);
          }
        }
        if (deviceId) deviceSel.value = deviceId;
        state.audioRunning = true;
        listenBtn.textContent = "\u25CF Listening";
        listenBtn.classList.add("active");
        listenBtn.disabled = false;
        emit({ type: "audio:started" });
      } catch {
        listenBtn.textContent = "\u26A0 Mic denied";
        listenBtn.disabled = false;
        deniedBanner.classList.add("visible");
        setTimeout(() => deniedBanner.classList.remove("visible"), 8e3);
      }
    })();
  });
}
init();
//# sourceMappingURL=bundle.js.map
