let masterVolume = -8; // in decibel.

let tempValueElem;
let windValueElem;
let rainValueElem;
// let cloudValueElem;
let playBtn;

let minBPM = 32;
let maxBPM = 212;
let polySynth;
let synthC;

let tempOsc;
// let windOsc;
let rainOsc;
// let cloudOsc;

let windLFO;

let wave;
let waveCanvas;

const notes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
// const longSustains = ["1n", "2n"];
const longSustains = ["2n", "4n"];
// const mixedSustains = ["1n", "2n", "4n", "8n", "16n", "32n"];
const mixedSustains = ["2n", "4n", "8n"];
const shortSustains = ["8n", "16n", "32n"];

let ready = false;

function setup() {
	playBtn = document.getElementById("play");
	playBtn.addEventListener("click", handlePlay);

	var parent = document.getElementById("canvas");
	waveCanvas = createCanvas(parent.clientWidth, 200);
	waveCanvas.parent("canvas");

	tempValueElem = document.getElementById("tempvalue");
	windValueElem = document.getElementById("windvalue");
	rainValueElem = document.getElementById("rainvalue");
	// cloudValueElem = document.getElementById("cloudvalue");

	// 4 differents types: sine (default), square, triangle and sawtooth
  	tempOsc = new Tone.Oscillator({
    	type: "sine",
    	frequency: 220,
    	volume: -3
  	});
  	tempOsc.toDestination();

  	windOsc = new Tone.Oscillator({
    	type: "sine",
    	frequency: 220,
    	volume: -3
  	});
  	windOsc.toDestination();

  	// windLFO = new Tone.LFO("0.1hz", 210, 230);
  	// windLFO.connect(windOsc.frequency);

  	// rainOsc = new Tone.Oscillator({
    // 	type: "triangle",
    // 	frequency: 220,
    // 	volume: -3
  	// });
  	// rainOsc = new Tone.PulseOscillator(50, 0.4);
  	rainOsc = new Tone.Noise("white");
  	rainOsc.toDestination();

 	// cloudOsc = new Tone.Oscillator({
    // 	type: "sawtooth",
    // 	frequency: 220,
    // 	volume: -3
  	// });
  	// cloudOsc.toDestination(); 	

  	wave = new Tone.Waveform();
  	Tone.Master.connect(wave);

  	Tone.Master.volume.value = masterVolume;
}

function makePatternHash(scaleIdx, postion, duration, timeOffset) {
	return {
		scaleIdx: scaleIdx, position: postion, duration: duration, timeOffset: timeOffset
	}
}

const AVAILABLE_PATTERNS = [
	[
		{scaleIdx: 0, position: 2, duration: "1n", timeOffset: 0},
	],
	[
		{scaleIdx: 0, position: 2, duration: "2n", timeOffset: 0},
		{scaleIdx: 2, position: 2, duration: "2n", timeOffset: 2},
	],
	[
		{scaleIdx: 0, position: 2, duration: "2n", timeOffset: 0},
		{scaleIdx: 2, position: 2, duration: "4n", timeOffset: 1},
		{scaleIdx: 4, position: 2, duration: "4n", timeOffset: 1},
		{scaleIdx: 3, position: 2, duration: "2n", timeOffset: 3},
		{scaleIdx: 4, position: 2, duration: "2n", timeOffset: 3},
	],
	[
		{scaleIdx: 0, position: 2, duration: "4n", timeOffset: 0},
		{scaleIdx: 2, position: 2, duration: "4n", timeOffset: 1},
		{scaleIdx: 4, position: 2, duration: "8n", timeOffset: 1},

		{scaleIdx: 1, position: 3, duration: "16n", timeOffset: 2},
		{scaleIdx: 1, position: 3, duration: "16n", timeOffset: 2.2},
		{scaleIdx: 1, position: 4, duration: "16n", timeOffset: 2.5},
		{scaleIdx: 1, position: 3, duration: "16n", timeOffset: 2.6},

		{scaleIdx: 3, position: 2, duration: "2n", timeOffset: 3},
		{scaleIdx: 4, position: 2, duration: "2n", timeOffset: 3},
	],
	[
		{scaleIdx: 3, position: 4, duration: "4n", timeOffset: 0},
		{scaleIdx: 3, position: 4, duration: "4n", timeOffset: 1},
		{scaleIdx: 3, position: 4, duration: "4n", timeOffset: 2},

		{scaleIdx: 3, position: 4, duration: "16n", timeOffset: 3},
		{scaleIdx: 4, position: 4, duration: "16n", timeOffset: 3.2},
		{scaleIdx: 1, position: 4, duration: "16n", timeOffset: 3.6},
		{scaleIdx: 1, position: 4, duration: "16n", timeOffset: 3.8},
	],
]

