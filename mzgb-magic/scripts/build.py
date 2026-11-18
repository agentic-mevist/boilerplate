"""Build the static site: markdown docs -> HTML fragments, validate questions.json."""
import json
import pathlib
import sys

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
CONTENT = ROOT / "content"

DOCS = {"cheatsheet.md": "cheatsheet.html", "method.md": "method.html", "tactics.md": "tactics.html"}


def build_docs():
    md = markdown.Markdown(extensions=["tables", "sane_lists", "toc"])
    for src, dst in DOCS.items():
        p = CONTENT / src
        if not p.exists():
            print(f"skip {src} (missing)")
            continue
        md.reset()
        html = md.convert(p.read_text(encoding="utf-8"))
        html = html.replace("<a href=\"http", "<a target=\"_blank\" rel=\"noopener\" href=\"http")
        (SITE / dst).write_text(html, encoding="utf-8")
        print(f"built {dst}: {len(html)} bytes")


def build_questions():
    qs = json.loads((ROOT / "data" / "questions.json").read_text(encoding="utf-8"))
    ids = set()
    problems = []
    for q in qs:
        for k in ("id", "round", "question", "answer"):
            if not q.get(k):
                problems.append(f"{q.get('id')}: missing {k}")
        if q["id"] in ids:
            problems.append(f"duplicate id {q['id']}")
        ids.add(q["id"])
        if q.get("image") and not (SITE / q["image"]).exists():
            problems.append(f"{q['id']}: image not found {q['image']}")
    if problems:
        print("PROBLEMS:\n  " + "\n  ".join(problems))
        sys.exit(1)
    (SITE / "questions.json").write_text(json.dumps(qs, ensure_ascii=False, indent=1), encoding="utf-8")
    rounds = {}
    for q in qs:
        rounds[q["round"]] = rounds.get(q["round"], 0) + 1
    print(f"questions: {len(qs)} {rounds}")


if __name__ == "__main__":
    build_docs()
    build_questions()
