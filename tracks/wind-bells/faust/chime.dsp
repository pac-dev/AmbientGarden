import("stdfaust.lib");
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = vslider("noise", 0, 0, 1, 0.0001);

exc = no.pink_noise * noiseAmt * 0.5;

body = exc <:

	// some hand picked resonant modes
	pm.modeFilter(freq*1.0, 1.2, 0.07),
	pm.modeFilter(freq*4.95, 1.2, 0.05),
	pm.modeFilter(freq*7.9, 1.2, 0.05),
	pm.modeFilter(freq*11.9, 1.2, 0.1),
	pm.modeFilter(freq*15.7, 1.2, 0.1),
	pm.modeFilter(freq*20, 1.2, 0.1)
:> _;

process = body;