/**
 * A vibraphone model based on modal synthesis. Audio-rate code is written in
 * Faust and can be found in the faust directory. This file contains sequencing,
 * envelopes, and other control code. It just plays the two notes that are given
 * as parameters.
 */

import { Graph, FaustNode, Seq } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Create some nodes: Faust instrument and post-processing
const fau = new FaustNode('faust/vib.dsp', { freq: 1, noise: 1 });
const fau2 = new FaustNode('faust/vib.dsp', { freq: 1, noise: 1 });
const post = new FaustNode('faust/post.dsp', { preamp: 1 });
fau.connect(post);
fau2.connect(post);
post.connect(graph.out);

// Basic parameters to control the patch: amp, initial impact, frequencies to play
graph.addParam('preamp', { def: 1, max: 4 }).connect(post.preamp);
const impact = graph.addParam('impact');
graph.addParam('freq1', { def: '100*3' }).connect(fau.freq);
graph.addParam('freq2', { def: '100*7/2' }).connect(fau2.freq);

// Initial control rate: add impact according to the impact parameter
const env = x => 1 - 1 / (x * (0.5 - 0.3 * impact.value) + 1);
new Seq(graph).schedule(() => {
	fau.noise.value = impact.value;
	fau2.noise.value = fau.noise.value;
});

// Long-running control rate: play the notes with random timing
graph.ctrl(tSec => {
	if (tSec > 12) graph.setSplicePoint('intro');
	if (tSec > 30) graph.setSplicePoint('loop');
	fau.noise.value *= 0.7;
	fau2.noise.value *= 0.7;
	if (Math.random() < 0.01) {
		fau.noise.value = Math.max(fau.noise.value, Math.random() * env(tSec));
	}
	if (Math.random() < 0.01) {
		fau2.noise.value = Math.max(fau2.noise.value, Math.random() * env(tSec));
	}
});

export const process = graph.makeProcessor();
