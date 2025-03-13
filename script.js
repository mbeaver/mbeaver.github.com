let synthA;
let synthB;
// const synthC = new Tone.NoiseSynth().toDestination();
let synthC;

let loopA;
let loopB;
let loopC;

let minBPM = 50;
let defaultBPM = 72;
let maxBPM = 148;
let initialized = false;
let isPlaying = false;
function handlePlay() {
  if (!initialized) {
    synthA = new Tone.FMSynth().toDestination();
    synthB = new Tone.AMSynth().toDestination();
    synthC = new Tone.FMSynth().toDestination();
  }

  if (isPlaying) {
    Tone.getTransport().cancel();
    if (loopA) {loopA.stop(); loopA.dispose();}
    if (loopB) {loopB.stop(); loopB.dispose();}
    if (loopC) {loopC.stop(); loopC.dispose();}
    document.getElementById("play").innerHTML = "play something else";
  } else {
    document.getElementById("play").innerHTML = "my ears are bleeding please stop";
    Tone.getTransport().bpm.value = defaultBPM;
    Math.floor(Math.random() * 2) > 0 ? playRandom() : pleasantHum();
  }
  isPlaying = !isPlaying;
}

function playNote() {
  // create a synth
  const synth = new Tone.Synth().toDestination();
  // play a note from that synth
  const now = Tone.now();
  synth.triggerAttackRelease("C4", "8n", now);
  synth.triggerAttackRelease("E4", "4n", now + 0.5);
  synth.triggerAttackRelease("G4", "2n", now + 1);
}

function pleasantHum() {
  //play a note every quarter-note
  const loopA = new Tone.Loop((time) => {
    synthA.triggerAttackRelease("C2", "8n", time);
  }, "4n").start(0);
  //play another note every off quarter-note, by starting it "8n"
  const loopB = new Tone.Loop((time) => {
    synthB.triggerAttackRelease("C4", "8n", time);
  }, "4n").start("8n");
  // all loops start when the Transport is started
  Tone.getTransport().start();
  // ramp up to 800 bpm over 10 seconds
  Tone.getTransport().bpm.rampTo(800, 10);
}

function playRandom() {
  Tone.getTransport().bpm.value = Math.floor(Math.random() * (maxBPM - minBPM + 1)) + minBPM;

  // play a note every quarter-note
  const loopA = new Tone.Loop((time) => {
    synthA.triggerAttackRelease("C2", "8n", time);
  }, "4n").start(0);
  
  // play another note every off quarter-note, by starting it "8n"
  const loopB = new Tone.Loop((time) => {
    synthB.triggerAttackRelease("C4", "8n", time);
  }, "4n").start("8n");

  const majorPentatonic = ["A3", "C3", "A4", "C4", "D4", "E4", "G4"];
  const minorPentatonic = ["C4", "Eb4", "F4", "G4", "Bb5"];
  // const sustains = ["1n", "2n", "4n", "8n", "16n"];
  const longSustains = ["1n", "2n"];
  const mixedSustains = ["1n", "2n", "4n", "8n", "16n", "32n"];
  const shortSustains = ["4n", "16n", "32n"];

  var p = Math.floor(Math.random() * 2) > 0 ? majorPentatonic : minorPentatonic;
  let s;
  switch (Math.floor(Math.random() * 3)) {
    case 0: s = longSustains; break;
    case 1: s = mixedSustains; break;
    default: s = shortSustains;
  }
  
  // play a random pentatonic within the oscillating drone
  const loopC = new Tone.Loop((time) => {
    var note = p[Math.floor(Math.random() * p.length)];
    var length = s[Math.floor(Math.random() * s.length)];
    // sustains[Math.floor(Math.random() * sustains.length)];
    synthC.triggerAttackRelease(note, length, time);
  }, "4n").start(0);

  // all loops start when the Transport is started
  Tone.getTransport().start();
}
