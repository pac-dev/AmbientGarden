/**
 * Beacons are initially specified with coordinates and a short-form
 * description, from which the other properties are generated. This is for easy
 * editing from the browser console.
 * @typedef {Object} BeaconRecord
 * @property {string} desc - short form description.
 * Contains the following space-sparated elements:
 * - patch name
 * - harmonic patch parameters in units of 100Hz
 * - optionally a "+"
 * - optionally after the +, extra patch parameters
 * @property {number} x
 * @property {number} z
 * @property {string} [patchName]
 * @property {Object.<string, number>} [patchParams] - parsed parameters
 * @property {string} [glowCurve] - how fast the beacon starts glowing
 * @property {string} [introUrl] - audio location if using "frozen" mode
 * @property {string} [loopUrl] - audio location if using "frozen" mode
 * @property {string} [sourceUrl] - audio location if using "frozen" mode
 * @property {number} [reach] - trigger distance (default=1)
 * @property {number} [floor] - 0=on ground, 1=on mesh above ground
 */

// postition to test forms:
// {desc: `vtone ${Math.round(Math.random()*6+4)} ${Math.round(Math.random()*6+4)}`, x: -300, z: 613},

/** @type {Array.<BeaconRecord>} */
export const beaconRecords = [
	{desc: 'vib 2 3 + 1', x: 17, z: 667},
	{desc: 'vib 8 9 + 1', x: 17, z: 500},
	{desc: 'vib 8/3 16/3 + 1', x: -284, z: 261},
	{desc: 'vib 16/3 20/3 + 1', x: -175, z: -553},
	{desc: 'hseri 1', x: -77, z: -1858},
	{desc: 'cbass 1/2', x: -240, z: -1503},
	{desc: 'rdrone 1 1 7/4', x: -150, z: -1785},
	{desc: 'vib 1 3/2', x: -66, z: -1488},
	{desc: 'sdrone 4*3/4 6*3/4', x: 839, z: -1560},
	{desc: 'sdrone 6*3/4 9*3/4', x: 1080, z: -1771},
	{desc: 'hseri 3/4', x: 1550, z: -1690},
	{desc: 'sdrone 3*3/4 4*3/4', x: 1537, z: -1559},
	{desc: 'sdrone 2 4*3/4', x: 325, z: -1872},
	{desc: 'cbass 1/2 + 0.5 600', x: 233, z: -1795},
	{desc: 'cbass 3/4 + 0.5 600', x: 522, z: -1713},
	{desc: 'cbass 3/2*3/4 + 0.5 600', x: 780, z: -1794},
	{desc: 'cbass 3/4 + 0.5 600', x: 1177, z: -1579},
	{desc: 'cbass 1/2*3/4 + 0.5 600', x: 1398, z: -1776},
	{desc: 'sdrone 4*3/4 3*8/5*3/4', x: 1461, z: -925},
	{desc: 'mbottl 4*3/4 3*8/5*3/4', x: 1270, z: -1009},
	{desc: 'rdrone 1 4/3 5/3 + 1', x: 17, z: 583},
	{desc: 'rdrone 2/3 2/3 7/6 + 1', x: -189, z: 255},
	{desc: 'rdrone 4/3 16/9 20/9 + 1', x: -63, z: -599},
	{desc: 'rdrone 3/2 3/4 9/4', x: 1514, z: -1256},
	{desc: 'rdrone 1 1/2 3/2', x: 393, z: 24},
	{desc: 'vib 6 19/4', x: 528, z: -106},
	{desc: 'cbass 3/5 + 0.7', x: 509, z: -325},
	{desc: 'cbass 1 + 0.5', x: 874, z: -338},
	{desc: 'cbass 7/6 + 1 360', x: 1192, z: -483},
	{desc: 'cbass 1 + 0.6', x: 1223, z: -283},
	{desc: 'sdrone 4*3/4 3*8/5*3/4', x: 1363, z: -574},
	{desc: 'sdrone 4 6', x: 1120, z: -178},
	{desc: 'vtone 2/3', x: 43, z: 80},
	{desc: 'cbass 2/3 + 0.4', x: 24, z: -187},
	{desc: 'rdrone 2/3 2/3 7/6', x: 226, z: -194},
	{desc: 'vib 24/9 30/9', x: -62, z: -832},
	{desc: 'vtone 2/6', x: 140, z: -451},
	{desc: 'vtone 1/3', x: -114, z: -1081},
	{desc: 'cbass 1 + 0.5 600', x: 57, z: -1283},
	{desc: 'cbass 1/3 + 0.3', x: 133, z: -1042},
	{desc: 'vib 8/3 2', x: 262, z: -1056},
	{desc: 'cbass 3/4 + 0.5 600', x: 1136, z: -768},
	{desc: 'vtone 1 3/4', x: 1320, z: -43},
	{desc: 'vtone 8/9', x: 1288, z: 348},
	{desc: 'sdrone 6 8', x: 969, z: 1189},
	{desc: 'vtone 1/2 10/9', x: 1464, z: 623},
	{desc: 'cbass 1 + 0.5', x: 1475, z: 316},
	{desc: 'cbass 1/2 + 0.5', x: 1244, z: 119},
	{desc: 'cbass 3/4 + 0.5 600', x: 1226, z: 658},
	{desc: 'vtone 1 3/4', x: 1492, z: 960},
	{desc: 'sdrone 4 6', x: 1197, z: 1155},
	{desc: 'cbass 1 + 0.5', x: 1279, z: 965},
	{desc: 'msop 6 8', x: 1036, z: 966},
	{desc: 'vib 5/2 8/3', x: 630, z: 829},
	{desc: 'cbass 1/2 + 0.5', x: 452, z: 905},
	{desc: 'cbass 1/2 + 0.5', x: 798, z: 961},
	{desc: 'cbass 3/4 + 0.5', x: 224, z: 874},
	{desc: 'vib 6/4 4', x: 329, z: 991},
	
	/* 01 */ {desc: 'wbell 4/3', x: 430, z: 4680, floor: 1},
	/* 02 */ {desc: 'wbell 2', x: 89, z: 4899, floor: 1},
	/* 03 */ {desc: 'wbell 2*3/4', x: 891, z: 4845, floor: 1},
	/* 04 */ {desc: 'wbell 2*4/3', x: 549, z: 5134, floor: 1},
	/* 05 */ {desc: 'wbell 3', x: 176, z: 5442, floor: 1},
	/* 06 */ {desc: 'wbell 2*4/3*4/3', x: 977, z: 5317, floor: 1},
	/* 07 */ {desc: 'wbell 2*4/3', x: 602, z: 5611, floor: 1},
	/* 08 */ {desc: 'wbell 2*2', x: 1022, z: 5791, floor: 1},
	/* 09 */ {desc: 'wbell 2*2*3/4', x: 1489, z: 5993, floor: 1},
	/* 10 */ {desc: 'wbell 2*2*4/3', x: 1111, z: 6229, floor: 1},
	/* 11 */ {desc: 'wbell 2*3', x: 1947, z: 6148, floor: 1},
	/* 12 */ {desc: 'wbell 2*2*4/3*4/3', x: 1576, z: 6459, floor: 1},
	/* 13 */ {desc: 'wbell 2*4', x: 1208, z: 6758, floor: 1},
	/* 14 */ {desc: 'wbell 3*2*4/3', x: 2005, z: 6530, floor: 1},
	/* 15 */ {desc: 'wbell 3*2', x: 1634, z: 6919, floor: 1},
	/* 16 */ {desc: 'wbell 4/3', x: 2054, z: 7036, floor: 1},
];
/** "monument" beacon map:
 *        16
 *       /  \
 *      14  15
 *     /      \
 *    11--12--13
 *     \      /
 *      09  10
 *       \  /
 *        08
 *       /  \
 *      06  07
 *     /      \
 *    03--04--05
 *     \      /
 *      01  02
 *       \  /
 *        \/
 */

