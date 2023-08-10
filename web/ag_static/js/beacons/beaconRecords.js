/**
 * Beacons are initially specified with coordinates and a short-form
 * description, from which the other properties are generated. This is for easy
 * editing from the browser console.
 * @typedef {Object} BeaconRecord
 * @property {string} desc - short form description.
 * Contains the following space-sparated elements:
 * - track name
 * - harmonic track parameters in units of 100Hz
 * - optionally a "+"
 * - optionally after the +, extra track parameters
 * @property {number} x
 * @property {number} z
 * @property {string} [trackName]
 * @property {Object.<string, number>} [trackParams] - parsed parameters
 * @property {string} [glowCurve] - how fast the beacon starts glowing
 * @property {string} [introUrl] - audio location if using "frozen" mode
 * @property {string} [loopUrl] - audio location if using "frozen" mode
 * @property {string} [sourceUrl] - audio location if using "frozen" mode
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
];

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
	rec.trackParams = {};
	for (let i = 1; i < tokens.length; i++) {
		const paramName = paramNames[i - 1];
		const isExtra = i >= extraIdx;
		rec.trackParams[paramName] = parseToken(tokens[i], isExtra);
		fragments.push(paramName + '=' + (isExtra ? '' : '100*') + tokens[i]);
	}
	rec.paramFragment = fragments.join('&');
	return rec.trackParams;
};

/** @type {Object.<string, function(BeaconRecord)>} */
const trackParsers = {
	cbass(rec) {
		rec.trackName = 'contrabass';
		// 20 - 200
		parseDesc(rec, 'freq1', 'flatten', 'lp1');
		rec.glowCurve = 'slow';
	},
	hseri(rec) {
		rec.trackName = 'harmonic-series';
		// 60 - 120
		parseDesc(rec, 'freq1');
		rec.glowCurve = 'slow';
	},
	mbottl(rec) {
		rec.trackName = 'melodic-bottle';
		parseDesc(rec, 'freq1', 'freq2');
	},
	msop(rec) {
		rec.trackName = 'melodic-soprano';
		parseDesc(rec, 'freq1', 'freq2');
	},
	rdrone(rec) {
		rec.trackName = 'resonant-drone';
		// 50 - 200
		parseDesc(rec, 'freq1', 'freq2', 'freq3', 'impact');
		if (!rec.trackParams.impact) rec.glowCurve = 'slow';
	},
	sdrone(rec) {
		rec.trackName = 'sine-drone';
		parseDesc(rec, 'freq1', 'freq2');
		rec.glowCurve = 'slow';
	},
	vib(rec) {
		rec.trackName = 'vibraphones';
		// 50 - 2000
		parseDesc(rec, 'freq1', 'freq2', 'impact');
		if (!rec.trackParams.impact) rec.glowCurve = 'slow';
	},
	vtone(rec) {
		rec.trackName = 'vocal-overtones';
		const { freq2 } = parseDesc(rec, 'freq1', 'freq2');
		rec.trackParams.num = freq2 ? 2 : 1;
	},
};

export const parseTrack = rec => {
	const shortName = rec.desc.split(' ')[0];
	if (!(shortName in trackParsers)) {
		throw new Error('could not parse ' + rec.desc);
	}
	trackParsers[shortName](rec);
	let urlBase = rec.desc;
	for (let [a, b] of [
		['/', 'o'],
		['+', 'p'],
		['*', 'x'],
		[/[^a-z0-9]/gi, '_'],
	]) {
		urlBase = urlBase.replaceAll(a, b);
	}
	const staticPath = window.agStaticPath ?? 'ag_static/';
	rec.introUrl = staticPath+'generated/audio/' + urlBase + '_intro.mp3';
	rec.loopUrl = staticPath+'generated/audio/' + urlBase + '_loop.mp3';
	rec.sourceUrl = 'https://ambient.garden/tracks#' + rec.trackName + '?' + rec.paramFragment;
};

for (let r of beaconRecords) {
	parseTrack(r);
}
