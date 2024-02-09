import { Graph, FaustNode, Seq, LinSmooth } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });


// Create some nodes: Faust instrument and post-processing
const a0 = 0;
const fau = new FaustNode('faust/modal.dsp', { freq: 1, mode0: a0, mode1: a0, mode2: a0, mode3: a0, mode4: a0 });
const post = new FaustNode('faust/post.dsp', { preamp: 1 });
fau.connect(post);
post.connect(graph.out);

// Parameters to control the patch: amp, fundamental frequency
graph.addParam('preamp', { def: 1 }).connect(new LinSmooth(0.00001)).connect(post.preamp);
graph.addParam('freq1', { def: '100*4' }).connect(fau.freq);
// Performance parameters: strum the individual modes
const interval = graph.addParam('interval', {min: -1});
const iniStrum = graph.addParam('inistrum');

// Get the Faust parameters for individual modes as an array
const modes = [];
for (let i=0; i<5; i++) modes.push(fau['mode'+i]);

// At control rate, add decay to each mode
graph.ctrl(tSec => {
	if (tSec > 12) graph.setSplicePoint('intro');
	if (tSec > 30) graph.setSplicePoint('loop');
	modes.forEach((m,i) => { m.value *= 0.99; });
});

// Utility to strum the modes
const seq = new Seq(graph);
const strum = async ({interval, amp}) => {
	const dir = Math.sign(interval) || 1;
	interval = Math.abs(interval);
	let i = dir > 0 ? 0 : modes.length - 1;
	while (modes[i] !== undefined) {
		modes[i].value = dir > 0 ? amp*(i+1)/(modes.length) : amp;
		if (i < fau.freq.value/150) modes[i].value *= 0.3;
		await seq.play(interval);
		i += dir;
	}
};

// At control rate, play the initial strum then randomly trigger modes
seq.schedule(async () => {
	if (iniStrum.value) {
		/* await */ strum({interval: 0.5, amp: 0.4});
		await seq.play(4);
	}
	/* await */ strum({interval: interval.value*0.1, amp: 1});
	graph.ctrl(t => {
		modes.forEach((m,i) => {
			if (Math.random() < 0.001) {
				m.value = Math.max(m.value, Math.random()*0.3);
				if (i < fau.freq.value/150) m.value *= 0.3;
			}
		});
	});
});

export const process = graph.makeProcessor();
