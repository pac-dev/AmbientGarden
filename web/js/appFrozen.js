import { addMainListeners, initGfx, initWorld, startMainLoop } from './mainLoop.js';
import { FrozenTrackLoader } from './frozenTrack.js';
import { initUI } from './ui.js';

initWorld({
	trackLoader: new FrozenTrackLoader(),
	nearMap: 'img/nearmap.png',
	farMap: 'img/farmap.png'
});
initGfx();
addMainListeners();
initUI();
startMainLoop();