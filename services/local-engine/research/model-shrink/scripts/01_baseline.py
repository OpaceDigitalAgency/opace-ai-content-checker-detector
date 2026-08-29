"""Baseline: score the DEPLOYED cycle-2 model (int8 per-channel, 34.3 MB) and its
fp32 parent on the held-out longform corpus. Every later candidate is compared
against these numbers on the same rows in the same order."""
import json, os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (DEPLOYED_FP32, DEPLOYED_INT8, OnnxScorer, RESULTS, evaluate,
                    load_longform, save, size_mb)

rows = load_longform()
texts = [r["text"] for r in rows]
print(f"{len(rows)} held-out documents "
      f"({sum(r['side']=='ai' for r in rows)} AI / {sum(r['side']=='human' for r in rows)} human)")

os.makedirs(RESULTS, exist_ok=True)
report = {}
for label, path in (("cycle2-int8-perchannel-DEPLOYED", DEPLOYED_INT8),
                    ("cycle2-fp32", DEPLOYED_FP32)):
    t0 = time.time()
    sc = OnnxScorer(path, label=label)
    lg = sc.logits(texts)
    np.save(os.path.join(RESULTS, f"margins-{label}.npy"), lg[:, 1] - lg[:, 0])
    rep = evaluate(lg[:, 1] - lg[:, 0], rows)
    rep["file"] = os.path.basename(path)
    rep["size_mb"] = size_mb(path)
    rep["wall_seconds"] = round(time.time() - t0, 1)
    report[label] = rep
    print(label, rep["auroc"], rep["operating_points"]["0.0100"]["detection_overall"])

with open(os.path.join(RESULTS, "eval-rows.json"), "w") as f:
    json.dump([{"id": r["id"], "side": r["side"], "register": r["register"]} for r in rows], f)
save("01-baseline.json", report)
