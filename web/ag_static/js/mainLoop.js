/**
 * Main loop and initialization. Everything here is shared between "run mode"
 * and "edit mode", see runMode.js and editMode.js for specific code. For
 * example, player movement code is mostly in runMode.js.
 * 
 * Functions here are called by appFrozen.js or appEdit.js depending on which
 * page is loaded.
 */

import * as THREE from './lib/three.module.js';
import { events } from './events.js';
import { initTerrain, farGroup } from './gfx/terrain.js';
import { heightAt, ratio, clock, loadNearMap, loadFarMap } from './world.js';
import { beaconGroup, initBeaconPool, initTrackPool } from './beacons/beaconPool.js';
import { updateResources } from './resourcePool.js';
import { runMode, camFloor, xz } from './runMode.js';
import { editMode } from './editMode.js';
import { enableTips } from './tips.js';
import { initLeafMaterials } from './gfx/leafMaterial.js';
import { addSky } from './gfx/sky.js';
import { mkMonument } from './gfx/monument.js';

const getAspect = () => window.innerWidth / window.innerHeight;
export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const camera = new THREE.PerspectiveCamera(70, getAspect(), 1, 10000);
export const scene = new THREE.Scene();
const container = document.getElementById('gl_container');
const dLight = new THREE.DirectionalLight(0xffffff, 0.5);
export const monument = mkMonument();
const shadowWidth = 1024;
let terrainReady = false;

const teleport = (x, z) => camera.position.set(x, 0, z + 200);

// the ideal start position depends on screen dimensions
const initPos = () => {
	const aspect = Math.max(0.5, Math.min(2, getAspect()));
	const x = (aspect - 0.83) * ((30 - 100) / (2.5 - 0.83)) - 30; // 2.5 -> -100 ; 0.83 -> -30
	const z = (aspect - 0.83) * ((580 - 620) / (2.5 - 0.83)) + 620; // 2.5 -> 580 ; 0.83 -> 620
	teleport(x, z);
};

// start loading resources
export const initWorld = async ({ trackLoader, nearMap, farMap }) => {
	await loadNearMap(nearMap);
	await loadFarMap(farMap);
	scene.add(beaconGroup);
	initPos();
	initTerrain(scene, new THREE.Vector3());
	initBeaconPool();
	initTrackPool(trackLoader);
	enableTips();
	updateResources(camera.position.x, camera.position.z);
	terrainReady = true;
};

// start displaying graphics
export const initGfx = () => {
	container.style.touchAction = 'none';
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(ratio);
	renderer.shadowMap.enabled = true;
	container.appendChild(renderer.domElement);
	scene.add(camera);
	addSky(window.innerWidth, window.innerHeight);
	const aLight = new THREE.AmbientLight(0x333333);
	scene.add(aLight);
	dLight.position.set(9, 20, 13);
	dLight.castShadow = true;
	Object.assign(dLight.shadow.camera, {
		near: 1,
		far: 2800,
		left: -1024,
		right: 1024,
		bottom: -1024,
		top: 1024,
	});
	dLight.shadow.mapSize.width = shadowWidth;
	dLight.shadow.mapSize.height = shadowWidth;
	dLight.shadow.bias = 0;
	scene.add(dLight);
	scene.add(dLight.target);
	monument.scale.set(10,10,10);
	monument.position.set(-20, 565, 4475);
	monument.rotation.set(0.13,-0.35,0.09);
	scene.add(monument);
	initLeafMaterials(window.innerWidth, window.innerHeight, shadowWidth);
};

let stats, gpuPanel;

// stats - currently only in edit mode but can be enabled anywhere
export const startStats = (Stats, GPUStatsPanel) => {
	stats = new Stats();
	container.appendChild(stats.dom);
	gpuPanel = new GPUStatsPanel(renderer.getContext());
	stats.addPanel( gpuPanel );
	stats.showPanel(0);
};

const mouse = new THREE.Vector2();
const floorCaster = new THREE.Raycaster();
const mouseCaster = new THREE.Raycaster();
mouseCaster.layers.set(1);

