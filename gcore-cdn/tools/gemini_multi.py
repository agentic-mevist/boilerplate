# Ask Gemini about several media inputs at once.
# usage: python3 tools/gemini_multi.py <model> <out.txt> <prompt.txt> <label=input> [<label=input> ...]
#   input: a JSON file printed by gemini_upload.py, a YouTube URL, or a local audio file (sent inline, < 15 MB)
import os, sys, json, base64, mimetypes, requests
KEY = os.environ["GEMINI_API_KEY"]
model, out, prompt_path, *inputs = sys.argv[1:]
parts = []
for spec in inputs:
    label, src = spec.split("=", 1)
    parts.append({"text": f"{label}:"})
    if src.startswith("http"):
        parts.append({"file_data": {"file_uri": src}})
    elif src.endswith(".json"):
        fi = json.load(open(src))
        parts.append({"file_data": {"mime_type": fi["mimeType"], "file_uri": fi["uri"]}})
    else:
        mime = mimetypes.guess_type(src)[0] or "audio/mpeg"
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(open(src, "rb").read()).decode()}})
parts.append({"text": open(prompt_path).read()})
r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  headers={"x-goog-api-key": KEY}, timeout=1500,
                  json={"contents": [{"role": "user", "parts": parts}], "generationConfig": {"temperature": 0.3}})
d = r.json()
if "candidates" not in d:
    print(json.dumps(d)[:2000]); sys.exit(1)
txt = "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"] if not p.get("thought"))
open(out, "w").write(txt)
print(txt)
