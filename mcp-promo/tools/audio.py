#!/usr/bin/env python3
"""Soundtrack for the HandlePilot MCP promo (adapted from the show reel's) — synthesized from scratch, cut to the same grid as
the picture (128 BPM, 8 bars = 15.000 s). Music bed + a sound-design layer in
which every visual event (bounce, word slam, shatter, splash, flip, heartbeat)
has its own sound at the exact frame it happens.
"""
import sys
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
B = 60 / 128
BAR = 4 * B
DUR = 23 * BAR
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
# Bars (0-based) follow src/timeline.js: 0 bounce, 1 type, 2 grid, 3-4 hub,
# 5-6 chat, 7-10 edit (8 = the drop), 11-16 tools, 17-18 wall, 19-20 connect,
# 21-22 identity.
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
    if k in (6, 18, 20):
        return "A7"
    return PROG[k % 4]
KICKS = []

# energy per bar: 0 none, 1 half-time, 2 groove, 3 full (16th hats)
LEVEL = {0: 0, 1: 2, 2: 2, 3: 2, 4: 2, 5: 0, 6: 1, 7: 1, 8: 3, 9: 3, 10: 3,
         11: 2, 12: 2, 13: 3, 14: 3, 15: 3, 16: 3, 17: 2, 18: 3, 19: 1, 20: 2}

# Bar 0 — the bounce IS the rhythm (as in the show reel)
C = [B, 2 * B, 2.5 * B, 2.75 * B]
for i, (tc, note, g) in enumerate(zip(C, ["D5", "F5", "A5", "D6"], [0.7, 0.52, 0.36, 0.24])):
    pan = -0.45 + 0.15 * i
    dry.add(kick(hi=125, lo=58, decay=0.12, click=0.25, d=0.3), tc - 0.025, 0.75 * g, pan)
    dry.add(blip(hz(note)), tc - 0.025, 0.24 * g / 0.7 + 0.05, pan)
    verb.add(blip(hz(note)), tc - 0.025, 0.12, pan)
dry.add(whoosh(0.4, 500, 1600), 0.0, 0.06, -0.6)
duck.add(pad([hz(n) for n in CHORDS["Dm"]], BAR + 0.2, a=1.2, r=0.15, cutoff=900), 0.0, 0.12)
dry.add(swoop(220, 360, 0.14), 1.34, 0.05)
dry.add(swoop(420, 1700, 0.18), 1.47, 0.09)
pp_ = bp(noise(int(0.06 * SR)), 1200, 4000) * np.exp(-tt(0.06) / 0.012)
dry.add(pp_, 3.5 * B, 0.45)
for k in range(7):
    dry.add(blip(hz(["A6", "D7", "F6", "A6", "E7", "C7", "D7"][k]), 0.12), 3.5 * B + 0.012 * k, 0.05, (k % 3 - 1) * 0.7)
dry.add(whoosh(0.32, 2500, 9000, "in"), BAR - 0.32, 0.32)

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

# bars 1–2: type slams, grid strums
dry.add(crash(1.6, 0.9), bar_t(1), 0.32)
verb.add(crash(1.6), bar_t(1), 0.12)
for i, n in enumerate(["D4", "F4", "A4", "C5"]):
    dry.add(pluck(hz(n), 0.5), bar_t(2) + beat(i), 0.14, -0.4 + 0.25 * i)
    verb.add(pluck(hz(n), 0.6), bar_t(2) + beat(i), 0.08)
dry.add(whoosh(0.3, 6000, 300, "in"), bar_t(3) - 0.32, 0.22)

# bars 3–4: the hub. The mark lands, the agents pop in and connect
dry.add(boom(1.4, 80, 36), bar_t(3) + 0.2, 0.45)
dry.add(stab([hz(n) for n in ["F4", "A4", "C5", "E5"]], 0.7), bar_t(3) + 0.25, 0.22)
for i in range(6):
    t = bar_t(3) + 0.45 + i * 0.5 * B
    dry.add(bloop(500 + 90 * i, 0.18, 1.5), t, 0.22, -0.6 + 0.24 * i)
