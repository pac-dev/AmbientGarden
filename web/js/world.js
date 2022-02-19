import { events } from './events.js';
import * as THREE from './lib/three.module.js';
import { noise2D } from './noise.js';

export const clock = {
	lastTime: Date.now(),
	diff: 0,
	gfxTime: 0,
	worldTime: 0,
	paused: false,
	advance(gfx = true) {
		if (this.paused) return;
		const now = Date.now();
		this.diff = (now - this.lastTime) / 1000;
		if (this.diff > 1) this.diff = 1;
		this.worldTime += this.diff;
		if (gfx) this.gfxTime += this.diff;
		this.lastTime = now;
	},
};

events.on('pause', () => { clock.paused = true; });
events.on('resume', () => {
	clock.paused = false;
	clock.lastTime = Date.now();
});

export const beaconLoadDist = 2000,
	pointHiDist = 1950,
	pointLoDist = 300;
const distribution = x => {
	x = 1 - x;
	return x * x * 0.6 + x * 0.4;
};
const randDist = () => distribution(Math.random());
export const randomPointRange = () => pointLoDist + randDist() * (pointHiDist - pointLoDist);

export const ratio = 1; // window.devicePixelRatio // * 0.5

export const tileSide = 192;
export const unitSide = 16;
/**let tileSide = 192;
let unitSide = 16;
let numShuffles = 12;
let tilePts = tileSide * tileSide;
let unitPts = unitSide * unitSide;
let tileUnits = tilePts / unitPts;
let sideUnits = tileSide / unitSide;
console.log(tileUnits, sideUnits);

let farSide = tileSide * 6;
console.log(farSide * 4);
*/

let map, mapw, maph, mapw2, maph2;
export let mapcnv;

let far, farw, farh, farw2, farh2, farcnv;

const loadMap = async inMap => {
	if (typeof inMap === 'string') {
		const img = new Image();
		img.src = inMap;
		const cnv = document.createElement('canvas');
		const ctx = cnv.getContext('2d');
		await img.decode();
		const [w, h] = [img.width, img.height];
		[cnv.width, cnv.height] = [w, h];
		ctx.drawImage(img, 0, 0);
		const retMap = ctx.getImageData(0, 0, w, h);
		return [retMap, w, h, Math.floor(w / 2), Math.floor(h / 2), cnv];
	} else {
		const cnv = await inMap();
		const [w, h] = [cnv.width, cnv.height];
		const retMap = cnv.getContext('2d').getImageData(0, 0, w, h);
		return [retMap, w, h, Math.floor(w / 2), Math.floor(h / 2), cnv];
	}
};

export const loadNearMap = async inMap => {
	[map, mapw, maph, mapw2, maph2, mapcnv] = await loadMap(inMap);
};

export const loadFarMap = async inMap => {
	[far, farw, farh, farw2, farh2, farcnv] = await loadMap(inMap);
};

const mod = (x, n) => ((x % n) + n) % n;
const mirror = (x, n) => n - Math.abs((Math.abs(x) % (n * 2)) - n);

const mapClamp = x => Math.min(mapw - 1, x);
export const world2mapFloat = (x, z) => {
	const mapx = mirror(x * 0.4 + mapw2, mapw);
	const mapy = mirror(z * 0.4 + maph2, maph);
	return [mapx, mapy];
};
export const world2mapPos = (x, z) => {
	const mapx = mapClamp(Math.floor(mirror(x * 0.4 + mapw2, mapw)));
	const mapy = mapClamp(Math.floor(mirror(z * 0.4 + maph2, maph)));
	return [mapx, mapy];
};
const world2mapi = (x, z) => {
	const [mapx, mapy] = world2mapPos(x, z);
	return (mapx + mapy * mapw) * 4;
};

export const colorAt = (x, z) => {
	const mapi = world2mapi(x, z);
	const ret = new THREE.Color(
		map.data[mapi] / 255,
		map.data[mapi + 1] / 255,
		map.data[mapi + 2] / 255
	);
	return ret.offsetHSL(
		Math.sqrt(noise2D(x + 23, z + 13)) * 0.2 - 0.1,
		0,
		Math.sqrt(noise2D(x + 10, z + 20)) * 0.1 - 0.05
	);
};

