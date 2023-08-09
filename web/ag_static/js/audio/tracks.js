import { getMeta } from '../beacons/beaconPool.js';
import { clock } from '../world.js';

export class Track {
	constructor(proximity) {
		this.lastAmp = proximity * 0.3 + 0.7;
		this.lastAmpTime = clock.worldTime;
		this.lastLivingTime = clock.worldTime;
		this.status = 'loading';
	}
	setAmp(val) {
		throw new Error('Override Track.setAmp!');
	}
	setProximity(val) {
		// 0.25 -> 12s
		// 0.15 -> 20s
		this.lastAmp = this.lastAmp / Math.exp((clock.worldTime - this.lastAmpTime) * 0.15);
		if (val > this.lastAmp) this.lastAmp = val;
		this.setAmp(this.lastAmp);
		this.lastAmpTime = clock.worldTime;
		if (this.lastAmp > 0.05) this.lastLivingTime = clock.worldTime;
	}
	isDone() {
		return clock.worldTime - this.lastLivingTime > 10;
	}
	stop() {
		throw new Error('Override Track.stop!');
	}
}

export class TrackLoader {
	/** @param {import('../beacons/beaconPool.js').TrackResource} resource */
	async startTrack(resource, proximity) {
		throw new Error('Override TrackLoader.startTrack!');
	}
	/** @param {import('../beacons/beaconPool.js').TrackResource} resource */
	stopTrack(resource) {
		resource.track.stop();
		resource.track = undefined;
		getMeta(resource.record).track = undefined;
		console.log(`stopped track ${resource.trackName}`);
	}
}
