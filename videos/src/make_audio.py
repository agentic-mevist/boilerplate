import json, os, sys, base64, urllib.request, subprocess, concurrent.futures as cf, time

D = os.path.dirname(os.path.abspath(__file__))
key = os.environ["GEMINI_API_KEY"]
MODEL, VOICE = "gemini-3.8-flash-tts", "Puck"
STYLE = ""
script = json.load(open(f"{D}/script.json"))

def tts(text, out):
    if os.path.exists(out):
        return out
    body = {"contents": [{"parts": [{"text": STYLE + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    for attempt in range(5):
        try:
            req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}",
                                         data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(req, timeout=180))
            data = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
            raw = out + ".raw.wav"
            open(raw, "wb").write(data)
            # trim leading/trailing silence, normalise to 48k stereo
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-af",
                            "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse",
                            "-ar", "48000", "-ac", "2", out], check=True)
            os.remove(raw)
            return out
        except Exception as e:
            print("retry", out, e, file=sys.stderr)
            time.sleep(2 ** attempt)
    raise RuntimeError(out)

jobs = []
for s in script:
    for i, b in enumerate(s["beats"]):
        jobs.append((b, f"{D}/audio/{s['id']}_{i:02d}.wav"))
with cf.ThreadPoolExecutor(6) as ex:
    list(ex.map(lambda j: tts(*j), jobs))

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).decode())

# timeline: 0.6s lead-in, 0.35s between beats, 0.9s between scenes
GAP_BEAT, GAP_SCENE, LEAD = 0.35, 0.9, 0.6
t = LEAD
timeline = []
concat = []
for s in script:
    scene = {"id": s["id"], "start": t - (LEAD if not timeline else GAP_SCENE / 2), "beats": []}
    for i, b in enumerate(s["beats"]):
        p = f"{D}/audio/{s['id']}_{i:02d}.wav"
        d = dur(p)
        scene["beats"].append({"t": round(t, 3), "d": round(d, 3), "text": b})
        concat.append((t, p))
        t += d + GAP_BEAT
    t += GAP_SCENE - GAP_BEAT
    timeline.append(scene)
total = t + 0.8
for i, sc in enumerate(timeline):
    sc["end"] = timeline[i + 1]["start"] if i + 1 < len(timeline) else total
json.dump({"total": round(total, 3), "scenes": timeline}, open(f"{D}/timeline.json", "w"), indent=1)

# build narration track with adelay
inputs, filt = [], []
for k, (st, p) in enumerate(concat):
    inputs += ["-i", p]
    ms = int(st * 1000)
    filt.append(f"[{k}:a]adelay={ms}|{ms}[a{k}]")
mix = "".join(f"[a{k}]" for k in range(len(concat))) + f"amix=inputs={len(concat)}:normalize=0,apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[out]"
open(f"{D}/filter.txt", "w").write(";".join(filt) + ";" + mix)
subprocess.run(["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex_script", f"{D}/filter.txt", "-map", "[out]", "-ar", "48000", f"{D}/narration.wav"], check=True)
print("total seconds", round(total, 1), "beats", len(concat))
