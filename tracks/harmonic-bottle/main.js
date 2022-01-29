import { Graph, FaustNode, Seq, Poly } from '../_lib/tealib.js';
import { mainHost as host } from '../host.js';
import { mixFreqs } from '../fraclib.js';

host.willInterupt = true;
export const sampleRate = 44100;
const graph = new Graph({sampleRate});

const fParam1 = graph.addParam('freq1', {def: 400, min: 50, max: 2000});
const fParam2 = graph.addParam('freq2', {def: 600, min: 50, max: 2000});
const hiLen = graph.addParam('hilen', {def: 9, min: 5, max: 105});

const post = new FaustNode('faust/post.dsp');
const mkVoice = i => {
    const ret = new FaustNode('faust/bottle.dsp', {freq: 500, noise: 0});
    ret.notePos = 100;
    ret.amp = 1;
    ret.note = (freq, amp) => {
        ret.freq.value = freq;
        ret.notePos = 0;
        ret.amp = amp;
    }
    return ret;
};
const poly = new Poly(3, mkVoice, post);
const pulse = (k, x) => Math.max(0, 2*Math.sqrt(k)*x/(1+k*x*x) - x*0.1);
graph.ctrl(tSeconds => {
    poly.forEach(voice => {
        voice.notePos += 0.002;
        voice.noise.value = pulse(20, voice.notePos)*voice.amp;
    });
});
let spliceFreq, noteN = 0;

post.connect(graph.out);
const evil = (a, b) => Math.max(a, b) / Math.min(a, b) < 10/9;
let intro = 3;
const seq = new Seq(graph);
seq.schedule(async () => {
    const mfs = mixFreqs(fParam1.value, fParam2.value, 6);
    let flowlen = 3, flowdir = 2;
    while(true) {
        const ofs = Math.floor((flowlen-2)*0.13);
        let freqs = mfs.filter((_, i) => i >= ofs && i < (flowlen + ofs) && !(i % 2));
        freqs.push(...mfs.filter((_, i) => i >= ofs && i < (flowlen + ofs) && (i % 2)).reverse());
        freqs = freqs.filter((f,i) => i<3 || !evil(f, freqs[i-1]));
        for (let fpos = 0; fpos < flowlen * 2; fpos++) {
            intro = Math.max(intro - 0.5, 0);
            poly.note(freqs[fpos % freqs.length], (0.2 + 0.8/(fpos+1)));
            await seq.play(0.3 + 2 / (flowlen*0.5 + 5) + Math.round(intro));
            if (noteN++ > 15 && fpos % 2 && spliceFreq === freqs[fpos % freqs.length]) {
                noteN = 0;
                host.wantInterrupt = true;
            }
            if (noteN > 10 && !spliceFreq && fpos % 2) {
                noteN = 0;
                spliceFreq = freqs[fpos % freqs.length];
                host.wantInterrupt = true;
            }
            await seq.play(fpos % 2);
        }
        if (flowdir > 0 && flowlen >= hiLen.value) flowdir = -flowdir;
        if (flowdir < 0 && flowlen <= 3) flowdir = -flowdir;
        flowlen += flowdir;
    }
});

export const process = graph.makeProcessor();