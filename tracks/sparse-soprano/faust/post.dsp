import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 7, 44100);
del = + ~ @(1.13 : ba.sec2samp) * 0.8;

process = _ : del <: rev_st;