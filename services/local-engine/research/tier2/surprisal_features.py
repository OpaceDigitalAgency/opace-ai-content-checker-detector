"""Tier 2 - surprisal-rhythm feature extraction (the browser-runtime reference).

One forward pass of GPT-2-small (124M) yields a per-token surprisal series
s_t = -log2 P(x_t | x_<t) and per-token ranks. From that single series we
compute four published feature families:

1. DivEye's 9 diversity features - REIMPLEMENTED from the paper description
   ("Diversity Boosts AI-Generated Text Detection", arXiv:2509.18880, TMLR
   02/2026), not from the CC BY-NC reference code:
     distribution: mean, variance, skewness, kurtosis of s_t
     first-order:  mean and variance of ds_t = s_t - s_{t-1}
     second-order: variance, binned entropy (10 equal-width bins) and lag-1
                   autocorrelation of d2s_t = ds_t - ds_{t-1}
2. FourierGPT-style spectral features of the z-scored surprisal series
   (after "FourierGPT", arXiv:2305.04235 lineage): spectral flatness,
   centroid, low-band (<0.1) and high-band (>0.4) power fractions, spectral
   entropy, log-log spectral slope.
3. UID features (GPT-who lineage, arXiv:2310.06202): uid_local (mean squared
   consecutive difference), uid_global (variance duplicated deliberately at a
   different normalisation: variance / mean), uid_power (mean of s^1.25).
4. GLTR rank buckets (arXiv:1906.04043): fraction of tokens whose true rank
   under the model is <10, <100, <1000, >=1000.

All formulas use population moments (ddof=0) unless stated; scipy's default
(Fisher kurtosis, bias-uncorrected skew) is mirrored by explicit formulas so a
TypeScript port needs no scipy. Exact formulas restated in
BROWSER-RUNTIME-SPEC.md with golden vectors.
"""

from __future__ import annotations

import math

import numpy as np
import torch

FEATURE_NAMES = [
    "div_mean", "div_var", "div_skew", "div_kurt",
    "div_d1_mean", "div_d1_var",
    "div_d2_var", "div_d2_entropy", "div_d2_autocorr",
    "sp_flatness", "sp_centroid", "sp_low", "sp_high", "sp_entropy", "sp_slope",
    "uid_local", "uid_global", "uid_power",
    "gltr_r10", "gltr_r100", "gltr_r1000", "gltr_r1000p",
]

MIN_TOKENS = 50  # below this the extractor returns None -> inconclusive
MAX_TOKENS = 1024  # GPT-2 context; longer texts are truncated
ENTROPY_BINS = 10


class SurprisalScorer:
    def __init__(self, model_name: str = "gpt2", device: str | None = None):
        from transformers import GPT2LMHeadModel, GPT2TokenizerFast

        if device is None:
            device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.device = device
        self.tok = GPT2TokenizerFast.from_pretrained(model_name)
        self.model = GPT2LMHeadModel.from_pretrained(model_name).to(device).eval()

    @torch.no_grad()
    def score(self, text: str) -> tuple[np.ndarray, np.ndarray]:
        """Return (surprisal_bits, ranks) for tokens 2..n (first token has no context)."""
        ids = self.tok(text, return_tensors="pt", truncation=True, max_length=MAX_TOKENS
                       ).input_ids.to(self.device)
        logits = self.model(ids).logits[0]  # [n, vocab]
        logprobs = torch.log_softmax(logits[:-1].float(), dim=-1)  # predict token t+1
        targets = ids[0, 1:]
        tok_lp = logprobs[torch.arange(targets.shape[0]), targets]
        surprisal = (-tok_lp / math.log(2)).cpu().numpy()  # bits
        ranks = (logprobs > tok_lp.unsqueeze(1)).sum(dim=1).cpu().numpy() + 1  # 1-based
        return surprisal, ranks.astype(np.int64)


def _skew(x: np.ndarray) -> float:
    m = x.mean()
    s = x.std()
    return float(((x - m) ** 3).mean() / (s**3)) if s > 0 else 0.0


def _kurt(x: np.ndarray) -> float:
    m = x.mean()
    s = x.std()
    return float(((x - m) ** 4).mean() / (s**4) - 3.0) if s > 0 else 0.0


def diveye_features(s: np.ndarray) -> list[float]:
    d1 = np.diff(s)
    d2 = np.diff(d1)
    var_d2 = float(d2.var())
    # binned entropy of d2 (10 equal-width bins across its own range)
    if d2.size and d2.max() > d2.min():
        hist, _ = np.histogram(d2, bins=ENTROPY_BINS)
        p = hist / hist.sum()
        p = p[p > 0]
        ent = float(-(p * np.log2(p)).sum())
    else:
        ent = 0.0
    # lag-1 autocorrelation of d2
    if d2.size > 1 and var_d2 > 0:
        m = d2.mean()
        ac = float(((d2[:-1] - m) * (d2[1:] - m)).mean() / var_d2)
    else:
        ac = 0.0
    return [
        float(s.mean()), float(s.var()), _skew(s), _kurt(s),
        float(d1.mean()), float(d1.var()),
        var_d2, ent, ac,
    ]


def spectral_features(s: np.ndarray) -> list[float]:
    z = (s - s.mean()) / (s.std() if s.std() > 0 else 1.0)
    spec = np.abs(np.fft.rfft(z)) ** 2
    spec = spec[1:]  # drop DC
    n = spec.size
    if n == 0 or spec.sum() == 0:
        return [0.0] * 6
    freqs = np.arange(1, n + 1) / (2.0 * n)  # normalised (0, 0.5]
    p = spec / spec.sum()
    flatness = float(np.exp(np.mean(np.log(spec + 1e-12))) / (spec.mean() + 1e-12))
    centroid = float((freqs * p).sum())
    low = float(p[freqs < 0.1].sum())
    high = float(p[freqs > 0.4].sum())
    ent = float(-(p[p > 0] * np.log2(p[p > 0])).sum() / math.log2(n))
    slope = float(np.polyfit(np.log(freqs), np.log(spec + 1e-12), 1)[0])
    return [flatness, centroid, low, high, ent, slope]


def uid_features(s: np.ndarray) -> list[float]:
    d1 = np.diff(s)
    uid_local = float((d1**2).mean()) if d1.size else 0.0
    uid_global = float(s.var() / s.mean()) if s.mean() > 0 else 0.0
    uid_power = float((s**1.25).mean())
    return [uid_local, uid_global, uid_power]


def gltr_features(ranks: np.ndarray) -> list[float]:
    n = ranks.size
    r10 = float((ranks < 10).sum() / n)
    r100 = float(((ranks >= 10) & (ranks < 100)).sum() / n)
    r1000 = float(((ranks >= 100) & (ranks < 1000)).sum() / n)
    r1000p = float((ranks >= 1000).sum() / n)
    return [r10, r100, r1000, r1000p]


def extract(surprisal: np.ndarray, ranks: np.ndarray) -> list[float] | None:
    if surprisal.size < MIN_TOKENS:
        return None
    return (
        diveye_features(surprisal)
        + spectral_features(surprisal)
        + uid_features(surprisal)
        + gltr_features(ranks)
    )
