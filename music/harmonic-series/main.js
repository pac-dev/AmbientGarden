/**
 * Harmonic series synth.
 * 
 * This patch uses a waveguide model to play natural harmonics. The notes are
 * not sequenced, rather, a single note is effectively played, and a sweeping
 * filter inside the waveguide causes successive harmonics to resonate. Similar
 * to the "harmonic flute" described in: https://www.osar.fr/notes/waveguides/
 * 
 * Audio-rate code is written in Faust and can be found in the faust directory.
 * 
 * This file contains envelopes, automation, and other control code.
 */

import { Graph, Seq, FaustNode } from '../_lib/tealib.js';
import { randomSeed } from '../_lib/math.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

// Create a Faust node running all the audio-rate code
// "sdelay"s are delay line lengths in samples
const fau = new FaustNode('faust/harmo.dsp', { fb: 0, amp: 1, preamp: 1, sdelay1: 1, sdelay2: 1, locut: 1, hicut: 1 });
fau.connect(graph.out);

// Parameters to control the patch: amplitude and frequency
graph.addParam('preamp', { def: 1 }).connect(fau.preamp);
const f1param = graph.addParam('freq1', { def: '100' });
const harmo = { value: 4 };

// Convert frequency to delay line length, compensating for filters in the waveguide
const sDelay = f => {
	f += (0.16 * f * f) / (fau.locut.value + fau.hicut.value);
	return (sampleRate * 1.011) / f - 1;
};

// At control rate, set the tremolo and filters
graph.ctrl(tSec => {
	if (tSec > 12) graph.setSplicePoint('intro');
	if (tSec > 30) graph.setSplicePoint('loop');
	const lfo = 1 + 0.01 * Math.sin(tSec * Math.PI * 2 * 4);
	// const f2 = f2param.value;
	const f2 = f1param.value * harmo.value;
	fau.locut.value = 0.4 * f2 * (1 - 1 / (f2 * f2 * 0.00002 + 1));
	fau.hicut.value = f2 * 1.3;
	fau.sdelay1.value = sDelay(f1param.value);
	fau.sdelay2.value = sDelay(f2) * lfo;
});

// Create pseudorandom slides from one frequency to another
const gold = 0.382;
let inc = 0;
const rand = randomSeed(1);
const movement = () => {
	inc = (inc + gold) % 0.99;
	return Math.floor(inc * (9 - 4 + 1) + 4);
};
const seq = new Seq(graph);
const slide = async () => {
	const dur = rand() * 4 + 1;
	seq.ctrlSlide({ dur, param: harmo, endVal: movement(), type: 'cos' });
	await seq.play(dur + 0.1);
	return dur;
};
seq.schedule(async () => {
	while (true) {
		harmo.value = movement();
		seq.ctrlSlide({ dur: 0.5, param: fau.fb, endVal: 0.8 });
		let dur = rand(3) + 3;
		while (dur > 0) {
			dur -= await slide();
		}
		seq.ctrlSlide({ dur: 2, param: fau.fb, endVal: 0 });
		await seq.play(5);
	}
});

export const process = graph.makeProcessor();
