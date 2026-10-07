"""Generate a soft, low-key UI sound pack with ElevenLabs Sound Effects v2 (via FAL).
usage: make_sfx.py [kind ...]   → audio/sfx/cand/<kind>_<n>.mp3 (3 candidates per kind)
Pick one candidate per kind into audio/sfx/<kind>.mp3 (see tools/pick_sfx.py)."""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import fal_util

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "audio" / "sfx" / "cand"; OUT.mkdir(parents=True, exist_ok=True)
SOFT = "soft, warm, low-pitched, muted, gentle, subtle, clean studio recording, no high frequencies, no reverb tail, no music"
PACK = {
    "whoosh": ("gentle airy whoosh for a slide transition, smooth low air movement, " + SOFT, 0.9),
    "pop":    ("soft muted pop, like a fingertip tapping a felt-covered wooden table, single short hit, " + SOFT, 0.4),
    "tap":    ("very quiet soft wooden tap, single short muffled knock, " + SOFT, 0.3),
    "stamp":  ("rubber stamp pressed onto paper on a desk, soft muffled thump, single hit, " + SOFT, 0.5),
    "swell":  ("short deep soft cinematic low boom, gentle sub bass thump that fades quickly, " + SOFT, 1.4),
    "chime":  ("two-note rising marimba chime, warm wooden mallet, gentle positive notification, " + SOFT, 1.2),
    "draw":   ("soft felt marker drawing a long line on paper, quiet smooth stroke, " + SOFT, 0.9),
    "rumble": ("distant low ominous rumble swelling and fading, soft, " + SOFT, 2.5),
    "down":   ("soft low descending wooden bloop, gentle negative notification, " + SOFT, 0.5),
}


def gen(job):
    kind, n = job
    prompt, dur = PACK[kind]
    d = fal_util.run("fal-ai/elevenlabs/sound-effects/v2", {"text": prompt, "duration_seconds": max(0.5, dur),
                     "prompt_influence": 0.55, "output_format": "mp3_44100_192"})
    out = OUT / f"{kind}_{n}.mp3"
    fal_util.download(d["audio"]["url"], out)
    return str(out)


if __name__ == "__main__":
    kinds = sys.argv[1:] or list(PACK)
    with ThreadPoolExecutor(8) as ex:
        for p in ex.map(gen, [(k, n) for k in kinds for n in range(3)]):
            print(p)
