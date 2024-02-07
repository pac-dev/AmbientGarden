import { getMeta } from '../beacons/beaconPool.js';
import { clock } from '../world.js';

export class Patch {
	constructor(proximity) {
		this.lastAmp = proximity * 0.3 + 0.7;
		this.lastAmpTime = clock.worldTime;
		this.lastLivingTime = clock.worldTime;
		this.status = 'loading';
	}
	setAmp(val) {
		throw new Error('Override Patch.setAmp!');
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
		throw new Error('Override Patch.stop!');
	}
}

export class PatchLoader {
	/** @param {import('../beacons/beaconPool.js').PatchResource} resource */
	async startPatch(resource, proximity) {
		throw new Error('Override PatchLoader.startPatch!');
	}
	/** @param {import('../beacons/beaconPool.js').PatchResource} resource */
	stopPatch(resource) {
		resource.patch.stop();
		resource.patch = undefined;
		getMeta(resource.record).patch = undefined;
		console.log(`stopped patch ${resource.patchName}`);
	}
}
