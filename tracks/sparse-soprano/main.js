/**
 * Melodic soprano.
 * 
 * A simple vocal synth. A sawtooth wave, combined with noise, are fed into a
 * formant filter bank. The low-level instrument code is in faust/soprano.dsp
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fau = new FaustNode('faust/soprano.dsp', { f1: 0, noise: 1, saw: 0.4 });
const post = new FaustNode('faust/post.dsp');
const f1param = graph.addParam('freq1', { def: 300, min: 100, max: 1500 });
fau.connectWithGain(post).connect(graph.out);

graph.ctrl(t => {
	const vibrato = Math.sin(t * 17 + 4 * Math.sin(t * 2));
	const vibAmt = Math.cos(t * 3) * 0.3 + 0.6;
	graph.getConnection(fau, post).gain.value = 0.5 - 0.5 * Math.cos(t * 0.5);
	fau.f1.value = f1param.value * (1 + vibrato * vibAmt * 0.02);
});

export const process = graph.makeProcessor();
