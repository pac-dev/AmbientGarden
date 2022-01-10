

export class PtBuf {
	constructor() {
		this.i = 0
	}
	createBufs(numPts) {
		this.posBuf = new Float32Array(numPts * 3)
		this.colBuf = new Float32Array(numPts * 3)
		this.minDistBuf = new Float32Array(numPts)
	}
	setPos(x, y, z) {
		this.posBuf[this.i * 3] = x
		this.posBuf[this.i * 3 + 1] = y
		this.posBuf[this.i * 3 + 2] = z
	}
	setCol(r, g, b) {
		this.colBuf[this.i * 3] = r
		this.colBuf[this.i * 3 + 1] = g
		this.colBuf[this.i * 3 + 2] = b
	}
	setMinDist(x) {
		this.minDistBuf[this.i] = x
	}
	advance() {
		this.i++
	}
}