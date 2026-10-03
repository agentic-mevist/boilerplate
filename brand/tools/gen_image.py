"""Generate an image with the Gemini API. usage: python gen_image.py <model> <out.png> "<prompt>" [ref.png ...]"""
import os, sys, json, base64, mimetypes, urllib.request

model, out, prompt, refs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
parts = [{"text": prompt}]
for r in refs:
    parts.append({"inline_data": {"mime_type": mimetypes.guess_type(r)[0], "data": base64.b64encode(open(r, "rb").read()).decode()}})
body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1"}}}
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json",
                             "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f"HTTP {e.code}: {e.read().decode()[:600]}")
for p in d["candidates"][0]["content"]["parts"]:
    if "inlineData" in p:
        open(out, "wb").write(base64.b64decode(p["inlineData"]["data"]))
        print("wrote", out)
        break
else:
    sys.exit("no image: " + json.dumps(d)[:600])
