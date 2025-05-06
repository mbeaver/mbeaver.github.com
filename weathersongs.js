let masterVolume = -10; // in decibel.

let playBtn;

let periodForDisplay;
let tempForDisplay;
let keyModeForDisplay;
let windForDisplay;
let rainForDisplay;
let cloudForDisplay;

let minBPM = 72;
let maxBPM = 144;
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
const longSustains = ["1n", "2n", "4n"];
const mixedSustains = ["2n", "4n", "8n", "16n"];
const shortSustains = ["8n", "16n", "32n"];

const MIN_TEMP = -20;
const MAX_TEMP = 120;

let ready = false;

function setup() {
	fetchWeatherFeed();

	playBtn = document.getElementById("play");
	playBtn.addEventListener("click", handlePlay);

	var parent = document.getElementById("canvas");
	waveCanvas = createCanvas(parent.clientWidth, 600);
	waveCanvas.parent("canvas");

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

let weather_feed;
async function fetchWeatherFeed() {
	const url = "https://api.open-meteo.com/v1/forecast?latitude=35.7721&longitude=-78.6386&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch";
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const json = await response.json();
		weather_feed = json;
	} catch (error) {
		console.log(error.message);
	}
}


let weather_feedOLD = {
	// "temperature_2m": [57.7, 53.1, 50.2, 48, 47.2, 48.1, 50.5, 50.6, 50.7, 50.6, 49.8, 50.3, 51.6, 56.4, 60.1, 64.3, 69.7, 72.5, 75.8, 76.7, 77.3, 77.3, 76.4, 72.6, 68.5, 66.3, 65, 64.1, 63.8, 63.2, 62.4, 61.4, 60.9, 60.3, 59.6, 58.9, 60, 63.6, 66.3, 69.5, 72.8, 75.1, 76.5, 77.7, 78.3, 77.7, 76.6, 74, 70.5, 68.3, 67, 65.9, 64.9, 64.1, 63, 62.6, 61, 59.6, 59.4, 58.9, 60.3, 63.5, 66.8, 69.5, 72.4, 75.3, 76, 72.8, 74.2, 73.7, 72.6, 70.1, 67.2, 66.1, 65.1, 64.3, 64, 63.3, 62.9, 62.7, 62.7, 62.5, 62.7, 63.6, 64.7, 67.2, 70.1, 73.3, 75.7, 76.8, 75.9, 74.8, 75.1, 74.8, 73.3, 70.3, 69.2, 68.8, 66.9, 66, 64.7, 64, 62.7, 61.5, 59.5, 58.4, 57.5, 56.6, 54.1, 53, 52.3, 51.7, 51.2, 51.7, 51.2, 51, 52.1, 54.1, 52.1, 51.4, 49.6, 48.5, 47.4, 46.5, 45.6, 44.9, 44.5, 44, 43.5, 43.5, 43.3, 43.3, 43.8, 46.3, 49.7, 53, 56, 58.8, 61.1, 63, 64.4, 64.9, 64, 62.1, 60.4, 59, 57.8, 56.8, 56.2, 55.9, 55.7, 55.4, 55.3, 55.3, 55.9, 56.8, 58, 59.7, 61.6, 64.2, 68.1, 72.6, 75.7, 76.2, 75.3, 74.2, 73.5, 72.6],
	"temperature_2m":[77.6,75.8,73.3,73.0,70.0,69.7,68.4,67.0,66.5,65.2,63.5,63.1,64.9,67.7,70.8,74.0,77.3,78.7,80.5,81.2,82.3,82.7,81.8,79.7,76.1,73.1,71.3,70.2,68.5,67.4,66.6,66.4,65.9,65.1,64.4,63.9,66.9,70.4,74.4,77.9,80.7,81.0,70.4,70.4,71.2,69.2,69.5,69.1,68.0,67.2,66.5,65.3,64.6,64.0,64.6,65.0,64.7,64.0,63.5,63.8,65.5,67.9,70.9,72.8,74.0,74.3,76.9,77.8,76.6,75.3,72.1,70.8,70.1,69.4,66.9,64.7,63.1,61.8,60.6,59.5,58.6,57.9,57.3,57.0,59.3,62.4,66.3,70.1,73.5,75.1,76.6,78.4,78.9,78.7,78.0,76.0,71.9,69.2,67.8,66.7,65.4,64.3,63.8,63.8,64.2,64.2,63.3,63.1,64.7,64.7,65.6,65.4,67.4,69.0,71.5,77.7,79.6,76.6,74.6,72.4,69.4,67.8,66.9,66.7,66.0,65.1,64.5,64.2,63.8,63.4,63.1,63.1,64.9,68.2,72.7,76.8,80.4,83.4,84.5,82.2,77.8,73.9,71.4,69.3,67.9,67.5,67.7,67.6,66.8,65.7,64.7,63.7,62.8,62.2,61.9,61.9,62.4,63.5,65.2,67.0,69.3,71.6,73.2,73.5,73.1,71.9,69.9,67.3],
	"relative_humidity_2m": [33, 42, 46, 52, 52, 54, 45, 53, 62, 60, 66, 68, 70, 60, 58, 50, 40, 36, 31, 34, 26, 28, 30, 37, 44, 49, 64, 71, 78, 80, 80, 84, 87, 88, 88, 90, 89, 82, 75, 65, 55, 50, 46, 43, 41, 40, 40, 44, 49, 55, 61, 65, 69, 71, 75, 78, 81, 86, 88, 90, 90, 83, 77, 70, 63, 54, 51, 59, 53, 55, 57, 64, 75, 81, 86, 87, 84, 84, 85, 87, 90, 94, 96, 95, 92, 85, 77, 68, 63, 63, 67, 70, 69, 69, 71, 80, 82, 80, 87, 90, 92, 92, 88, 82, 80, 78, 77, 79, 76, 73, 70, 69, 69, 65, 60, 55, 49, 43, 46, 48, 51, 52, 54, 56, 58, 58, 59, 61, 62, 61, 61, 63, 65, 62, 56, 51, 46, 41, 38, 37, 38, 40, 44, 50, 56, 63, 71, 77, 81, 84, 86, 88, 90, 91, 91, 89, 88, 87, 86, 84, 78, 70, 65, 65, 69, 72, 74, 77],
	"dew_point_2m": [28.8, 30.6, 30.2, 31.2, 30.5, 32.3, 29.9, 34.1, 38.2, 37.3, 38.9, 40.1, 42.2, 42.7, 45.3, 45.3, 44.3, 44, 43.1, 46.3, 39.7, 41.7, 42.7, 44.8, 45.7, 46.6, 52.6, 54.5, 56.8, 56.9, 56.2, 56.6, 57, 56.7, 56, 56, 56.8, 58, 58.1, 57.3, 55.7, 55.2, 54.2, 53.5, 52.7, 51.5, 50.5, 50.8, 50.5, 51.5, 53.1, 53.9, 54.5, 54.6, 54.9, 55.7, 55.1, 55.5, 55.8, 56, 57.3, 58.3, 59.4, 59.2, 59.1, 57.5, 56.6, 57.6, 56, 56.5, 56.5, 57.4, 59, 60.1, 60.8, 60.4, 59.1, 58.3, 58.3, 58.8, 59.7, 60.8, 61.6, 62.2, 62.3, 62.6, 62.6, 62.1, 62.2, 63.2, 64.1, 64.3, 64.3, 63.9, 63.4, 63.8, 63.5, 62.4, 62.9, 62.9, 62.3, 61.6, 59.1, 55.9, 53.3, 51.6, 50.4, 50.2, 46.7, 44.6, 42.8, 41.9, 41.4, 40.4, 37.8, 35.4, 33.5, 32.1, 31.9, 32.3, 32.2, 31.7, 31.6, 31.7, 31.7, 31, 31.1, 31.4, 31.3, 30.9, 30.7, 31.5, 32.8, 33.9, 34.6, 35.4, 35.5, 35.1, 35.3, 36.3, 38.3, 40, 41.6, 43.2, 44.6, 46.5, 48.4, 49.7, 50.5, 51.1, 51.6, 51.9, 52.4, 52.8, 53.3, 53.6, 54.5, 55.8, 57.3, 59.2, 61, 62.3, 63.1, 63.6, 64.5, 64.6, 64.7, 65],
	// "precipitation_probability": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 25, 25, 25, 25, 25, 25, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 38, 38, 38, 38, 38, 38, 78, 78, 78, 78, 78, 78, 87, 87, 87, 87, 87, 87, 28, 28, 28, 28, 28, 28, 8, 8, 8, 8, 8, 8, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 7, 7, 14, 14, 14, 14, 14, 14, 20, 20, 20, 20, 20, 20, 18, 18, 18, 18, 18, 18, 17, 17, 17, 17, 17, 17, 13, 13, 13, 13, 13, 13, 21, 21, 21, 21, 21],
	"precipitation_probability":[2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,3,4,6,6,7,8,9,9,15,19,10,7,8,7,16,14,24,15,58,58,58,58,58,58,55,55,55,55,55,55,69,69,69,69,69,69,36,36,36,36,36,36,31,31,31,31,31,31,27,27,27,27,27,27,45,45,45,45,45,45,24,24,24,24,24,24,17,17,17,17,17,17,21,21,21,21,21,21,49,49,49,49,49,49,23,23,23,23,23,23,12,12,12,12,12,12,30,30,30,30,30,30,64,64,64,64,64,64,42,42,42,42,42,42,10,10,10,10,10,10,9,9,9,9,9,9,12,12,12,12,12],
	"precipitation": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.004, 0.012, 0.024, 0.028, 0.008, 0.004, 0.012, 0.063, 0.11, 0.055, 0.02, 0.008, 0.028, 0.008, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	"cloud_cover": [0, 0, 0, 0, 1, 0, 0, 0, 0, 6, 73, 87, 25, 95, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 99, 22, 100, 100, 35, 58, 100, 100, 100, 100, 100, 100, 100, 99, 100, 100, 100, 57, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 95, 10, 10, 65, 16, 63, 77, 62, 31, 100, 89, 70, 100, 100, 100, 100, 100, 100, 86, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 77, 100, 100, 19, 0, 0, 0, 0, 11, 100, 67, 20, 100, 100, 100, 100, 100, 100, 100, 99, 98, 97, 96, 96, 95, 97, 98, 100, 100, 100, 100, 100, 100, 100, 92, 83, 75, 82, 89, 96, 88, 79, 71, 81, 90, 100, 100, 100, 100, 100, 99],
	"visibility": [193241.469, 151902.891, 137467.188, 118766.406, 117454.07, 113845.148, 143044.625, 116797.898, 91535.438, 97112.859, 82677.164, 79396.328, 76771.656, 99081.367, 105643.047, 126312.336, 161417.328, 176509.188, 203412.078, 185039.375, 225393.703, 215223.094, 208989.5, 174540.688, 144356.953, 127624.672, 87270.344, 73162.727, 61023.621, 59055.117, 58070.867, 53149.605, 49212.598, 47572.18, 47572.18, 45931.758, 47572.18, 57086.613, 69881.891, 86286.094, 106955.383, 120078.742, 135826.766, 146325.453, 152887.141, 159448.812, 161089.234, 144028.875, 129265.094, 108267.719, 94160.109, 85629.922, 77427.82, 72506.562, 66601.047, 62335.957, 56758.531, 50853.02, 47900.262, 45931.758, 46587.926, 55774.277, 63648.293, 74803.148, 87270.344, 110564.305, 118766.406, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 55052.492, 79199.477, 69619.422, 33202.102, 28018.373, 64895.012, 79199.477, 38451.445, 13845.145, 17060.367, 70997.375, 79199.477, 79199.477, 48293.965, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477, 79199.477],
	"wind_speed_10m": [1.1, 0.2, 1.9, 0.8, 2.2, 2.9, 6.9, 7.7, 6.3, 2.7, 3, 1.5, 1.1, 5.3, 7.7, 10.5, 10.4, 11.1, 10.8, 11, 13.9, 13.4, 13, 9.7, 7.7, 8.8, 11.8, 10.9, 10.8, 10.4, 11.7, 9.9, 9.6, 9.9, 9.7, 8.1, 9.1, 11.6, 13.2, 13.9, 13.5, 13.3, 12.9, 12.9, 12.7, 13.4, 11.5, 7.7, 5.6, 9.8, 11.5, 11, 10.3, 10.1, 8.4, 7.2, 5.7, 3.7, 3.4, 2.9, 4.1, 8.8, 10.6, 11.4, 12.5, 12.5, 12, 10.9, 13.8, 13, 11.7, 11.2, 9, 9.7, 9, 9.4, 10.1, 10.8, 10.6, 10, 10.4, 9.9, 10.9, 11.9, 12.7, 13.7, 15.3, 15.7, 15.9, 16, 15.1, 14.3, 13, 13.3, 14, 13, 11.9, 11.2, 11.3, 10.3, 9.7, 10.2, 9.4, 9.4, 10.6, 10.3, 11.4, 10.4, 10.8, 10.3, 10.3, 11, 10.6, 10, 8.9, 9.2, 9.8, 9, 7.8, 7.8, 6.5, 7, 6.5, 6.9, 6.8, 6.5, 6.5, 6.1, 6.7, 6.8, 7.2, 6.6, 7.1, 7.7, 8.3, 8.8, 8.7, 8.7, 8.7, 8.7, 8.6, 8.1, 7, 5.6, 4.8, 5.7, 7.3, 8.2, 8.3, 8.1, 7.7, 6.9, 5.9, 5.8, 7, 8.7, 9.9, 9.8, 9.4, 9.7, 11.6, 14.1, 15.8, 15.8, 14.9, 13.9, 12.6, 11.1],
	"wind_direction_10m": [191, 270, 225, 34, 180, 219, 201, 197, 203, 235, 197, 207, 281, 208, 202, 200, 208, 199, 202, 201, 204, 206, 202, 199, 197, 186, 191, 194, 201, 205, 209, 213, 211, 211, 214, 219, 216, 220, 222, 224, 220, 213, 206, 197, 198, 198, 193, 188, 185, 169, 173, 180, 185, 186, 188, 194, 191, 194, 184, 203, 186, 189, 193, 196, 198, 199, 198, 206, 203, 201, 193, 192, 186, 173, 176, 176, 184, 184, 195, 197, 194, 193, 194, 196, 197, 198, 207, 210, 209, 208, 209, 211, 209, 205, 207, 212, 226, 237, 243, 250, 257, 289, 308, 308, 318, 333, 344, 351, 34, 22, 22, 20, 28, 29, 28, 26, 37, 48, 41, 49, 52, 63, 68, 75, 82, 94, 84, 80, 70, 73, 76, 80, 77, 83, 90, 96, 103, 113, 119, 125, 131, 134, 132, 127, 124, 129, 135, 139, 144, 148, 154, 161, 171, 178, 174, 167, 166, 169, 177, 185, 191, 195, 196, 193, 189, 186, 185, 188],
	"wind_gusts_10m": [2.2, 3.1, 8.7, 5.1, 9.2, 12.1, 16.6, 17.2, 13.6, 14.1, 13.2, 8.7, 9.8, 14.5, 19, 20.6, 19.2, 16.8, 15.7, 16.6, 20.4, 20.6, 21.9, 21.3, 15.9, 17.9, 21, 22.8, 22.4, 22.1, 23.7, 17.7, 20.1, 20.4, 17, 15.9, 19.2, 30.9, 27.3, 23, 20.6, 19.2, 18.3, 18.3, 18.6, 20.1, 19, 17.4, 11.6, 22.1, 29.5, 29.1, 28.9, 28.9, 21.9, 19.9, 14.5, 12.1, 11.4, 11.4, 12.5, 22.8, 21.5, 19.5, 18.8, 18.3, 17, 18.6, 17.4, 17, 16.8, 18.3, 21.3, 23.7, 24.4, 26.2, 29.8, 31.1, 31.8, 32, 32.7, 32.7, 33.1, 32, 32.4, 33.1, 31.5, 28.9, 26.6, 26.6, 26.4, 26.2, 23.9, 26.2, 28.4, 28.2, 27.3, 29.5, 28, 28, 25.7, 21.3, 21.5, 21.9, 24.6, 24.2, 22.4, 21.7, 15.4, 16.6, 15.7, 15.7, 15.2, 13.4, 11.2, 12.1, 11.6, 9.8, 9.4, 10.3, 11.2, 13.4, 13.4, 14.8, 16.6, 16.3, 16.8, 16.3, 18.6, 18.6, 18.6, 17.4, 17.7, 15.9, 13.4, 11.6, 11, 10.7, 10.7, 11, 11.2, 11.4, 10.7, 9.8, 10.7, 14.8, 20.6, 24.6, 25.5, 24.8, 24.6, 25.5, 26.6, 27.7, 29.1, 30.4, 31.1, 30.9, 30, 28.9, 27.5, 25.7, 24.8, 24.8, 25.7, 26.4, 26.8, 27.5]
};

