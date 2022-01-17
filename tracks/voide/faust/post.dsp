import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 7, 44100);

process = _ <: _*0.2, _*0.2, rev_st :> _, _ : co.limiter_1176_R4_stereo;