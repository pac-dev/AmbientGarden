import { Graph, Seq, FaustNode, SampleProcessor } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({sampleRate});

const fau = new FaustNode('faust/reso.dsp', {lp1: 1, f1: 1, f2: 1, f3: 1, pulse: 1, noise: 1});
const post = new FaustNode('faust/post.dsp');
fau.connect(post).connect(graph.out);

const impact = graph.addParam('impact');
const ofs = graph.addParam('ofs', {def : 0.09});
const mulOfs = mul => new SampleProcessor(x => x * (1+ofs.value*mul*0.1));
graph.addParam('freq1', {def: 100, min: 30, max: 330}).connect(fau.f1);
graph.addParam('freq2', {def: 175, min: 30, max: 330}).connect(mulOfs(-1)).connect(fau.f2);
graph.addParam('freq3', {def: 50, min: 30, max: 330}).connect(mulOfs(1)).connect(fau.f3);

graph.ctrlDuration(1, t => {fau.pulse.value = Math.max(0, 1/(t+1)-1/1.51)*impact.value});
graph.ctrl(t => {fau.lp1.value = 100+(350+150*Math.cos(t*0.25))*(1-1/(t*t*(0.07-impact.value*0.03)+1))});

export const process = graph.makeProcessor();