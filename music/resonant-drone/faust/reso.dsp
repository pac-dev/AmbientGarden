// "Resodrone" synthesizer in Faust

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
lp1 = hslider("lp1", 100, 50, 800, 0.001);
f1 = hslider("f1", 100, 30, 330, 0.0001);
f2 = hslider("f2", 123, 30, 330, 0.0001);
f3 = hslider("f3", 87, 30, 330, 0.0001);
pulseAmt = hslider("pulse", 0, 0, 1, 0.0001);
noiseAmt = hslider("noise", 0, 0, 1, 0.0001);

// Convert frequency to delay line length in samples
freq2len(f) = 1.0 / f : ba.sec2samp;

// Exciter: filtered oscillators
noise = no.noise * 0.3 * noiseAmt : fi.lowpass(2, lp1);
pulse = os.sawtooth(f1) * 4 * pulseAmt : fi.lowpass(1, 500);
no2 = no.sparse_noise(5) * 0.2 : fi.resonbp(15000+2000*os.osc(0.3), 5, 1);
srcs = noise + pulse + no2;
exc = srcs : fi.highpass(1, 300) : fi.bandstop(1, 2500, 9000) : fi.lowpass(2, 11000);

// Series of comb filters (feedback delay lines)
loop(f) = + ~ (de.fdelay2(9000, freq2len(f)) : _*0.8);
res = loop(f1 - 1 + 2*no.lfnoise0(1)) : loop(f2) : loop(f3);

// Extreme compressor
comp = *(5) : co.limiter_1176_R4_mono : *(0.35);

process = exc : res : comp;