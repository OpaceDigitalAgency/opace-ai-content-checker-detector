"""Assemble raw/*.jsonl into the two delivered files, in the eval-set shape.

Quarantine rule, as briefed: every candidate is hashed on normalised text and
checked against eval-samples.json, the provider-eval evaluation set and
tests/battery/human-corpus-v1/v2.json. An exact collision aborts the build.
Near-duplicates (12-word shingle overlap above the threshold) are dropped and
counted rather than aborting, because a shingle hit is a heuristic and not
proof of identity - every drop is listed in manifest.json.
"""

from __future__ import annotations

import collections
import hashlib
import json
import os
import random
import sys

import common

HERE = common.HERE
HUMAN_OUT = os.path.join(HERE, "human-longform.jsonl")
AI_OUT = os.path.join(HERE, "ai-longform.jsonl")
SAMPLES = os.path.join(HERE, "samples")
MANIFEST = os.path.join(HERE, "manifest.json")

MIN_WORDS = 400
SHINGLE_OVERLAP = 0.25

HUMAN_FILES = {
    "epmc.jsonl": "europepmc",
    "epmc-2018.jsonl": "europepmc",
    "epmc-2019.jsonl": "europepmc",
    "epmc-2020.jsonl": "europepmc",
    "epmc-2021.jsonl": "europepmc",
    "epmc-review.jsonl": "europepmc",
    "govuk.jsonl": "gov.uk",
    "crs.jsonl": "crs",
    "globalvoices.jsonl": "globalvoices",
    "mongabay.jsonl": "mongabay",
    "edgar.jsonl": "sec-edgar",
    "persuade.jsonl": "persuade",
    "ia-fiction.jsonl": "internet-archive",
}

# Per (source, register) cap, so no single publisher becomes a register.
CAP = 420


def load_raw() -> list[dict]:
    rows = []
    for fn, provider in HUMAN_FILES.items():
        p = os.path.join(common.RAW, fn)
        if not os.path.exists(p):
            print(f"  MISSING {fn}", file=sys.stderr)
            continue
        n = 0
        for line in open(p):
            if not line.strip():
                continue
            d = json.loads(line)
            d["_provider"] = provider
            rows.append(d)
            n += 1
        print(f"  {fn}: {n}")
    return rows


def ai_rows() -> list[dict]:
    p = os.path.join(HERE, "ai-longform-raw.jsonl")
    out = []
    if not os.path.exists(p):
        return out
    for line in open(p):
        if not line.strip():
            continue
        d = json.loads(line)
        if "__error__" in d:
            continue
        out.append(d)
    return out


def shape_human(d: dict) -> dict:
    text = d["text"]
    sha = hashlib.sha256(text.encode()).hexdigest()
    return {
        "id": f"human-longform-{sha[:12]}",
        "side": "human",
        "register": d["register"],
        "provider": d["_provider"],
        "model": "human",
        "era": "human-2010-2022",
        "genre": d.get("genre", d["register"]),
        "text": text,
        "prompt_style": None,
        "tier": "human",
        "word_count": common.words(text),
        "licence": d["licence"],
        "source": d["source"],
        "era_year": d.get("era_year"),
        "source_ref": d.get("source_ref"),
        "publisher": d.get("publisher"),
        "discipline": d.get("discipline"),
        "section_title": d.get("section_title"),
        "sha256": sha,
        "norm_sha256": common.norm_hash(text),
    }


def shape_ai(d: dict) -> dict:
    text = d["text"]
    return {
        "id": d["id"],
        "side": "ai",
        "register": d["register"],
        "provider": d["provider"],
        "model": d["model_requested"],
        "era": "2026-generated",
        "genre": d.get("genre", d["register"]),
        "text": text,
        "prompt_style": d["prompt_style"],
        "tier": d["tier"],
        "word_count": common.words(text),
        "licence": d["licence"],
        "source": d["source"],
        "era_year": 2026,
        "model_served": d.get("model"),
        "domain": d.get("domain"),
        "prompt_id": d.get("prompt_id"),
        "length_band": d.get("length_band"),
        "temperature": d.get("temperature"),
        "generated_at": d.get("generated_at"),
        "usage": d.get("usage"),
        "sha256": d["sha256"],
        "norm_sha256": common.norm_hash(text),
    }


