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
 * @typedef {Object} _TipResource
 * @property {import('./beacons.js').BeaconResource} beacon
 * @property {number} dSquare
 * @property {HTMLDivElement} [domEle]
 * @property {THREE.Vector3} [textRoot]
 * @property {string} [dir]
 * @property {TipResource} [below]
 * @property {TipResource} [above]
 * 
 * @typedef {import('./ResourcePool.js').Resource & _TipResource} TipResource
 */

const sq = x => x*x;
const addTipsPool = () => addResourcePool({
	name: 'tips',
	*generate(camX, camZ) {
		for (let beacon of getResourcePool('beacons').loaded) {
			const dSquare = sq(camX - beacon.x) + sq(camZ - beacon.z);
			if (dSquare > sq(500)) continue;
			if (!beacon.record.formParams.height) continue;
			yield { beacon, dSquare };
		}
	},
	/** @param {TipResource} res */
	add(res) {
		res.domEle = document.createElement('div');
		const rec = res.beacon.record;
		res.domEle.innerHTML = rec.trackName.replace(/\-/g, ' ') + ' <i>(edit)</i>';
		res.domEle.onclick = () => {
			console.log(rec.desc);
		}
		res.domEle.className = 'tip';
		document.body.appendChild(res.domEle);
		res.textRoot = new THREE.Vector3();
	},
	/** @param {TipResource} res */
	remove(res) {
		res.domEle.remove();
	},
	compare(res1, res2) {
		return res1.beacon === res2.beacon;
	},
	/** @param {import('./ResourcePool.js').ResourcePool & {loaded: Array.<TipResource>}} pool */
	afterUpdate(pool) {
		let tipIdx = 0;
		const camDir = camera.getWorldDirection(new THREE.Vector3());
		// the box x/y size of a tip, in normalized device coordinates
		const yTouch = 20 * 2 / renderer.domElement.clientHeight;
		const xTouch = 200 * 2 / renderer.domElement.clientWidth;
		// preallocate some, since we're looping in every frame
		const formPos = new THREE.Vector3(), formDir = new THREE.Vector3(),
			dot1Pos = new THREE.Vector3(), dot2Pos = new THREE.Vector3();
		// sort so that front tips push back tips around
		pool.loaded.sort((a, b) => a.dSquare - b.dSquare);
		for (let tip of pool.loaded) {
			delete tip.above;
			delete tip.below;
		}
		/** @type {Array.<TipResource>} */
		const visibleTips = [];
		for (let tip of pool.loaded) {
			tip.domEle.style.display = 'none';
			tip.beacon.form.getWorldPosition(formPos);
			// dot2 Y gets replaced, but determines if the tip will be visible
			dot1Pos.copy(formPos).add({x: 0, y: 45, z: 0});
			dot2Pos.copy(formPos).add({x: 0, y: 65, z: 0});
			// preserve the old Y by default to prevent some popping
			let tgtY = tip.textRoot.y ? tip.textRoot.y : 0.7;
			tip.textRoot.copy(dot2Pos).project(camera);
			// check dot product to avoid showing text when facing exactly away from the target
			const facing = camDir.dot(formDir.copy(formPos).sub(camera.position).normalize());
			if (facing < 0 || tip.textRoot.x < -0.9 || tip.textRoot.x > 0.9 
			|| tip.textRoot.y < -0.8 || tip.textRoot.y > 2) {
				tip.textRoot.set(0, 0, 0);
				continue;
			}
			// choose default direction based on tip's side of the screen
			tip.dir = (tip.textRoot.x > 0) ? 'L' : 'R';
			let nearTip;
			for (let i=visibleTips.length; i-- > 0; ) {
				if (Math.abs(visibleTips[i].textRoot.x - tip.textRoot.x) < xTouch) {
					nearTip = visibleTips[i];
					break;
				}
			}
			// tuck the tip to avoid collision with nearby tips
			if (nearTip) {
				// smooth transition into tuck to prevent some popping
				let slide = Math.abs(nearTip.textRoot.x - tip.textRoot.x);
				slide = Math.max(0, Math.min(1, (slide - xTouch*0.5) / (xTouch*0.5)));
				tip.dir = nearTip.dir;
				// go above or below the tip cluster
				if ((tip.dir === 'L' && tip.textRoot.x < nearTip.textRoot.x)
				|| (tip.dir === 'R' && tip.textRoot.x > nearTip.textRoot.x)) {
					let lowest = nearTip;
					while (lowest.below) lowest = lowest.below;
					lowest.below = tip;
					tip.above = lowest;
					tgtY = (lowest.textRoot.y - yTouch)*(1 - slide) + lowest.textRoot.y * slide;
				} else {
					let highest = nearTip;
					while (highest.above) highest = highest.above;
					highest.above = tip;
					tip.below = highest;
					tgtY = (highest.textRoot.y + yTouch)*(1 - slide) + highest.textRoot.y * slide;
				}
			}
			// inertia could be added here, but it's ugly - might work with a second derivative
			tip.textRoot.y = tgtY;
			dot2Pos.copy(tip.textRoot).unproject(camera);

			visibleTips.push(tip);
			tip.domEle.style.display = 'block';
			if (tip.dir === 'L') {
				tip.domEle.style.right = ((0.5 - 0.5 * tip.textRoot.x) * renderer.domElement.clientWidth + 10)+'px';
				tip.domEle.style.removeProperty('left');
			} else {
				tip.domEle.style.left = ((0.5 * tip.textRoot.x + 0.5) * renderer.domElement.clientWidth + 10)+'px';
				tip.domEle.style.removeProperty('right');
			}
			tip.domEle.style.top = ((-0.5 * tip.textRoot.y + 0.5) * renderer.domElement.clientHeight)+'px';
			// send dot positions to buffer used by THREE for lines and dots
			dot1Pos.toArray(dotPositions, (tipIdx * 2) * 3);
			dot2Pos.toArray(dotPositions, (tipIdx * 2 + 1) * 3);
			if (2 * tipIdx++ >= maxDotCount) break;
		}
		dotGeometry.setDrawRange(0, tipIdx * 2);
		segGeometry.setDrawRange(0, tipIdx * 2);
		posAttribute.needsUpdate = true;
	}
});