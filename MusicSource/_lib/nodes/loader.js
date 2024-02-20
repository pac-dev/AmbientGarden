import { TeaNode } from './teanode.js';
import { EventTarget } from '../../host.js';

/**
 * Node to load other patches. Experimental.
 */
export class LoaderNode extends TeaNode {
	/**
	 * @param {string} mainPath
	 */
	constructor(mainPath, instantiate) {
		super();
		if (!mainPath.endsWith('/main.js')) {
			throw new Error('invalid path to subpatch main file: ' + mainPath);
		}
		this.mainPath = mainPath;
		this.instantiate = instantiate;
		this.instances = new Set();
	}
	add(params = {}) {
		const instance = { paused: false };
		instance.started = this.initInstance(instance, params);
		return instance;
	}
	async initInstance(instance, params) {
		const parentNode = this;
		instance.host = {
			async getMainRelative(path) {
				const joined = parentNode.mainPath.slice(0, -7) + path;
				return await parentNode.host.getMainRelative(joined);
			},
			events: new EventTarget(),
			async init() {
				await this.events.trigger('got host');
				await this.events.trigger('can read files');
				// await this.events.trigger('can init faust');
				await this.events.trigger('done faust init');
				await this.events.trigger('can deduce channels');
				await this.events.trigger('can make processors');
				await this.events.trigger('can play');
			},
			params: {},
			sampleRate: parentNode.host.sampleRate,
		};
		if (this.hostProps) Object.assign(instance.host, this.hostProps);
		instance.process = await this.instantiate(instance.host);
		await instance.host.init();
		for (let [k, v] of Object.entries(params)) {
			instance.host.params[k].setFn(v);
		}
		this.instances.add(instance);
		console.log('worklet: done starting subpatch ' + this.mainPath);
		return instance;
	}
	async remove(instance) {
		if (!this.instances.has(instance)) throw new Error('Removed an orphan Loader instance!');
		await instance.host.events.trigger('dispose');
		this.instances.delete(instance);
		console.log('worklet: stopped subpatch ' + this.mainPath);
	}
	/**
	 * @param {Array.<Number>} frame
	 * @returns {Array.<Number>}
	 */
	process(frame) {
		const ret = [0, 0];
		for (let inst of this.instances) {
			if (inst.paused) continue;
			const out = inst.process();
			ret[0] += out[0];
			ret[1] += out[1];
		}
		return ret;
	}
}
