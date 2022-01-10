import * as THREE from './lib/three.module.js'
import { initTree, updateTree, disposeTree } from './Tree.js';
import { addTreball, disposeTreball } from './Treball.js';
import { farCoord2world, clock, beaconLoadDist } from './World.js';
import { addResourcePool, getResourcePool } from './ResourcePool.js'
import { addGlow, startGlow, stopGlow } from './Glow.js';
import { runMode } from './runMode.js';
import { beaconRecords } from './beaconRecords.js';

window.beaconRecords = beaconRecords;

/**
 * @typedef {Object} BeaconMeta
 * @property {import('./tracks.js').Track} [track]
 * @property {THREE.Sprite} [glow]
 * @property {number} [startTime]
 * @property {boolean} [transforming]
 * @property {boolean} [selected]
 * @property {THREE.Vector3} [orig]
 */
const beaconMeta = new WeakMap();
/** @returns {BeaconMeta} */
export const getMeta = record => {
	if (beaconMeta.has(record)) return beaconMeta.get(record);
	const ret = {};
	beaconMeta.set(record, ret);
	return ret;
};

export const beaconGroup = new THREE.Group();
const beaconMinSquare = beaconLoadDist*beaconLoadDist;
let wakeMul = 0.7;
let trackWake = 250*wakeMul;
let trackWakeSquare = trackWake*trackWake;
export const trackHush = 330;
let wakeIntroTime = 0;

export const beginWakeIntro = () => { wakeIntroTime = clock.worldTime };
const updateWake = () => {
	if (!wakeIntroTime) return;
	wakeMul = 0.7 + (clock.worldTime - wakeIntroTime)*0.2;
	if (wakeMul > 1) {
		wakeMul = 1;
		wakeIntroTime = 0;
	}
	trackWake = 250*wakeMul;
	trackWakeSquare = trackWake*trackWake;
};

/** @param {import('./ResourcePool.js').Resource} resource */
const loadBeacon = resource => {
	const formParams = Object.assign(
		{x: resource.x, z: resource.z},
		resource.record.formParams
	);
	if (resource.record.formName === 'tree') {
		resource.form = initTree(formParams);
		updateTree(resource.form);
	} else if (resource.record.formName === 'treball') {
		resource.form = addTreball(formParams);
	} else {
		throw new Error('Unknown beacon form: '+resource.record.formName);
	}
	getMeta(resource.record).glow = addGlow(resource.form, formParams.height);
	const bboxGeom = new THREE.CylinderGeometry(20, 20, formParams.height, 4, 1, true);
	const bbox = new THREE.Mesh(bboxGeom);
	bbox.position.y = formParams.height / 2;
	bbox.layers.set(1);
	resource.form.add(bbox);
	beaconGroup.add(resource.form);
};

export const initBeaconPool = () => addResourcePool({
	name: 'beacons',
	*generate(camX, camZ) {
		for (let record of beaconRecords) {
			if (!('x' in record)) continue;
			const [x, z] = [record.x, record.z];
			const subX = camX - x, subZ = camZ - z;
			if (!getMeta(record).transforming && subX*subX + subZ*subZ > beaconMinSquare) continue;
			yield {x, z, record};
		}
	},
	add(res) {
		loadBeacon(res);
	},
	remove(res) {
		if (res.form.userData.disposeTransformer) {
			res.form.userData.disposeTransformer();
		}
		beaconGroup.remove(res.form);
		disposeTree(res.form);
	}
});

const trackId = (() => {
	let count = 100; // fail fast if array index is used instead of id
	return () => 'track_'+(++count);
})();

const sq = x => x*x;
let lastProxSetTime = 0;

/** @param {import('./ResourcePool.js').Resource} resource */
const proximity = (resource, camX, camZ) => {
	const d = Math.sqrt(sq(resource.x - camX) + sq(resource.z - camZ));
	return Math.max(0, (trackHush - d)/(trackHush));
};

/** @param {import('./tracks.js').TrackLoader} loader */
export const initTrackPool = loader => addResourcePool({
	name: 'tracks',
	generate: function*(camX, camZ) {
		if (!runMode.enabled) return;
		for (let record of beaconRecords) {
			if (!('x' in record)) continue;
			const [x, z, track] = [record.x, record.z, getMeta(record).track];
			const dSquare = sq(camX - x) + sq(camZ - z);
			if (dSquare > trackWakeSquare && !track) continue;
			if (dSquare > trackWakeSquare && track.isDone()) continue;
			yield {x, z, record};
		}
	},
	add(res, camX, camZ) {
		Object.assign(res, res.record);
		res.trackId = trackId();
		loader.startTrack(res, proximity(res, camX, camZ));
		startGlow(res.record);
	},
	remove(res) {
		loader.stopTrack(res);
		stopGlow(res.record);
	},
	afterUpdate(pool, camX, camZ) {
		updateWake();
		if (clock.worldTime - lastProxSetTime > 0.1) {
			for (let resource of pool.loaded) {
				if (!resource.track) continue;
				resource.track.setProximity(proximity(resource, camX, camZ));
			}
			lastProxSetTime = clock.worldTime;
		}
	}
});
