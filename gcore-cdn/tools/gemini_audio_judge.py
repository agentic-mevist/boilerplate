"""Ask Gemini to compare audio files. usage: gemini_audio_judge.py <model> <prompt> <file1> [file2 ...]"""
import os, sys, base64, subprocess, requests, tempfile
model, prompt, files = sys.argv[1], sys.argv[2], sys.argv[3:]
parts = []
for i, f in enumerate(files):
    mp3 = tempfile.mktemp(suffix=".mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-b:a", "96k", mp3], check=True)
    parts.append({"text": f"Audio {chr(65+i)} ({os.path.basename(f)}):"})
    parts.append({"inline_data": {"mime_type": "audio/mp3", "data": base64.b64encode(open(mp3, "rb").read()).decode()}})
parts.append({"text": prompt})
r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
                  json={"contents": [{"parts": parts}], "generationConfig": {"temperature": 0.3}}, timeout=600)
d = r.json()
print("".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"]) if "candidates" in d else d)
