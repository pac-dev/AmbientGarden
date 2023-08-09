import { exists, parse, path } from './deps.js';
import { loadTrack, createRenderer } from '../../Teasynth/teasynth.js';
import { beaconRecords } from '../web/ag_static/js/beacons/beaconRecords.js';

const baseDir = path.join(path.fromFileUrl(import.meta.url), '..', '..');
const tracksDir = path.join(baseDir, 'tracks');
const webDir = path.join(baseDir, 'web');

const args = parse(Deno.args);

/** @param {import('../web/ag_static/js/beacons/beaconRecords.js').BeaconRecord} beacon */
const renderBeacon = async beacon => {
	const introPath = path.join(webDir, beacon.introUrl);
	const loopPath = path.join(webDir, beacon.loopUrl);
	if (await exists(introPath) && await exists(loopPath)) {
		console.log('skipping existing: ' + beacon.desc);
		return;
	}
	console.log('rendering: ' + beacon.desc);
	let inDur = args.intro ?? 12;
	let loopDur = args.loop ?? 18;
	const xfDur = args.xf ?? 2;
	const track = await loadTrack(path.join(tracksDir, beacon.trackName, 'main.js'));
	track.setParams(beacon.trackParams);
	const r = createRenderer(track);
	const inPipe = await r.addOutput(introPath);
	if (track.host.willInterupt) {
		delete track.host.willInterupt;
		inDur = 666;
		loopDur = 666;
	}
	await r.render(inDur);
	r.fadeOut(inPipe, xfDur);
	const loopPipe = await r.addOutput(loopPath);
	r.fadeIn(loopPipe, xfDur);
	await r.render(xfDur);
	await r.removeOutput(inPipe);
	await r.render(loopDur);
	r.fadeOut(loopPipe, xfDur);
	await r.render(xfDur);
	await r.removeOutput(loopPipe);
};

for (let b of beaconRecords) {
	await renderBeacon(b);
}
