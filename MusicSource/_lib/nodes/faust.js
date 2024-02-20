import { TeaNode } from './teanode.js';
import { mainHost } from '../../host.js';

// Extract parameters from Faust-generated metadata
const findParams = meta => {
	const param2index = {};
	const visit = obj => {
		let { address, index, label, type } = obj;
		if (address && label && type) {
			param2index[label] = index;
			return;
		}
		if (!Array.isArray(obj) && !obj.type) return;
		Object.values(obj).forEach(visit);
	};
	visit(meta.ui);
	return param2index;
};

// Imports to pass to Faust WebAssembly modules
const importObject = mem => ({
	env: {
		memory: mem,
		memoryBase: 0,
		tableBase: 0,
		_abs: Math.abs,
		// Float version
		_acosf: Math.acos,
		_asinf: Math.asin,
		_atanf: Math.atan,
		_atan2f: Math.atan2,
		_ceilf: Math.ceil,
		_cosf: Math.cos,
		_expf: Math.exp,
		_floorf: Math.floor,
		_fmodf: (x, y) => x % y,
		_logf: Math.log,
		_log10f: Math.log10,
		_max_f: Math.max,
		_min_f: Math.min,
		_remainderf: (x, y) => x - Math.round(x / y) * y,
		_powf: Math.pow,
		_roundf: Math.fround,
		_sinf: Math.sin,
		_sqrtf: Math.sqrt,
		_tanf: Math.tan,
		_acoshf: Math.acosh,
		_asinhf: Math.asinh,
		_atanhf: Math.atanh,
		_coshf: Math.cosh,
		_sinhf: Math.sinh,
		_tanhf: Math.tanh,
		// Double version
		_acos: Math.acos,
		_asin: Math.asin,
		_atan: Math.atan,
		_atan2: Math.atan2,
		_ceil: Math.ceil,
		_cos: Math.cos,
		_exp: Math.exp,
		_floor: Math.floor,
		_fmod: (x, y) => x % y,
		_log: Math.log,
		_log10: Math.log10,
		_max_: Math.max,
		_min_: Math.min,
		_remainder: (x, y) => x - Math.round(x / y) * y,
		_pow: Math.pow,
		_round: Math.fround,
		_sin: Math.sin,
		_sqrt: Math.sqrt,
		_tan: Math.tan,
		_acosh: Math.acosh,
		_asinh: Math.asinh,
		_atanh: Math.atanh,
		_cosh: Math.cosh,
		_sinh: Math.sinh,
		_tanh: Math.tanh,
		table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
	},
});

/**
 * Create a WebAssembly module from the given Faust source code. Instancing
 * (a Faust feature) saves resources by placing multiple instances of the same
 * Faust processor in one module.
 */
const initFaustModule = async (source, numInstances) => {
	const { ui8Code, dspMeta } = await mainHost.compileFaust(source);
	const mod = {
		numInChannels: dspMeta.inputs,
		numOutChannels: dspMeta.outputs,
		param2index: findParams(dspMeta),
		instances: [],
	};
	let sz = mod.numInChannels * 8 + mod.numOutChannels * 8;
	sz += dspMeta.size * numInstances;
	sz = Math.ceil(sz / 65536);
	const memory = new WebAssembly.Memory({ initial: sz, maximum: sz });
	const dspModule = await WebAssembly.compile(ui8Code);
	if (!dspModule) throw new Error('Faust DSP factory cannot be compiled');
	const dspInstance = await WebAssembly.instantiate(dspModule, importObject(memory));
	mod.factory = dspInstance.exports;
	let mempos = 0;
	const HEAP32 = new Int32Array(memory.buffer);
	const HEAPF32 = new Float32Array(memory.buffer);
	for (let i = 0; i < numInstances; i++) {
		const dspOfs = mempos;
		mempos += dspMeta.size;
		const inPtrsOfs = mempos;
		mempos += mod.numInChannels * 4;
		const outPtrsOfs = mempos;
		mempos += mod.numOutChannels * 4;
		const inBufOfs = mempos;
		mempos += mod.numInChannels * 4;
		const outBufOfs = mempos;
		mempos += mod.numOutChannels * 4;
		for (let i = 0; i < mod.numInChannels; i++) {
			HEAP32[inPtrsOfs / 4 + i] = inBufOfs + i * 4;
		}
		for (let i = 0; i < mod.numOutChannels; i++) {
			HEAP32[outPtrsOfs / 4 + i] = outBufOfs + i * 4;
		}
		mod.factory.init(dspOfs, mainHost.sampleRate);
		mod.instances.push({
			dspOfs,
			inPtrsOfs,
			outPtrsOfs,
			module: mod,
			inView: HEAPF32.subarray(inBufOfs / 4, inBufOfs / 4 + mod.numInChannels),
			outView: HEAPF32.subarray(outBufOfs / 4, outBufOfs / 4 + mod.numOutChannels),
		});
	}
	return mod;
};

