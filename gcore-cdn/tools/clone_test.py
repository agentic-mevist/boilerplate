"""Audition the cloning engines on one chapter and let Gemini judge them against Andre's real voice.
usage: clone_test.py [chapter_id=edge] [engine ...]"""
import json, subprocess, sys
from pathlib import Path
import make_vo

ROOT = Path(__file__).resolve().parent.parent
chap = sys.argv[1] if len(sys.argv) > 1 else "edge"
engines = sys.argv[2:] or ["minimax", "chatterbox", "indextts2", "qwen3"]
ch = next(c for c in json.loads((ROOT / "script" / "script.json").read_text()) if c["id"] == chap)
text = make_vo.tts_text("qwen3", ch)
out = ROOT / "audio" / "ref" / "audition"; out.mkdir(parents=True, exist_ok=True)
args = [f"REAL ANDRE (reference recording)={ROOT / 'audio/ref/andre_ref.mp3'}"]
for e in engines:
    f = out / f"{chap}_{e}.mp3"
    if not f.exists():
        try:
            make_vo.tts(e, text, f)
        except Exception as ex:
            print(e, "failed:", str(ex)[:300]); continue
    args.append(f"CANDIDATE {e}={f}")
prompt = out / "judge_prompt.txt"
prompt.write_text(f"""The first clip is a real recording of Andre Reitenbach (CEO of Gcore, German accent). The other clips are voice clones
reading this narration line: "{ch['text']}"
For each candidate, rate 1-10: (a) speaker similarity to the real Andre (timbre, pitch, accent), (b) naturalness / no robotic
artifacts, (c) pronunciation accuracy of the text (list any misread or skipped words), (d) suitability as an energetic but
credible explainer narration. Then rank the candidates and recommend one. Be strict and specific.""")
subprocess.run([sys.executable, str(ROOT / "tools/gemini_multi.py"), "gemini-3.1-pro-preview", str(out / f"judge_{chap}.txt"), str(prompt), *args])