const farClamp = x => Math.min(farw - 1, x);
const world2farCoord = (x, z) => [
	farClamp(mirror(x * 0.06 + farw2, farw)),
	farClamp(mirror(z * 0.06 + farh2, farh)),
];
export const farCoord2world = (x, z, xi, zi) => [
	(x * (mod(xi, 2) >= 1 ? -1 : 1) - farw2) / 0.06 + (farw / 0.06) * Math.ceil(xi / 2) * 2,
	(z * (mod(zi, 2) >= 1 ? -1 : 1) - farh2) / 0.06 + (farh / 0.06) * Math.ceil(zi / 2) * 2,
];

const farVal = (x, y) => far.data[(x + y * farw) * 4];
const farLerp = (x, y) => {
	const x1 = Math.floor(x),
		x2 = Math.ceil(x);
	const y1 = Math.floor(y),
		y2 = Math.ceil(y);
	if (x1 === x2 && y1 === y2) return farVal(x1, y1);
	if (x1 === x2) return (farVal(x1, y1) * (y2 - y) + farVal(x1, y2) * (y - y1)) / (y2 - y1);
	if (y1 === y2) return (farVal(x1, y1) * (x2 - x) + farVal(x2, y1) * (x - x1)) / (x2 - x1);
	return (
		(farVal(x1, y1) * (x2 - x) * (y2 - y) +
			farVal(x2, y1) * (x - x1) * (y2 - y) +
			farVal(x1, y2) * (x2 - x) * (y - y1) +
			farVal(x2, y2) * (x - x1) * (y - y1)) /
		((x2 - x1) * (y2 - y1))
	);
};

const world2fari = (x, z) => {
	const farx = farClamp(Math.floor(mirror(x * 0.06 + farw2, farw)));
	const fary = farClamp(Math.floor(mirror(z * 0.06 + farh2, farh)));
	return (farx + fary * farw) * 4;
};

export const heightAt = (x, z) => {
	const nearh = map.data[world2mapi(x, z) + 3] / 255;
	// const farh = far.data[world2fari(x, z)] / 255
	const farh = farLerp(...world2farCoord(x, z)) / 255;
	return nearh * 60 + farh * 700;
};

// {c1x, c1y, c1r, c2x, c2y, c2r, c3x, c3y, c3r, c4x, c4y, c4r, y12}
export const terrainGlsl = /*glsl*/ `
float c1r = 170.666;
float c1x = 85.333;
float c1y = 512.0;
float c2r = 114.9204;
float c2x = 321.038;
float c2y = 350.745;
float c3r = 114.9204;
float c3x = 190.9614;
float c3y = 161.2545;
float c4r = 170.6666;
float c4x = 426.666;
float c4y = 0.0;
float y12 = 96.365;

vec2 world2mapPos(vec2 wpos) {
	return 0.4 * vec2(wpos.x, -wpos.y)/mapsz + 0.5;
}
vec2 miwrap(vec2 p) {
	return abs(mod(vec2(p.x, 1.0-p.y), 2.0) - 1.0);
}
vec3 pos2c(vec2 pos) {
	if (pos.y < y12) {
		return vec3(c4x, c4y, c4r);
	}
	if (pos.y - pos.x < 0.0) {
		return vec3(c3x, c3y, c3r);
	}
	if (pos.y < mapsz - y12) {
		return vec3(c2x, c2y, c2r);
	}
	return vec3(c1x, c1y, c1r);
}
float mapPos2roadDist(vec2 pos) {
	if ((pos.x < mapsz/4.0) || (pos.x > 3.0*mapsz/4.0)) {
		return 1.0;
	}
	vec3 c = pos2c(pos); // cx, cy, radius
	float dif = sqrt((pos.x-c.x)*(pos.x-c.x) + (pos.y-c.y)*(pos.y-c.y)) - c.z;
	return min(1.0, abs(dif) * 0.03);
}
const float rthresh = 0.16;
const float rthreshin = rthresh - 0.01;
vec4 terrain(vec2 coord) {
	vec2 mapPos = world2mapPos(coord);
	// road amt = proportion of (dist-deriv -> dist+deriv) under thresh
	// eg. thresh = 5, rdist = 4, rdif = 2 -> 3/4
	float rdist = mapPos2roadDist(miwrap(mapPos)*mapsz);
	float rdif = dFdy(rdist);
	float dmin = min(rdist - rdif, rdist + rdif);
	float dmax = max(rdist - rdif, rdist + rdif);
	float ramt = (rthresh - dmin) / (dmax - dmin);
	ramt = clamp(ramt, 0.0, 1.0);
	// float ramt = 1.0 - step(rthresh, rdist);

	vec4 ret = texture2D(maptex, mapPos);
	ret.rgb = mix(ret.rgb, vec3(0.75, 0.75, 0.7), ramt);
	return ret;
}`;
