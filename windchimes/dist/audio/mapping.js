import { buildNotePool, ROOT_MIDI } from "./scales.js";
const SCALE_DISPLAY = {
    majorPentatonic: "Major",
    dorianPentatonic: "Dorian",
    minorPentatonic: "Minor",
    aeolianPentatonic: "Minor",
    wholeTone: "Whole Tone",
    chromatic: "Chromatic",
};
const ROOT_NAME = {
    [ROOT_MIDI["Bb"]]: "B♭",
    [ROOT_MIDI["F"]]: "F",
    [ROOT_MIDI["C"]]: "C",
    [ROOT_MIDI["G"]]: "G",
    [ROOT_MIDI["D"]]: "D",
    [ROOT_MIDI["A"]]: "A",
    [ROOT_MIDI["Eb"]]: "E♭",
};
function selectMaterial(code) {
    if (code <= 1)
        return "aluminum";
    if (code <= 3)
        return "bronze";
    if (code >= 45 && code <= 48)
        return "bamboo";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
        return "glass";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
        return "crystal";
    if (code >= 95)
        return "steel";
    return "aluminum";
}
function selectScaleType(code) {
    if (code <= 1)
        return "majorPentatonic";
    if (code === 2)
        return "dorianPentatonic";
    if (code === 3)
        return "minorPentatonic";
    if (code >= 45 && code <= 48)
        return "wholeTone";
    if (code >= 51 && code <= 57)
        return "minorPentatonic";
    if (code >= 61 && code <= 67)
        return "aeolianPentatonic";
    if (code >= 71 && code <= 77)
        return "majorPentatonic";
    if (code >= 80 && code <= 82)
        return "dorianPentatonic";
    if (code >= 85 && code <= 86)
        return "majorPentatonic";
    if (code >= 95)
        return "chromatic";
    return "majorPentatonic";
}
function selectRoot(tempMax) {
    if (tempMax > 90)
        return ROOT_MIDI["Bb"];
    if (tempMax > 80)
        return ROOT_MIDI["F"];
    if (tempMax > 68)
        return ROOT_MIDI["C"];
    if (tempMax > 55)
        return ROOT_MIDI["G"];
    if (tempMax > 42)
        return ROOT_MIDI["D"];
    if (tempMax > 30)
        return ROOT_MIDI["A"];
    return ROOT_MIDI["Eb"];
}
function selectOctaveRange(tempMax) {
    if (tempMax > 80)
        return [5, 6];
    if (tempMax > 60)
        return [4, 5];
    if (tempMax > 40)
        return [3, 5];
    return [3, 4];
}
function windToDensity(windSpeed) {
    if (windSpeed <= 2)
        return {
            tickIntervalMs: 2000,
            strikeProbability: 0.25,
            maxSimultaneous: 1,
        };
    if (windSpeed <= 5)
        return {
            tickIntervalMs: 1500,
            strikeProbability: 0.45,
            maxSimultaneous: 1,
        };
    if (windSpeed <= 9)
        return { tickIntervalMs: 1000, strikeProbability: 0.6, maxSimultaneous: 2 };
    if (windSpeed <= 15)
        return { tickIntervalMs: 600, strikeProbability: 0.75, maxSimultaneous: 2 };
    if (windSpeed <= 21)
        return { tickIntervalMs: 275, strikeProbability: 0.8, maxSimultaneous: 3 };
    if (windSpeed <= 50)
        return { tickIntervalMs: 100, strikeProbability: 0.89, maxSimultaneous: 3 };
    return { tickIntervalMs: 80, strikeProbability: 0.95, maxSimultaneous: 4 };
}
function cloudToReverb(cloudCover, code) {
    if (code >= 45 && code <= 48)
        return 7.0; // fog
    if (cloudCover <= 15)
        return 0.8;
    if (cloudCover <= 40)
        return 1.5;
    if (cloudCover <= 70)
        return 2.5;
    if (cloudCover <= 85)
        return 3.5;
    return 5.0;
}
function conditionToEffects(code, humidity) {
    if (code >= 45 && code <= 48) {
        return {
            delayTime: 0.4,
            delayFeedback: 0.35,
            chorusEnabled: false,
            tremoloEnabled: true,
        };
    }
    if (code >= 95) {
        return {
            delayTime: 0.1,
            delayFeedback: 0.15,
            chorusEnabled: false,
            tremoloEnabled: false,
        };
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        return {
            delayTime: null,
            delayFeedback: 0,
            chorusEnabled: true,
            tremoloEnabled: false,
        };
    }
    // heavy overcast with high humidity
    if (code === 3 && humidity > 80) {
        return {
            delayTime: 0.4,
            delayFeedback: 0.35,
            chorusEnabled: false,
            tremoloEnabled: false,
        };
    }
    return {
        delayTime: null,
        delayFeedback: 0,
        chorusEnabled: false,
        tremoloEnabled: false,
    };
}
function materialToNoteDuration(material) {
    switch (material) {
        case "aluminum":
            return 3.0;
        case "bronze":
            return 2.5;
        case "bamboo":
            return 0.8;
        case "glass":
            return 1.5;
        case "crystal":
            return 2.0;
        case "steel":
            return 0.4;
    }
}
export function mapWeatherToAudio(day) {
    const { weatherCode: code, tempMax, windSpeedMax, cloudCover, humidityMax, } = day;
    // Thunderstorm always gets storm-level density
    const windForDensity = code >= 95 ? Math.max(windSpeedMax, 50) : windSpeedMax;
    const material = selectMaterial(code);
    const scaleType = selectScaleType(code);
    const root = selectRoot(tempMax);
    const octaveRange = selectOctaveRange(tempMax);
    const scale = buildNotePool(scaleType, root, octaveRange);
    const { tickIntervalMs, strikeProbability, maxSimultaneous } = windToDensity(windForDensity);
    const chordProbability = windSpeedMax > 3 ? 0.4 : 0.0;
    const reverbDecay = cloudToReverb(cloudCover, code);
    const { delayTime, delayFeedback, chorusEnabled, tremoloEnabled } = conditionToEffects(code, humidityMax);
    const noteDurationSec = materialToNoteDuration(material);
    const scaleLabel = `${ROOT_NAME[root] ?? "?"} ${SCALE_DISPLAY[scaleType] ?? scaleType}`;
    return {
        material,
        scaleLabel,
        scale,
        tickIntervalMs,
        strikeProbability,
        maxSimultaneous,
        chordProbability,
        reverbDecay,
        delayTime,
        delayFeedback,
        chorusEnabled,
        tremoloEnabled,
        noteDurationSec,
    };
}
//# sourceMappingURL=mapping.js.map