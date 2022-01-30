import * as THREE from './lib/three.module.js'
import { leafMaterial, leafDepth } from './leafMaterial.js'
import { PtBuf } from './points.js'
import { heightAt, randomPointRange } from './world.js'

const up = new THREE.Vector3(0, 1, 0);
const front = new THREE.Vector3(0, 0, 1);
const gold = 2.4;
const pi = Math.PI;
const hiMore = x => -0.4*(x-3.5)*x;

export const addTreball = o => {
	o.height = o.height ?? 60;
	o.numBranches = o.numBranches ?? 9;
	o.twist = o.twist ?? 0;
	o.minHang = o.minHang ?? 0.1;
	o.outShrink = o.outShrink ?? 0.06;
	o.cup = o.cup ?? 1;
	o.separation = o.separation ?? 0;
	o.numPts = 400;
	if (o.colorFn === 'pick') {
		const cs = o.colorParams.map(c =>
			new THREE.Color().setHSL(...c)
		);
		o.getColor = () => cs[Math.floor(Math.random()*cs.length)];
	} else if (o.colorFn === 'grad') {
		const cs = o.colorParams.map(c =>
			new THREE.Color().setHSL(...c)
		);
		o.getColor = pos => cs[0].clone()
			.lerp(cs[1], Math.min(1, pos.y / o.height))
			.offsetHSL(Math.random()*0.2-0.1, 0, 0);
	}
	const buf = new PtBuf();
	buf.createBufs(o.numPts);
	for (let i=0; i<o.numPts; i++) {
		// proportion inside branch
		let p = (o.numBranches * i / o.numPts);
		// branch number
		const bn = Math.floor(p);
		// shift proportion for inner branches
		p = hiMore(p % 1) + (o.numBranches - bn) * 0.03 / (1+o.separation*3);
		// semi-cup overhang shape
		const bShape = -1.1*((p*o.cup - 1.7)*p);
		// vertical branch, shrink outer branches
		let pos = new THREE.Vector3(0, p*o.height*(1.1-bn*o.outShrink)-2, 1).applyAxisAngle(up, i*gold);
		// overhang branch using shape
		pos.applyAxisAngle(front, (o.minHang+bn*0.05)*bShape)
		// separate from center
		.add(new THREE.Vector3(-o.separation, 0, 0))
		// orient using gold
		.applyAxisAngle(up, bn*gold + p*o.twist);

		pos.toArray(buf.posBuf, buf.i * 3)
		o.getColor(pos).toArray(buf.colBuf, buf.i * 3)
		const minDist = randomPointRange();
		buf.setMinDist(minDist)
		buf.advance()
	}
	const ptsGeom = new THREE.BufferGeometry()
	ptsGeom.setAttribute('position', new THREE.BufferAttribute(buf.posBuf, 3))
	ptsGeom.setAttribute('color', new THREE.BufferAttribute(buf.colBuf, 3))
	ptsGeom.setAttribute('mindist', new THREE.BufferAttribute(buf.minDistBuf, 1))
	const pts = new THREE.Points(ptsGeom, leafMaterial)
	pts.customDepthMaterial = leafDepth
	pts.castShadow = true
	const treball = new THREE.Group()
	treball.userData = o
	treball.position.set(o.x, heightAt(o.x, o.z), o.z)
	treball.add(pts);

	return treball
}

export const disposeTreball = tree => {
	for (let child of tree.children) {
		if (child.isPoints) {
			child.geometry.dispose()
		}
	}
}