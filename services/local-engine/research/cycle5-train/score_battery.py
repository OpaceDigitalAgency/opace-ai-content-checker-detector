"""Score the cycle-5 evaluation battery, segmented (segments-v3), any model.

Models:
  --model shipped              cycle-2 fp32 ONNX via the reconciliation harness
                               (T=0.8324) — the deployed server route
  --model ckpt:<dir>           a cycle-5 torch checkpoint (fp32, MPS/CPU);
                               temperature read from train-report-<arm>.json
  --model int8:<onnx>,<ckpt>   a cycle-5 int8 ONNX (CPU); features + T from ckpt

Sets (--sets, comma list; default all):
  lf-hu lf-ai ai-shortform human-shortform-widened nine
  matched-eval-ai matched-eval-humans pairs-heldout

Cycle-5 models compute the 8 structural features PER SEGMENT with the same
extraction code used in training, normalised with the checkpoint's own
train-fitted stats. --zero-feats forces the ablation input convention.

Output: <outdir>/<tag>-<set>.jsonl rows {id, side, ..., seg_p, seg_m, seg_words}.
seg_p is the calibrated probability (model's own temperature); seg_m the raw
margin. Resumable by id.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(RESEARCH, "model-shrink", "reference-server"))

from segments import segment_text  # noqa: E402
from struct_features import extract as feat_extract  # noqa: E402
from model_lib import apply_norm, N_FEATS  # noqa: E402

C3SETS = os.path.join(HERE, "c3sets")
PAIRS = os.path.join(RESEARCH, "cycle4-humaniser-pairs")


def load_set(name):
    if name in ("lf-hu", "lf-ai", "ai-shortform", "human-shortform-widened", "nine"):
        p = os.path.join(C3SETS, f"{name}.jsonl")
        rows = [json.loads(l) for l in open(p, errors="replace")]
        for r in rows:
            r.setdefault("side", "ai" if name in ("lf-ai", "ai-shortform") else "human")
        return rows
    if name == "matched-eval-ai":
        rows = [json.loads(l) for l in open(os.path.join(HERE, "matched-eval-ai.jsonl"))]
        for r in rows:
            r["side"] = "ai"
        return rows
    if name == "matched-eval-humans":
        rows = [json.loads(l) for l in open(os.path.join(HERE, "matched-eval-humans.jsonl"))]
        for r in rows:
            r["side"] = "human"
        return rows
    if name == "pairs-heldout":
        rows = []
        for fn in ("corpus-heldout_source.jsonl", "corpus-heldout_rewriter.jsonl",
                   "corpus-heldout_register.jsonl"):
            for l in open(os.path.join(PAIRS, fn)):
                r = json.loads(l)
                rows.append({"id": r["variant_id"], "text": r["output_text"],
                             "side": "ai" if r["class_label"] in
                             ("ai_original", "ai_original_neural_rewrite") else "human",
                             "class_label": r["class_label"],
                             "edit_intensity": r["edit_intensity"],
                             "register": r["register"],
                             "heldout_axis": fn.split("_", 1)[1].split(".")[0],
                             "rewriting_model_family": r.get("rewriting_model_family"),
                             "measurement_overlap": r.get("measurement_overlap")})
        return rows
    raise SystemExit(f"unknown set {name}")


META_KEYS = ("side", "register", "genre", "model", "model_family", "provider",
             "target_len", "ttr", "split", "source", "word_count", "words",
             "class_label", "edit_intensity", "heldout_axis",
             "rewriting_model_family", "measurement_overlap", "eval_only",
             "heldout_reason", "human_partner_id", "legal_bucket", "human_confidence")


class ShippedModel:
    def __init__(self):
        prev = os.getcwd()
        sys.path.insert(0, os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
        os.chdir(os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29"))
        import harness
        os.chdir(prev)
        self.h = harness
        self.T = harness.TEMPERATURE

    def count_tokens(self, ss):
        return self.h.count_tokens(ss)

    def score_segments(self, texts):
        margins = []
        for i in range(0, len(texts), 16):
            ps = self.h.score_batch(texts[i:i + 16])
            margins.extend([float(np.log(p / (1 - p)) * self.T) if 0 < p < 1
                            else (50.0 if p >= 1 else -50.0) for p in ps])
        return margins


class Cycle5Torch:
    def __init__(self, ckpt, zero_feats=False):
        import torch
        from transformers import AutoTokenizer
        from model_lib import load_ckpt
        self.torch = torch
        self.dev = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model, self.norm = load_ckpt(ckpt, device=self.dev)
        self.tok = AutoTokenizer.from_pretrained(ckpt)
        self.zero = zero_feats
        arm = os.path.basename(ckpt.rstrip("/")).replace("ckpt-", "")
        rep = json.load(open(os.path.join(HERE, f"train-report-{arm}.json")))
        self.T = rep["temperature"]

    def count_tokens(self, ss):
        ss = list(ss)
        if not ss:
            return []
        return [len(ids) for ids in self.tok(ss, add_special_tokens=False,
                                             truncation=False)["input_ids"]]

    def feats_for(self, texts):
        z = np.stack([apply_norm(feat_extract(t), self.norm) for t in texts])
        if self.zero:
            z = z * 0.0
        return z.astype(np.float32)

    def score_segments(self, texts):
        torch = self.torch
        out = []
        with torch.no_grad():
            for i in range(0, len(texts), 32):
                chunk = texts[i:i + 32]
                enc = self.tok(chunk, truncation=True, max_length=512,
                               padding=True, return_tensors="pt")
                fz = torch.tensor(self.feats_for(chunk))
                lg = self.model(enc.input_ids.to(self.dev),
                                enc.attention_mask.to(self.dev),
                                fz.to(self.dev)).float().cpu().numpy()
                out.extend((lg[:, 1] - lg[:, 0]).tolist())
        return out


class Cycle5Int8:
    def __init__(self, onnx_path, ckpt, zero_feats=False):
        import onnxruntime as ort
        from transformers import AutoTokenizer
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = int(os.environ.get("ORT_THREADS", "8"))
        opts.log_severity_level = 3
        self.sess = ort.InferenceSession(onnx_path, opts,
                                         providers=["CPUExecutionProvider"])
        self.tok = AutoTokenizer.from_pretrained(ckpt)
        self.norm = json.load(open(os.path.join(ckpt, "feat-norm.json")))
        self.zero = zero_feats
        arm = os.path.basename(ckpt.rstrip("/")).replace("ckpt-", "")
        rep = json.load(open(os.path.join(HERE, f"train-report-{arm}.json")))
        self.T = rep["temperature"]

    def count_tokens(self, ss):
        ss = list(ss)
        if not ss:
            return []
        return [len(ids) for ids in self.tok(ss, add_special_tokens=False,
                                             truncation=False)["input_ids"]]

    def feats_for(self, texts):
        z = np.stack([apply_norm(feat_extract(t), self.norm) for t in texts])
        if self.zero:
            z = z * 0.0
        return z.astype(np.float32)

    def score_segments(self, texts):
        out = []
        for i in range(0, len(texts), 16):
            chunk = texts[i:i + 16]
            enc = self.tok(chunk, truncation=True, max_length=512,
                           padding="max_length", return_tensors="np")
            feed = {"input_ids": enc["input_ids"].astype(np.int64),
                    "attention_mask": enc["attention_mask"].astype(np.int64),
                    "feats": self.feats_for(chunk)}
            lg = self.sess.run(None, feed)[0]
            out.extend((lg[:, 1] - lg[:, 0]).tolist())
        return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--tag", required=True)
    ap.add_argument("--sets", default="lf-hu,lf-ai,ai-shortform,"
                    "human-shortform-widened,nine,matched-eval-ai,"
                    "matched-eval-humans,pairs-heldout")
    ap.add_argument("--outdir", default=os.path.join(HERE, "scores"))
    ap.add_argument("--zero-feats", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)

    if a.model == "shipped":
        m = ShippedModel()
    elif a.model.startswith("ckpt:"):
        m = Cycle5Torch(a.model[5:], zero_feats=a.zero_feats)
    elif a.model.startswith("int8:"):
        onnx_path, ckpt = a.model[5:].split(",")
        m = Cycle5Int8(onnx_path, ckpt, zero_feats=a.zero_feats)
    else:
        raise SystemExit(f"unknown model {a.model}")
    print(f"model={a.model} T={m.T} tag={a.tag}", flush=True)

    for name in a.sets.split(","):
        rows = load_set(name)
        out_path = os.path.join(a.outdir, f"{a.tag}-{name}.jsonl")
        done = set()
        if os.path.exists(out_path):
            for line in open(out_path):
                if line.strip():
                    done.add(json.loads(line)["id"])
        todo = [r for r in rows if r["id"] not in done]
        print(f"[{name}] {len(rows)} rows, {len(done)} done, {len(todo)} to go", flush=True)
        t0 = time.time()
        with open(out_path, "a") as fh:
            for n, r in enumerate(todo, 1):
                parts = segment_text(r["text"], m.count_tokens)
                margins = m.score_segments([p.text for p in parts])
                probs = (1.0 / (1.0 + np.exp(-np.array(margins) / m.T))).tolist()
                rec = {"id": r["id"]}
                for k in META_KEYS:
                    if k in r:
                        rec[k] = r[k]
                rec["n_words"] = len(r["text"].split())
                rec["seg_m"] = [round(float(x), 6) for x in margins]
                rec["seg_p"] = probs
                rec["seg_words"] = [p.words for p in parts]
                fh.write(json.dumps(rec) + "\n")
                if n % 200 == 0:
                    print(f"  {name} {n}/{len(todo)} in {time.time()-t0:.0f}s", flush=True)
                    fh.flush()
        print(f"DONE {name} in {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
