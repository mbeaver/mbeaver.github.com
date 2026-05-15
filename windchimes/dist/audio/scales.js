export const SCALE_INTERVALS = {
    majorPentatonic: [0, 2, 4, 7, 9],
    dorianPentatonic: [0, 2, 3, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    aeolianPentatonic: [0, 3, 5, 7, 10],
    wholeTone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
// Reference MIDI note for each root pitch class
export const ROOT_MIDI = {
    Bb: 70, F: 65, C: 60, G: 55, D: 50, A: 45, Eb: 51,
};
// Convert MIDI note number to note-name string ("C4", "A#3", etc.)
export function midiToNote(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    return `${names[midi % 12]}${octave}`;
}
/**
 * Build a weighted MIDI note pool for a given scale, root, and octave range.
 * Mid-octave notes appear twice (2× weight) to bias toward the centre of the range.
 */
export function buildNotePool(scaleType, rootMidi, octaveRange) {
    const intervals = SCALE_INTERVALS[scaleType] ?? SCALE_INTERVALS['majorPentatonic'];
    const pitchClass = rootMidi % 12;
    const [lowOctave, highOctave] = octaveRange;
    const midOctave = Math.round((lowOctave + highOctave) / 2);
    const pool = [];
    for (let oct = lowOctave; oct <= highOctave; oct++) {
        const base = (oct + 1) * 12 + pitchClass;
        for (const interval of intervals) {
            const note = base + interval;
            if (note >= 0 && note <= 127) {
                pool.push(note);
                if (oct === midOctave)
                    pool.push(note); // 2× weight for mid-octave
            }
        }
    }
    return pool;
}
//# sourceMappingURL=scales.js.map