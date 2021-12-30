import * as THREE from './lib/three.module.js';
import { intersectMouse, renderer, camera, scene } from './mainLoop.js';
import { beginWakeIntro } from './beacons.js';
import { clock } from './World.js';

let lastMouseX, lastMouseY, totalMovement;
const yawAccel = x => Math.tanh(x*6-2.5)*0.5+1.5;

const onPointerDown = event => {
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
	totalMovement = 0;
	renderer.domElement.setPointerCapture(event.pointerId);
	renderer.domElement.addEventListener('pointermove', onCapturedMove);
	renderer.domElement.addEventListener('pointerup', onCapturedUp);
};

const onCapturedMove = event => {
	const diffX = (event.clientX - lastMouseX)/renderer.domElement.clientWidth;
	const diffY = (event.clientY - lastMouseY)/renderer.domElement.clientHeight;
	totalMovement += new THREE.Vector2(diffX, diffY).length();

	let yawAmp = yawAccel(Math.abs(camera.rotation.y - runMode.tgtYaw));
	runMode.tgtYaw += 2*diffX*yawAmp;

	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
};

const onCapturedUp = event => {
	renderer.domElement.releasePointerCapture(event.pointerId);
	renderer.domElement.removeEventListener('pointermove', onCapturedMove);
	renderer.domElement.removeEventListener('pointerup', onCapturedUp);
	if (totalMovement > 0.01) return;
	const mouseHit = intersectMouse();
	if (!mouseHit) return;
	tgtLockMesh.position.set(0, 0, 0);
	tgtLockMesh.lookAt(mouseHit.face.normal);
	tgtLockMesh.position.copy(mouseHit.point);
	if (!mouseHit.object.layers.isEnabled(0)) {
		// keep some distance to beacon
		tgtLockMesh.position.add(camera.position.clone().sub(mouseHit.point).normalize().multiplyScalar(100));
	}
	tgtLockMesh.position.y += 2;
	tgtLockMesh.visible = true;
	const startPos = new THREE.Vector3().copy(runMode.tgtPos);
	const endPos = new THREE.Vector3().copy(tgtLockMesh.position);
	const startTime = clock.worldTime;
	const endTime = clock.worldTime + startPos.distanceTo(endPos)*0.06;
	runMode.stepFn = t => {
		if (t > endTime) {
			runMode.stepFn = undefined;
			tgtLockMesh.visible = false;
		}
		runMode.tgtPos = new THREE.Vector3().copy(startPos).lerp(endPos, (t - startTime)/(endTime - startTime));
		const d = camera.position.distanceTo(endPos);
		tgtLockMesh.material.opacity = 1 - 1/(d*d*0.00002+1);
	};
};

const enable = () => {
	camera.rotation.x = 0;
	camera.rotation.z = 0;
	runMode.tgtYaw = camera.rotation.y;
	runMode.tgtPos = new THREE.Vector3().copy(camera.position);
	runMode.stepFn = undefined;
	beginWakeIntro();
	renderer.domElement.addEventListener('pointerdown', onPointerDown);
	// renderer.domElement.addEventListener('pointercancel', onPointerCancel);
	runMode.enabled = true;
};

const disable = () => {
	if (!runMode.enabled) return;
	renderer.domElement.removeEventListener('pointerdown', onPointerDown);
	// this is checked by the track pool, so it stops all tracks
	runMode.enabled = false;
};

let tgtDiskMesh, tgtLockMesh;
const update = () => {
	if (!runMode.enabled) return;
	if (!tgtDiskMesh) {
		const tgtDiskMap = new THREE.TextureLoader().load('img/tgtdisk.png');
		const tgtDiskGeo = new THREE.PlaneGeometry(30, 30);
		const tgtDiskMat = new THREE.MeshBasicMaterial({ map: tgtDiskMap, transparent: true, depthWrite: false });
		tgtDiskMesh = new THREE.Mesh(tgtDiskGeo, tgtDiskMat);
		tgtDiskMesh.renderOrder = 1;
		scene.add(tgtDiskMesh);
	}
	if (!tgtLockMesh) {
		const tgtLockMap = new THREE.TextureLoader().load('img/tgtlock.png');
		const tgtLockGeo = new THREE.PlaneGeometry(30, 30);
		const tgtLockMat = new THREE.MeshBasicMaterial({ map: tgtLockMap, transparent: true, depthWrite: false });
		tgtLockMesh = new THREE.Mesh(tgtLockGeo, tgtLockMat);
		tgtLockMesh.renderOrder = 2;
		tgtLockMesh.visible = false;
		scene.add(tgtLockMesh);
	}
	tgtDiskMesh.visible = false;
	const mouseHit = intersectMouse();
	if (!mouseHit) return;
	tgtDiskMesh.position.set(0, 0, 0);
	tgtDiskMesh.lookAt(mouseHit.face.normal);
	tgtDiskMesh.position.copy(mouseHit.point);
	tgtDiskMesh.position.y += 2;
	tgtDiskMesh.visible = true;
};

export const runMode = {
	enable, disable, update,
	enabled: false, tgtPos: undefined, tgtYaw: undefined, stepFn: undefined,
};