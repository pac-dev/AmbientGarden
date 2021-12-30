import("stdfaust.lib");
freq = vslider("freq", 80, 30, 200, 0.001);
lp1 = vslider("lp1", 3300, 100, 10000, 0.0001);
lp2 = vslider("lp2", 580, 100, 1000, 0.0001);
noise1amt = vslider("noise1", 0, 0, 1, 0.0001);
noise2amt = vslider("noise2", 0, 0, 1, 0.0001);

base = no.noise;

noise1 = base * noise1amt : fi.lowpass(1, lp1) : fi.lowpass(2, lp2);
noise2 = base * noise2amt * 0.15 : fi.lowpass(2, 5000) : fi.highpass(1, 5000) : _  * (no.lfnoise0(50) > 0.5);

exc = noise1 + noise2 : fi.highpass(2, 80);

reso = loop(moded-fDif) : loop(moded+fDif) with {
    moded = freq * (1 + os.osc(4) * 0.008);
    fDif = (3 / ma.SR) * freq * freq;
    f2samp(f) = (f : ma.inv : ba.sec2samp) - 1;
    loop(f) = + ~ (de.fdelay2(9000, f2samp(f)) * 0.8);
};

strin = exc : reso;
process = hgroup("strin", strin);