// should return an array of patterns that are arrays of notes/durations/offsets
function makeWeatherPatterns(temp, rain, wind, cloud) {
	console.log("temp = " + temp);
	let patterns = []
	
	let goodNotes = ["A", "C", "D", "E", "F", "G"];
	let badNotes = ["A#", "B", "C#", "D#", "F#", "G#"];
	
	let numCombos = 0;
	let key;
	let mode;
	let scale;
	
	
	if (temp <= 0) {
		mode = (rain <= 15 && cloud <= 25) ? "major" : "minor";
		key = (rain <= 50 || cloud <= 75) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
		numCombos = Math.floor(random(7, 10));
	} else if (temp <= 32) {
		mode = (rain <= 25 && cloud <= 50) ? "major" : "minor";
		key = (rain <= 25 || cloud <= 25) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
		numCombos = Math.floor(random(3, 8));
	} else {
		mode = (rain <= 10 && cloud <= 10) ? "major" : "minor";
		key = (rain <= 10 || cloud <= 10) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
		numCombos = Math.floor(random(2, 5));
	}

	scale = derivePentatonicScale(key, mode);

	let derivedPatterns = [];
	for (let i = 0; i < numCombos; i++) {
		let sequence = []
		let pattern = AVAILABLE_PATTERNS[Math.floor(Math.random() * AVAILABLE_PATTERNS.length)]
		for (const note of pattern) {
			let noteName = scale[note.scaleIdx] + note.position;
			let duration = note.duration;
			let timeOffset = note.timeOffset;
			sequence.push({
				note: noteName, duration: duration, timeOffset: timeOffset
			});
		}
		derivedPatterns.push(sequence);
	}

	return derivedPatterns;
}

function startStopTempSounds() {
	if (!ready) {
		let temp = tempValueElem.value;
		let tempOscFreq;
		let tempOscType;

		if (temp <= 0) {
			tempOscFreq = map(temp, -20, 0, 55, 110);
			tempOscType = "square"
		} else if (temp <= 45) {
			tempOscFreq = map(temp, 1, 45, 110, 220);
			tempOscType = "triangle"
		} else if (temp <= 90) {
			tempOscFreq = map(temp, 46, 90, 220, 330);
			tempOscType = "sine"
		} else {
			tempOscFreq = map(temp, 91, 120, 330, 440);
			tempOscType = "sawtooth"
		}
		// console.log(tempOscFreq);
		tempOsc.frequency.value = tempOscFreq;
		tempOsc.type = tempOscType;
		// tempOsc.start();

		const autoWah = new Tone.AutoWah(50, 6, -20).toDestination();
		const crusher = new Tone.BitCrusher(4).toDestination();
		const cheby = new Tone.Chebyshev(50).toDestination();
		const chorus = new Tone.Chorus(4, 2.5, 0.5).toDestination().start();
		const dist = new Tone.Distortion(0.8).toDestination();
		const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
		const freeverb = new Tone.Freeverb().toDestination();
		freeverb.dampening = 1000;
		const shift = new Tone.FrequencyShifter(42).toDestination();
		const reverb = new Tone.JCReverb(0.4).toDestination();
		const delay = new Tone.FeedbackDelay(0.5);
		const phaser = new Tone.Phaser({
		    frequency: 15,
		    octaves: 5,
		    baseFrequency: 1000
		}).toDestination();
		const pingPong = new Tone.PingPongDelay("4n", 0.2).toDestination();
		const tremolo = new Tone.Tremolo(9, 0.75).toDestination().start();

		// polySynth = new Tone.PolySynth(Tone.Synth).toDestination();
		// polySynth = new Tone.PolySynth(Tone.Synth).chain(delay, reverb);
		polySynth = new Tone.PolySynth(Tone.Synth).connect(autoWah);
		// polySynth.volume.value = -5;

		synthC = new Tone.FMSynth().toDestination();
		// synthC = new Tone.FMSynth().connect(autoWah);
		// synthC = new Tone.FMSynth().connect(crusher);
		// synthC = new Tone.FMSynth().connect(cheby);
		// synthC = new Tone.FMSynth().connect(chorus);
		// synthC = new Tone.FMSynth().connect(dist);
		// synthC = new Tone.FMSynth().connect(feedbackDelay);
		// synthC = new Tone.FMSynth().connect(freeverb);
		// synthC = new Tone.FMSynth().connect(shift);
		// synthC = new Tone.FMSynth().chain(delay, reverb);
		// synthC = new Tone.FMSynth().connect(phaser);
		// synthC = new Tone.FMSynth().connect(pingPong);
		// synthC = new Tone.FMSynth().connect(tremolo);
		// synthC.volume.value = -10;
		const now = Tone.now();

		let patterns = makeWeatherPatterns(temp, 0, 0, 0);
		let bpm = Math.floor(map(temp, -20, 120, minBPM, maxBPM));
		Tone.getTransport().bpm.value = bpm;

		let prevPattern;
		const loopA = new Tone.Loop((time) => {
			let pattern = patterns[Math.floor(random(0, patterns.length - 1))];
			while (prevPattern == pattern && random(0, 4) >= 1) {
				pattern = patterns[Math.floor(random(0, patterns.length - 1))];
			}
		    for (const note of pattern) {
		    	polySynth.triggerAttackRelease(note.note, note.duration, time + note.timeOffset);
		    }
		    prevPattern = pattern;
		}, "1m").start(0);
		//

		let s;
	    s = mixedSustains;
	    if (temp <= 32) {
        	s = longSustains;
	   	} else if (temp <= 85) {
			s = mixedSustains;
	  	} else {
			s = shortSustains;
	  	}

	  	// play a random pentatonic within the base loop
	  	// const loopC = new Tone.Loop((time) => {
	    // 	var note = scale[Math.floor(Math.random() * scale.length)];
	    // 	note = note + ["3", "4", "5"].at(Math.random() * 3);
	    // 	var length = s[Math.floor(Math.random() * s.length)];
	    // 	synthC.triggerAttackRelease(note, length, time);
	  	// }, "4n").start(Math.floor(Math.random() * 4));
	} else {
		// tempOsc.stop();
	}
}

