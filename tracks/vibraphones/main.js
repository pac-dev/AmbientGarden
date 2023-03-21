/**
 * A vibraphone model based on modal synthesis. The low-level instrument code is
 * in faust/vib.dsp
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, FaustNode, Seq } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fau = new FaustNode('faust/vib.dsp', { freq: 1, noise: 1 });
const fau2 = new FaustNode('faust/vib.dsp', { freq: 1, noise: 1 });
const post = new FaustNode('faust/post.dsp');
fau.connect(post);
fau2.connect(post);
post.connect(graph.out);
const impact = graph.addParam('impact');
graph.addParam('freq1', { def: 300, min: 50, max: 2000 }).connect(fau.freq);
graph.addParam('freq2', { def: 360, min: 50, max: 2000 }).connect(fau2.freq);

const env = x => 1 - 1 / (x * (0.5 - 0.3 * impact.value) + 1);
new Seq(graph).schedule(() => {
	fau.noise.value = impact.value;
	fau2.noise.value = fau.noise.value;
});
graph.ctrl(t => {
	fau.noise.value *= 0.7;
	fau2.noise.value *= 0.7;
	if (Math.random() < 0.01) {
		fau.noise.value = Math.max(fau.noise.value, Math.random() * env(t));
	}
	if (Math.random() < 0.01) {
		fau2.noise.value = Math.max(fau2.noise.value, Math.random() * env(t));
	}
});

export const process = graph.makeProcessor();
