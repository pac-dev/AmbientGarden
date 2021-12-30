import { mkPerlin2D, mulberry32 } from './noise.js'
const dist = (x, y) => Math.sqrt(x*x+y*y)
export const genFar = async show => {
	const mapsz = 512
	const perlin = mkPerlin2D(1)
	const perlin2 = mkPerlin2D(12)
	const addHills = pixels => {
		for (let x=0; x<mapsz; x++) {
			for (let y=0; y<mapsz; y++) {
				let height = (perlin(x*0.017, y*0.017)*0.5+0.5)*0.8
				height += (perlin2(x*0.061, y*0.061)*0.5+0.5)*0.2
				height *= Math.min(1, Math.pow(dist(x/mapsz-0.5, y/mapsz-0.5), 1.7)*4)
				pixels[(x+y*mapsz)*4+0] = height * 255
				pixels[(x+y*mapsz)*4+1] = height * 255
				pixels[(x+y*mapsz)*4+2] = height * 255
				pixels[(x+y*mapsz)*4+3] = 255
			}
		}
	}
	const canvas = document.createElement('canvas')
	canvas.width = mapsz
	canvas.height = mapsz
	const ctx = canvas.getContext('2d')
	if (show) document.body.append(canvas)
	const cnvData = ctx.getImageData(0, 0, mapsz, mapsz)
	addHills(cnvData.data)
	ctx.putImageData(cnvData, 0, 0)
	var canvasURI = canvas.toDataURL()
	if (show) document.body.insertAdjacentHTML('afterend',`<a download="fargen.png" href="${canvasURI}">ok</a>`)
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