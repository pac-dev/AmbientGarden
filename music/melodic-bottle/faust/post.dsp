// Post-processor in Faust: add some delay, reverb and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);
bounce = hslider("bounce", 0, 0, 1, 0.0001);

no_bounce = 1 - 0.8*bounce;
del_st = (+ : @(1.1 : ba.sec2samp) * 0.4*bounce) ~ _, (+ : @(1.8 : ba.sec2samp) * 0.4*bounce) ~ _;
del_mix = _ <: _*no_bounce, _*no_bounce, del_st :> _,_;
rev_st = re.zita_rev1_stereo(0, 200, 6000, 7, 7, 44100);

process = _*preamp : fi.highpass(1, 400) : del_mix <: _*0.5, _*0.5, rev_st :> _, _ : co.limiter_1176_R4_stereo;