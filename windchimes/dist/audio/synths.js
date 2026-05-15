import { PluckSynth, FMSynth, MetalSynth } from 'tone';
import { midiToNote } from './scales.js';
function makePluck(params) {
    return new PluckSynth(params);
}
export function createSynths(profile) {
    switch (profile.material) {
        case 'aluminum': {
            const synth = makePluck({ attackNoise: 1.2, dampening: 3500, resonance: 0.92 });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, _dur, time) => synth.triggerAttack(midiToNote(midi), time),
                dispose: () => synth.dispose(),
            };
        }
        case 'bronze': {
            const synth = makePluck({ attackNoise: 0.8, dampening: 2000, resonance: 0.72 });
            return {
                connect: (dest) => synth.connect(dest),
                triggerNote: (midi, _dur, time) => synth.triggerAttack(midiToNote(midi), time),
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
            const metal = new MetalSynth({
                harmonicity: 12,
                resonance: 1200,
                modulationIndex: 50,
                envelope: { attack: 0.001, decay: 0.3, release: 0.1 },
            });
            // Low bass PluckSynth layer underneath for storm texture
            const bass = makePluck({ attackNoise: 0.6, dampening: 900, resonance: 0.45 });
            return {
                connect: (dest) => { metal.connect(dest); bass.connect(dest); },
                triggerNote: (midi, dur, time) => {
                    metal.triggerAttackRelease(dur, time);
                    // Bass layer 2 octaves lower, clamped to reasonable range
                    const bassMidi = Math.max(24, midi - 24);
                    bass.triggerAttack(midiToNote(bassMidi), time);
                },
                dispose: () => { metal.dispose(); bass.dispose(); },
            };
        }
    }
}
//# sourceMappingURL=synths.js.map