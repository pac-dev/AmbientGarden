import { NodeParam } from './params.js';
import { SampleProcessor } from './basic.js';

export class PrivateSmooth {
    /** @param {NodeParam} param */
    constructor(param, {init=param.value, speed=0.01}={}) {
        this.param = param;
        this.tgt = init;
        this.speed = speed;
    }
    reset(val=this.tgt) {
        this.param.value = val;
    }
    go(tgt, speed=this.speed) {
        this.tgt = tgt;
        this.speed = speed;
    }
    process() {
        const dif = this.tgt - this.param.value;
        if (Math.abs(dif) < this.speed*1.5) this.param.value = this.tgt;
        else this.param.value += Math.sign(dif) * this.speed;
    }
    get value() {
        return this.param.value;
    }
}

export class LinSmooth extends SampleProcessor {
    constructor(speed=0.01) {
        super();
        this.speed = speed;
    }
    processSample(s) {
        if (this.val === undefined) this.val = s;
        const dif = s - this.val;
        if (Math.abs(dif) < this.speed*1.5) this.val = s;
        else this.val += Math.sign(dif) * this.speed;
        return this.val;
    }
}