"""Transcribe each take back with ElevenLabs Scribe and diff it against the script (catches skipped/garbled words).
usage: check_vo.py <engine> [chapter ...]"""
import difflib, json, re, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import fal_util

ROOT = Path(__file__).resolve().parent.parent
engine, only = sys.argv[1], set(sys.argv[2:])
NUM = {"6": "six", "5": "five", "3": "three", "85": "eightyfive", "210": "twohundredandten", "2025": "twentytwentyfive"}
norm = lambda s: [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ").replace("g core", "gcore").replace("gee core", "gcore").replace("g coar", "gcore")).split()]


def check(ch):
    f = ROOT / "audio" / "vo" / engine / f'{ch["id"]}.mp3'
    d = fal_util.run("fal-ai/elevenlabs/speech-to-text/scribe-v2", {"audio_url": fal_util.upload(str(f)), "language_code": "eng"})
    a, b = norm(ch["text"]), norm(d["text"])
    sm = difflib.SequenceMatcher(a=a, b=b)
    diffs = [(op, " ".join(a[i1:i2]), " ".join(b[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]
    return ch["id"], round(sm.ratio(), 3), diffs, d["text"]


chapters = [c for c in json.loads((ROOT / "script" / "script.json").read_text()) if not only or c["id"] in only]
with ThreadPoolExecutor(6) as ex:
    for cid, ratio, diffs, heard in ex.map(check, chapters):
        print(f"{cid:10s} match {ratio}  {diffs if diffs else 'OK'}")
