import { noise1D } from './noise.js';

/**
 * Beacons are specified with coordinates and a short-form description, from
 * which the other properties are generated. This is for easy editing from the
 * browser console.
 * @typedef {Object} BeaconRecord
 * @property {string} desc - short form description. 
 * Contains the following space-sparated elements:
 * - track name
 * - harmonic track parameters, generally in centihertz
 * - optionally a "+"
 * - optionally after the +, extra track parameters
 * @property {number} x
 * @property {number} z
 * @property {string} [trackName]
 * @property {string} [formName]
 * @property {Object} [trackParams]
 * @property {Object} [formParams]
 * @property {string} [glowCurve]
 * @property {string} [introUrl]
 * @property {string} [loopUrl]
 */

// postition to test forms: x: -300, z: 613
	//{desc: 'reso 2/3 b', x: 1380, z: 152},

/** @type {Array.<BeaconRecord>} */
export const beaconRecords = [
	{desc: 'vibrem 2 3 + 1', x: 17, z: 667},
	{desc: 'vibrem 8 9 + 1', x: 17, z: 500},
	{desc: 'vibrem 8/3 16/3 + 1', x: 231, z: 239},
	{desc: 'vibrem 16/3 20/3 + 1', x: -103, z: -207},
	{desc: 'vibrem 7 20/3*4/3 + 1', x: -163, z: -260},
	{desc: 'harmou 2/3', x: 1297, z: 155},
	{desc: 'sand 2/3', x: 120, z: -499},
	{desc: 'sand 1/3', x: 159, z: -806},
	{desc: 'harmou 1', x: -77, z: -1858},
	{desc: 'sand 1/2', x: -240, z: -1503},
	{desc: 'reso 1 1 7/4', x: -150, z: -1785},
	{desc: 'sand 1', x: -32, z: -1009},
	{desc: 'vibrem 8/3 10/3', x: 124, z: -646},
	{desc: 'vibrem 2 3', x: -44, z: -1120},
	{desc: 'vibrem 1 3/2', x: -66, z: -1488},
	{desc: 'fracsin 4*3/4 6*3/4', x: 839, z: -1560},
	{desc: 'fracsin 6*3/4 9*3/4', x: 1080, z: -1771},
	{desc: 'harmou 3/4', x: 1550, z: -1690},
	{desc: 'fracsin 3*3/4 4*3/4', x: 1537, z: -1559},
	{desc: 'fracsin 2 4*3/4', x: 325, z: -1872},
	{desc: 'sand 1/2 + 0.5 600', x: 233, z: -1795},
	{desc: 'sand 3/4 + 0.5 600', x: 522, z: -1713},
	{desc: 'sand 3/2*3/4 + 0.5 600', x: 780, z: -1794},
	{desc: 'sand 3/4 + 0.5 600', x: 1177, z: -1579},
	{desc: 'sand 1/2*3/4 + 0.5 600', x: 1398, z: -1776},
	{desc: 'fracsin 4*3/4 3*8/5*3/4', x: 1548, z: -943},
	{desc: 'fracbot 4*3/4 3*8/5*3/4', x: 1354, z: -1024},
	{desc: 'reso 1 4/3 5/3 + 1', x: 17, z: 583},
	{desc: 'reso 2/3 2/3 7/6 + 1', x: 152, z: 237},
	{desc: 'reso 4/3 16/9 20/9 + 1', x: -72, z: -43},
	{desc: 'reso 3/2 3/4 9/4', x: 1529, z: -1273},
	{desc: 'reso 1 1/2 3/2', x: 484, z: 73},
	{desc: 'vibrem 6 19/4', x: 481, z: -56},
	{desc: 'sand 3/5 + 0.7', x: 702, z: -85},
	{desc: 'sand 1 + 0.5', x: 751, z: -368},
	{desc: 'reso 1 7/6 1/2', x: 1260, z: -234},
	{desc: 'sand 7/6 + 1 360', x: 1336, z: -749},
	{desc: 'sand 1 + 0.6', x: 1111, z: -295},
	{desc: 'fracsin 4*3/4 3*8/5*3/4', x: 1158, z: -908},
	{desc: 'fracsin 4 6', x: 1162, z: -619},
];

const parseToken = (tok, isExtra) => {
	if (tok.match(/[a-zA-Z]/)) return tok;
	if (isExtra) return Function(`"use strict"; return parseFloat(${tok})`)();
	else return Function(`"use strict"; return 100*(${tok})`)();
};

const parseDesc = (rec, ...paramNames) => {
	/** @type {Array.<string>} */
	const tokens = rec.desc.split(' ');
	let extraIdx = tokens.indexOf('+');
	if (extraIdx !== -1) tokens.splice(extraIdx, 1);
	else extraIdx = 999;
	if (tokens.length > paramNames.length + 1) {
		throw new Error('Invalid desc: '+rec.desc);
	}
	rec.trackParams = {};
	for (let i=1; i<tokens.length; i++) {
		const isExtra = (i >= extraIdx);
		rec.trackParams[paramNames[i-1]] = parseToken(tokens[i], isExtra);
	}
	return rec.trackParams;
};

