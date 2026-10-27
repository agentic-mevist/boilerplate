#!/usr/bin/env python3
"""Soundtrack for the HandlePilot MCP promo (adapted from the show reel's), cut
to the same grid as the picture (128 BPM, 24 bars = 45.000 s). A synthesized
music bed + a sound-design layer of real recordings (assets/sfx) in which every
visual event (word rises, the highlighter, pops, clicks, the drop, the landing,
the heartbeat) has its own sound at the exact frame it happens.
"""
import sys
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
B = 60 / 128
BAR = 4 * B
DUR = 24 * BAR  # src/timeline.js CHAPTERS
N = int(round(SR * DUR))
PAD = SR * 3
rng = np.random.default_rng(2026)
OUT = Path(__file__).resolve().parent.parent / "out"


def hz(note):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
             "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, o=2):
    return signal.sosfilt(sos("low", f, o), x)


def hp(x, f, o=2):
    return signal.sosfilt(sos("high", f, o), x)


def bp(x, f1, f2, o=2):
    return signal.sosfilt(sos("band", [f1, f2], o), x)


def noise(n):
    return rng.standard_normal(n)


def sweep_phase(f):
    return 2 * np.pi * np.cumsum(f) / SR


def saw(freq, n, ph0=None):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = f / SR
    ph = ((rng.random() if ph0 is None else ph0) + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t1 = ph[m] / dt[m]
    y[m] -= t1 + t1 - t1 * t1 - 1
    m = ph > 1 - dt
    t2 = (ph[m] - 1) / dt[m]
    y[m] -= t2 * t2 + t2 + t2 + 1
    return y


def fade(x, a=0.002, r=0.01):
    n = len(x)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e = np.ones(n)
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return x * e


class Mix:
    def __init__(self):
        self.L = np.zeros(N + PAD)
        self.R = np.zeros(N + PAD)

    def add(self, x, t, g=1.0, pan=0.0):
        i = int(round(t * SR))
        if i < 0:
            x = x[..., -i:] if x.ndim == 2 else x[-i:]
            i = 0
        if x.ndim == 1:
            a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
            l, r = x * np.cos(a) * np.sqrt(2), x * np.sin(a) * np.sqrt(2)
        else:
            l, r = x[0], x[1]
        n = min(len(l), len(self.L) - i)
        if n <= 0:
            return
        self.L[i:i + n] += l[:n] * g
        self.R[i:i + n] += r[:n] * g


dry, verb, duck = Mix(), Mix(), Mix()  # duck = sidechained bus (bass, pads)

# ── instruments ─────────────────────────────────────────────────────────────


def kick(hi=160, lo=52, decay=0.24, click=0.26, d=0.5):
    t = tt(d)
    f = lo + (hi - lo) * np.exp(-t / 0.028)
    body = np.sin(sweep_phase(f)) * np.exp(-t / decay) * (1 - np.exp(-t / 0.0012))
    c = hp(noise(len(t)), 2500) * np.exp(-t / 0.0035) * click
    return np.tanh(1.8 * (body + c)) / np.tanh(1.8)


def clap():
    t = tt(0.4)
    x = bp(noise(len(t)), 900, 2600)
    e = np.zeros_like(t)
    for off in (0, 0.009, 0.02):
        e += np.exp(-(t - off) / 0.0055) * (t >= off)
    e += 0.55 * np.exp(-(t - 0.028) / 0.12) * (t >= 0.028)
    return x * e / 3


def hat(open_=False):
    t = tt(0.4 if open_ else 0.12)
    x = hp(noise(len(t)), 7500, 4)
    return x * np.exp(-t / (0.2 if open_ else 0.032)) * (1 - np.exp(-t / 0.0005))


def snare(bright=1.0):
    t = tt(0.25)
    nz = bp(noise(len(t)), 1300, 7000) * np.exp(-t / (0.07 + 0.03 * bright))
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.045) * 0.6
    return fade(nz + body, 0.0005, 0.02)


def blip(f, d=0.16, drop=0.04):
    t = tt(d)
    ff = f * (1 - drop * (1 - np.exp(-t / 0.02)))
    x = np.sin(sweep_phase(ff)) + 0.18 * np.sin(2 * sweep_phase(ff))
    return fade(x * np.exp(-t / (d * 0.35)), 0.001, 0.01)


