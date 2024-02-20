import { serveDir, path } from './deps.js';

console.log('To generate assets, navigate to http://localhost:8000/Tools/gen-assets.html')
console.log('Once assets are generated, visit the landscape at: http://localhost:8000/Web')

const baseDir = path.dirname(path.dirname(path.fromFileUrl(import.meta.url)));

Deno.serve((req) => {
	return serveDir(req, {
		fsRoot: baseDir,
		urlRoot: '',
	});
});