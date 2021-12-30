import("stdfaust.lib");

comp = *(5) : co.limiter_1176_R4_mono : *(0.3);
rev_st = re.zita_rev1_stereo(0, 200, 6000, 6, 6, 44100);

process = comp <: _, _, rev_st :> _, _;