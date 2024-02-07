import * as THREE from '../lib/three.module.js';
import { mkFlatMaterial } from '../gfx/flatMaterial.js';
import { camera, intersectFloor, scene } from '../mainLoop.js';
import { events } from '../events.js';

const rayMat = mkFlatMaterial(.6, .4, .4, true);

export const addRay = (params, x, z) => {
	const o = Object.assign(params, {});
	o.height = o.height ?? 200;
	const rayGeom = new THREE.PlaneGeometry(10, 1000, 1, 10);
	rayGeom.translate(0,500,0);
	const mesh = new THREE.Mesh(rayGeom, rayMat);
	const ray = new THREE.Group();
	o.lookAtMe = true;
	o.unclickable = true;
	ray.userData = o;
	let yInter = intersectFloor(1, x, z);
	if (!yInter) yInter = intersectFloor(0, x, z);
	ray.position.set(x, yInter.point.y, z);
	ray.add(mesh);
	return ray;
};

const temp = new THREE.Vector3();
events.on('timestep', () => {
	scene.traverse((obj) => {
		if (obj.userData?.lookAtMe) {
			camera.getWorldPosition(temp);
			temp.y = obj.position.y;
			obj.lookAt(temp);
		}
	})
});