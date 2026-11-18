"""Resolve each song in data/songs_src.json to a YouTube video via yt-dlp search."""
import json
import pathlib
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "data" / "songs_src.json").read_text(encoding="utf-8"))
out = []
for s in src:
    res = None
    for attempt in range(3):
        p = subprocess.run(["yt-dlp", "--flat-playlist", "--print", "%(id)s\t%(title)s\t%(channel)s\t%(duration)s",
                            "ytsearch3:" + s["q"]], capture_output=True, text=True, timeout=90)
        lines = [l for l in p.stdout.strip().splitlines() if l.count("\t") >= 3]
        if lines:
            res = [dict(zip(["id", "title", "channel", "duration"], l.split("\t"))) for l in lines]
            break
        time.sleep(5 * (attempt + 1))
    s = dict(s)
    s["candidates"] = res or []
    out.append(s)
    print(s["artist"], "—", s["title"], "→", (res[0]["title"] + " | " + res[0]["channel"]) if res else "NONE", flush=True)
    time.sleep(1.5)
(ROOT / "data" / "songs_yt_candidates.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
