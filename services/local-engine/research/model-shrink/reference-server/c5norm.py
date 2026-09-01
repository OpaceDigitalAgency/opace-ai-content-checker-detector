"""Cycle-5 feature z-normalisation — model_lib.apply_norm without torch.

The semantics are copied from `cycle5-train/model_lib.py::apply_norm`, the
function every cycle-5 evaluation score was produced through:

    z = (feats - mean) / sd; clip to +/-clip; non-finite -> 0.0

The mean/sd/clip come from the model config's `feature_norm` block, which is
byte-identical to the checkpoint's train-fitted `feat-norm.json` (verified at
deploy prep). Kept in its own module so the parity tests can exercise it
without importing the whole server (app.py needs fastapi/onnxruntime).
"""
from __future__ import annotations

import math


def z_norm(feats, norm):
    """apply_norm for one 8-vector, plain Python: list[float] -> list[float]."""
    mean, sd, clip = norm["mean"], norm["sd"], float(norm["clip"])
    out = []
    for f, m, s in zip(feats, mean, sd):
        z = (float(f) - m) / s
        if not math.isfinite(z):
            z = 0.0
        elif z > clip:
            z = clip
        elif z < -clip:
            z = -clip
        out.append(z)
    return out
