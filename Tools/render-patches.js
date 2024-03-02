import { exists, parse, path, MultiRenderer } from './deps.js';
import { beaconRecords } from '../Web/versioned/js/beacons/beaconRecords.js';

const baseDir = path.join(path.fromFileUrl(import.meta.url), '..', '..');
const patchesDir = path.join(baseDir, 'MusicSource');
const webDir = path.join(baseDir, 'Web');

const args = parse(Deno.args);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const xf = x => -1 * Math.pow(-0.5 * Math.cos((clamp01(x) + 1)*Math.PI) + 0.5, 1.772) + 1;
const errorDetail = `
Patches should call "graph.setSplicePoint" when reaching desired splice-points.`;

/** @param {import('../Web/versioned/js/beacons/beaconRecords.js').BeaconRecord} beacon */
const renderBeacon = async beacon => {
	const introPath = path.join(webDir, beacon.introUrl);
	const loopPath = path.join(webDir, beacon.loopUrl);
	if (await exists(introPath) && await exists(loopPath)) {
		console.log('skipping existing: ' + beacon.desc);
		return;
	}
	console.log('rendering: ' + beacon.desc);
	Deno.mkdirSync(path.dirname(introPath), {recursive: true});
	const xfDur = args.xf ?? 2;
	const r = new MultiRenderer();
	const patch = r.addPatch(path.join(patchesDir, beacon.patchName, 'main.js'), beacon.patchParams);
	const introFile = await r.addOutput(introPath);
	await r.render(66, { stopAtSplicePoint: true });
	const introEnd = r.position;
	if (introEnd > 60) throw new Error('Did not get any interrupt after 60s of intro.'+errorDetail);
	const loopFile = await r.addOutput(loopPath);
 	introFile.mixFn = (x, t) => x*xf(1 - (t - introEnd)/xfDur);
	loopFile.mixFn = (x, t) => x*xf((t - introEnd)/xfDur);
	await r.render(xfDur);
	await r.removeOutput(introFile);
	await r.render(126, { stopAtSplicePoint: true });
	const loopEnd = r.position;
	if (loopEnd > 120) throw new Error('Did not get any interrupt after 120s of loop.'+errorDetail);
	loopFile.mixFn = (x, t) => x*clamp01(1 - (t - loopEnd)/xfDur);
	await r.render(xfDur);
	await r.removeOutput(loopFile);
	r.removePatch(patch);
	await r.finalize();
};

for (let b of beaconRecords) {
	await renderBeacon(b);
}
