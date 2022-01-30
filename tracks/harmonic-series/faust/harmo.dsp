import("stdfaust.lib");
fb = hslider("fb", 0, 0, 2, 0.0001);
amp = hslider("amp", 0, 0, 1, 0.001);
sdelay1 = hslider("sdelay1", 1000, 1, 9000, 0.1);
sdelay2 = hslider("sdelay2", 1000, 1, 9000, 0.1);
locut = hslider("locut", 500, 50, 2050, 0.001);
hicut = hslider("hicut", 500, 50, 2050, 0.001);

NL(x) = x / ( (x*x) + 1 );
exc = no.noise * 0.01 : fi.lowpass(2, 600);
body = _ <: de.fdelay2(9000, sdelay1), de.fdelay2(9000, sdelay2)
	:> fi.highpass(1, locut) : fi.lowpass(1, hicut)
	: NL * fb;
loop = + ~ body;

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);
post = _ <: rev_st : co.limiter_1176_R4_stereo;

process = exc : loop : *(amp) : post;