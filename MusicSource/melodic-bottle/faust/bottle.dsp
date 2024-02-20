// Bottle instrument in Faust using modal synthesis

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = hslider("noise", 0, 0, 5, 0.0001);
tremAmt = hslider("trem", 0, 0, 1, 0.0001);
bounce = hslider("bounce", 0, 0, 1, 0.0001);
lp1 = hslider("lp1", 6000, 100, 10000, 0.0001);
resMul = hslider("resmul", 1, 0, 1, 0.0001);
modes = hslider("modes", 4, 0, 4, 0.0001);

amp = (1+bounce*2+trem*2)*0.02;

// Exciter: a filtered oscillator with tremolo
exc = no.noise * noiseAmt * amp : fi.lowpass(1, lp1) : fi.lowpass(2, 4000);
tremFreq = (4+noiseAmt*4)*(1+bounce*2) : an.amp_follower_ar(1, 0.1);
tremPos = 1 - tremAmt*(0.5+0.5*os.osc(tremFreq));
trem = _ : fi.lowpass(2, 100+(7000 - 3000*tremAmt)*tremPos*tremPos);

// Modal body
barCore = _ <:
	pm.modeFilter(freq, 2*resMul, 0.16*(modes > 3)),
	pm.modeFilter(freq*1.47*2, 0.8*resMul, 0.11*(modes > 2)),
	pm.modeFilter(freq*2.09*2, 0.3*resMul, 0.1*(modes > 1)),
	pm.modeFilter(freq*2.56*3, 0.1*resMul, 0.07),
	
	pm.modeFilter(2*freq*2.09*2, 0.3*resMul, 0.02*(modes > 1)),
	pm.modeFilter(2*freq*2.56*3, 0.1*resMul, 0.01),
	
	pm.modeFilter(4*freq*2.09*2, 0.3*resMul, 0.05*(modes > 1)),
	pm.modeFilter(4*freq*2.56*3, 0.1*resMul, 0.03)
:> _;

process = exc : trem : barCore;