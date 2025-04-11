let masterVolume = -9; // in decibel.

let tempValueElem;
let windValueElem;
let rainValueElem;
// let cloudValueElem;
let playBtn;

let tempOsc;
// let windOsc;
let rainOsc;
// let cloudOsc;

let windLFO;

let wave;
let waveCanvas;

let ready = false;

function setup() {
	playBtn = document.getElementById("play");
	playBtn.addEventListener("click", handlePlay);

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

  	// windOsc = new Tone.Oscillator({
    // 	type: "square",
    // 	frequency: 220,
    // 	volume: -3
  	// });
  	// windOsc.toDestination();

  	// windLFO = new Tone.LFO("0.1hz", 210, 230);
  	// windLFO.connect(windOsc.frequency);

  	rainOsc = new Tone.Oscillator({
    	type: "triangle",
    	frequency: 220,
    	volume: -3
  	});
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

function handlePlay() {
	if (!ready) {
		if (waveCanvas == null) {
			waveCanvas = createCanvas(800, 200);
  			waveCanvas.parent("canvas");
  		}
		
		let temp = tempValueElem.value;
		let wind = windValueElem.value;
		let rain = rainValueElem.value;
		// let cloud = cloudValueElem.value;

		let tempOscFreq;
		if (temp <= 50) {
			tempOscFreq = map(rain, 0, 100, 110, 440);
		} else if (temp <= 72) {
			tempOscFreq = map(rain, 0, 100, 330, 550);
		} else if (temp <= 95) {
			tempOscFreq = map(rain, 0, 100, 440, 770);
		} else {
			tempOscFreq = map(rain, 0, 100, 660, 880);
		}
		console.log(tempOscFreq);
		tempOsc.frequency.value = tempOscFreq;
		tempOsc.start();

		windLFOFreq = map(wind, 0, 100, 0.1, 0.8);
		windLFO = new Tone.LFO(windLFOFreq + "hz", tempOscFreq - 10, tempOscFreq + 10);
  		windLFO.connect(tempOsc.frequency);
  		windLFO.start();

		rainOsc.frequency.value = map(rain, 0, 100, 110, 880);
		rainOsc.start();

		// cloudOsc.frequency.value = map(cloud, 0, 100, 110, 880);
		// cloudOsc.start();

    	ready = true;
  	}
  	else {
    	ready = false;
    	tempOsc.stop();
    	// windOsc.stop();
    	windLFO.disconnect();
    	windLFO.stop();
    	rainOsc.stop();
    	// cloudOsc.stop();
  	}
	
}

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
