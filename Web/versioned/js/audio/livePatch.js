import { getMeta } from '../beacons/beaconPool.js';
import { events } from '../events.js';
import { Patch, PatchLoader } from './patches.js';

const defaultParamSpec = {
	name: 'unnamed param?',
	min: 0,
	max: 1,
	def: 0,
};

class TeasynthPatch extends Patch {
	constructor({ url, processorName, callbacks }) {
		super();
		/** @type {string} */
		this.url = url;
		this.processorName = processorName;
		this.callbacks = callbacks;
		this.audioContext = new AudioContext({ sampleRate: 44100, latencyHint: 'playback' });
		this.pauseListener = () => { this.audioContext.suspend(); };
		this.resumeListener = () => { this.audioContext.resume(); };
		events.on('pause', this.pauseListener);
		events.on('resume', this.resumeListener);
	}
	async init(initParams) {
		this.prePlay(initParams.amp);
		this.initParams = initParams;
		await this.audioContext.audioWorklet.addModule(this.url);
		const node = new AudioWorkletNode(this.audioContext, this.processorName, {
			numberOfInputs: 0,
			outputChannelCount: [2],
		});
		const playResult = {};
		this.node = node;
		this.playResult = playResult;
		this.paramSpecs = [];
		const rcvHostCmd = async data => {
			const resp = { type: 'hostResp', cmdId: data.cmdId };
			if (data.cmd === 'fetchMainRelative') {
				resp.content = await this.callbacks.fetchMainRelative(data.path);
			} else if (data.cmd === 'compileFaust') {
				const ret = await this.callbacks.compileFaust(data.code, data.internalMemory);
				[resp.ui8Code, resp.dspMeta] = ret;
			} else if (data.cmd === 'defineParams') {
				this.paramSpecs = data.paramSpecs.map(d => Object.assign({}, defaultParamSpec, d));
			} else {
				throw new Error('unknown host command: ' + data.cmd);
			}
			node.port.postMessage(resp);
		};
		node.port.addEventListener('message', event => {
			if (event.data.type === 'runHostCmd') rcvHostCmd(event.data);
		});
		await new Promise(resolve => {
			const readyListener = event => {
				if (event.data.type === 'main ready' || event.data.type === 'wrong samplerate') {
					node.port.removeEventListener('message', readyListener);
					// console.log(`Changing samplerate from ${wantRate} to ${event.data.wantRate}.`)
					Object.assign(playResult, event.data);
					resolve();
				}
			};
			node.port.addEventListener('message', readyListener);
			node.port.start();
			node.port.postMessage({ type: 'init main', initParams: this.initParams });
		});
		this.node.connect(this.audioContext.destination);
		this.status = 'playing';
	}
	setParam(name, val) {
		this.node.port.postMessage({ type: 'set param', name, val });
	}
	setAmp(val) {
		this.setParam('amp', val);
	}
	stop() {
		// this.node.disconnect();
		this.audioContext.close();
		events.off('pause', this.pauseListener);
		events.off('resume', this.resumeListener);
	}
}

const cyrb53 = (str, seed = 0) => {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const fetchCache = {};
const cachedFetch = async (url, format) => {
	// such cache
	const resp = await fetch(url);
	if (format === 'txt') return await resp.text();
	else if (format === 'buf') return await resp.arrayBuffer();
	else if (format === 'json') return await resp.json();
};

export class LivePatchLoader extends PatchLoader {
	/** @param {import('../beacons/beaconPool.js').PatchResource} resource */
	async preloadPatch(resource) {
		// Hack: playPatch doesn't check if this function is done
		// So it has to be sync actually
		const workletRoot = `${window.agVersionedPath}generated/worklets/${resource.patchName}/`;
		const processorName = `worklet_${resource.patchName}`;
		const sourceRoot = `${window.agVersionedPath}generated/source/${resource.patchName}/`;
		const callbacks = {
			async fetchMainRelative(path) {
				return await cachedFetch(sourceRoot + path, 'txt');
			},
			async compileFaust(code, internalMemory) {
				const hash = cyrb53(code);
				const ui8Code = await cachedFetch(workletRoot + hash + '.wasm', 'buf');
				const dspMeta = await cachedFetch(workletRoot + hash + '.json', 'json');
				return [ui8Code, dspMeta];
			},
		};
		const patch = new TeasynthPatch({
			url: `${workletRoot}${processorName}.js`,
			processorName,
			callbacks,
		});
		resource.patch = patch;
		getMeta(resource.record).patch = patch;
	}
	/** @param {import('../beacons/beaconPool.js').PatchResource} resource */
	async playPatch(resource, proximity) {
		const patch = resource.patch;
		patch.status = 'loading';
		const initParams = Object.assign({ amp: proximity }, resource.patchParams);
		await patch.init(initParams);
		if (patch.playResult.type !== 'main ready') {
			throw new Error('Error adding node: ' + processorName);
		}
		console.log(`playing patch ${resource.record.desc}`);
	}
}
