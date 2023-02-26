import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 10, 44100);
del = + ~ @(0.4 : ba.sec2samp) * 0.7;

process = _ : del <: rev_st : co.limiter_1176_R4_stereo;