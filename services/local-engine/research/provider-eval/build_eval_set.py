"""Workstream PP - build the provider x era measurement set.

Sources (all already local, downloaded via the research venv):
  - arena140k shard 0 (lmarena-ai/arena-human-preference-140k, CC BY 4.0):
    both assistant responses per battle, 53 models, 2025-04..2025-07.
  - HC3 chatgpt answers (Dec 2022 GPT-3.5) for the openai 2022-23 era.
  - Humans: corpus.jsonl side=human split in {cal,test} ONLY (train is the
    ML workstream's training partition and is excluded) + the 40 fresh
    humans in tests/battery/human-corpus-v1.json (business-marketing
    weighted; 20 of them - the fresh_cal ids in
    eval/final-operating-point.json - were used for tier3 threshold
    SELECTION, so they are flagged in_tier3_selection=true).

Leakage control: any candidate whose sha256 equals a corpus.jsonl TRAIN-split
sha256 is dropped (tier2/tier3 trained on those); overlap with cal/test corpus
rows is kept but flagged corpus_split so measurement can condition on it.
The quarantined eval-samples.json is not read here at all.

Caps: 150 per provider x era slice, seeded RNG, answer-style text 120-700
words, English, non-code, mostly-ASCII.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import re

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "corpus", "raw")
CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")
FRESH = os.path.join(HERE, "..", "..", "..", "..", "tests", "battery", "human-corpus-v1.json")
FOP = os.path.join(HERE, "..", "eval", "final-operating-point.json")
OUT = os.path.join(HERE, "eval-set.jsonl")

SEED = 20260828
CAP = 150
MIN_W, MAX_W = 120, 700

# model-id prefix -> (provider, era). Eras follow model release dates:
# 2022-23 (HC3 gpt-3.5), 2024-25 (2024 releases), 2025-26 (2025 releases).
MODEL_MAP = [
    # anthropic
    (r"^claude-3-5-", ("anthropic", "2024-25")),
    (r"^claude-3-7-", ("anthropic", "2025-26")),
    (r"^claude-(opus|sonnet)-4", ("anthropic", "2025-26")),
    # openai
    (r"^gpt-4o-mini-2024|^gpt-4o-2024", ("openai", "2024-25")),
    (r"^o3-|^o3-mini|^o4-mini|^gpt-4\.1|^chatgpt-4o-latest", ("openai", "2025-26")),
    # google (gemini only; gemma excluded so the Gemini hypothesis is clean)
    (r"^gemini-2\.0-", ("google", "2024-25")),
    (r"^gemini-2\.5-", ("google", "2025-26")),
    # meta
    (r"^llama-3\.3-", ("meta", "2024-25")),
    (r"^llama-4-", ("meta", "2025-26")),
    # deepseek (v3-0324 and r1-0528 are both 2025 releases)
    (r"^deepseek-", ("deepseek", "2025-26")),
    # xai
    (r"^grok-", ("grok", "2025-26")),
    # mistral
    (r"^mistral-|^magistral-", ("mistral", "2025-26")),
]
MODEL_MAP = [(re.compile(p), v) for p, v in MODEL_MAP]


def classify_model(mid: str):
    for rx, v in MODEL_MAP:
        if rx.search(mid):
            return v
    return None


def mostly_ascii(t: str) -> bool:
    if not t:
        return False
    return sum(1 for ch in t if ord(ch) < 128) / len(t) >= 0.97


def sha(t: str) -> str:
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


def first_assistant_text(conv) -> str | None:
    try:
        for turn in conv:
            if turn.get("role") == "assistant":
                parts = turn.get("content")
                texts = [p.get("text") for p in parts if isinstance(p, dict) and p.get("type") == "text" and p.get("text")]
                return "\n".join(texts) if texts else None
    except Exception:
        return None
    return None


def main() -> None:
    rng = random.Random(SEED)

    train_sha, corpus_split = set(), {}
    with open(CORPUS) as f:
        for line in f:
            d = json.loads(line)
            corpus_split[d["sha256"]] = d["split"]
            if d["split"] == "train":
                train_sha.add(d["sha256"])

    rows = []
    seen = set()

    def add(provider, era, model, text, source, extra=None, cap_words=True):
        h = sha(text)
        if h in seen or h in train_sha:
            return False
        w = len(text.split())
        if w < MIN_W or (cap_words and w > MAX_W) or not mostly_ascii(text):
            return False
        seen.add(h)
        r = {
            "id": f"{provider}-{era}-{h[:10]}",
            "provider": provider,
            "era": era,
            "model": model,
            "side": "ai" if provider != "human" else "human",
            "source": source,
            "words": w,
            "sha256": h,
            "corpus_split": corpus_split.get(h),
            "text": text,
        }
        if extra:
            r.update(extra)
        rows.append(r)
        return True

    # ---- arena shards (shard 0 always; shard 1, downloaded 2026-08-28 from
    # the full HF dataset, tops up thin slices - openai 2024-25 above all) ----
    pools: dict[tuple, list] = {}
    for shard in ("arena140k-shard0.parquet", "arena140k-shard1.parquet"):
        path = os.path.join(RAW, shard)
        if not os.path.exists(path):
            continue
        df = pd.read_parquet(path)
        df = df[(df["language"] == "en") & (~df["is_code"].astype(bool))]
        for _, r in df.iterrows():
            for side in ("a", "b"):
                mid = r[f"model_{side}"]
                pe = classify_model(mid)
                if pe is None:
                    continue
                pools.setdefault(pe, []).append((mid, r[f"conversation_{side}"]))
    for pe, pool in sorted(pools.items()):
        rng.shuffle(pool)
        kept = 0
        for mid, conv in pool:
            if kept >= CAP:
                break
            text = first_assistant_text(conv)
            if text and add(pe[0], pe[1], mid, text, "arena140k-shard0"):
                kept += 1
        print(f"{pe[0]:9s} {pe[1]}  pool={len(pool):5d} kept={kept}", flush=True)

    # ---- HC3 chatgpt: openai 2022-23 ----
    hc3 = []
    with open(os.path.join(RAW, "hc3-all.jsonl")) as f:
        for line in f:
            d = json.loads(line)
            for a in d.get("chatgpt_answers") or []:
                hc3.append(a)
    rng.shuffle(hc3)
    kept = 0
    for a in hc3:
        if kept >= CAP:
            break
        if add("openai", "2022-23", "gpt-3.5-chatgpt-dec2022", a, "hc3-chatgpt"):
            kept += 1
    print(f"openai    2022-23  pool={len(hc3):5d} kept={kept}", flush=True)

    # ---- humans ----
    n_h = 0
    with open(CORPUS) as f:
        for line in f:
            d = json.loads(line)
            if d["side"] == "human" and d["split"] in ("cal", "test"):
                if add("human", "human", None, d["text"], d["source"], {"genre": d["genre"]}):
                    n_h += 1
    fop = json.load(open(FOP))
    t3_cal_ids = set(fop.get("fresh_split", {}).get("cal", []))
    fresh = json.load(open(FRESH))
    n_f = 0
    for d in fresh:
        if add("human", "human", None, d["text"], "fresh-human-corpus-v1",
               {"genre": d["genre"], "fresh_id": d["id"],
                "in_tier3_selection": d["id"] in t3_cal_ids}, cap_words=False):
            n_f += 1
    print(f"humans: corpus cal/test kept={n_h}, fresh kept={n_f}", flush=True)

    with open(OUT, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"total {len(rows)} -> {OUT}", flush=True)


if __name__ == "__main__":
    main()
