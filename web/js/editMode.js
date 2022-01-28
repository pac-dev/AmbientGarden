import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js'
import { TransformControls } from './lib/TransformControls.js'
import { intersectMouse, renderer, camera, scene } from './mainLoop.js';
import { addResourcePool, getResourcePool, removeResourcePool, updateResources } from './ResourcePool.js';
import { heightAt } from './World.js';
import { getMeta, trackHush } from './beacons.js';
import { closeModal } from './ui.js';
import { runMode } from './runMode.js';
import { beaconRecords, parseTrack } from './beaconRecords.js';

/** @param {import('./beaconRecords.js').BeaconRecord} beacon */
const getBeaconFreqs = beacon => {
	const p = beacon.trackParams;
	switch (beacon.trackName) {
		case 'vibrem':
		case 'fracsin':
		case 'fracbot':
		case 'vocleg':
			return [p.freq1, p.freq2];
		case 'reso':
			return [p.freq1, p.freq2, p.freq3];
		case 'harmou':
			return [...new Array(7)].map((_,i) => (i+4)*p.freq1);
		case 'sand':
			return [p.freq1];
		case 'vocdrone':
			return p.freq2 ? [p.freq1, p.freq2] : [p.freq1];
		default:
			throw new Error('what is '+beacon.trackName);
	  }
};

const toFraction = (x, tolerance, iterations) => {
	let num = 1, den = 1, i = 0;
	const iterate = () => {
		const R = num/den;
		if (Math.abs((R-x)/x) < tolerance) return;
		if (R < x) num++;
		else den++;
		if (++i < iterations) iterate();
	}
	iterate();
	if (i < iterations) return [num, den];
};

const dissonance = (freq1, freq2) => {
	const lo = Math.min(freq1, freq2);
	const hi = Math.max(freq1, freq2);
	const fr = toFraction(hi/lo, 0.005, 100);
	if (!fr) return 99;
	return (fr[0]-1)*0.5+(fr[1]-1);
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
	camera.position.set(x, 50, z+200);
	editMode.orbiter.target.set(x, 0, z);
};

const addHarmolinePool = () => addResourcePool({
	name: 'harmolines',
	*generate() {
		const loadedBeacons = getResourcePool('beacons').loaded;
		for (let attached of loadedBeacons) {
			const pos1 = attached.form.position;
			for (let attached2 of loadedBeacons) {
				const pos2 = attached2.form.position;
				if (attached === attached2) continue;
				const distance = pos1.distanceTo(pos2);
				if (distance > (trackHush*1.5)) continue;
				yield {attached, attached2, distance};
			}
		}
	},
	add(res) {
		const rec1 = res.attached.record;
		const rec2 = res.attached2.record;
		const pos1 = res.attached.form.position;
		const pos2 = res.attached2.form.position;
		const normDist = res.distance / (trackHush*1.2);
		res.dissonance = multiDissonance(getBeaconFreqs(rec1),getBeaconFreqs(rec2));
		const normDiss = res.dissonance / 9;
		let color;
		if (normDiss <= 1) {
			color = new THREE.Color().setHSL(0.26, 0.7, 0.54) // hsl(93.1deg, 70.3%, 53.8%)
			.lerpHSL(new THREE.Color().setHSL(0.03, 0.9, 0.54), normDiss); // hsl(9.6deg, 89.7%, 53.8%)
		} else {
			color = new THREE.Color().setHSL(0.81, 0.93, 0.43); // hsl(292.8deg, 93.1%, 42.9%)
		}
		const formPos = pos1.clone().lerp(pos2, 0.5);
		const curve = new THREE.LineCurve3(pos1.clone().sub(formPos), pos2.clone().sub(formPos));
		const geometry = new THREE.TubeGeometry(curve, 3, 4, 6, false);
		const material = new THREE.MeshBasicMaterial({ color });
		res.form = new THREE.Mesh(geometry, material);
		res.form.position.copy(formPos);
		res.form.translateY((1 - normDist) * 60 + 20);
		[res.x, res.z] = [formPos.x, formPos.z];
		scene.add(res.form);
	},
	remove(res) {
		res.form.removeFromParent();
	},
	compare(res1, res2) {
		return res1.attached === res2.attached && res1.attached2 === res2.attached2 && res1.distance === res2.distance;
	}
});

