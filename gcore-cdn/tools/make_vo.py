"""Generate the voice-over per chapter with ElevenLabs v3 (via FAL) and build word timings.
usage: make_vo.py [chapter_id ...]   (no args = all chapters; existing takes are kept)"""
import json, os, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
VO = ROOT / "audio" / "vo"; VO.mkdir(parents=True, exist_ok=True)
VOICE, EP = "Chris", "fal-ai/elevenlabs/tts/eleven-v3"
# pronunciation fixes, applied per token so TTS words stay 1:1 with script words
TTS_FIX = {"Gcore": "G-Core", "Gcore,": "G-Core,", "Gcore:": "G-Core:", "Gcore.": "G-Core."}

chapters = json.loads((ROOT / "script" / "script.json").read_text())
only = set(sys.argv[1:])
for ch in chapters:
    out = VO / ch["id"]
    if (only and ch["id"] not in only) or (not only and (out.with_suffix(".mp3")).exists()):
        continue
    text = " ".join(TTS_FIX.get(w["w"], w["w"]) for w in ch["words"])
    tf = VO / f'{ch["id"]}.txt'; tf.write_text(text)
    subprocess.run([sys.executable, str(ROOT / "tools" / "fal_tts.py"), EP, VOICE, str(tf), str(out), '{"stability":0.5}'], check=True)
