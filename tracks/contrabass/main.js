/**
 * Ambient contrabass.
 * 
 * The core of this patch is a waveguide-inspired bowed string algorithm. It
 * makes deliberate use of (what I believe to be) aliasing artifacts, and has an
 * additional layer of ambient noise.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelope, and other control code.
 */

import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fau = new FaustNode('faust/contrabass.dsp', { freq: 0, noise1: 0, texamp: 0, texvar: 0, lp1: 3300, lp2: 580 });
const post = new FaustNode('faust/post.dsp', { preamp: 1 });
fau.connect(post).connect(graph.out);

graph.addParam('preamp', { def: 1 }).connect(post.preamp);
graph.addParam('freq1', { def: '100*1/2' }).connect(fau.freq);
const flatten = graph.addParam('flatten');
graph.addParam('lp1', { def: 3300, min: 100, max: 10000 }).connect(fau.lp1);
graph.addParam('texamp').connect(fau.texamp);
graph.addParam('texvar').connect(fau.texvar);

let smoothFlat;
graph.ctrl(tSec => {
	if (tSec > 12) graph.setSplicePoint('intro');
	if (tSec > 30) graph.setSplicePoint('loop');
	smoothFlat = flatten.value * (1 - 1 / (tSec * tSec * 0.15 + 1));
});

const playWave = (param, amp) => {
	graph.ctrlDuration(Math.PI * 2, sec => {
		param.value = (0.5 - Math.cos(sec) * 0.5) * amp;
		param.value = 0.3 * smoothFlat + param.value * (1 - smoothFlat);
	});
};

let lp2s = [580, 750, 650, 1200];
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
