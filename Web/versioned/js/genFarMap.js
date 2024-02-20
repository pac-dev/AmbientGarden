import { mkPerlin2D } from './noise.js';
const dist = (x, y) => Math.sqrt(x * x + y * y);
export const genFarMap = async () => {
	const mapsz = 512;
	const perlin = mkPerlin2D(1);
	const perlin2 = mkPerlin2D(12);
	const addHills = pixels => {
		for (let x = 0; x < mapsz; x++) {
			for (let y = 0; y < mapsz; y++) {
				let height = (perlin(x * 0.017, y * 0.017) * 0.5 + 0.5) * 0.8;
				height += (perlin2(x * 0.061, y * 0.061) * 0.5 + 0.5) * 0.2;
				height *= Math.min(1, Math.pow(dist(x / mapsz - 0.5, y / mapsz - 0.5), 1.7) * 4);
				pixels[(x + y * mapsz) * 4 + 0] = height * 255;
				pixels[(x + y * mapsz) * 4 + 1] = height * 255;
				pixels[(x + y * mapsz) * 4 + 2] = height * 255;
				pixels[(x + y * mapsz) * 4 + 3] = 255;
			}
		}
	};
	const canvas = document.createElement('canvas');
	canvas.width = mapsz;
	canvas.height = mapsz;
	const ctx = canvas.getContext('2d');
	const cnvData = ctx.getImageData(0, 0, mapsz, mapsz);
	addHills(cnvData.data);
	ctx.putImageData(cnvData, 0, 0);
	return canvas;
};
