"""Thin bridge to measure_fingerprint.fingerprint so cycle-5 reuses the
measured paras-per-section variance rather than re-deriving it."""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH, "human-structured-corpus-2026-08-31"))
sys.path.insert(0, os.path.join(RESEARCH, "document-tells-2026-08-31"))

from measure_fingerprint import fingerprint  # noqa: E402


def fingerprint_pps_var(text: str) -> float:
    fp = fingerprint(text)
    v = fp.get("pps_var")
    return float(v) if v is not None else float("nan")
