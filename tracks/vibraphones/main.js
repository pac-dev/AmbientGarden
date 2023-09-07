/**
 * A vibraphone model based on modal synthesis. Audio-rate code is written in
 * Faust and can be found in the faust directory. This file contains sequencing,
 * envelopes, and other control code.
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
graph.addParam('freq1', { def: '100*3' }).connect(fau.freq);
graph.addParam('freq2', { def: '100*7/2' }).connect(fau2.freq);

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
