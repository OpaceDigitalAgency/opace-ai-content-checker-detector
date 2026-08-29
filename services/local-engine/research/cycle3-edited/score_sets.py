"""Score a set of jsonl-ish record lists with a given checkpoint and cache to disk.

Usage: score_sets.py <ckpt-dir> <out.json> — scores the cycle-2 test split and the
fresh long-form corpus. Records are keyed by id.
"""
from __future__ import annotations

import json
import os
import sys

import common3 as C


def cycle2_test():
    rows = [r for r in C.jsonl(C.DATASET2) if r["split"] == "test"]
    return rows


def longform():
    out = []
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        for r in C.jsonl(os.path.join(C.LONGFORM, name)):
            r["side"] = side
            out.append(r)
    return out


def main():
    ckpt = sys.argv[1] if len(sys.argv) > 1 else C.CYCLE2_CKPT
    out = sys.argv[2] if len(sys.argv) > 2 else "scores-cycle2-baseline.json"
    temp = float(sys.argv[3]) if len(sys.argv) > 3 else C.CYCLE2_TEMPERATURE
    sc = C.Scorer(ckpt, temperature=temp)
    res = {}
    for tag, rows in (("cycle2-test", cycle2_test()), ("longform-fresh", longform())):
        print(f"[{tag}] {len(rows)} rows", flush=True)
        m = sc.margins([r["text"] for r in rows], progress=tag)
        res[tag] = {r["id"]: float(v) for r, v in zip(rows, m)}
    json.dump({"ckpt": ckpt, "temperature": temp, "margins": res},
              open(os.path.join(C.HERE, out), "w"))
    print("wrote", out)


if __name__ == "__main__":
    main()
