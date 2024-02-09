// Post-processor in Faust: resonant body, reverb and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 4, 0.0001);

barBod = _ <: _*0.2, fi.allpass_comb(1024, 877, -0.96) :> _;

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);

bandComp = _*2 : co.limiter_1176_R4_mono : _*0.4;
comp = _ : fi.filterbank(3,(600)) : _, bandComp : +;

process = _*2*preamp : comp <: _*0.5, _*0.5, rev_st :> _, _;