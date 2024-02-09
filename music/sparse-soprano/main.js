/**
 * Sparse soprano. This is a simple vocal synth, starting with a sawtooth wave
 * combined with noise, which are then fed into a formant filter bank. This
 * patch just plays the note that's given as parameter.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Create some nodes: Faust instrument and post-processing
const fau = new FaustNode('faust/soprano.dsp', { f1: 0, noise: 1, saw: 0.4 });
const post = new FaustNode('faust/post.dsp', { preamp: 1 });

// Basic parameters to control the patch: amp, frequency
graph.addParam('preamp', { def: 1 }).connect(post.preamp);
const f1param = graph.addParam('freq1', { def: '100*3' });
fau.connectWithGain(post).connect(graph.out);

// At control rate, add some movement to the voice
graph.ctrl(tSec => {
	if (tSec > 12) graph.setSplicePoint('intro');
	if (tSec > 30) graph.setSplicePoint('loop');
	const vibrato = Math.sin(tSec * 17 + 4 * Math.sin(tSec * 2));
	const vibAmt = Math.cos(tSec * 3) * 0.3 + 0.6;
	graph.getConnection(fau, post).gain.value = 0.5 - 0.5 * Math.cos(tSec * 0.5);
	fau.f1.value = f1param.value * (1 + vibrato * vibAmt * 0.02);
});

export const process = graph.makeProcessor();
