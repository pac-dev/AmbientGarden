/**
 * Wind chimes based on modal synthesis. Audio-rate code is written in Faust and
 * can be found in the faust directory. This file contains sequencing,
 * envelopes, and other control code.
 */

import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mixFreqs, randomSeed } from '../_lib/math.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Post-processing Faust node
const post = new FaustNode('faust/post.dsp', { preamp: 1, lp1: 600, hp1: 500 });
post.connect(graph.out);

// Parameters to control the patch
graph.addParam('preamp', { def: 1 }).connect(post.preamp);
// Frequency centers for the generated pitches, frequency tightness
const fParam1 = graph.addParam('freq1', { def: '100*6' });
const fParam2 = graph.addParam('freq2', { def: '100*8' });
const tightParam = graph.addParam('tightness', { max: 6.5 });
// Intensity parameters: lowpass and note density
const lpParam1 = graph.addParam('lp1', { def: 350, min: 50, max: 2000 });
const density = graph.addParam('density', { def: 1.7, min: 0.1, max: 3 });
lpParam1.connect(post.lp1);

// The bell synth is polyphonic. This creates one polyphonic voice
const mkVoice = i => {
	const ret = new FaustNode('faust/chime.dsp', { freq: 500, noise: 0 });
	ret.notePos = 100;
	ret.amp = 1;
	ret.dir = 1;
	ret.note = (freq, amp, dir) => {
		ret.freq.value = freq;
		ret.notePos = dir > 0 ? 0 : 0.6;
		ret.amp = amp;
		ret.dir = dir;
	};
	return ret;
};

// Use the Poly class to make an instrument with 8 managed voices
const poly = new Poly(8, mkVoice, post);

// At control rate, apply an envelope to all voices
const env = (x) => {
	return Math.max(0, (1.2)/((x)*10+1)-0.2);
}
graph.ctrl((tSeconds, delta) => {
	poly.forEach(voice => {
		voice.notePos += delta*voice.dir;
		if (voice.notePos < 0) {
			voice.notePos = 100;
			voice.dir = 1;
		}
		voice.noise.value = env(voice.notePos) * voice.amp;
	});
});

const seq = new Seq(graph);
const idxpow = 1;
let freqs;

// Generate a set of pitches for the chiming
const setFreqs = () => {
	freqs = mixFreqs(fParam1.value, fParam2.value, 2+Math.floor(tightParam.value));
	freqs = freqs.slice(0,8-Math.floor(tightParam.value));
	post.hp1.value = Math.min(...freqs)*0.5;
};

// At control rate, trigger bells randomly
seq.schedule(async () => {
	let t = 0;
	let rand = randomSeed(1);
	let lastIdx = 0;
	while (true) {
		if (fParam1.changed() || fParam2.changed() || tightParam.changed()) setFreqs();
		if (t === 50) graph.setSplicePoint();
		if (t === 100) {
			t = 0;
			rand = randomSeed(1);
		}
		let idx = Math.pow(rand(), idxpow);
		if (idx === lastIdx) idx = Math.pow(rand(), idxpow);
		if (idx === lastIdx) idx = Math.pow(rand(), idxpow);
		lastIdx = idx;
		const f = freqs[Math.floor(idx*freqs.length)];
		poly.note(f, t ? 0.6 + 0.4*rand() : 1, Math.sign(rand()-0.05));
		await seq.play(0.1*rand() + 0.4/density.value);
		t++;
	}
});

export const process = graph.makeProcessor();
