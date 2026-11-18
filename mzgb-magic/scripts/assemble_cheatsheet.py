"""Assemble content/cheatsheet.md from the hand-written head + research files."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
R = ROOT / "research"

head = (ROOT / "content" / "cheatsheet_head.md").read_text(encoding="utf-8")
enc = (R / "encyclopedia.md").read_text(encoding="utf-8")
dig = (R / "chgk_magic_facts_digest.md").read_text(encoding="utf-8")

# encyclopedia: drop title/intro (before first "## 1.") and section 13 (covered by the head)
enc_body = enc[enc.index("## 1. "):]
enc_body = re.sub(r"## 13\..*?(?=## 14\.)", "", enc_body, flags=re.S)

# digest: drop its h1
dig_body = re.sub(r"^# .*\n", "", dig, count=1)

out = (
    head.rstrip()
    + "\n\n---\n\n# Подробная энциклопедия\n\n"
    + "> **Жирным** — вероятное слово-ответ, ⚠ — спорное или легенда. В конце разделов есть черновые вопросы для самопроверки.\n\n"
    + enc_body.strip()
    + "\n\n---\n\n# «Вечнозелёное» из базы ЧГК\n\n"
    + "> Сводка по 13 448 тематическим вопросам из 335 490 просмотренных (gotquestions.online + выгрузка db.chgk.info). "
    + "[×N] — сколько раз ответ встретился среди тематических вопросов.\n\n"
    + dig_body.strip()
    + "\n"
)
(ROOT / "content" / "cheatsheet.md").write_text(out, encoding="utf-8")
print("cheatsheet.md", len(out), "chars")
