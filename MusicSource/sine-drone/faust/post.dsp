// Post-processor in Faust: add reverb and compression

import("stdfaust.lib");
preamp = hslider("preamp", 1, 0, 1, 0.0001);

rev_st = re.zita_rev1_stereo(0, 600, 7000, 10, 10, 44100);

process = _*preamp <: _*0.1, _*0.1, rev_st :> _, _ : co.limiter_1176_R4_stereo;