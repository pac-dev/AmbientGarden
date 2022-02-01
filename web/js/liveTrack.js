import { getMeta } from './beacons.js';
import { Track, TrackLoader } from './tracks.js';

const defaultParamSpec = {
	name: 'unnamed param?',
	min: 0,
	max: 1,
	def: 0,
};

class TeasynthTrack extends Track {
	constructor({ url, processorName, callbacks, initParams = {} }) {
		super(initParams.amp);
		this.initParams = initParams;
		/** @type {string} */
		this.url = url;
		this.processorName = processorName;
		this.callbacks = callbacks;
		this.audioContext = new AudioContext({ sampleRate: 44100, latencyHint: 'playback' });
	}
	async init() {
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
			if (this.url.includes('vibrem')) console.log('sending init main', this.initParams);
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

export class LiveTrackLoader extends TrackLoader {
	/** @param {import('./beacons.js').TrackResource} resource */
	async startTrack(resource, proximity) {
		const workletRoot = `generated/worklets/${resource.trackName}/`;
		const processorName = `worklet_${resource.trackName}`;
		const sourceRoot = `generated/tracks/${resource.trackName}/`;
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
		const initParams = Object.assign({ amp: proximity }, resource.trackParams);
		const track = new TeasynthTrack({
			url: `${workletRoot}${processorName}.js`,
			processorName,
			callbacks,
			initParams,
		});
		resource.track = track;
		getMeta(resource.record).track = track;
		await track.init();
		if (track.playResult.type !== 'main ready') {
			throw new Error('Error adding node: ' + processorName);
		}
		console.log(`playing track ${resource.trackName}`);
	}
}
