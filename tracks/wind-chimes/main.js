/**
 * Wind chimes based on modal synthesis. Audio-rate code is written in Faust and
 * can be found in the faust directory. This file contains sequencing,
 * envelopes, and other control code.
 */

import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mainHost as host } from '../host.js';
import { mixFreqs, randomSeed } from '../_lib/math.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });
const post = new FaustNode('faust/post.dsp');
post.connect(graph.out);

const fParam1 = graph.addParam('freq1', { def: '100*6' });
const fParam2 = graph.addParam('freq2', { def: '100*8' });
const tightParam = graph.addParam('tightness', { max: 6.5 });
const lpParam1 = graph.addParam('lp1', { def: 350, min: 50, max: 2000 });
const density = graph.addParam('density', { def: 1, min: 0.1, max: 3 });

const mkVoice = i => {
	const ret = new FaustNode('faust/chime.dsp', { freq: 500, noise: 0, lp1: 100 });
	lpParam1.connect(ret.lp1);
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
const poly = new Poly(8, mkVoice, post);
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
const setFreqs = () => {
	freqs = mixFreqs(fParam1.value, fParam2.value, 2+Math.floor(tightParam.value));
	freqs = freqs.slice(0,8-Math.floor(tightParam.value));
}
seq.schedule(async () => {
	let t = 0;
	let rand = randomSeed(1);
	let lastIdx = 0;
	while (true) {
		if (fParam1.changed() || fParam2.changed() || tightParam.changed()) setFreqs();
		if (t === 50) host.wantInterrupt = true;
		if (t === 100) {
			t = 0;
			rand = randomSeed(1);
		}
		//if (t%5<0.1) console.log('swell = '+Math.round(swell(t)*100)/100)
		let idx = Math.pow(rand(), idxpow);
		if (idx === lastIdx) idx = Math.pow(rand(), idxpow);
		if (idx === lastIdx) idx = Math.pow(rand(), idxpow);
		lastIdx = idx;
		const f = freqs[Math.floor(idx*freqs.length)];
		poly.note(f, t ? rand() : 1, Math.sign(rand()-0.1));
		await seq.play((0.3+0.2*rand())/density.value);
		t++;
	}
});

export const process = graph.makeProcessor();
