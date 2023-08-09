import Stats from './lib/stats.module.js';
import { GPUStatsPanel } from './lib/GPUStatsPanel.js';
import { addMainListeners, initGfx, initWorld, startMainLoop, startStats } from './mainLoop.js';
import { editMode } from './editMode.js';
import { LiveTrackLoader } from './audio/liveTrack.js';
import { initUI } from './ui.js';
import { genNearMap } from './genNearMap.js';
import { genFarMap } from './genFarMap.js';

initWorld({
	trackLoader: new LiveTrackLoader(),
	nearMap: genNearMap,
	farMap: genFarMap,
});
startStats(Stats, GPUStatsPanel);
editMode.init();
initGfx();
addMainListeners();
initUI();
startMainLoop();
