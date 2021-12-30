import("stdfaust.lib");
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = vslider("noise", 0, 0, 1, 0.0001);
lp1 = vslider("lp1", 400, 100, 10000, 0.0001);

exc = no.noise * noiseAmt * 0.07 : fi.lowpass(1, lp1) : fi.lowpass(2, 3000);

//barCore = exc : pm.modeFilter(freq, 2, 0.2) : pm.modeFilter(freq*3.984, 0.8, 0.1);

barCore = exc <:
    pm.modeFilter(freq, 2, 0.1),
    pm.modeFilter(freq*3.984, 0.8, 0.2),
    pm.modeFilter(freq*10.668, 0.3, 0.06)
:> _;

process = barCore;