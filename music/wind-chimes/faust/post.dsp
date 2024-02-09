// Post-processor in Faust: add delay, reverb and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);
lp1 = hslider("lp1", 400, 100, 10000, 0.0001);
hp1 = hslider("hp1", 500, 50, 10000, 0.0001);

rev_st = re.zita_rev1_stereo(0, 200, 6000, 5, 3, 44100);
filters = fi.lowpass(1, lp1)*preamp : fi.highpass(5, hp1);
loop1 = + ~ (@(1.283 : ba.sec2samp) * -0.6);
loop2 = + ~ (@(0.937 : ba.sec2samp) * -0.5);
delmix(dry, del1, del2) = dry*0.6+del1, dry*0.12+del2;
del = _ <: _, loop1, loop2 : delmix;
mixer(rev1, rev2, del1, del2) = del1*0.2+rev1, del2*0.2+rev2;

process = filters : del <: rev_st,_,_ : mixer : co.limiter_1176_R4_stereo;