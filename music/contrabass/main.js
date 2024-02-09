/**
 * Ambient contrabass.
 * 
 * The core of this patch is a waveguide-inspired bowed string algorithm. It
 * makes deliberate use of aliasing artifacts, and has an additional layer of
 * ambient noise.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelope, and other control code.
 */

import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Create some nodes: Faust instrument and post-processing
const post = new FaustNode('faust/post.dsp', { preamp: 1 });
const fau = new FaustNode('faust/contrabass.dsp', {
	freq: 0, noise1: 0, texamp: 0, texvar: 0, lp1: 3300, lp2: 580
});
fau.connect(post).connect(graph.out);

// Basic parameters to control the patch
graph.addParam('preamp', { def: 1 }).connect(post.preamp);
graph.addParam('freq1', { def: '100*1/2' }).connect(fau.freq);
// Params: dynamics flattening; Lowpass; Texture amplitude and variability
const flatten = graph.addParam('flatten');
graph.addParam('lp1', { def: 3300, min: 100, max: 10000 }).connect(fau.lp1);
graph.addParam('texamp').connect(fau.texamp);
graph.addParam('texvar').connect(fau.texvar);

// At control rate, ensure the first few seconds are loud
let loudness;
graph.ctrl(tSec => {
	loudness = flatten.value * (1 - 1 / (tSec * tSec * 0.15 + 1));
	if (tSec > 12) graph.setSplicePoint('intro');
	if (tSec > 30) graph.setSplicePoint('loop');
});

// Utility to cause a "wave" shape in a given parameter
const playWave = (targetParam, amp) => {
	graph.ctrlDuration(Math.PI * 2, sec => {
		targetParam.value = (0.5 - Math.cos(sec) * 0.5) * amp;
		targetParam.value = 0.3 * loudness + targetParam.value * (1 - loudness);
	});
};

// Some lowpass frequencies to cycle though
let lp2s = [580, 750, 650, 1200];

// Automate the instrument's noise source and lowpass
const seq = new Seq(graph);
seq.schedule(async () => {
	while (true) {
		fau.lp2.value = lp2s[0];
		playWave(fau.noise1, 0.3);
		await seq.play(2);
		await seq.play(Math.PI * 2 - 2 + 0.5);
		lp2s = [...lp2s.slice(1), lp2s[0]];
	}
});
export const process = graph.makeProcessor();
