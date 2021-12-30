import { parse } from 'https://deno.land/std@0.118.0/flags/mod.ts';
import { existsSync } from 'https://deno.land/std/fs/mod.ts';
import { loadTrack, createRenderer } from '../../Teasynth/tools/renderlib.js';
import { beaconRecords } from '../web/js/beaconRecords.js';

const args = parse(Deno.args);
const inDur = args.intro ?? 12;
const loopDur = args.loop ?? 18;
const xfDur = args.xf ?? 2;
const tracksDir = './tracks/';
const webDir = './web/';

/** @param {import('../web/js/beaconRecords.js').BeaconRecord} beacon */
const renderBeacon = async beacon => {
	if (existsSync(webDir+beacon.introUrl) && existsSync(webDir+beacon.loopUrl)) {
		console.log('skipping existing: '+beacon.desc);
		return;
	}
	console.log('rendering: '+beacon.desc);
	const track = await loadTrack(tracksDir+beacon.trackName+'/main.js');
	track.setParams(beacon.trackParams);
	const r = createRenderer(track);
	const inPipe = await r.addOutput(webDir+beacon.introUrl);
	await r.render(inDur);
	r.fadeOut(inPipe, xfDur);
	const loopPipe = await r.addOutput(webDir+beacon.loopUrl);
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