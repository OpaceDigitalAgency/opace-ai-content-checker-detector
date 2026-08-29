"""Tests for the minimum-evidence verdict rule (segments-v3).

The rule: a document is flagged when its highest section score clears
THRESHOLD_PROB, **or** its second-highest clears SECONDARY_THRESHOLD_PROB.
Two sections agreeing at a lower point is better evidence than one section
alone. Both numbers are candidate E in docs/measurements/AGGREGATION-AND-RHYTHM.md
section 2, fitted at a matched human false-positive budget.

Every test enters at `POST /v1/check` over HTTP and traverses the real chain --
origin gate, automation gate, a genuinely solved 14-bit proof of work, the
token exchange, the limiters -- for the reason test_global_pacing.py gives: a
control tested from the inside is not tested at all. What is substituted is
`_score_document`, so that section scores can be placed exactly on and around
the two flag points. Segmentation itself is unchanged in v3 and is covered by
test_segments.py; what changed, and what is under test here, is the step that
combines section scores into a verdict.

Run:
  PYTHONPATH=<research .venv site-packages> python3 -m pytest test_aggregation.py -q
"""
from __future__ import annotations

import hashlib
import os

import pytest

os.environ.setdefault("TOKEN_SECRET", "test-secret-not-a-real-one")
os.environ.setdefault("QUOTA_BACKEND", "memory")
# Set explicitly: _gate() now fails CLOSED, so leaving this empty would refuse
# every request rather than skip the check.
os.environ.setdefault("ALLOWED_ORIGINS", "https://opace.agency")

import app as srv                                   # noqa: E402
from fastapi.testclient import TestClient           # noqa: E402

BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
ORIGIN = "https://opace.agency"
TEXT = " ".join(["The committee reviewed the quarterly submission and recorded "
                 "its findings before circulating them"] * 20)

PRIMARY = srv.THRESHOLD_PROB
SECONDARY = srv.SECONDARY_THRESHOLD_PROB


def _row(index: int, p: float) -> dict:
    """One section row shaped exactly as _score_document builds it."""
    return {"index": index, "word_start": index * 10, "word_end": index * 10 + 10,
            "words": 10, "char_start": index * 60, "char_end": index * 60 + 60,
            "probability_ai": round(p, 4), "margin": round(p, 6),
            "flagged": bool(p >= srv.THRESHOLD_PROB), "tokens_scored": 100,
            "truncated": False}


class Harness:
    def __init__(self, monkeypatch) -> None:
        monkeypatch.setattr(srv, "REQUEST_LIMITER", srv.WeightedLimiter(
            [(60, srv.REQ_PER_MINUTE), (3600, srv.REQ_PER_HOUR),
             (86400, srv.REQ_PER_DAY)]))
        monkeypatch.setattr(srv, "INFERENCE_LIMITER", srv.WeightedLimiter(
            [(60, srv.INF_PER_MINUTE), (3600, srv.INF_PER_HOUR),
             (86400, srv.INF_PER_DAY)]))
        monkeypatch.setattr(srv, "_TOKEN_USES", {})
        quota = srv.GlobalQuota()
        monkeypatch.setattr(srv, "QUOTA", quota)
        self.monkeypatch = monkeypatch
        self.client = TestClient(srv.APP)
        self._prefix = 0

    def sections(self, probs: list[float]) -> None:
        """Pin the section scores this document will come back with."""
        rows = [_row(i, p) for i, p in enumerate(probs)]
        self.monkeypatch.setattr(
            srv, "_score_document", lambda text, _r=rows: (list(_r), len(_r)))

    def _headers(self) -> dict:
        self._prefix += 1
        return {"user-agent": BROWSER_UA, "origin": ORIGIN,
                "x-forwarded-for": f"198.51.100.1, 2001:db8:0:{self._prefix:x}::1"}

    def verdict(self, probs: list[float]) -> dict:
        self.sections(probs)
        head = self._headers()
        chal = self.client.get("/v1/challenge", headers=head).json()
        nonce = 0
        while srv._leading_zero_bits(hashlib.sha256(
                f"{chal['challenge']}:{nonce}".encode()).digest()) < chal["difficulty_bits"]:
            nonce += 1
        tok = self.client.post("/v1/token", headers=head,
                               json={"challenge": chal["challenge"],
                                     "nonce": str(nonce)}).json()["token"]
        res = self.client.post("/v1/check",
                               headers=head | {"x-opace-token": tok},
                               json={"text": TEXT})
        assert res.status_code == 200, res.text
        return res.json()


@pytest.fixture
def h(monkeypatch):
    return Harness(monkeypatch)


# --- the case most likely to break silently ---------------------------------

def test_single_section_documents_are_unaffected_by_definition(h):
    """A one-section document has no second section, so the secondary arm
    cannot fire and the rule reduces exactly to the old one.

    This is asserted explicitly because it is the case that would break
    quietly: an IndexError, or a `second` that silently falls back to the
    maximum and flags every confident single-section document twice over.
    """
    # Just under the primary: must stay clear, and must not consult a second.
    below = h.verdict([PRIMARY - 0.0005])
    assert below["flagged"] is False
    assert below["second_probability_ai"] is None
    assert below["second_segment"] is None
    assert below["flag_reason"] is None
    assert below["segment_count"] == 1

    # At the primary: flags on the primary arm alone.
    at = h.verdict([PRIMARY])
    assert at["flagged"] is True
    assert at["flag_reason"] == "primary"
    assert at["second_probability_ai"] is None

    # A single section sitting above the SECONDARY point but below the primary
    # must NOT flag. If the secondary arm ever reads the maximum when there is
    # no runner-up, this is the assertion that catches it.
    between = h.verdict([SECONDARY + 0.001])
    assert between["flagged"] is False, (
        "a lone section above the secondary point must not flag: the secondary "
        "arm requires a SECOND section")


