import("stdfaust.lib");
lp1 = hslider("lp1", 100, 50, 800, 0.001);
f1 = hslider("f1", 100, 50, 200, 0.0001);
f2 = hslider("f2", 123, 50, 200, 0.0001);
f3 = hslider("f3", 87, 50, 200, 0.0001);
pulseAmt = hslider("pulse", 0, 0, 1, 0.0001);
noiseAmt = hslider("noise", 0, 0, 1, 0.0001);

freq2len(f) = 1.0 / f : ba.sec2samp;

noise = no.noise * 0.3 * noiseAmt : fi.lowpass(2, lp1);
pulse = os.sawtooth(f1) * 4 * pulseAmt : fi.lowpass(1, 500);
srcs = noise + pulse;
exc = srcs : fi.highpass(1, 300) : fi.bandstop(1, 2500, 9000) : fi.lowpass(2, 11000);
loop(f) = + ~ (de.fdelay2(9000, freq2len(f)) : _*0.8);
res = loop(f1 - 1 + 2*no.lfnoise0(1)) : loop(f2) : loop(f3);
comp = *(5) : co.limiter_1176_R4_mono : *(0.5);

process = exc : res : comp;