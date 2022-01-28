import * as THREE from './lib/three.module.js';
import { renderer, camera, scene } from './mainLoop.js';
import { addResourcePool, getResourcePool, removeResourcePool } from './ResourcePool.js';

const dotMaterial = new THREE.PointsMaterial({
	color: 0xeeeeee,
	size: 4,
	blending: THREE.AdditiveBlending,
	sizeAttenuation: false,
	depthWrite: false,
	depthTest: false
});

const segMaterial = new THREE.LineBasicMaterial({
	color: 0xeeeeee,
	blending: THREE.AdditiveBlending,
	depthWrite: false,
	depthTest: false
});

const maxDotCount = 50;
const dotPositions = new Float32Array(maxDotCount * 3);
const dotGeometry = new THREE.BufferGeometry();
const segGeometry = new THREE.BufferGeometry();
const posAttribute = new THREE.BufferAttribute(dotPositions, 3).setUsage(THREE.DynamicDrawUsage);
dotGeometry.setAttribute('position', posAttribute);
segGeometry.setAttribute('position', posAttribute);
const dots = new THREE.Points(dotGeometry, dotMaterial);
const segs = new THREE.LineSegments(segGeometry, segMaterial);
dots.frustumCulled = false;
segs.frustumCulled = false;
dots.renderOrder = 4;
segs.renderOrder = 4;

export let tipsEnabled = false;
export const enableTips = () => {
	if (dots.parent !== scene) {
		scene.add(dots);
		scene.add(segs);
	}
	addTipsPool();
	tipsEnabled = true;
};
export const disableTips = () => {
	removeResourcePool('tips');
	dotGeometry.setDrawRange(0, 0);
	segGeometry.setDrawRange(0, 0);
	tipsEnabled = false;
};

/**
 * @typedef {Object} TipLayout
 * @property {THREE.Vector3} textRoot
 * @property {string} dir
 * @property {TipLayout} [below]
 * @property {TipLayout} [above]
 */

const sq = x => x*x;
const addTipsPool = () => addResourcePool({
	name: 'tips',
	*generate(camX, camZ) {
		for (let res of getResourcePool('beacons').loaded) {
			const dSquare = sq(camX - res.x) + sq(camZ - res.z);
			if (dSquare > sq(500)) continue;
			if (!res.record.formParams.height) continue;
			yield { attached: res, dSquare };
		}
	},
	add(res) {
		res.domEle = document.createElement('div');
		const rec = res.attached.record;
		res.domEle.innerHTML = rec.trackName + ' <i>(edit)</i>';
		res.domEle.onclick = () => {
			console.log(rec.desc);
		}
		res.domEle.className = 'tip';
		document.body.appendChild(res.domEle);
	},
	remove(res) {
		res.domEle.remove();
	},
	compare(res1, res2) {
		return res1.attached === res2.attached;
	},
	/** @param {import('./ResourcePool.js').ResourcePool} pool */
	afterUpdate(pool) {
		let tipIdx = 0;
		const camDir = camera.getWorldDirection(new THREE.Vector3());
		const yTouch = 20 * 2 / renderer.domElement.clientHeight;
		const xTouch = 200 * 2 / renderer.domElement.clientWidth;
		const formPos = new THREE.Vector3(), formDir = new THREE.Vector3(),
			dot1Pos = new THREE.Vector3(), dot2Pos = new THREE.Vector3();
		pool.loaded.sort((a, b) => a.dSquare - b.dSquare);
		/** @type {Array.<TipLayout>} */
		const tipLayouts = [];
		for (let res of pool.loaded) {
			res.domEle.style.display = 'none';
			res.attached.form.getWorldPosition(formPos);
			let loY = res.attached.record.formParams.height * 0.6;
			let hiY = res.attached.record.formParams.height + 40;
			// check dot product to avoid showing text when facing exactly away from the target
			const dot = camDir.dot(formDir.copy(formPos).sub(camera.position).normalize());
			dot1Pos.copy(formPos).add({x: 0, y: loY, z: 0});
			dot2Pos.copy(formPos).add({x: 0, y: hiY, z: 0});
			const textRoot = dot2Pos.clone().project(camera);
			if (dot < 0 || textRoot.x < -0.9 || textRoot.x > 0.9 || textRoot.y < -0.8 || textRoot.y > 2) {
				continue;
			}
			/** @type {TipLayout} */
			const tipLayout = { textRoot, dir: (textRoot.x > 0) ? 'L' : 'R' };
			let nearTipLayout;
			for (let i=tipLayouts.length; i-- > 0; ) {
				if (Math.abs(tipLayouts[i].textRoot.x - textRoot.x) < xTouch) {
					nearTipLayout = tipLayouts[i];
					break;
				}
			}
			if (nearTipLayout) {
				tipLayout.dir = nearTipLayout.dir;
				if ((tipLayout.dir === 'L' && textRoot.x < nearTipLayout.textRoot.x)
				|| (tipLayout.dir === 'R' && textRoot.x > nearTipLayout.textRoot.x)) {
					let lowest = nearTipLayout;
					while (lowest.below) lowest = lowest.below;
					lowest.below = tipLayout;
					tipLayout.above = lowest;
					textRoot.y = lowest.textRoot.y - yTouch;
				} else {
					let highest = nearTipLayout;
					while (highest.above) highest = highest.above;
					highest.above = tipLayout;
					tipLayout.below = highest;
					textRoot.y = highest.textRoot.y + yTouch;
				}
			} else {
				if (textRoot.y > 0.8) textRoot.y = 0.8;
				if (textRoot.y < 0.5) textRoot.y = 0.5;
			}
			dot2Pos.copy(textRoot).unproject(camera);

			tipLayouts.push(tipLayout);
			res.domEle.style.display = 'block';
			if (tipLayout.dir === 'L') {
				res.domEle.style.right = ((0.5 - 0.5 * textRoot.x) * renderer.domElement.clientWidth + 10)+'px';
				res.domEle.style.removeProperty('left');
			} else {
				res.domEle.style.left = ((0.5 * textRoot.x + 0.5) * renderer.domElement.clientWidth + 10)+'px';
				res.domEle.style.removeProperty('right');
			}
			res.domEle.style.top = ((-0.5 * textRoot.y + 0.5) * renderer.domElement.clientHeight)+'px';
			dot1Pos.toArray(dotPositions, (tipIdx * 2) * 3);
			dot2Pos.toArray(dotPositions, (tipIdx * 2 + 1) * 3);
			if (2 * tipIdx++ >= maxDotCount) break;
		}
		dotGeometry.setDrawRange(0, tipIdx * 2);
		segGeometry.setDrawRange(0, tipIdx * 2);
		posAttribute.needsUpdate = true;
	}
});