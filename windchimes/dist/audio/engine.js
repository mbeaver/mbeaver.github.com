import { Gain, getTransport, start as startAudio } from 'tone';
import { createSynths } from './synths.js';
import { buildEffectChain } from './effects.js';
const FADE_DURATION_MS = 1500;
export class AudioEngine {
    constructor() {
        this.audioStarted = false;
        this.scheduleId = null;
        // Separate timers: startTimer controls when to play the next profile;
        // disposal timers are independent and cannot be canceled (preventing leaks).
        this.startTimer = null;
        this.masterGain = null;
        this.synthSet = null;
        this.effectChain = null;
    }
    async start(profile) {
        if (!this.audioStarted) {
            await startAudio();
            this.audioStarted = true;
        }
        this.effectChain = buildEffectChain(profile);
        this.masterGain = new Gain(1);
        this.masterGain.connect(this.effectChain.input);
        this.synthSet = createSynths(profile);
        this.synthSet.connect(this.masterGain);
        // Precompute sorted unique MIDI notes for chord adjacency
        const sortedUnique = [...new Set(profile.scale)].sort((a, b) => a - b);
        this.scheduleId = getTransport().scheduleRepeat((time) => {
            if (Math.random() >= profile.strikeProbability)
                return;
            const isChord = profile.chordProbability > 0 && Math.random() < profile.chordProbability;
            if (isChord && sortedUnique.length >= 2) {
                const numNotes = 2 + Math.floor(Math.random() * Math.min(3, sortedUnique.length - 1));
                const maxStart = sortedUnique.length - numNotes;
                const startIdx = Math.floor(Math.random() * (maxStart + 1));
                for (let i = 0; i < numNotes; i++) {
                    const midi = sortedUnique[startIdx + i];
                    const offset = i * (0.02 + Math.random() * 0.06); // 20–80 ms stagger
                    this.synthSet.triggerNote(midi, profile.noteDurationSec, time + offset);
                }
                this.onStrike?.(numNotes);
            }
            else {
                const idx = Math.floor(Math.random() * profile.scale.length);
                const midi = profile.scale[idx];
                this.synthSet.triggerNote(midi, profile.noteDurationSec, time);
                this.onStrike?.(1);
            }
        }, profile.tickIntervalMs / 1000);
        getTransport().start();
    }
    stop() {
        this.cancelPendingStart();
        this.clearSchedule();
        this.fadeAndDispose(this.masterGain, this.synthSet, this.effectChain);
        this.masterGain = null;
        this.synthSet = null;
        this.effectChain = null;
    }
    async transition(profile) {
        // Always cancel any pending "start new profile" so we don't start the wrong one.
        this.cancelPendingStart();
        if (!this.audioStarted || (this.scheduleId === null && this.masterGain === null)) {
            // Nothing is playing yet — start immediately.
            await this.start(profile);
            return;
        }
        this.clearSchedule();
        // Snapshot current nodes and schedule their independent disposal after fade.
        // This timer is NOT cancellable — it always fires so nodes are never leaked.
        this.fadeAndDispose(this.masterGain, this.synthSet, this.effectChain);
        this.masterGain = null;
        this.synthSet = null;
        this.effectChain = null;
        // Schedule starting the new profile once the fade completes.
        this.startTimer = setTimeout(async () => {
            this.startTimer = null;
            await this.start(profile);
        }, FADE_DURATION_MS + 50);
    }
    clearSchedule() {
        if (this.scheduleId !== null) {
            getTransport().clear(this.scheduleId);
            this.scheduleId = null;
        }
    }
    cancelPendingStart() {
        if (this.startTimer !== null) {
            clearTimeout(this.startTimer);
            this.startTimer = null;
        }
    }
    // Fades gain to 0 over FADE_DURATION_MS then disposes all three nodes.
    // The disposal setTimeout is intentionally independent — it cannot be canceled.
    fadeAndDispose(gain, synths, chain) {
        if (gain) {
            gain.gain.rampTo(0, FADE_DURATION_MS / 1000);
        }
        setTimeout(() => {
            synths?.dispose();
            chain?.dispose();
            gain?.dispose();
        }, FADE_DURATION_MS + 50);
    }
}
//# sourceMappingURL=engine.js.map