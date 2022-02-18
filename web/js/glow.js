import * as THREE from './lib/three.module.js';
import { getMeta } from './beacons.js';
import { clock } from './world.js';

const flareMap = new THREE.TextureLoader().load('img/glow.png');
const waveMap = new THREE.TextureLoader().load('img/wave512.png');
const planeGeo = new THREE.PlaneGeometry(20, 20);

/** @param {THREE.Group} grp */
const addWave = grp => {
	// material per object required for individual opacities
	const waveMat = new THREE.MeshBasicMaterial({
		map: waveMap,
		depthWrite: false,
		depthTest: false,
		blending: THREE.AdditiveBlending,
		transparent: true,
		opacity: 0,
		// use stencil to keep waves under beacon's LeafMaterial
		stencilWrite: true,
		stencilFunc: THREE.EqualStencilFunc,
		stencilRef: 0,
	});
	const wave = new THREE.Mesh(planeGeo, waveMat);
	wave.rotation.x = Math.PI * -0.5;
	wave.renderOrder = 3;
	grp.add(wave);
	return wave;
};

/** @param {THREE.Group} grp */
const addFlare = (grp, height) => {
	// material per object required for individual opacities
	const flareMat = new THREE.SpriteMaterial({
		map: flareMap,
		depthWrite: false,
		depthTest: false,
		blending: THREE.AdditiveBlending,
		opacity: 0,
		// use stencil to only show flare on beacons
		stencilWrite: true,
		stencilFunc: THREE.NotEqualStencilFunc,
		stencilRef: 0,
	});
	const flare = new THREE.Sprite(flareMat);
	flare.position.y = height*0.5;
	flare.scale.set(height*0.66, height*3, 1);
	grp.add(flare);
	return flare;
};

/** @param {THREE.Group} grp */
export const addGlow = (grp, height) => {
	return {
		wave1: addWave(grp), 
		wave2: addWave(grp), 
		wave3: addWave(grp),
		flare: addFlare(grp, height)
	};
};

/** @type {Set.<import('./beaconRecords.js').BeaconRecord>} */
const activeGlows = new Set();
export const startGlow = record => {
	getMeta(record).startTime = clock.worldTime;
	activeGlows.add(record);
};

/** @param {import('./beaconRecords.js').BeaconRecord} record */
export const stopGlow = record => {
	for (let obj3d of Object.values(getMeta(record).glow)) {
		obj3d.material.opacity = 0;
	}
	activeGlows.delete(record);
};

const fade = (t, speed) => 1 - 1 / (t * t * speed + 1);
const period = 6;
const maxScale = 15;

const waveSize = (x, phase) => {
	x = ((x - period * phase) / period) % 1;
	x = x * x;
	return x * maxScale + 0.1;
};

const waveOpacity = (x, phase) => {
	x = ((x - period * phase) / period) % 1;
	x = Math.max(0, x);
	return x < 0.1 ? x / 0.1 : 1.1 - x * 1.1;
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
		const birthAmt = fade(age, rec.glowCurve === 'slow' ? 0.5 : 100);
		const deathAmt = fade(getMeta(rec).track?.lastAmp ?? 0, 400);
		const groupOpacity = birthAmt * deathAmt;
		const {wave1, wave2, wave3, flare} = getMeta(rec).glow;
		const waveAge = age + 1.3;
		wave1.scale.setScalar(waveSize(waveAge, 0));
		wave2.scale.setScalar(waveSize(waveAge, 0.33));
		wave3.scale.setScalar(waveSize(waveAge, 0.66));
		wave1.material.opacity = waveOpacity(waveAge, 0) * groupOpacity;
		wave2.material.opacity = waveOpacity(waveAge, 0.33) * groupOpacity;
		wave3.material.opacity = waveOpacity(waveAge, 0.66) * groupOpacity;
		let ageFactor;
		if (rec.glowCurve === 'slow') ageFactor = slowCurve(age);
		else ageFactor = defaultCurve(age);
		flare.material.opacity = ageFactor * Math.sqrt(getMeta(rec).track?.lastAmp ?? 0) * 0.5;
	}
};
