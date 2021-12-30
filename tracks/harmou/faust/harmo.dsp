import("stdfaust.lib");
fb = hslider("fb", 0, 0, 2, 0.0001);
amp = hslider("amp", 0, 0, 1, 0.001);
sdelay1 = hslider("sdelay1", 1000, 1, 9000, 0.1);
sdelay2 = hslider("sdelay2", 1000, 1, 9000, 0.1);
locut = hslider("locut", 500, 50, 2050, 0.001);
hicut = hslider("hicut", 500, 50, 2050, 0.001);

// freq1 = hslider("freq1", 80, 60, 120, 0.001);
// freq2 = hslider("freq2", 300, 200, 1200, 0.001);
// hicut = freq1 * 1.2;
// del_len(f) = 1.011 / (f + ((0.1786*f*f)/(locut+hicut)) ) : ba.sec2samp : _ - 1; // maybe don't do this every sample
// delay(f) = de.fdelay2(9000, del_len(f) * (1 + 0.006 * os.osc(4)));

NL(x) = x / ( (x*x) + 1 );
exc = no.noise * 0.01 : fi.lowpass(2, 600);
body = _ <: de.fdelay2(9000, sdelay1), de.fdelay2(9000, sdelay2)
  :> fi.highpass(1, locut) : fi.lowpass(1, hicut)
  : NL * fb;
loop = + ~ body;

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);
post = _ <: rev_st : co.limiter_1176_R4_stereo;

process = exc : loop : *(amp) : post;