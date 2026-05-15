import { Reverb, FeedbackDelay, Chorus, Tremolo, Limiter, Gain } from 'tone';
export function buildEffectChain(profile) {
    // Limiter → Destination (always at the end)
    const limiter = new Limiter(-3).toDestination();
    // Reverb (always present)
    const reverb = new Reverb({ decay: profile.reverbDecay, wet: 0.7 });
    reverb.connect(limiter);
    // Collect disposable nodes
    const nodes = [limiter, reverb];
    // Optional: FeedbackDelay
    let delayNode = null;
    if (profile.delayTime !== null) {
        delayNode = new FeedbackDelay({
            delayTime: profile.delayTime,
            feedback: profile.delayFeedback,
            wet: 0.5,
        });
        delayNode.connect(reverb);
        nodes.push(delayNode);
    }
    // Optional: Tremolo (fog)
    let tremoloNode = null;
    if (profile.tremoloEnabled) {
        tremoloNode = new Tremolo({ frequency: 0.5, depth: 0.3 });
        tremoloNode.connect(delayNode ?? reverb);
        tremoloNode.start();
        nodes.push(tremoloNode);
    }
    // Optional: Chorus (rain/drizzle)
    let chorusNode = null;
    if (profile.chorusEnabled) {
        chorusNode = new Chorus({ frequency: 2.5, depth: 0.4, wet: 0.5 });
        chorusNode.connect(delayNode ?? tremoloNode ?? reverb);
        chorusNode.start();
        nodes.push(chorusNode);
    }
    // Input gain — the entry point for synths
    // Chain: input → first optional effect → ... → reverb → limiter → Destination
    const input = new Gain(1);
    const firstEffect = chorusNode ?? tremoloNode ?? delayNode ?? reverb;
    input.connect(firstEffect);
    nodes.push(input);
    return {
        input,
        dispose: () => nodes.forEach(n => n.dispose()),
    };
}
//# sourceMappingURL=effects.js.map