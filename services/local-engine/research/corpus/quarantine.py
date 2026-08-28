"""Eval-set quarantine (absolute rule, CLEAN-PROSE-DETECTION-PLAN.md section 5.1).

The evaluation corpus (eval-samples.json) is TEST-ONLY. Nothing that appears in
it — verbatim or near-verbatim — may enter training or calibration data. This
module enforces that mechanically: every candidate training document is checked
for 8-gram (word-level) containment against every eval text, and the corpus
builder refuses to proceed if any candidate overlaps.

Set EVAL_SAMPLES_PATH to point at the quarantined file. The file is read here
ONLY to build the exclusion index; it is never written into any corpus output.
"""

from __future__ import annotations

import json
import os
import re

DEFAULT_EVAL_PATH = os.environ.get(
    "EVAL_SAMPLES_PATH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)

NGRAM = 8


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def _ngrams(text: str, n: int = NGRAM) -> set[tuple[str, ...]]:
    w = _words(text)
    return {tuple(w[i : i + n]) for i in range(len(w) - n + 1)}


class Quarantine:
    def __init__(self, eval_path: str = DEFAULT_EVAL_PATH):
        if not os.path.exists(eval_path):
            raise FileNotFoundError(
                f"Quarantined eval set not found at {eval_path}; refusing to build "
                "a corpus without the exclusion index (set EVAL_SAMPLES_PATH)."
            )
        with open(eval_path) as f:
            samples = json.load(f)
        self.eval_path = eval_path
        self.n_eval = len(samples)
        self.index: set[tuple[str, ...]] = set()
        for s in samples:
            self.index |= _ngrams(s["text"])

    def overlap_fraction(self, text: str) -> float:
        """Fraction of the candidate's 8-grams that appear in any eval text."""
        grams = _ngrams(text)
        if not grams:
            return 0.0
        return len(grams & self.index) / len(grams)

    def assert_clean(self, text: str, doc_id: str, max_overlap: float = 0.0) -> None:
        frac = self.overlap_fraction(text)
        if frac > max_overlap:
            raise RuntimeError(
                f"QUARANTINE VIOLATION: candidate '{doc_id}' shares {frac:.1%} of its "
                f"8-grams with the quarantined eval set ({self.eval_path}). "
                "Eval data must never enter training or calibration."
            )
