import * as THREE from './lib/three.module.js'
import { PlanarSet, Polygon, Box, Point, BooleanOperations, Segment, Circle } from './lib/flatten.js'
import { mkPerlin2D, mulberry32 } from './noise.js'

const mapsz = 512
const intersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
	const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
	let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
	return [x1 + ua * (x2 - x1), y1 + ua * (y2 - y1)]
}
/**
 * Find the vertical arc extending the input vertical arc (c1x, c1y, c1r, phi)
 * to the target point (tgtx, tgty). Returns cx, cy, radius.
 */
const findVArc = (c1x, c1y, c1r, phi, tgtx, tgty) => {
	const bx = c1x + Math.cos(phi)*c1r, by = c1y - Math.sin(phi)*c1r
	const bcx = (bx + tgtx)/2, bcy = (by + tgty)/2
	const px = bcx + (bcy - tgty), py = bcy + (tgtx - bcx)
	const [c2x, c2y] = intersect(c1x, c1y, bx, by, bcx, bcy, px, py)
	const r2x = c2x - bx, r2y = c2y - by
	const c2r = Math.sqrt(r2x*r2x + r2y*r2y)
	return [c2x, c2y, c2r]
}
const [c1x, c1y, c1r] = [mapsz/6, mapsz, mapsz/3]
const phi = 0.6
const y12 = Math.sin(phi)*c1r
const [c2x, c2y, c2r] = findVArc(c1x, c1y, c1r, phi, mapsz/2, mapsz/2)
const [c3x, c3y, c3r] = [mapsz - c2x, mapsz - c2y, c2r]
const [c4x, c4y, c4r] = [mapsz - c1x, 0, c1r]
// {c1x, c1y, c1r, c2x, c2y, c2r, c3x, c3y, c3r, c4x, c4y, c4r, y12}
export const terrainGlsl = /*glsl*/`
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
}`
const pos2c = (x, y) => {
	if (y < y12)
		return [c4x, c4y, c4r]
	if (y - x < 0)
		return [c3x, c3y, c3r]
	if (y < mapsz - y12)
		return [c2x, c2y, c2r]
	return [c1x, c1y, c1r]
}
const y2roadx = y => {
	const [cx, cy, cr] = pos2c(mapsz/2, y)
	// sqrt((x-cx)^2 + (y-cy)^2) = cr
	if (cx > mapsz/2)
		return + cx - Math.sqrt(cr*cr - (y-cy)*(y-cy))
	else
		return Math.sqrt(cr*cr - (y-cy)*(y-cy)) + cx
}
export const mapPos2roadDist = (x, y) => {
	if ((x < mapsz/4) || (x > 3*mapsz/4))
		return 1
	const [cx, cy, cr] = pos2c(x, y)
	const dif = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) - cr
	return Math.min(1, Math.abs(dif) * 0.03)
}


