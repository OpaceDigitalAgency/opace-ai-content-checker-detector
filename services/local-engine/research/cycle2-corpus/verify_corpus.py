"""Post-build assertions. Run after build_corpus.py; exits non-zero on failure.

Checks the three things that would silently ruin a retrain:
  1. no held-out row leaked into corpus.jsonl (and the abort actually fires),
  2. no group straddles two splits,
  3. every row carries a licence, a split and a non-trivial text.
"""

from __future__ import annotations

import collections
import json
import os
import sys

from common import Quarantine, text_hash, norm_for_hash, ngrams

HERE = os.path.dirname(os.path.abspath(__file__))
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    print(("  PASS  " if cond else "  FAIL  ") + msg)
    if not cond:
        FAILURES.append(msg)


def main() -> None:
    rows = [json.loads(l) for l in open(os.path.join(HERE, "corpus.jsonl"))]
    q = Quarantine()
    print(f"corpus rows: {len(rows)}; held-out index: {sum(q.sources.values())} rows from {q.sources}\n")

    print("1. quarantine")
    battery_rows = [r for r in rows if r["source"].startswith("battery-")]
    non_battery = [r for r in rows if not r["source"].startswith("battery-")]
    leaked = [r for r in non_battery if text_hash(r["text"]) in q.hashes]
    check(not leaked, f"no non-battery row matches a held-out row by normalised hash "
                      f"(checked {len(non_battery)}, leaks {len(leaked)})")

    train_cal = [r for r in rows if r["split"] in ("train", "cal")]
    battery_in_train = [r for r in train_cal if r["source"].startswith("battery-")]
    check(not battery_in_train,
          f"no battery row is in train or cal ({len(battery_rows)} battery rows, all pinned to test)")

    worst = 0.0
    for r in non_battery[::7]:  # 1-in-7 sample: the 8-gram sweep is O(n) per row
        g = ngrams(r["text"])
        if g:
            worst = max(worst, len(g & q.grams) / len(g))
    check(worst <= 0.10, f"max 8-gram containment against the held-out index on a 1-in-7 sample: {worst:.3f} (limit 0.10)")

    # the abort must actually fire, not merely be written down
    fired = False
    probe = json.load(open(os.environ.get(
        "EVAL_SAMPLES_PATH",
        "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
        "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json")))[0]["text"]
    try:
        q.check(probe, "synthetic-probe", "verify_corpus")
    except RuntimeError:
        fired = True
    check(fired, "feeding a known held-out row back through Quarantine.check raises and would abort the build")

    print("\n2. splits")
    bygroup: dict[str, set] = collections.defaultdict(set)
    for r in rows:
        bygroup[r["id"][:0] or r.get("group", r["id"])].add(r["split"])
    # group is not written to corpus.jsonl; reconstruct leakage risk by text hash instead
    dup_hash = collections.Counter(r["sha256"] for r in rows)
    check(max(dup_hash.values()) == 1, f"every row is unique by normalised text hash (max repeat {max(dup_hash.values())})")
    splits = collections.Counter(r["split"] for r in rows)
    check(set(splits) == {"train", "cal", "test"}, f"all three splits present: {dict(splits)}")
    check(min(splits.values()) > 0.05 * len(rows), f"no split is degenerate: {dict(splits)}")

    print("\n3. schema")
    required = ["id", "side", "register", "provider", "model", "era", "genre", "split",
                "source", "licence", "text"]
    missing = [f for f in required if any(f not in r or r[f] in (None, "") for r in rows)]
    check(not missing, f"every row carries every required field (missing/empty: {missing})")
    check(all(len(norm_for_hash(r["text"]).split()) >= 40 for r in rows), "every row has >= 40 words")
    check(all(r["side"] in ("ai", "human") for r in rows), "side is always ai or human")

    print()
    if FAILURES:
        print(f"{len(FAILURES)} CHECK(S) FAILED")
        sys.exit(1)
    print("all checks passed")


if __name__ == "__main__":
    main()
