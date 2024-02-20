/**
 * Melodic soprano. This is a simple vocal synth, starting with a sawtooth wave
 * combined with noise, which are then fed into a formant filter bank.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, Seq, FaustNode, CtrlSine, SampleProcessor } from '../_lib/tealib.js';
import { mixFreqs, randomSeed } from '../_lib/math.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Post-processing Faust node
const post = new FaustNode('faust/post.dsp', { preamp: 1, slowness: 0 });
post.connect(graph.out);


// Basic parameters to control the patch
graph.addParam('preamp', { def: 1 }).connect(post.preamp);
const fParam1 = graph.addParam('freq1', { def: '100*8' });
const fParam2 = graph.addParam('freq2', { def: '100*9' });
// Params to control the generative melody
const fMin = graph.addParam('minFreq', { def: 350, min: 50, max: 3000 });
const fMax = graph.addParam('maxFreq', { def: 860, min: 50, max: 3000 });
const complexity = graph.addParam('complexity', { def: 1, max: 3 });
const skip = graph.addParam('skip', { max: 12 });
const slowness = graph.addParam('slowness');

const rand = randomSeed();

/**
 * Class for a vocal synth Faust node with additional control-rate processing.
 * Control it by setting the "fTgt" and "pressTgt" properties to the desired
 * frequency and pressure level. Call "ctrl" at control rate and get the output
 * from the Faust node.
 */
export class Soprano extends FaustNode {
	constructor() {
		super('faust/soprano.dsp', { f1: 0, noise: 0, saw: 0, highness: 0 });
		this.freq = 100;
		this.fTgt = 100;
		this.fChange = 100;
		this.press = 0;
		this.pressTgt = 0;
		this.vibNode = new CtrlSine({ phase: rand() });
		this.vibNode
			.connect(new SampleProcessor(v => (1 + v * 0.02) * this.freq))
			.connect(this.f1);
	}
	ctrl(t) {
		// slowness 0 -> df 0.03 ; slowness 1 -> df 0.005
		const fDif = (this.fTgt - this.freq) * (0.03-0.025*slowness.value);
		const fAbs = Math.abs(fDif);

		if (fAbs > this.fChange) this.fChange += (fAbs - this.fChange) * 0.1;
		else this.fChange += (fAbs - this.fChange) * 0.007;
		if (this.fChange > 1) this.fChange = 1;

		if (this.pressTgt > this.press) this.press += (this.pressTgt - this.press) * 0.02;
		else this.press += (this.pressTgt - this.press) * 0.002;

		this.freq += fDif;
		this.vibNode.freq.value = 3 + Math.sqrt(this.fChange) * 4;
		this.vibNode.amp.value = 1 - this.fChange;
		this.noise.value = this.fChange * 0.2 + 0.2;
		this.noise.value *= this.press;
		this.saw.value = (1 - this.fChange) * 0.2 + 0.15;
		this.saw.value *= this.press * this.press;
		this.highness.value = 1-30/(t*t+30);
	}
	init(freq) {
		this.freq = freq
		this.fTgt = freq
		this.fChange = 1;
	}
}

const sop1 = new Soprano();
const sop2 = new Soprano();
sop1.connect(post);
sop2.connect(post);
slowness.connect(post.slowness);

let freqs1, freqs2, freqi = 0;

// Generate a set of pitches for the melody
const setFreqs = () => {
	const all = mixFreqs(fParam1.value, fParam2.value, 6);
	let mfs = all.filter(f => f > fMin.value && f < fMax.value);
	if (mfs.length > 6) mfs.length = 6;
	mfs.sort((a, b) => b - a); // descending
	freqs1 = [];
	for (let i = 0; i < mfs.length; i += 2) freqs1.push(mfs[i]);
	freqs1.reverse();
	for (let i = 1; i < mfs.length; i += 2) freqs1.push(mfs[i]);
	freqs2 = freqs1.map(ref => {
		for (const f of all) {
			if (f < ref*0.84 && f > ref*0.5) return f;
			if (f/2 < ref*0.84 && f/2 > ref*0.5) return f/2;
		}
		throw new Error('No backing pitch found.');
	})
	if (!sop1.pressTgt) sop1.init(freqs1[0] * 0.75);
	if (!sop2.pressTgt) sop2.init(freqs2[0] * 0.75);
};
setFreqs();

graph.ctrl(t => {
	sop1.ctrl(t);
	sop2.ctrl(t);
});

// Play a melody according to the parameters and generated pitches
const seq = new Seq(graph);
seq.schedule(async () => {
	if (skip.value) {
		freqi = Math.floor(skip.value) % freqs1.length;
		sop1.init(freqs1[freqi] * 0.75);
		sop2.init(freqs2[freqi] * 0.75);
	}
	while (true) {
		if ([fParam1, fParam2, fMin, fMax].some(p => p.changed())) setFreqs();
		if (complexity.value > 1.5) sop2.pressTgt = 1;
		sop2.fTgt = freqs2[freqi];
		(async () => {
			await seq.play(rand()*0.5);
			sop1.pressTgt = 1;
			sop1.fTgt = freqs1[freqi];
		})();
		await seq.play(3);
		if ([fParam1, fParam2, fMin, fMax].some(p => p.changed())) setFreqs();
		sop1.fTgt = freqs1[(freqi + 1) % freqs1.length];
		sop2.fTgt = freqs2[(freqi + 1) % freqs1.length];
		await seq.play(3);
		if ((complexity.value % 2) > 0.5) {
			sop1.fTgt = freqs1[freqi];
			sop2.fTgt = freqs2[freqi];
		}
		await seq.play(3);
		sop1.pressTgt = 0;
		sop2.pressTgt = 0;
		await seq.play(1);
		if (freqi === 1) graph.setSplicePoint();
		await seq.play(2);
		freqi = (freqi + 1) % freqs1.length;
		sop1.fTgt = freqs1[freqi] * 0.75;
		sop2.fTgt = freqs2[freqi] * 0.75;
		await seq.play(1);
	}
});


export const process = graph.makeProcessor();