/*
	1 measure = 4 hours of audible weather data, 6 measures per day, 42 measures for a week.
*/
function play7dayForecast() {
	let temperature_series = weather_feed["hourly"]["temperature_2m"];
	let minTemperature = Math.round(Math.min(...temperature_series));
	let maxTemperature = Math.round(Math.max(...temperature_series));

	let precipitation_series = weather_feed["hourly"]["precipitation_probability"];

	let wind_series = weather_feed["hourly"]["wind_speed_10m"];
	let minWind = Math.round(Math.min(...wind_series));
	let maxWind = Math.round(Math.max(...wind_series));

	let wind_gusts_series = weather_feed["hourly"]["wind_gusts_10m"];

// improve this
	let keyIdx = Math.round(map((minTemperature + maxTemperature)/2, MIN_TEMP, MAX_TEMP, 0, notes.length - 1));
	let key = notes[keyIdx];
	let keyFourth = fourthForKey(key);
	let keyFifth = fifthForKey(key);

	let dew_point_series = weather_feed["hourly"]["dew_point_2m"];
	let cloud_cover_series = weather_feed["hourly"]["cloud_cover"];

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

	// const droneSynth = new Tone.PolySynth(Tone.Synth).chain(chorus, reverb);
	const droneSynth = new Tone.PolySynth(Tone.DuoSynth).toDestination();
	droneSynth.vibratoAmount = 0.5;
	droneSynth.vibratoRate = 5;
	droneSynth.portamento = 0.1;
	droneSynth.harmonicity = 1.005;
	// 	// volume: 5,
	droneSynth.blueprint.voice0.oscillator.type = "sawtooth";
	// 		},
	// 		filter: {
	// 			Q: 1,
	// 			type: "lowpass",
	// 			rolloff: -24
	// 		},
	// 		envelope: {
	// 			attack: 0.01,
	// 			decay: 0.25,
	// 			sustain: 0.4,
	// 			release: 1.2
	// 		},
	// 		filterEnvelope: {
	// 			attack: 0.001,
	// 			decay: 0.05,
	// 			sustain: 0.3,
	// 			release: 2,
	// 			baseFrequency: 100,
	// 			octaves: 4
	// 		}
	// 	},
	// 	voice1: {
	// 		oscillator: {
	// 			type: "sawtooth"
	// 		},
	// 		filter: {
	// 			Q: 2,
	// 			type: "bandpass",
	// 			rolloff: -12
	// 		},
	// 		envelope: {
	// 			attack: 0.25,
	// 			decay: 4,
	// 			sustain: 0.1,
	// 			release: 0.8
	// 		},
	// 		filterEnvelope: {
	// 			attack: 0.05,
	// 			decay: 0.05,
	// 			sustain: 0.7,
	// 			release: 2,
	// 			baseFrequency: 5000,
	// 			octaves: -1.5
	// 		}
	// 	}
	// })).toDestination();


	// const bounceSynth = new Tone.PolySynth(Tone.Synth).chain(crusher, shift, phaser, pingPong, tremolo);
	const bounceSynth = new Tone.PolySynth(Tone.Synth).chain(autoWah);
	// bounceSynth.volume.value = masterVolume + 3;

	let loopCount = 0;
	let prevAvgTemp;
	let prevAvgWind;
	let prevAvgPrecip;
	let prevAvgDew;
	let prevAvgCloud;
	const loopA = new Tone.Loop((time) => {
		if (loopCount + 4 >= 168) {
			loopCount = 0;
		}
		let periodTemps = temperature_series.slice(loopCount, loopCount + 4);
		let periodAvgTemp = Math.ceil((periodTemps.reduce((partialSum, a) => partialSum + a, 0))/4);
		let periodMinTemp = Math.round(Math.min(...periodTemps));
		let periodMaxTemp = Math.round(Math.max(...periodTemps));

// the winds this period control the bpm
		let periodWinds = wind_series.slice(loopCount, loopCount + 4);[loopCount, loopCount + 4];
		let periodAvgWind = Math.ceil((periodWinds.reduce((partialSum, a) => partialSum + a, 0))/4);

		let bpm = Math.floor(map(periodAvgWind, 0, 100, minBPM, maxBPM));
		Tone.getTransport().bpm.rampTo(bpm, 0.1);

// the precips this period control the mode
		let periodPrecips = precipitation_series.slice(loopCount, loopCount + 4);
		let periodAvgPrecip = Math.ceil((periodPrecips.reduce((partialSum, a) => partialSum + a, 0))/4);
		let mode = periodAvgPrecip >= 42 ? "minor" : "major";

// the dewpoints this period control the quality value of the autowah (0 is passthrough, 100 is full signal)
		let periodDews = dew_point_series.slice(loopCount, loopCount + 4);
		let periodAvgDew = Math.ceil((periodDews.reduce((partialSum, a) => partialSum + a, 0))/4);
		autoWah.Q.value = map(periodAvgDew, 0, 100, 0, 1);

// the clouds this period control the decay of the reverb
		let periodClouds = cloud_cover_series.slice(loopCount, loopCount + 4);
		let periodAvgCloud = Math.ceil((periodClouds.reduce((partialSum, a) => partialSum + a, 0))/4);
		reverb.set("decay", map(periodAvgCloud, 0, 100, 0, 1));

// the avg temp within the min/max of this period mapped 0->4
// this could control melodic variance?
// currently it's controlling movement between 4th/5th but maybe that could be controlled by comparisons to previous period?
		let periodTempDiff = Math.round(map(periodAvgTemp, periodMinTemp, periodMaxTemp, 0, 4));
		// let positionMap = map(periodAvgTemp, minTemperature, maxTemperature, 0, 4);
	    let currentRoot = key;
	    if (periodTempDiff >= 2.5) {
	    	currentRoot = periodTempDiff <= 3.15 ? keyFourth : keyFifth;
	    }
		
		// console.log("periodAvgTemp = " + periodAvgTemp + ", periodAvgWind = " + periodAvgWind + ", currentRoot = " + currentRoot + ", mode = " + mode + ", bpm = " + bpm + ", loopCount = " + loopCount);

		let periodGusts = wind_gusts_series.slice(loopCount, loopCount + 4);
		let periodAvgGusts = Math.ceil((periodGusts.reduce((partialSum, a) => partialSum + a, 0))/4);
		let gustFactor = map(periodAvgGusts, 0, 50, 0, 4);

		let scale = derivePentatonicScale(currentRoot, mode);

		// drone around the chord tones using long sustains
		let chordNotes = deriveChordForKey(currentRoot, mode);
		for (let i = 0; i < chordNotes.length; i++) {
			let position = Math.round(random(2, 4));
			let length = longSustains[Math.round(random(0, longSustains.length - 1))];
			let timeOffset = random(0, 0.8)
			droneSynth.triggerAttackRelease(chordNotes[i] + position, length, time + timeOffset);
		}

		// bounce up/down/within the derived scale using sustains based on gusts
		let sustains = longSustains;
		if (gustFactor >= 2) {
			sustains = gustFactor <= 3.25 ? mixedSustains : shortSustains;
		}
		for (let i = 0; i <= Math.round(Math.random() * 3); i++) {
			var note = scale[Math.floor(Math.random() * scale.length)];	
			note = note + ["2", "3", "4"].at(Math.random() * 3);
			var length = sustains[Math.floor(Math.random() * sustains.length)];
			let timeOffset = i + random(0, 1);
			bounceSynth.triggerAttackRelease(note, length, time + timeOffset);
		}

		// Tone.Draw.schedule(() => {
		// 	periodElem.innerHTML = "current period = " + loopCount;
		// 	keyModeElem.innerHTML = "current key = " + key + ", mode = " + mode;
		// 	tempElem.innerHTML = "periodAvgTemp = " + periodAvgTemp + ", periodMinTemp = " + periodMinTemp + ", periodMaxTemp = " + periodMaxTemp;
		// 	windElem.innerHTML = "periodAvgWind = " + periodAvgWind + ", periodAvgGusts = " + periodAvgGusts + ", gustFactor = " + gustFactor;
		// 	rainElem.innerHTML = "periodAvgPrecip = " + periodAvgPrecip + ", periodAvgDew = " + periodAvgDew;
		// 	cloudElem.innerHTML = "periodAvgCloud = " + periodAvgCloud;
		// }, time);

		// periodForDisplay = "current period = now + " + loopCount + " hours";
		periodForDisplay = weather_feed["hourly"]["time"][loopCount];
		keyModeForDisplay = "current key = " + key + " " + mode + ", bpm = " + bpm;
		tempForDisplay = "average temperature = " + periodAvgTemp + " (min/max:  " + periodMinTemp + "/" + periodMaxTemp + ")";
		windForDisplay = "average wind = " + periodAvgWind + " (gusts = " + periodAvgGusts + ", computed gust factor = " + gustFactor + ")";
		rainForDisplay = "average rain chances = " + periodAvgPrecip + ", average dew point = " + periodAvgDew;;
		cloudForDisplay = "average cloud cover = " + periodAvgCloud;;

		prevAvgTemp = periodAvgTemp;
		prevAvgWind = periodAvgWind;
		prevAvgPrecip = periodAvgPrecip;
		prevAvgDew = periodAvgDew;
		prevAvgCloud = periodAvgCloud;

		loopCount += 4;
	}, "1m").start(0);
}


