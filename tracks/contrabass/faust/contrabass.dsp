import("stdfaust.lib");
freq = vslider("freq", 80, 30, 200, 0.001);
lp1 = vslider("lp1", 3300, 100, 10000, 0.0001);
lp2 = vslider("lp2", 580, 100, 1000, 0.0001);
noise1amt = vslider("noise1", 0, 0, 1, 0.0001);
texamp = vslider("texamp", 0, 0, 1, 0.0001);
texvar = vslider("texvar", 0, 0, 1, 0.0001);
//sweep = vslider("sweep", 0, 0, 1, 0.0001);

f2samp(f) = (f : ma.inv : ba.sec2samp) - 1;

// noise2amp = sweep : ba.peakholder(4 + 8 : ba.sec2samp) : en.are(4, 8);

saw = os.sawtooth(freq*2)+os.sawtooth(freq*3.97)*0.7+os.sawtooth(freq*4.03)*0.5;
base = no.noise;
noise1 = base * noise1amt * 0.5 : fi.lowpass(1, lp1) : fi.lowpass(2, lp2);
// noise2 = base * noise2amt * 0.1 : fi.lowpass(2, 5000) : fi.highpass(1, 5000) : _ * (no.lfnoise0(10) > 0.5);
// exc = noise1 + noise2 : fi.highpass(2, 80);

noise2 = saw * 0.05 * texamp : fi.lowpass(2, 6000) : fi.highpass(1, 1500) : _ * (no.lfnoise(10) > 0.5*texvar)
: fi.fb_fcomb(8192, 5000 + 200 * os.osc(0.07) : f2samp, 1, 0.3)
: fi.fb_fcomb(8192, 7000 + 1000 * os.osc(0.13) : f2samp, 1, 0.4)
: fi.fb_fcomb(8192, 13000 + 2000 * os.osc(0.23) : f2samp, 1, 0.6);

//: fi.fb_fcomb(8192, freq*10 + 50 * os.osc(0.19) : f2samp, 1, 0.88)
//: fi.fb_fcomb(8192, freq*10 + 50 * os.oscp(0.19, 1.3) : f2samp, 1, 0.88);
//: phaser;

exc = (noise1) + noise2 : fi.highpass(2, 80);

reso = loop(vibrato-alias) : loop(vibrato+alias) with {
	vibrato = freq * (1 + os.osc(4) * 0.008);
	alias = (3 / ma.SR) * freq * freq;
	loop(f) = + ~ (de.fdelay2(9000, f2samp(f)) * 0.8);
};

strin = exc : reso;
process = hgroup("strin", strin);