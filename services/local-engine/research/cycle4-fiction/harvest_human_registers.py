"""Harvest NEW human material for every register the AI side is about to gain.

The reason this is not optional. Training weights are equalised per
(register, axis, side) cell. Adding AI short-form in a register with no human
counterpart in that cell creates exactly the asymmetry §4.1 of the handover
calls the register confound: the model can satisfy the loss by learning the
subject matter instead of the authorship. Cycle 3 avoided it by keeping the AI
and human short-form sides on the same web-design topics; widening the AI side
means widening the human side with it.

The human short-form corpus already in hand cannot be used, because it is cut
from the same 4,636 documents the false-positive bar is measured on. So this
re-runs the original fetchers into a separate raw directory and drops anything
whose source_ref the measurement corpus already holds.

Free: public APIs, no API cost.

  python3 harvest_human_registers.py govuk mongabay news crs corporate epmc
"""
from __future__ import annotations

import importlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
LF = os.path.join(RESEARCH, "longform-corpus")
NEWRAW = os.path.join(HERE, "raw-new")
os.makedirs(NEWRAW, exist_ok=True)

sys.path.insert(0, LF)
import common  # noqa: E402

# Point every fetcher's output at our own directory BEFORE its module-level
# OUT = os.path.join(common.RAW, ...) is evaluated.
common.RAW = NEWRAW

MEASURED = os.path.join(LF, "human-longform.jsonl")

# module, and the quota argument each fetcher reads from argv[1]. Quotas are
# set well above what is needed because most of what comes back is already in
# the measurement corpus and gets dropped.
FETCHERS = {
    "govuk": ("fetch_govuk", "220"),
    "mongabay": ("fetch_mongabay", "1200"),
    "news": ("fetch_news", "1200"),
    "crs": ("fetch_crs", "900"),
    "corporate": ("fetch_corporate", "140"),
    "epmc": ("fetch_epmc", "140"),
    "essays": ("fetch_essays", "1400"),
}


def used_refs() -> set[str]:
    used = set()
    for line in open(MEASURED, encoding="utf-8", errors="replace"):
        d = json.loads(line)
        if d.get("source_ref"):
            used.add(d["source_ref"])
    return used


def main() -> None:
    names = sys.argv[1:] or list(FETCHERS)
    used = used_refs()
    print(f"{len(used)} source_refs already in the measurement corpus", flush=True)
    for n in names:
        mod, quota = FETCHERS[n]
        print(f"--- {mod} (quota {quota}) -> {NEWRAW}", flush=True)
        sys.argv = [mod, quota]
        try:
            m = importlib.import_module(mod)
            m.main()
        except SystemExit:
            pass
        except Exception as exc:                              # noqa: BLE001
            print(f"  {mod} failed: {type(exc).__name__}: {exc}", flush=True)
            continue

    # Filter every file we just wrote against the measurement corpus.
    total_in = total_out = 0
    for f in sorted(os.listdir(NEWRAW)):
        if not f.endswith(".jsonl") or f.endswith(".filtered.jsonl"):
            continue
        src = os.path.join(NEWRAW, f)
        dst = os.path.join(NEWRAW, f.replace(".jsonl", ".filtered.jsonl"))
        keep = 0
        with open(dst, "w") as out:
            for line in open(src, errors="replace"):
                try:
                    d = json.loads(line)
                except json.JSONDecodeError:
                    continue
                total_in += 1
                if d.get("source_ref") in used:
                    continue
                d["source"] = str(d.get("source", "")) + "-new"
                out.write(json.dumps(d) + "\n")
                keep += 1
        total_out += keep
        print(f"  {f}: kept {keep}", flush=True)
    print(f"DONE {total_out} kept of {total_in}", flush=True)


if __name__ == "__main__":
    main()
