"""Why cycle 4a misses the quantisation gate, established rather than guessed.

The gate has been the same since cycle 1: mean fp32->int8 probability drift
under 0.05, and verdict-flip rate under 0.01 at each of the five calibration
thresholds. Cycle 4a's mean drift is 0.0090 and its Spearman 0.99891 - both
comfortable. It fails on the flip rate alone, 0.01204 against 0.01, at one of
the five thresholds. **The limits are never touched by this script.**

A verdict flips when the fp32 and the int8 margin land on opposite sides of a
threshold t. That is the product of two things and only one of them is about
quantisation:

  (a) the size of |m32 - m8| - the quantisation error itself;
  (b) the DENSITY of calibration rows within that distance of t - a property of
      the calibration sample and of where the thresholds fell, not of the
      export.

So this script measures both, for the cycle-3 and the cycle-4a exports, on the
cycle-4a calibration split, and splits that split into rows CARRIED OVER from
cycle 3 and rows ADDED in cycle 4.

Reconstructing the calibration split
------------------------------------
`cycle4-fiction/dataset.jsonl` on disk is no longer the file cycle 4a was
trained and exported on: it was rebuilt for arm C with two further generation
batches, growing from 27,454 rows to 28,295 and the cal split from 3,240 to
3,344. `dataset-manifest-v1.json` is the cycle-4a manifest and records the
difference exactly - train +531, cal +104, test +206, all AI, human untouched.

The 841 added rows are `ai-registers-matched.jsonl` after its first 217 lines
(the first register-breadth attempt, which WAS in cycle 4a) plus all of
`ai-long.jsonl`. Excluding those from the cal split reproduces 3,240 rows and
the exact per-split deltas the v1 manifest records, and the script ASSERTS
that before it measures anything. Without that step every number below would
describe a calibration sample cycle 4a never saw.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

MEAN_DRIFT_LIMIT = 0.05
FLIP_RATE_LIMIT = 0.01
MAX_LEN = 512
V1_CAL_ROWS = 3240
LATE_BATCH_SKIP = 217   # lines of ai-registers-matched.jsonl that were in v1


def norm_sha(t):
    return hashlib.sha256(" ".join(t.split()).lower().encode()).hexdigest()


def margins(model_path, tok, texts, threads=2):
    so = ort.SessionOptions()
    so.log_severity_level = 3
    so.intra_op_num_threads = threads
    s = ort.InferenceSession(model_path, so, providers=["CPUExecutionProvider"])
    names = [i.name for i in s.get_inputs()]
    out = []
    for i in range(0, len(texts), 16):
        e = tok(texts[i:i + 16], truncation=True, max_length=MAX_LEN,
                padding="max_length", return_tensors="np")
        lg = s.run(None, {n: e[n].astype(np.int64) for n in names if n in e})[0]
        out.append(lg[:, 1] - lg[:, 0])
    return np.concatenate(out)


def flips_at(m32, m8, thresholds):
    return {k: {"threshold_margin": t,
                "verdict_flips": int(((m32 > t) != (m8 > t)).sum()),
                "flip_rate": round(float(((m32 > t) != (m8 > t)).mean()), 5)}
            for k, t in thresholds.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--research", required=True)
    ap.add_argument("--cycle4-dir", required=True)
    ap.add_argument("--c3-data", required=True)
    ap.add_argument("--c3-report", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cache", default="")
    a = ap.parse_args()

    C4 = a.cycle4_dir
    M = os.path.join(a.research, "models")
    MODELS = {
        "c4a_fp32": os.path.join(M, "tier3-cycle4-cycle4-e5small-fp32.onnx"),
        "c4a_int8": os.path.join(M, "tier3-cycle4-cycle4-e5small-int8-perchannel.onnx"),
        "c3_fp32": os.path.join(M, "tier3-cycle3-e5small-fp32.onnx"),
        "c3_int8": os.path.join(M, "tier3-cycle3-e5small-int8-perchannel.onnx"),
    }

    c4rep = json.load(open(os.path.join(C4, "train-report-cycle4a.json")))
    c3rep = json.load(open(a.c3_report))
    c4_thr = {k: v["threshold_margin"] for k, v in c4rep["thresholds_cal"].items()}
    c3_thr = {k: v["threshold_margin"] for k, v in c3rep["thresholds_cal"].items()}

    # ---- reconstruct the cycle-4a (v1) calibration split --------------------
    late = set()
    lines = open(os.path.join(C4, "ai-registers-matched.jsonl")).read().splitlines()
    for l in lines[LATE_BATCH_SKIP:]:
        late.add(norm_sha(json.loads(l)["text"]))
    for l in open(os.path.join(C4, "ai-long.jsonl")):
        late.add(norm_sha(json.loads(l)["text"]))

    v1man = json.load(open(os.path.join(C4, "dataset-manifest-v1.json")))
    v2man = json.load(open(os.path.join(C4, "dataset-manifest.json")))
    delta = {k: v2man["new_by_split"][k] - v1man["new_by_split"][k]
             for k in v1man["new_by_split"]}
    seen = {"train": 0, "cal": 0, "test": 0}
    cal = []
    for l in open(os.path.join(C4, "dataset.jsonl")):
        r = json.loads(l)
        if norm_sha(r["text"]) in late:
            seen[r["split"]] += 1
            continue
        if r["split"] == "cal":
            cal.append(r)
    assert seen == delta, f"v1 reconstruction failed: {seen} != {delta}"
    assert len(cal) == V1_CAL_ROWS, f"cal split is {len(cal)}, expected {V1_CAL_ROWS}"
    print(f"v1 cal split reconstructed: {len(cal)} rows; excluded rows match the "
          f"manifest delta exactly {seen}", flush=True)

    c3_ids = {json.loads(l)["id"] for l in open(a.c3_data)}
    carried = np.array([r["id"] in c3_ids for r in cal])
    texts = [r["text"] for r in cal]
    print(f"  {int(carried.sum())} carried over from cycle 3, "
          f"{int((~carried).sum())} added in cycle 4", flush=True)

    tok = AutoTokenizer.from_pretrained(os.path.join(C4, "ckpt-cycle4"))
    m = {}
    for name, path in MODELS.items():
        cache = os.path.join(a.cache, f"margins-{name}.npy") if a.cache else ""
        if cache and os.path.exists(cache):
            m[name] = np.load(cache)
            print(f"  {name}: cached", flush=True)
            continue
        print(f"  scoring {name} ...", flush=True)
        m[name] = margins(path, tok, texts)
        if cache:
            np.save(cache, m[name])

    res = {"cal_rows": len(cal),
           "carried_from_cycle3": int(carried.sum()),
           "added_in_cycle4": int((~carried).sum()),
           "v1_reconstruction_delta": seen}

    def block(m32, m8, thr, label, mask=None, T=None):
        if mask is not None:
            m32, m8 = m32[mask], m8[mask]
        d = np.abs(m32 - m8)
        out = {
            "n": int(len(m32)),
            "abs_margin_drift": {"mean": round(float(d.mean()), 4),
                                 "p50": round(float(np.median(d)), 4),
                                 "p95": round(float(np.percentile(d, 95)), 4),
                                 "max": round(float(d.max()), 4)},
            "mean_abs_margin": round(float(np.abs(m32).mean()), 3),
            "drift_as_share_of_margin": round(float(d.mean() / np.abs(m32).mean()), 5),
            "flips": flips_at(m32, m8, thr),
            "rows_within_mean_drift_of_threshold": {
                k: int((np.abs(m32 - t) <= float(d.mean())).sum())
                for k, t in thr.items()},
            "threshold_span": round(max(thr.values()) - min(thr.values()), 3),
        }
        if T is not None:
            p32 = 1 / (1 + np.exp(-m32 / T))
            p8 = 1 / (1 + np.exp(-m8 / T))
            out["prob_drift_mean"] = round(float(np.abs(p32 - p8).mean()), 4)
        worst = max(f["flip_rate"] for f in out["flips"].values())
        out["worst_flip_rate"] = worst
        out["gate_flip_pass"] = bool(worst < FLIP_RATE_LIMIT)
        res[label] = out
        print(f"  {label:<34} n={out['n']:<5} mean|dm|={out['abs_margin_drift']['mean']:.4f}"
              f"  mean|m|={out['mean_abs_margin']:6.2f}  worst flip={worst:.5f}"
              f"  {'FAIL' if worst >= FLIP_RATE_LIMIT else 'pass'}", flush=True)
        return out

    print("\ncycle-4a export at cycle-4a's own thresholds:")
    block(m["c4a_fp32"], m["c4a_int8"], c4_thr, "c4a_all", T=c4rep["temperature"])
    block(m["c4a_fp32"], m["c4a_int8"], c4_thr, "c4a_carried_rows", carried)
    block(m["c4a_fp32"], m["c4a_int8"], c4_thr, "c4a_added_rows", ~carried)

    print("\ncycle-3 export on the SAME rows at cycle-3's own thresholds "
          "- does the corpus alone break it?")
    block(m["c3_fp32"], m["c3_int8"], c3_thr, "c3_on_c4a_cal_all",
          T=c3rep["temperature"])
    block(m["c3_fp32"], m["c3_int8"], c3_thr, "c3_on_c4a_cal_carried", carried)
    block(m["c3_fp32"], m["c3_int8"], c3_thr, "c3_on_c4a_cal_added", ~carried)

    print("\ncycle-4a export at CYCLE-3's thresholds, and cycle-3 at cycle-4a's "
          "- separates the export from where the thresholds fell:")
    block(m["c4a_fp32"], m["c4a_int8"], c3_thr, "c4a_export_at_c3_thresholds")
    block(m["c3_fp32"], m["c3_int8"], c4_thr, "c3_export_at_c4a_thresholds")

    res["thresholds"] = {"cycle3": c3_thr, "cycle4a": c4_thr}
    json.dump(res, open(a.out, "w"), indent=2)
    print(f"\nwrote {a.out}")


if __name__ == "__main__":
    main()
