import { addMainListeners, initGfx, initWorld, startMainLoop } from './mainLoop.js';
import { FrozenTrackLoader } from './FrozenTrack.js';
import { initUI } from './ui.js';

initWorld(new FrozenTrackLoader());
initGfx();
addMainListeners();
initUI();
startMainLoop();