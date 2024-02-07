import { path, copy } from './deps.js';
import { build } from '../../Teasynth/teasynth.js';

const scaredCopy = async (src, dst, yes) => {
	if (yes) {
		console.log(`Copying ${src} to ${dst}`);
	} else {
		console.log('From: ' + src);
		console.log('To: ' + dst);
		const answer = prompt('Copy? (y/n)');
		if (answer !== 'y') Deno.exit();
	}
	await copy(src, dst, { overwrite: true });
};

const baseDir = path.join(path.fromFileUrl(import.meta.url), '..', '..');
const inDir = path.join(baseDir, 'music');
await scaredCopy(inDir, path.join(baseDir, 'web', 'versioned', 'generated', 'source'));
await build({ inDir, outDir: path.join(baseDir, 'web', 'versioned', 'generated', 'worklets') });
