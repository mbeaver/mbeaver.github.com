function playNote() {
  // create a synth
  const synth = new Tone.Synth().toDestination();
  // play a note from that synth
  // synth.triggerAttackRelease("C4", "8n");
  const now = Tone.now();
  synth.triggerAttackRelease("C4", "8n", now);
  synth.triggerAttackRelease("E4", "4n", now + 0.5);
  synth.triggerAttackRelease("G4", "2n", now + 1);
}

function pleasantHum() {
  // create two monophonic synths
  const synthA = new Tone.FMSynth().toDestination();
  const synthB = new Tone.AMSynth().toDestination();
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
  // create two monophonic synths
  const synthA = new Tone.FMSynth().toDestination();
  const synthB = new Tone.AMSynth().toDestination();
  // const synthC = new Tone.NoiseSynth().toDestination();
  const synthC = new Tone.FMSynth().toDestination();
  
  // play a note every quarter-note
  const loopA = new Tone.Loop((time) => {
    synthA.triggerAttackRelease("C2", "8n", time);
  }, "4n").start(0);
  
  // play another note every off quarter-note, by starting it "8n"
  const loopB = new Tone.Loop((time) => {
    synthB.triggerAttackRelease("C4", "8n", time);
  }, "4n").start("8n");

  const pentatonic = ["A3", "C3", "A4", "C4", "D4", "E4", "G4"];
  const sustains = ["1n", "2n", "4n", "8n", "16n"]
  // play a random pentatonic within the oscillating drone
  const loopC = new Tone.Loop((time) => {
    var note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
    var length = sustains[Math.floor(Math.random() * sustains.length)];
    synthC.triggerAttackRelease(note, length, time);
  }, "4n").start(0);

  // all loops start when the Transport is started
  Tone.getTransport().start();
}

