// Bell instrument in Faust using modal synthesis

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
freq = hslider("freq", 500, 50, 2000, 0.001);
lp1 = hslider("lp1", 400, 100, 10000, 0.0001);
mode0 = hslider("mode0", 0, 0, 1, 0.0001);
mode1 = hslider("mode1", 0, 0, 1, 0.0001);
mode2 = hslider("mode2", 0, 0, 1, 0.0001);
mode3 = hslider("mode3", 0, 0, 1, 0.0001);
mode4 = hslider("mode4", 0, 0, 1, 0.0001);

// Exciter: a filtered oscillator
f2 = 1500 + 1000 * os.osc(0.05);
exc = no.noise * 0.2 : fi.lowpass(1, lp1*3);

// Some LFOs to add movement to the modes
// (this creates interesting wailing sounds)
lf = os.osc(0.7) * 0.5 + 0.5;
lf2 = os.oscp(0.7, 3) * 0.5 + 0.5;
lf3 = os.oscp(0.9, 0);
lf4 = os.oscp(0.9, 3);

// Modal body (bonang panerus modal analysis)
barCore = exc <:
	(_ * mode0 : pm.modeFilter(freq*1.0, 39.92, 0.1) : _ * lf),
	(_ * mode0 : pm.modeFilter(freq*2.0*(1+0.01*lf3), 19.73, 0.12) : _ * lf2),
	(_ * mode1 : pm.modeFilter(freq*2.38*(1+0.03*lf4), 18.84, 0.05) : _ * lf),
	(_ * mode1 : pm.modeFilter(freq*3.01*(1+0.01*lf3), 15.4, 0.05) : _ * lf2),
	(_ * mode2 : pm.modeFilter(freq*3.66*(1+0.02*lf4), 5.34, 0.05) : _ * lf),
	(_ * mode2 : pm.modeFilter(freq*4.0*(1+0.01*lf3), 4.48, 0.1) : _ * lf2),
	(_ * mode3 : pm.modeFilter(freq*5.35*(1+0.04*lf3), 4.22, 0.02) : _ * lf),
	(_ * mode3 : pm.modeFilter(freq*5.96*(1+0.01*lf4), 4.39, 0.04) : _ * lf2),
	(_ * mode4 : pm.modeFilter(freq*8.16*(1+0.02*lf4), 4.6, 0.03) : _ * lf),
	(_ * mode4 : pm.modeFilter(freq*10.56*(1+0.01*lf3), 4.39, 0.03 : _ * lf))
:> _;

process = barCore;