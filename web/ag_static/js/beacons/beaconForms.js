import { noise1D } from '../noise.js';
import { addTree } from './tree.js';
import { addTreball } from './treball.js';
import { addTrelsys } from './trelsys.js';

const recordToNoise = (rec, salt=0) => {
	return noise1D(
		rec.trackParams['freq1']
		+ (rec.trackParams['freq2'] ?? 0)
		+ salt
	);
};

/** @type {Object.<string, function(import('./beaconRecords.js').BeaconRecord)>} */
const formGenerators = {
	cbass(rec, x, z) {
		const n = recordToNoise(rec, 50);
		return addTrelsys({
			height: 80,
			branching: lev => 3 - Math.max(0, lev - 3),
			branchPts: (lev, id) => 2 + lev + lev * (id % 4), //+Math.max(0, 2-lev),
			twist: lev => 0.02 + Math.min(2, lev) * 0.03,
			pull: lev => Math.max(0, lev - 3) * 0.2,
			pullDir: () => [0, 1, 0],
			colorFn: 'pick',
			colorParams: [
				[0.3 + n * 0.1, 0.55, 0.4], // hsl(0.4turn, 60%, 40%)
				[0.2 + n * 0.2, 0.6, 0.35], // hsl(0.1turn, 70%, 35%)
				[0.1 + n * 0.1, 0.55, 0.44], // hsl(0.4turn, 60%, 40%)
			],
		}, x, z);
	},
	hseri: (rec, x, z) => {
		const n = recordToNoise(rec, 123);
		return addTree({
			height: 70,
			numBranches: 10,
			numCoreSegs: 2,
			segPts: 32,
			open: 15,
			twist: -2,
			colorFn: 'grad',
			colorParams: [
				[0.4, 0.1, 0.4],
				[0.3 + 0.2 * n, 0.6, 0.33],
			],
		}, x, z);
	},
	mbottl: (rec, x, z) => {
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
	rdrone: (rec, x, z) => {
		const n = recordToNoise(rec);
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
				height: 80,
				branching: lev => 3 - Math.max(0, lev - 3),
				branchPts: (lev, id) => lev * 4 + lev * (id % 4) + Math.max(0, 2 - lev),
				twist: lev => 0.01 + lev * 0.02,
				pull: lev => Math.max(0, lev - 3) * 0.2,
				colorFn: 'grad',
				colorParams: [
					[0.1, 0.27, 0.5], // c`hsl(0.1turn, 27.5%, 52.5%)`
					[0.3 + 0.3 * n, 0.6, 0.33],
				],
			}, x, z);
	},
	vib: (rec, x, z) => {
		const n = recordToNoise(rec);
		return addTree({
			colorFn: 'pick',
			colorParams: [
				[0.35, 0.48, 0.45], // hsl(119.9deg, 48.3%, 46.8%)
				[(0.9 + 0.35 * n) % 1, 0.48 + 0.2 * n, 0.45],
			],
		}, x, z);
	},
	vtone: (rec, x, z) => {
		const n = recordToNoise(rec, 50);
		return addTree({
			height: 65,
			numBranches: 12,
			numCoreSegs: 6,
			segPts: 22,
			open: 17,
			twist: 1,
			colorFn: 'grad',
			colorParams: [
				[0.1, 0.1, 0.4], // c`hsl(0.5turn, 17.4%, 57.8%)`,
				[0.2 * n, 0.6, 0.4], // c`hsl(41.9deg, 66.3%, 33.5%)`,
			],
		}, x, z);
	},
};

export const generateForm = (rec, x, z) => {
	const shortName = rec.desc.split(' ')[0];
	if (!(shortName in formGenerators)) {
		throw new Error('No form generator for: ' + shortName);
	}
	return formGenerators[shortName](rec, x, z);
};