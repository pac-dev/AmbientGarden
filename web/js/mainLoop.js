import * as THREE from './lib/three.module.js';
import { events } from './events.js';
import { initTerrain, nearGroup, farGroup } from './terrain.js';
import { heightAt, ratio, clock, loadNearMap, loadFarMap } from './world.js';
import { beaconGroup, initBeaconPool, initTrackPool } from './beacons.js';
import { updateResources } from './resourcePool.js';
import { runMode, xz } from './runMode.js';
import { editMode } from './editMode.js';
import { enableTips } from './tips.js';
import { initLeafMaterials } from './leafMaterial.js';

const shadowWidth = 1024;
const container = document.getElementById('gl_container');
const dLight = new THREE.DirectionalLight(0xffffff, 0.5);
const getAspect = () => window.innerWidth / window.innerHeight;

export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const camera = new THREE.PerspectiveCamera(70, getAspect(), 1, 10000);
export const scene = new THREE.Scene();
export const initGfx = () => {
	container.style.touchAction = 'none';
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(ratio);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	container.appendChild(renderer.domElement);
	initPos();
	scene.background = new THREE.Color(0xcdb1d7);
	const aLight = new THREE.AmbientLight(0x333333);
	scene.add(aLight);
	dLight.position.set(9, 20, 13);
	dLight.castShadow = true;
	Object.assign(dLight.shadow.camera, {
		near: 1,
		far: 1400,
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
	initLeafMaterials(window.innerWidth, window.innerHeight, shadowWidth);
};

const teleport = (x, z) => camera.position.set(x, 50, z + 200);
const initPos = () => {
	const aspect = getAspect();
	const x = (aspect - 0.83) * ((50 - 100) / (2.5 - 0.83)) - 50; // 2.5 -> -100 ; 0.83 -> -50
	const z = (aspect - 0.83) * ((580 - 620) / (2.5 - 0.83)) + 620; // 2.5 -> 580 ; 0.83 -> 620
	teleport(x, z);
};

let terrainReady = false;
export const initWorld = async ({ trackLoader, nearMap, farMap }) => {
	await loadNearMap(nearMap);
	await loadFarMap(farMap);
	scene.add(beaconGroup);
	initTerrain(scene, new THREE.Vector3());
	initBeaconPool();
	initTrackPool(trackLoader);
	enableTips();
	updateResources(camera.position.x, camera.position.z);
	terrainReady = true;
};

let stats, gpuPanel;
export const startStats = (Stats, GPUStatsPanel) => {
	stats = new Stats();
	container.appendChild(stats.dom);
	gpuPanel = new GPUStatsPanel(renderer.getContext());
	stats.addPanel( gpuPanel );
	stats.showPanel(0);
};

const walkCaster = new THREE.Raycaster();
const mouseCaster = new THREE.Raycaster();
mouseCaster.layers.set(1);
const mouse = new THREE.Vector2();
export const intersectMouse = () => {
	if (!mouse.x && !mouse.y) return;
	mouseCaster.setFromCamera(mouse, camera);
	const mouseHits = mouseCaster.intersectObject(scene, true);
	return mouseHits[0];
};

const stepWorld = (gfx = true) => {
	clock.advance(gfx);
	if (clock.diff < 1 / 80) return;
	if (runMode.enabled) {
		if (runMode.stepFn) runMode.stepFn();
		let smoothing = clock.worldTime - runMode.dragTime > 2 ? 0.005 : 0.1;
		camera.rotation.y += (runMode.tgtYaw - camera.rotation.y) * smoothing;
		const newPos = xz(camera.position).lerp(runMode.tgtXz, clock.diff * 0.01 * 60);
		camera.position.x = newPos.x;
		camera.position.z = newPos.y;
	}
	const dropMe = editMode.enabled ? editMode.orbiter.target : camera.position;
	if (terrainReady) {
		walkCaster.set(new THREE.Vector3().copy(dropMe).setY(1000), new THREE.Vector3(0, -1, 0));
		const inter = walkCaster.intersectObject(farGroup, true)[0];
		let iy;
		if (inter) {
			iy = inter.point.y + 50;
		} else {
			iy = heightAt(dropMe.x, dropMe.z) + 50;
		}
		const ydiff = iy - dropMe.y;
		dropMe.y += ydiff;
		if (editMode.enabled) camera.position.y += ydiff;
	}
	/** @type { THREE.Vector3 } */
	const zax = new THREE.Vector3(0, 0, 1);
	const tgt = dLight.target.position;
	tgt.copy(camera.position)
		.applyAxisAngle(zax, 0.7)
		.multiplyScalar(0.25)
		.round()
		.multiplyScalar(4)
		.applyAxisAngle(zax, -0.7);
	dLight.position.copy(tgt).add(new THREE.Vector3(0, 700, 0).applyAxisAngle(zax, -0.7));
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

export const addMainListeners = () => {
	window.addEventListener('resize', () => {
		if (document.getElementById('welcome_modal')) initPos();
		camera.aspect = getAspect();
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		// shadowMapHelper.updateForWindowResize();
		events.trigger('resize', {
			width: window.innerWidth,
			height: window.innerHeight,
			shadowWidth: dLight.shadow.mapSize.width
		});
	});
	renderer.domElement.addEventListener(
		'mousemove',
		event => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		},
		false
	);
	renderer.domElement.addEventListener(
		'mouseleave',
		() => {
			mouse.x = 0;
			mouse.y = 0;
		},
		false
	);
};
