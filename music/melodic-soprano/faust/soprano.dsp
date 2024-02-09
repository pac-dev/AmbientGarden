// Soprano vocal synth in Faust

import("stdfaust.lib");

// Use "sliders" to add parameters to control the instrument
f1 = hslider("f1", 200, 30, 1000, 0.001);
noiseAmt = hslider("noise", 0, 0, 1, 0.0001);
sawAmt = hslider("saw", 0, 0, 1, 0.0001);
highness = hslider("highness", 0, 0, 1, 0.0001);

// freqs, Qs and amps for soprano formants
// http://www.csounds.com/manual/html/MiscFormants.html
sop_a_freq = (800, 1150, 2900, 3900, 4950);
sop_e_freq = (350, 2000, 2800, 3600, 4950);
sop_i_freq = (270, 2140, 2950, 3900, 4950);
sop_o_freq = (450, 800, 2830, 3800, 4950);
sop_u_freq = (325, 700, 2700, 3800, 4950);
sop_a_amp = (0.75, 0.501, 0.1, 0.1, 0.02);
sop_e_amp = (1, 0.1, 0.178, 0.01, 0.002);
sop_i_amp = (1, 0.251, 0.05, 0.05, 0.006);
sop_o_amp = (0.75, 0.282, 0.1, 0.1, 0.02);
sop_u_amp = (1, 0.158, 0.018, 0.01, 0.001);
sop_a_q = (10, 13, 24, 30, 35);
sop_e_q = (6, 20, 23, 24, 25);
sop_i_q = (5, 24, 30, 33, 41);
sop_o_q = (11, 10, 28, 32, 41);
sop_u_q = (7, 12, 16, 21, 25);

// Exciter: filtered oscillators
saw = os.sawtooth(f1) * sawAmt * 0.4 : fi.lowpass(1, f1*2) : fi.lowpass(1, 500+f1);
noise = no.noise * 0.01 * noiseAmt
	: fi.ffbcombfilter(1/50 : ba.sec2samp, 1/f1 : ba.sec2samp, 0.9)
	: fi.lowpass(2, (600 + f1*1.5)*(0.2+0.8*highness));
exc = saw*0.8 + noise;

// Body: formant bank
vowel = os.osc(0.3)*0.12+0.18;//0.3;//os.osc(4)*0.7+0.71;
linterp(lst1, lst2, i) = ba.take(i+1, lst1), ba.take(i+1, lst2) : si.interpolate(vowel);
form(i) = fi.resonbp(f, q, a) with {
	f = linterp(sop_a_freq, sop_o_freq, i);
	q = linterp(sop_a_q, sop_o_q, i);
	a = linterp(sop_a_amp, sop_o_amp, i);
};
hform = fi.resonbp(5500, 10, 0.2);
anti = fi.notchw(300, 2000) : fi.notchw(600, 3500);
forms = _ <: par(i, 5, form(i)), hform :> _;
syn = exc : forms;

// Per-voice post-processing with compression
timbre = fi.highpass(1, 3000) : fi.high_shelf(8, 1500+1000*highness) : fi.notchw(150, 720);
limiter = *(10) : co.limiter_1176_R4_mono;
post = timbre : limiter;

process = syn : post;
