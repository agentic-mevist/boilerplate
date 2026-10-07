"""Generate the voice-over, one take per chapter, plus word timings.
usage: make_vo.py <engine> [chapter_id ...]   (no ids = all chapters; existing takes are kept unless named)

engines
  chris       ElevenLabs v3 voice "Chris" (character timestamps from the TTS itself)
  minimax     MiniMax Speech 2.8 HD with a voice cloned from audio/ref/andre_ref.mp3
  chatterbox  Resemble Chatterbox HD, zero-shot clone from the same reference
  indextts2   IndexTTS-2, zero-shot clone from the same reference
  qwen3       Qwen3-TTS 1.7B with a speaker embedding cloned from the same reference
Takes land in audio/vo/<engine>/<id>.mp3 with <id>.words.json = [{w, start, end}] (seconds, within the take).
Cloned takes get their word timings from ElevenLabs forced alignment."""
import json, subprocess, sys
from pathlib import Path
import fal_util

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "audio" / "ref"
# pronunciation fixes, applied per token so TTS words stay 1:1 with script words.
# ElevenLabs reads "G-Core" right; the cloned voice says "Jiko" unless it is spelled "G-Coar" (chosen by ear test vs. Andre).
TTS_FIX = {"Gcore": "G-Core", "Gcore,": "G-Core,", "Gcore:": "G-Core:", "Gcore.": "G-Core."}
CLONE_FIX = {k: v.replace("G-Core", "G-Coar") for k, v in TTS_FIX.items()}


def tts_text(engine, ch):
    fix = TTS_FIX if engine == "chris" else CLONE_FIX
    return " ".join(fix.get(w["w"], w["w"]) for w in ch["words"])


def ref_url(short=False):
    """andre_ref.mp3 = 53 s of clean solo speech (for trained clones); andre_ref_short.mp3 = 16 s (zero-shot prompts)."""
    name = "andre_ref_short" if short else "andre_ref"
    cache = REF / f"{name}.url"
    if not cache.exists():
        cache.write_text(fal_util.upload(str(REF / f"{name}.mp3")))
    return cache.read_text().strip()


def minimax_voice():
    cache = REF / "minimax_voice.json"
    if not cache.exists():
        d = fal_util.run("fal-ai/minimax/voice-clone", {"audio_url": ref_url(), "model": "speech-02-hd",
                                                        "need_volume_normalization": True, "text": "Hello, this is a test."})
        cache.write_text(json.dumps(d))
    return json.loads(cache.read_text())["custom_voice_id"]


def qwen_voice():
    cache = REF / "qwen_voice.json"
    if not cache.exists():
        d = fal_util.run("fal-ai/qwen-3-tts/clone-voice/1.7b", {"audio_url": ref_url(), "reference_text": (REF / "andre_ref.txt").read_text()})
        cache.write_text(json.dumps(d))
    return json.loads(cache.read_text())["speaker_embedding"]["url"]


def tts(engine, text, out):
    if engine == "chris":
        d = fal_util.run("fal-ai/elevenlabs/tts/eleven-v3", {"text": text, "voice": "Chris", "timestamps": True, "stability": 0.5})
        words, cur = [], None
        for ts in d["timestamps"]:
            for c, s, e in zip(ts["characters"], ts["character_start_times_seconds"], ts["character_end_times_seconds"]):
                if c.isspace():
                    cur = None
                    continue
                if cur is None:
                    cur = {"w": "", "start": s, "end": e}; words.append(cur)
                cur["w"] += c; cur["end"] = e
        fal_util.download(d["audio"]["url"], out)
        return words
    if engine == "minimax":
        d = fal_util.run("fal-ai/minimax/speech-2.8-hd", {"prompt": text, "output_format": "url",
            "voice_setting": {"voice_id": minimax_voice(), "speed": 1.0, "english_normalization": True},
            "audio_setting": {"format": "mp3", "sample_rate": 44100, "bitrate": 256000}})
    elif engine == "chatterbox":
        d = fal_util.run("resemble-ai/chatterboxhd/text-to-speech", {"text": text, "audio_url": ref_url(short=True),
                         "exaggeration": 0.45, "cfg": 0.5, "temperature": 0.7, "high_quality_audio": True})
    elif engine == "indextts2":
        d = fal_util.run("fal-ai/index-tts-2/text-to-speech", {"prompt": text, "audio_url": ref_url(short=True)})
    elif engine == "qwen3":
        d = fal_util.run("fal-ai/qwen-3-tts/text-to-speech/1.7b", {"text": text, "language": "English", "max_new_tokens": 2000,
                         "speaker_voice_embedding_file_url": qwen_voice(), "reference_text": (REF / "andre_ref.txt").read_text()})
    else:
        sys.exit(f"unknown engine {engine}")
    fal_util.download(d["audio"]["url"], out)
    return align(out, text)


def align(audio, text):
    d = fal_util.run("fal-ai/elevenlabs/forced-alignment", {"audio_url": fal_util.upload(str(audio)), "text": text})
    return [{"w": w["text"], "start": w["start"], "end": w["end"]} for w in d["words"] if w["text"].strip()]


if __name__ == "__main__":
    engine, only = sys.argv[1], set(sys.argv[2:])
    out_dir = ROOT / "audio" / "vo" / engine; out_dir.mkdir(parents=True, exist_ok=True)
    chapters = json.loads((ROOT / "script" / "script.json").read_text())
    for ch in chapters:
        mp3 = out_dir / f'{ch["id"]}.mp3'
        if (only and ch["id"] not in only) or (not only and mp3.exists()):
            continue
        words = tts(engine, tts_text(engine, ch), mp3)
        (out_dir / f'{ch["id"]}.words.json').write_text(json.dumps(words))
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
                                   capture_output=True, text=True).stdout)
        print(f'{engine}/{ch["id"]}: {dur:.1f}s, {len(words)} words (script {len(ch["words"])})')
