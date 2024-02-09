import { TeaNode } from './teanode.js';

// White noise node
export class Noise extends TeaNode {
	constructor({ amp = 1 } = {}) {
		super();
		this.amp = this.addParam(amp);
	}
	process() {
		return [(Math.random() - 0.5) * this.amp.value];
	}
}

const tau = 2 * Math.PI;

// Sine wave node
export class Sine extends TeaNode {
	constructor({ amp = 1, freq = 440, phase = 0 } = {}) {
		super();
		this.amp = this.addParam(amp);
		this.freq = this.addParam(freq);
		this.pos = phase / tau;
	}
	process() {
		this.pos += (this.freq.value * tau) / this.sampleRate;
		if (this.pos > tau) this.pos -= tau;
		return [Math.sin(this.pos) * this.amp.value];
	}
}

// Control-rate sine wave (LFO) node
export class CtrlSine extends TeaNode {
	constructor({ amp = 1, freq = 440, phase = 0 } = {}) {
		super();
		this.amp = this.addParam(amp);
		this.freq = this.addParam(freq);
		this.pos = phase / tau;
		this.ctrlOut = 0;
	}
	ctrlRateProcess() {
		this.pos += ((this.freq.value * tau) / this.sampleRate) * 128;
		if (this.pos > tau) this.pos -= tau;
		this.ctrlOut = Math.sin(this.pos) * this.amp.value;
	}
	process() {
		return [this.ctrlOut];
	}
}

// Polyphonic node with managed voices
export class Poly {
	constructor(n, makeVoice, out) {
		this.voices = [...Array(n).keys()].map(makeVoice);
		this.voices.forEach(v => v.connect(out));
		this.order = [...Array(n).keys()];
	}
	note(freq, ...args) {
		const vn = this.order.pop();
		this.voices[vn].note(freq, ...args);
		this.voices[vn].polyFreq = freq;
		this.order.unshift(vn);
	}
	off(freq) {
		for (const voice of this.voices) {
			if (!voice.polyFreq) continue;
			if (!freq || voice.polyFreq === freq) {
				voice.off();
				voice.polyFreq = 0;
			}
		}
	}
	forEach(fn) {
		this.voices.forEach(fn);
	}
}

// Metronome node that sends a "1" value regularly
export class Metronome extends TeaNode {
	constructor({ bpm }) {
		super();
		this.bpm = bpm;
		this.on('got host', () => {
			this.sampleInterval = (this.sampleRate * 60) / this.bpm;
			this.sampleCounter = this.sampleInterval - 0.5;
		});
	}
	process() {
		this.sampleCounter++;
		if (this.sampleCounter >= this.sampleInterval) {
			this.sampleCounter -= this.sampleInterval;
			return [1];
		} else {
			return [0];
		}
	}
}

// Attack-Release Envelope node
export class AREnv extends TeaNode {
	constructor({ attack, release }) {
		super();
		this.attack = attack;
		this.release = release;
		this.on('got host', () => {
			this.attSamples = this.attack * this.sampleRate;
			this.relSamples = this.release * this.sampleRate;
			this.attPos = this.attSamples;
			this.relPos = this.relSamples;
		});
	}
	process(trig) {
		if (trig[0]) {
			this.attPos = 0;
			this.relPos = 0;
		}
		if (this.attPos < this.attSamples) {
			const ret = this.attPos / this.attSamples;
			this.attPos++;
			return [ret * ret * ret];
		} else if (this.relPos < this.relSamples) {
			const ret = 1 - this.relPos / this.relSamples;
			this.relPos++;
			return [ret * ret * ret];
		} else {
			return [0];
		}
	}
}
