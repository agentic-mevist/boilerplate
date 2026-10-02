"""Generate a music bed with the Gemini API (Lyria). usage: python lyria.py <model> <out-prefix> "<prompt>"
Saves every audio part of the response as <out-prefix>_<k>.<ext> and prints any text parts."""
import os, sys, json, base64, urllib.request, mimetypes
model, out, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
body = {"contents": [{"parts": [{"text": prompt}]}]}
req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json",
                             "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
try:
    d = json.load(urllib.request.urlopen(req, timeout=900))
except urllib.error.HTTPError as e:
    sys.exit(f"HTTP {e.code}: {e.read().decode()[:2000]}")
k = 0
for c in d.get("candidates", []):
    for p in c.get("content", {}).get("parts", []):
        if "inlineData" in p:
            mt = p["inlineData"]["mimeType"]
            ext = {"audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav"}.get(mt.split(";")[0], mimetypes.guess_extension(mt.split(";")[0]) or ".bin")
            fn = f"{out}_{k}{ext}"; open(fn, "wb").write(base64.b64decode(p["inlineData"]["data"])); print("saved", fn, mt); k += 1
        elif "text" in p:
            print("text:", p["text"][:1500])
if not k:
    print(json.dumps(d)[:2000])
