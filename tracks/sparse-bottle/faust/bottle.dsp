import("stdfaust.lib");
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = vslider("noise", 0, 0, 1, 0.0001);
lp1 = vslider("lp1", 600, 100, 10000, 0.0001);

exc = no.noise * noiseAmt * 0.03 : fi.lowpass(1, lp1) : fi.lowpass(2, 4000);

//barCore = exc : pm.modeFilter(freq, 2, 0.2) : pm.modeFilter(freq*3.984, 0.8, 0.1);

barCore = exc <:
	pm.modeFilter(freq, 2*2, 0.16),
	pm.modeFilter(freq*1.47*2, 0.8*2, 0.11),
	pm.modeFilter(freq*2.09*2, 0.3*2, 0.1),
	pm.modeFilter(freq*2.56*3, 0.1*2, 0.07)
:> _;

process = barCore;