// const AVAILABLE_PATTERNS = [
// 	[
// 		{scaleIdx: 0, position: 2, duration: "1n", timeOffset: 0},
// 	],
// 	[
// 		{scaleIdx: 0, position: 2, duration: "2n", timeOffset: 0},
// 		{scaleIdx: 2, position: 2, duration: "2n", timeOffset: 2},
// 	],
// 	[
// 		{scaleIdx: 0, position: 2, duration: "2n", timeOffset: 0},
// 		{scaleIdx: 2, position: 2, duration: "4n", timeOffset: 1},
// 		{scaleIdx: 4, position: 2, duration: "4n", timeOffset: 1},
// 		{scaleIdx: 3, position: 2, duration: "2n", timeOffset: 3},
// 		{scaleIdx: 4, position: 2, duration: "2n", timeOffset: 3},
// 	],
// 	[
// 		{scaleIdx: 0, position: 2, duration: "4n", timeOffset: 0},
// 		{scaleIdx: 2, position: 2, duration: "4n", timeOffset: 1},
// 		{scaleIdx: 4, position: 2, duration: "8n", timeOffset: 1},

// 		{scaleIdx: 1, position: 3, duration: "16n", timeOffset: 2},
// 		{scaleIdx: 1, position: 3, duration: "16n", timeOffset: 2.2},
// 		{scaleIdx: 1, position: 4, duration: "16n", timeOffset: 2.5},
// 		{scaleIdx: 1, position: 3, duration: "16n", timeOffset: 2.6},

