import * as THREE from '../lib/three.module.js';
import { leafMaterial, leafDepth } from '../gfx/leafMaterial.js';
import { PtBuf } from '../gfx/points.js';
import { heightAt, randomPointRange } from '../world.js';

const gold = 2.4;

export class Species {
	constructor({
		segPts = 12, // points per segment
		numBranches = 30, // "branch" segments
		numCoreSegs = 5, // "trunk" segments
		open = 12, // vertical -> horizontal branches
		jitter = 0, // random angle
		colorFn = 'hsl',
		colorParams = [0.2, 0.55, 0.35],
	}) {
		this.segPts = segPts;
		this.numBranches = numBranches;
		this.numCoreSegs = numCoreSegs;
		this.open = open;
		this.jitter = jitter;
		this.colorFn = colorFn;
		this.colorParams = colorParams;

		this.numPts = segPts * (numBranches + numCoreSegs);
		this.shuf = [...Array(segPts).keys()];
		if (colorFn === 'hsl') {
			const c = new THREE.Color().setHSL(...colorParams);
			this.getColor = () => c;
		} else if (colorFn === 'pick') {
			const cs = colorParams.map(c => new THREE.Color().setHSL(...c));
			this.getColor = () => cs[Math.floor(Math.random() * cs.length)];
		}
	}
}

export const initTree = o => {
	o.segPts = o.segPts ?? 12;
	o.height = o.height ?? 60;
	o.numBranches = o.numBranches ?? 30;
	o.numCoreSegs = o.numCoreSegs ?? 5;
	o.numPts = o.segPts * (o.numBranches + o.numCoreSegs);
	o.open = o.open ?? 12;
	o.jitter = o.jitter ?? 0;
	o.twist = o.twist ?? 0;
	o.shuf = [...Array(o.segPts).keys()];
	if (o.colorFn === 'hsl') {
		const c = new THREE.Color().setHSL(...o.colorParams);
		o.getColor = () => c;
	} else if (o.colorFn === 'pick') {
		const cs = o.colorParams.map(c => new THREE.Color().setHSL(...c));
		o.getColor = () => cs[Math.floor(Math.random() * cs.length)];
	} else if (o.colorFn === 'grad') {
		const cs = o.colorParams.map(c => new THREE.Color().setHSL(...c));
		o.getColor = pos => {
			const ret = cs[0].clone();
			ret.lerp(cs[1], Math.min(1, pos.y / o.height));
			return ret.offsetHSL(Math.random() * 0.2 - 0.1, 0, 0);
		};
	}
	const tree = new THREE.Group();
	tree.userData = o;
	tree.position.set(o.x, heightAt(o.x, o.z), o.z);
	const ptsGeom = new THREE.BufferGeometry();
	ptsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(o.numPts * 3), 3));
	ptsGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(o.numPts * 3), 3));
	ptsGeom.setAttribute('mindist', new THREE.BufferAttribute(new Float32Array(o.numPts), 1));
	const pts = new THREE.Points(ptsGeom, leafMaterial);
	pts.customDepthMaterial = leafDepth;
	pts.castShadow = true;
	tree.add(pts);
	return tree;
};

const wave = x => 0.5 - Math.cos(x * Math.PI * 2) * 0.5;
const dewave = x => 1 - Math.acos(x * 2 - 1) / Math.PI;
const up = new THREE.Vector3(0, 1, 0);
const front = new THREE.Vector3(0, 0, 1);

const mkLeaf = (o, seg, ini, minDist, buf) => {
	// simple branch:
	// const pos = new THREE.Vector3().lerpVectors(seg.a, seg.b, ini/o.segPts)
	const p = (ini + 0.5) / o.segPts;
	const pos = new THREE.Vector3(0, wave(p) * seg.d * 0.1, dewave(p) * seg.d)
		.applyAxisAngle(front, gold * ini)
		.applyMatrix4(seg.rot)
		.applyAxisAngle(up, p * o.twist)
		.add(seg.a);
	const bend = 1 - p * 0.4;
	pos.x *= bend;
	pos.z *= bend;
	pos.toArray(buf.posBuf, buf.i * 3);
	o.getColor(pos).toArray(buf.colBuf, buf.i * 3);
	buf.setMinDist(minDist);
	buf.advance();
};

const mkTrunkSeg = (o, y) => {
	const a = new THREE.Vector3(0, y, 0);
	const b = new THREE.Vector3(0, y + 20, 0);
	const rot = new THREE.Matrix4().lookAt(b, a, up);
	return { a, b, d: a.distanceTo(b), rot };
};

const mkBranch = (o, si) => {
	const p = (si + 0.5) / o.numBranches;
	const wavep = wave(p);
	const out = o.open * (1 + o.jitter * Math.random() - o.jitter * 0.5);
	// sparse branches join with core, dense branches can float out
	const separation = (o.numBranches * 1.7) / 18 - 1.833;
	const a = new THREE.Vector3(0, p * o.height, separation * wavep * 2);
	a.applyAxisAngle(up, gold * si);
	const b = new THREE.Vector3(
		0,
		a.y + (20 - out * 0.33),
		a.z + out + wavep * (out * 0.8)
	).applyAxisAngle(up, gold * si);
	const rot = new THREE.Matrix4().lookAt(b, a, up);
	return { a, b, d: a.distanceTo(b), rot };
};

/** @param {THREE.Points} pts */
const updateLeaves = (o, pts) => {
	const geometry = pts.geometry;
	const buf = new PtBuf();
	buf.posBuf = geometry.getAttribute('position').array;
	buf.colBuf = geometry.getAttribute('color').array;
	buf.minDistBuf = geometry.getAttribute('mindist').array;
	const segments = [];
	// [...new Array(5).keys()].map(k => Math.round(dewave(k/4)*65-5))
	for (let si = 0; si < o.numCoreSegs; si++) {
		const y = Math.round(dewave(si / (o.numCoreSegs - 1)) * (o.height + 5) - 5);
		segments.push(mkTrunkSeg(o, y));
	}
	for (let si = 0; si < o.numBranches; si++) {
		segments.push(mkBranch(o, si));
	}
	for (let ini = 0; ini < o.segPts; ini++) {
		const minDist = randomPointRange();
		for (let seg of segments) {
			mkLeaf(o, seg, o.shuf[ini], minDist, buf);
		}
	}
	pts.geometry.drawRange = { start: 0, count: buf.i };
	pts.geometry.computeBoundingBox();
	pts.geometry.computeBoundingSphere();
	geometry.getAttribute('position').needsUpdate = true;
	geometry.getAttribute('color').needsUpdate = true;
	geometry.getAttribute('mindist').needsUpdate = true;
};

export const updateTree = tree => {
	for (let child of tree.children) {
		if (child.isPoints) {
			updateLeaves(tree.userData, child);
		}
	}
};

export const disposeTree = tree => {
	for (let child of tree.children) {
		if (child.isPoints) {
			child.geometry.dispose();
		}
	}
};
