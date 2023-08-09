import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { TransformControls } from './lib/TransformControls.js';
import { intersectPointer, renderer, camera, scene } from './mainLoop.js';
import {
	addResourcePool,
	getResourcePool,
	removeResourcePool,
	updateResources,
} from './resourcePool.js';
import { heightAt } from './world.js';
import { getMeta, trackHush } from './beacons/beaconPool.js';
import { popUi } from './ui.js';
import { runMode } from './runMode.js';
import { beaconRecords, parseTrack } from './beacons/beaconRecords.js';

/** @param {import('./beacons/beaconRecords.js').BeaconRecord} beacon */
const getBeaconFreqs = beacon => {
	const p = beacon.trackParams;
	switch (beacon.trackName) {
		case 'vibraphones':
		case 'sine-drone':
		case 'melodic-bottle':
		case 'melodic-soprano':
			return [p.freq1, p.freq2];
		case 'resonant-drone':
			return [p.freq1, p.freq2, p.freq3];
		case 'harmonic-series':
			return [...new Array(7)].map((_, i) => (i + 4) * p.freq1);
		case 'contrabass':
			return [p.freq1];
		case 'vocal-overtones':
			return p.freq2 ? [p.freq1, p.freq2] : [p.freq1];
		default:
			throw new Error('what is ' + beacon.trackName);
	}
};

const toFraction = (x, tolerance, iterations) => {
	let num = 1,
		den = 1,
		i = 0;
	const iterate = () => {
		const R = num / den;
		if (Math.abs((R - x) / x) < tolerance) return;
		if (R < x) num++;
		else den++;
		if (++i < iterations) iterate();
	};
	iterate();
	if (i < iterations) return [num, den];
};

const dissonance = (freq1, freq2) => {
	const lo = Math.min(freq1, freq2);
	const hi = Math.max(freq1, freq2);
	const fr = toFraction(hi / lo, 0.005, 100);
	if (!fr) return 99;
	return (fr[0] - 1) * 0.5 + (fr[1] - 1);
};

const multiDissonance = (freqs1, freqs2) => {
	let worst = 0;
	for (let f1 of freqs1) {
		for (let f2 of freqs2) {
			const d = dissonance(f1, f2);
			if (d > worst) worst = d;
		}
	}
	return worst;
};

const teleport = (x, z) => {
	camera.position.set(x, 50, z + 200);
	editMode.orbiter.target.set(x, 0, z);
};

/**
 * @typedef {Object} _HarmolineResource
 * @property {import('./beacons/beaconPool.js').BeaconResource} beacon1
 * @property {import('./beacons/beaconPool.js').BeaconResource} beacon2
 * @property {number} distance
 * @property {number} [dissonance]
 * @property {import('./lib/three.module.js').Color} [color]
 * @property {import('./lib/three.module.js').Mesh} [mesh]
 *
 * @typedef {import('./resourcePool.js').Resource & _HarmolineResource} HarmolineResource
 */

