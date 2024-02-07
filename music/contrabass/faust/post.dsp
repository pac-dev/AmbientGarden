import("stdfaust.lib");
preamp = vslider("preamp", 1, 0, 1, 0.0001);

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);

process = _*preamp <: rev_st : co.limiter_1176_R4_stereo;