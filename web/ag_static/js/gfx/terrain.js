import * as THREE from '../lib/three.module.js';
import { mkNearMaterial } from './nearMaterial.js';
import { mkFarMaterial } from './farMaterial.js';
import { heightAt, tileSide } from '../world.js';
import { addResourcePool } from '../resourcePool.js';

const farSide = tileSide * 6;

export const nearGroup = new THREE.Group();
export const farGroup = new THREE.Group();
farGroup.renderOrder = -2;
nearGroup.renderOrder = -1;
// nearGroup.visible = false
let nearMat, farMat;

let totNears = 0;
const initNearZone = () => {
	const tile = new THREE.Group();
	nearGroup.add(tile);
	// tile.add(initVeg());
	const planeGeom = new THREE.PlaneGeometry(tileSide, tileSide, 16, 16).rotateX(-Math.PI / 2);
	const mesh = new THREE.Mesh(planeGeom, nearMat);
	mesh.layers.enable(1);
	tile.add(mesh);
	// console.log(`inited ${++totNears} near zones`);
	return tile;
};

const updateNearZone = (tile, x, z) => {
	tile.position.set(x, 0, z);
	for (let obj of tile.children) {
		if (obj.isMesh) {
			const planeVerts = obj.geometry.attributes.position.array;
			for (let i = 0; i < planeVerts.length / 3; i++) {
				const worldX = planeVerts[i * 3] + x;
				const worldZ = planeVerts[i * 3 + 2] + z;
				planeVerts[i * 3 + 1] = heightAt(worldX, worldZ) - 0.9;
			}
			obj.geometry.attributes.position.needsUpdate = true;
			obj.geometry.computeBoundingBox();
			obj.geometry.computeBoundingSphere();
			obj.geometry.computeVertexNormals();
		}
	}
};

let totFars = 0;
const initFarZone = () => {
	const zoneGeom = new THREE.PlaneGeometry(farSide, farSide, 12, 12).rotateX(-Math.PI / 2);
	const mesh = new THREE.Mesh(zoneGeom, farMat);
	mesh.layers.enable(1);
	farGroup.add(mesh);
	// console.log(`inited ${++totFars} far zones`);
	return mesh;
};

const updateFarZone = (mesh, x, z) => {
	mesh.position.set(x, 0, z);
	const planeVerts = mesh.geometry.attributes.position.array;
	for (let i = 0; i < planeVerts.length / 3; i++) {
		const worldX = planeVerts[i * 3] + x;
		const worldZ = planeVerts[i * 3 + 2] + z;
		planeVerts[i * 3 + 1] = heightAt(worldX, worldZ) - 3;
	}
	mesh.geometry.attributes.position.needsUpdate = true;
	mesh.geometry.computeBoundingBox();
	mesh.geometry.computeBoundingSphere();
	mesh.updateWorldMatrix(false, true);
};

/**
 * @typedef {Object} _ZoneResource
 * @property {import('../lib/three.module.js').Mesh} [mesh]
 *
 * @typedef {import('../resourcePool.js').Resource & _ZoneResource} ZoneResource
 */

const addZonePool = ({ side, span, initFn, updateFn, name }) =>
	addResourcePool({
		name,
		generate: function* (camX, camZ) {
			const snapX = Math.round(camX / side) * side;
			const snapZ = Math.round(camZ / side) * side;
			for (let x = -side * span; x < side * span; x += side) {
				for (let z = -side * span; z < side * span; z += side) {
					yield { x: x + snapX, z: z + snapZ };
				}
			}
		},
		/** @param {ZoneResource} res */
		add(res) {
			res.mesh = res.recycling?.mesh;
			if (!res.mesh) res.mesh = initFn();
			updateFn(res.mesh, res.x, res.z);
		},
		remove(res) {},
	});

export const initTerrain = scene => {
	scene.add(nearGroup);
	scene.add(farGroup);
	nearMat = mkNearMaterial();
	farMat = mkFarMaterial();
	addZonePool({
		side: tileSide,
		span: 5,
		name: 'near zones',
		initFn: initNearZone,
		updateFn: updateNearZone,
	});
	addZonePool({
		side: farSide,
		span: 6,
		name: 'far zones',
		initFn: initFarZone,
		updateFn: updateFarZone,
	});
};