// 		{scaleIdx: 3, position: 2, duration: "2n", timeOffset: 3},
// 		{scaleIdx: 4, position: 2, duration: "2n", timeOffset: 3},
// 	],
// 	[
// 		{scaleIdx: 3, position: 4, duration: "4n", timeOffset: 0},
// 		{scaleIdx: 3, position: 4, duration: "4n", timeOffset: 1},
// 		{scaleIdx: 3, position: 4, duration: "4n", timeOffset: 2},

// 		{scaleIdx: 3, position: 4, duration: "16n", timeOffset: 3},
// 		{scaleIdx: 4, position: 4, duration: "16n", timeOffset: 3.2},
// 		{scaleIdx: 1, position: 4, duration: "16n", timeOffset: 3.6},
// 		{scaleIdx: 1, position: 4, duration: "16n", timeOffset: 3.8},
// 	],
// ]

// // should return an array of patterns that are arrays of notes/durations/offsets
// function makeWeatherPatterns(temp, rain, wind, cloud) {
// 	console.log("temp = " + temp);
// 	let patterns = []
	
// 	let goodNotes = ["A", "C", "D", "E", "F", "G"];
// 	let badNotes = ["A#", "B", "C#", "D#", "F#", "G#"];
	
// 	let numCombos = 0;
// 	let key;
// 	let mode;
// 	let scale;
	
	
// 	if (temp <= 0) {
// 		mode = (rain <= 15 && cloud <= 25) ? "major" : "minor";
// 		key = (rain <= 50 || cloud <= 75) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
// 		numCombos = Math.floor(random(7, 10));
// 	} else if (temp <= 32) {
// 		mode = (rain <= 25 && cloud <= 50) ? "major" : "minor";
// 		key = (rain <= 25 || cloud <= 25) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
// 		numCombos = Math.floor(random(3, 8));
// 	} else {
// 		mode = (rain <= 10 && cloud <= 10) ? "major" : "minor";
// 		key = (rain <= 10 || cloud <= 10) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
// 		numCombos = Math.floor(random(2, 5));
// 	}

