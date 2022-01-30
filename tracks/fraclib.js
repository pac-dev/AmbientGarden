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

export const mixFreqs = (freq1, freq2, locality) => {
	const mixer = getMixer(locality);
	const fr1 = toFraction(freq1 / 100, 0.03, 50);
	const fr2 = toFraction(freq2 / 100, 0.03, 50);
	console.log('Converted freqs to fractions: ', fr1, fr2);
	const rel1 = mixer.related((100 * fr1[0]) / fr1[1]);
	const rel2 = mixer.related((100 * fr2[0]) / fr2[1]);
	const mixed = mixer.mix(rel1, rel2);
	return mixed.map(ele => ele[0]);
};
