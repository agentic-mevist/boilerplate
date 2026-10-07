"""ElevenLabs TTS via FAL. usage: fal_tts.py <endpoint> <voice> <text_file> <out_prefix> [json extra params]
Writes <out_prefix>.mp3 and <out_prefix>.json (full response incl. timestamps)."""
import os, sys, json, requests
ep, voice, text_file, out = sys.argv[1:5]
extra = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
body = {"text": open(text_file).read().strip(), "voice": voice, "timestamps": True, **extra}
for attempt in range(3):
    try:
        r = requests.post(f"https://fal.run/{ep}", headers={"Authorization": f"Key {os.environ['FAL_API_KEY']}"}, json=body, timeout=900)
        d = r.json(); break
    except Exception as e:
        print("retry", e); continue
if "audio" not in d:
    sys.exit(json.dumps(d)[:1500])
open(out + ".json", "w").write(json.dumps(d))
open(out + ".mp3", "wb").write(requests.get(d["audio"]["url"], timeout=300).content)
print(out + ".mp3", "timestamps:", type(d.get("timestamps")).__name__, len(d.get("timestamps") or []))
