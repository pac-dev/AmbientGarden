import { Gain } from './basic.js';

/**
 * Parent class for audio nodes. This is NOT a Web Audio Node managed by the
 * browser, it exists purely in JS. Extend this class to create specific nodes.
 *
 * - Overriding the constructor is a good way to take parameters.
 *
 * - The default I/O channels are 1/1. This can be changed in `init` or
 * in the constructor, where they can be hardcoded or taken as parameters.
 *
 * - The process method should take one frame and return one frame.
 *
 * - The graph and sampleRate properties are available during or after `init`
 */
export class TeaNode {
	constructor() {
		this.numInChannels = 1;
		this.numOutChannels = 1;
		/**
		 * Only available during or after init.
		 * @type {import('../patch/graph.js').Graph}
		 */
		this.graph;
		/**
		 * Only available during or after init.
		 * @type {import('../../host.js').Host}
		 */
		this.host;
		/**
		 * Only available during or after `init`.
		 * @type {Number}
		 */
		this.sampleRate;
		/** @type {Set.<TeaNode>} */
		this.inNodes = new Set();
		/** @type {Array.<NodeParam>} */
		this.params = [];
		this.playing = true;
		this.outFrame = [0];
		this.topoDone = false;
		this.topoCycle = false;
		this.handlers = {};
		if (this.ctrlRateProcess) {
			let ctr = 127;
			const ctrlRateProcess = this.ctrlRateProcess.bind(this);
			const audioRateProcess = this.process.bind(this);
			this.process = frame => {
				if (++ctr > 127) ctr = 0;
				if (!ctr) ctrlRateProcess();
				return audioRateProcess(frame);
			};
		}
	}
	/**
	 * @param {TeaNode|NodeParam} target
	 * @returns TeaNode
	 */
	connect(target) {
		if (this.graph && this.graph.ready)
			throw new Error("Can't connect nodes after graph is initialized! Node: " + this.describe());
		if (target instanceof TeaNode) {
			target.inNodes.add(this);
			return target;
		} else if (target instanceof NodeParam) {
			if (target.source) throw new Error('Tried connecting twice to ' + describe(target.owner));
			target.source = this;
			return target.owner;
		} else {
			throw new Error(`Can't connect "${this.describe()}" to "${target}"`);
		}
	}
	/**
	 * @param {TeaNode|NodeParam} target
	 * @returns TeaNode
	 */
	connectWithGain(target, initialGain = 1) {
		return this.connect(new Gain(initialGain)).connect(target);
	}
	/**
	 * @param {Array.<Number>} frame
	 * @returns {Array.<Number>}
	 */
	process(frame) {
		return frame;
	}
	/** Optionally override this for initialization. */
	init() {}
	/**
	 * When there are multiple input nodes, this method is called to combine
	 * their frames before `process` is called. Frames are normalized to
	 * this.numInChannels.
	 * @param {Array.<Array.<Number>>} frames
	 * @returns {Array.<Number>}
	 */
	mix(frames) {
		// assuming a loop is faster than a functional approach
		const ret = Array(this.numInChannels).fill(0);
		for (let chani = 0; chani < this.numInChannels; chani++) {
			for (let framei = 0; framei < frames.length; framei++) {
				ret[chani] += frames[framei][chani];
			}
			ret[chani] /= this.numInChannels;
		}
		return ret;
	}
	/**
	 * Create automatable parameter.
	 */
	addParam(value = 0) {
		if (this.graph && this.graph.ready)
			throw new Error("Can't add param after graph is initialized! Node: " + this.describe());
		const param = new NodeParam(this, value);
		this.params.push(param);
		return param;
	}
	/**
	 * Call in `init` to match this node's channel count to its inputs.
	 */
	useInputChannelCount() {
		if (!this.inNodes.size) {
			this.numInChannels = this.numOutChannels;
			return;
		}
		const nChannels = Math.max(...[...this.inNodes].map(n => n.numOutChannels));
		this.numInChannels = nChannels;
		this.numOutChannels = nChannels;
	}
	/** @param {import('../patch/graph.js').Graph} graph */
	baseInit(graph) {
		this.graph = graph;
		this.sampleRate = graph.sampleRate;
	}
	stop() {
		this.stoppedProcess = this.process;
		this.process = () => Array(this.numOutChannels).fill(0);
		this.playing = false;
	}
	start() {
		if (this.playing || !this.stoppedProcess)
			throw new Error(`Tried starting ${this.describe}, but it wasn't stopped!`);
		this.process = this.stoppedProcess;
		this.playing = true;
	}
	makeSignalProcessor() {
		this.inNodes.forEach(inNode => checkConnectionValid(inNode, this));
		const numInNodes = this.inNodes.size;
		if (!numInNodes) {
			const makeInFrame = () => Array(this.numInChannels).fill(0);
			return () => {
				this.outFrame = this.process(makeInFrame());
			};
		}
		const in0 = [...this.inNodes][0];
		if (numInNodes === 1 && in0.numOutChannels === this.numInChannels) {
			return () => {
				this.outFrame = this.process(in0.outFrame);
			};
		} else if (numInNodes === 1) {
			const adapter = makeFrameAdapter(in0, this);
			return () => {
				this.outFrame = this.process(adapter());
			};
		} else {
			const adapters = [...this.inNodes].map(inNode => makeFrameAdapter(inNode, this));
			return () => {
				const frames = adapters.map(adapter => adapter());
				const mixedFrame = this.mix(frames);
				this.outFrame = this.process(mixedFrame);
			};
		}
	}
	makeParamProcessor() {
		const connectedParams = this.params.filter(p => p.source);
		if (!connectedParams.length) return;
		return () => {
			for (const param of connectedParams) {
				param.value = param.source.outFrame[0];
			}
		};
	}
	/** @param { import('../../host.js').HostEventType } eventType */
	on(eventType, handler) {
		const handlers = this.handlers[eventType] ?? (this.handlers[eventType] = new Set());
		handlers.add(handler);
		if (this.host) this.host.events.on(eventType, handler);
	}
	setGraph(graph) {
		if (this.graph) return;
		this.graph = graph;
		this.host = graph.host;
		this.sampleRate = graph.sampleRate;
		for (const [eventType, handlers] of Object.entries(this.handlers)) {
			for (const handler of handlers) {
				this.host.events.on(eventType, handler);
			}
		}
	}
	describe() {
		return this.constructor.name;
	}
}

