import { Graph, Seq, FaustNode, CtrlSine, SampleProcessor } from '../_lib/tealib.js';
import { mixFreqs } from '../fraclib.js';

host.willInterupt = true;
export const sampleRate = 44100;
const graph = new Graph({sampleRate});

const fau = new FaustNode('faust/voide.dsp', {f1: 0, noise: 0, saw: 0});
const post = new FaustNode('faust/post.dsp');
fau.connect(post).connect(graph.out);

const fParam1 = graph.addParam('freq1', {def: 800, min: 50, max: 2000});
const fParam2 = graph.addParam('freq2', {def: 900, min: 50, max: 2000});
let mfs = mixFreqs(fParam1.value, fParam2.value, 6);
mfs = mfs.filter(f => f > 350 && f < 1000);
if (mfs.length > 6) mfs.length = 6;
mfs.sort((a, b) => b - a);
const freqs = [];
for (let i = 0; i < mfs.length; i += 2) freqs.push(mfs[i]);
freqs.reverse();
for (let i = 1; i < mfs.length; i += 2) freqs.push(mfs[i]);
let freqi = 0;

const note0 = freqs[0]*0.75;
let freq = note0, fTgt = note0, fChange = 1;
let press = 0, pressTgt = 0;
const vibNode = new CtrlSine();
vibNode.connect(new SampleProcessor(v => (1 + v * 0.02) * freq)).connect(fau.f1);
graph.ctrl(t => {
    const fDif = (fTgt - freq) * 0.03;
    const fAbs = Math.abs(fDif);

    if (fAbs > fChange) fChange += (fAbs - fChange) * 0.1;
    else fChange += (fAbs - fChange) * 0.007;
    if (fChange > 1) fChange = 1;

    if (pressTgt > press) press += (pressTgt - press) * 0.02;
    else press += (pressTgt - press) * 0.002;

    freq += fDif;
    vibNode.freq.value = 3 + Math.sqrt(fChange) * 4;
    vibNode.amp.value = 1 - fChange;
    fau.noise.value = fChange * 0.2 + 0.2;
    fau.noise.value *= press;
    fau.saw.value = (1 - fChange) * 0.2 + 0.15;
    fau.saw.value *= press * press;
});
const seq = new Seq(graph);
seq.schedule(async () => {
    while(true) {
        pressTgt = 1;
        fTgt = freqs[freqi];
        await seq.play(3);
        fTgt = freqs[(freqi + 1) % freqs.length];
        await seq.play(3);
        fTgt = freqs[freqi];
        await seq.play(3);
        pressTgt = 0;
        await seq.play(1);
        if (freqi === 1) host.wantInterrupt = true;
        await seq.play(2);
        freqi = (freqi + 1) % freqs.length;
        fTgt = freqs[freqi]*0.75;
        await seq.play(1);
    }
});

export const process = graph.makeProcessor();