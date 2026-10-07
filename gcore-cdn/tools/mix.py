"""Synthesize UI sound effects at the cue times in build/sfx.json, add the music bed (ducked under the
voice), and write audio/mix.wav. usage: mix.py [--music audio/music/pro_0.mp3] [--music-db -21] [--sfx-db -9]"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
R = np.random.default_rng(7)


def decode(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()


def env(n, a=0.002, d=0.08):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def tone(f0, f1, dur, a=0.002, d=0.08, harm=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + harm * np.sin(2 * ph)) * env(n, a, d)


def bandnoise(dur, f0, f1, q=1.2, shape=None):
    """noise through a time-varying 2-pole bandpass (state-variable filter) sweeping f0→f1"""
    n = int(dur * SR); x = R.standard_normal(n); y = np.zeros(n)
    low = band = 0.0
    fs = f0 * (f1 / f0) ** (np.arange(n) / n)
    for i in range(n):
        F = 2 * np.sin(np.pi * fs[i] / SR)
        low += F * band; high = x[i] - low - band / q; band += F * high
        y[i] = band
    y /= np.abs(y).max() + 1e-9
    if shape is None:
        t = np.linspace(0, 1, n); shape = np.sin(np.pi * t) ** 2
    return y * shape


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y


def click():
    n = int(0.012 * SR)
    return 0.6 * R.standard_normal(n) * env(n, 0.0003, 0.002) + 0.5 * tone(2400, 2000, 0.012, 0.0005, 0.004)


def pop():
    return tone(1100, 420, 0.09, 0.001, 0.035, harm=0.15)


def tick(f=1700):
    return 0.7 * tone(f, f, 0.018, 0.0005, 0.005)


def ticks(n=12, dur=0.9):
    out = np.zeros(int((dur + 0.05) * SR))
    for k in range(n):
        tt = dur * (k / n) ** 0.7
        s = tick(1500 + 40 * k) * (0.5 + 0.5 * (1 - k / n))
        i = int(tt * SR); out[i:i + len(s)] += s
    return out


def blip():
    return 0.6 * tone(1300, 1700, 0.06, 0.001, 0.03)


def ping():
    a, b = 0.5 * tone(1760, 1760, 0.7, 0.002, 0.18, harm=0.2), 0.25 * tone(2640, 2640, 0.5, 0.002, 0.1)
    a[: len(b)] += b
    return a


def whoosh(dur=0.5, f0=250, f1=3500):
    return 0.8 * bandnoise(dur, f0, f1, q=1.4)


def swish():
    return 0.6 * bandnoise(0.25, 900, 5000, q=1.6)


def draw():
    n = int(0.6 * SR); t = np.arange(n) / SR
    am = 0.55 + 0.45 * np.sin(2 * np.pi * 11 * t) ** 2
    return 0.22 * bandnoise(0.6, 2500, 4200, q=2.5) * am


def error():
    return np.concatenate([0.5 * tone(330, 320, 0.09, 0.002, 0.05, harm=0.5), np.zeros(int(0.03 * SR)), 0.5 * tone(220, 210, 0.13, 0.002, 0.07, harm=0.5)])


def typing(n=9, dur=0.7):
    out = np.zeros(int((dur + 0.05) * SR))
    for k in range(n):
        i = int((k / n + R.uniform(-0.02, 0.02)) * dur * SR); s = 0.5 * click() * R.uniform(0.6, 1)
        i = max(0, i); out[i:i + len(s)] += s
    return out


def stamp():
    thump = tone(140, 55, 0.18, 0.001, 0.06) + 0.35 * tone(900, 700, 0.18, 0.0005, 0.02)
    n = int(0.02 * SR); c = np.zeros(len(thump)); c[:n] = 0.4 * R.standard_normal(n) * env(n, 0.0003, 0.004)
    return thump + c


def zoom():
    w = whoosh(1.3, 150, 2500)
    return w + 0.3 * tone(70, 45, 1.3, 0.3, 0.6)[: len(w)]


def crowd():
    out = np.zeros(int(1.6 * SR))
    for k in range(40):
        i = int(R.uniform(0, 1.4) * SR); s = 0.25 * tone(R.uniform(900, 2200), R.uniform(900, 2200), 0.05, 0.001, 0.02)
        out[i:i + len(s)] += s
    return out


def sizzle():
    n = int(1.1 * SR); x = R.standard_normal(n) * (R.random(n) < 0.08)
    return 0.35 * x * np.linspace(1, 0, n) ** 1.5


def alarm():
    seq = [tone(880, 880, 0.12, 0.003, 0.2, harm=0.3), tone(660, 660, 0.12, 0.003, 0.2, harm=0.3)] * 2
    return 0.35 * np.concatenate(seq)


def rumble():
    n = int(1.6 * SR); x = lowpass(R.standard_normal(n), 90) * 6
    return np.tanh(x * 2) * 0.6 * np.minimum(1, np.arange(n) / (0.05 * SR)) * np.linspace(1, 0, n) ** 1.2


def impact():
    n = int(0.9 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(90 * (40 / 90) ** (t / 0.9)) / SR) * np.exp(-t / 0.28)
    hit = lowpass(R.standard_normal(n), 900) * 4 * np.exp(-t / 0.05)
    return 0.9 * np.tanh(1.4 * boom) + 0.35 * hit


def leave():
    out = np.zeros(int(1.4 * SR))
    for k in range(12):
        i = int(k * 0.09 * SR); f = 1400 - k * 70; b = 0.35 * tone(f, f * 0.8, 0.07, 0.001, 0.03)
        out[i:i + len(b)] += b
    return out


def stream():
    n = int(2.6 * SR); t = np.arange(n) / SR
    crackle = R.standard_normal(n) * (R.random(n) < 0.02) * 0.6
    hiss = bandnoise(2.6, 1800, 900, q=1.2, shape=np.minimum(1, t / 0.15) * np.minimum(1, (2.6 - t) / 0.6))
    return 0.45 * hiss + crackle * np.minimum(1, (2.6 - t) / 0.6)


def success():
    a = tone(659, 659, 0.5, 0.004, 0.25, harm=0.2); b = tone(988, 988, 0.6, 0.004, 0.3, harm=0.2)
    out = np.zeros(int(0.75 * SR)); out[: len(a)] += 0.45 * a; i = int(0.11 * SR); out[i:i + len(b)] += 0.45 * b
    return out


KINDS = {"pop": pop, "click": click, "tick": tick, "ticks": ticks, "blip": blip, "ping": ping, "whoosh": whoosh, "swish": swish,
         "draw": draw, "error": error, "type": typing, "stamp": stamp, "zoom": zoom, "crowd": crowd, "sizzle": sizzle,
         "alarm": alarm, "rumble": rumble, "success": success, "impact": impact,
         "leave": leave, "stream": stream}
# per-kind trims: lift the small UI sounds so they read under the voice, keep the big hits in check
KIND_GAIN = {"pop": 1.6, "click": 1.8, "tick": 1.7, "ticks": 1.6, "blip": 1.6, "type": 1.6, "draw": 1.5, "swish": 1.3,
             "whoosh": 1.2, "impact": 0.8, "rumble": 0.8}
_CACHE = {}


def sfx(kind):
    if kind not in _CACHE:
        _CACHE[kind] = KINDS[kind]()
    return _CACHE[kind]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--music", default=str(ROOT / "audio/music/pro_0.mp3"))
    ap.add_argument("--music-db", type=float, default=-15.0)   # bed level relative to full scale before ducking
    ap.add_argument("--duck-db", type=float, default=-5.0)     # extra attenuation while the voice talks
    ap.add_argument("--sfx-db", type=float, default=-7.0)
    a = ap.parse_args()

    tl = json.loads((ROOT / "build/timeline.json").read_text())
    D = tl["duration"]; N = int(D * SR)
    vo = decode(ROOT / "audio/vo.wav")[:, 0]; vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

    # SFX bus (mono, panned centre)
    fx = np.zeros(N + SR * 2)
    for ev in json.loads((ROOT / "build/sfx.json").read_text()):
        s = sfx(ev["kind"]) * ev.get("gain", 1.0) * KIND_GAIN.get(ev["kind"], 1.0)
        i = int(max(0, ev["t"]) * SR); fx[i:i + len(s)] += s[: len(fx) - i]
    fx = fx[:N] * 10 ** (a.sfx_db / 20)

    # music bed: stretch to the video length, fade in/out, duck under the voice
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.music],
                               capture_output=True, text=True, check=True).stdout)
    ratio = dur / (D - 0.3)
    m = decode_stretched(a.music, ratio)
    m = np.pad(m, ((0, max(0, N - len(m))), (0, 0)))[:N]
    fade = np.ones(N); fi = int(0.4 * SR); fo = int(2.5 * SR)
    fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    win = int(0.05 * SR); rms = np.sqrt(np.convolve(vo ** 2, np.ones(win) / win, mode="same"))
    talk = (rms > 0.02).astype(float)
    k = int(0.25 * SR); talk = np.convolve(talk, np.ones(k) / k, mode="same")   # smooth attack/release
    gain = 10 ** ((a.music_db + a.duck_db * np.clip(talk, 0, 1)) / 20) * fade
    m = m * gain[:, None]

    mix = np.stack([vo, vo], 1) + m + np.stack([fx, fx], 1)
    stems = ROOT / "audio/stems"; stems.mkdir(exist_ok=True)
    for name, x in (("vo", np.stack([vo, vo], 1)), ("music", m), ("fx", np.stack([fx, fx], 1))):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(stems / f"{name}.wav")],
                       input=x.astype(np.float32).tobytes(), check=True)
    peak = np.abs(mix).max(); mix *= min(1.0, 0.97 / peak)
    out = ROOT / "audio/mix_raw.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(out)],
                   input=mix.astype(np.float32).tobytes(), check=True)
    # loudness-normalise for social platforms (-14 LUFS integrated, -1 dBTP)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), str(ROOT / "audio/mix.wav")], check=True)
    print("mix written", round(D, 2), "s; music stretch ratio", round(ratio, 4))


def decode_stretched(path, ratio):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-af", f"atempo={ratio:.5f}", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


if __name__ == "__main__":
    main()
