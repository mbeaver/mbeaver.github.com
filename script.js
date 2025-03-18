let synthA;
let synthB;
// const synthC = new Tone.NoiseSynth().toDestination();
let synthC;

let loopA;
let loopB;
let loopC;

const minBPM = 50;
const defaultBPM = 72;
const maxBPM = 148;
let initialized = false;
let isPlaying = false;

const notes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

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
    document.getElementById("play").innerHTML = "🔃 🤖 🎶 🔊";
    document.getElementById("play").setAttribute("title", "ok i miss it play something else");
  } else {
    document.getElementById("play").innerHTML = "🙉 🦻 🩸 🙏 🛑 🔇";
    document.getElementById("play").setAttribute("title", "ouch my ears are bleeding please stop");
    Tone.getTransport().bpm.value = defaultBPM;
    // Math.floor(Math.random() * 2) > 0 ? playRandom() : pleasantHum();
    playRandom();
  }
  isPlaying = !isPlaying;
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

function derivePentatonicScale(rootNote, mode) {
  // const notes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
  var newArray = [];
  var i = notes.indexOf(rootNote);
  if (i == 0) {
    newArray = notes;
  } else if (i == notes.length - 1) {
    newArray = newArray.concat(notes[i]);
    newArray = newArray.concat(notes.slice(0, i));
  } else {
    newArray = newArray.concat(notes.slice(i, notes.length));
    newArray = newArray.concat(notes.slice(0, i));
  }

  if (mode == "minor") {
    newArray = [newArray[0], newArray[3], newArray[5], newArray[7], newArray[10]];
  } else {
    newArray = [newArray[0], newArray[2], newArray[4], newArray[7], newArray[9]]
  }
  return newArray;
}

function playRandom() {
  Tone.getTransport().bpm.value = Math.floor(Math.random() * (maxBPM - minBPM + 1)) + minBPM;

  const longSustains = ["1n", "2n"];
  const mixedSustains = ["1n", "2n", "4n", "8n", "16n", "32n"];
  const shortSustains = ["4n", "16n", "32n"];

  // var p = pentatonics[Math.floor(Math.random() * pentatonics.length)]
  var rootNote = notes[Math.floor(Math.random() * notes.length)];
  var intervals = derivePentatonicScale(rootNote, "major");

  let s;
  switch (Math.floor(Math.random() * 3)) {
    case 0: s = longSustains; break;
    case 1: s = mixedSustains; break;
    default: s = shortSustains;
  }

  let drone1 = rootNote + "4";
  let drone2 = rootNote + "5";

  // play a note every quarter-note
  const loopA = new Tone.Loop((time) => {
    synthA.triggerAttackRelease(drone1, "8n", time);
  }, "4n").start(0);
  
  // play another note every off quarter-note, by starting it "8n"
  const loopB = new Tone.Loop((time) => {
    synthB.triggerAttackRelease(drone2, "8n", time);
  }, "4n").start("8n");
  
  // play a random pentatonic within the oscillating drone
  const loopC = new Tone.Loop((time) => {
    var note = intervals[Math.floor(Math.random() * intervals.length)];
    note = note + ["3", "4", "5"].at(Math.random() * 3);
    var length = s[Math.floor(Math.random() * s.length)];
    synthC.triggerAttackRelease(note, length, time);
  }, "4n").start(Math.floor(Math.random() * 4));

  // all loops start when the Transport is started
  Tone.getTransport().start();
}
