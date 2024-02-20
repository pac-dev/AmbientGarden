// Post-processor in Faust: add a phaser, delay, and reverb

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);
slowness = hslider("slowness", 1, 0, 1, 0.0001);

phaser = pf.phaser2_mono(4, 0, 1000, 400, 1.5, 1500, 0.7, 1.5, 0.6, 1);
dry = _*(0.2 - slowness*0.2);
del(t) = + ~ @(t : ba.sec2samp) * 0.8 * slowness;

rev_st = re.zita_rev1_stereo(0, 200, 6000, 10, 7, 44100);

process = phaser*preamp <: dry, dry, rev_st :> del(1.13), del(1.7);