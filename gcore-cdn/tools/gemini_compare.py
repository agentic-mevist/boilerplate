import os, sys, json, requests
KEY = os.environ["GEMINI_API_KEY"]
model, f_orig, f_new, prompt_path, out = sys.argv[1:6]
a, b = json.load(open(f_orig)), json.load(open(f_new))
parts = [{"text": "VIDEO 1 = ORIGINAL reference reel:"}, {"file_data": {"mime_type": "video/mp4", "file_uri": a["uri"]}},
         {"text": "VIDEO 2 = NEW recreation for Gcore:"}, {"file_data": {"mime_type": "video/mp4", "file_uri": b["uri"]}},
         {"text": open(prompt_path).read()}]
r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", headers={"x-goog-api-key": KEY},
                  json={"contents": [{"role": "user", "parts": parts}], "generationConfig": {"temperature": 0.3, "mediaResolution": "MEDIA_RESOLUTION_HIGH"}}, timeout=1200)
d = r.json()
if "candidates" not in d: print(json.dumps(d)[:2000]); sys.exit(1)
txt = "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"] if not p.get("thought"))
open(out, "w").write(txt); print(txt)