# --- the two arms ------------------------------------------------------------

def test_primary_arm_fires_on_one_confident_section(h):
    r = h.verdict([PRIMARY + 0.001, 0.10, 0.05])
    assert r["flagged"] is True
    assert r["flag_reason"] == "primary"
    assert r["probability_ai"] == pytest.approx(round(PRIMARY + 0.001, 4))


def test_secondary_arm_fires_when_two_sections_agree(h):
    """Neither section clears the primary, both clear the secondary. This is
    the change: under the old rule this document was cleared."""
    r = h.verdict([PRIMARY - 0.002, SECONDARY + 0.002, 0.2])
    assert r["flagged"] is True
    assert r["flag_reason"] == "secondary"
    assert r["second_probability_ai"] == pytest.approx(round(SECONDARY + 0.002, 4))
    assert r["second_segment"] == 1


def test_one_strong_section_alone_does_not_reach_the_secondary_arm(h):
    """Highest just below the primary, second well below the secondary:
    still clear. The rule adds evidence, it does not lower the bar."""
    r = h.verdict([PRIMARY - 0.0005, SECONDARY - 0.05, 0.1])
    assert r["flagged"] is False
    assert r["flag_reason"] is None


def test_nothing_near_either_point_stays_clear(h):
    r = h.verdict([0.4, 0.3, 0.2, 0.1])
    assert r["flagged"] is False
    assert r["flag_reason"] is None


# --- boundaries are inclusive, on both arms ----------------------------------

def test_boundaries_are_inclusive_and_exact(h):
    assert h.verdict([PRIMARY, 0.1])["flagged"] is True
    assert h.verdict([PRIMARY - 0.0001, 0.1])["flagged"] is False
    assert h.verdict([SECONDARY + 0.005, SECONDARY])["flagged"] is True
    assert h.verdict([SECONDARY + 0.005, SECONDARY - 0.0001])["flagged"] is False


def test_primary_wins_the_label_when_both_arms_fire(h):
    r = h.verdict([PRIMARY + 0.005, SECONDARY + 0.005])
    assert r["flagged"] is True
    assert r["flag_reason"] == "primary"


# --- the property maximum aggregation exists for -----------------------------

def test_a_single_ai_section_in_a_human_document_still_flags(h):
    """HANDOVER.md section 4.2. One AI section inside an otherwise human draft
    must still be caught: this is what the mean destroys and what neither the
    old rule nor this one may weaken."""
    r = h.verdict([0.02, 0.03, PRIMARY + 0.004, 0.01, 0.02])
    assert r["flagged"] is True
    assert r["flag_reason"] == "primary"
    assert r["probability_ai"] == pytest.approx(round(PRIMARY + 0.004, 4))
    # And the reported probability is the maximum, never the mean.
    assert r["aggregation"] == "max"


# --- the response carries enough for the client to re-derive the verdict -----

def test_response_exposes_both_thresholds_and_the_rule(h):
    r = h.verdict([PRIMARY - 0.002, SECONDARY + 0.002])
    assert r["threshold"] == PRIMARY
    assert r["secondary_threshold"] == SECONDARY
    assert r["flag_rule"] == "minimum-evidence"
    assert r["aggregation"] == "max"
    assert r["segmentation_contract"] == "segments-v3"
    # The client recomputes the verdict from these and refuses on disagreement.
    top = r["probability_ai"]
    second = r["second_probability_ai"]
    assert r["flagged"] == (top >= r["threshold"]
                            or (second is not None
                                and second >= r["secondary_threshold"]))


def test_thresholds_are_the_measured_pair(h):
    """The pair fitted on BOTH runtimes over the full corpus.

    Not 0.9845/0.9765, which was fitted on fp32 alone and takes browser false
    positives from 90/4,636 to 106/4,636 while cutting server ones -- it is not
    the false-positive-neutral trade it was approved as. Not 0.9865/0.9770
    either, which is the same report's matched-DETECTION pair.
    """
    assert srv.THRESHOLD_PROB == 0.9855
    assert srv.SECONDARY_THRESHOLD_PROB == 0.9763
    # The secondary must sit below the primary or the arm is unreachable.
    assert srv.SECONDARY_THRESHOLD_PROB < srv.THRESHOLD_PROB


# --- the origin gate fails closed --------------------------------------------

def test_origin_gate_refuses_when_the_allowlist_is_empty(monkeypatch):
    """REQUIRE_ORIGIN=1 with no allowlist used to enforce nothing at all.

    A control that silently stops enforcing when a config value goes missing is
    the shape of every verification failure this project has hit. Turning it
    off must be explicit (REQUIRE_ORIGIN=0), not accidental.
    """
    monkeypatch.setattr(srv, "ALLOWED_ORIGINS", [])
    monkeypatch.setattr(srv, "REQUIRE_ORIGIN", True)
    client = TestClient(srv.APP)
    res = client.get("/v1/challenge",
                     headers={"user-agent": BROWSER_UA, "origin": ORIGIN})
    assert res.status_code == 403
    assert res.json()["error"] == "origin_not_allowed"


def test_origin_gate_can_still_be_turned_off_explicitly(monkeypatch):
    monkeypatch.setattr(srv, "ALLOWED_ORIGINS", [])
    monkeypatch.setattr(srv, "REQUIRE_ORIGIN", False)
    client = TestClient(srv.APP)
    res = client.get("/v1/challenge",
                     headers={"user-agent": BROWSER_UA, "origin": ORIGIN})
    assert res.status_code == 200
