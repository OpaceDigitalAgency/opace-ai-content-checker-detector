"""Load the WHOLE locally-cached HAT-Bench, not the ~1,500-row sample cycle 2 used.

HAT-Bench is a human document (v0) progressively rewritten by an LLM: v1 touches
~17% of tokens, v8 100%. `AI_token_ratio` is the exact per-document supervision
signal cycle 2 threw away.

Splits are group-aware on (domain, essay_id) and, where an essay already appears
in the cycle-2 dataset, inherit that row's split so cycle-2's held-out test stays
held out. Nothing here is regenerated or re-fetched: it reads
cycle2-corpus/raw/hat_*.csv only.
"""
from __future__ import annotations

import csv
import glob
import hashlib
import json
import os
import re
import sys
import unicodedata

import common3 as C

csv.field_size_limit(10 ** 9)
RAW = os.path.join(C.RESEARCH, "cycle2-corpus", "raw")
DOMAIN = {"essays": ("academic", "student-essay"),
          "abstracts": ("academic", "research-abstract"),
          "news": ("article", "news"),
          "reports": ("report", "business-report")}


def clean_text(t: str) -> str:
    if not isinstance(t, str):
        return ""
    t = unicodedata.normalize("NFKC", t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def cycle2_hat_splits():
    """sha256(text) -> split, for HAT rows already in the cycle-2 dataset."""
    out = {}
    for r in C.jsonl(C.DATASET2):
        if "hatbench" in (r.get("source") or ""):
            out[hashlib.sha256(r["text"].encode()).hexdigest()] = r["split"]
    return out


def load():
    known = cycle2_hat_splits()
    rows, group_split = [], {}
    for path in sorted(glob.glob(os.path.join(RAW, "hat_*.csv"))):
        base = os.path.basename(path)[4:-4]
        domain, gen = base.split("_", 1)
        register, genre = DOMAIN[domain]
        for r in csv.DictReader(open(path)):
            t = clean_text(r.get("text_clean") or "")
            w = len(t.split())
            if w < 100 or w > 900:
                continue
            ver = r.get("version") or ""
            try:
                ratio = float(r.get("AI_token_ratio") or 0.0)
            except ValueError:
                continue
            group = f"hat:{domain}:{r.get('essay_id')}"
            h = hashlib.sha256(t.encode()).hexdigest()
            sp = known.get(h)
            if sp:
                # test wins over cal wins over train: never demote a held-out group
                prev = group_split.get(group)
                rank = {"test": 3, "cal": 2, "train": 1}
                if prev is None or rank[sp] > rank[prev]:
                    group_split[group] = sp
            rows.append({"text": t, "words": w, "version": ver, "ai_ratio": ratio,
                         "group": group, "register": register, "genre": genre,
                         "generator": gen, "domain": domain,
                         "operation": r.get("operation"), "sha": h,
                         "sent_labels": r.get("sent_labels"),
                         "essay_id": r.get("essay_id")})
    # groups with no cycle-2 assignment: deterministic hash split 72/14/14
    for r in rows:
        g = r["group"]
        if g not in group_split:
            v = int(hashlib.sha256(("c3|" + g).encode()).hexdigest()[:8], 16) % 100
            group_split[g] = "train" if v < 72 else ("cal" if v < 86 else "test")
    for r in rows:
        r["split"] = group_split[r["group"]]
    return rows


if __name__ == "__main__":
    import collections
    rows = load()
    print("rows", len(rows), "groups", len({r['group'] for r in rows}))
    c = collections.Counter((r["split"], r["version"]) for r in rows)
    for k in sorted(c):
        print(k, c[k])
    print("inherited from cycle-2:", len(cycle2_hat_splits()))
