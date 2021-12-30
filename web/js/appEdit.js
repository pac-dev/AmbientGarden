import Stats from './lib/stats.module.js';
import { addMainListeners, initGfx, initWorld, startMainLoop, startStats } from './mainLoop.js';
import { editMode } from './editMode.js';
import { LiveTrackLoader } from './LiveTrack.js';
import { initUI } from './ui.js';

initWorld(new LiveTrackLoader());
startStats(Stats);
editMode.init();
initGfx();
addMainListeners();
initUI();
startMainLoop();