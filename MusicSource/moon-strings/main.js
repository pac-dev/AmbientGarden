/**
 * Plucked string arpeggio based on Karplus–Strong synthesis.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mixFreqs, randomSeed, rhythmArray, biasedRandom } from '../_lib/math.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Post-processing Faust node
const post = new FaustNode('faust/post.dsp', { preamp: 1, delfb: .5 });
post.connect(graph.out);

// Parameters to control the patch
graph.addParam('preamp', { def: 1 }).connect(post.preamp);
// Frequency centers for the generative strums
const fParam1 = graph.addParam('freq1', { def: '100*8' });
const fParam2 = graph.addParam('freq2', { def: '100*9' });
// Timbral paramters: lowpass and feedback
const lpParam = graph.addParam('lp', { def: 350, min: 50, max: 2000 });
const fbParam = graph.addParam('fb', { max: .9 });
// Post-processing delay feedback
graph.addParam('delfb', { def: .5 }).connect(post.delfb);
// Parameters to control the generative strumming intensity
const density = graph.addParam('density', { def: 1, min: 0, max: 1 });
const flatParam = graph.addParam('flatness');

// The string synth is polyphonic. This creates one polyphonic voice
const mkVoice = i => {
	const ret = new FaustNode('faust/pluck.dsp', { freq: 500, noise: 0, lp1: 3000, fb: 0 });
	lpParam.connect(ret.lp1);
	ret.notePos = 100;
	ret.amp = 1;
	ret.note = (freq, amp) => {
		ret.freq.value = freq;
		ret.fb.value = (1 - (1 - fbParam.value)*(3/freq));
		ret.notePos = 0;
		ret.amp = amp;
	};
	return ret;
};

// Use the Poly class to make an instrument with 6 managed voices
const poly = new Poly(6, mkVoice, post);

// At control rate, apply an envelope to all voices
const atk = 0.007;
const env = (x) => {
	if (x < atk) return (x/atk)*(x/atk);
	else return Math.max(0, (1.5)/((x-atk)*300+1)-0.5);
}
graph.ctrl((tSeconds, delta) => {
	poly.forEach(voice => {
		voice.notePos += delta;
		voice.noise.value = env(voice.notePos) * voice.amp;
	});
});

const seq = new Seq(graph);
const scaleLen = 10;

// "mod soup" arpeggiator functions:
// use a graph tool (eg js-graphy) to edit them with visual feedback
const fl = Math.floor;
const arpNote = (t) => fl(t%5)+5+fl(-t*0.1)%(fl(t*0.025)%5+2);
const arpVel = (t) => 0.6+fl(t%5)*0.1-0.1*arpNote(fl(t/5)*5+0.1);
const arpDel = (t) => {
	let d = 0.4*Math.abs(fl((t+1)%5)-2.5);
	return (d*d*d+1.5)*0.055876;
};
const swell = (t) => {
	let s = t+200/(t+7);
	s = 0.5+Math.cos(s*Math.PI*2/200)*0.5;
	return 1-s*s*s;
};

// Generate a set of pitches for the strumming
let freqs;
const setFreqs = () => {
	freqs = mixFreqs(fParam1.value, fParam2.value, 4);
	freqs = freqs.slice(0,scaleLen).sort((a, b) => a - b);
};
const tRand = randomSeed(1);
const thresholds = rhythmArray({len: 40, cycles: [2,5,10,15]})
	.map(x => biasedRandom(x, 4, tRand))
	.map((x,i) => 1 - Math.sqrt(x)*(Math.sin(i*.25)*.5+.5));

// Strum according to the parameters and generated pitches
seq.schedule(async () => {
	let t = 0;
	while (true) {
		if (fParam1.changed() || fParam2.changed()) setFreqs();
		if (t === 200) graph.setSplicePoint();
		// if (t%200 === 0) console.log('loop len: '+(graph.timeSmp/graph.sampleRate))
		if (t === 400) t = 0;
		if (thresholds[t%40] < density.value)
			poly.note(freqs[arpNote(t+0.1)], Math.pow(arpVel(t+0.1)*swell(t), 1-0.9*flatParam.value));
		await seq.play(arpDel(t+0.1));
		t++;
	}
});

export const process = graph.makeProcessor();
