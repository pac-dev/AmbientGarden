import * as THREE from '../lib/three.module.js';
import { leafMaterial, leafDepth } from '../gfx/leafMaterial.js';
import { PtBuf } from '../gfx/points.js';
import { heightAt, randomPointRange } from '../world.js';

const sq = x => x*x;
const dist = (a, b) => Math.sqrt(sq(a[0]-b[0])+sq(a[1]-b[1])+sq(a[2]-b[2]));

export const addString = (params, x, z) => {
	const o = Object.assign(params, {});
	o.height = 1;

	// override all these:
	o.ptGroups ??= [500];
	o.v0 ??= 1;
	o.separation ??= 2;
	o.posFn ??= (a,g) => {
		const saw = a => Math.abs((a*(0.02+0.02*((g*0.38)%1)))%2-1)-0.5;
		return [
			20*(saw(a+saw(a*1.234))+saw(a*0.234)),
			20*saw(a)+a*0.1,
			30*(saw(a+saw(a*1.457))+saw(a*0.456)),
		];
	};
	o.hslFn ??= (x, y, z, g) => {
		return [1 + y*0.001, 0.2, 0.4 + Math.sin(y/800)];
	};

	const buf = new PtBuf();
	buf.createBufs(o.ptGroups.reduce((a,b)=>a+b));
	const sep = o.separation ?? 2;
	for (const [group, numPts] of o.ptGroups.entries()) {
		let v = o.v0 ?? sep;
		let a = 0;
		let pos, lastPos = o.posFn(0, group);
		for (let i=0; i<numPts; i++) {
			// Approximate a fixed distance between points
			// by keeping the ideal step of posFn in `v`.
			// Yes, I could find exact solutions using derivatives
			// but I am not iq
			for (let j=0; j<3; j++) {
				pos = o.posFn(a + v, group);
				let rat = sep / dist(pos, lastPos);
				if (rat>0.9 && rat<1.1) break;
				rat = Math.max(0.5, Math.min(2, rat));
				v *= rat;
			}
			a += v;
			lastPos = pos;
			buf.setPos(...pos);
			new THREE.Color().setHSL(...o.hslFn(...pos, group)).toArray(buf.colBuf, buf.i*3);
			buf.setMinDist(randomPointRange());
			buf.advance();
			if (pos[1] > o.height) o.height = pos[1];
		}
	}


	const ptsGeom = new THREE.BufferGeometry();
	ptsGeom.setAttribute('position', new THREE.BufferAttribute(buf.posBuf, 3));
	ptsGeom.setAttribute('color', new THREE.BufferAttribute(buf.colBuf, 3));
	ptsGeom.setAttribute('mindist', new THREE.BufferAttribute(buf.minDistBuf, 1));
	const pts = new THREE.Points(ptsGeom, leafMaterial);
	pts.customDepthMaterial = leafDepth;
	pts.castShadow = true;
	const ret = new THREE.Group();
	ret.userData = o;
	ret.position.set(x, heightAt(x, z), z);
	ret.add(pts);
	return ret;
};
