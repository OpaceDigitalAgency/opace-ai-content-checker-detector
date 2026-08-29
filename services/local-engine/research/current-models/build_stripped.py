"""Emit the markdown-stripped variant of current-eval-set.jsonl.

Uses stripped-eval/strip_markdown.py READ-ONLY and unmodified, so the raw vs
stripped comparison here is on the same footing as stripped-eval's own.
"""
from __future__ import annotations
import json, os, sys

sys.dont_write_bytecode = True  # do not leave __pycache__ in stripped-eval/

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "stripped-eval"))
from strip_markdown import furniture_counts, strip_markdown  # noqa: E402

SRC = os.path.join(HERE, "current-eval-set.jsonl")
OUT = os.path.join(HERE, "current-eval-set-stripped.jsonl")
AUDIT = os.path.join(HERE, "strip-audit.json")


def main() -> None:
    rows = [json.loads(l) for l in open(SRC)]
    audit = []
    with open(OUT, "w") as f:
        for d in rows:
            raw = d["text"]
            s = strip_markdown(raw)
            audit.append({
                "id": d["id"], "provider": d["provider"], "era": d["era"],
                "model": d["model"], "register": d["register"],
                "words_raw": len(raw.split()), "words_stripped": len(s.split()),
                "furniture_before": sum(furniture_counts(raw).values()),
                "furniture_after": sum(furniture_counts(s).values()),
            })
            o = dict(d); o["text"] = s; o["words"] = len(s.split())
            o["text_variant"] = "stripped"
            f.write(json.dumps(o) + "\n")
    json.dump(audit, open(AUDIT, "w"), indent=1)
    wr = sum(a["words_raw"] for a in audit); ws = sum(a["words_stripped"] for a in audit)
    print(f"n={len(audit)} words {wr}->{ws} ({100*(wr-ws)/wr:.1f}% removed), "
          f"{sum(1 for a in audit if a['furniture_before']>0)} carried furniture, "
          f"residual {sum(a['furniture_after'] for a in audit)}")


if __name__ == "__main__":
    main()
