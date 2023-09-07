/**
 * Vocal overtones.
 * 
 * This starts off with classic vocal synthesis: an exciter (sawtooth and noise)
 * is fed into a formant filter bank. Additional sweeping "overtone" filters are
 * added in parallel to the original bank, and fixed "tonic" filters are added
 * on the combined output to keep it tuned.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains envelopes, automation, and other control code.
 */

import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fau = new FaustNode('faust/tuvan.dsp', { f1: 0, f2amt: 0 });
const fau2 = new FaustNode('faust/tuvan.dsp', { f1: 0, f2amt: 0.1 });
const post = new FaustNode('faust/post.dsp');
fau.connectWithGain(post).connect(graph.out);
fau2.connectWithGain(post).connect(graph.out);
// f1=[50 - 220] ; f2=[f1*2 - f1*10] ; f2amt=[0-0.3]

const num = graph.addParam('num', { def: 1, min: 1, max: 2 });
graph.addParam('freq1', { def: '100*4/5' }).connect(fau.f1);
graph.addParam('freq2', { def: '100' }).connect(fau2.f1);
graph.ctrl(t => {
	if (num.value > 1.5) {
		fau.f2amt.value = 0.2;
		fau2.muted = false;
		graph.getConnection(fau, post).gain.value = 0.8 - 0.2 * Math.cos(t * 0.5);
		graph.getConnection(fau2, post).gain.value = 0.75 + 0.25 * Math.cos(t * 0.5);
	} else {
		graph.getConnection(fau, post).gain.value = 1;
		fau.f2amt.value = 0.33;
		fau2.muted = true;
	}
});

export const process = graph.makeProcessor();
