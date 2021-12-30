import * as THREE from './lib/three.module.js';
import { noise2D } from './noise.js';
import { genMap } from './mapgen.js';
import { genFar } from './fargen.js';

export let clock = {
	lastTime: Date.now(),
	diff: 0,
	gfxTime: 0,
	worldTime: 0,
	advance(gfx=true) {
		const now = Date.now();
		this.diff = (now - this.lastTime) / 1000;
		if (this.diff > 1) this.diff = 1;
		this.worldTime += this.diff;
		if (gfx) this.gfxTime += Math.min(this.diff, 1);
		this.lastTime = now;
	}
};

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

const loadImg = async src => {
	const img = new Image();
	img.src = src;
	const cnv = document.createElement('canvas');
	const ctx = cnv.getContext('2d');
	await img.decode();
	[mapw, maph] = [img.width, img.height];
	[mapw2, maph2] = [Math.floor(mapw / 2), Math.floor(maph / 2)];
	[cnv.width, cnv.height] = [mapw, maph];
	ctx.drawImage(img, 0, 0);
	return [ctx.getImageData(0, 0, mapw, maph), cnv];
};

export const worldPromise = (async () => {
	// [map, mapcnv] = await loadImg('map2.png');
	mapcnv = await genMap();
	[mapw, maph] = [mapcnv.width, mapcnv.height];
	[mapw2, maph2] = [Math.floor(mapw / 2), Math.floor(maph / 2)];
	map = mapcnv.getContext('2d').getImageData(0, 0, mapw, maph);

	farcnv = await genFar();
	[farw, farh] = [farcnv.width, farcnv.height];
	[farw2, farh2] = [Math.floor(farw / 2), Math.floor(farh / 2)];
	far = farcnv.getContext('2d').getImageData(0, 0, farw, farh);
})();

const mod = (x, n) => ((x % n ) + n ) % n;
const mirror = (x, n) => n - Math.abs(Math.abs(x) % (n * 2) - n);

const mapClamp = x => Math.min(mapw - 1, x);
export const world2mapFloat = (x, z) => {
	const mapx = mirror((x) * 0.4 + mapw2, mapw);
	const mapy = mirror((z) * 0.4 + maph2, maph);
	return [mapx, mapy];
};
export const world2mapPos = (x, z) => {
	const mapx = mapClamp(Math.floor(mirror((x) * 0.4 + mapw2, mapw)));
	const mapy = mapClamp(Math.floor(mirror((z) * 0.4 + maph2, maph)));
	return [mapx, mapy];
};
const world2mapi = (x, z) => {
	const [mapx, mapy] = world2mapPos(x, z);
	return (mapx + (mapy * mapw)) * 4;
};

export const colorAt = (x, z) => {
	const mapi = world2mapi(x, z)
	return new THREE.Color(
		map.data[mapi] / 255,
		map.data[mapi + 1] / 255,
		map.data[mapi + 2] / 255
	).offsetHSL(
		Math.sqrt(noise2D(x+23, z+13)) * 0.2 - 0.1, 0,
		Math.sqrt(noise2D(x+10, z+20)) * 0.1 - 0.05
	)
	// return new THREE.Color().setHSL(
	// 	0.32 + Math.sqrt(noise2D(x+23, z+13)) * 0.2 - 0.1, 0.5,
	// 	0.44 + Math.sqrt(noise2D(x+10, z+20)) * 0.1 - 0.05
	// )
}

const farClamp = x => Math.min(farw - 1, x)
const world2farCoord = (x, z) => [
	farClamp(mirror((x) * 0.06 + farw2, farw)),
	farClamp(mirror((z) * 0.06 + farh2, farh))
]
export const farCoord2world = (x, z, xi, zi) => [
	(x*(mod(xi,2)>=1?-1:1) - farw2)/0.06 + (farw/0.06)*Math.ceil(xi/2)*2,
	(z*(mod(zi,2)>=1?-1:1) - farh2)/0.06 + (farh/0.06)*Math.ceil(zi/2)*2
]
const farVal = (x, y) => far.data[(x + (y * farw)) * 4]
const farLerp = (x, y) => {
	const x1 = Math.floor(x), x2 = Math.ceil(x)
	const y1 = Math.floor(y), y2 = Math.ceil(y)
	if ((x1 === x2) && (y1 === y2)) return farVal(x1, y1);
	if (x1 === x2) return (farVal(x1, y1) * (y2 - y) + farVal(x1, y2) * (y - y1)) / (y2 - y1)
	if (y1 === y2) return (farVal(x1, y1) * (x2 - x) + farVal(x2, y1) * (x - x1)) / (x2 - x1)
	return (
		farVal(x1, y1) * (x2 - x) * (y2 - y) +
		farVal(x2, y1) * (x - x1) * (y2 - y) +
		farVal(x1, y2) * (x2 - x) * (y - y1) +
		farVal(x2, y2) * (x - x1) * (y - y1)
	) / ((x2 - x1) * (y2 - y1));
  }


const world2fari = (x, z) => {
	const farx = farClamp(Math.floor(mirror((x) * 0.06 + farw2, farw)))
	const fary = farClamp(Math.floor(mirror((z) * 0.06 + farh2, farh)))
	return (farx + (fary * farw)) * 4
}

export const heightAt = (x, z) => {
	const nearh = map.data[world2mapi(x, z) + 3] / 255
	// const farh = far.data[world2fari(x, z)] / 255
	const farh = farLerp(...world2farCoord(x, z)) / 255
	return nearh * 60 + farh * 700
}