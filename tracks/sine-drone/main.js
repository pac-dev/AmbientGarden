import { Graph, FaustNode, Sine } from '../_lib/tealib.js';
import { mixFreqs } from '../fraclib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fParam1 = graph.addParam('freq1', { def: 400, min: 50, max: 2000 });
const fParam2 = graph.addParam('freq2', { def: 600, min: 50, max: 2000 });

const post = new FaustNode('faust/post.dsp');
post.connect(graph.out);
const baseAmp = (freq, i) => 1 / (i + 1);
const sines = [...new Array(10)].map(i => new Sine());
sines.forEach(s => s.connect(post));
let init = () => {
	const mfs = mixFreqs(fParam1.value, fParam2.value, 3);
	if (mfs.length < 10) throw new Error("fracsin can't intersect freqs");
	sines.forEach((sine, i) => {
		sine.baseAmp = baseAmp(mfs[i], i) * 0.3;
		sine.baseFreq = mfs[i];
		sine.lfRate = 1 / (2 + ((i * 79.6789) % 3));
		sine.lfPhase = i;
	});
	init = undefined;
};

graph.ctrl(t => {
	if (init) init();
	const env = 1 - 1 / (t * t * 0.15 + 1);
	for (let sine of sines) {
		sine.amp.value = sine.baseAmp * env * (0.5 + 0.5 * Math.sin(t * sine.lfRate + sine.lfPhase));
		sine.freq.value = sine.baseFreq * (1 + 0.018 * Math.sin(t * sine.lfRate * 10));
	}
});

export const process = graph.makeProcessor();
