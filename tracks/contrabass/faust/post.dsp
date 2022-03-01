import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);

process = _ <: rev_st : co.limiter_1176_R4_stereo;