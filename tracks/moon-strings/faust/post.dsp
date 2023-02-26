import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 15, 6, 44100);
body = _ <:
	fi.lowpass(1, 1500)*0.7,
	fi.resonbp(2000, 10, 0.1),
	fi.resonbp(3200, 10, 0.2),
	fi.resonbp(7700, 2, 0.3)
	:> _;

loop1 = + ~ (@(0.283 : ba.sec2samp) * -0.8 : fi.lowpass(1, 5000) : fi.highpass(2, 100));
loop2 = + ~ (@(0.937 : ba.sec2samp) * -0.7 : fi.lowpass(1, 5000) : fi.highpass(2, 100));
delmix(dry, del1, del2) = dry*0.006+del1, dry*0.012+del2;
del = _ <: _, loop1, loop2 : delmix;
mixer(rev1, rev2, del1, del2) = del1+rev1*0.8, del2+rev2*0.8;

process = _ <: (_ <: rev_st), (body : del) : mixer : co.limiter_1176_R4_stereo;