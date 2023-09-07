/**
 * Plucked string arpeggio based on Karplus–Strong synthesis.
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains sequencing, envelopes, and other control code.
 */

import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mainHost as host } from '../host.js';
import { mixFreqs, randomSeed } from '../_lib/math.js';

host.willInterupt = true;
export const sampleRate = 44100;
const graph = new Graph({ sampleRate });
const post = new FaustNode('faust/post.dsp');
post.connect(graph.out);

const fParam1 = graph.addParam('freq1', { def: '100*8' });
const fParam2 = graph.addParam('freq2', { def: '100*9' });
const lpParam1 = graph.addParam('lp1', { def: 350, min: 50, max: 2000 });
const density = graph.addParam('density', { def: 1, min: 0, max: 1 });

const mkVoice = i => {
	const ret = new FaustNode('faust/pluck.dsp', { freq: 500, noise: 0, lp1: 3000, fb: 0 });
	lpParam1.connect(ret.lp1);
	ret.notePos = 100;
	ret.amp = 1;
	ret.note = (freq, amp) => {
		ret.freq.value = freq;
		ret.fb.value = 0.998 - (3/freq);
		ret.notePos = 0;
		ret.amp = amp;
	};
	return ret;
};
const poly = new Poly(6, mkVoice, post);
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
	return d*d*d+1.5;
};
const swell = (t) => {
    let s = t+200/(t+7);
    s = 0.5+Math.cos(s*Math.PI*2/200)*0.5;
    return 1-s*s*s;
};

let freqs;
const setFreqs = () => {
	freqs = mixFreqs(fParam1.value, fParam2.value, 4);
	freqs = freqs.slice(0,scaleLen).sort((a, b) => a - b);
}
seq.schedule(async () => {
	let t = 0;
	let rand = randomSeed(1);
	while (true) {
		if (fParam1.changed() || fParam2.changed()) setFreqs();
		if (t === 200) host.wantInterrupt = true;
		if (t === 400) {
			t = 0;
			rand = randomSeed(1);
		}
		//if (t%5<0.1) console.log('swell = '+Math.round(swell(t)*100)/100)
		if (rand() < density.value)
			poly.note(freqs[arpNote(t+0.1)], arpVel(t+0.1)*swell(t));
		await seq.play(arpDel(t+0.1)*0.05);
		t++;
	}
});

export const process = graph.makeProcessor();
