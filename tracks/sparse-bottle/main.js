/**
 * Melodic bottle. This is a classic waveguide model for a closed-ended wind
 * instrument. The low-level instrument code is in faust/bottle.dsp
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mainHost as host } from '../host.js';

host.willInterupt = true;
export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fParam1 = graph.addParam('freq1', { def: 200, min: 50, max: 2000 });
const fParam2 = graph.addParam('freq2', { def: 300, min: 50, max: 2000 });

const post = new FaustNode('faust/post.dsp');
const mkVoice = i => {
	const ret = new FaustNode('faust/bottle.dsp', { freq: 500, noise: 0 });
	ret.notePos = 100;
	ret.amp = 1;
	ret.note = (freq, amp) => {
		ret.freq.value = freq;
		ret.notePos = 0;
		ret.amp = amp;
	};
	return ret;
};
const poly = new Poly(3, mkVoice, post);
const pulse = (k, x) => Math.max(0, (2 * Math.sqrt(k) * x) / (1 + k * x * x) - x * 0.01);
graph.ctrl(tSeconds => {
	poly.forEach(voice => {
		voice.notePos += 0.002;
		voice.noise.value = pulse(5, voice.notePos) * voice.amp;
	});
});

let cycle = 0;
post.connect(graph.out);
const seq = new Seq(graph);
seq.schedule(async () => {
	poly.note(fParam1.value, 0.6);
	await seq.play(3);
	poly.note(fParam2.value, 0.7);
	await seq.play(4);
	host.wantInterrupt = true;
	while (true) {
		poly.note(fParam1.value, 1);
		await seq.play(2);
		await seq.play((cycle * 0.382) % 1);
		if (cycle % 2) poly.note(fParam2.value, 0.7);
		if (cycle === 5) host.wantInterrupt = true;
		await seq.play(4);
		await seq.play((cycle * 0.382 * 2 + 1) % 2);
		cycle++;
	}
});

export const process = graph.makeProcessor();
