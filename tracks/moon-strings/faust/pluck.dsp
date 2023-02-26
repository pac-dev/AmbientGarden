import("stdfaust.lib");
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = vslider("noise", 0, 0, 1, 0.0001);
lp1 = vslider("lp1", 400, 100, 15000, 0.0001);
fb = vslider("fb", 0, 0, 1, 0.00001);

f2samp(f) = (f : ma.inv : ba.sec2samp) - 1;
exc = no.noise * noiseAmt * 0.6 : fi.lowpass(1, lp1);
//exc = no.pink_noise * noiseAmt * (1 + lp1*0.0001);
loop1 = + ~ (de.fdelay2(9000, f2samp(freq/1.004)) * -fb);
loop2 = + ~ (de.fdelay2(9000, f2samp(freq*1.004)) * fb);

process = exc <: (loop1 : @(0.02 : ba.sec2samp)), loop2*0.7 :> _;