const sq = x => x*x;

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
		if (!tipRes.attached.record) continue;
		if (tipRes.domEle.style.display !== 'block') continue;
		getMeta(tipRes.attached.record).selected = true;
	}
};
const forSelected = fn => {
	if (!selectMode) return;
	for (let res of getResourcePool('beacons').loaded) {
		if (getMeta(res.record).selected) fn(res);
	}
}

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
const addTransformerPool = () => addResourcePool({
	name: 'transformers',
	*generate(camX, camZ) {
		for (let res of getResourcePool('beacons').loaded) {
			const dSquare = sq(camX - res.x) + sq(camZ - res.z);
			if (dSquare > sq(900)) continue;
			yield { attached: res };
		}
	},
	add(res) {
		const refObj = res.attached.form;
		res.form = new TransformControls(camera, renderer.domElement);
		res.form.traverse(child => {
			if (child.name === 'X' || child.name === 'Z') child.layers.set(2);
		});
		res.form.size = 1;
		res.form.showY = false;
		res.form.attach(refObj);
		res.form.addEventListener('dragging-changed', event => {
			changeDrag(res.attached, event.value);
			forSelected(bRes => changeDrag(bRes, event.value));
			editMode.orbiter.enabled = !event.value;
			if (!event.value) window.focusBeacon = res.attached.record;
		});
		res.form.addEventListener('objectChange', () => {
			const diff = refObj.position.clone().sub(getMeta(res.attached.record).orig);
			drag(res.attached, diff);
			forSelected(bRes => drag(bRes, diff));
		});
		scene.add(res.form);
	},
	remove(res) {
		res.form.removeFromParent();
		res.form.detach();
		res.form.dispose();
	},
	compare(res1, res2) {
		return res1.attached === res2.attached;
	}
});

const addEditorTipsPool = () => addResourcePool({
	name: 'editor tips',
	*generate(camX, camZ) {
		for (let res of getResourcePool('beacons').loaded) {
			const dSquare = sq(camX - res.x) + sq(camZ - res.z);
			if (dSquare > sq(900)) continue;
			yield { attached: res };
		}
		for (let res of getResourcePool('harmolines').loaded) {
			const dSquare = sq(camX - res.x) + sq(camZ - res.z);
			if (dSquare > sq(900)) continue;
			yield { attached: res };
		}
	},
	add(res) {
		res.domEle = document.createElement('div');
		const rec = res.attached.record;
		if (rec) {
			res.domEle.innerText = rec.desc;
			res.domEle.onclick = () => {
				// getSelection().selectAllChildren(res.domEle);
				// navigator.clipboard.writeText(rec.desc);
				console.log(rec.trackParams, `add('${rec.desc}')`, `replace('${rec.desc}')`);
				window.focusBeacon = rec;
			}
		} else {
			res.domEle.innerText = res.attached.dissonance;
		}
		res.domEle.className = 'editor_tip';
		document.body.appendChild(res.domEle);
	},
	remove(res) {
		res.domEle.remove();
	},
	compare(res1, res2) {
		return res1.attached === res2.attached;
	},
	afterUpdate(pool) {
		for (let res of pool.loaded) {
			const wPos = res.attached.form.getWorldPosition(new THREE.Vector3());
			if (res.attached.record) wPos.add({x: 0, y: 40, z: 0});
			// check dot product to avoid showing text when facing exactly away from the target
			const dot = camera.getWorldDirection(new THREE.Vector3()).dot(wPos.clone().sub(camera.position).normalize());
			wPos.project(camera);
			if (dot > 0 && wPos.x > -0.8 && wPos.x < 0.8 && wPos.y > -0.8 && wPos.y < 0.8) {
				res.domEle.style.display = 'block';
			} else {
				res.domEle.style.display = 'none';
			}
			res.domEle.style.left = ((0.5 * wPos.x + 0.5) * renderer.domElement.clientWidth)+'px';
			res.domEle.style.top = ((-0.5 * wPos.y + 0.5) * renderer.domElement.clientHeight)+'px';
		}
	}
});

const addAtCursor = rec => {
	if (!rec) rec = window.focusBeacon;
	if (!rec) return;
	const mouseHit = intersectMouse();
	if (!mouseHit) return;
	const ret = Object.assign({}, rec);
	parseTrack(ret);
	ret.x = mouseHit.point.x;
	ret.z = mouseHit.point.z;
	beaconRecords.push(ret);
	window.focusBeacon = ret;
};

const deleteLast = () => {
	if (!window.focusBeacon) return;
	beaconRecords.splice(beaconRecords.indexOf(focusBeacon), 1);
	updateResources(camera.position.x, camera.position.z);
	window.focusBeacon = undefined;
};

window.updateLast = x => {
	beaconRecords.pop();
	updateResources(camera.position.x, camera.position.z);
	beaconRecords.push(x);
	window.focusBeacon = x;
};

window.add = desc => {
	addAtCursor({ desc });
};

window.replace = desc => {
	const {x, z} = window.focusBeacon;
	deleteLast();
	const ret = { desc, x, z };
	parseTrack(ret);
	beaconRecords.push(ret);
	window.focusBeacon = ret;
};

const exportRecords = async () => {
	const x = beaconRecords.map(r => 
		`\t{desc: '${r.desc}', x: ${Math.round(r.x)}, z: ${Math.round(r.z)}},`
	);
	await navigator.clipboard.writeText('[\n'+x.join('\n')+'\n]');
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
	teleport(camera.position.x, camera.position.z-200);
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
		closeModal();
		if (editMode.enabled) {
			editMode.disable();
			runMode.enable();
		} else {
			runMode.disable();
			editMode.enable();
		}
	});
}

/**
 * @namespace
 * @property {OrbitControls}  orbiter
 */
export const editMode = {
	init, enable, disable, update,
	enabled: false, orbiter: undefined
};

