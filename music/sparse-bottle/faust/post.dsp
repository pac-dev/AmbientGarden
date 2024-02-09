// Post-processor in Faust: add reverb, delay and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 10, 44100);
del(t) = + ~ @(t : ba.sec2samp) * 0.7;

process = _*preamp <: del(0.3), del(0.5) <: rev_st : co.limiter_1176_R4_stereo;