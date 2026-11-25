"""Check that chosen clips can be embedded; write data/video_overrides.json with the first embeddable candidate."""
import importlib.util
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build", ROOT / "scripts" / "build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def embeddable(vid):
    import urllib.error
    import urllib.request
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
vc = build.load("video_candidates.json", {})
cache_p = ROOT / "data" / "embed_cache.json"
cache = json.loads(cache_p.read_text()) if cache_p.exists() else {}
over = {}
for s in rs:
    ranked = build.rank_videos(s, cands.get(s["rank"], []) + (vc.get(str(s["rank"])) or []))
    for i, c in enumerate(ranked):
        if c["id"] not in cache:
            cache[c["id"]] = embeddable(c["id"])
            time.sleep(0.3)
        if cache[c["id"]] is not False:
            if i > 0:
                over[str(s["rank"])] = c["id"]
                print(s["rank"], s["song"], "-> next clip", c["title"][:60], flush=True)
            break
    else:
        if ranked:
            over[str(s["rank"])] = None
            print(s["rank"], s["song"], "-> no embeddable clip", flush=True)
cache_p.write_text(json.dumps(cache, indent=0))
(ROOT / "data" / "video_overrides.json").write_text(json.dumps(over, ensure_ascii=False, indent=1), encoding="utf-8")
print("overrides:", len(over), file=sys.stderr)
