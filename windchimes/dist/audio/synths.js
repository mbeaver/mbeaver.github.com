import { PluckSynth, FMSynth, AMSynth } from 'tone';
import { midiToNote } from './scales.js';
function makePluck(params) {
    return new PluckSynth(params);
}
export function createSynths(profile) {
    switch (profile.material) {
        case 'aluminum': {
            const synth = makePluck({ attackNoise: 0.5, dampening: 2200, resonance: 0.80 });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, _dur, time) => synth.triggerAttack(midiToNote(midi), time),
                dispose: () => synth.dispose(),
            };
        }
        case 'bronze': {
            const synth = new AMSynth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 1.5, sustain: 0.2, release: 2.5 },
                modulation: { type: 'sine' },
                modulationEnvelope: { attack: 0.5, decay: 1.5, sustain: 0.6, release: 2.0 },
                harmonicity: 2,
            });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, dur, time) => synth.triggerAttackRelease(midiToNote(midi), dur, time),
                dispose: () => synth.dispose(),
            };
        }
        case 'bamboo': {
            const synth = makePluck({ attackNoise: 0.4, dampening: 700, resonance: 0.28 });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, _dur, time) => synth.triggerAttack(midiToNote(midi), time),
                dispose: () => synth.dispose(),
            };
        }
        case 'glass': {
            const synth = new FMSynth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 1.5 },
                modulation: { type: 'sine' },
                modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.5 },
                harmonicity: 6,
                modulationIndex: 3,
            });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, dur, time) => synth.triggerAttackRelease(midiToNote(midi), dur, time),
                dispose: () => synth.dispose(),
            };
        }
        case 'crystal': {
            const synth = new FMSynth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 2.0 },
                modulation: { type: 'sine' },
                modulationEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.8 },
                harmonicity: 12,
                modulationIndex: 1,
            });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, dur, time) => synth.triggerAttackRelease(midiToNote(midi), dur, time),
                dispose: () => synth.dispose(),
            };
        }
        case 'steel': {
            const synth = new FMSynth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.5 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.15 },
                harmonicity: 2.5,
                modulationIndex: 12,
            });
            const bass = makePluck({ attackNoise: 0.4, dampening: 600, resonance: 0.55 });
            return {
                connect: (dest) => { synth.connect(dest); bass.connect(dest); },
                triggerNote: (midi, dur, time) => {
                    synth.triggerAttackRelease(midiToNote(midi), dur, time);
                    const bassMidi = Math.max(24, midi - 24);
                    bass.triggerAttack(midiToNote(bassMidi), time);
                },
                dispose: () => { synth.dispose(); bass.dispose(); },
            };
        }
    }
}
//# sourceMappingURL=synths.js.map