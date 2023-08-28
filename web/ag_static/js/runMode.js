/**
 * Run mode - with manual control and optional autopilot.
 */

import * as THREE from './lib/three.module.js';
import { renderer, camera, scene, intersectFloor, intersectPointer, updatePointer, monument } from './mainLoop.js';
import { anyLoading, beginWakeIntro } from './beacons/beaconPool.js';
import { clock, heightAt } from './world.js';
import { setAutopilotUi, showDetail } from './ui.js';
import { disableTips, enableTips, tipsEnabled } from './tips.js';
import { events } from './events.js';

let lastMouseX, lastMouseY, totalDrag;
let tgtDiskMesh, tgtLockMesh;
const yawAccel = x => Math.tanh(x * 6 - 2.5) * 0.5 + 1.5;

const intersectTgtDisk = (event) => {
	tgtDiskMesh.visible = false;
	const mouseHit = intersectPointer(event);
	if (!mouseHit) return;
	if (mouseHit.object.isInstancedMesh) {
		// monument
		if (!isMeshWalkable(mouseHit)) return;
		tgtDiskMesh.position.set(0, 0, 0);
		tgtDiskMesh.lookAt(getMeshHitNormal(mouseHit));
		tgtDiskMesh.position.copy(mouseHit.point);
	} else if (mouseHit.object.layers.isEnabled(0)) {
		// terrain
		tgtDiskMesh.position.set(0, 0, 0);
		tgtDiskMesh.lookAt(mouseHit.face.normal);
		tgtDiskMesh.position.copy(mouseHit.point);
	} else {
		// beacon
		tgtDiskMesh.position.copy(mouseHit.object.parent.position);
		tgtDiskMesh.rotation.set(Math.PI * -0.5, 0, 0);
	}
	tgtDiskMesh.translateZ(2);
	tgtDiskMesh.visible = true;
	return mouseHit;
};

const onPointerDown = event => {
	// preventDefault avoids additional "mouse" events on touchscreens
	event.preventDefault();
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
	totalDrag = 0;
	renderer.domElement.setPointerCapture(event.pointerId);
	renderer.domElement.addEventListener('pointermove', onCapturedMove);
	renderer.domElement.addEventListener('pointerup', onCapturedUp);
	runMode.tgtYaw = camera.rotation.y;
	runMode.dragTime = clock.worldTime;
};

const onCapturedMove = event => {
	event.preventDefault();
	updatePointer(event);
	const diffX = (event.clientX - lastMouseX) / renderer.domElement.clientWidth;
	const diffY = (event.clientY - lastMouseY) / renderer.domElement.clientHeight;
	totalDrag += new THREE.Vector2(diffX, diffY).length();

	let yawAmp = yawAccel(Math.abs(camera.rotation.y - runMode.tgtYaw));
	runMode.tgtYaw += 2 * diffX * yawAmp;

	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
	runMode.dragTime = clock.worldTime;
};

export const xz = inVec3 => new THREE.Vector2(inVec3.x, inVec3.z);
export let camFloor = 0;
let tgtFloor = 0;