const parseToken = (tok, isExtra) => {
	if (tok.match(/[a-zA-Z]/)) return tok;
	if (isExtra) return Function(`"use strict"; return parseFloat(${tok})`)();
	else return Function(`"use strict"; return 100*(${tok})`)();
};

const parseDesc = (rec, ...paramNames) => {
	const fragments = [];
	/** @type {Array.<string>} */
	const tokens = rec.desc.split(' ');
	let extraIdx = tokens.indexOf('+');
	if (extraIdx !== -1) tokens.splice(extraIdx, 1);
	else extraIdx = 999;
	if (tokens.length > paramNames.length + 1) {
		throw new Error('Invalid desc: ' + rec.desc);
	}
	rec.patchParams = {};
	for (let i = 1; i < tokens.length; i++) {
		const paramName = paramNames[i - 1];
		const isExtra = i >= extraIdx;
		rec.patchParams[paramName] = parseToken(tokens[i], isExtra);
		fragments.push(paramName + '=' + (isExtra ? '' : '100*') + tokens[i]);
	}
	rec.paramFragment = fragments.join('&');
	rec.reach ??= 1;
	rec.floor ??= 0;
	return rec.patchParams;
};

/** @type {Object.<string, function(BeaconRecord)>} */
const patchParsers = {
	cbass(rec) {
		rec.patchName = 'contrabass';
		// 20 - 200
		parseDesc(rec, 'freq1', 'flatten', 'lp1');
		rec.glowCurve = 'slow';
	},
	hseri(rec) {
		rec.patchName = 'harmonic-series';
		// 60 - 120
		parseDesc(rec, 'freq1');
		rec.glowCurve = 'slow';
	},
	mbottl(rec) {
		rec.patchName = 'melodic-bottle';
		parseDesc(rec, 'freq1', 'freq2');
	},
	msop(rec) {
		rec.patchName = 'melodic-soprano';
		parseDesc(rec, 'freq1', 'freq2');
	},
	ssop(rec) {
		rec.patchName = 'sparse-soprano';
		parseDesc(rec, 'freq1');
	},
	rdrone(rec) {
		rec.patchName = 'resonant-drone';
		// 50 - 200
		parseDesc(rec, 'freq1', 'freq2', 'freq3', 'impact');
		if (!rec.patchParams.impact) rec.glowCurve = 'slow';
	},
	sdrone(rec) {
		rec.patchName = 'sine-drone';
		parseDesc(rec, 'freq1', 'freq2');
		rec.glowCurve = 'slow';
	},
	vib(rec) {
		rec.patchName = 'vibraphones';
		// 50 - 2000
		parseDesc(rec, 'freq1', 'freq2', 'impact');
		if (!rec.patchParams.impact) rec.glowCurve = 'slow';
	},
	vtone(rec) {
		rec.patchName = 'vocal-overtones';
		const { freq2 } = parseDesc(rec, 'freq1', 'freq2');
		rec.patchParams.num = freq2 ? 2 : 1;
	},
	wbell(rec) {
		rec.patchName = 'water-bell';
		rec.reach = 1.7;
		parseDesc(rec, 'freq1', 'interval');
	},
};

export const parsePatch = rec => {
	const shortName = rec.desc.split(' ')[0];
	if (!(shortName in patchParsers)) {
		throw new Error('could not parse ' + rec.desc);
	}
	patchParsers[shortName](rec);
	let urlBase = rec.desc;
	for (let [a, b] of [
		['/', 'o'],
		['+', 'p'],
		['*', 'x'],
		[/[^a-z0-9]/gi, '_'],
	]) {
		urlBase = urlBase.replaceAll(a, b);
	}
	const versionedPath = window.agVersionedPath ?? 'versioned/';
	rec.introUrl = versionedPath+'generated/audio/' + urlBase + '_intro.mp3';
	rec.loopUrl = versionedPath+'generated/audio/' + urlBase + '_loop.mp3';
	rec.sourceUrl = 'https://ambient.garden/patches#' + rec.patchName + '?' + rec.paramFragment;
};

for (let r of beaconRecords) {
	parsePatch(r);
}
