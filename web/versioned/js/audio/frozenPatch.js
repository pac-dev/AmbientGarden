import { getMeta } from '../beacons/beaconPool.js';
import { events } from '../events.js';
import { Patch, PatchLoader } from './patches.js';

const xfDur = 2;
const margin = 0.1;
const context = new AudioContext();
context.suspend();
events.on('doneWelcome', () => context.resume());
events.on('pause', () => context.suspend());
events.on('resume', () => context.resume());
const compressor = context.createDynamicsCompressor();
compressor.connect(context.destination);

/**
 * In most browsers, HTMLAudioElement is the resource-efficient way of playing
 * stuff. However, Apple Webkit (so, all of iOS) does not allow delayed starts
 * on Audio elements, and forces us to use the Web Audio API instead, and hold
 * the full decoded audio in memory. I'd rather not force this resource hogging
 * onto everyone, so let's check capability.
 */
let canPlayAudioElements;
// Do not call this from an event handler context
const checkAudioCapability = async () => {
	const testAudio = new Audio();
	// silent mp3:
	testAudio.src = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
	try {
		await testAudio.play();
		canPlayAudioElements = true;
		console.log("Browser can play HTMLAudioElement asynchronously!");
	} catch {
		canPlayAudioElements = false;
		setInterval(() => events.trigger('interval'), 200);
		console.log("Browser can't play HTMLAudioElement asynchronously. Falling back to Web Audio.");
	}
};

/**
 * Using the Web Audio API, roughly simulate HTMLAudioElement with some
 * customizations. Only use this if the browser refuses to play normal Audio
 * elements.
 */
class WebAudioElement {
	constructor(url, cloneSource) {
		this.url = url;
		this.gainNode = context.createGain();
		this.gainNode.connect(compressor);
		this.playing = false;
		this.startTime = 0;
		const self = this;
		this.loaded = new Promise((resolve, reject) => {
			self._resolveLoaded = resolve;
		});
		this.intervalCallback = () => {
			if (this.onupdate && this.playing && context.state === 'running') {
				this.onupdate();
			}
		};
		events.on('interval', this.intervalCallback);
		if (cloneSource) {
			(async () => {
				await cloneSource.loaded;
				this.audioBuffer = cloneSource.audioBuffer;
				this.duration = cloneSource.duration;
				this._resolveLoaded();
			})();
		} else {
			this.load();
		}
	}
	async load() {
		const response = await fetch(this.url);
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await context.decodeAudioData(arrayBuffer);
		this.duration = this.audioBuffer.duration;
		this._resolveLoaded();
	}
	play() {
		this.cleanupSourceNode();
		this.sourceNode = context.createBufferSource();
		this.sourceNode.buffer = this.audioBuffer;
		this.sourceNode.connect(this.gainNode);
		this.startTime = context.currentTime;
		this.playing = true;
		this.sourceNode.addEventListener('ended', () => {
			this.playing = false;
		});
		this.sourceNode.start();
	}
	rewind() {
		this.cleanupSourceNode();
	}
	get currentTime() {
		if (this.playing) return context.currentTime - this.startTime;
		else return 0;
	}
	set volume(x) {
		this.gainNode.gain.value = x;
	}
	cleanupSourceNode() {
		if (!this.sourceNode) return;
		this.sourceNode.disconnect();
		this.sourceNode.buffer = null;
		delete this.sourceNode;
	}
	clone() {
		return new WebAudioElement(this.url, this);
	}
	cleanup() {
		this.cleanupSourceNode();
		this.gainNode.disconnect();
		events.off('interval', this.intervalCallback);
	}
}

/** @param {string} url */
const addAudio = url => {
	if (!canPlayAudioElements) {
		return new WebAudioElement(url);
	}
	const au = new Audio(url);
	au.cleanup = () => {
		au.canceled = true;
	};
	au.addEventListener('timeupdate', () => {
		if (au.onupdate) au.onupdate();
	});
	au.rewind = () => {
		au.pause();
		au.currentTime = 0;
	};
	au.clone = () => addAudio(url);
	let source;
	au.loaded = new Promise((resolve, reject) => {
		au.addEventListener('canplaythrough', () => {
			if (source) return;
			source = context.createMediaElementSource(au);
			source.connect(compressor);
			au.cleanup = () => {
				au.pause();
				source.disconnect();
				au.cleanup = () => {};
			};
			resolve();
		});
		au.addEventListener('error', reject);
		au.addEventListener('abort', reject);
	});
	return au;
};

class FrozenPatch extends Patch {
	constructor(proximity) {
		super(proximity);
		/** @type {HTMLAudioElement} */
		this.introAu;
		/** @type {HTMLAudioElement} */
		this.loop1Au;
		/** @type {HTMLAudioElement} */
		this.loop2Au;
	}
	start() {
		this.setAmp(this.lastAmp);
		const loop1Au = this.loop1Au;
		const introAu = this.introAu;
		const loop2Part = { au: this.loop2Au, dur: loop1Au.duration - xfDur };
		const loop1Part = { au: loop1Au, dur: loop1Au.duration - xfDur, next: loop2Part };
		const introPart = { au: introAu, dur: introAu.duration - xfDur, next: loop1Part };
		loop2Part.next = loop1Part;
		const beginPart = part => {
			part.au.rewind();
			part.au.play();
			part.au.onupdate = () => {
				if (part.au.currentTime < part.dur - margin) return;
				beginPart(part.next);
				part.au.onupdate = undefined;
			};
		};
		beginPart(introPart);
		this.status = 'playing';
	}
	setAmp(x) {
		this.introAu.volume = x;
		this.loop1Au.volume = x;
		this.loop2Au.volume = x;
	}
	stop() {
		this.introAu.cleanup();
		this.loop1Au.cleanup();
		this.loop2Au.cleanup();
		delete this.introAu;
		delete this.loop1Au;
		delete this.loop2Au;
	}
}

export class FrozenPatchLoader extends PatchLoader {
	/** @param {import('../beacons/beaconPool.js').PatchResource} resource */
	async startPatch(resource, proximity) {
		if (canPlayAudioElements === undefined) {
			await checkAudioCapability();
		}
		const patch = new FrozenPatch(proximity);
		resource.patch = patch;
		getMeta(resource.record).patch = patch;
		patch.introAu = addAudio(resource.record.introUrl);
		patch.loop1Au = addAudio(resource.record.loopUrl);
		patch.loop2Au = patch.loop1Au.clone();
		try {
			await Promise.all([patch.introAu.loaded, patch.loop1Au.loaded, patch.loop2Au.loaded]);
		} catch (error) {
			console.log(`error loading ${resource.patchName}`);
			return;
		}
		if (patch.status === 'canceling') return console.log(`canceled ${resource.patchName}`);
		patch.start();
		console.log(`playing patch ${resource.patchName}`);
	}
}
