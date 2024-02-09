// Plucked string instrument in Faust based on Karplus–Strong synthesis

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
freq = hslider("freq", 500, 50, 2000, 0.001);
noiseAmt = hslider("noise", 0, 0, 1, 0.0001);
lp1 = hslider("lp1", 400, 100, 15000, 0.0001);
fb = hslider("fb", 0, 0, 1, 0.00001);

// Convert frequency to delay line length in samples
f2samp(f) = (f : ma.inv : ba.sec2samp) - 1;

// Exciter: a filtered oscillator
exc = no.noise * noiseAmt * 0.6 : fi.lowpass(1, lp1);

// Delay line in both directions
loop1 = + ~ (de.fdelay2(9000, f2samp(freq/1.004)) * -fb);
loop2 = + ~ (de.fdelay2(9000, f2samp(freq*1.004)) * fb);

process = exc <: (loop1 : @(0.02 : ba.sec2samp)), loop2*0.7 :> _;