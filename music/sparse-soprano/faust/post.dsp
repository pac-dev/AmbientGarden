// Post-processor in Faust: add a phaser, delay, and reverb

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);

phaser = pf.phaser2_mono(4, 0, 1000, 400, 1.5, 1500, 0.7, 1.5, 0.6, 1);
rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 7, 44100);
del = + ~ @(1.13 : ba.sec2samp) * 0.8;

process = phaser*preamp : del <: rev_st;