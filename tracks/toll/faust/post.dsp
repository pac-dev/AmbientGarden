import("stdfaust.lib");

rev_st = re.zita_rev1_stereo(0, 200, 6000, 15, 15, 44100);
mixer(dry, rev1, rev2) = dry*0.2+rev1, dry*0.2+rev2;

process = _ <: _,rev_st :> mixer : co.limiter_1176_R4_stereo;