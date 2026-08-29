"""Run the interpretable feature battery over the whole unified corpus.

The surprisal features need a background language model. It is built from a
seeded, balanced 1,500 AI / 1,500 human slice which is then marked
`background=true` and excluded from every statistic reported anywhere in this
workstream, so no document contributes to the model that judges it.
"""
from __future__ import annotations

import json
import os
import random
import sys
import time

import features as F

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "corpus", "docs.jsonl")
OUT = os.path.join(HERE, "corpus", "features.jsonl")

META_KEYS = ("id", "side", "register", "register_family", "provider", "model",
             "model_tier", "era", "era_year", "prompt_style", "genre", "source",
             "pool", "words", "c2_split", "seen_in_training", "difficulty",
             "edit_level")


def main() -> None:
    rows = [json.loads(l) for l in open(DOCS, encoding="utf-8")]
    rng = random.Random(20260829)
    ai = [i for i, r in enumerate(rows) if r["side"] == "ai"]
    hu = [i for i, r in enumerate(rows) if r["side"] == "human"]
    bg = set(rng.sample(ai, 1500)) | set(rng.sample(hu, 1500))
    background = F.build_background([rows[i]["text"] for i in bg])
    print(f"background: {len(bg)} docs, "
          f"{len(background[0])} unigram types, {len(background[2])} bigram types",
          flush=True)

    t0 = 0.0
    start = time.time()
    with open(OUT, "w", encoding="utf-8") as out:
        for i, r in enumerate(rows):
            try:
                f = F.extract(r["text"], background)
            except Exception as e:                       # noqa: BLE001
                print(f"  skip {r['id']}: {type(e).__name__}: {e}", flush=True)
                continue
            rec = {k: r.get(k) for k in META_KEYS}
            rec["background"] = i in bg
            rec["f"] = {k: (None if isinstance(v, float) and v != v else round(float(v), 6))
                        for k, v in f.items()}
            out.write(json.dumps(rec) + "\n")
            if i and i % 2000 == 0:
                el = time.time() - start
                print(f"  {i}/{len(rows)}  {el:.0f}s  eta {(len(rows)-i)*el/i:.0f}s",
                      flush=True)
    print(f"done {len(rows)} docs in {time.time()-start:.0f}s -> {OUT}", flush=True)
    print(f"features per doc: {len(F.extract(rows[0]['text'], background))}")


if __name__ == "__main__":
    sys.exit(main())