export const genMap = async show => {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('width', mapsz)
	svg.setAttribute('height', mapsz)
	// well 1D would work
	const perlin = mkPerlin2D(3)
	const rand = mulberry32(0)
	const freq = 2
	const xnoise = pt => {
		const px = pt.x / mapsz, py = pt.y / mapsz
		let noiz = perlin(freq * px, freq * py)
		noiz *= 1 - Math.cos(py*Math.PI*2)
		return new Point(pt.x + noiz * mapsz * 0.2, pt.y)
	}
	const roadPts = [new Point(mapsz / 2, -10)]
	for (let i=1; i<100; i++) {
		const y = mapsz * i / 100
		roadPts.push(new Point(y2roadx(y), y)) // xnoise(
	}
	roadPts.push(
		new Point(mapsz / 2, mapsz + 10),
		new Point(-10, mapsz + 10),
		new Point(-10, -10)
	)

	const outBox = new Polygon(new Box(0, 0, mapsz, mapsz))
	const road = new Polygon(roadPts)
	const a = BooleanOperations.intersect(outBox, road)
	const b = BooleanOperations.subtract(outBox, road)
	const fields = new PlanarSet()
	const hsegs = new PlanarSet()
	const vsegs = new PlanarSet()
	fields.add(a)
	fields.add(b)
	const split = () => {
		const aShapes = [...fields].map(shape => [shape, shape.area()])
		aShapes.sort((a, b) => b[1] - a[1])
		/** @type {Polygon} */
		const hit = aShapes[0][0]
		const boxw = hit.box.xmax - hit.box.xmin, boxh = hit.box.ymax - hit.box.ymin
		const testSplit = () => {
			const pt = new Point(
				hit.box.xmin + (boxw) * (0.33 + 0.33 * rand()),
				hit.box.ymin + (boxh) * (0.33 + 0.33 * rand())
			)
			let testSeg, refSegs;
			if (boxw < boxh) {
				testSeg = new Segment(
					new Point(hit.box.xmin, pt.y),
					new Point(hit.box.xmax, pt.y)
				)
				refSegs = hsegs
			} else {
				testSeg = new Segment(
					new Point(pt.x, hit.box.ymin),
					new Point(pt.x, hit.box.ymax)
				)
				refSegs = vsegs
			}
			let minDist = 1000
			refSegs.forEach(ref => {
				const dist = testSeg.distanceTo(ref)[0]
				if (dist < minDist) minDist = dist
			})
			return [pt, minDist]
		}
		let [pt, maxDist] = testSplit()
		for (let i=0; i<6; i++) {
			let [newPt, newMaxDist] = testSplit()
			if (newMaxDist > maxDist) {
				pt = newPt
				maxDist = newMaxDist
			}
		}
		fields.delete(hit)
		let splitr
		if (boxw < boxh) {
			splitr = new Polygon(new Box(-10, -10, mapsz + 10, pt.y))
			hsegs.add(new Segment(
				new Point(hit.box.xmin, pt.y),
				new Point(hit.box.xmax, pt.y)
			))
		} else {
			splitr = new Polygon(new Box(-10, -10, pt.x, mapsz + 10))
			vsegs.add(new Segment(
				new Point(pt.x, hit.box.ymin),
				new Point(pt.x, hit.box.ymax)
			))
		}
		splitr = splitr.rotate(0.08 * (rand() - 0.5), pt)
		fields.add(BooleanOperations.intersect(hit, splitr)) // .transform(new Matrix().scale(1.02, 1.02))
		fields.add(BooleanOperations.subtract(hit, splitr))
	}
	for (let i=0; i<16; i++) split()
	const hills = []
	for (let i=0; i<8; i++) {
		hills.push({
			x: rand() * mapsz, 
			y: rand() * mapsz,
			rad: (0.15 + rand() * 0.15) * mapsz
		})
	}
	let svgIn = ''
	fields.forEach(field => {
		const col = new THREE.Color().setHSL(
			0.25 + 0.3 * (rand() - 0.5), 0.35,
			0.5 + 0.1 * (rand() - 0.5)
		).getStyle()
		svgIn += field.svg({stroke: col, fill: col})
	})
	// svgIn += road.svg({stroke: 'lightgray', strokeWidth: '3', fill: 'none'})
	// svgIn += new Circle(new Point(c1x, c1y), c1r).svg()
	// svgIn += new Circle(new Point(c2x, c2y), c2r).svg()
	// svgIn += new Circle(new Point(c3x, c3y), c3r).svg()
	// svgIn += new Circle(new Point(c4x, c4y), c4r).svg()
	svg.innerHTML = svgIn
	// + [...segs].reduce((acc, shape) => acc + shape.svg({stroke: 'red'}), "")
	const hillShape = (dist, rad) => Math.exp(-Math.pow(2*dist/rad,2.4))
	const addHills = pixels => {
		for (let x=0; x<mapsz; x++) {
			for (let y=0; y<mapsz; y++) {
				let height = 0.5
				for (let hill of hills) {
					const dx = x - hill.x
					const dy = y - hill.y
					const dist = Math.sqrt(dx*dx + dy*dy)
					height += hillShape(dist, hill.rad) * 0.3
				}
				pixels[(x+y*mapsz)*4+3] = height * 255
				// const kk = mapPos2roadDist(x, y)
				// pixels[(x+y*mapsz)*4+0] = kk * 255
				// pixels[(x+y*mapsz)*4+1] = kk * 255
				// pixels[(x+y*mapsz)*4+2] = kk * 255
			}
		}
	}

	const svgBlob = new Blob([
		`<svg xmlns="http://www.w3.org/2000/svg" width="${mapsz}" height="${mapsz}">
		${svgIn}
		</svg>`
	], {type: "image/svg+xml;charset=utf-8"})
	const url = URL.createObjectURL(svgBlob)
	const canvas = document.createElement('canvas')
	canvas.width = mapsz
	canvas.height = mapsz
	const ctx = canvas.getContext('2d')
	if (show) document.body.append(canvas)
	const img = new Image()
	img.src = url
	await img.decode()
	ctx.drawImage(img, 0, 0)
	const cnvData = ctx.getImageData(0, 0, mapsz, mapsz)
	addHills(cnvData.data)
	ctx.putImageData(cnvData, 0, 0)
	URL.revokeObjectURL(url)
	var canvasURI = canvas.toDataURL()
	if (show) document.body.insertAdjacentHTML('afterend',`<a download="neargen.png" href="${canvasURI}">ok</a>`)
	return canvas
}

// export const genMap = show => {
// 	const cnv = document.createElement('canvas')
// 	cnv.width = 1024
// 	cnv.height = 1024
// 	if (show) {
// 		document.body.append(cnv)
// 		cnv.style.border = '1px solid black'
// 	}
// 	const ctx = cnv.getContext('2d')
// 	ctx.fillStyle = 'rgb(200, 0, 0)'
// 	ctx.fillRect(10, 10, 50, 50)

// 	ctx.fillStyle = 'rgba(0, 0, 200, 0.5)'
// 	ctx.fillRect(30, 30, 50, 50)
// }