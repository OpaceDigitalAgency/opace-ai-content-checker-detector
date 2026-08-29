"""Build the CYCLE-2 published-register training corpus.

Cycle 1 was trained on chat replies. Measured consequence: the shipped Tier 3
model flags claude-sonnet-4.6 66% of the time on a chat reply and 4% of the time
on an article. This corpus is published-register on BOTH sides - articles,
marketing and SEO copy, social posts, academic writing - and never chat.

Run:  PY=<venv python> python build_corpus.py
Out:  corpus.jsonl, manifest.json  (MANIFEST.md / CORPUS-REPORT.md via report.py)
"""

from __future__ import annotations

import collections
import json
import os
import sys
import time

import common
import sources
from common import Quarantine, assign_splits, balance_registers, text_hash, words

HERE = os.path.dirname(os.path.abspath(__file__))

# Caps chosen to land near register balance rather than raw class balance:
# the failure being fixed is register-specific, so each register needs both
# sides represented, not one big pile of whichever source was cheapest.
CAPS = {
    "gradtex_ai": 2200,
    "gradtex_human": 4200,
    "aita_ai": 600,
    "teichai_ai": 0,   # measured then rejected: see MANIFEST.md, 0.1% prose yield
    "hatbench_ai": 1600,
    "hatbench_human": 1600,
    "maga_ai": 700,
    "maga_human": 900,
    "persuade_human": 700,
    "c4": {
        "business-marketing-copy": 1600,
        "seo-blog-post": 900,
        "journalism": 900,
        "scholarly-web": 300,
    },
}

# What the finished corpus should contain per register, per side. Marketing and
# academic are weighted highest: those are the owner's users, and marketing is
# where the current false positives sit.
REGISTER_TARGETS = {
    "marketing": 1600,
    "article": 1300,
    "academic": 1300,
    "social": 800,
    "report": 450,   # ceiling; the real limit is human business reports
    "reference": 450,
}


def main() -> None:
    t0 = time.time()
    print("== quarantine index ==", flush=True)
    q = Quarantine()
    print(f"  held-out rows indexed: {sum(q.sources.values())} from {q.sources}", flush=True)

    maga_domains: collections.Counter = collections.Counter()

    streams = [
        ("gradtex", sources.gradtex(CAPS["gradtex_ai"], CAPS["gradtex_human"])),
        ("aita", sources.aita(CAPS["aita_ai"])),
        ("teichai", sources.teichai(CAPS["teichai_ai"])),
        ("hatbench", sources.hatbench(CAPS["hatbench_ai"], CAPS["hatbench_human"])),
        ("maga", sources.maga(CAPS["maga_ai"], CAPS["maga_human"], maga_domains)),
        ("c4", sources.c4(CAPS["c4"])),
        ("persuade", sources.persuade(CAPS["persuade_human"])),
        ("openrouter", sources.openrouter()),
        ("battery", sources.battery(q)),
    ]

    records: list[dict] = []
    seen: set[str] = set()
    stats = {
        "kept": collections.Counter(),
        "dropped_dupe": collections.Counter(),
        "dropped_quarantine": collections.Counter(),
    }

    for name, stream in streams:
        print(f"== {name} ==", flush=True)
        for r in stream:
            t = r["text"]
            h = text_hash(t)
            if not h or h in seen:
                stats["dropped_dupe"][name] += 1
                continue

            if r.get("split_pin") == "test" and h in q.battery_hashes:
                # The battery IS the held-out set. It is admitted deliberately,
                # pinned to test, and exempt from its own index - but nothing
                # from any other source is allowed to match it.
                pass
            else:
                reason = q.check(t, r.get("group", h), r["source"])  # raises on eval-set collision
                if reason:
                    stats["dropped_quarantine"][f"{name}:{reason}"] += 1
                    continue

            seen.add(h)
            r["provider"] = sources.normalise_provider(r["provider"])
            r["words"] = len(words(t))
            r["sha256"] = h
            records.append(r)
            stats["kept"][r["source"]] += 1

    print(f"\n== {len(records)} rows collected ==", flush=True)

    balance = balance_registers(records, REGISTER_TARGETS)
    print(f"== {len(records)} rows after register balancing ==", flush=True)
    for k in sorted(balance):
        b = balance[k]
        if "available" not in b:
            print(f"   {k:32s} kept {b['kept']:5d}", flush=True)
            continue
        print(f"   {k:32s} available {b['available']:5d}  target {b['balanced_target']:5d} "
              f"-> kept {b['kept']:5d}", flush=True)

    assign_splits(records)

    # stable ids, ordered by content hash so nothing is index-dependent
    records.sort(key=lambda r: r["sha256"])
    for i, r in enumerate(records):
        r["id"] = f"c2-{r['side']}-{i:05d}-{r['sha256'][:8]}"

    field_order = ["id", "side", "register", "provider", "model", "era", "genre",
                   "edit_level", "split", "source", "licence", "words", "sha256",
                   "note", "ai_token_ratio", "text"]
    out = os.path.join(HERE, "corpus.jsonl")
    with open(out, "w") as f:
        for r in records:
            row = {k: r[k] for k in field_order if k in r}
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    manifest = {
        "built": time.strftime("%Y-%m-%d"),
        "purpose": ("cycle-2 retrain corpus: published-register prose on both sides "
                    "(articles, marketing/SEO, social posts, academic writing), no chat replies"),
        "rows": len(records),
        "by_side": dict(collections.Counter(r["side"] for r in records)),
        "by_source": dict(stats["kept"]),
        "by_register": dict(collections.Counter(r["register"] for r in records)),
        "by_split": dict(collections.Counter(r["split"] for r in records)),
        "by_era": dict(collections.Counter(r["era"] for r in records)),
        "by_provider": dict(collections.Counter(r["provider"] for r in records)),
        "by_genre": dict(collections.Counter(r["genre"] for r in records)),
        "by_edit_level": dict(collections.Counter(str(r.get("edit_level")) for r in records)),
        "licences": sources.LICENCES,
        "caps": CAPS,
        "register_targets": REGISTER_TARGETS,
        "register_balance": balance,
        "quarantine": {
            "held_out_sets": q.sources,
            "primary_rule": ("normalised-text SHA-256 equality; a collision with either evaluation set "
                             "raises and aborts the build, a collision with the regression battery drops "
                             "the candidate and is counted"),
            "secondary_rule": ">10% 8-gram containment against the held-out index drops the candidate",
            "tiers": {
                "hard_abort": ["eval-samples.json", "provider-eval/eval-set.jsonl:test"],
                "soft_drop": ["tests/battery/human-corpus-v*.json"],
            },
            "dropped": dict(stats["dropped_quarantine"]),
            "battery_exemption": ("tests/battery/human-corpus-v*.json rows are admitted as themselves and "
                                  "pinned to split=test; no other source may match them"),
        },
        "dropped_duplicates": dict(stats["dropped_dupe"]),
        "split_rule": ("group-aware, content-hash ordered, 70/15/15 quantile cut applied WITHIN each "
                       "(register, side, provider, era) stratum; never index-based"),
        "maga_domains_seen": dict(maga_domains.most_common(40)),
        "teichai_register_yield": sources.TEICHAI_YIELD,
        "build_seconds": round(time.time() - t0),
    }
    with open(os.path.join(HERE, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    for k in ("by_side", "by_register", "by_split", "by_era"):
        print(k, manifest[k], flush=True)
    print(f"\nwrote {out} ({len(records)} rows) in {manifest['build_seconds']}s", flush=True)


if __name__ == "__main__":
    main()