/**
 * Cache of Faust modules to create. This accumulates instances of each Faust
 * source file before creating any modules.
 */
export const faustCache = {
	reservedPaths: [],
	reservedSources: {},
	modules: {},
	reservePath({ path, host = mainHost, node, n = 1 }) {
		this.reservedPaths.push({ path, host, node, n });
	},
	reserveSource(src, n = 1) {
		if (!this.reservedSources[src]) this.reservedSources[src] = 0;
		this.reservedSources[src] += n;
	},
	takeInstance(source, node) {
		for (let inst of this.modules[source].instances) {
			if (inst.owner) continue;
			inst.owner = node;
			return inst;
		}
	},
	returnInstance(instance) {
		if (!instance.owner) throw new Error('Returned an orphan Faust instance!');
		instance.owner = undefined;
		instance.module.factory.instanceInit(instance.dspOfs, mainHost.sampleRate);
	},
};

mainHost.events.on('can read files', async () => {
	for (let res of faustCache.reservedPaths) {
		const host = res.host ?? res.node.host;
		const src = await host.getMainRelative(res.path);
		faustCache.reserveSource(src, res.n);
	}
});

mainHost.events.on('can init faust', async () => {
	for (let [src, i] of Object.entries(faustCache.reservedSources)) {
		faustCache.modules[src] = await initFaustModule(src, i);
	}
});

/**
 * Faust processor node using the given Faust source code. Upon construction,
 * instances are counted globally. Wasm modules are then created before
 * playback starts.
 */
export class FaustNode extends TeaNode {
	constructor(path, params = {}) {
		super();
		this.path = path;
		faustCache.reservePath({ path, node: this });
		this.on('done faust init', async () => {
			this.source = await this.host.getMainRelative(this.path);
			this.module = faustCache.modules[this.source];
			if (!this.module) throw new Error('Never built faust module for ' + this.describe());
			this.numInChannels = this.module.numInChannels;
			this.numOutChannels = this.module.numOutChannels;
			this.instance = faustCache.takeInstance(this.source, this);
			if (!this.instance) throw new Error('Out of Faust instances: ' + this.path);
			for (let usedParam of this.usedParams) {
				if (!(usedParam.name in this.module.param2index)) {
					throw new Error(`Param "${usedParam.name}" does not exist in ${this.describe()}!`);
				}
				usedParam.faustIndex = this.module.param2index[usedParam.name];
			}
		});
		this.on('dispose', () => {
			faustCache.returnInstance(this.instance);
		});
		this.usedParams = [];
		for (let [k, v] of Object.entries(params)) {
			this[k] = this.faustParam(k, v);
		}
	}
	faustParam(name, value) {
		let teaParam;
		if (typeof value == 'number') {
			teaParam = this.addParam(value);
		} else if (value instanceof TeaNode) {
			teaParam = this.addParam(0);
			value.connect(teaParam);
		} else {
			throw new Error(`Tried connecting ${value} as parameter ${name}!`);
		}
		this.usedParams.push({ name, teaParam });
		return teaParam;
	}
	process(frame) {
		if (this.muted) return this.instance.outView;
		this.usedParams.forEach(p =>
			this.module.factory.setParamValue(this.instance.dspOfs, p.faustIndex, p.teaParam.value)
		);
		if (this.module.numInChannels > 0) {
			this.instance.inView.set(frame);
		}
		this.module.factory.compute(this.instance.dspOfs, 1, this.instance.inPtrsOfs, this.instance.outPtrsOfs);
		return this.instance.outView;
	}
	describe() {
		return this.path;
	}
}
