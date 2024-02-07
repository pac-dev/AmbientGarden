/**
 * Melodic bottle. This is a classic waveguide model for a closed-ended wind
 * instrument.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mixFreqs } from '../_lib/math.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });
const post = new FaustNode('faust/post.dsp', { preamp: 1, bounce: 0 });

graph.addParam('preamp', { def: 1 }).connect(post.preamp);
const fParam1 = graph.addParam('freq1', { def: '100*4' });
const fParam2 = graph.addParam('freq2', { def: '100*6' });
const hiLen = graph.addParam('hilen', { def: 9, min: 4, max: 105 });
const breath = graph.addParam('breath');
const trem = graph.addParam('trem');
const modes = graph.addParam('modes', { def: 4, min: 0, max: 4 });
const bounce = graph.addParam('bounce');
bounce.connect(post.bounce)
// resMul = 1/Math.pow(10, breath.value)
// ampMul = 1+breath.value*2

const mkVoice = i => {
	const ret = new FaustNode('faust/bottle.dsp', { freq: 500, noise: 0, resmul: 1, modes: 4, trem: 0, bounce: 0 });
	ret.notePos = 100;
	ret.amp = 1;
	ret.note = (freq, amp) => {
		ret.notePos = 0;
		ret.amp = amp * (1+breath.value*4) * (5/(modes.value+1));
		ret.freq.value = freq;
		ret.modes.value = modes.value;
		ret.trem.value = trem.value;
		ret.resmul.value = 1/Math.pow(10, breath.value*2);
		ret.bounce.value = bounce.value;
	};
	ret.ctrl = () => {
		ret.notePos += 0.002;
		ret.noise.value = pulse(2*Math.pow(10, 1+ret.bounce.value), ret.notePos) * ret.amp;
	};
	return ret;
};
const poly = new Poly(3, mkVoice, post);
const pulse = (k, x) => Math.max(0, (2 * Math.sqrt(k) * x) / (1 + k * x * x) - x * 0.1);
graph.ctrl(tSeconds => {
	poly.forEach(voice => voice.ctrl());
});
let spliceFreq,
	noteN = 0;

post.connect(graph.out);
const evil = (a, b) => Math.max(a, b) / Math.min(a, b) < 10 / 9;
let intro = 3;
const seq = new Seq(graph);
seq.schedule(async () => {
	let flowlen = 3,
		flowdir = 2;
	while (true) {
		for (let fpos = 0; fpos < flowlen * 2; fpos++) {
			const mfs = mixFreqs(fParam1.value, fParam2.value, 6);
			const ofs = Math.floor((flowlen - 2) * 0.13);
			let freqs = mfs.filter((_, i) => i >= ofs && i < flowlen + ofs && !(i % 2));
			freqs.push(...mfs.filter((_, i) => i >= ofs && i < flowlen + ofs && i % 2).reverse());
			freqs = freqs.filter((f, i) => i < 3 || !evil(f, freqs[i - 1]));

			intro = Math.max(intro - 0.5, 0);
			if (hiLen.value > 4) poly.note(freqs[fpos % freqs.length], 0.5 + 0.5 / (fpos + 1));
			await seq.play(0.3 + 2 / (flowlen * 0.5 + 5) + Math.round(intro));
			if (noteN++ > 15 && fpos % 2 && spliceFreq === freqs[fpos % freqs.length]) {
				noteN = 0;
				graph.setSplicePoint('loop');
			}
			if (noteN > 10 && !spliceFreq && fpos % 2) {
				noteN = 0;
				spliceFreq = freqs[fpos % freqs.length];
				graph.setSplicePoint('intro');
			}
			await seq.play(fpos % 2);
		}
		if (flowdir > 0 && flowlen >= hiLen.value) flowdir = -flowdir;
		if (flowdir < 0 && flowlen <= 3) flowdir = -flowdir;
		flowlen += flowdir;
	}
});

export const process = graph.makeProcessor();
