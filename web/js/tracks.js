import { getMeta } from './beacons.js';
import { clock } from './World.js';

export class Track {
	constructor(proximity) {
		this.lastAmp = proximity;
		this.lastAmpTime = clock.worldTime;
		this.lastLivingTime = clock.worldTime;
	}
	setAmp(val) { throw new Error('Override Track.setAmp!'); }
	setProximity(val) {
		this.lastAmp = this.lastAmp / Math.exp((clock.worldTime - this.lastAmpTime)*0.25);
		if (val > this.lastAmp) this.lastAmp = val;
		this.setAmp(this.lastAmp);
		this.lastAmpTime = clock.worldTime;
		if (this.lastAmp > 0.05) this.lastLivingTime = clock.worldTime;
	}
	isDone() {
		return (clock.worldTime - this.lastLivingTime > 10);
	}
	stop() { throw new Error('Override Track.stop!'); }
}

export class TrackLoader {
	/** @param {import('./ResourcePool.js').Resource} resource */
	async startTrack(resource, proximity) { throw new Error('Override TrackLoader.startTrack!'); }
	/** @param {import('./ResourcePool.js').Resource} resource */
	stopTrack(resource) {
		resource.track.stop();
		resource.track = undefined;
		getMeta(resource.record).track = undefined;
		console.log(`stopped track ${resource.trackName}`);
	};
}