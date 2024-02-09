// Post-processor in Faust: add a delay, and reverb and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);

rev_st = re.zita_rev1_stereo(0, 200, 6000, 12, 6, 44100);

delayz = fi.highpass(1, 1500) <: @(0.28 : ba.sec2samp), @(1 : ba.sec2samp);
mix(dry, rev1, rev2, del1, del2) = dry+rev1+del1+del2*0.3, dry+rev2+del2+del1*0.3;
process = _*preamp <: _*0.2, rev_st, delayz : mix : co.limiter_1176_R4_stereo;