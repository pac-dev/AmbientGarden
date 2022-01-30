import { TeaNode, describe } from '../nodes/teanode.js';
import { OutputNode, Gain, HostParam } from '../nodes/basic.js';
import { topologicalSort } from './topo.js';
import { mainHost } from '../../host.js';

export class Graph {
	constructor({ sampleRate = 44100, host = mainHost } = {}) {
		this.sampleRate = sampleRate;
		/** @type {import('../../host.js').Host} */
		this.host = host;
		/** @param {import('../../host.js').HostEventType} eventType */
		this.on = (eventType, handler) => this.host.events.on(eventType, handler);
		this.out = new OutputNode();
		/** @type {Array.<TeaNode>} */
		this.sortedNodes;
		/** @type {Array.<function>} */
		this.processors = [];
		/** @type {Set.<function>} */
		this.eventProcessors = new Set();
		this.ready = false;
		this.skipping = false;
		this.skipTgt = 0;
		this.ampParam = this.addParam('amp', { def: 1 });
	}
	addParam(name, { def = 0, min = 0, max = 1 } = {}) {
		const node = new HostParam(name, { def, min, max });
		node.setGraph(this);
		return node;
	}
	makeProcessor() {
		/** @type {Array.<TeaNode>} */
		const allNodes = [];
		/** @param {TeaNode} node */
		const addNode = node => {
			if (allNodes.includes(node)) return;
			node.setGraph(this);
			allNodes.push(node);
			node.inNodes.forEach(inNode => addNode(inNode));
			node.params.forEach(param => {
				if (param.source) addNode(param.source);
			});
		};
		addNode(this.out);
		this.sortedNodes = topologicalSort(allNodes);
		if (this.sortedNodes.length !== allNodes.length) {
			throw new Error('These nodes are... half-connected. It simply should not be.');
		}
		this.host.events.on('can make processors', async () => {
			for (let node of this.sortedNodes) {
				const paramProcessor = node.makeParamProcessor();
				if (paramProcessor) this.processors.push(paramProcessor);
				this.processors.push(node.makeSignalProcessor());
			}
		});
		this.host.events.on('can play', async () => await this.onReady());
		return () => this.process();
	}
	async onReady() {
		this.ready = true;
		if (this.skipTgt) {
			console.log(`Skipping to ${Math.round(this.skipTgt * 100) / 100}...`);
			this.skipping = true;
			let awaits = 0;
			for (let t = 0; t < this.skipTgt * this.sampleRate; t++) {
				this.eventProcessors.forEach(process => process());
				if (!(t % 100)) {
					// you better start believing in fucked up async functions
					awaits += await 1;
					// you're in one
					if (!this.skipping) break;
				}
				if (t && !(t % (this.sampleRate * 10))) {
					console.log(`...skipped ${t / this.sampleRate}s`);
				}
			}
			this.skipping = false;
			console.log(`Caught up ${awaits} times`);
		}
	}
	process() {
		this.eventProcessors.forEach(process => process());
		this.processors.forEach(process => process());
		for (let i = 0; i < this.out.outFrame.length; i++) {
			this.out.outFrame[i] *= this.ampParam.value;
		}
		return this.out.outFrame;
	}
	/**
	 * @param {TeaNode} src
	 * @param {TeaNode|NodeParam} tgt
	 * @returns {Gain}
	 */
	getConnection(src, tgt) {
		const checkMidNode = midNode => {
			if (midNode === src) {
				throw new Error(
					'tried calling getConnection between ' +
						describe(src) +
						' and ' +
						describe(tgt) +
						', but they are directly connected. ' +
						'Connect them using connectWithGain.'
				);
			}
			if (midNode.inNodes.has(src)) {
				const numInNodes = midNode.inNodes.size;
				// hmm, this doesn't work when calling before init
				// const numOutNodes = this.sortedNodes.filter(n => n.inNodes.has(midNode)).length;
				if (numInNodes !== 1) {
					throw new Error(
						'tried calling getConnection between ' +
							describe(src) +
							' and ' +
							describe(tgt) +
							', but the connection includes other nodes.'
					);
				}
				if (!(midNode instanceof Gain)) {
					throw new Error(
						'tried calling getConnection between ' +
							describe(src) +
							' and ' +
							describe(tgt) +
							', but the connection is not a Gain.'
					);
				}
				return midNode;
			}
		};
		if (tgt instanceof TeaNode) {
			for (let midNode of tgt.inNodes) {
				const connection = checkMidNode(midNode);
				if (connection) return connection;
			}
		} else if (tgt instanceof NodeParam && tgt.source) {
			const connection = checkMidNode(tgt.source);
			if (connection) return connection;
		} else {
			throw new Error(`Can't get connection from ${describe(src)} to ${describe(tgt)}!`);
		}
		throw new Error(`Can't get connection from ${describe(src)} to ${describe(tgt)}!`);
	}
	ctrl(fn, rate = 128) {
		let sample = 0;
		this.eventProcessors.add(() => {
			if (sample++ % rate) return;
			const sec = sample / this.sampleRate;
			fn(sec);
		});
	}
	ctrlDuration(dur, fn) {
		let sample = 0;
		const evt = () => {
			if (sample++ % 128) return;
			const sec = sample / this.sampleRate;
			if (sec > dur) this.eventProcessors.delete(evt);
			else fn(sec);
		};
		this.eventProcessors.add(evt);
	}
	/**
	 * @param {TeaNode} src
	 * @param {TeaNode|NodeParam} tgt
	 */
	muteConnection(src, tgt) {
		this.getConnection(src, tgt).gain.value = 0;
	}
	/**
	 * @param {TeaNode} src
	 * @param {TeaNode|NodeParam} tgt
	 */
	unmuteConnection(src, tgt) {
		this.getConnection(src, tgt).gain.value = 1;
	}
	skipToMarker(id) {
		this.wantMarker = id;
		this.skipTgt = 10 * 60 * 48000;
	}
	skipToSecond(s) {
		this.skipTgt = s;
	}
	setMarker(id) {
		if (id === this.wantMarker) {
			this.skipping = false;
		}
	}
}
