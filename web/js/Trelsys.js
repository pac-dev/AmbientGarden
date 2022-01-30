import * as THREE from './lib/three.module.js';
import { leafMaterial, leafDepth } from './leafMaterial.js';
import { PtBuf } from './points.js';
import { heightAt, randomPointRange } from './world.js';

const up = new THREE.Vector3(0, 1, 0);
const front = new THREE.Vector3(0, 0, 1);
const pi = Math.PI;

export const addTrelsys = o => {
	o.height = o.height ?? 60;
	o.depth = o.depth ?? 3;
	o.branching = o.branching ?? (() => 3);
	o.branchPts = o.branchPts ?? (lev => 4 + lev * 2);
	o.twist = o.twist ?? (lev => 0.02 + lev * 0.04);
	o.bias = o.bias ?? (() => 0);
	o.pull = o.pull ?? (() => 0);
	o.pullDir = o.pullDir ?? (() => [0, -1, 0]);
	if (o.colorFn === 'pick') {
		const cs = o.colorParams.map(c => new THREE.Color().setHSL(...c));
		o.getColor = () => cs[Math.floor(Math.random() * cs.length)];
	} else if (o.colorFn === 'grad') {
		const cs = o.colorParams.map(c => new THREE.Color().setHSL(...c));
		o.getColor = pos =>
			cs[0]
				.clone()
				.lerp(cs[1], Math.min(1, pos.y / o.height))
				.offsetHSL(Math.random() * 0.2 - 0.1, 0, 0);
	}
	const buf = new PtBuf();
	let numPts = 0;
	const countBranch = (level, id) => {
		numPts += o.branchPts(level, id);
		if (level++ > o.depth) return;
		for (let subId = 0; subId < o.branching(level, id); subId++) countBranch(level, subId);
	};
	countBranch(0, 0);

	buf.createBufs(numPts);

	/** @param {THREE.Matrix4} mat */
	const pull = (mat, amt, pullQuat) => {
		const retQuat = new THREE.Quaternion().setFromRotationMatrix(mat);
		retQuat.slerp(pullQuat, amt);
		mat.compose(
			new THREE.Vector3().setFromMatrixPosition(mat),
			retQuat,
			new THREE.Vector3(1, 1, 1)
		);
	};

	/** @param {THREE.Matrix4} parentMat */
	const addBranch = (parentMat, level, id) => {
		const workMat = parentMat.clone();
		const rangle = () => (Math.random() - 0.5 + o.bias(level, id)) * o.twist(level, id);
		const stepMat = new THREE.Matrix4()
			.makeRotationFromEuler(new THREE.Euler(rangle(), rangle(), rangle()))
			.setPosition(0, 2.5, 0);
		const pullQuat = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			new THREE.Vector3(...o.pullDir(level, id)).normalize()
		);
		for (let i = 0; i < o.branchPts(level, id); i++) {
			workMat.multiply(stepMat);
			pull(workMat, o.pull(level, id), pullQuat);
			const pos = new THREE.Vector3().setFromMatrixPosition(workMat);
			pos.toArray(buf.posBuf, buf.i * 3);
			o.getColor(pos).toArray(buf.colBuf, buf.i * 3);
			const minDist = randomPointRange();
			buf.setMinDist(minDist);
			buf.advance();
		}
		if (level++ > o.depth) return;
		for (let subId = 0; subId < o.branching(level, id); subId++) {
			addBranch(workMat, level, subId);
		}
	};
	addBranch(new THREE.Matrix4(), 0, 0);

	const ptsGeom = new THREE.BufferGeometry();
	ptsGeom.setAttribute('position', new THREE.BufferAttribute(buf.posBuf, 3));
	ptsGeom.setAttribute('color', new THREE.BufferAttribute(buf.colBuf, 3));
	ptsGeom.setAttribute('mindist', new THREE.BufferAttribute(buf.minDistBuf, 1));
	const pts = new THREE.Points(ptsGeom, leafMaterial);
	pts.customDepthMaterial = leafDepth;
	pts.castShadow = true;
	const trelsys = new THREE.Group();
	trelsys.userData = o;
	trelsys.position.set(o.x, heightAt(o.x, o.z) - 3, o.z);
	trelsys.add(pts);

	return trelsys;
};

export const disposeTrelsys = tree => {
	for (let child of tree.children) {
		if (child.isPoints) {
			child.geometry.dispose();
		}
	}
};
