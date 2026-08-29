"""Negative control for the quarantine.

An assertion that is never exercised is not evidence. This feeds a KNOWN
held-out row from each hard-quarantined source back through the same check
prepare_data.py uses, and confirms it raises. It also confirms a clean row
passes, so the check is capable of returning both answers.
"""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH, "cycle2-corpus"))
from common import Quarantine, text_hash, EVAL_SAMPLES_PATH  # noqa: E402

results = {}
q = Quarantine()

# 1. a row from the frozen 34-sample eval set must abort
probe = json.load(open(EVAL_SAMPLES_PATH))[0]["text"]
try:
    q.check(probe, "probe", "quarantine_probe")
    results["eval_samples_row_aborts"] = False
except RuntimeError as e:
    results["eval_samples_row_aborts"] = True
    results["eval_samples_message"] = str(e)[:120]

# 2. a provider-eval test row must abort
pe = os.path.join(RESEARCH, "provider-eval", "eval-set.jsonl")
row = next(json.loads(l) for l in open(pe) if json.loads(l).get("corpus_split") == "test")
try:
    q.check(row["text"], "probe", "quarantine_probe")
    results["provider_eval_test_row_aborts"] = False
except RuntimeError:
    results["provider_eval_test_row_aborts"] = True

# 3. a battery row must be DROPPED (soft tier), not admitted silently
bat = q.battery_rows[0][1]
bt = bat.get("text") or bat.get("body") or ""
results["battery_row_reason"] = q.check(bt, "probe", "quarantine_probe")

# 4. a clean row must pass - proving the check can say "clean" too
results["clean_row_reason"] = q.check(
    "The parish council met on Tuesday to discuss the drainage works at Mill Lane. "
    "Three residents spoke against the proposed diversion, arguing that the verge "
    "would be damaged by construction traffic. The clerk agreed to write to the "
    "county highways department before the next meeting in March. No decision was "
    "taken on the footpath resurfacing, which remains deferred pending a quotation.",
    "probe", "quarantine_probe")

# 5. every row of the actual training set is checked against the hard index
train = [json.loads(l) for l in open(os.path.join(HERE, "dataset.jsonl"))]
tc = [r for r in train if r["split"] in ("train", "cal")]
hits = [r["id"] for r in tc if text_hash(r["text"]) in q.hard_hashes]
results["train_cal_rows_checked"] = len(tc)
results["train_cal_hard_collisions"] = len(hits)
results["battery_rows_in_train_cal"] = sum(1 for r in tc if r["source"].startswith("battery-"))

ok = (results["eval_samples_row_aborts"] and results["provider_eval_test_row_aborts"]
      and results["battery_row_reason"] is not None
      and results["clean_row_reason"] is None
      and results["train_cal_hard_collisions"] == 0
      and results["battery_rows_in_train_cal"] == 0)
results["pass"] = bool(ok)
json.dump(results, open(os.path.join(HERE, "quarantine-probe.json"), "w"), indent=2)
print(json.dumps(results, indent=2))
if not ok:
    raise SystemExit("quarantine probe FAILED")
