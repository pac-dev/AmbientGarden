// Chime instrument in Faust using modal synthesis

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = hslider("noise", 0, 0, 1, 0.0001);

// Exciter: a filtered oscillator
exc = no.pink_noise * noiseAmt * 0.5;

// Modal body
body = exc <:
	pm.modeFilter(freq, 1.2, 0.1),
	pm.modeFilter(freq*2.778, 1.2, 0.1),
	pm.modeFilter(freq*5.18, 1.2, 0.1),
	pm.modeFilter(freq*8.163, 1.2, 0.1),
	pm.modeFilter(freq*11.66, 1.2, 0.1),
	pm.modeFilter(freq*15.638, 1.2, 0.1),
	pm.modeFilter(freq*20, 1.2, 0.1)
:> _;

process = body;