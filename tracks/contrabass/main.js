import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fau = new FaustNode('faust/contrabass.dsp', { freq: 0, noise1: 0, noise2: 0, lp1: 3300, lp2: 580 });
const post = new FaustNode('faust/post.dsp');
fau.connect(post).connect(graph.out);

graph.addParam('freq1', { def: 50, min: 20, max: 200 }).connect(fau.freq);
const flatten = graph.addParam('flatten');
graph.addParam('lp1', { def: 3300, min: 100, max: 10000 }).connect(fau.lp1);

let smoothFlat;
graph.ctrl(t => {
	smoothFlat = flatten.value * (1 - 1 / (t * t * 0.15 + 1));
});

const playWave = (param, amp) => {
	graph.ctrlDuration(Math.PI * 2, sec => {
		param.value = (0.5 - Math.cos(sec) * 0.5) * amp;
		param.value = 0.3 * smoothFlat + param.value * (1 - smoothFlat);
	});
};

let hiAmps = [0.1, 0.3, 0.6, 0.4];
let lp2s = [580, 750, 650, 1200];
const seq = new Seq(graph);
seq.schedule(async () => {
	while (true) {
		fau.lp2.value = lp2s[0];
		playWave(fau.noise1, 0.3);
		await seq.play(2);
		playWave(fau.noise2, hiAmps[0]);
		await seq.play(Math.PI * 2 - 2 + 0.5);
		hiAmps = [...hiAmps.slice(1), hiAmps[0]];
		lp2s = [...lp2s.slice(1), lp2s[0]];
	}
});
export const process = graph.makeProcessor();
