import { addMainListeners, initGfx, initWorld, startMainLoop } from './mainLoop.js';
import { FrozenTrackLoader } from './frozenTrack.js';
import { initUI } from './ui.js';

initWorld({
	trackLoader: new FrozenTrackLoader(),
	nearMap: window.agStaticPath+'img/nearmap.png',
	farMap: window.agStaticPath+'img/farmap.png',
});
initGfx();
addMainListeners();
initUI();
startMainLoop();
