// Post-processor in Faust: add a phaser, pitch shifter, reverb and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);
phaser = pf.phaser2_mono(4, 0, 1000, 400, 1.5, 1500, 0.7, 1.5, 0.6, 1);

raise(x) = x*0.8 + ef.transpose(0.5: ba.sec2samp, 0.2 : ba.sec2samp, 12, x)*0.3 :> _;

process = _*preamp : raise : fi.bandstop(1, 450, 1500) : phaser <: _*0.3, _*0.3, rev_st :> co.limiter_1176_R4_stereo;
