"""Check embeddability of chosen videos via oEmbed; pick next embeddable candidate if blocked."""
import importlib.util
import json
import pathlib
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build", ROOT / "scripts" / "build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def embeddable(vid):
    url = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + vid
    for attempt in range(3):
        try:
            urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20)
            return True
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 404):
                return False
            time.sleep(5 * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    return None


rs = build.load("rs500.json", [])
cands = {}
for f in ("yt_candidates.json", "yt_candidates_rev.json"):
    for x in build.load(f, []):
        if x.get("candidates") and not cands.get(x["rank"]):
            cands[x["rank"]] = x["candidates"]
over, blocked = {}, []
for s in rs:
    cs = sorted(cands.get(s["rank"], []), key=lambda c: -build.score(s, c))
    for i, c in enumerate(cs):
        ok = embeddable(c["id"])
        time.sleep(0.4)
        if ok is not False:
            if i > 0:
                over[str(s["rank"])] = c["id"]
                print(s["rank"], s["song"], "-> replaced with", c["title"][:60], flush=True)
            break
        blocked.append((s["rank"], c["id"], c["title"][:50]))
(ROOT / "data" / "yt_overrides.json").write_text(json.dumps(over, ensure_ascii=False, indent=1), encoding="utf-8")
print("blocked first choices:", len(blocked), "overrides:", len(over))