const doorZone = new THREE.Box2(new THREE.Vector2(-50, 4450), new THREE.Vector2(60, 4580));
const apexZone = new THREE.Box3(
	new THREE.Vector3(1022-150, 894-150, 5791-150),
	new THREE.Vector3(1022+150, 894+150, 5791+150)
);
const isMeshWalkable = (hit) => {
	return getMeshHitNormal(hit).y > 0.75 || apexZone.containsPoint(hit.point);
};
const getMeshHitNormal = (hit) => {
	const n = hit.face.normal.clone();
	const m = new THREE.Matrix4();
	hit.object.getMatrixAt(hit.instanceId, m);
	const m2 = new THREE.Matrix4().extractRotation(m);
	const m3 = new THREE.Matrix4().extractRotation(hit.object.matrix);
	return n.applyMatrix4(m2).applyMatrix4(m3).normalize();
};
const floorsAvailable = (x, z) => {
	const hit0 = intersectFloor(0, x, z);
	const hit1 = intersectFloor(1, x, z);
	const terrainY = hit0 ? hit0.point.y : heightAt(x, z);
	const ret = [0];
	if (hit1 && isMeshWalkable(hit1) && hit1.point.y > terrainY) ret.push(1);
	return ret;
};
const checkForCliff = () => {
	if (doorZone.containsPoint(runMode.tgtXz)) return false;
	const nose = runMode.tgtXz.clone().addScaledVector(runMode.direction, 20);
	const noseFloors = floorsAvailable(nose.x, nose.y);
	return (!noseFloors.includes(tgtFloor));
};
const wallCaster = new THREE.Raycaster();
const checkForWall = () => {
	const floorHit = intersectFloor(tgtFloor, runMode.tgtXz.x, runMode.tgtXz.y);
	const y = floorHit ? floorHit.point.y : heightAt(runMode.tgtXz.x, runMode.tgtXz.y);
	const src = new THREE.Vector3(runMode.tgtXz.x, y+50, runMode.tgtXz.y);
	wallCaster.set(src, new THREE.Vector3(runMode.direction.x, 0, runMode.direction.y));
	const inter = wallCaster.intersectObject(monument, true)[0];
	if (!inter) return false;
	return (inter.distance < 60);
};

const stop = () => { runMode.stepFn = undefined; };

const goToDisk = ({spectate}={}) => {
	if (clock.paused) events.trigger('resume');
	setAutopilotUi(false);
	tgtLockMesh.rotation.copy(tgtDiskMesh.rotation);
	tgtLockMesh.position.copy(tgtDiskMesh.position);
	const tgtPos = tgtDiskMesh.position.clone();
	if (spectate) {
		// keep some distance to the target
		tgtLockMesh.position.add(
			camera.position.clone().sub(tgtPos).normalize().multiplyScalar(100)
		);
	}
	tgtLockMesh.position.y += 2;
	tgtLockMesh.visible = true;
	const startPos = runMode.tgtXz.clone();
	const endPos = xz(tgtLockMesh.position);
	let startTime = clock.worldTime;
	let endTime = clock.worldTime + Math.max(5, startPos.distanceTo(endPos) * 0.06);
	let endYawTime = clock.worldTime + 5;
	const startYaw = runMode.tgtYaw;
	const relPos = xz(tgtPos).sub(endPos).normalize();
	const endYaw = Math.PI * -0.5 - Math.atan2(relPos.y, relPos.x);
	runMode.dragTime = clock.worldTime - 200;
	runMode.direction = endPos.clone().sub(startPos).normalize();
	runMode.stepFn = () => {
		if (checkForCliff() || checkForWall()) return stop();
		if (runMode.dragTime > startTime) spectate = false;
		if (!clock.paused) {
			const s = runMode.speed*runMode.speed*Math.sign(runMode.speed);
			startTime -= clock.diff*s;
			endTime -= clock.diff*s;
			endYawTime -= clock.diff*s;
		}
		if (clock.worldTime > endTime) stop();
		runMode.tgtXz = startPos.clone();
		runMode.tgtXz.lerp(endPos, (clock.worldTime - startTime) / (endTime - startTime));
		if (spectate) {
			const yawNo360 = endYaw + Math.round((startYaw - endYaw) / tau) * tau;
			const yawProg = (clock.worldTime - startTime) / (endYawTime - startTime);
			if (yawProg < 1) runMode.tgtYaw = (1 - yawProg) * startYaw + yawProg * yawNo360;
		}
	};
};

const onCapturedUp = event => {
	event.preventDefault();
	renderer.domElement.releasePointerCapture(event.pointerId);
	renderer.domElement.removeEventListener('pointermove', onCapturedMove);
	renderer.domElement.removeEventListener('pointerup', onCapturedUp);
	updatePointer(event);
	const mouseHit = intersectTgtDisk(event);
	if (totalDrag > 0.01 || clock.worldTime - runMode.dragTime > 2) return;
	if (!mouseHit) return;
	/** @type {import('./beacons/beaconPool.js').BeaconResource} */
	const beaconRes = mouseHit.object.userData?.beaconRes;
	if (mouseHit.object.isInstancedMesh) {
		if (isMeshWalkable(mouseHit)) goToDisk();
	} else if (mouseHit.object.layers.isEnabled(0)) {
		// terrain
		goToDisk();
	} else if (beaconRes) {
		// beacon
		goToDisk({spectate: true});
		showDetail(beaconRes);
	}
};