// 	scale = derivePentatonicScale(key, mode);

// 	let derivedPatterns = [];
// 	for (let i = 0; i < numCombos; i++) {
// 		let sequence = []
// 		let pattern = AVAILABLE_PATTERNS[Math.floor(Math.random() * AVAILABLE_PATTERNS.length)]
// 		for (const note of pattern) {
// 			let noteName = scale[note.scaleIdx] + note.position;
// 			let duration = note.duration;
// 			let timeOffset = note.timeOffset;
// 			sequence.push({
// 				note: noteName, duration: duration, timeOffset: timeOffset
// 			});
// 		}
// 		derivedPatterns.push(sequence);
// 	}

// 	return derivedPatterns;
// }

const AVAILABLE_PATTERNS = [
	
	[
		{scaleIdx: 4, position: 3, duration: "4n", timeOffset: "+0:0"},			// 1
		{scaleIdx: 3, position: 3, duration: "4n", timeOffset: "+0:1"},			// 2
		{scaleIdx: 2, position: 3, duration: "4n", timeOffset: "+0:2"},         // 3
		{scaleIdx: 0, position: 3, duration: "4n", timeOffset: "+0:3"},			// 4
	],
	// this is really good and breezy sounding in major at ~ 100bpm. at 72bpm it is empty at the end. maybe look at tweaking the time offset numbers.
	// and in minor it's still fluffy but a bit melancholy at 72bpm but more upbeat at 100bpm of course. 
	[
		{scaleIdx: 0, position: 3, duration: "4n", timeOffset: "+0:0"},			// 1
		{scaleIdx: 4, position: 3, duration: "4n", timeOffset: "+0:1"},			// 2
		
		{scaleIdx: 3, position: 3, duration: "16n", timeOffset: "+0:2:0"}, 		// 3
		{scaleIdx: 3, position: 3, duration: "16n", timeOffset: "+0:2:1"},		// e
		{scaleIdx: 3, position: 3, duration: "16n", timeOffset: "+0:2:2"}, 		// and
																				// uh
		{scaleIdx: 3, position: 3, duration: "8n", timeOffset: "+0:3:0"}, 		// 4
		{scaleIdx: 2, position: 3, duration: "8n", timeOffset: "+0:3:2"},		// and
	], [
		{scaleIdx: 2, position: 3, duration: "8n", timeOffset: "+0:0:0"},			// 1
		{scaleIdx: 4, position: 3, duration: "8n", timeOffset: "+0:0:1"},			// e
		{scaleIdx: 3, position: 3, duration: "8n", timeOffset: "+0:0:2"},			// and
		{scaleIdx: 1, position: 3, duration: "8n", timeOffset: "+0:0:3"},			// uh

		{scaleIdx: 0, position: 3, duration: "4n", timeOffset: "+0:1"},			// 2
		
		{scaleIdx: 3, position: 3, duration: "16n", timeOffset: "+0:2:0"}, 		// 3
		{scaleIdx: 3, position: 3, duration: "16n", timeOffset: "+0:2:3"}, 		// uh

		{scaleIdx: 3, position: 3, duration: "16n", timeOffset: "+0:3:0"}, 		// 4
		{scaleIdx: 2, position: 3, duration: "16n", timeOffset: "+0:3:3"},		// uh
	]
]
function playForConditions(temps, rains, clouds, winds) {
	// cold weather should be quick, sharp sounds with a crisp tone
	// mid weather should be slower with a mix of short/mid/long sustains that is treated like a spectrum
	// hot weather should be slow, long sounds with a warm tone

	// console.log("temp = " + temp);
	let patterns = []
	
	let goodWeatherKeys = ["A", "C", "D", "E", "F", "G"];
	let badWeatherKeys = ["A#", "B", "C#", "D#", "F#", "G#"];
	
	let numCombos = 0;
	let key;
	let mode;
	let scale;

temps = [85, 87, 87, 89];
winds = [0, 1, 1, 3];
rains = [0, 1, 1, 1];
	let periodAvgTemp = Math.ceil((temps.reduce((partialSum, a) => partialSum + a, 0))/4);
	let periodMinTemp = Math.round(Math.min(...temps));
	let periodMaxTemp = Math.round(Math.max(...temps));
	
	
	if (false && periodMinTemp <= 0) {
	} else if (false && periodMinTemp <= 32) {
	} else {
		// mode = (rain <= 10 && cloud <= 10) ? "major" : "minor";
		// key = (rain <= 10 || cloud <= 10) ? goodNotes[Math.floor(random(0, goodNotes.length-1))] : badNotes[Math.floor(random(0, badNotes.length-1))]
		mode = "minor";
		key = "C";
		// numCombos = Math.floor(random(2, 5));
		numCombos = 1;
	}

	scale = derivePentatonicScale(key, mode);

	let periodAvgWind = Math.ceil((winds.reduce((partialSum, a) => partialSum + a, 0))/4);

	// let bpm = Math.floor(map(periodAvgWind, 0, 100, minBPM, maxBPM));
	let bpm = 100;
	Tone.getTransport().bpm.rampTo(bpm, 0.1);

	let derivedPatterns = [];
	for (let i = 0; i < numCombos; i++) {
		let sequence = []
		// let pattern = AVAILABLE_PATTERNS[Math.floor(Math.random() * AVAILABLE_PATTERNS.length)]
		let pattern = AVAILABLE_PATTERNS[2];
		for (const note of pattern) {
			let noteName = scale[note.scaleIdx] + note.position;
			let duration = note.duration;
			let timeOffset = note.timeOffset;
console.log("noteName = " + noteName + ", duration = " + duration + ", timeOffset = " + timeOffset);
			sequence.push({
				note: noteName, duration: duration, timeOffset: timeOffset
			});
		}
		derivedPatterns.push(sequence);
	}
console.log(derivedPatterns);

	const bounceSynth = new Tone.PolySynth(Tone.Synth).toDestination();

	const loopA = new Tone.Loop((time) => {
		for (const pattern of derivedPatterns) {
			for (const note of pattern) {
				let noteName = note.note;
				let duration = note.duration;
				let timeOffset = note.timeOffset;
				// bounceSynth.triggerAttackRelease(noteName, duration, time + timeOffset);
				bounceSynth.triggerAttackRelease(noteName, duration, timeOffset);
			}
		}

		// loopCount += 4;
	}, "1m").start(0);

	// return derivedPatterns;
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
	  	// startStopTempSounds();
	  	// startStopWindNoise();
		// startStopRainNoise();

		// play7dayForecast();
		playForConditions();

    	ready = true;

    	// all loops start when the Transport is started
  		Tone.getTransport().start();
  	}
  	else {
    	ready = false;
    	Tone.getTransport().cancel();
  	}
	
}

