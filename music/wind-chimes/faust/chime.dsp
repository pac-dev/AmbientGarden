import("stdfaust.lib");
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = vslider("noise", 0, 0, 1, 0.0001);

exc = no.pink_noise * noiseAmt * 0.5;

// tibetan bowl (180mm): 1, 2.77828, 5.18099, 8.16289, 11.66063, 15.63801, 19.99
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