const enable = () => {
	camera.rotation.x = 0;
	camera.rotation.z = 0;
	runMode.tgtYaw = camera.rotation.y;
	runMode.tgtXz = xz(camera.position);
	stop();
	beginWakeIntro();
	renderer.domElement.addEventListener('pointerdown', onPointerDown);
	if (!tipsEnabled) enableTips();
	const tgtDiskMap = new THREE.TextureLoader().load(window.agStaticPath+'img/tgtdisk.png');
	const tgtDiskGeo = new THREE.PlaneGeometry(30, 30);
	const tgtDiskMat = new THREE.MeshBasicMaterial({
		map: tgtDiskMap,
		transparent: true,
		depthWrite: false,
	});
	tgtDiskMesh = new THREE.Mesh(tgtDiskGeo, tgtDiskMat);
	tgtDiskMesh.renderOrder = 1;
	scene.add(tgtDiskMesh);
	const tgtLockMap = new THREE.TextureLoader().load(window.agStaticPath+'img/tgtlock.png');
	const tgtLockGeo = new THREE.PlaneGeometry(30, 30);
	const tgtLockMat = new THREE.MeshBasicMaterial({
		map: tgtLockMap,
		transparent: true,
		depthWrite: false,
	});
	tgtLockMesh = new THREE.Mesh(tgtLockGeo, tgtLockMat);
	tgtLockMesh.renderOrder = 2;
	tgtLockMesh.visible = false;
	scene.add(tgtLockMesh);
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
		yaw: Math.round(camera.rotation.y * 100) / 100,
	};
	window.recSteps.push(step);
	console.log(step);
});

