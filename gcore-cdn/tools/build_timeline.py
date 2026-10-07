"""Join the per-chapter VO takes into audio/vo.wav and write build/timeline.json with word + cue timings.
usage: build_timeline.py [engine]   (default: qwen3 = the cloned voice, if its takes exist, else chris)"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
LEAD_IN = 0.30      # silence before the first word
GAP = 0.32          # pause between chapters
TAIL = 2.2          # hold after the last word (logo end card)
PAD = 0.04          # keep a little air around trimmed speech


def decode(mp3):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def speech_bounds(x, thresh_db=-42):
    win = int(0.01 * SR)
    n = len(x) // win
    rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1) + 1e-12)
    loud = np.where(20 * np.log10(rms) > thresh_db)[0]
    return loud[0] * win / SR, (loud[-1] + 1) * win / SR


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("g-core", "gcore").replace("g-coar", "gcore"))


chapters = json.loads((ROOT / "script" / "script.json").read_text())
ENGINE = sys.argv[1] if len(sys.argv) > 1 else ("qwen3" if (ROOT / "audio" / "vo" / "qwen3").exists() else "chris")
pieces, t = [np.zeros(int(LEAD_IN * SR), np.float32)], LEAD_IN
for i, ch in enumerate(chapters):
    vo = ROOT / "audio" / "vo" / ENGINE / ch["id"]
    x = decode(vo.with_suffix(".mp3"))
    s0, s1 = speech_bounds(x)
    s0, s1 = max(0, s0 - PAD), min(len(x) / SR, s1 + PAD)
    seg = x[int(s0 * SR): int(s1 * SR)]
    tw = json.loads(vo.with_suffix(".words.json").read_text())
    assert [norm(w["w"]) for w in tw] == [norm(w["w"]) for w in ch["words"]], (ch["id"], [w["w"] for w in tw])
    for w, sw in zip(ch["words"], tw):
        w["start"] = round(t + sw["start"] - s0, 3); w["end"] = round(t + sw["end"] - s0, 3)
    ch["start"] = round(t, 3); ch["end"] = round(t + len(seg) / SR, 3)
    ch["cues"] = {k: ch["words"][idx]["start"] for k, idx in ch["cues"].items()}
    pieces.append(seg); t += len(seg) / SR
    if i < len(chapters) - 1:
        pieces.append(np.zeros(int(GAP * SR), np.float32)); t += GAP
pieces.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL

vo = np.concatenate(pieces)
vo *= 10 ** (-1.0 / 20) / max(1e-6, np.abs(vo).max())       # peak-normalise to -1 dBFS
(ROOT / "build").mkdir(exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(ROOT / "audio" / "vo.wav")],
               input=vo.astype(np.float32).tobytes(), check=True)
(ROOT / "build" / "timeline.json").write_text(json.dumps({"duration": round(t, 3), "engine": ENGINE, "chapters": chapters}, indent=1))
for ch in chapters:
    print(f'{ch["id"]:10s} {ch["start"]:7.2f} -> {ch["end"]:7.2f}  cues: ' + ", ".join(f"{k}={v:.2f}" for k, v in ch["cues"].items()))
print("total", round(t, 2))