const addHarmolinePool = () =>
	addResourcePool({
		name: 'harmolines',
		*generate() {
			const loadedBeacons = getResourcePool('beacons').loaded;
			for (let beacon1 of loadedBeacons) {
				const pos1 = beacon1.form.position;
				for (let beacon2 of loadedBeacons) {
					const pos2 = beacon2.form.position;
					if (beacon1 === beacon2) continue;
					const distance = pos1.distanceTo(pos2);
					if (distance > trackHush * 1.5) continue;
					yield { beacon1, beacon2, distance };
				}
			}
		},
		/** @param {HarmolineResource} res */
		add(res) {
			const rec1 = res.beacon1.record;
			const rec2 = res.beacon2.record;
			const pos1 = res.beacon1.form.position;
			const pos2 = res.beacon2.form.position;
			const normDist = res.distance / (trackHush * 1.2);
			res.dissonance = multiDissonance(getBeaconFreqs(rec1), getBeaconFreqs(rec2));
			const normDiss = res.dissonance / 9;
			if (normDiss <= 1) {
				res.color = new THREE.Color()
					.setHSL(0.26, 0.7, 0.54) // hsl(93.1deg, 70.3%, 53.8%)
					.lerpHSL(new THREE.Color().setHSL(0.03, 0.9, 0.54), normDiss); // hsl(9.6deg, 89.7%, 53.8%)
			} else {
				res.color = new THREE.Color().setHSL(0.81, 0.93, 0.43); // hsl(292.8deg, 93.1%, 42.9%)
			}
			const formPos = pos1.clone().lerp(pos2, 0.5);
			const curve = new THREE.LineCurve3(
				pos1.clone().sub(formPos),
				pos2.clone().sub(formPos)
			);
			const geometry = new THREE.TubeGeometry(curve, 3, 4, 6, false);
			const material = new THREE.MeshBasicMaterial({ color: res.color });
			res.mesh = new THREE.Mesh(geometry, material);
			res.mesh.position.copy(formPos);
			res.mesh.translateY((1 - normDist) * 60 + 20);
			[res.x, res.z] = [formPos.x, formPos.z];
			scene.add(res.mesh);
		},
		/** @param {HarmolineResource} res */
		remove(res) {
			res.mesh.removeFromParent();
		},
		compare(res1, res2) {
			return (
				res1.beacon1 === res2.beacon1 &&
				res1.beacon2 === res2.beacon2 &&
				res1.distance === res2.distance
			);
		},
	});

const sq = x => x * x;

const changeDrag = (beaconRes, dragging) => {
	getMeta(beaconRes.record).transforming = dragging;
	if (dragging) {
		getMeta(beaconRes.record).orig = beaconRes.form.position.clone();
	} else {
		beaconRes.form.position.y = heightAt(beaconRes.form.position.x, beaconRes.form.position.z);
	}
};

const drag = (beaconRes, diff) => {
	const pos = beaconRes.form.position;
	pos.addVectors(getMeta(beaconRes.record).orig, diff);
	beaconRes.x = pos.x;
	beaconRes.z = pos.z;
	beaconRes.record.x = pos.x;
	beaconRes.record.z = pos.z;
};

let selectMode = false;
const select = () => {
	selectMode = !selectMode;
	if (!selectMode) return;
	for (let res of getResourcePool('beacons').loaded) {
		getMeta(res.record).selected = false;
	}
	for (let tipRes of getResourcePool('editor tips').loaded) {
		if (!tipRes.beacon) continue;
		if (tipRes.domEle.style.display !== 'block') continue;
		getMeta(tipRes.beacon.record).selected = true;
	}
};
const forSelected = fn => {
	if (!selectMode) return;
	for (let res of getResourcePool('beacons').loaded) {
		if (getMeta(res.record).selected) fn(res);
	}
};

/**
 * @typedef {Object} _TransformerResource
 * @property {import('./beacons/beaconPool.js').BeaconResource} beacon
 * @property {import('./lib/three.module.js').Object3D} [form]
 *
 * @typedef {import('./resourcePool.js').Resource & _TransformerResource} TransformerResource
 */

/**
 * When switching into edit mode (by pressing E), transform controls
 * ("transformers") appear under each beacon. These are taken from THREE.js and
 * allow controlling and moving their attached objects.
 * - When dragging begins, a "transforming" property is set on the beacon
 *   record, which prevents the beacon from getting unloaded by the pool *while*
 *   dragging in the distance.
 * - During dragging, we update the corresponding beacon record live, so the
 *   resource pool will not respawn a beacon from the old record.
 * - After dragging, the beacon's altitude gets snapped to the terrain. This
 *   would be nicer during dragging, but the transformer doesn't like its object
 *   being moved by external code during a gesture.
 */
