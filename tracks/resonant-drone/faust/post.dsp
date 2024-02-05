import("stdfaust.lib");
preamp = vslider("preamp", 1, 0, 1, 0.0001);
lp1 = vslider("lp1", 15000, 100, 15000, 0.0001);

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 20, 44100);

process = _*preamp : fi.lowpass(1, lp1) <: rev_st;