dry.add(crash(1.2, 0.8), bar_t(4), 0.2)
# fall into the @: riser + reverse swell
dry.add(whoosh(0.5, 400, 7000, "in"), bar_t(5) - 0.5, 0.32)

# bars 5–6: the chat. Air, the drop of the file, typing, ticks for each tool
duck.add(pad([hz(n) for n in CHORDS["Dm"]], 2 * BAR, 0.3, 0.3, 1200), bar_t(5), 0.2)
for i in range(16):
    n = ["D5", "A5", "F5", "C6"][i % 4]
    dry.add(pluck(hz(n), 0.35, 0.7), bar_t(5) + beat(i * 0.5), 0.06, (-0.5 if i % 2 else 0.5))
dry.add(whoosh(0.45, 300, 2500), bar_t(5) + 0.25, 0.12, 0.6)
dry.add(kick(hi=110, lo=50, decay=0.2, click=0.4), bar_t(5) + B, 0.45)
t_type0, t_type1 = bar_t(5) + B + 0.1, bar_t(5) + 3 * B
nk = int((t_type1 - t_type0) / 0.055)
for i in range(nk):
    dry.add(tick(rng.uniform(3000, 4500), 0.01), t_type0 + i * 0.055 + rng.uniform(-0.01, 0.01), 0.05, rng.uniform(-0.3, 0.3))
for i in range(4):
    t0 = bar_t(5) + 3.3 * B + i * B
    dry.add(blip(hz(["A5", "C6", "D6", "E6"][i]), 0.14), t0, 0.12, 0.2)
    dry.add(blip(hz(["D6", "F6", "A6", "C7"][i]), 0.2), t0 + 0.75 * B, 0.1, -0.2)
dry.add(whoosh(0.9, 200, 8000, "in"), bar_t(7) - 0.9, 0.3)

# bars 7–10: the edit. Raw take on a half-time bar, then the drop on the wipe
dry.add(swoop(90, 160, 0.3), bar_t(7), 0.2)
dry.add(whoosh(1.2, 300, 9000, "in"), bar_t(8) - 1.2, 0.38)
gapA = bar_t(8)
dry.add(boom(1.8), gapA, 0.9)
dry.add(crash(2.0, 1.0), gapA, 0.4)
verb.add(crash(2.0), gapA, 0.2)
dry.add(stab([hz(n) for n in ["D4", "F4", "A4", "D5", "E5"]], 0.8), gapA, 0.3)
# a tick for every effect (one per eighth)
for i in range(19):
    t = gapA + i * B / 2
    dry.add(blip(hz(["D6", "A5", "F6", "C6"][i % 4]), 0.08, 0.03), t, 0.07, (-0.6, 0.6)[i % 2])
    dry.add(whoosh(0.14, 4000, 900, "in"), t - 0.1, 0.05, (0.6, -0.6)[i % 2])
dry.add(whoosh(0.9, 6000, 300, "swell", stereo=0.9), gapA + 19 * B / 2, 0.15)
dry.add(chime := blip(hz("A6"), 0.5, 0.0), bar_t(11) - 2 * B, 0.12)
verb.add(chime, bar_t(11) - 2 * B, 0.12)

# bars 11–16: one tool per bar, a whoosh on each cut and its own accent
for k in range(11, 17):
    dry.add(whoosh(0.28, 7000, 600, "in"), bar_t(k) - 0.28, 0.2, (k % 2) * 0.8 - 0.4)
    dry.add(crash(0.9, 0.7), bar_t(k), 0.12)
dry.add(kick(hi=180, lo=60, decay=0.1, click=0.5, d=0.3), bar_t(11) + 2 * B, 0.4)  # FREE stamp
for i in range(16):  # plan: posts landing
    dry.add(tick(rng.uniform(2400, 5200)), bar_t(14) + 0.3 + i * 0.065, 0.08, rng.uniform(-0.7, 0.7))
