import os, sys, json, requests
KEY = os.environ["GEMINI_API_KEY"]
model, file_json, prompt_path, out = sys.argv[1:5]
fi = json.load(open(file_json))
body = {"contents": [{"role": "user", "parts": [
    {"file_data": {"mime_type": fi["mimeType"], "file_uri": fi["uri"]}},
    {"text": open(prompt_path).read()}]}],
    "generationConfig": {"mediaResolution": "MEDIA_RESOLUTION_HIGH", "temperature": 0.4}}
r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  headers={"x-goog-api-key": KEY}, json=body, timeout=900)
d = r.json()
if "candidates" not in d:
    print(json.dumps(d)[:2000]); sys.exit(1)
txt = "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"] if not p.get("thought"))
open(out, "w").write(txt)
print(out, len(txt), d.get("usageMetadata"))
