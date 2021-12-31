import Stats from './lib/stats.module.js';
import { addMainListeners, initGfx, initWorld, startMainLoop, startStats } from './mainLoop.js';
import { editMode } from './editMode.js';
import { LiveTrackLoader } from './LiveTrack.js';
import { initUI } from './ui.js';
import { genNearMap } from './GenNearMap.js';
import { genFarMap } from './GenFarMap.js';

initWorld({
	trackLoader: new LiveTrackLoader(),
	nearMap: genNearMap,
	farMap: genFarMap
});
startStats(Stats);
editMode.init();
initGfx();
addMainListeners();
initUI();
startMainLoop();