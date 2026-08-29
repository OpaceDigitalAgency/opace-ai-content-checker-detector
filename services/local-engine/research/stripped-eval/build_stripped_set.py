"""Workstream REAL - build the stripped measurement set.

Reads provider-eval/eval-set.jsonl (1,896 samples: 1,727 AI + 169 human) and
emits stripped-set.jsonl with identical schema and ids, text replaced by
strip_markdown(text). Also emits strip-audit.json: per-sample furniture
before/after and word-count delta, so the normalisation is auditable.

No sampling, no filtering, no re-splitting: same rows, same order, same ids.
"""

from __future__ import annotations

import json
import os

from strip_markdown import furniture_counts, strip_markdown

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "provider-eval", "eval-set.jsonl")
OUT = os.path.join(HERE, "stripped-set.jsonl")
AUDIT = os.path.join(HERE, "strip-audit.json")


def main() -> None:
    rows = [json.loads(ln) for ln in open(SRC)]
    audit = []
    with open(OUT, "w") as f:
        for d in rows:
            raw = d["text"]
            stripped = strip_markdown(raw)
            before = furniture_counts(raw)
            after = furniture_counts(stripped)
            rw = len(raw.split())
            sw = len(stripped.split())
            audit.append({
                "id": d["id"], "side": d["side"], "provider": d.get("provider"),
                "era": d.get("era"), "genre": d.get("genre"),
                "words_raw": rw, "words_stripped": sw,
                "word_delta": rw - sw,
                "furniture_before": sum(before.values()),
                "furniture_after": sum(after.values()),
                "chars_raw": len(raw), "chars_stripped": len(stripped),
            })
            out = dict(d)
            out["text"] = stripped
            out["words"] = sw
            out["text_variant"] = "stripped"
            f.write(json.dumps(out) + "\n")

    json.dump(audit, open(AUDIT, "w"), indent=1)

    ai = [a for a in audit if a["side"] == "ai"]
    hu = [a for a in audit if a["side"] == "human"]
    for name, s in (("AI", ai), ("HUMAN", hu)):
        wr = sum(a["words_raw"] for a in s)
        ws = sum(a["words_stripped"] for a in s)
        touched = sum(1 for a in s if a["furniture_before"] > 0)
        print(f"{name}: n={len(s)} words {wr}->{ws} ({100*(wr-ws)/wr:.1f}% removed), "
              f"{touched} carried furniture, "
              f"residual furniture {sum(a['furniture_after'] for a in s)}, "
              f"short(<150w) raw {sum(1 for a in s if a['words_raw']<150)} "
              f"-> stripped {sum(1 for a in s if a['words_stripped']<150)}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