const addTransformerPool = () =>
	addResourcePool({
		name: 'transformers',
		*generate(camX, camZ) {
			for (let res of getResourcePool('beacons').loaded) {
				const dSquare = sq(camX - res.x) + sq(camZ - res.z);
				if (dSquare > sq(900)) continue;
				yield { beacon: res };
			}
		},
		/** @param {TransformerResource} res */
		add(res) {
			const refObj = res.beacon.form;
			res.form = new TransformControls(camera, renderer.domElement);
			res.form.traverse(child => {
				if (child.name === 'X' || child.name === 'Z') child.layers.set(2);
			});
			res.form.size = 1;
			res.form.showY = false;
			res.form.attach(refObj);
			res.form.addEventListener('dragging-changed', event => {
				changeDrag(res.beacon, event.value);
				forSelected(bRes => changeDrag(bRes, event.value));
				editMode.orbiter.enabled = !event.value;
				if (!event.value) window.focusRecord = res.beacon.record;
			});
			res.form.addEventListener('objectChange', () => {
				const diff = refObj.position.clone().sub(getMeta(res.beacon.record).orig);
				drag(res.beacon, diff);
				forSelected(bRes => drag(bRes, diff));
			});
			scene.add(res.form);
		},
		/** @param {TransformerResource} res */
		remove(res) {
			res.form.removeFromParent();
			res.form.detach();
			res.form.dispose();
		},
		compare(res1, res2) {
			return res1.beacon === res2.beacon;
		},
	});

const rounded = params => Object.fromEntries(
	Object.entries(params).map(([k, v]) => [k, Math.round(v * 10) / 10])
);

/**
 * @typedef {Object} _EditorTipResource
 * @property {import('./beacons/beaconPool.js').BeaconResource} [beacon]
 * @property {HarmolineResource} [line]
 * @property {HTMLDivElement} [domEle]
 *
 * @typedef {import('./resourcePool.js').Resource & _EditorTipResource} EditorTipResource
 */

const addEditorTipsPool = () =>
	addResourcePool({
		name: 'editor tips',
		*generate(camX, camZ) {
			for (let beacon of getResourcePool('beacons').loaded) {
				const dSquare = sq(camX - beacon.x) + sq(camZ - beacon.z);
				if (dSquare > sq(900)) continue;
				yield { beacon };
			}
			for (let line of getResourcePool('harmolines').loaded) {
				const dSquare = sq(camX - line.x) + sq(camZ - line.z);
				if (dSquare > sq(900)) continue;
				yield { line };
			}
		},
		/** @param {EditorTipResource} res */
		add(res) {
			res.domEle = document.createElement('div');
			if (res.beacon) {
				res.domEle.innerText = res.beacon.record.desc;
				res.domEle.onclick = () => {
					console.log(
						rounded(res.beacon.record.trackParams),
						`add/replace('${res.beacon.record.desc}')`,
						res.beacon.record.sourceUrl
					);
					window.focusRecord = res.beacon.record;
				};
			} else {
				res.domEle.innerText = res.line.dissonance;
				res.domEle.style.color = res.line.color.getStyle();
				res.domEle.style.zIndex = 1;
			}
			res.domEle.className = 'editor_tip';
			document.body.appendChild(res.domEle);
		},
		/** @param {EditorTipResource} res */
		remove(res) {
			res.domEle.remove();
		},
		compare(res1, res2) {
			if (res1.beacon) return res1.beacon === res2.beacon;
			else return res1.line === res2.line;
		},
		/** @param {import('./resourcePool.js').ResourcePool & {loaded: Array.<EditorTipResource>}} pool */
		afterUpdate(pool) {
			for (let res of pool.loaded) {
				let wPos;
				if (res.beacon) {
					wPos = res.beacon.form
						.getWorldPosition(new THREE.Vector3())
						.add({ x: 0, y: 40, z: 0 });
				} else {
					wPos = res.line.mesh.getWorldPosition(new THREE.Vector3());
				}
				// check dot product to avoid showing text when facing exactly away from the target
				const dot = camera
					.getWorldDirection(new THREE.Vector3())
					.dot(wPos.clone().sub(camera.position).normalize());
				wPos.project(camera);
				if (dot > 0 && wPos.x > -0.8 && wPos.x < 0.8 && wPos.y > -0.8 && wPos.y < 0.8) {
					res.domEle.style.display = 'block';
				} else {
					res.domEle.style.display = 'none';
				}
				const canvas = renderer.domElement;
				res.domEle.style.left = (0.5 * wPos.x + 0.5) * canvas.clientWidth + 'px';
				res.domEle.style.top = (-0.5 * wPos.y + 0.5) * canvas.clientHeight + 'px';
			}
		},
	});

