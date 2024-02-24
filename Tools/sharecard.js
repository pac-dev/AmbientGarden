/**
 * Generate opengraph image for ambient.garden. This is a slightly modified
 * version of the album cover generator.
 */

const prose = `┏━━━━━━━━━━━━━━━━  pac@baraka - Terminal ━━━━━━━━━━━ 🗕 🗗 🗙 ━┓
┃                                                           ┃
┃   Mastering tracks to "./Generated/stage3"...             ┃
┃   Overlapping tracks to "./Generated/stage4"...           ┃
┃   Encoding tracks to "./Generated/final"...               ┃
┃   Adding metadata: {                                      ┃
┃       "artist": "Pure Code",                              ┃
┃       "album": "A Walk Though the Ambient Garden",        ┃
┃       "date": "20240301"                                  ┃
┃   }                                                       ┃
┃   Done building album.                                    ┃
┃   pac@baraka:~$ ▌                                         ┃
┃                                                           ┃
┃                                                           ⯅
┃                                                           ┃
┃                                                           ⯆
┃                                                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

/**
 * Returns a PRNG function roughly similar to Math.random.
 * Source: Tommy Ettinger. 
 */
const randomSeed = (seed=0) => () => {
	seed = seed + 1831565813|0;
	let t = Math.imul(seed^seed>>>15, 1|seed);
	t = t+Math.imul(t^t>>>7, 61|t)^t;
	return ((t^t>>>14)>>>0)/2**32;
};

// Uncomment to test different seeds:
// const seed = Math.round(Math.random()*100)
// console.log(seed)
// const rand = randomSeed(seed);
const rand = randomSeed(19);

/**
 * Conversion between RGB and HSL colors with all values between 0 and 1.
 * Source: Kamil Kiełczewski.
 */
const hsl2rgb = (h,s,l) => {
	const a=s*Math.min(l,1-l);
	const f= (n,k=(n+h*12)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
	return [f(0),f(8),f(4)];
};
const rgb2hsl = (r,g,b) => {
	const v=Math.max(r,g,b), c=v-Math.min(r,g,b), f=(1-Math.abs(v+v-c-1)); 
	const h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
	return [(h<0?h+6:h)/6, f ? c/f : 0, (v+v-c)/2];
};
const offsetHsl = ([r,g,b],x,y,z) => {
	const ret = rgb2hsl(r,g,b);
	return hsl2rgb((ret[0]+x+90)%1,(ret[1]+y+90)%1,(ret[2]+z+90)%1);
};
const formatColor = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

export const pxWidth = 1200, pxHeight = 630;
const rowChars = 122, colChars = 42;
const charWidth = 10, charHeight = 16;
const winWidth = prose.indexOf('\n')-3;
const winHeight = prose.match(/\n/g).length+1;
const winX = Math.floor(rowChars*0.5 - winWidth*0.5) - 1;
const winY = Math.floor(colChars*0.5 - winHeight*0.5);
const winBg = [0.2, 0.2, 0.2];
const charToPixel = (x,y) => [(x)*(charWidth), (y)*(charHeight)];
const bgColors = Array(rowChars * colChars * 3);
const getBgColor = (x, y) => bgColors.slice(x*3+y*3*rowChars, x*3+y*3*rowChars+3);
const setBgColor = (x, y, col) => {
	bgColors[x*3+y*3*rowChars] = col[0];
	bgColors[x*3+y*3*rowChars+1] = col[1];
	bgColors[x*3+y*3*rowChars+2] = col[2];
};
const mixColors = (col1, col2, x) => [0,1,2].map(
	i => Math.round(col1[i]*(1 - x) + col2[i]*x)
);
const mixStops = (stop1, stop2, pos) => {
	if (stop1[0] === stop2[0]) return stop1[1];
	const mixPos = (pos - stop1[0]) / (stop2[0] - stop1[0]);
	return mixColors(stop1[1], stop2[1], mixPos);
};
const randomize = ([r,g,b], amt) => {
	const ret = offsetHsl([r/256,g/256,b/256], rand()*amt, rand()*amt, rand()*amt*0.5);
	return [Math.round(ret[0]*256), Math.round(ret[1]*256), Math.round(ret[2]*256)];
};
const sunRays = (x,y) => {
	y = y/colChars - 0.5;
	// if (y <= 0) return 1;
	x = 0.6*Math.abs(x/rowChars - 0.25)/y;
	const shadow = x => clamp(Math.abs(x - clamp(Math.round(x),0,4))*20-4, 0, 1);
	return 0.8+(1-y*2)*0.2+y*2*shadow(x)*0.2;
};
const calcBg = () => {
	for (let x=0; x<rowChars; x++) {
		const mountFn = (x,o) => 1-1*Math.sin((0.06*x+o)%Math.PI);
		const mount = -0.7*mountFn(x,3)*mountFn(x,3)-0.5*mountFn(x*3.3,2);
		const snow = mixColors([175,180,180], [137,124,134], clamp((mount+0.5)*10, 0, 1));
		const gradStops = [
			[0, [162,88,110]],
			[0.35+mount*0.08, [226,151,122]],
			[0.45+mount*0.15, snow],
			[0.47+mount*0.05, [137*0.9,124*0.9,134*0.9]],
			[0.50, [137*0.8,124*0.8,134*0.8]],
			[0.54, [93,112,83]],
			[1, [213,228,106]],
		];
		for (let y=0; y<colChars; y++) {
			const yprop = y/colChars;
			const stop1 = gradStops.findLast(s => s[0] <= yprop);
			const stop2 = gradStops.find(s => s[0] >= yprop);
			let col = mixStops(stop1, stop2, yprop);
			col = randomize(col, 0.1);
			setBgColor(x, y, mixColors([0,0,0], col, sunRays(x,y)));
		}
	}
	for (let y=0; y<colChars; y++) {
		const cloudAmt = Math.min(1, 1.7*Math.pow(1-Math.abs(y/colChars-0.4), 4));
		let runTgt = getBgColor(0, Math.round((rand()*0.25+0.2)*colChars));
		let run = runTgt, amt = rand()*cloudAmt;
		// console.log(cloudAmt)
		for (let x=0; x<rowChars; x++) {
			if (x % 7 === 0) runTgt = getBgColor(Math.round(rand()*x), y);
			const amtTgt = Math.pow((runTgt[0]%7)/7, 0.1)*cloudAmt;
			amt = amt + (amtTgt - amt)*0.3
			run = mixColors(run, runTgt, 0.3);
			let orig = getBgColor(x, y);
			orig = mixColors(orig, [0,1,2].map(i => 400*Math.pow(orig[i]/255, 8)%250), Math.pow(cloudAmt, 10)*0.7);
			setBgColor(x, y, mixColors(orig, randomize(run, 0.06), amt));
		}
	}
};
calcBg();
/** @param {import('https://deno.land/x/canvas@v1.4.1/mod.ts').CanvasRenderingContext2D} ctx */
export const drawCover = (ctx) => {
	ctx.fillStyle = '#444';
	ctx.fillRect(0, 0, pxWidth, pxHeight);
	ctx.font = `${charHeight}px Courier Prime Regular`;
	for (let x=0; x<rowChars; x++) {
		for (let y=0; y<colChars; y++) {
			let col = getBgColor(x, y);
			ctx.fillStyle = formatColor(mixColors(col, winBg, 0.8));
			// this gets drawn over... or does it?
			ctx.fillText('█', ...charToPixel(x, y));
			if (x>=winX && x<winX+winWidth && y>=winY && y<winY+winHeight) {
				// window bg
				col = mixColors(col, winBg, 0.8);
			} else if (x>=winX+6 && x<winX+6+winWidth && y>=winY+4 && y<winY+4+winHeight) {
				// window shadow
				col = mixColors(col, [0,0,0], 0.6);
			}
			ctx.fillStyle = formatColor(col);
			ctx.fillText('█', ...charToPixel(x, y));
		}
	}
	// window border, the fillText meme didn't work out so well here
	ctx.strokeStyle = '#557';
	const rect = [...charToPixel(winX, winY-1), ...charToPixel(winWidth, winHeight-1)];
	ctx.lineWidth = 18;
	ctx.strokeRect(rect[0]+9, rect[1]+7, rect[2]-12, rect[3]+4);
	ctx.lineWidth = 25;
	ctx.strokeRect(rect[0], rect[1]+11, rect[2]-5, 0);
	ctx.font = `${charHeight}px Courier Prime Regular`;
	ctx.fillStyle = '#bbb';
	let row = winX, col = winY;
	for (const char of prose) {
		if (char === '\n') {
			row = winX;
			col++;
			continue;
		}
		ctx.fillText(char, ...charToPixel(row, col));
		row++;
	}
};

// browser canvas helper for development
export const initBrowserCanvas = () => {
	const canvas = document.querySelector('canvas');
	const scale = window.devicePixelRatio;
	canvas.width = pxWidth;
	canvas.height = pxHeight;
	canvas.style.width = (canvas.width / scale) + 'px';
	canvas.style.height = (canvas.height / scale) + 'px';
	const ctx = canvas.getContext('2d');
	return ctx;
};