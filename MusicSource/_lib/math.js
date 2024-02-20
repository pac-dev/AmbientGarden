
/**
 * Returns a PRNG function roughly similar to Math.random.
 * Based on "Mulberry32" by Tommy Ettinger. 
 */
export const randomSeed = (seed=0) => () => {
	seed = seed + 1831565813|0;
	let t = Math.imul(seed^seed>>>15, 1|seed);
	t = t+Math.imul(t^t>>>7, 61|t)^t;
	return ((t^t>>>14)>>>0)/2**32;
};

/**
 * Returns a random number in [0,1] biased towards tgt (also in [0,1]).
 * 
 * Bias=0: No effect on random distribution.
 * Bias=inf: Theoretically only tgt comes out.
 */
export const biasedRandom = (tgt, bias, f=Math.random) => {
	const x = f();
	const r = Math.pow(x, bias);
	return (x*100%1)*r + tgt*(1-r);
};

/**
 * Returns a rhythm array, emphasizing beats repeating along the given cycle
 * lengths.
 */
export const rhythmArray = ({len=16, minOut=0, maxOut=1, cycles=[2,4,8,16,32,64,128]}) => {
	const nCycles = cycles.findIndex(x => x >= len);
	const incTgt = (maxOut - minOut)/(nCycles !== -1 ? nCycles : cycles.length);
	const ret = new Array(len).fill(minOut);
	for (const c of cycles) {
		if (c >= len) break;
		for (let pos=0; pos<len; pos+=c) ret[pos] += incTgt;
	}
	return ret;
};

export const randomizeArray = (a, bias, f=Math.random) => a.map(x => biasedRandom(x, bias, f));

const gold = (3 - Math.sqrt(5)) / 2;

/**
 * Returns a function giving evenly-spaced floats between 0 and 1, with an
 * optional starting value.
 */
export const goldSeed = (x=0) => () => {
	x = (x+gold) % 1;
	return x;
};

const toFraction = (x, tolerance, iterations) => {
	let num = 1,
		den = 1,
		i = 0;
	const iterate = () => {
		const R = num / den;
		if (Math.abs((R - x) / x) < tolerance) return;
		if (R < x) num++;
		else den++;
		if (++i < iterations) iterate();
	};
	iterate();
	if (i < iterations) return [num, den];
};

const fuzzyEq = (x, y) => Math.max(x, y) / Math.min(x, y) < 1.001;

// Helper for "mixFreqs" to find related fractions
const getMixer = locality => {
	const dissonance = (a, b) => Math.round(a / 2 + b + (locality * Math.max(a, b)) / Math.min(a, b));
	const base = [];
	for (let a = 1; a < 20; a++) {
		for (let b = 1; b < 10; b++) {
			const x = a / b;
			if (base.some(prev => fuzzyEq(prev[0], x))) {
				continue;
			}
			const diss = dissonance(a, b);
			base.push([x, diss]);
		}
	}
	const related = x => base.map(ele => [ele[0] * x, ele[1]]);
	const mix = (rel1, rel2) => {
		const ret = [];
		for (let ele1 of rel1) {
			const ele2 = rel2.find(e => fuzzyEq(e[0], ele1[0]));
			if (!ele2) continue;
			ret.push([ele1[0], ele1[1] * ele2[1]]);
		}
		ret.sort((a, b) => a[1] - b[1]);
		return ret;
	};
	return { related, mix };
};

/**
 * Get frequencies consonant with both input frequencies in just intonation.
 * @param locality - How much to clump around the inputs
 */
export const mixFreqs = (freq1, freq2, locality) => {
	[freq1, freq2] = [Math.min(freq1, freq2), Math.max(freq1, freq2)];
	const mixer = getMixer(locality);
	const frac = toFraction(freq2/freq1, 0.001, 50);
	// console.log('Mixer relative fraction: ', frac);
	const rel1 = mixer.related(1);
	const rel2 = mixer.related(frac[0] / frac[1]);
	const mixed = mixer.mix(rel1, rel2);
	return mixed.map(ele => ele[0]*freq1);
};
