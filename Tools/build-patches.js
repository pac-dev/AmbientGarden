import { path, copy, build } from './deps.js';

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
const inDir = path.join(baseDir, 'MusicSource');
await scaredCopy(inDir, path.join(baseDir, 'Web', 'versioned', 'generated', 'source'));
await build({ inDir, outDir: path.join(baseDir, 'Web', 'versioned', 'generated', 'worklets') });
