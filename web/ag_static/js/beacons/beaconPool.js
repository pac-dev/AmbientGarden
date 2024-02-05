import * as THREE from '../lib/three.module.js';
import { farCoord2world, clock, beaconLoadDist } from '../world.js';
import { addResourcePool, getResourcePool } from '../resourcePool.js';
import { addGlow, startGlow, stopGlow } from '../gfx/glow.js';
import { camFloor, runMode } from '../runMode.js';
import { beaconRecords } from './beaconRecords.js';
import { generateForm } from './beaconForms.js';

/**
 * @typedef {Object} BeaconMeta
 * @property {import('../audio/tracks.js').Track} [track]
 * @property {Array.<THREE.Mesh>} [glow]
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
const beaconMinSquare = beaconLoadDist * beaconLoadDist;
let wakeMul = 0.7;
let trackWake = 250 * wakeMul;
export const trackHush = 330;
let wakeIntroTime = 0;

export const beginWakeIntro = () => {
	wakeIntroTime = clock.worldTime;
};

const updateWake = () => {
	if (!wakeIntroTime) return;
	wakeMul = 0.7 + (clock.worldTime - wakeIntroTime) * 0.2;
	if (wakeMul > 1) {
		wakeMul = 1;
		wakeIntroTime = 0;
	}
	trackWake = 250 * wakeMul;
};

/**
 * @typedef {Object} _BeaconResource
 * @property {import('./beaconRecords.js').BeaconRecord} record
 * @property {import('../lib/three.module.js').Object3D} [form]
 *
 * @typedef {import('../resourcePool.js').Resource & _BeaconResource} BeaconResource
 */

/** @param {BeaconResource} resource */
const loadBeacon = resource => {
	resource.form = generateForm(resource.record, resource.x, resource.z);
	getMeta(resource.record).glow = addGlow(resource.form);
	if (!resource.form.userData.unclickable) {
		const bboxGeom = new THREE.CylinderGeometry(20, 20, resource.form.userData.height, 4, 1, true);
		const bbox = new THREE.Mesh(bboxGeom);
		bbox.position.y = resource.form.userData.height / 2;
		bbox.layers.set(1);
		bbox.userData.beaconRes = resource;
		resource.form.add(bbox);
	}
	beaconGroup.add(resource.form);
};

const sq = x => x * x;

export const initBeaconPool = () =>
	addResourcePool({
		name: 'beacons',
		*generate(camX, camZ) {
			for (let record of beaconRecords) {
				if (!('x' in record)) continue;
				const [x, z] = [record.x, record.z];
				const dSquare = sq(camX - x) + sq(camZ - z)
				if (!getMeta(record).transforming && dSquare > beaconMinSquare) {
					continue;
				}
				yield { x, z, record };
			}
		},
		/** @param {BeaconResource} res */
		add(res) {
			loadBeacon(res);
		},
		/** @param {BeaconResource} res */
		remove(res) {
			if (res.form.userData.disposeTransformer) {
				res.form.userData.disposeTransformer();
			}
			beaconGroup.remove(res.form);
			for (let child of res.form.children) {
				if (child.isPoints) {
					child.geometry.dispose();
				}
			}
		},
	});

const trackId = (() => {
	let count = 100; // fail fast if array index is used instead of id
	return () => 'track_' + ++count;
})();

let lastProxSetTime = 0;

/**
 * @typedef {Object} _TrackResource
 * @property {import('./beaconRecords.js').BeaconRecord} record
 * @property {string} [trackName]
 * @property {string} [trackId]
 * @property {Object} [trackParams]
 * @property {import('../audio/tracks.js').Track} [track]
 *
 * @typedef {import('../resourcePool.js').Resource & _TrackResource} TrackResource
 */

/** @param {TrackResource} resource */
const proximity = (resource, camX, camZ) => {
	const d = Math.sqrt(sq(resource.x - camX) + sq(resource.z - camZ));
	const myHush = trackHush*resource.record.reach;
	return Math.max(0, (myHush - d) / myHush);
};

/** @param {import('../audio/tracks.js').TrackLoader} loader */
export const initTrackPool = loader =>
	addResourcePool({
		name: 'tracks',
		generate: function* (camX, camZ) {
			if (!runMode.enabled) return;
			for (let record of beaconRecords) {
				if (!('x' in record)) continue;
				const [x, z, track] = [record.x, record.z, getMeta(record).track];
				const dSquare = sq(camX - x) + sq(camZ - z);
				const wake = trackWake*record.reach;
				if (dSquare > wake*wake) {
					if (track?.status !== 'playing') continue;
					if (track.isDone()) continue;
				}
				if (record.floor !== camFloor) continue;
				yield { x, z, record };
			}
		},
		/** @param {TrackResource} res */
		add(res, camX, camZ) {
			Object.assign(res, res.record);
			res.trackId = trackId();
			(async () => {
				await loader.startTrack(res, proximity(res, camX, camZ));
				if (res.track.status !== 'playing') return;
				startGlow(res.record);
			})();
		},
		/** @param {TrackResource} res */
		remove(res) {
			loader.stopTrack(res);
			stopGlow(res.record);
		},
		/** @param {import('../resourcePool.js').ResourcePool & {loaded: Array.<TrackResource>}} pool */
		afterUpdate(pool, camX, camZ) {
			updateWake();
			if (clock.worldTime - lastProxSetTime > 0.1) {
				for (let resource of pool.loaded) {
					if (resource.track?.status !== 'playing') continue;
					resource.track.setProximity(proximity(resource, camX, camZ));
				}
				lastProxSetTime = clock.worldTime;
			}
		},
	});

export const anyLoading = () => {
	const pool = getResourcePool('tracks');
	for (const trackRes of pool.loaded) {
		if (trackRes.track.status === 'loading') return true;
	}
	return false;
};