// Pluggable parameter for nodes. Gets created by TeaNode::addParam
export class NodeParam {
	/**
	 * @param {TeaNode} owner
	 * @param {Number} value
	 */
	constructor(owner, value) {
		this.owner = owner;
		this.value = value;
		/** @type {TeaNode} */
		this.source;
	}
	describe() {
		return 'parameter of ' + this.owner;
	}
}

export const describe = thing => {
	if (thing.describe) return thing.describe();
	else return thing;
};

/**
 * @param {TeaNode} srcNode
 * @param {TeaNode} tgtNode
 */
const checkConnectionValid = (srcNode, tgtNode) => {
	const msgBase = `Can't connect "${describe(srcNode)}" to "${describe(tgtNode)}": `;
	const numSrc = srcNode.numOutChannels;
	const numTgt = tgtNode.numInChannels;
	if (!numSrc) throw new Error(msgBase + 'source node has 0 output channels');
	else if (!numTgt) throw new Error(msgBase + 'target node has 0 input channels');
	else if (numSrc > 1 && numTgt > 1 && numSrc !== numTgt) {
		throw new Error(msgBase + `can't auto-adapt ${numSrc} channels to ${numTgt} channels`);
	}
};

/**
 * @param {TeaNode} srcNode
 * @param {TeaNode} tgtNode
 */
const makeFrameAdapter = (srcNode, tgtNode) => {
	const numSrc = srcNode.numOutChannels;
	const numTgt = tgtNode.numInChannels;
	if (numSrc === numTgt) {
		return () => srcNode.outFrame;
	} else if (numSrc === 1) {
		return () => Array(numTgt).fill(srcNode.outFrame[0]);
	} else if (numTgt === 1) {
		return () => {
			// assuming a loop is faster than a functional approach
			let ret = 0;
			for (let i = 0; i < numSrc; i++) ret += srcNode.outFrame[i];
			return [ret / numSrc];
		};
	} else {
		throw new Error('Unhandled invalid connection from ' + `"${describe(srcNode)}" to "${describe(tgtNode)}"`);
	}
};
