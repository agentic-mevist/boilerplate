# Torch-free replica of encode_record() token layout from Cloudflare's joint_schema_model.py
import json, sys
from tokenizers import Tokenizer
tok = Tokenizer.from_file("hf_clef/tokenizer.json")
T = lambda s: tok.encode(s, add_special_tokens=False).ids
SYSTEM_PROMPT = ("Read the complete state and schema. Decide every field jointly. Each answer "
                 "must be exactly one of that field's allowed options.")
def render(v): return v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
def options(q):
    if q["type"] == "noul":
        c = {"true": "The proposition is true or the answer is yes.", "false": "The proposition is false or the answer is no."}
        c.update(q.get("criteria") or {}); return [(k, c[k]) for k in ("true", "false")]
    if q["type"] == "choice": return sorted((str(k), v) for k, v in q["criteria"].items())
    return [(str(i), v) for i, v in enumerate(q["criteria"])]
def count(rec):
    schema = T("\n\nSCHEMA FIELDS:\n")
    for i, (qid, q) in enumerate(rec["questions"].items()):
        schema += T(f"\nFIELD {i+1}\nID: {qid}\nTYPE: {q['type']}\nINSTRUCTION: ")
        schema += T(render(q.get("instructions") or str(qid))) + T("\nALLOWED OPTIONS:\n")
        for j, (oid, d) in enumerate(options(q)):
            sem = {"option_id": oid}
            if d is not None: sem["description"] = d
            schema += T(f"OPTION {j+1}: ") + T(render(sem)) + T("\n")
        schema += T("END FIELD\n")
    prefix = T(f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\nSTATE:\n")
    suffix = T("\n<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\nJOINT SCHEMA DECISIONS:")
    state = T(render(rec["state"]))
    return len(prefix) + len(schema) + len(suffix), len(state)
api = {}
for l in open("live/timings.jsonl"):
    pass
for name in sys.argv[1:]:
    rec = json.load(open(f"payloads/{name}.json"))
    fixed, st = count(rec)
    print(f"{name:32s} fixed(prefix+schema+suffix)={fixed:6d}  state={st:6d}  full={fixed+st:6d}")
