// Overtone singing vocal synth in Faust

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
f1 = hslider("f1", 228, 30, 400, 0.001);
f2amtbase = hslider("f2amt", 0, 0, 0.5, 0.0001);

// freqs, Qs and amps for "tenor a/e" formants
// http://www.csounds.com/manual/html/MiscFormants.html
fs1 = (650, 1080, 2650, 2900, 3250);
fs2 = (400, 1700, 2600, 3200, 3580);
qs1 = (8, 12, 22, 22, 23);
qs2 = (6, 21, 26, 27, 30);
as1 = (1, 0.5, 0.45, 0.4, 0.08);
as2 = (1, 0.12, 0.25, 0.12, 0.08);

// freqs, Qs and amps for tuned filters
tfs = (8, 16, 32, 64);
tqs = (4, 5, 8, 5);
tas = (0.3, 0.4, 0.25, 0.1);

// automation
atk1 = ba.time != 0 : en.are(12, 12);
atk2 = ba.time != 0 : en.are(2, 2);
press = 0.6;
f2 = f1*6 + f1*4*no.lfnoise(0.2);
f2amt = f2amtbase * (1 + no.lfnoise(1)*0.2);
ampatk = press : si.lag_ud(0.1, 0.01);
vowel = 0.25 + f2amt*0.5 + 0.25*no.lfnoise(0.6);
f1vib = f1 * (1 + atk1*0.01*os.osc(5+os.osc(0.5))) * (0.5 + 0.5*atk2);

// Exciter: filtered oscillators
saw = os.sawtooth(f1vib)*0.5;
noise = no.noise * (0.2 - 0.2*f2amt);
exc = (saw + noise) * 0.1;

// Body: formants, tuned filters, controlled harmonic singing bands
linterp(lst1, lst2, i) = ba.take(i+1, lst1), ba.take(i+1, lst2) : si.interpolate(vowel);
form(i) = fi.resonbp(linterp(fs1, fs2, i), linterp(qs1, qs2, i), linterp(as1, as2, i));
forms(amp) = par(i, 5, form(i)*amp);
ctrlforms(amt) = * (0.5*amt) : fi.lowpass(1, 15000) <:
	(fi.resonbp(f2, 1, 1) : fi.resonbp(f2, 1, 1)), 
	(fi.resonbp(f2*4, 2, 1) : fi.resonbp(f2*4, 2, 1))*0.4,
	fi.highpass(1, 1600);

tuner(i) = fi.resonlp(f1*ba.take(i+1, tfs), ba.take(i+1, tqs), 1)*ba.take(i+1, tas);
tuners(amp) = par(i, 4, tuner(i)*amp);
ctrlend(amp) = _ <: fi.resonbp(f2, 9, 1)*amp, fi.resonbp(f2*2, 6, 1)*amp,
	fi.highpass(1, 1600) :> _;

om = fi.lowpass(3, 15000*atk1*atk1 + 50);

body = _ 
<: forms(1 - f2amt*0.8), ctrlforms(f2amt) :> _ 
<: *(0.2), tuners(1 - f2amt*0.5) :> _ 
<: *(1 - f2amt*0.5), ctrlend(f2amt) :> om;

process = exc : body : *(ampatk);
