import { addMainListeners, initGfx, initWorld, startMainLoop } from './mainLoop.js';
import { FrozenPatchLoader } from './audio/frozenPatch.js';
import { initUI } from './ui.js';

initWorld({
	patchLoader: new FrozenPatchLoader(),
	nearMap: window.agVersionedPath+'img/nearmap.png',
	farMap: window.agVersionedPath+'img/farmap.png',
});
initGfx();
addMainListeners();
initUI();
startMainLoop();
