"""Score a document set through the deployed server path with a chosen model.

Runtime: fp32 ONNX under onnxruntime's CPU provider - the server runtime, and
the only runtime any figure produced here may be quoted for. Segmentation is
the deployed segments-v3 module, imported from reference-server so there is one
implementation rather than a copy that can drift.

Calibration temperature is a per-model argument, not a constant: cycle-2 fitted
0.8324 on its own cal split and cycle-3 fits its own. Full-precision segment
probabilities are written out - the operating point is decided by single-digit
numbers of documents, and 4-dp rounding was already measured to be worth one.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

RESEARCH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(RESEARCH, "model-shrink", "reference-server")
sys.path.insert(0, REF)
from segments import segment_text, SEGMENTATION_CONTRACT  # noqa: E402

KEEP = ("id", "side", "register", "genre", "source", "group", "target_len",
        "word_count", "words", "style", "cond", "model_label", "topic",
        "era_year", "prompt_style", "ttr")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--temperature", type=float, required=True)
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", dest="out", required=True)
    ap.add_argument("--threads", type=int, default=8)
    a = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(a.tokenizer)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = a.threads
    opts.log_severity_level = 3
    sess = ort.InferenceSession(a.model, opts, providers=["CPUExecutionProvider"])
    names = [i.name for i in sess.get_inputs()]
    with open(a.model, "rb") as fh:
        model_sha = hashlib.sha256(fh.read()).hexdigest()[:16]

    def count_tokens(strings):
        strings = list(strings)
        if not strings:
            return []
        return [len(ids) for ids in tok(strings, add_special_tokens=False,
                                        truncation=False)["input_ids"]]

    def score(texts, bs=16):
        ps = []
        for i in range(0, len(texts), bs):
            enc = tok(texts[i:i + bs], truncation=True, max_length=512,
                      padding="max_length", return_tensors="np")
            feed = {n: enc[n].astype(np.int64) for n in names if n in enc}
            lg = sess.run(None, feed)[0]
            m = lg[:, 1] - lg[:, 0]
            ps.extend((1.0 / (1.0 + np.exp(-m / a.temperature))).tolist())
        return ps

    t0, n, nseg = time.time(), 0, 0
    with open(a.out, "w") as fo:
        for line in open(a.src):
            r = json.loads(line)
            parts = segment_text(r["text"], count_tokens)
            probs = score([p.text for p in parts])
            rec = {k: r[k] for k in KEEP if k in r}
            rec["model_sha16"] = model_sha
            rec["segmentation_contract"] = SEGMENTATION_CONTRACT
            rec["n_words"] = len(r["text"].split())
            rec["n_seg"] = len(parts)
            rec["seg_p"] = probs
            fo.write(json.dumps(rec) + "\n")
            n += 1
            nseg += len(parts)
            if n % 250 == 0:
                print(f"  {n} docs {nseg} seg {time.time()-t0:.0f}s", flush=True)
    print(f"DONE {a.src} -> {a.out}: {n} docs {nseg} segments "
          f"{time.time()-t0:.0f}s  model {model_sha}", flush=True)


if __name__ == "__main__":
    main()