const addAtCursor = rec => {
	if (!rec) rec = window.focusRecord;
	if (!rec) return;
	const mouseHit = intersectPointer();
	if (!mouseHit) return;
	const ret = Object.assign({}, rec);
	parseTrack(ret);
	ret.x = mouseHit.point.x;
	ret.z = mouseHit.point.z;
	beaconRecords.push(ret);
	window.focusRecord = ret;
};

const deleteLast = () => {
	if (!window.focusRecord) return;
	beaconRecords.splice(beaconRecords.indexOf(focusRecord), 1);
	updateResources(camera.position.x, camera.position.z);
	window.focusRecord = undefined;
};

window.updateLast = x => {
	beaconRecords.pop();
	updateResources(camera.position.x, camera.position.z);
	beaconRecords.push(x);
	window.focusRecord = x;
};

window.add = desc => {
	addAtCursor({ desc });
};

window.replace = desc => {
	const { x, z } = window.focusRecord;
	deleteLast();
	const ret = { desc, x, z };
	parseTrack(ret);
	beaconRecords.push(ret);
	window.focusRecord = ret;
};

const exportRecords = async () => {
	const x = beaconRecords.map(
		r => `\t{desc: '${r.desc}', x: ${Math.round(r.x)}, z: ${Math.round(r.z)}},`
	);
	await navigator.clipboard.writeText('[\n' + x.join('\n') + '\n]');
	console.log(`exported ${x.length} records`);
};

const editKeyListener = e => {
	if (e.key === 'a') return addAtCursor();
	if (e.key === 'd') return deleteLast();
	if (e.key === 'x') return exportRecords();
	if (e.key === 's') return select();
};

const enable = () => {
	editMode.orbiter = new OrbitControls(camera, renderer.domElement);
	editMode.orbiter.enableDamping = true;
	editMode.orbiter.dampingFactor = 0.05;
	editMode.orbiter.screenSpacePanning = false;
	editMode.orbiter.minDistance = 1;
	editMode.orbiter.maxDistance = 800;
	editMode.orbiter.maxPolarAngle = Math.PI / 2;
	editMode.orbiter.keyPanSpeed = 50;
	editMode.orbiter.listenToKeyEvents(window);
	teleport(camera.position.x, camera.position.z - 200);
	addTransformerPool();
	addHarmolinePool();
	addEditorTipsPool();
	window.document.addEventListener('keydown', editKeyListener);
	editMode.enabled = true;
};

const disable = () => {
	if (!editMode.enabled) return;
	editMode.orbiter.dispose();
	removeResourcePool('harmolines');
	removeResourcePool('transformers');
	removeResourcePool('editor tips');
	window.document.removeEventListener('keydown', editKeyListener);
	editMode.enabled = false;
};

const update = () => {
	if (!editMode.enabled) return;
	editMode.orbiter.update();
};

const init = () => {
	window.document.addEventListener('keydown', event => {
		if (event.key !== 'e') return;
		popUi();
		if (editMode.enabled) {
			editMode.disable();
			runMode.enable();
		} else {
			runMode.disable();
			editMode.enable();
		}
	});
};

/**
 * @namespace
 * @property {OrbitControls}  orbiter
 */
export const editMode = {
	init,
	enable,
	disable,
	update,
	enabled: false,
	orbiter: undefined,
};
