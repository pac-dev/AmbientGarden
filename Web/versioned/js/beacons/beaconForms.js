import { noise1D } from '../noise.js';
import { addTree } from './tree.js';
import { addTreball } from './treball.js';
import { addTrelsys } from './trelsys.js';
import { addString } from './stringForm.js';
import { addRay } from './rayForm.js';

const pi = Math.PI;
const ga = pi*(3-Math.sqrt(5));
const rot = (x, y, angle) => {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	return [x*c + s*y, y*c - s*x];
};
const recordToNoise = (rec, salt=0) => {
	return noise1D(
		rec.patchParams['freq1']
		+ (rec.patchParams['freq2'] ?? 0)
		+ salt
	);
};

/** @type {Object.<string, function(import('./beaconRecords.js').BeaconRecord)>} */
const formGenerators = {
	cbass(rec, x, z) {
		const n = recordToNoise(rec);
		return addTree({
			height: 55,
			open: 20,
			colorFn: 'grad',
			colorParams: [
				[0.1, 0.1, 0.4], // c`hsl(0.5turn, 17.4%, 57.8%)`,
				[0.2 * n, 0.6, 0.4], // c`hsl(41.9deg, 66.3%, 33.5%)`,
			],
		}, x, z);
	},
	hseri: (rec, x, z) => {
		const n = recordToNoise(rec);
		const triWave = x => 1-Math.abs(x%2-1)*2;
		const posFn = a => {
			const y = 1.01+triWave(a);
			const f = r => 12*triWave(a*r)*Math.sqrt(y*(1+n*0.5));
			const [x, z] = rot(f(5/4), f(4/5), y);
			return [x, 40*y, z];
		};
		return addString({
			ptGroups: [400],
			v0: 0.1,
			separation: 2,
			posFn
		}, x, z);
	},
	mbottl: (rec, x, z) => {
		const posFn = a => {
			const h = 1 - Math.cos(a);
			return [
				Math.sin(a*8)*8*h,
				30*h,
				Math.cos(a*8)*8*h
			];
		};
		return addString({
			ptGroups: [210],
			v0: 0.1,
			posFn
		}, x, z);
	},
	msop: (rec, x, z) => {
		const n = recordToNoise(rec, 50);
		return addTreball({
			height: 80,
			numBranches: 2,
			minHang: 0.5,
			outShrink: 0,
			twist: 18.5,
			cup: 1.66,
			colorFn: 'grad',
			colorParams: [
				[0, 0.1, 0.4],
				[0.3 + 0.3 * n, 0.6, 0.33],
			],
		}, x, z);
	},
	ssop: (rec, x, z) => {
		const n = recordToNoise(rec);
		const posFn = (a, group) => {
			const zi = 8+6*Math.tanh(group*0.07-1.5);
			const xi = 4*Math.sin(a+.5);
			const y = 4*Math.cos(a+.5)+group*(2-0.1*Math.sqrt(group));
			const [x,z] = rot(xi, zi, group*ga);
			return [x,y,z];
		};
		return addString({
			ptGroups: Array(60).fill(8),
			v0: 1,
			separation: 2.25,
			posFn
		}, x, z);
	},
	rdrone: (rec, x, z) => {
		const n = recordToNoise(rec, 5);
		return addTree({
			height: 90,
			numCoreSegs: 10,
			colorFn: 'pick',
			colorParams: [
				[0.4 + n * 0.1, 0.6, 0.4], // hsl(148.7deg, 60.4%, 39.9%)
				[0.15 + n * 0.2, 0.7, 0.35], // hsl(142.3deg, 69.4%, 35%)
			],
		}, x, z);
	},
	sdrone: (rec, x, z) => {
		const n = recordToNoise(rec, 50);
		return addTrelsys({
			colorFn: 'pick',
			colorParams: [
				[0.35, 0.48, 0.45], // hsl(119.9deg, 48.3%, 46.8%)
				[(0.9 + 0.35 * n) % 1, 0.48 + 0.2 * n, 0.45],
			],
		}, x, z);
	},
	vib: (rec, x, z) => {
		const n = recordToNoise(rec, 4);
		return addTree({
			height: 65,
			numBranches: 12,
			numCoreSegs: 6,
			segPts: 22,
			open: 17,
			twist: 1,
			colorFn: 'pick',
			colorParams: [
				[0.35, 0.48, 0.45], // hsl(119.9deg, 48.3%, 46.8%)
				[(0.9 + 0.35 * n) % 1, 0.48 + 0.2 * n, 0.45],
			],
		}, x, z);
	},
	vtone: (rec, x, z) => {
		const n = recordToNoise(rec, 50);
		return addTreball({
			height: 80,
			numBranches: 5,
			minHang: 0.2,
			outShrink: 0.02,
			twist: 2.5,
			cup: 1.4,
			colorFn: 'grad',
			colorParams: [
				[0.2, 0.6, 0.4], // c`hsl(0.5turn, 17.4%, 57.8%)`,
				[0.2 * n, 0.6, 0.4], // c`hsl(41.9deg, 66.3%, 33.5%)`,
			],
		}, x, z);
	},
	wbell: (rec, x, z) => {
		return addRay({ }, x, z);
	},
};

export const generateForm = (rec, x, z) => {
	const shortName = rec.desc.split(' ')[0];
	if (!(shortName in formGenerators)) {
		throw new Error('No form generator for: ' + shortName);
	}
	return formGenerators[shortName](rec, x, z);
};