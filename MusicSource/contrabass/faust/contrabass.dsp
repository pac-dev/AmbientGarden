// Ambient contrabass instrument in Faust

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
freq = hslider("freq", 80, 30, 200, 0.001);
lp1 = hslider("lp1", 3300, 100, 10000, 0.0001);
lp2 = hslider("lp2", 580, 100, 1000, 0.0001);
noise1amt = hslider("noise1", 0, 0, 1, 0.0001);
texamp = hslider("texamp", 0, 0, 1, 0.0001);
texvar = hslider("texvar", 0, 0, 1, 0.0001);

// Convert frequency to delay line length in samples
f2samp(f) = (f : ma.inv : ba.sec2samp) - 1;

// Exciter: a combination of filtered oscillators
saw = os.sawtooth(freq*2)+os.sawtooth(freq*3.97)*0.7+os.sawtooth(freq*4.03)*0.5;
noise1 = no.noise * noise1amt * 0.5 : fi.lowpass(1, lp1) : fi.lowpass(2, lp2);
noise2 = saw * 0.05 * texamp : fi.lowpass(2, 6000) : fi.highpass(1, 1500) : _ * (no.lfnoise(10) > 0.5*texvar)
: fi.fb_fcomb(8192, 5000 + 200 * os.osc(0.07) : f2samp, 1, 0.3)
: fi.fb_fcomb(8192, 7000 + 1000 * os.osc(0.13) : f2samp, 1, 0.4)
: fi.fb_fcomb(8192, 13000 + 2000 * os.osc(0.23) : f2samp, 1, 0.6);
exc = (noise1) + noise2 : fi.highpass(2, 80);

// Resonator with artifacts
reso = loop(vibrato-alias) : loop(vibrato+alias) with {
	vibrato = freq * (1 + os.osc(4) * 0.008);
	alias = (3 / ma.SR) * freq * freq;
	loop(f) = + ~ (de.fdelay2(9000, f2samp(f)) * 0.8);
};

process = exc : reso;