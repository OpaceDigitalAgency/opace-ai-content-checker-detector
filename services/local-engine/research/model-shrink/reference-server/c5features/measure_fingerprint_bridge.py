"""Thin bridge to measure_fingerprint.fingerprint so cycle-5 reuses the
measured paras-per-section variance rather than re-deriving it."""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Vendored copy: dependencies live in THIS directory (see struct_features.py).
sys.path.insert(0, HERE)

from measure_fingerprint import fingerprint  # noqa: E402


def fingerprint_pps_var(text: str) -> float:
    fp = fingerprint(text)
    v = fp.get("pps_var")
    return float(v) if v is not None else float("nan")