def main():
    print("building quarantine set", flush=True)
    q_hashes, q_shingles, q_counts = common.build_quarantine()
    print(f"  {sum(q_counts.values())} held-out texts, {len(q_hashes)} hashes", flush=True)

    print("reading raw human files")
    raw_human = load_raw()
    # Re-apply the prose test here as well as at fetch time: the fragment rule
    # was added after the fetchers had already run, and rebuilding from raw is
    # cheaper than refetching.
    human, rejected = [], collections.Counter()
    for d in raw_human:
        if common.words(d["text"]) < MIN_WORDS:
            rejected[d["source"]] += 1
            continue
        ok, why = common.looks_like_prose(d["text"], MIN_WORDS)
        if not ok:
            rejected[d["source"]] += 1
            continue
        human.append(shape_human(d))
    print(f"  rejected at rebuild: {dict(rejected)}")
    ai = [shape_ai(d) for d in ai_rows() if common.words(d["text"]) >= MIN_WORDS]
    print(f"  human {len(human)}  ai {len(ai)}")

    stats = {"exact_collisions": [], "near_dupes": [], "internal_dupes": 0}
    seen = set()
    kept = {"human": [], "ai": []}
    per_bucket = collections.Counter()
    rng = random.Random(20260828)
    rng.shuffle(human)

    for row in human + ai:
        nh = row["norm_sha256"]
        if nh in q_hashes:
            stats["exact_collisions"].append({"id": row["id"], "source": row["source"]})
            continue
        if nh in seen:
            stats["internal_dupes"] += 1
            continue
        sh = common.shingles(row["text"])
        if sh:
            hit = len(sh & q_shingles) / len(sh)
            if hit >= SHINGLE_OVERLAP:
                stats["near_dupes"].append({"id": row["id"], "source": row["source"],
                                            "overlap": round(hit, 3)})
                continue
        if row["side"] == "human":
            key = (row["provider"], row["register"])
            if per_bucket[key] >= CAP:
                continue
            per_bucket[key] += 1
        seen.add(nh)
        kept[row["side"]].append(row)

    if stats["exact_collisions"]:
        print(f"ABORT: {len(stats['exact_collisions'])} exact collisions with held-out "
              f"material:\n" + json.dumps(stats["exact_collisions"][:20], indent=2),
              file=sys.stderr)
        sys.exit(2)

    for side, path in (("human", HUMAN_OUT), ("ai", AI_OUT)):
        with open(path, "w") as f:
            for r in kept[side]:
                f.write(json.dumps(r) + "\n")
        print(f"wrote {len(kept[side])} -> {os.path.basename(path)}")

    # per-provider sample files
    os.makedirs(SAMPLES, exist_ok=True)
    groups = collections.defaultdict(list)
    for r in kept["ai"]:
        model_slug = r["model"].split("/")[-1].replace(".", "-")
        groups[(r["provider"], model_slug, r["register"])].append(r)
    for r in kept["human"]:
        groups[(r["provider"], "human", r["register"])].append(r)
    for (prov, model, reg), rows in groups.items():
        d = os.path.join(SAMPLES, prov)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, f"{prov}__{model}__{reg}__2026-08-28.jsonl"), "w") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")
    print(f"wrote {len(groups)} per-provider sample files")

    manifest = {
        "built_at": "2026-08-28",
        "quarantine_sources": q_counts,
        "quarantine_hashes": len(q_hashes),
        "shingle_overlap_threshold": SHINGLE_OVERLAP,
        "exact_collisions": stats["exact_collisions"],
        "near_dupes_dropped": stats["near_dupes"],
        "internal_duplicates_dropped": stats["internal_dupes"],
        "rebuild_rejections": dict(rejected),
        "counts": {
            "human": len(kept["human"]),
            "ai": len(kept["ai"]),
            "human_by_source": dict(collections.Counter(r["source"] for r in kept["human"])),
            "human_by_register": dict(collections.Counter(r["register"] for r in kept["human"])),
            "ai_by_model": dict(collections.Counter(r["model"] for r in kept["ai"])),
            "ai_by_register": dict(collections.Counter(r["register"] for r in kept["ai"])),
            "ai_by_prompt_style": dict(collections.Counter(r["prompt_style"] for r in kept["ai"])),
        },
    }
    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2)
    print("wrote manifest.json")


if __name__ == "__main__":
    main()
