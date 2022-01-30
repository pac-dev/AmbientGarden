import { TeaNode } from './teanode.js';
import { Graph } from '../track/graph.js';

/**
 * A single OutputNode should be accessible as Graph::out.
 */
export class OutputNode extends TeaNode {
	constructor(fn) {
		super();
		this.on('can deduce channels', () => {
			for (let node of this.inNodes) {
				if (node.numOutChannels === 2) {
					this.numInChannels = 2;
					this.numOutChannels = 2;
				}
			}
		});
	}
	describe() {
		return 'output';
	}
}

/**
 * Extend this class to process audio per-sample without state.
 * `processSample` will be applied to every sample of every incoming channel.
 * The default I/O channels are based on the connected input nodes.
 * Use this for effects like distortion, amplitude, etc.
 */
export class SampleProcessor extends TeaNode {
	constructor(fn) {
		super();
		if (fn) this.processSample = fn;
		this.on('can deduce channels', () => this.useInputChannelCount());
	}
	/**
	 * Override this to process audio.
	 * @param {Number} sample
	 */
	processSample(sample) {
		return sample;
	}
	/**
	 * @param {Array.<Number>} frame
	 * @returns {Array.<Number>}
	 */
	process(frame) {
		return frame.map(s => this.processSample(s));
	}
}

/**
 * Extend this class to combine samples from each input node.
 * mixSamples is called for each channel, and gets one sample per
 * input node.
 * The default I/O channels are based on the connected input nodes.
 * Use this for operators like multiply, etc.
 */
export class SampleMixer extends TeaNode {
	constructor() {
		super();
		this.on('can deduce channels', () => this.useInputChannelCount());
	}
	/**
	 * Override this to mix audio.
	 * @param {Array.<Number>} inputs
	 */
	mixSamples(inputs) {
		return inputs.reduce((a, b) => a + b, 0);
	}
	/**
	 * @param {Array.<Array.<Number>>} frames
	 * @returns {Array.<Number>}
	 */
	mix(frames) {
		const ret = Array(this.numInChannels);
		for (let chani = 0; chani < this.numInChannels; chani++) {
			ret[chani] = this.mixSamples(frames.map(f => f[chani]));
		}
		return ret;
	}
}

/**
 * Extend this class to process audio per-sample with state.
 * `processChannel` will be applied to every incoming channel.
 * For example: delay, filters, etc.
 * Override `initChannel` instead of `init`.
 */
export class ChannelProcessor extends TeaNode {
	constructor() {
		super();
		this.on('can deduce channels', () => {
			this.useInputChannelCount();
			this.channelStates = Array.from({ length: this.numInChannels }, () => {});
		});
	}
	/**
	 * Override this to process audio. Store state in the channel object.
	 * @param {Object} channel
	 * @param {Number} sample
	 */
	processChannel(channel, sample) {
		return sample;
	}
	/**
	 * Override to initialize state. Store state in the channel object.
	 * @param {Object} channel
	 */
	initChannel(channel) {}
	/** @param {Graph} graph */
	baseInit(graph) {
		super.baseInit(graph);
		this.useInputChannelCount();
	}
	/**
	 * @param {Array.<Number>} frame
	 * @returns {Array.<Number>}
	 */
	process(frame) {
		return this.channelStates.map((cs, idx) => this.processChannel(cs, frame[idx]));
	}
}

/**
 * Gain nodes can be created directly, or are automatically inserted
 * when calling node1.connectWithGain(node2). Gain nodes with 1 input
 * node and 1 output node are `connection nodes`, and are expected by
 * Graph convenience methods (get/mute/unmute)Connection.
 */
export class Gain extends SampleProcessor {
	/**
	 * @param {Number} initialGain
	 */
	constructor(initialGain = 1) {
		super();
		this.gain = this.addParam(initialGain);
	}
	processSample(s) {
		return s * this.gain.value;
	}
}

export class Mul extends SampleMixer {
	mixSamples(inputs) {
		return inputs.reduce((a, b) => a * b);
	}
}

export class NumNode extends TeaNode {
	constructor(initValue = 0) {
		super();
		this.num = this.addParam(initValue);
		this.bangin = false;
	}
	bang() {
		this.bangin = true;
	}
	process() {
		if (this.bangin) {
			this.bangin = false;
			return [1];
		}
		return [this.num.value];
	}
}

export class HostParam extends TeaNode {
	constructor(name, { def = 0, min = 0, max = 1 } = {}) {
		super();
		this.value = def;
		const setFn = value => {
			this.value = value;
			this.host.params[name].val = value;
		};
		this.on('got host', () => {
			this.host.params[name] = { setFn, def, min, max };
		});
	}
	process() {
		return [this.value];
	}
}
