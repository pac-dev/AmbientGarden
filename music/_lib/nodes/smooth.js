import { SampleProcessor } from './basic.js';

// Non-node-based smoothing that can be used internally by a class
export class PrivateSmooth {
	/** @param {import('./teanode.js').NodeParam} param */
	constructor(param, { init = param.value, speed = 0.01 } = {}) {
		this.param = param;
		this.tgt = init;
		this.speed = speed;
	}
	reset(val = this.tgt) {
		this.param.value = val;
	}
	go(tgt, speed = this.speed) {
		this.tgt = tgt;
		this.speed = speed;
	}
	process() {
		const dif = this.tgt - this.param.value;
		if (Math.abs(dif) < this.speed * 1.5) this.param.value = this.tgt;
		else this.param.value += Math.sign(dif) * this.speed;
	}
	get value() {
		return this.param.value;
	}
}

// Linear smoothing node with fixed speed
export class LinSmooth extends SampleProcessor {
	constructor(speed = 0.01) {
		super();
		this.speed = speed;
	}
	processSample(s) {
		if (this.val === undefined) this.val = s;
		const dif = s - this.val;
		if (Math.abs(dif) < this.speed * 1.5) this.val = s;
		else this.val += Math.sign(dif) * this.speed;
		return this.val;
	}
}

const watcher = () => {
	let lastValue;
	return (newValue) => {
		const changed = (lastValue !== undefined) && (newValue !== lastValue);
		lastValue = newValue;
		return changed;
	};
};

/**
 * Fixed duration smoothing node. Whenever the input changes, the output will
 * take `duration` seconds to reach the new value. Useful for sequencing slides
 * with exact durations.
 */
export class DurSmooth extends SampleProcessor {
	constructor(duration = 1) {
		super();
		this.duration = this.addParam((typeof duration === 'number') ? duration : 1);
		if (typeof duration === 'object') duration.connect(this.duration);
		this.durChanged = watcher();
		this.inChanged = watcher();
		this.x = 0;
		this.xmax = 0;
	}
	processSample(s) {
		if (this.durChanged(this.duration.value) || this.inChanged(s)) {
			this.src = this.value;
			this.tgt = s;
			this.x = 0;
			this.xmax = this.duration.value * this.sampleRate;
		}
		this.x++;
		if (this.x >= this.xmax) this.value = s;
		else this.value = this.src + (this.tgt - this.src) * (this.x / this.xmax);
		return this.value;
	}
}