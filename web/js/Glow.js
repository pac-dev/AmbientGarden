import * as THREE from './lib/three.module.js'
import { getMeta } from './beacons.js';
import { clock } from './World.js';

const glowMap = new THREE.TextureLoader().load('img/glow.png');

/** @param {THREE.Group} grp */
export const addGlow = (grp, height) => {
	// material per object required for individual opacities
	const glowMat = new THREE.SpriteMaterial({
		map: glowMap,
		depthWrite: false,
		depthTest: false,
		blending: THREE.AdditiveBlending,
		opacity: 0
	});
	const glow = new THREE.Sprite(glowMat);
	glow.position.y = height*0.7;
	glow.scale.set(height*0.75, height*1.2, height*0.75);
	grp.add(glow);
	return glow;
};

/** @type {Set.<import('./beaconRecords.js').BeaconRecord>} */
const activeGlows = new Set();
export const startGlow = record => {
	getMeta(record).startTime = clock.worldTime;
	activeGlows.add(record);
};
/** @param {import('./beaconRecords.js').BeaconRecord} record */
export const stopGlow = record => {
	getMeta(record).glow.material.opacity = 0;
	activeGlows.delete(record);
};
const defaultCurve = t => {
	t *= 6;
	return 0.4+1.87*t/(1+Math.pow(t, 1.8))-0.4/(t*t*0.1+1);
};
const slowCurve = t => {
    t *= 2;
    return 0.4-0.4/(t*t*0.4+1);
};
/** @param {THREE.Object3D} obj */
export const updateGlows = () => {
	for (let rec of activeGlows) {
		const age = clock.worldTime - getMeta(rec).startTime;
		let ageFactor;
		if (rec.glowCurve === 'slow') ageFactor = slowCurve(age);
		else ageFactor = defaultCurve(age);
		getMeta(rec).glow.material.opacity = ageFactor*Math.sqrt(getMeta(rec).track?.lastAmp ?? 0);
	}
};