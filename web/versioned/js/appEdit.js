import Stats from './lib/stats.module.js';
import { GPUStatsPanel } from './lib/GPUStatsPanel.js';
import { addMainListeners, initGfx, initWorld, startMainLoop, startStats } from './mainLoop.js';
import { editMode } from './editMode.js';
import { LivePatchLoader } from './audio/livePatch.js';
import { initUI } from './ui.js';
import { genNearMap } from './genNearMap.js';
import { genFarMap } from './genFarMap.js';

initWorld({
	patchLoader: new LivePatchLoader(),
	nearMap: genNearMap,
	farMap: genFarMap,
});
startStats(Stats, GPUStatsPanel);
editMode.init();
initGfx();
addMainListeners();
initUI();
startMainLoop();