for i in range(4):  # board: card hops
    dry.add(bloop(420 + 60 * i, 0.16, 1.4), bar_t(16) + i * B + 0.1, 0.16)

# bars 17–18: the wall pulls back, then RESEARCH. PLAN. MAKE. SHIP.
dry.add(whoosh(0.9, 2500, 300, "swell", stereo=0.9), bar_t(17), 0.22)
for i in range(4):
    t = bar_t(18) + beat(i)
    dry.add(stab([hz(n) for n in [["D4", "F4", "A4"], ["F4", "A4", "C5"], ["G4", "Bb4", "D5"], ["A4", "C#5", "E5"]][i]], 0.45), t, 0.26)
    dry.add(kick(hi=160, lo=55, decay=0.1, click=0.5, d=0.25), t, 0.3)
dry.add(whoosh(0.4, 9000, 400, "in"), bar_t(19) - 0.4, 0.2)

# bars 19–20: connect. Typing, two clicks, the connected chime
for t_a, t_b in [(bar_t(19) + 0.3, bar_t(19) + 0.75), (bar_t(19) + 0.85, bar_t(19) + 2.6 * B + 0.4)]:
    for i in range(int((t_b - t_a) / 0.05)):
        dry.add(tick(rng.uniform(3000, 4500), 0.01), t_a + i * 0.05, 0.05, rng.uniform(-0.3, 0.3))
for t in (bar_t(19) + 4 * B, bar_t(19) + 6 * B):
    dry.add(tick(1800, 0.02), t, 0.3)
    dry.add(blip(hz("E5"), 0.1), t, 0.1)
for i, n in enumerate(["D5", "F#5", "A5", "D6"]):
    dry.add(blip(hz(n), 0.3, 0.0), bar_t(19) + 7 * B + i * 0.06, 0.12, -0.3 + 0.2 * i)
    verb.add(blip(hz(n), 0.4, 0.0), bar_t(19) + 7 * B + i * 0.06, 0.1)
dry.add(whoosh(0.6, 300, 8000, "in"), bar_t(21) - 0.6, 0.3)

# bars 21–22: identity (the show reel's ending, held for two bars)
T8 = bar_t(21)
dry.add(boom(2.6), T8, 0.95)
dry.add(crash(3.0, 1.0), T8, 0.36)
verb.add(crash(3.0), T8, 0.2)
end_pad = pad([hz(n) for n in ["D3", "A3", "D4", "E4", "F4", "A4"]], DUR - T8 + 0.5, a=0.01, r=1.2, cutoff=2200)
dry.add(end_pad * np.exp(-tt(DUR - T8 + 0.5) / 2.2), T8, 0.2)
verb.add(end_pad, T8, 0.16)
st_ = stab([hz(n) for n in ["D4", "F4", "A4", "D5", "E5"]], 0.9)
dry.add(st_, T8, 0.3)
verb.add(st_, T8, 0.3)
dry.add(swoop(320, 980, 0.4), T8 + 0.07, 0.07)
for i, n in enumerate(["D5", "F5", "A5", "C6", "D6", "E6"]):
    dry.add(blip(hz(n), 0.12), T8 + 0.06 + i * 0.045 + 0.05, 0.06, -0.5 + i * 0.2)
dry.add(blip(hz("D5"), 0.3, 0.06), T8 + B, 0.3, 0.35)
dry.add(kick(hi=140, lo=70, decay=0.08, click=0.2, d=0.2), T8 + B, 0.35, 0.35)
for i in range(4):  # soft pulse under the tagline
    dry.add(kick(hi=90, lo=45, decay=0.18, click=0.02, d=0.4), T8 + beat(2 + i), 0.22)
dry.add(kick(hi=95, lo=45, decay=0.14, click=0.05, d=0.4), T8 + 7 * B, 0.55)
dry.add(kick(hi=85, lo=42, decay=0.12, click=0.05, d=0.4), T8 + 7 * B + 0.16, 0.38)
verb.add(blip(hz("D6"), 0.5, 0.0), T8 + 7 * B, 0.06)
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
