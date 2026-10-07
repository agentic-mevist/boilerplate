"""Place the sound pack at the cue times in build/sfx.json, add the music bed (ducked under the voice),
and write audio/mix.wav. usage: mix.py [--music audio/music/pro_0.mp3] [--music-db -15] [--sfx-db 0]"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000


def decode(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()


# Sound pack: soft ElevenLabs SFX v2 one-shots in audio/sfx/<kind>.mp3 (see make_sfx.py), each low-passed,
# trimmed and peak-normalised, then scaled by its per-kind level (dB) so nothing pokes out above the voice.
KIND_DB = {"whoosh": -10, "pop": -9, "tap": -10, "stamp": -9, "swell": -8, "chime": -9, "draw": -16, "rumble": -6, "down": -11}
_CACHE = {}


def sfx(kind):
    if kind not in _CACHE:
        x = decode(ROOT / "audio" / "sfx" / f"{kind}.mp3")[:, 0]
        x = x[np.argmax(np.abs(x) > 0.02 * np.abs(x).max()):]           # trim leading silence
        k = np.exp(-2 * np.pi * 5000 / SR)                               # gentle 1-pole low-pass at ~5 kHz
        y = np.empty_like(x); acc = 0.0
        for i, v in enumerate(x):
            acc = (1 - k) * v + k * acc; y[i] = acc
        fade = min(len(y), int(0.03 * SR)); y[-fade:] *= np.linspace(1, 0, fade)
        _CACHE[kind] = y / max(1e-6, np.abs(y).max()) * 10 ** (KIND_DB[kind] / 20)
    return _CACHE[kind]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--music", default=str(ROOT / "audio/music/pro_0.mp3"))
    ap.add_argument("--music-db", type=float, default=-15.0)   # bed level relative to full scale before ducking
    ap.add_argument("--duck-db", type=float, default=-5.0)     # extra attenuation while the voice talks
    ap.add_argument("--sfx-db", type=float, default=-5.0)    # master trim on the whole SFX bus (kept well under the voice)
    a = ap.parse_args()

    tl = json.loads((ROOT / "build/timeline.json").read_text())
    D = tl["duration"]; N = int(D * SR)
    vo = decode(ROOT / "audio/vo.wav")[:, 0]; vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

    # SFX bus (mono, panned centre)
    fx = np.zeros(N + SR * 2)
    for ev in json.loads((ROOT / "build/sfx.json").read_text()):
        s = sfx(ev["kind"]) * ev.get("gain", 1.0)
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
    rms = np.sqrt(movavg(vo ** 2, int(0.05 * SR)))
    talk = movavg((rms > 0.02).astype(float), int(0.25 * SR))   # smooth attack/release
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


def movavg(x, n):
    """centred moving average (same length as x) via a cumulative sum; np.convolve is far too slow at 48 kHz"""
    c = np.concatenate([[0.0], np.cumsum(x, dtype=np.float64)])
    i = np.arange(len(x)); lo = np.clip(i - n // 2, 0, len(x)); hi = np.clip(i + n - n // 2, 0, len(x))
    return (c[hi] - c[lo]) / n


def decode_stretched(path, ratio):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-af", f"atempo={ratio:.5f}", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


if __name__ == "__main__":
    main()
