"""Score the whole unified corpus with the deployed cycle-2 model.

Same artefact, tokeniser, max_len and calibration as production:
  models/tier3-cycle2-e5small-int8-perchannel.onnx
  cycle2-train/cycle2-checkpoint  (tokeniser)
  temperature 0.8324, deployed browser flag threshold 0.984

Two numbers are recorded per document:
  margin      = logit_ai - logit_human, the raw, uncalibrated quantity
  prob_cal    = sigmoid(margin / 0.8324), the number the interface shows

Read-only over models/: nothing outside signal-science/ is written.
"""
from __future__ import annotations

import json
import os
import sys
import time

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
MODEL = os.path.join(RESEARCH, "models", "tier3-cycle2-e5small-int8-perchannel.onnx")
TOKDIR = os.path.join(RESEARCH, "cycle2-train", "cycle2-checkpoint")
TEMPERATURE = 0.8324
THRESHOLD_DEPLOYED = 0.984
MAX_LEN = 512


class Scorer:
    def __init__(self):
        self.tok = AutoTokenizer.from_pretrained(TOKDIR)
        o = ort.SessionOptions()
        o.intra_op_num_threads = max(4, (os.cpu_count() or 8) - 2)
        self.sess = ort.InferenceSession(MODEL, o, providers=["CPUExecutionProvider"])
        self.names = [i.name for i in self.sess.get_inputs()]

    def margins(self, texts, batch=32):
        out = []
        for i in range(0, len(texts), batch):
            enc = self.tok(texts[i:i + batch], truncation=True, max_length=MAX_LEN,
                           padding=True, return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in self.names if n in enc}
            lg = self.sess.run(None, feed)[0]
            out.append(lg[:, 1] - lg[:, 0])
        return np.concatenate(out) if out else np.zeros(0)


def prob_cal(margin):
    return 1.0 / (1.0 + np.exp(-np.asarray(margin) / TEMPERATURE))


def main() -> None:
    docs = os.path.join(HERE, "corpus", "docs.jsonl")
    out_path = os.path.join(HERE, "corpus", "neural-scores.jsonl")
    done = set()
    if os.path.exists(out_path):
        for line in open(out_path):
            try:
                done.add(json.loads(line)["id"])
            except Exception:                            # noqa: BLE001
                pass
        print(f"resuming: {len(done)} already scored", flush=True)
    rows = [json.loads(l) for l in open(docs, encoding="utf-8")]
    todo = [r for r in rows if r["id"] not in done]
    print(f"{len(todo)} of {len(rows)} to score", flush=True)
    s = Scorer()
    B, t0, n = 32, time.time(), 0
    with open(out_path, "a", encoding="utf-8") as out:
        for i in range(0, len(todo), B):
            chunk = todo[i:i + B]
            m = s.margins([c["text"] for c in chunk], batch=B)
            for d, mm in zip(chunk, m):
                p = float(prob_cal(mm))
                out.write(json.dumps({
                    "id": d["id"], "side": d["side"],
                    "margin": round(float(mm), 6), "prob_cal": round(p, 6),
                    "flagged_0984": p >= THRESHOLD_DEPLOYED,
                }) + "\n")
                n += 1
            out.flush()
            if (i // B) % 40 == 0 and i:
                el = time.time() - t0
                print(f"  {n}/{len(todo)}  {el:.0f}s  eta {(len(todo)-n)*el/n:.0f}s",
                      flush=True)
    print(f"done {n} in {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    sys.exit(main())
