"""Part 3: measure the open-source foundation on our own modern corpus.

Every published method reimplemented here runs through one GPT-2 forward pass
per document, using the project's existing `models/gpt2-int8-lmfp16.onnx` and
its tokeniser. No API calls, no new downloads, no spend.

What is implemented, and what is honestly *not*:

  GLTR (Gehrmann, Strobelt & Rush 2019)
      The top-k rank histogram, exactly as described: the share of tokens whose
      observed continuation fell in the observer model's top 10 / 100 / 1,000.
      Faithful, modulo the observer being GPT-2 small rather than GPT-2 XL.

  log-likelihood / log-rank / entropy baselines
      The standard zero-shot baselines reported alongside DetectGPT
      (Mitchell et al. 2023). Faithful.

  Fast-DetectGPT (Bao et al. 2024), analytic conditional-probability curvature
      The sampling-free form: (sum_t log p(x_t) - sum_t E[log p]) divided by
      sqrt(sum_t Var[log p]), all under the observer's own distribution. This is
      the paper's efficient variant and needs a single forward pass. Faithful in
      form; the paper uses far larger scoring models, so the absolute numbers
      here are a floor for the method, not its ceiling.

  Binoculars (Hans et al. 2024) — NOT faithfully implemented, and reported as
      such. Binoculars is log-perplexity divided by the cross-perplexity between
      two *different* models (an observer and a performer). Only one language
      model is available offline on this machine, so the ratio degenerates to
      log-perplexity over the observer's own entropy. That degenerate form is
      computed and labelled `self_binoculars`; it is a lower bound on the real
      method and must not be quoted as Binoculars' score.

  DivEye (surprisal-diversity family) — the published implementation is not
      reproduced. Its central claim, that the *diversity* of the surprisal
      sequence separates the classes better than its mean, is testable directly
      and is tested here as `surprisal_sd`, `surprisal_skew`, `surprisal_kurt`
      and `surprisal_autocorr1`. Reported as "DivEye-inspired", not as DivEye.

  avoid-ai-writing / the project's own rules tier — a keyword-and-pattern
      approach. Represented by the cliché-vocabulary and cliché-phrase rates
      from the interpretable battery, which is what that family reduces to.

  SynthID — not testable. It is a generation-time watermark; none of the
      corpus was generated with it enabled, and there is no detector key. It
      is out of scope for a post-hoc text detector, and saying so is the
      finding.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys

import numpy as np
import onnxruntime as ort
from scipy import stats
from transformers import GPT2TokenizerFast

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
RESULTS = os.path.join(HERE, "results")
GPT2 = os.path.join(RESEARCH, "models", "gpt2-int8-lmfp16.onnx")
TOKDIR = os.path.join(RESEARCH, "models", "gpt2-tokenizer")
MAXTOK = 512
N_PER_SIDE = 600


def log_softmax(x):
    m = x.max(axis=-1, keepdims=True)
    z = x - m
    return z - np.log(np.exp(z).sum(axis=-1, keepdims=True))


def doc_metrics(sess, ids):
    """One forward pass; every published statistic derived from it."""
    out = sess.run(["logits"], {"input_ids": np.array([ids], dtype=np.int64)})[0][0]
    lg = out[:-1].astype(np.float32)
    tgt = np.array(ids[1:], dtype=np.int64)
    lp = log_softmax(lg)                       # [T, V]
    p = np.exp(lp)
    obs = lp[np.arange(len(tgt)), tgt]         # log p of what was actually written

    # GLTR rank bins
    rank = (lg > lg[np.arange(len(tgt)), tgt][:, None]).sum(axis=1)
    n = len(tgt)
    ent = -(p * lp).sum(axis=1)                # predictive entropy per position
    mu = -ent                                  # E[log p] under the model
    var = (p * lp * lp).sum(axis=1) - mu ** 2
    dsurp = -obs                               # surprisal in nats

    logppl = float(-obs.mean())
    m = {
        "gltr_top10": float((rank < 10).mean()),
        "gltr_top100": float((rank < 100).mean()),
        "gltr_top1000": float((rank < 1000).mean()),
        "gltr_beyond1000": float((rank >= 1000).mean()),
        "mean_loglik": float(obs.mean()),
        "log_perplexity": logppl,
        "mean_logrank": float(np.log(rank + 1).mean()),
        "mean_entropy": float(ent.mean()),
        "fast_detectgpt": float((obs.sum() - mu.sum()) / math.sqrt(max(var.sum(), 1e-9))),
        "self_binoculars": float(logppl / max(ent.mean(), 1e-9)),
        "surprisal_sd": float(dsurp.std()),
        "surprisal_skew": float(stats.skew(dsurp)),
        "surprisal_kurt": float(stats.kurtosis(dsurp)),
        "surprisal_autocorr1": float(np.corrcoef(dsurp[:-1], dsurp[1:])[0, 1])
        if n > 3 and dsurp.std() > 1e-9 else 0.0,
        "n_tokens": int(n),
    }
    return m


def thr_for_fpr(h, b):
    h = np.sort(np.asarray(h))
    k = min(max(int(np.ceil(len(h) * (1 - b))) - 1, 0), len(h) - 1)
    return float(np.nextafter(h[k], np.inf))


def auroc(a, h):
    r = stats.rankdata(np.concatenate([a, h]))
    return float((r[:len(a)].sum() - len(a) * (len(a) + 1) / 2.0) / (len(a) * len(h)))


def main() -> None:
    os.makedirs(RESULTS, exist_ok=True)
    docs = [json.loads(l) for l in open(os.path.join(HERE, "corpus", "docs.jsonl"))]
    fresh_ai = [d for d in docs if d["pool"] == "ai-longform"]
    fresh_hu = [d for d in docs if d["pool"] == "human-longform"]
    rng = random.Random(31337)
    samp = (rng.sample(fresh_ai, min(N_PER_SIDE, len(fresh_ai)))
            + rng.sample(fresh_hu, min(N_PER_SIDE, len(fresh_hu))))
    print(f"{len(samp)} documents "
          f"({sum(1 for d in samp if d['side']=='ai')} AI / "
          f"{sum(1 for d in samp if d['side']=='human')} human)", flush=True)

    tok = GPT2TokenizerFast(vocab_file=os.path.join(TOKDIR, "vocab.json"),
                            merges_file=os.path.join(TOKDIR, "merges.txt"))
    o = ort.SessionOptions()
    o.intra_op_num_threads = max(4, (os.cpu_count() or 8) - 2)
    sess = ort.InferenceSession(GPT2, o, providers=["CPUExecutionProvider"])

    out_path = os.path.join(HERE, "corpus", "baseline-metrics.jsonl")
    done = set()
    if os.path.exists(out_path):
        for line in open(out_path):
            done.add(json.loads(line)["id"])
        print(f"resuming: {len(done)} done", flush=True)
    import time
    t0 = time.time()
    with open(out_path, "a") as f:
        for i, d in enumerate(samp):
            if d["id"] in done:
                continue
            ids = tok.encode(d["text"])[:MAXTOK]
            if len(ids) < 40:
                continue
            m = doc_metrics(sess, ids)
            m.update(id=d["id"], side=d["side"], register_family=d["register_family"],
                     provider=d.get("provider"), prompt_style=d.get("prompt_style"),
                     model_tier=d.get("model_tier"))
            f.write(json.dumps(m) + "\n")
            f.flush()
            if i % 50 == 0 and i:
                el = time.time() - t0
                print(f"  {i}/{len(samp)} {el:.0f}s eta {(len(samp)-i)*el/max(i,1):.0f}s",
                      flush=True)

    rows = [json.loads(l) for l in open(out_path)]
    ids = {d["id"] for d in samp}
    rows = [r for r in rows if r["id"] in ids]
    metrics = ["gltr_top10", "gltr_top100", "gltr_top1000", "gltr_beyond1000",
               "mean_loglik", "log_perplexity", "mean_logrank", "mean_entropy",
               "fast_detectgpt", "self_binoculars", "surprisal_sd",
               "surprisal_skew", "surprisal_kurt", "surprisal_autocorr1"]
    res = {"n": len(rows),
           "n_ai": sum(1 for r in rows if r["side"] == "ai"),
           "n_human": sum(1 for r in rows if r["side"] == "human"),
           "sample": "fresh long-form (longform-corpus), never seen by any model",
           "observer_model": "GPT-2 small (124M), int8 with fp16 LM head, 512-token cap",
           "methods": {}}
    for k in metrics:
        a = np.array([r[k] for r in rows if r["side"] == "ai"], dtype=float)
        h = np.array([r[k] for r in rows if r["side"] == "human"], dtype=float)
        a, h = a[np.isfinite(a)], h[np.isfinite(h)]
        au = auroc(a, h)
        # Orient by the overall ordering, not by whichever 1% tail is fatter.
        hi_dir = au >= 0.5
        t1 = float((a > np.quantile(h, 0.99)).mean()) if hi_dir \
            else float((a < np.quantile(h, 0.01)).mean())
        t5 = float((a > np.quantile(h, 0.95)).mean()) if hi_dir \
            else float((a < np.quantile(h, 0.05)).mean())
        res["methods"][k] = {
            "auroc": au, "auroc_oriented": max(au, 1 - au),
            "direction": "AI scores higher" if hi_dir else "AI scores lower",
            "tpr_at_1pc_fpr": t1,
            "tpr_at_5pc_fpr": t5,
            "median_ai": float(np.median(a)), "median_human": float(np.median(h)),
            "n_ai": int(len(a)), "n_human": int(len(h)),
        }
        # per register
        per = {}
        for fam in sorted({r["register_family"] for r in rows}):
            aa = np.array([r[k] for r in rows
                           if r["side"] == "ai" and r["register_family"] == fam])
            hh = np.array([r[k] for r in rows
                           if r["side"] == "human" and r["register_family"] == fam])
            if len(aa) >= 25 and len(hh) >= 25:
                per[fam] = {"n_ai": len(aa), "n_human": len(hh),
                            "auroc_oriented": max(auroc(aa, hh), 1 - auroc(aa, hh))}
        res["methods"][k]["per_register"] = per

    json.dump(res, open(os.path.join(RESULTS, "baselines.json"), "w"), indent=1)
    print(f"\n{'published method':24s} {'AUROC':>7s} {'TPR@1%':>7s} {'TPR@5%':>7s} {'dir':>5s}")
    for k in sorted(metrics, key=lambda k: -res["methods"][k]["auroc_oriented"]):
        d = res["methods"][k]
        print(f"{k:24s} {d['auroc_oriented']:7.3f} {d['tpr_at_1pc_fpr']*100:6.1f}% "
              f"{d['tpr_at_5pc_fpr']*100:6.1f}% {d['direction']:>5s}")


if __name__ == "__main__":
    sys.exit(main())