// update pointer state
export const updatePointer = (event) => {
	if (!event || event.type === 'mouseleave') {
		mouse.x = 0;
		mouse.y = 0;
	} else {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}
};

// get intersection of pointer with world
export const intersectPointer = (event) => {
	if (event) updatePointer(event);
	if (!mouse.x && !mouse.y) return;
	mouseCaster.setFromCamera(mouse, camera);
	const mouseHits = mouseCaster.intersectObject(scene, true);
	if (event) updatePointer();
	return mouseHits[0];
};

// get "gravity" intersection at a given floor
// (floor 0 = terrain; floor 1 = climbable mesh)
export const intersectFloor = (floor, x, z) => {
	const obj = floor ? monument : farGroup;
	floorCaster.set(new THREE.Vector3(x, 10000, z), new THREE.Vector3(0, -1, 0));
	return floorCaster.intersectObject(obj, true)[0];
};

// called every frame
const stepWorld = (gfx = true) => {
	clock.advance(gfx);
	if (clock.diff < 1 / 80) return;
	if (runMode.enabled) {
		if (runMode.stepFn) runMode.stepFn();
		// smooth out rotation
		let rotoSmooth = clock.worldTime - runMode.dragTime > 2 ? 0.005 : 0.1;
		camera.rotation.y += (runMode.tgtYaw - camera.rotation.y) * rotoSmooth;
		// smooth out position
		const newPos = xz(camera.position).lerp(runMode.tgtXz, clock.diff * 0.01 * 60);
		camera.position.x = newPos.x;
		camera.position.z = newPos.y;
	}
	// drop to the ground
	const dropMe = editMode.enabled ? editMode.orbiter.target : camera.position;
	if (terrainReady) {
		const inter = intersectFloor(runMode.enabled ? camFloor : 0, dropMe.x, dropMe.z);
		let iy;
		if (inter) {
			// if available, the intersection is better because height is interpolated
			iy = inter.point.y + 50;
		} else {
			// have a backup because the resoucePool does not guarantee terrain at any point
			iy = heightAt(dropMe.x, dropMe.z) + 50;
		}
		if (editMode.enabled) camera.position.y += iy - dropMe.y;
		// smooth out altitude - maybe this should only happen in the door zone
		let altiSmooth = Math.abs(iy - dropMe.y) > 60 ? 1 : 0.05;
		dropMe.y += (iy - dropMe.y)*altiSmooth;
	}
	// move light/shadowmap to cover the space in front of the camera
	const zax = new THREE.Vector3(0, 0, 1);
	const tgt = dLight.target.position;
	tgt.copy(camera.position)
		.applyAxisAngle(zax, 0.7)
		.multiplyScalar(0.25)
		.round()
		.multiplyScalar(4)
		.applyAxisAngle(zax, -0.7);
	dLight.position.copy(tgt).add(new THREE.Vector3(0, 1400, 0).applyAxisAngle(zax, -0.7));
	events.trigger('timestep');
	editMode.update();
	runMode.update();
	if (terrainReady) updateResources(camera.position.x, camera.position.z);
};

const animate = () => {
	requestAnimationFrame(animate);
	stepWorld(true);
	if (gpuPanel) gpuPanel.startQuery();
	renderer.render(scene, camera);
	// shadowMapHelper.render(renderer);
	if (gpuPanel) gpuPanel.endQuery();
	if (stats) stats.update();
};

export const startMainLoop = () => {
	setInterval(stepWorld, 125, false);
	animate();
};

let doneWelcome = false;
events.on('doneWelcome', () => { doneWelcome = true });
export const addMainListeners = () => {
	window.addEventListener('resize', () => {
		// keep control of the position while not yet running
		if (!doneWelcome) initPos();
		camera.aspect = getAspect();
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		// shadowMapHelper.updateForWindowResize();
		// update shaders with the new size
		events.trigger('resize', {
			width: window.innerWidth,
			height: window.innerHeight,
			shadowWidth: dLight.shadow.mapSize.width
		});
	});
	renderer.domElement.addEventListener('mousemove', updatePointer, false);
	renderer.domElement.addEventListener('mouseleave', updatePointer, false);
};