function deriveChordForKey(rootNote, mode) {
	let keyNotes = pivotForRootNote(rootNote);
	let chordNotes = [];
	
	if (mode == "major") {
		chordNotes.push(keyNotes[0]);
		chordNotes.push(keyNotes[4]);
		chordNotes.push(keyNotes[7]);
	} else if (mode == "minor") {
		chordNotes.push(keyNotes[0]);
		chordNotes.push(keyNotes[3]);
		chordNotes.push(keyNotes[7]);
	} else if (mode == "diminished") {
		chordNotes.push(keyNotes[0]);
		chordNotes.push(keyNotes[3]);
		chordNotes.push(keyNotes[6]);
	}

	return chordNotes
}

function derivePentatonicScale(rootNote, mode) {
	let keyNotes = pivotForRootNote(rootNote);

	let pentaindices = (mode == "major" ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]);
	let theScale = [];
	for (const idx of pentaindices) {
		theScale.push(keyNotes[idx]);
	}

	return theScale;
}

function fourthForKey(rootNote) {
	let keyNotes = pivotForRootNote(rootNote);
	return keyNotes[5];
}

function fifthForKey(rootNote) {
	let keyNotes = pivotForRootNote(rootNote);
	return keyNotes[7];
}

function pivotForRootNote(rootNote) {
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

	return keyNotes;	
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

	    textSize(20)
	    fill("yellow")
	    text(periodForDisplay, 50, 50);
	    fill("orange")
	    text(keyModeForDisplay, 50, 100);
	    fill("red")
		text(tempForDisplay, 50, 150);
		fill("purple")
		text(windForDisplay, 50, 200);
		fill("blue")
		text(rainForDisplay, 50, 250);
		fill("green")
		text(cloudForDisplay, 50, 300);

	} else {
		fill(255);
    	noStroke();
	}
}