function startStopWindNoise() {
	if (!ready) {
		let wind = windValueElem.value;
		if (wind > 0) {
	  		windOsc.frequency.value = map(wind, 0, 100, 110, 440);
	  		windOsc.volume.value = map(wind, 1, 100, -19, 0);
	  		windOsc.start();

			windLFOFreq = map(wind, 0, 100, 0.1, 0.5);
			windLFO = new Tone.LFO(windLFOFreq + "hz", windOsc.frequency.value - 10, windOsc.frequency.value + 10);
	  		windLFO.connect(windOsc.frequency);
	  		windLFO.start();
	  	}
	} else {
		windOsc.stop();
    	windLFO.disconnect();
    	windLFO.stop();
	}
}

function startStopRainNoise() {
	if (!ready) {
		let rain = rainValueElem.value;
		console.log("rain = " + rain);
		if (rain <= 33) {
  			rainOsc.type = "brown";
  			rainOsc.volume.value = map(rain, 0, 33, -25, -15);
  		} else if (rain <= 66) {
  			rainOsc.type = "pink";
  			rainOsc.volume.value = map(rain, 34, 66, -14, -9);
  		} else {
  			rainOsc.type = "white";
  			rainOsc.volume.value = map(rain, 67, 100, -8, -3);
  		}
  		if (rain > 0) {
			rainOsc.start();
		}
	} else {
		rainOsc.stop();
	}
}

function handlePlay() {
	if (!ready) {
	  	startStopTempSounds();
	  	startStopWindNoise();
		startStopRainNoise();

    	ready = true;

    	// all loops start when the Transport is started
  		Tone.getTransport().start();
  	}
  	else {
    	ready = false;
    	Tone.getTransport().cancel();
  	}
	
}


//
// function noiseMaker() {
// 	// initialize the noise and start
// 	const noise = new Tone.Noise("pink").start();
// 	// make an autofilter to shape the noise
// 	const autoFilter = new Tone.AutoFilter({
// 	    frequency: "4n",
// 	    baseFrequency: 200,
// 	    octaves: 4
// 	}).toDestination().start();
// 	// connect the noise
// 	noise.connect(autoFilter);
// 	// start the autofilter LFO
// 	autoFilter.start();
// }
// //


function derivePentatonicScale(rootNote, mode) {
  let keyNotes = [];
  let i = notes.indexOf(rootNote);
  
  if (i == 0) {
    keyNotes = notes;
  } else if (i == notes.length - 1) {
    keyNotes.push(notes[i]);
    keyNotes.push(...notes.slice(0, i));
  } else {
    keyNotes.push(...notes.slice(i, notes.length));
    keyNotes.push(...notes.slice(0, i));
  }

  let pentaindices = (mode == "major" ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]);
  let theScale = [];
  for (const idx of pentaindices) {
    theScale.push(keyNotes[idx]);
  }
  
  return theScale;
}


// ---------------------------------------------

function draw() {
	background(0);

	if (ready) {
		stroke(255);
	    let buffer = wave.getValue(0);

	    // look a trigger point where the samples are going from
	    // negative to positive
	    let start = 0;
	    for (let i = 1; i < buffer.length; i++) {
	      	if (buffer[i - 1] < 0 && buffer[i] >= 0) {
	        	start = i;
	        	break; // interrupts a for loop
	      	}
	    }

	    // calculate a new end point such that we always
	    // draw the same number of samples in each frame
	    let end = start + buffer.length / 2;

	    // drawing the waveform
	    for (let i = start; i < end; i++) {
	      	let x1 = map(i - 1, start, end, 0, width);
	      	let y1 = map(buffer[i - 1], -1, 1, 0, height);
	      	let x2 = map(i, start, end, 0, width);
	      	let y2 = map(buffer[i], -1, 1, 0, height);
	      	line(x1, y1, x2, y2);
	    }
	} else {
		fill(255);
    	noStroke();
	}
}
