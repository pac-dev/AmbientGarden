import * as THREE from '../lib/three.module.js';
import { farCoord2world, clock, beaconLoadDist } from '../world.js';
import { addResourcePool, getResourcePool } from '../resourcePool.js';
import { addGlow, startGlow, stopGlow } from '../gfx/glow.js';
import { camFloor, runMode } from '../runMode.js';
import { beaconRecords } from './beaconRecords.js';
import { generateForm } from './beaconForms.js';
import { events } from '../events.js';

/**
 * @typedef {Object} BeaconMeta
 * @property {import('../audio/patches.js').Patch} [patch]
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
let radSetting = 250;
let patchWake = radSetting * wakeMul;
let patchLoadDist = radSetting+100;
let patchLoadSquare = patchLoadDist * patchLoadDist;
export const patchHush = 330;
export const beginWakeIntro = () => window.setInterval(() => {
	if (!anyLoading()) wakeMul += 0.04;
	patchWake = radSetting * Math.min(1, wakeMul);
}, 200);

events.on('radiusChanged', (rad) => {
	radSetting = rad;
	patchWake = radSetting * Math.min(1, wakeMul);
	patchLoadDist = radSetting+100;
	patchLoadSquare = patchLoadDist * patchLoadDist;
});

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

let lastProxSetTime = 0;

/**
 * @typedef {Object} _PatchResource
 * @property {import('./beaconRecords.js').BeaconRecord} record
 * @property {string} [patchName]
 * @property {Object} [patchParams]
 * @property {import('../audio/patches.js').Patch} [patch]
 *
 * @typedef {import('../resourcePool.js').Resource & _PatchResource} PatchResource
 */

/** @param {PatchResource} resource */
const proximity = (resource, camX, camZ) => {
	const d = Math.sqrt(sq(resource.x - camX) + sq(resource.z - camZ));
	const myHush = patchHush*resource.record.reach;
	return Math.max(0, (myHush - d) / myHush);
};

const inUa = (term) => navigator.userAgent.includes(term);
let canPreload = inUa('Chrome') || !(inUa('Mobile') && inUa('Safari'));
if (window.noPreload) canPreload = false;
if (canPreload) console.log('Assuming audio can be preloaded before user action.');
else console.log("Assuming audio can't be preloaded before user action.");

/** @param {import('../audio/patches.js').PatchLoader} loader */
export const initPatchPool = loader =>
	addResourcePool({
		name: 'patches',
		generate: function* (camX, camZ) {
			if (!canPreload && !runMode.enabled) return;
			for (let record of beaconRecords) {
				if (!('x' in record)) continue;
				const [x, z, patch] = [record.x, record.z, getMeta(record).patch];
				const dSquare = sq(camX - x) + sq(camZ - z);
				if (dSquare > patchLoadSquare) {
					// not sure the isDone does anything here
					if (!patch || patch.isDone()) continue;
				}
				// remove near but wrong-floor non-playing patches
				if (!patch && record.floor !== camFloor) {
					continue;
				}
				// keep patches that should be preloading or playing
				yield { x, z, record };
			}
		},
		/** @param {PatchResource} res */
		add(res) {
			Object.assign(res, res.record);
			loader.preloadPatch(res);
		},
		/** @param {PatchResource} res */
		remove(res) {
			loader.stopPatch(res);
			stopGlow(res.record);
		},
		/** @param {import('../resourcePool.js').ResourcePool & {loaded: Array.<PatchResource>}} pool */
		afterUpdate(pool, camX, camZ) {
			if (!runMode.enabled) return;
			if (clock.worldTime - lastProxSetTime > 0.1) {
				for (let resource of pool.loaded) {
					// preloadPatch does not immediately create the patch
					if (!resource.patch) continue;
					const record = resource.record;
					const [x, z, patch] = [record.x, record.z, resource.patch];
					const prox = proximity(resource, camX, camZ);
					patch.setProximity(prox);
					if (patch.status !== 'preloading') continue;
					const dSquare = sq(camX - x) + sq(camZ - z);
					const wake = patchWake*record.reach;
					if (record.floor !== camFloor || dSquare > wake*wake) continue;
					(async () => {
						// immediately sets the status to 'loading' so we don't race
						await loader.playPatch(resource, prox);
						if (patch.status !== 'playing') return;
						startGlow(record);
					})();
				}
				lastProxSetTime = clock.worldTime;
			}
		},
	});

export const anyLoading = () => {
	const pool = getResourcePool('patches');
	for (const patchRes of pool.loaded) {
		if (patchRes.patch.status === 'loading') return true;
	}
	return false;
};