let waypointId;
const waypoints = [
	{ x: -87, z: 595.8, yaw: 0 },
	{ x: -160, z: 435.8, yaw: 0 },
	{ x: -50, z: 207.4, yaw: 0 },
	{ x: -40, z: 150, yaw: 0 },
	{ x: 80, z: -78, yaw: -0.22 },
	{ x: 104.8, z: -339.8, yaw: 0.26 },
	{ x: 30, z: -401.3, yaw: 0.21 },
	{ x: -15, z: -479, yaw: 0.21 },
	{ x: 15, z: -1004.1, yaw: 0.21 },
	{ x: -23.6, z: -1285, yaw: 0.42 },
	{ x: -132.6, z: -1527.9, yaw: -0.26 },
	// bus stop 1:
	{ x: 32, z: -1726.6, yaw: 1.12 },
	{ x: 32, z: -1726.6, yaw: 1.3 },
	{ x: 32, z: -1726.6, yaw: 2 },
	{ x: 32, z: -1726.6, yaw: 2.5 },
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
	{ x: 1443.5, z: -1546.8, yaw: 2.88 },
	{ x: 1437.6, z: -1403.3, yaw: 2.6 },
	{ x: 1283.8, z: -1248.9, yaw: 3.03 },
	{ x: 1280.7, z: -1208.5, yaw: 3.03 },
	{ x: 1316.7, z: -1114.8, yaw: 2.85 },
	{ x: 1388.9, z: -1040.6, yaw: 2.28 },
	{ x: 1342.4, z: -939.9, yaw: 0.99 },
	{ x: 1342.1, z: -938.6, yaw: 1.8 },
	{ x: 1341.1, z: -937.1, yaw: 2.35 },
	{ x: 1328.5, z: -919.4, yaw: 2.73 },
	{ x: 1248, z: -481.2, yaw: 2.68 },
	{ x: 1166.4, z: -289, yaw: 3.22 },
	{ x: 1389.8, z: 204.3, yaw: 2.94 },
	{ x: 1389.2, z: 258.8, yaw: 2.91 },
	{ x: 1319.3, z: 668.4, yaw: 3.2 },
	{ x: 1371.7, z: 811.8, yaw: 3.06 },
	{ x: 1399.3, z: 904.9, yaw: 2.24 },
	{ x: 1304.6, z: 904.2, yaw: 1.72 },
	{ x: 1281.5, z: 910.1, yaw: 1.61 },
	{ x: 1208.7, z: 948.4, yaw: 2.15 },
	{ x: 1150.5, z: 1062.6, yaw: 1.37 },
	{ x: 1057.1, z: 1112.3, yaw: 0.78 },
	{ x: 1010.9, z: 1065.8, yaw: 6.68 },
	{ x: 990.1, z: 1043.4, yaw: 6.96 },
	{ x: 909.8, z: 1030.1, yaw: 7.27 },
	{ x: 817.5, z: 1037.3, yaw: 7.21 },
	{ x: 681.2, z: 1000.9, yaw: 7.14 },
	{ x: 449.4, z: 989.2, yaw: 7.06 },
	{ x: 279.2, z: 956.3, yaw: 6.92 },
	{ x: 157.2, z: 928.9, yaw: 6.7 },
	{ x: -53.9, z: 742.3, yaw: -0.05 },

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
export const toggleAutopilot = (toggle, isIntro) => {
	if (!runMode.enabled) return;
	if (toggle) {
		tgtLockMesh.visible = false;
		let startPos, endPos, startTime, endTime, startYaw, endYaw, yawTime;
		const setWaypoint = waypoint => {
			console.log('moving to: ', waypointId, waypoint);
			startPos = runMode.tgtXz.clone();
			endPos = xz(waypoint);
			runMode.direction = endPos.clone().sub(startPos).normalize();
			startTime = clock.worldTime;
			endTime = startTime + Math.max(4, startPos.distanceTo(endPos) * 0.06);;
			if (isIntro) {
				startTime += 3;
				endTime += 5;
			}
			yawTime = clock.worldTime;
			startYaw = runMode.tgtYaw;
			endYaw = waypoint.yaw;
			isIntro = false;
		};
		if (isIntro) waypointId = 0;
		else waypointId = closestWaypoint(runMode.tgtXz);
		setWaypoint(waypoints[waypointId]);
		runMode.stepFn = () => {
			if (checkForCliff() || checkForWall()) return stop();
			if (clock.worldTime < startTime) return;
			if (clock.worldTime > endTime) {
				waypointId = (waypointId + 1) % waypoints.length;
				setWaypoint(waypoints[waypointId]);
			}
			if (anyLoading()) {
				startTime += clock.diff;
				endTime += clock.diff;
				yawTime += clock.diff;
			} else if (!clock.paused) {
				let s = runMode.speed;
				s = s*0.5 + s*s*Math.sign(s)*0.25;
				startTime -= clock.diff*s;
				endTime -= clock.diff*s;
				yawTime -= clock.diff*s;
			}
			const progress = (clock.worldTime - startTime) / (endTime - startTime);
			runMode.tgtXz = startPos.clone().lerp(endPos, progress);
			if (clock.worldTime - runMode.dragTime > 2) {
				const yawNo360 = endYaw + Math.round((startYaw - endYaw) / tau) * tau;
				const yawProg = (clock.worldTime - yawTime) / (endTime - yawTime);
				runMode.tgtYaw = (1 - yawProg) * startYaw + yawProg * yawNo360;
			} else {
				yawTime = clock.worldTime;
				startYaw = runMode.tgtYaw;
			}
		};
	} else {
		stop();
	}
};

const update = () => {
	if (!runMode.enabled) return;
	if (runMode.tgtXz && doorZone.containsPoint(runMode.tgtXz)) {
		tgtFloor = Math.max(...floorsAvailable(runMode.tgtXz.x, runMode.tgtXz.y));
	}
	const camPos = xz(camera.position);
	if (camFloor !== tgtFloor) {
		camFloor = Math.max(...floorsAvailable(camPos.x, camPos.y));
	}
	const d = camPos.distanceTo(xz(tgtLockMesh.position));
	tgtLockMesh.material.opacity = 1 - 1 / (d * d * 0.00002 + 1);
	intersectTgtDisk();
};

export const runMode = {
	enable,
	disable,
	update,
	enabled: false,
	tgtXz: undefined,
	tgtYaw: undefined,
	stepFn: undefined,
	direction: undefined,
	speed: 0,
	dragTime: 0,
};
