import { Graph, Seq, FaustNode, AREnv, Metronome } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({ sampleRate });

const fau = new FaustNode('faust/toll.dsp', { freq: 100, noise: 0 });
const post = new FaustNode('faust/post.dsp');
graph.addParam('freq1', { def: 300, min: 20, max: 1000 }).connect(fau.freq);
fau.connect(post).connect(graph.out);
new Metronome({bpm: 12})
	.connect(new AREnv({attack: 0.005, release: 0.1}))
	.connect(fau.noise);

export const process = graph.makeProcessor();
