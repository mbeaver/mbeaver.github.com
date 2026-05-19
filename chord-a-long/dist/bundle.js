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
    const labelX = (SX[5] ?? 92) + 6;
    parts.push(
      `<text x="${labelX}" y="${NUT_Y + FRET_H * 0.5 + 5}" font-size="15" fill="var(--text)" text-anchor="start" font-family="monospace" font-weight="600">${voicing.baseFret}fr</text>`
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
    history = [...history, event.chord];
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
var tabDisplay;
var activeMode = "Ionian";
var currentKey3 = null;
var modeTabBtns = /* @__PURE__ */ new Map();
function initModesPanel() {
  const panel = qs("#modes-panel");
  panel.innerHTML = "";
  const tabBar = el("div", { class: "mode-tab-bar" });
  for (const mode of MODE_NAMES) {
    const btn = el("button", {
      class: `mode-tab-btn${mode === activeMode ? " active" : ""}`
    }, mode);
    btn.addEventListener("click", () => {
      emit({ type: "mode:changed", mode });
    });
    modeTabBtns.set(mode, btn);
    tabBar.append(btn);
  }
  tabDisplay = el("pre", { class: "tab-display" }, "Select a key to see mode tablature");
  panel.append(tabBar, tabDisplay);
  on("key:changed", (event) => {
    currentKey3 = event.key;
    const defaultMode = event.key.mode === "minor" ? "Aeolian" : "Ionian";
    if (activeMode !== defaultMode) {
      const prev = modeTabBtns.get(activeMode);
      if (prev) prev.classList.remove("active");
      activeMode = defaultMode;
      const next = modeTabBtns.get(activeMode);
      if (next) next.classList.add("active");
    }
    renderTab();
  });
  on("mode:changed", (event) => {
    const prev = modeTabBtns.get(activeMode);
    if (prev) prev.classList.remove("active");
    activeMode = event.mode;
    const next = modeTabBtns.get(activeMode);
    if (next) next.classList.add("active");
    renderTab();
  });
}
function renderTab() {
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

// src/audio/pitch-detector.ts
var MIN_FREQ2 = 80;
var MAX_FREQ2 = 1318;
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
    results.push({ frequency: yin.frequency, confidence: yin.confidence, pitchClass, octave });
  }
  for (const f of fundamentals.slice(0, 6)) {
    const freq = f.bin * hzPerBin;
    const { pitchClass, octave } = freqToPitchClass(freq);
    if (results.some((r) => r.pitchClass === pitchClass)) continue;
    const conf = Math.max(0, Math.min(1, (f.db - THRESHOLD_DB) / -THRESHOLD_DB));
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
