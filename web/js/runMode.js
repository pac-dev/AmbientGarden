import * as THREE from './lib/three.module.js';
import { intersectMouse, renderer, camera, scene } from './mainLoop.js';
import { beginWakeIntro } from './beacons.js';
import { clock } from './World.js';
import { setAutopilotUi } from './ui.js';
import { disableTips, enableTips, tipsEnabled } from './Tips.js';

let lastMouseX, lastMouseY, totalMovement;
const yawAccel = x => Math.tanh(x*6-2.5)*0.5+1.5;

const onPointerDown = event => {
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
	totalMovement = 0;
	renderer.domElement.setPointerCapture(event.pointerId);
	renderer.domElement.addEventListener('pointermove', onCapturedMove);
	renderer.domElement.addEventListener('pointerup', onCapturedUp);
	runMode.tgtYaw = camera.rotation.y;
	runMode.dragTime = clock.worldTime;
};

const onCapturedMove = event => {
	const diffX = (event.clientX - lastMouseX)/renderer.domElement.clientWidth;
	const diffY = (event.clientY - lastMouseY)/renderer.domElement.clientHeight;
	totalMovement += new THREE.Vector2(diffX, diffY).length();

	let yawAmp = yawAccel(Math.abs(camera.rotation.y - runMode.tgtYaw));
	runMode.tgtYaw += 2*diffX*yawAmp;

	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
	runMode.dragTime = clock.worldTime;
};

export const xz = inVec3 => new THREE.Vector2(inVec3.x, inVec3.z);

const onCapturedUp = event => {
	runMode.dragging = false;
	renderer.domElement.releasePointerCapture(event.pointerId);
	renderer.domElement.removeEventListener('pointermove', onCapturedMove);
	renderer.domElement.removeEventListener('pointerup', onCapturedUp);
	if (totalMovement > 0.01 || clock.worldTime - runMode.dragTime > 2) return;
	const mouseHit = intersectMouse();
	if (!mouseHit) return;
	setAutopilotUi(false);
	tgtLockMesh.position.set(0, 0, 0);
	tgtLockMesh.lookAt(mouseHit.face.normal);
	tgtLockMesh.position.copy(mouseHit.point);
	if (!mouseHit.object.layers.isEnabled(0)) {
		// keep some distance to beacon
		tgtLockMesh.position.add(camera.position.clone().sub(mouseHit.point).normalize().multiplyScalar(100));
	}
	tgtLockMesh.position.y += 2;
	tgtLockMesh.visible = true;
	const startPos = runMode.tgtXz.clone();
	const endPos = xz(tgtLockMesh.position);
	const startTime = clock.worldTime;
	const endTime = clock.worldTime + startPos.distanceTo(endPos)*0.06;
	runMode.stepFn = () => {
		if (clock.worldTime > endTime) {
			runMode.stepFn = undefined;
			tgtLockMesh.visible = false;
		}
		runMode.tgtXz = startPos.clone().lerp(endPos, (clock.worldTime - startTime)/(endTime - startTime));
		const d = xz(camera.position).distanceTo(endPos);
		tgtLockMesh.material.opacity = 1 - 1/(d*d*0.00002+1);
	};
};

const enable = () => {
	camera.rotation.x = 0;
	camera.rotation.z = 0;
	runMode.tgtYaw = camera.rotation.y;
	runMode.tgtXz = xz(camera.position);
	runMode.stepFn = undefined;
	beginWakeIntro();
	renderer.domElement.addEventListener('pointerdown', onPointerDown);
	// renderer.domElement.addEventListener('pointercancel', onPointerCancel);
	if (!tipsEnabled) enableTips();
	runMode.enabled = true;
};

const disable = () => {
	if (tipsEnabled) disableTips();
	if (!runMode.enabled) return;
	renderer.domElement.removeEventListener('pointerdown', onPointerDown);
	// this is checked by the track pool, so it stops all tracks
	runMode.enabled = false;
};

// console.log(JSON.stringify(recSteps, null, 1))
window.recSteps = [];
window.document.addEventListener('keydown', event => {
	if (event.key !== 'l') return;
	const step = {
		x: Math.round(camera.position.x * 10) / 10,
		z: Math.round(camera.position.z * 10) / 10,
		yaw: Math.round(camera.rotation.y*100)/100,
	};
	window.recSteps.push(step);
	console.log(step);
});

