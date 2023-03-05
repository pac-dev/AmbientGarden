import { getMeta } from './beacons.js';
import { events } from './events.js';
import { Track, TrackLoader } from './tracks.js';

const xfDur = 2;
const margin = 0.1;
const addAudio = (() => {
	/** @type {DynamicsCompressorNode} */
	let compressor;
	/** @type {GainNode} */
	let preAmp;
	/** @type {AudioContext} */
	let context;
	/** @param {string} url */
	return url => {
		if (!context) {
			context = new AudioContext();
			preAmp = context.createGain();
			compressor = context.createDynamicsCompressor();
			preAmp.connect(compressor);
			compressor.connect(context.destination);
			preAmp.gain.value = 1.75;
			events.on('pause', () => { context.suspend(); });
			events.on('resume', () => { context.resume(); });
		}
		const au = new Audio(url);
		au.cleanup = () => {
			au.canceled = true;
		};
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
})();

class FrozenTrack extends Track {
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

export class FrozenTrackLoader extends TrackLoader {
	/** @param {import('./beacons.js').TrackResource} resource */
	async startTrack(resource, proximity) {
		const track = new FrozenTrack(proximity);
		resource.track = track;
		getMeta(resource.record).track = track;
		track.introAu = addAudio(resource.record.introUrl);
		track.loop1Au = addAudio(resource.record.loopUrl);
		track.loop2Au = addAudio(resource.record.loopUrl);
		try {
			await Promise.all([track.introAu.loaded, track.loop1Au.loaded, track.loop2Au.loaded]);
		} catch (error) {
			console.log(`error loading ${resource.trackName}`);
			return;
		}
		if (track.status === 'canceling') return console.log(`canceled ${resource.trackName}`);
		track.start();
		console.log(`playing track ${resource.trackName}`);
	}
}
