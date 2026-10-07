"""Parse script.txt into script.json: chapters with plain text, words, cue indices and highlight flags."""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).parent


def parse(text):
    chapters = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("# "):
            continue
        m = re.match(r"^## (\S+) \| (.+)$", line)
        if m:
            chapters.append({"id": m.group(1), "label": m.group(2).strip(), "raw": ""})
            continue
        chapters[-1]["raw"] += (" " if chapters[-1]["raw"] else "") + line
    for ch in chapters:
        words, cues, pending = [], {}, []
        for tok in ch["raw"].split():
            while tok.startswith("["):
                name, tok = tok[1:].split("]", 1)
                pending.append(name)
            hl = "*" in tok
            clean = tok.replace("*", "")
            for name in pending:
                cues[name] = len(words)
            pending = []
            words.append({"w": clean, "hl": hl})
        ch["words"] = words
        ch["cues"] = cues
        ch["text"] = " ".join(w["w"] for w in words)
        del ch["raw"]
    return chapters


if __name__ == "__main__":
    chapters = parse((HERE / "script.txt").read_text())
    (HERE / "script.json").write_text(json.dumps(chapters, indent=1, ensure_ascii=False))
    total = sum(len(c["words"]) for c in chapters)
    for c in chapters:
        print(f'{c["id"]:10s} {len(c["words"]):3d} words  cues={list(c["cues"])}')
    print("total words", total, "-> ~%.0fs at 165 wpm" % (total / 165 * 60), file=sys.stderr)