let waypointId = 1;
const waypoints = [
	{ x: -64.8, z: 808.2, yaw: 0 },
	{ x: -49.6, z: 511.8, yaw: -0.31 },
	{ x: 100.9, z: 339.3, yaw: -0.14 },
	{ x: -27.2, z: -97.2, yaw: 0.09 },
	{ x: 27.2, z: -420.8, yaw: 0.09 },
	{ x: 49.6, z: -856.1, yaw: 0.09 },
	{ x: -36.3, z: -1213.3, yaw: 0.28 },
	{ x: -163.4, z: -1497.8, yaw: -0.14 },
	// bus stop 1:
	{ x: 32, z: -1726.6, yaw: 1.12 },
	{ x: 32, z: -1726.6, yaw: 2 },
	{ x: 32, z: -1726.6, yaw: 3 },
	{ x: 32, z: -1726.6, yaw: 4 },
	// --
	{ x: 341.5, z: -1671.8, yaw: 4.83 },
	{ x: 666.8, z: -1628.6, yaw: 4.82 },
	{ x: 1064.2, z: -1709.9, yaw: 4.82 },
	// bus stop 2:
	{ x: 1400.8, z: -1647.4, yaw: 4.55 },
	{ x: 1400.8, z: -1647.4, yaw: 4.2 },
	// --
	{ x: 1407.6, z: -1332.6, yaw: 3.3 },
	// bus stop 3:
	{ x: 1410.8, z: -1135, yaw: 3.61 },
	{ x: 1410.8, z: -1135, yaw: 3.4 },
	// --
	{ x: 1309.8, z: -408.7, yaw: 2.47 }
];

const closestWaypoint = refXz => {
	let bestId, bestDist;
	for (let [id, waypoint] of waypoints.entries()) {
		const toPoint = xz(waypoint).sub(refXz);
		const toNext = xz(waypoints[(id + 1) % waypoints.length]).sub(xz(waypoint));
		const dot = toPoint.dot(toNext);
		if (dot < 0) continue;
		const dist = xz(waypoint).distanceTo(refXz);
		if (bestDist === undefined || dist < bestDist) {
			bestDist = dist;
			bestId = id;
		}
	}
	return bestId;
};

const tau = Math.PI * 2;
export const toggleAutopilot = toggle => {
	if (toggle) {
		tgtLockMesh.visible = false;
		let startPos, endPos, posTime, endTime, startYaw, endYaw, yawTime;
		const setWaypoint = waypoint => {
			console.log('moving to: ', waypointId, waypoint)
			startPos = runMode.tgtXz.clone();
			endPos = xz(waypoint);
			posTime = clock.worldTime;
			const dur = Math.max(4, startPos.distanceTo(endPos)*0.06);
			endTime = clock.worldTime + dur;
			yawTime = clock.worldTime;
			startYaw = runMode.tgtYaw;
			endYaw = waypoint.yaw;
		};
		waypointId = closestWaypoint(runMode.tgtXz);
		setWaypoint(waypoints[waypointId]);
		runMode.stepFn = () => {
			if (clock.worldTime > endTime) {
				waypointId = (waypointId + 1) % waypoints.length;
				setWaypoint(waypoints[waypointId]);
			}
			const progress = (clock.worldTime - posTime)/(endTime - posTime);
			runMode.tgtXz = startPos.clone().lerp(endPos, progress);
			if (clock.worldTime - runMode.dragTime > 2) {
				const yawNo360 = endYaw + Math.round((startYaw - endYaw) / tau) * tau;
				const yawProg = (clock.worldTime - yawTime)/(endTime - yawTime);
				runMode.tgtYaw = (1 - yawProg) * startYaw + yawProg * yawNo360;
			} else {
				yawTime = clock.worldTime;
				startYaw = runMode.tgtYaw;
			}
		};
	} else {
		runMode.stepFn = undefined;
	}
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
	enabled: false, tgtPos: undefined, tgtYaw: undefined, stepFn: undefined, dragTime: 0
};