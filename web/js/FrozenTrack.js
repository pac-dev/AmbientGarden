import { getMeta } from './beacons.js';
import { Track, TrackLoader } from './tracks.js';

const inDur = 12;
const loopDur = 18;
const xfDur = 2;
const margin = 0.1;
const addAudio = (() => {
	/** @type {DynamicsCompressorNode} */
	let compressor;
	/** @type {GainNode} */
	let preAmp;
	/** @type {AudioContext} */
	let context;
	return url => {
		if (!context) {
			context = new AudioContext();
			preAmp = context.createGain();
			compressor = context.createDynamicsCompressor();
			preAmp.connect(compressor);
			compressor.connect(context.destination);
			preAmp.gain.value = 1.75;
		}
		const au = new Audio(url);
		const source = context.createMediaElementSource(au);
		source.connect(compressor);
		au.cleanup = () => {
			au.pause();
			source.disconnect();
		};
		return au;
	}
})();

class FrozenTrack extends Track {
	constructor(introAu, loop1Au, loop2Au, amp) {
		super(amp);
		/** @type {HTMLAudioElement} */
		this.introAu = introAu;
		/** @type {HTMLAudioElement} */
		this.loop1Au = loop1Au;
		/** @type {HTMLAudioElement} */
		this.loop2Au = loop2Au;
		this.setAmp(amp);
		const loop2Part = { au: loop2Au, dur: loopDur + xfDur };
		const loop1Part = { au: loop1Au, dur: loopDur + xfDur, next: loop2Part };
		const introPart = { au: introAu, dur: inDur, next: loop1Part };
		loop2Part.next = loop1Part;
		const beginPart = part => {
			const listener = () => {
				if (part.au.currentTime < part.dur - margin) return;
				beginPart(part.next);
				part.au.removeEventListener('timeupdate', listener);
			};
			part.au.currentTime = 0;
			part.au.play();
			part.au.addEventListener('timeupdate', listener);

		};
		beginPart(introPart);
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

export class FrozenTrackLoader extends TrackLoader {
	/** @param {import('./ResourcePool.js').Resource} resource */
	async startTrack(resource, proximity) {
		const introAu = addAudio(resource.record.introUrl);
		const loop1Au = addAudio(resource.record.loopUrl);
		const loop2Au = addAudio(resource.record.loopUrl);
		await new Promise(resolve => introAu.addEventListener('canplaythrough', resolve));
		const track = new FrozenTrack(introAu, loop1Au, loop2Au, proximity);
		resource.track = track;
		getMeta(resource.record).track = track;
		console.log(`playing track ${resource.trackName}`);
	}
}
