import("stdfaust.lib");
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = vslider("noise", 0, 0, 1, 0.0001);
lp1 = vslider("lp1", 400, 100, 10000, 0.0001);

exc = no.noise * noiseAmt;

harm(f) = fi.bandpass(1, f * 0.8, f * 1.3) : fi.peak_eq_rm(60, f, 0.0002);

//fiCore = exc * 0.04 <: harm(freq), fi.peak_eq_rm(60, freq * 2, 0.0002)*0.3 :> _;
fiCore = exc * 0.04 <: harm(freq), harm(freq * 2) * 0.7, fi.peak_eq_rm(60, freq * 8, 0.0002) * 0.1 :> _;


process = fiCore;