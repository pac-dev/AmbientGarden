import { TeaNode, NodeParam } from '../nodes/teanode.js';
import { playTable } from './seqTable.js';

// Sequencer class using async/await
export class Seq {
	/**
	 * @param {import('./graph.js').Graph} graph
	 */
	constructor(graph) {
		this.graph = graph;
		this.timeError = 0;
	}
	/**
	 * @param {function():Promise} cb
	 */
	schedule(cb) {
		const wrap = async () => {
			await cb();
			console.log('Sequence finished playing.');
		};
		const startProcessor = () => {
			wrap();
			this.graph.eventProcessors.delete(startProcessor);
		};
		this.graph.eventProcessors.add(startProcessor);
	}
	/**
	 * @param {function():Promise} cb
	 */
	solo(cb) {
		const wrap = async () => {
			if (cb.then) {
				while (true) await cb();
			} else {
				cb();
			}
		};
		const startProcessor = () => {
			wrap();
			this.graph.eventProcessors.delete(startProcessor);
		};
		this.graph.eventProcessors.clear();
		this.graph.eventProcessors.add(startProcessor);
	}
	/**
	 * Wait for `dur` seconds to play before resolving. Note this will actually
	 * resolve at the end of a 128-frame block, as of current implementations.
	 */
	async play(dur) {
		if (!this.graph.sampleRate) throw new Error('Seq.play: graph not ready!');
		let countDown = dur * this.graph.sampleRate;
		// prevent error from accumulating
		const compensation = Math.min(this.timeError, countDown);
		countDown -= compensation;
		this.timeError -= compensation;
		await new Promise(resolve => {
			const eventProcessor = () => {
				if (countDown-- > 0) return;
				this.graph.eventProcessors.delete(eventProcessor);
				this.resolveTimeSmp = this.graph.timeSmp;
				resolve();
			};
			this.graph.eventProcessors.add(eventProcessor);
			eventProcessor();
		});
		this.timeError += this.graph.timeSmp - this.resolveTimeSmp;
	}
	async rep(n, f) {
		for (let i = 0; i < n; i++) {
			await f();
		}
	}
	/**
	 * @param {Object} arg
	 * @param {NodeParam} arg.param
	 * @param {Array.<TeaNode|NodeParam>} arg.connection
	 * @param {Number} arg.endVal
	 * @param {Number} arg.dur
	 * @param {('cos'|'lin')} arg.type
	 */
	slide({ param, connection, endVal, dur, type = 'cos' }) {
		if (connection) param = this.graph.getConnection(...connection).gain;
		let countUp = 0;
		const countMax = dur * this.graph.sampleRate;
		const f = this.makeSlideFn({ param, endVal, type });
		const eventProcessor = () => {
			let pos = countUp++ / countMax;
			if (pos > 1) pos = 1;
			param.value = f(pos);
			if (pos === 1) this.graph.eventProcessors.delete(eventProcessor);
		};
		this.graph.eventProcessors.add(eventProcessor);
	}
	/**
	 * @param {Object} arg
	 * @param {NodeParam} arg.param
	 * @param {Array.<TeaNode|NodeParam>} arg.connection
	 * @param {Number} arg.endVal
	 * @param {Number} arg.dur
	 * @param {('cos'|'lin')} arg.type
	 */
	ctrlSlide({ param, connection, endVal, dur, type = 'cos' }) {
		if (connection) param = this.graph.getConnection(...connection).gain;
		let countUp = 0;
		const countMax = Math.floor(dur * this.graph.sampleRate);
		const f = this.makeSlideFn({ param, endVal, type });
		const eventProcessor = () => {
			if (!(countUp % 128)) {
				param.value = f(countUp / countMax);
			}
			if (++countUp > countMax) {
				param.value = endVal;
				this.graph.eventProcessors.delete(eventProcessor);
			}
		};
		this.graph.eventProcessors.add(eventProcessor);
	}
	makeSlideFn({ param, endVal, type }) {
		const v1 = param.value;
		const v2 = endVal;
		if (type === 'cos') {
			return pos => v1 + (0.5 - 0.5 * Math.cos(pos * Math.PI)) * (v2 - v1);
		} else if (type === 'lin') {
			return pos => v1 + pos * (v2 - v1);
		} else {
		}
	}
	/**
	 * @param {String} table
	 * @param {Object} tableVars
	 */
	playTable(table, tableVars) {
		return playTable({ seq: this, graph: this.graph, table, tableVars });
	}
}
