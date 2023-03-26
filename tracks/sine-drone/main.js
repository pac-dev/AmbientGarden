/**
 * Sine drone.
 * 
 * A simple additive synthesizer. At its core is a bank of sine waves, tuned to
 * be multiples of both input frequencies.
 */

import { Graph, FaustNode, Sine } from '../_lib/tealib.js';
import { mixFreqs } from '../fraclib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fParam1 = graph.addParam('freq1', { def: '100*4' });
const fParam2 = graph.addParam('freq2', { def: '100*6' });

const post = new FaustNode('faust/post.dsp');
post.connect(graph.out);
const baseAmp = (freq, i) => 1 / (i + 1);
const sines = [...new Array(10)].map(i => new Sine());
sines.forEach(s => s.connect(post));
let setFreqs = () => {
	const mfs = mixFreqs(fParam1.value, fParam2.value, 3);
	if (mfs.length < 10) throw new Error("fracsin can't intersect freqs");
	sines.forEach((sine, i) => {
		sine.baseAmp = baseAmp(mfs[i], i) * 0.3;
		sine.baseFreq = mfs[i];
		sine.lfRate = 1 / (2 + ((i * 79.6789) % 3));
		sine.lfPhase = i;
	});
};

graph.ctrl(t => {
	if (fParam1.changed() || fParam2.changed()) setFreqs();
	const env = 1 - 1 / (t * t * 0.15 + 1);
	for (let sine of sines) {
		sine.amp.value = sine.baseAmp * env * (0.5 + 0.5 * Math.sin(t * sine.lfRate + sine.lfPhase));
		sine.freq.value = sine.baseFreq * (1 + 0.018 * Math.sin(t * sine.lfRate * 10));
	}
});

export const process = graph.makeProcessor();
