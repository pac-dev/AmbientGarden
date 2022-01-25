import { Graph, Seq, FaustNode } from '../_lib/tealib.js';

export const sampleRate = 44100;
const graph = new Graph({sampleRate});

const fau = new FaustNode('faust/harmo.dsp', {fb: 0, amp: 1, sdelay1: 1, sdelay2: 1, locut: 1, hicut: 1});
fau.connect(graph.out);

const f1param = graph.addParam('freq1', {def: 80, min: 60, max: 120});
// const f2param = graph.addParam('freq2', {def: 300, min: 200, max: 1200});
const harmo = { value: 4 };

const sDelay = f => {
    f += (0.16*f*f) / (fau.locut.value + fau.hicut.value);
    return ((sampleRate * 1.011) / f) - 1;
};

graph.ctrl(sec => {
    const lfo = 1 + 0.01 * Math.sin(sec*Math.PI*2*4);
    // const f2 = f2param.value;
    const f2 = f1param.value * harmo.value;
    fau.locut.value = 0.4 * f2 * (1-1/(f2*f2*0.00002+1));
    fau.hicut.value = f2 * 1.3;
    fau.sdelay1.value = sDelay(f1param.value);
    fau.sdelay2.value = sDelay(f2) * lfo;
});

const gold = 0.382;
let inc = 0;
const movement = () => {
    inc = (inc + gold) % 0.99;
    return Math.floor(inc * (9 - 4 + 1) + 4);
};
const seq = new Seq(graph);
const slide = async () => {
    const dur = Math.random()*4 + 1;
    seq.ctrlSlide({dur, param: harmo, endVal: movement(), type: 'cos'});
    await seq.play(dur + 0.1);
    return dur;
};
seq.schedule(async () => {
    while (true) {
        harmo.value = movement();
        seq.ctrlSlide({dur: 0.5, param: fau.fb, endVal: 0.8});
        let dur = Math.random(3) + 3;
        while (dur > 0) {
            dur -= await slide();
        }
        seq.ctrlSlide({dur: 2, param: fau.fb, endVal: 0});
        await seq.play(5);
    }
});

export const process = graph.makeProcessor();