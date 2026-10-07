"""Gemini TTS -> wav. usage: gemini_tts.py <model> <voice> <text_file> <out.wav> [style prompt]"""
import os, sys, json, base64, wave, requests
model, voice, text_file, out = sys.argv[1:5]
style = sys.argv[5] if len(sys.argv) > 5 else ""
text = open(text_file).read().strip()
prompt = f"{style}\n\n{text}" if style else text
body = {"contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]}, json=body, timeout=600)
d = r.json()
try:
    part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
except Exception:
    sys.exit(json.dumps(d)[:1500])
raw = base64.b64decode(part["data"])
if raw[:4] == b"RIFF":
    open(out, "wb").write(raw)
else:
    rate = int(part["mimeType"].split("rate=")[1].split(";")[0]) if "rate=" in part["mimeType"] else 24000
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw)
with wave.open(out) as w:
    print(out, part["mimeType"], "%.2fs" % (w.getnframes() / w.getframerate()))
