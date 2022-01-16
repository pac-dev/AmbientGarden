import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 7, 44100);

process = _ <: rev_st;