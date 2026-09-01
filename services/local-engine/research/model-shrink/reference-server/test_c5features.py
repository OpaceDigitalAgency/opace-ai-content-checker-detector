"""Parity tests for the vendored cycle-5 feature extraction (c5features/).

Run:  python test_c5features.py
  or: python -m pytest test_c5features.py -q

The oracle is `cycle5-train/deploy-prep/fixtures/full-vector-golden.json`,
generated directly from the research tree's `struct_features.py::extract()` —
the exact function `train.py` called. The vendored copy in `c5features/` must
reproduce every fixture's full 8-feature vector: equal NaN-mask, values within
1e-9 (the same tolerance the features-v1 TS port was verified to in
PHASE1-PARITY-NOTE-2026-09-01.md).

The fixtures directory is required at test time (it ships in the repo, not in
the container): set C5_FIXTURES to override the default relative location.
"""
from __future__ import annotations

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "c5features"))

from struct_features import FEAT_NAMES, extract  # noqa: E402

FIXTURES = os.environ.get("C5_FIXTURES", os.path.join(
    HERE, "..", "..", "cycle5-train", "deploy-prep", "fixtures"))
GOLDEN = os.path.join(FIXTURES, "full-vector-golden.json")


def _golden():
    with open(GOLDEN) as fh:
        return json.load(fh)


def test_every_golden_fixture_full_vector():
    golden = _golden()
    assert len(golden) == 10, "expected the 10 published fixtures"
    for name, want in golden.items():
        path = os.path.join(FIXTURES, f"{name}.txt")
        text = open(path, encoding="utf-8").read()
        got = extract(text)
        assert len(got) == len(FEAT_NAMES) == 8
        for j, feat in enumerate(FEAT_NAMES):
            w = want[feat]
            g = got[j]
            if w is None:
                assert math.isnan(g), (name, feat, g)
            else:
                assert not math.isnan(g), (name, feat)
                assert abs(g - w) <= 1e-9, (name, feat, g, w)


def test_feature_order_matches_the_training_contract():
    assert FEAT_NAMES == ["wpp_cv", "sec_within15", "pps_var",
                          "body_mode_share", "spp_cv", "adj_overlap",
                          "cadence_rate", "has_structure"]


def test_z_norm_matches_model_lib_semantics():
    """c5norm.z_norm mirrors model_lib.apply_norm: z=(f-mean)/sd, clip +/-4,
    non-finite -> 0. Proven on hand cases against the shipped feature_norm."""
    from c5norm import z_norm
    norm = json.load(open(os.path.join(
        HERE, "model", "tier3-cycle5-full-config.json")))["feature_norm"]
    assert z_norm([float("nan")] * 8, norm) == [0.0] * 8
    z = z_norm(list(norm["mean"]), norm)         # exactly the mean -> zeros
    assert max(abs(v) for v in z) < 1e-6
    big = [m + 100 * s for m, s in zip(norm["mean"], norm["sd"])]
    assert z_norm(big, norm) == [4.0] * 8        # clipped at +clip
    one = [m + s for m, s in zip(norm["mean"], norm["sd"])]
    assert max(abs(v - 1.0) for v in z_norm(one, norm)) < 1e-6


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
    print("all cycle-5 feature parity tests passed")