def bloop(f0, d=0.22, rise=1.7):
    t = tt(d)
    f = f0 * (1 + rise * (1 - np.exp(-t / 0.022)))
    return fade(np.sin(sweep_phase(f)) * np.exp(-t / 0.06), 0.0015, 0.02)


def pluck(f, d=0.6, bright=1.0):
    t = tt(d)
    x = np.zeros_like(t)
    for k in range(1, 9):
        x += (0.72 ** k) * np.sin(2 * np.pi * k * f * t + k) * np.exp(-t * (3.5 + k * 2.6 / bright))
    return fade(x, 0.0015, 0.05)


def swoop(f0, f1, d, vib=0.0):
    t = tt(d)
    u = t / d
    f = f0 * (f1 / f0) ** u * (1 + vib * np.sin(2 * np.pi * 7 * t))
    return fade(np.sin(sweep_phase(f)) * np.sin(np.pi * u) ** 1.2, 0.003, 0.02)


def tick(f=3800, d=0.012):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.0022)


def whoosh(d, f0, f1, shape="swell", width=0.45, stereo=0.0):
    n = int(d * SR)
    x = noise(n)
    f, tm, Z = signal.stft(x, fs=SR, nperseg=1024)
    fc = np.exp(np.interp(tm, [0, d], [np.log(f0), np.log(f1)]))
    lf = np.log(np.maximum(f, 20))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log(fc)[None, :]) / width) ** 2)
    _, y = signal.istft(Z * mask, fs=SR, nperseg=1024)
    y = y[:n]
    u = np.linspace(0, 1, n)
    env = {"swell": np.sin(np.pi * u) ** 1.5, "in": u ** 2.5, "out": (1 - u) ** 2 * np.minimum(1, u * 40)}[shape]
    y = y * env
    y /= np.max(np.abs(y)) + 1e-9
    if stereo:
        a = (np.clip(np.linspace(-stereo, stereo, n), -1, 1) + 1) * np.pi / 4
        return np.stack([y * np.cos(a) * 1.41, y * np.sin(a) * 1.41])
    return y


def crash(d=1.8, g=1.0):
    t = tt(d)
    x = hp(noise(len(t)), 3200, 2) + 0.4 * bp(noise(len(t)), 5000, 9000)
    return fade(x * (0.6 * np.exp(-t / 0.08) + 0.4 * np.exp(-t / 0.6)) * g, 0.0005, 0.2)


def boom(d=2.2, f0=72, f1=30):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    sub = np.sin(sweep_phase(f)) * np.exp(-t / 0.9) * (1 - np.exp(-t / 0.003))
    nz = lp(noise(len(t)), 700) * np.exp(-t / 0.09) * 0.8
    return fade(np.tanh(1.5 * (sub + nz)), 0.0005, 0.3)


