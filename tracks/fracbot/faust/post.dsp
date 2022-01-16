import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 6, 6, 44100);

process = _ <: _, _, rev_st :> _, _ : co.limiter_1176_R4_stereo;