/** @type {Object.<string, function(BeaconRecord)>} */
const trackParsers = {
	vibrem(rec) {
		// 50 - 2000
		const { freq1, freq2 } = parseDesc(rec, 'freq1', 'freq2', 'impact');
		const x = noise1D(freq1 + freq2);
		rec.formName = 'tree';
		rec.formParams = {
			colorFn: 'pick', colorParams: [
				[0.35, 0.48, 0.45], // hsl(119.9deg, 48.3%, 46.8%)
				[(0.9 + 0.35*x) % 1, 0.48 + 0.2*x, 0.45]
		]};
		if (!rec.trackParams.impact) rec.glowCurve = 'slow';
	},
	reso(rec) {
		// 50 - 200
		const { freq1, freq2 } = parseDesc(rec, 'freq1', 'freq2', 'freq3', 'impact');
		const x = noise1D(freq1 + freq2);
		rec.formName = 'tree';
		rec.formParams = {
			height: 90, numCoreSegs: 10,
			colorFn: 'pick', colorParams: [
				[0.4 + x*0.1, 0.6, 0.4], // hsl(148.7deg, 60.4%, 39.9%)
				[0.15 + x*0.2, 0.7, 0.35], // hsl(142.3deg, 69.4%, 35%)
		]};
		if (!rec.trackParams.impact) rec.glowCurve = 'slow';
	},
	harmou(rec) {
		// 60 - 120
		const { freq1 } = parseDesc(rec, 'freq1');
		const x = noise1D(freq1 + 123);
		rec.formName = 'treball';
		rec.formParams = {
			colorFn: 'pick', colorParams: [
				[0.26, 0.6, 0.4], // c`hsl(90.3deg, 60.4%, 39.2%)`,
				[(0.86 + 0.3*x) % 1, 0.55, 0.6] // c`hsl(27deg, 40.3%, 50.8%)`,
		]};
		rec.glowCurve = 'slow';
	},
	sand(rec) {
		// 20 - 200
		const { freq1 } = parseDesc(rec, 'freq1', 'flatten', 'lp1');
		const x = noise1D(freq1 + 50);
		rec.formName = 'tree';
		rec.formParams = {
			colorFn: 'pick', colorParams: [
				[0.26, 0.6, 0.4], // c`hsl(76.2deg, 60.4%, 39.2%)`,
				[0.7 + 0.2*x, 0.2, 0.53], // c`hsl(299.8deg, 20.8%, 52.6%)`,
		]};
		rec.glowCurve = 'slow';
	},
	fracsin(rec) {
		const { freq1, freq2 } = parseDesc(rec, 'freq1', 'freq2');
		const x = noise1D(freq1 + freq2 + 50);
		rec.formName = 'treball';
		rec.formParams = {
			height: 80, numBranches: 5, minHang: 0.2, outShrink: 0.02, twist: 2.5, cup: 1.4,
			colorFn: 'grad', colorParams: [
				[0.2, 0.6, 0.4], // c`hsl(0.5turn, 17.4%, 57.8%)`,
				[0.2*x, 0.6, 0.4], // c`hsl(41.9deg, 66.3%, 33.5%)`,
		]};
		rec.glowCurve = 'slow';
	},
	fracbot(rec) {
		const { freq1, freq2 } = parseDesc(rec, 'freq1', 'freq2');
		const x = noise1D(freq1 + freq2 + 50);
		rec.formName = 'tree';
		rec.formParams = {
			height: 70, numBranches: 12, numCoreSegs: 8, segPts: 22, open: 17, twist: 1,
			colorFn: 'grad', colorParams: [
				[0.1, 0.1, 0.4], // c`hsl(0.5turn, 17.4%, 57.8%)`,
				[0.2*x, 0.6, 0.4], // c`hsl(41.9deg, 66.3%, 33.5%)`,
		]};
	},
};

export const parseTrack = rec => {
	rec.trackName = rec.desc.split(' ')[0];
	let urlBase = rec.desc;
	for (let [a, b] of [['/','o'],['+','p'],['*','x'],[/[^a-z0-9]/gi, '_']]) {
		urlBase = urlBase.replaceAll(a, b);
	}
	rec.introUrl = 'generated/audio/'+urlBase+'_intro.ogg';
	rec.loopUrl = 'generated/audio/'+urlBase+'_loop.ogg';
	if (!(rec.trackName in trackParsers)) {
		throw new Error('could not parse '+rec.desc);
	}
	trackParsers[rec.trackName](rec);
}

for (let r of beaconRecords) {
	parseTrack(r);
}