def supersaw(freqs, d, cutoff=1800, detune=0.006, voices=3):
    n = int(d * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for fi, f in enumerate(freqs):
        for v in range(voices):
            dv = (v - (voices - 1) / 2) * detune
            s = saw(f * (1 + dv), n)
            p = ((fi + v) % 3 - 1) * 0.6
            a = (p + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
    L, R = lp(L, cutoff), lp(R, cutoff)
    m = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
    return np.stack([L / m, R / m])


def pad(freqs, d, a=0.3, r=0.5, cutoff=1500):
    x = supersaw(freqs, d, cutoff)
    t = tt(d)
    e = np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
    return x * np.clip(e, 0, 1)


def stab(freqs, d=0.7, bright=4200, dark=700):
    x = supersaw(freqs, d, cutoff=bright, voices=2)
    xd = supersaw(freqs, d, cutoff=dark, voices=2)
    t = tt(d)
    w = np.exp(-t / 0.06)
    y = x * w + xd * (1 - w)
    return fade(y * np.exp(-t / 0.22), 0.002, 0.05) if y.ndim == 1 else y * np.exp(-t / 0.22) * np.minimum(1, t / 0.002)


def bass(f, d, open_=0.0):
    t = tt(d)
    s = saw(f, len(t)) * 0.75 + np.sin(2 * np.pi * f * t) * 0.4
    bright = lp(s, 900 + 2600 * open_)
    dark = lp(s, 260)
    w = np.exp(-t / 0.05)
    y = bright * w + dark * (1 - w)
    e = np.minimum(1, t / 0.003) * np.minimum(1, (d - t) / 0.02)
    return hp(np.tanh(1.4 * y * np.clip(e, 0, 1)), 38)


def chatter(d, density=90):
    out = np.zeros(int(d * SR) + SR // 10)
    tcur = 0.0
    while tcur < d:
        f = rng.uniform(1800, 5200)
        x = blip(f, 0.03, 0.0) * rng.uniform(0.4, 1)
        i = int(tcur * SR)
        out[i:i + len(x)] += x
        tcur += rng.exponential(1 / density)
    return out


def reverb_ir(sec=1.9, seed=11):
    n = int(sec * SR)
    t = np.arange(n) / SR
    irs = []
    for s in (seed, seed + 1):
        r = np.random.default_rng(s).standard_normal(n)
        ir = r * np.exp(-t * 6.9 / (sec * 0.85))
        dark = lp(ir, 2600)
        w = np.clip(t / sec * 1.4, 0, 1)
        ir = ir * (1 - w) + dark * w
        pre = int(0.014 * SR)
        ir[:pre] = 0
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return irs


# ── arrangement ─────────────────────────────────────────────────────────────
# Bars (0-based) follow src/timeline.js: 0-1 hook, 2-4 hub, 5-6 chat,
# 7-10 edit (8 = the drop), 11 playbooks, 12 lookup, 13-14 watch, 15 plan,
# 16 carousel, 17 board, 18-19 wall, 20-21 connect, 22-23 end card.
beat = lambda n: n * B
bar_t = lambda k: k * BAR
CHORDS = {
    "Dm": ["D3", "F3", "A3", "C4", "E4"],
    "Bbmaj7": ["Bb2", "D3", "F3", "A3"],
    "Fmaj7": ["F3", "A3", "C4", "E4"],
    "Cadd9": ["C3", "G3", "D4", "E4"],
    "Gm7": ["G2", "Bb2", "D3", "F3"],
    "A7": ["A2", "C#3", "E3", "G3"],
}
PROG = ["Dm", "Bbmaj7", "Fmaj7", "Cadd9"]
ROOT = {"Dm": "D2", "Bbmaj7": "Bb1", "Fmaj7": "F2", "Cadd9": "C2", "Gm7": "G1", "A7": "A1"}
def chord_of(k):
    if k in (6, 19, 21):
        return "A7"
    return PROG[k % 4]
KICKS = []

# energy per bar: 0 none, 1 half-time, 2 groove, 3 full (16th hats)
LEVEL = {0: 0, 1: 2, 2: 2, 3: 2, 4: 3, 5: 0, 6: 1, 7: 1, 8: 3, 9: 3, 10: 3,
         11: 2, 12: 2, 13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 2, 19: 3, 20: 1, 21: 2}

# ── recorded sound effects ──────────────────────────────────────────────────
# v3: every effect is a real recording (assets/sfx, CC0 from Freesound via
# Openverse, see assets/sfx/CREDITS.md) instead of a synth blip: air whooshes,
# mouth pops, wood knocks, a mouse, a keyboard, a crash cymbal, cinematic
# impacts, and kalimba notes pitched to the chords where the old blips played
# the harmony. They sit on their own bus (fx) so `--no-fx` / `--fx-only`
# can check the balance against the music.
SFX = Path(__file__).resolve().parent.parent / "assets" / "sfx"
fx, fxv = Mix(), Mix()  # fx dry, fx reverb send
_smp = {}


def S(name):
    if name not in _smp:
        _, x = wavfile.read(SFX / f"{name}.wav")
        x = x.astype(np.float64) / 32768
        _smp[name] = x.T.copy() if x.ndim == 2 else np.stack([x, x])
    return _smp[name]


def mono(x):
    return x.mean(0)


def warm(x, f=7000):
    """tame the top end, which is what made the synth effects sound cheap"""
    return np.stack([lp(c, f) for c in x]) if x.ndim == 2 else lp(x, f)


def repitch(x, ratio):
    n = x.shape[-1]
    idx = np.arange(0, n - 1, ratio)
    if x.ndim == 1:
        return np.interp(idx, np.arange(n), x)
    return np.stack([np.interp(idx, np.arange(n), c) for c in x])


def peak_t(x):
    e = np.abs(x).max(0) if x.ndim == 2 else np.abs(x)
    k = int(0.012 * SR)
    return float(np.argmax(np.convolve(e, np.ones(k) / k, "same")) / SR)


def land(name, t, g, pan=0.0, f=7000, ratio=1.0, send=0.0, stereo=False):
    """place a recording so its loudest moment lands on t (whooshes, risers)"""
    x = warm(repitch(S(name), ratio), f)
    x = x if stereo else mono(x)
    t0 = t - peak_t(x)
    fx.add(x, t0, g, pan)
    if send:
        fxv.add(x, t0, send, pan)


def hit(name, t, g, pan=0.0, f=9000, ratio=1.0, send=0.0, stereo=False):
    """place a recording from its onset (pops, knocks, clicks, impacts)"""
    x = warm(repitch(S(name), ratio), f)
    x = x if stereo else mono(x)
    fx.add(x, t, g, pan)
    if send:
        fxv.add(x, t, send, pan)


def _f0(x, nominal):
    m = mono(x)
    on = int(np.argmax(np.abs(m) > 0.3 * np.abs(m).max())) + int(0.05 * SR)
    seg_ = m[on:on + SR]
    nfft = 8 * len(seg_)
    X = np.abs(np.fft.rfft(seg_ * np.hanning(len(seg_)), nfft))
    fr = np.fft.rfftfreq(nfft, 1 / SR)
    band = (fr > nominal * 0.94) & (fr < nominal * 1.06)
    return float(fr[band][np.argmax(X[band])])


KAL = {}
for _n in ["G3", "B3", "D4", "E4", "G4", "A4", "B4", "D5", "E5"]:
    KAL[_n] = _f0(S("kal_" + _n), hz(_n))


def kal(note, t, g, pan=0.0, send=0.5, d=None):
    """a kalimba note, pitched from the nearest recorded one"""
    f = hz(note)
    src = min(KAL, key=lambda k: abs(np.log(KAL[k] / f)))
    x = mono(repitch(S("kal_" + src), f / KAL[src]))
    if d:
        x = fade(x[:int(d * SR)], 0.001, min(0.25, d / 2))
    fx.add(x, t, g, pan)
    fxv.add(x, t, g * send, pan)


def typing(t0, t1, g, pan=0.0, at=0.0):
    x = warm(mono(S("typing")), 6500)
    i = int(at * SR)
    x = fade(x[i:i + int((t1 - t0) * SR)], 0.02, 0.05)
    fx.add(x, t0, g, pan)


# the 13 short whooshes in one recording, cut apart at their peaks
_w = mono(S("whoosh13"))
_e = np.convolve(np.abs(_w), np.ones(480) / 480, "same")
_pk = signal.find_peaks(_e, height=0.25 * _e.max(), distance=int(0.6 * SR))[0]
W13 = [_w[max(0, p - int(0.3 * SR)):p + int(0.35 * SR)] for p in _pk]


def w13(i, t, g, pan=0.0, f=5000):
    x = fade(lp(W13[i % len(W13)], f), 0.01, 0.08)
    fx.add(x, t - 0.3, g, pan)


# Bar 0 — "Give your Instagram": v4 (Victor) no hit on the words, just the air
# of each one sliding up, then a single pop for the Instagram icon and a paper
# swish as the profile draws itself in
for i, tc in enumerate([0.02, 0.5 * B, B]):
    land("whoosh_air", tc + 0.16, 0.13, -0.3 + 0.3 * i, f=3800, ratio=1.1)
duck.add(pad([hz(n) for n in CHORDS["Dm"]], BAR + 0.2, a=0.6, r=0.15, cutoff=900), 0.0, 0.14)
hit("pop_soft", 1.5 * B, 0.18, 0.3, f=6000)  # the Instagram icon
hit("paper", 1.7 * B, 0.1, 0.1, f=5000)  # the profile
land("whoosh_deep", BAR - 0.05, 0.22)

# drums, bass, pads, bar by bar
for k, lv in LEVEL.items():
    if lv == 0:
        continue
    t0 = bar_t(k)
    ch = chord_of(k)
    f = hz(ROOT[ch])
    for b in range(4):
        tb = t0 + beat(b)
        if lv >= 2 or b in (0, 2):
            KICKS.append(tb)
            dry.add(kick(), tb, 0.92 if lv >= 2 else 0.7)
        if lv >= 2 and b in (1, 3):
            dry.add(clap(), tb, 0.6)
            verb.add(clap(), tb, 0.22)
        if lv == 1 and b == 2:
            dry.add(clap(), tb, 0.35)
            verb.add(clap(), tb, 0.3)
        dry.add(hat(), tb + beat(0.5), 0.16 if lv >= 2 else 0.1, 0.25)
        if lv >= 3:
            dry.add(hat(), tb + beat(0.25), 0.07, -0.3)
            dry.add(hat(), tb + beat(0.75), 0.07, -0.3)
        if b == 3 and lv >= 2:
            dry.add(hat(True), tb + beat(0.5), 0.1, 0.35)
        if lv >= 2:
            up = 2 if b % 2 else 1
            duck.add(bass(f * up, B * 0.45, 0.6 if lv >= 3 else 0.25), tb + beat(0.5), 0.5)
            if b == 0:
                duck.add(bass(f, B * 0.3, 0.3), tb, 0.35)
        elif b == 0:
            duck.add(bass(f, BAR * 0.9, 0.1), tb, 0.3)
    duck.add(pad([hz(n) for n in CHORDS[ch]], BAR, 0.08, 0.15, 1700 if lv < 3 else 2600), t0, 0.16)

# bar 1 — "AI superpowers.": the drop of the hook, the highlighter, the pieces floating out
T1 = bar_t(1)
dry.add(boom(1.4, 78, 34), T1, 0.4)  # the sub under the recorded hit
hit("impact_soft", T1, 0.6, stereo=True)
hit("crash", T1, 0.16, f=8000, send=0.06, stereo=True)
st1 = stab([hz(n) for n in ["D4", "F4", "A4", "D5", "E5"]], 0.7)
dry.add(st1, T1, 0.26)
verb.add(st1, T1, 0.2)
land("whoosh_air", T1 + 0.42, 0.12, 0.3, f=5000)  # the mark sweeps
# the pieces float out on one breath of air, not a pop each (v4)
land("whoosh_double", T1 + 1.2 * B, 0.1, -0.2, f=4500, stereo=True)
# everything is pulled into the mark
land("whoosh_swing", bar_t(2) - 0.02, 0.3, f=6000)
kal("D5", T1 + 3 * B + 0.12, 0.16, d=1.0)

# bars 2–4: the hub. The mark lands, the agents pop in, the words change, the powers fire out
T2 = bar_t(2)
dry.add(boom(1.2, 80, 36), T2, 0.22)
hit("impact_low", T2, 0.32, stereo=True)
dry.add(stab([hz(n) for n in ["F4", "A4", "C5", "E5"]], 0.7), T2 + 0.15, 0.2)
for i in (0, 2, 4):  # the agents: every other one, softer (v4)
    hit(("pop1", "pop_soft", "pop2")[i // 2], T2 + 0.3 + i * 0.4 * B, 0.13, -0.6 + 0.24 * i, f=5000, ratio=0.9 + 0.03 * i)
hit("crash", bar_t(3), 0.08, f=7000, stereo=True)
land("whoosh_swipe", bar_t(3) - 0.04, 0.16, -0.3, f=6000)
land("whoosh_swipe", bar_t(4) - 0.04, 0.16, 0.3, f=6000)
for i in range(4):  # the powers: v4 a soft brush of air each, not a note
    w13(i + 6, bar_t(4) + 0.1 + i * 0.5 * B, 0.035, -0.4 + 0.27 * i, f=3500)
# fall into the @: the reversed crash swells into the chat
land("revcrash", bar_t(5) - 0.02, 0.2, f=6500, stereo=True)

# bars 5–6: the chat. Air, the drop of the file, typing, a note for each tool
duck.add(pad([hz(n) for n in CHORDS["Dm"]], 2 * BAR, 0.3, 0.3, 1200), bar_t(5), 0.2)
for i in range(16):
    n = ["D5", "A5", "F5", "C6"][i % 4]
    dry.add(pluck(hz(n), 0.35, 0.7), bar_t(5) + beat(i * 0.5), 0.06, (-0.5 if i % 2 else 0.5))
land("whoosh_air", bar_t(5) + B - 0.02, 0.16, 0.6, f=5500)  # the file flies in
hit("knock_deep", bar_t(5) + B, 0.7)  # and lands
t_type0, t_type1 = bar_t(5) + B + 0.1, bar_t(5) + 3 * B
typing(t_type0, t_type1, 0.3, 0.1)
# (v4: the four tool calls play silent, the plucks carry them)
land("whoosh_deep", bar_t(7) - 0.04, 0.26)

# bars 7–10: the edit. Raw take on a half-time bar, then the drop on the wipe
dry.add(swoop(90, 160, 0.3), bar_t(7), 0.2)
land("riser", bar_t(8) - 0.04, 0.22, f=8000, stereo=True)
land("revcrash", bar_t(8) - 0.03, 0.22, f=7000, stereo=True)
gapA = bar_t(8)
dry.add(boom(1.8), gapA, 0.6)
hit("impact_soft", gapA, 0.8, stereo=True)
hit("crash", gapA, 0.24, f=9000, send=0.1, stereo=True)
dry.add(stab([hz(n) for n in ["D4", "F4", "A4", "D5", "E5"]], 0.8), gapA, 0.3)
# a note and a breath of air for every effect (one per eighth)
for i in range(19):
    t = gapA + i * B / 2
    kal(["D4", "A4", "F4", "C5"][i % 4], t, 0.1, (-0.6, 0.6)[i % 2], send=0.3, d=0.5)
    w13(i, t, 0.07, (0.6, -0.6)[i % 2])
land("whoosh_deep", gapA + 19 * B / 2 + 0.3, 0.16, stereo=True)
for i, n in enumerate(["A4", "D5", "E5"]):  # uploaded
    kal(n, bar_t(11) - 2 * B + i * 0.05, 0.16, -0.2 + 0.2 * i, send=0.7)

# bars 11–17: one tool per bar (the reel breakdown gets two), a whoosh on each cut
for j, k in enumerate((11, 12, 13, 15, 16, 17)):
    land(("whoosh_swipe", "whoosh_air", "whoosh_swing")[j % 3], bar_t(k) - 0.03, 0.2, (k % 2) * 0.8 - 0.4, f=6000)
    hit("crash", bar_t(k), 0.05, f=6000, stereo=True)
hit("knock_deep", bar_t(11) + 2 * B, 0.55)  # Free stamp
hit("impact_low", bar_t(11) + 2 * B, 0.12)
for i in range(6):  # lookup: views land
    hit(("pop1", "pop2")[i % 2], bar_t(12) + 2 * B + i * 0.05, 0.12, rng.uniform(-0.6, 0.6), f=5000)
kal("A4", bar_t(12) + 2.6 * B, 0.2, d=0.9)  # 2.5x his median
# watch: the breakdown rows land silent (v4), the remix gets the sound
land("whoosh_swipe", bar_t(13) + 4 * B + 0.12, 0.12, 0.4, f=5500)  # the remix card
hit("card", bar_t(13) + 4 * B + 0.1, 0.22, 0.3, f=6000)
for i, n in enumerate(["D4", "A4", "D5"]):
    kal(n, bar_t(13) + 4 * B + 0.15 + i * 0.06, 0.14, -0.2 + 0.2 * i, send=0.6)
typing(bar_t(13) + 4 * B + 0.3, bar_t(13) + 4 * B + 1.1, 0.16, 0.2, at=2.0)
for i in range(16):  # plan: posts landing
    hit(("pop1", "pop2", "pop_mouth")[i % 3], bar_t(15) + 0.3 + i * 0.065, 0.08, rng.uniform(-0.7, 0.7), f=4500, ratio=rng.uniform(0.9, 1.1))
for b in (1, 2, 3):  # carousel: the deck slides a slide per beat
    hit("paper", bar_t(16) + beat(b) - 0.05, 0.16, 0.3, f=6000)
hit("click", bar_t(16) + 2.2 * B, 0.18, f=6000)  # Edit text
for i in range(4):  # board: card hops
    hit(("card", "wood_pat")[i % 2], bar_t(17) + i * B + 0.1, 0.16, -0.3 + 0.2 * i, f=6000)

# bars 18–19: the wall pulls back, then Research. Plan. Make. Ship.
land("whoosh_deep", bar_t(18) + 0.45, 0.2, stereo=True)
for i in range(4):
    t = bar_t(19) + beat(i)
    dry.add(stab([hz(n) for n in [["D4", "F4", "A4"], ["F4", "A4", "C5"], ["G4", "Bb4", "D5"], ["A4", "C#5", "E5"]][i]], 0.45), t, 0.26)
    dry.add(kick(hi=160, lo=55, decay=0.1, click=0.5, d=0.25), t, 0.3)
land("whoosh_swing", bar_t(20) - 0.03, 0.2, f=6000)

# bars 20–21: connect. Typing and two clicks; v4 lets "connected" land silent
for t_a, t_b, at in [(bar_t(20) + 0.3, bar_t(20) + 0.75, 0.5), (bar_t(20) + 0.85, bar_t(20) + 2.6 * B + 0.4, 3.0)]:
    typing(t_a, t_b, 0.28, 0.1, at=at)
for t in (bar_t(20) + 4 * B, bar_t(20) + 6 * B):
    hit("click", t, 0.4, f=7000)
land("riser", bar_t(22) - 0.04, 0.18, f=7500, stereo=True)

# bars 22–23: the end card. The mark drops and lands on the "and" of beat 1
T8 = bar_t(22)
TL = T8 + 0.5 * B
land("whoosh_swing", TL - 0.02, 0.18, f=5000)  # the mark falls
dry.add(boom(2.6), TL, 0.85)
hit("impact", TL, 0.9, stereo=True)
hit("impact_soft", TL, 0.35, stereo=True)
hit("crash", TL, 0.22, f=9000, send=0.1, stereo=True)
end_pad = pad([hz(n) for n in ["D3", "A3", "D4", "E4", "F4", "A4"]], DUR - T8 + 0.5, a=0.01, r=1.2, cutoff=2200)
dry.add(end_pad * np.exp(-tt(DUR - T8 + 0.5) / 2.2), T8, 0.2)
verb.add(end_pad, T8, 0.16)
st_ = stab([hz(n) for n in ["D4", "F4", "A4", "D5", "E5"]], 0.9)
dry.add(st_, TL, 0.3)
verb.add(st_, TL, 0.3)
for i, n in enumerate(["D4", "F4", "A4", "C5", "D5", "E5"]):  # the letters rise
    kal(n, T8 + 0.08 + i * 0.04 + 0.05, 0.07, -0.5 + i * 0.2, d=0.7)
land("whoosh_air", T8 + B + 0.42, 0.1, f=5000)  # Free to start.
hit("pop_soft", T8 + 2 * B, 0.24, 0.2)  # the button
kal("A4", T8 + 2 * B, 0.18, 0.2)
for i in range(4):  # soft pulse under the tagline
    dry.add(kick(hi=90, lo=45, decay=0.18, click=0.02, d=0.4), T8 + beat(2 + i), 0.22)
# (v4: the logo's heartbeat at 7 beats plays silent)

# the effects bus joins the mix
if "--levels" in sys.argv:  # per bar: music vs effects (dB RMS, pre-master)
    print("KAL", {k: round(v, 1) for k, v in KAL.items()}, "W13", len(W13))
    for k in range(24):
        a, b_ = int(bar_t(k) * SR), int(bar_t(k + 1) * SR)
        mus = np.concatenate([dry.L[a:b_] + duck.L[a:b_], dry.R[a:b_] + duck.R[a:b_]])
        efx = np.concatenate([fx.L[a:b_], fx.R[a:b_]])
        db = lambda v: 20 * np.log10(np.sqrt(np.mean(v ** 2)) + 1e-9)
        print(f"bar {k:2d}  music {db(mus):6.1f}  fx {db(efx):6.1f}  fx peak {20*np.log10(np.abs(efx).max()+1e-9):6.1f}")
FXG = 0.0 if "--no-fx" in sys.argv else 1.2
if "--fx-only" in sys.argv:
    for m_ in (dry, verb, duck):
        m_.L[:] = 0
        m_.R[:] = 0
dry.L += FXG * fx.L
dry.R += FXG * fx.R
verb.L += FXG * fxv.L
verb.R += FXG * fxv.R
DIPS = [bar_t(8), T8]

# ── sidechain, reverb, master ───────────────────────────────────────────────
def shelf_eq(x):
    """zero-phase tone shaping: -5 dB below ~70 Hz, +2.5 dB presence 1.2–4 kHz"""
    low = signal.sosfiltfilt(sos("low", 70, 2), x)
    pres = signal.sosfiltfilt(sos("band", [1200, 4000], 2), x)
    return x - 0.44 * low + 0.33 * pres


n_all = N + PAD
tg = np.arange(n_all) / SR
env = np.ones(n_all)
for tk in KICKS:
    i = int(tk * SR)
    seg_ = np.arange(n_all - i) / SR
    env[i:] -= 0.7 * np.exp(-seg_ / 0.11)
env = np.clip(env, 0.25, 1)
for t_dip in DIPS:
    i = int(t_dip * SR)
    seg_ = np.arange(n_all - i) / SR
    env[i:] = np.minimum(env[i:], 1 - 0.0 * seg_)
dry.L += duck.L * env
dry.R += duck.R * env
verb.L += duck.L * env * 0.25
verb.R += duck.R * env * 0.25

irL, irR = reverb_ir()
wetL = signal.fftconvolve(verb.L, irL)[:n_all]
wetR = signal.fftconvolve(verb.R, irR)[:n_all]
L = dry.L + 0.55 * wetL
R = dry.R + 0.55 * wetR

# silence right before the impact (the "drop" gap)
g = np.ones(n_all)
for t_gap in DIPS:
    gap0, gap1 = int((t_gap - 0.028) * SR), int(t_gap * SR)
    g[gap0 - 400:gap0] = np.linspace(1, 0.05, 400)
    g[gap0:gap1] = 0.05
L *= g
R *= g

L, R = L[:N], R[:N]
L, R = hp(L, 28), hp(R, 28)
L, R = shelf_eq(L), shelf_eq(R)
# glue: gentle soft-clip after level setting
pk = max(np.max(np.abs(L)), np.max(np.abs(R)))
drive = 1.25
L = np.tanh(drive * L / pk) / np.tanh(drive)
R = np.tanh(drive * R / pk) / np.tanh(drive)
# end: tail out cleanly at the last frame
fo = int(0.32 * SR)
fl = np.linspace(1, 0, fo) ** 1.5
L[-fo:] *= fl
R[-fo:] *= fl
L[:96] *= np.linspace(0, 1, 96)
R[:96] *= np.linspace(0, 1, 96)
pk = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = L / pk * 0.94, R / pk * 0.94
# level: -14.8 dBFS RMS lands at about -14 LUFS integrated (the streaming norm);
# never above the peak ceiling
g_ = min(1.0, 10 ** ((-14.8 - 20 * np.log10(np.sqrt(np.mean((L ** 2 + R ** 2) / 2)))) / 20))
L, R = L * g_, R * g_

OUT.mkdir(exist_ok=True)
st = np.stack([L, R], axis=1)
wavfile.write(OUT / "soundtrack.wav", SR, (st * 32767).astype(np.int16))
rms = 20 * np.log10(np.sqrt(np.mean(st ** 2)))
print(f"wrote {OUT/'soundtrack.wav'}  {len(L)/SR:.3f}s  peak {20*np.log10(np.max(np.abs(st))):.2f} dBFS  rms {rms:.2f} dBFS")

if "--spectro" in sys.argv:
    from PIL import Image, ImageDraw
    mono = (L + R) / 2
    f, tm, Z = signal.stft(mono, fs=SR, nperseg=2048, noverlap=2048 - 480)
    S = 20 * np.log10(np.abs(Z) + 1e-7)
    Wd, Hd = len(tm), 400
    logf = np.geomspace(30, 16000, Hd)
    img = np.zeros((Hd, Wd))
    for j, fr in enumerate(logf):
        img[Hd - 1 - j] = S[np.argmin(np.abs(f - fr))]
    img = np.clip((img + 90) / 80, 0, 1)
    rgb = (np.stack([img ** 0.7, img ** 1.2, img ** 2.5], -1) * 255).astype(np.uint8)
    im = Image.fromarray(rgb).resize((1500, 400))
    wave = np.zeros((160, 1500, 3), np.uint8)
    chunk = len(mono) // 1500
    for x in range(1500):
        seg_ = mono[x * chunk:(x + 1) * chunk]
        a, b = seg_.min(), seg_.max()
        wave[int(80 - b * 78):int(80 - a * 78) + 1, x] = (255, 120, 60)
    canvas = Image.new("RGB", (1500, 580), (20, 20, 24))
    canvas.paste(im, (0, 0))
    canvas.paste(Image.fromarray(wave), (0, 410))
    d = ImageDraw.Draw(canvas)
    for k in range(int(DUR / B) + 1):
        x = int(k * B / DUR * 1500)
        d.line([(x, 0), (x, 575)], fill=(90, 90, 110) if k % 4 else (220, 220, 255), width=1)
    canvas.save(OUT / "spectro.png")
    print("wrote", OUT / "spectro.png")
