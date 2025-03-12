import { Sampler } from "tone";

const sampler = new Sampler(
  {
    A1: "A1.mp3"
  },
  {
    onload: () => {
      document.querySelector("button").removeAttribute("disabled");
    }
  }
).toDestination();

document.querySelector("button").addEventListener("click", () => {
  sampler.triggerAttack("A2");
});
