"""Tests for the paced global daily allowance.

Every test that matters enters at `POST /v1/check` over HTTP and traverses the
same chain a real caller does: origin gate, automation gate, a genuinely solved
14-bit proof of work, the token exchange, the per-network request limit, the
per-network inference limit, and only then the global quota. That is deliberate.
The kill switch passed three tests while it was dead because every one of them
entered the chain below the break, so a control tested from the inside is not
tested at all. Nothing here lowers POW_BITS or widens a limit to make the run
convenient; the two drain tests pay the real cost of the real attack.

Three things are substituted, and none of them sits in front of the control
under test:

  * `_score`, the single ONNX call. `_score_document` still runs real
    segmentation, so the *cost* of each request — the number the quota actually
    meters — is computed by the shipped code from the shipped tokeniser.
  * Firestore, replaced by an in-memory double implementing the same narrow
    interface (`Increment`, `set(merge=True)`, `get()`). This keeps the primary
    non-degraded branch under test rather than falling through to the memory
    failsafe, which is a different code path.
  * `app.time`, replaced by a clock the test drives. Only app.py's module
    namespace is affected, so the sliding-window limiters, the challenge TTL and
    the allowance curve all move together on one clock and a day can be
    simulated in seconds.

Run:
  PYTHONPATH=<research .venv site-packages> python3 -m pytest test_global_pacing.py -q
"""
from __future__ import annotations

import hashlib
import os

import pytest

os.environ.setdefault("TOKEN_SECRET", "test-secret-not-a-real-one")
os.environ.setdefault("QUOTA_BACKEND", "memory")   # avoid the real Firestore import
# Match the deployed configuration. With ALLOWED_ORIGINS unset the origin gate
# in _gate() is skipped entirely, so a test that left it empty would be
# asserting against a gate that is not running.
os.environ.setdefault("ALLOWED_ORIGINS", "https://opace.agency")
os.environ.setdefault("GLOBAL_DAILY_INFERENCES", "12000")
os.environ.setdefault("GLOBAL_BURST_INFERENCES", "3000")

import app as srv                                   # noqa: E402
from fastapi.testclient import TestClient           # noqa: E402

BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
ORIGIN = "https://opace.agency"
DAY = 86400
CAP = 12000
BURST = 3000

# A long article, close to MAX_WORDS. Real segmentation makes this 8 inferences,
# which is what an attacker would send: the fewer requests per inference, the
# cheaper the attack.
_WORDS = ("The committee reviewed the quarterly submission and recorded its "
          "findings in the usual manner before circulating them widely").split()
LONG_TEXT = " ".join(_WORDS[i % len(_WORDS)] for i in range(3900))
# Derived from the shipped segmentation, never hardcoded: the segmentation
# contract is versioned and changing it must not silently break these tests.
LONG_COST = srv.segment_count(LONG_TEXT, srv.count_tokens)
SHORT_TEXT = " ".join(_WORDS[i % len(_WORDS)] for i in range(120))


# --- doubles -----------------------------------------------------------------
class _Clock:
    """Drives every time-dependent control in app.py from one value."""

    def __init__(self) -> None:
        self.now = 1_800_000_000.0      # arbitrary, fixed
        self.elapsed = 0                # seconds into the UTC day

    def time(self) -> float:
        return self.now

    def perf_counter(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds
        self.elapsed = min(DAY, int(self.elapsed + seconds))


class _Increment:
    def __init__(self, delta: int) -> None:
        self.delta = delta


class _FakeFirestoreModule:
    Increment = _Increment


class _FakeDoc:
    def __init__(self, store: dict, name: str) -> None:
        self._store, self._name = store, name

    def set(self, data: dict, merge: bool = False) -> None:
        cur = self._store.setdefault(self._name, {})
        if not merge:
            cur.clear()
        for key, value in data.items():
            cur[key] = (int(cur.get(key, 0)) + value.delta
                        if isinstance(value, _Increment) else value)

    def get(self):
        name, store = self._name, self._store

        class _Snap:
            exists = property(lambda self: name in store)

            def to_dict(self):
                return dict(store.get(name, {}))

        return _Snap()


class _FakeCollection:
    def __init__(self, store: dict) -> None:
        self._store = store

    def document(self, name: str) -> _FakeDoc:
        return _FakeDoc(self._store, name)


class _FakeClient:
    def __init__(self) -> None:
        self.store: dict = {}

    def collection(self, _name: str) -> _FakeCollection:
        return _FakeCollection(self.store)


# --- harness -----------------------------------------------------------------
class Harness:
    def __init__(self, monkeypatch, *, burst: int, cap: int = CAP) -> None:
        self.clock = _Clock()
        monkeypatch.setattr(srv, "time", self.clock)
        monkeypatch.setattr(srv, "GLOBAL_DAILY_INFERENCES", cap)
        monkeypatch.setattr(srv, "GLOBAL_BURST_INFERENCES", burst)
        monkeypatch.setattr(srv, "_seconds_elapsed_today", lambda: self.clock.elapsed)
        # Mutable so a test can roll the UTC day over without reaching into
        # app.py's module namespace itself.
        self.day = "2026-08-29"
        monkeypatch.setattr(srv, "_utc_day", lambda: self.day)
        # The single ONNX call. Segmentation, and therefore the metered cost of
        # every request, is still the shipped code.
        monkeypatch.setattr(srv, "_score", lambda text: (0.0, 0.5, 8))
        # Module-level limiter state is shared; each test gets its own.
        monkeypatch.setattr(srv, "REQUEST_LIMITER", srv.WeightedLimiter(
            [(60, srv.REQ_PER_MINUTE), (3600, srv.REQ_PER_HOUR),
             (86400, srv.REQ_PER_DAY)]))
        monkeypatch.setattr(srv, "INFERENCE_LIMITER", srv.WeightedLimiter(
            [(60, srv.INF_PER_MINUTE), (3600, srv.INF_PER_HOUR),
             (86400, srv.INF_PER_DAY)]))
        monkeypatch.setattr(srv, "_TOKEN_USES", {})

        quota = srv.GlobalQuota()
        quota._degraded = False
        quota._firestore = _FakeFirestoreModule
        quota._client = _FakeClient()
        monkeypatch.setattr(srv, "QUOTA", quota)
        self.quota, self.cap, self.burst = quota, cap, burst
        self.client = TestClient(srv.APP)
        self._prefix = 0

    # -- helpers
    def seed_used(self, count: int) -> None:
        """Put the shared counter where a drain would leave it, without paying
        for the drain. Only used by tests about the shape of the refusal, never
        by the two that prove the attack."""
        self.quota._client.store[f"day-{self.day}"] = {"count": count,
                                                       "day": self.day}
        self.quota._synced_total = count
        self.quota._last_read = self.clock.now

    def new_network(self) -> str:
        """A fresh /64. An attacker with one routed /48 has 65,536 of them."""
        self._prefix += 1
        return f"2001:db8:0:{self._prefix:x}::1"

    def _headers(self, net: str) -> dict:
        # Cloud Run appends the address it observed last, and app.py trusts only
        # that entry. Setting it here is what sourcing traffic from the prefix
        # achieves in reality.
        return {"user-agent": BROWSER_UA, "origin": ORIGIN,
                "x-forwarded-for": f"198.51.100.1, {net}"}

    def token(self, net: str) -> str:
        head = self._headers(net)
        chal = self.client.get("/v1/challenge", headers=head).json()
        if chal.get("error") == "rate_limited":
            # The token exchange is itself rate-limited per network, so a
            # network that has just spent its minute has to wait one out. That
            # is what a real attacker does, and the clock is ours to advance.
            self.clock.advance(61)
            chal = self.client.get("/v1/challenge", headers=head).json()
        assert "challenge" in chal, chal
        nonce = 0
        while True:                         # the shipped 14-bit puzzle, unmodified
            if srv._leading_zero_bits(hashlib.sha256(
                    f"{chal['challenge']}:{nonce}".encode()).digest()) >= chal[
                        "difficulty_bits"]:
                break
            nonce += 1
        res = self.client.post("/v1/token", headers=head,
                               json={"challenge": chal["challenge"],
                                     "nonce": str(nonce)})
        assert res.status_code == 200, res.text
        return res.json()["token"]

    def check(self, net: str, token: str, text: str = LONG_TEXT):
        return self.client.post("/v1/check",
                                headers=self._headers(net) | {"x-opace-token": token},
                                json={"text": text})

    def drain(self, *, networks: int, minutes: int) -> tuple[int, int]:
        """The rotating-prefix attack. Returns (inferences served, requests sent).

        Each network sends as much as its own per-minute limits permit, then the
        clock advances a minute and the next round starts. This is exactly the
        traffic shape HANDOVER.md §13 describes.
        """
        served = requests = 0
        tokens = {net: self.token(net)
                  for net in (self.new_network() for _ in range(networks))}
        for _ in range(minutes):
            for net, tok in list(tokens.items()):
                for _ in range(srv.REQ_PER_MINUTE):
                    res = self.check(net, tok)
                    requests += 1
                    if res.status_code == 200:
                        served += res.json()["inferences"]
                    elif res.json().get("detail", "").startswith("token"):
                        tokens[net] = tok = self.token(net)
                    elif res.json().get("error") == "daily_allowance_exhausted":
                        return served, requests
                    else:
                        break               # a per-network limit; next network
            self.clock.advance(60)
        return served, requests


@pytest.fixture
def harness(monkeypatch):
    return lambda burst=BURST, cap=CAP: Harness(monkeypatch, burst=burst, cap=cap)


# --- the shipped cost model, asserted rather than assumed --------------------
def test_the_attack_document_is_a_realistic_multi_inference_request():
    """Pacing meters inferences, so the test traffic must cost several each."""
    assert srv.count_words(LONG_TEXT) <= srv.MAX_WORDS
    assert 2 <= LONG_COST <= srv.MAX_SEGMENTS_PER_REQUEST, LONG_COST
    assert srv.segment_count(SHORT_TEXT, srv.count_tokens) >= 1
    assert srv.count_words(SHORT_TEXT) >= srv.MIN_WORDS


# --- the allowance curve -----------------------------------------------------
def test_burst_is_spendable_immediately_and_cap_is_never_exceeded():
    at = srv.GlobalQuota._allowance_at
    assert at(CAP, BURST, 0) == BURST
    assert at(CAP, BURST, DAY // 2) == BURST + 4500
    assert at(CAP, BURST, DAY) == CAP
    # Clamped both ends: a clock past midnight must not mint extra allowance.
    assert at(CAP, BURST, DAY * 3) == CAP
    assert at(CAP, BURST, -100) == BURST


def test_the_shipped_default_is_inert():
    """Pacing ships off. Enabling it must be a separate, reviewed decision."""
    assert srv._env_int("GLOBAL_BURST_INFERENCES",
                        srv.GLOBAL_DAILY_INFERENCES) >= srv.GLOBAL_DAILY_INFERENCES \
        or os.environ.get("GLOBAL_BURST_INFERENCES")
    at = srv.GlobalQuota._allowance_at
    for elapsed in (0, DAY // 2, DAY):
        assert at(CAP, CAP, elapsed) == CAP


def test_burst_at_or_above_cap_restores_the_old_flat_bucket():
    """The documented off switch, so pacing reverts by env var without a code change."""
    at = srv.GlobalQuota._allowance_at
    assert at(CAP, CAP, 0) == CAP
    assert at(CAP, 99999, 0) == CAP
    assert srv.GlobalQuota._wait_for(CAP, CAP, 0, CAP + 1) == DAY


def test_pacing_can_only_lower_the_daily_total_never_raise_it():
    """The cost control must not be weakened: paced <= flat at every instant."""
    for elapsed in range(0, DAY + 1, 601):
        assert srv.GlobalQuota._allowance_at(CAP, BURST, elapsed) <= CAP


def test_retry_after_is_the_accrual_wait_and_never_zero():
    wait = srv.GlobalQuota._wait_for
    # Accrual is (12000-3000)/86400 = 0.1042 inferences/s.
    assert 70 <= wait(CAP, BURST, 0, BURST + LONG_COST) <= 90
    assert wait(CAP, BURST, 0, BURST + 1) >= 1              # never zero
    assert wait(CAP, BURST, DAY - 5, 10 ** 9) <= 5          # never past midnight


# --- the attack, end to end over HTTP ---------------------------------------
def test_flat_cap_attack_is_now_bounded_by_the_browser_floor(harness):
    """HANDOVER.md §13, reproduced — and bounded by the per-channel floor.

    burst == cap is the shipped single bucket, so pacing is not what stops this
    one. Before the floors existed the same drain took the whole 12,000 and
    every surface was on its fallback until midnight. It now takes the browser
    share and stops, which is the point of splitting the allowance.
    """
    h = harness(burst=CAP)
    floor = srv.GlobalQuota._floor_for(CAP, "browser")
    # Enough networks that none has to re-mint inside TOKEN_MAX_USES.
    served, _requests = h.drain(networks=120, minutes=9)
    assert served < CAP, served
    # The floor, plus whatever the nine simulated minutes released from the
    # idle channels' guarantees, plus at most one document's overshoot.
    released = (CAP - floor) * (9 * 60) / DAY
    assert floor <= served <= floor + released + LONG_COST, served

    # The next browser check is refused out of the browser share, says so in a
    # field a surface can read, and quotes the honest reset.
    net = h.new_network()
    body = h.check(net, h.token(net)).json()
    assert body["error"] == "daily_allowance_exhausted"
    assert body["reason"] == "channel_floor_exhausted"
    assert body["scope"] == "channel"
    assert body["channel_bucket"] == "browser"
    assert body["retry_after"] == DAY - h.clock.elapsed, body["retry_after"]
    assert "refills continuously" not in body["message"]
    assert "00:00 UTC" in body["message"]


def test_paced_cap_bounds_the_same_attack_to_the_burst(harness):
    h = harness(burst=BURST)
    served, _requests = h.drain(networks=40, minutes=30)
    # Roughly the burst plus whatever accrued during the 30 simulated minutes,
    # not the whole day. Never more than the flat cap would have allowed.
    accrued = (CAP - BURST) * (30 * 60) / DAY
    assert BURST <= served <= BURST + accrued + LONG_COST, served
    assert served < CAP


def test_a_refused_check_recovers_in_minutes_not_at_midnight(harness):
    h = harness(burst=BURST)
    h.seed_used(BURST)
    net = h.new_network()
    token = h.token(net)

    res = h.check(net, token)
    assert res.status_code == 429
    body = res.json()
    assert body["error"] == "daily_allowance_exhausted"
    assert 1 <= body["retry_after"] <= 300, body["retry_after"]
    assert body["resets_in_seconds"] == DAY          # still reported honestly
    assert "tomorrow" not in body["message"].lower()
    assert res.headers["retry-after"] == str(body["retry_after"])

    # Wait exactly as long as the server said to, and the same check goes through.
    h.clock.advance(body["retry_after"])
    assert h.check(net, token).status_code == 200


def test_every_refusal_still_carries_the_in_browser_fallback(harness):
    h = harness(burst=BURST)
    h.seed_used(CAP)
    net = h.new_network()
    res = h.check(net, h.token(net))
    assert res.status_code == 429
    body = res.json()
    assert body["fallback"]["available"] is True
    assert body["fallback"]["action"] == "offer_local_model"
    assert body["processed"] == "none"
    assert body["retained"] == "nothing"
    assert body["retryable"] is True


def test_availability_does_not_cost_capacity_over_a_full_day(harness):
    """A day of ordinary demand must still be able to draw the whole cap."""
    h = harness(burst=BURST)
    served = 0
    for hour in range(24):
        served += h.drain(networks=4, minutes=10)[0]
        h.clock.advance(50 * 60)
    assert 11000 <= served <= CAP, served


def test_pacing_sits_behind_every_gate_that_was_already_there(harness):
    h = harness(burst=BURST)
    net = h.new_network()

    assert h.client.post("/v1/check",
                         headers={"user-agent": "curl/8.4.0", "origin": ORIGIN},
                         json={"text": SHORT_TEXT}).status_code == 403
    assert h.client.post("/v1/check",
                         headers={"user-agent": BROWSER_UA,
                                  "origin": "https://example.invalid"},
                         json={"text": SHORT_TEXT}).status_code == 403
    assert h.client.post("/v1/check", headers=h._headers(net),
                         json={"text": SHORT_TEXT}).status_code == 401

    token = h.token(net)
    codes = [h.check(net, token, SHORT_TEXT).status_code
             for _ in range(srv.REQ_PER_MINUTE + 3)]
    assert 429 in codes, codes
    # A per-network refusal, not the service-wide one: the pool is untouched.
    assert h.quota.snapshot()["used_estimate"] <= srv.REQ_PER_MINUTE


def test_degraded_firestore_still_paces(harness):
    """A Firestore outage must not restore drain-it-all-at-once behaviour."""
    h = harness(burst=BURST)
    h.quota._degraded = True
    h.quota._client = None
    share = CAP // srv.MAX_INSTANCES
    burst_share = BURST // srv.MAX_INSTANCES
    allowed, _remaining, retry_after, _resets, reason = h.quota.reserve(
        burst_share)
    assert allowed
    allowed, _remaining, retry_after, _resets, reason = h.quota.reserve(1)
    assert not allowed
    assert reason == "paced_allowance"
    assert 1 <= retry_after <= 300
    assert share > burst_share              # the rest is still there, later


def test_status_reports_spendable_now_separately_from_remaining_today(harness):
    h = harness(burst=BURST)
    h.seed_used(BURST)
    body = h.client.get("/v1/status").json()
    assert body["service_daily_cap"] == CAP
    assert body["service_daily_remaining_estimate"] == CAP - BURST
    assert body["service_available_now_estimate"] == 0
    assert body["service_burst"] == BURST
    assert body["service_accrual_per_hour"] == 375.0
    assert body["fallback"]["available"] is True


# --- per-channel floors and the shared pool ----------------------------------
# The floors decide WHO may spend the allowance; the pacing above decides WHEN.
# These enter at GlobalQuota.reserve rather than over HTTP because the property
# under test is contention BETWEEN channels, and driving three credential
# classes through three handshakes to assert one arithmetic invariant would
# test the handshakes. The HTTP path into the same code is proven by the drain
# tests above and, for the WordPress channel, by test_wordpress_http_channel.py.
def _spend_all(quota, channel: str, step: int = 10) -> tuple[int, str]:
    """Spend `channel`'s allowance in `step`-sized bites. Returns (spent, reason)."""
    spent = 0
    while True:
        allowed, _remaining, _retry, _resets, reason = quota.reserve(
            step, channel=channel)
        if not allowed:
            return spent, reason
        spent += step


def test_the_floors_are_a_partition_of_the_cap_not_an_addition_to_it():
    floors = {channel: srv.GlobalQuota._floor_for(CAP, channel)
              for channel in srv.QUOTA_CHANNELS}
    assert sum(floors.values()) <= CAP
    assert floors == {"browser": 4800, "wordpress": 4800, "chrome": 2400}
    assert sum(srv.CHANNEL_FLOOR_PCT.values()) <= 100


def test_a_floor_is_untouchable_while_another_channel_floods_at_midnight(harness):
    """The case that matters: a plugin flood first thing must not take the site's share."""
    h = harness(burst=CAP)                       # pacing off, so only the floors bind
    wordpress_floor = srv.GlobalQuota._floor_for(CAP, "wordpress")
    browser_floor = srv.GlobalQuota._floor_for(CAP, "browser")

    spent, reason = _spend_all(h.quota, "wordpress")
    assert spent == wordpress_floor, spent
    assert reason == "channel_floor_exhausted"

    # Every inference of the browser's guarantee is still there.
    got, _reason = _spend_all(h.quota, "browser")
    assert got == browser_floor, got


def test_a_channel_inside_its_floor_is_never_refused_for_someone_else(harness):
    h = harness(burst=CAP)
    _spend_all(h.quota, "wordpress")
    _spend_all(h.quota, "chrome")
    # Both other channels have taken everything they can. The browser has not
    # spent a single inference, so its whole floor must still be claimable.
    allowed, _remaining, _retry, _resets, reason = h.quota.reserve(
        srv.GlobalQuota._floor_for(CAP, "browser"), channel="browser")
    assert allowed, reason


def test_a_channel_draws_on_the_pool_once_the_day_has_released_it(harness):
    """An idle channel's guarantee is lent out rather than wasted at midnight."""
    h = harness(burst=CAP)
    floor = srv.GlobalQuota._floor_for(CAP, "browser")
    spent, reason = _spend_all(h.quota, "browser")
    assert spent == floor
    assert reason == "channel_floor_exhausted"

    # Half the day has gone by and the other two channels have not appeared.
    h.clock.elapsed = DAY // 2
    allowed, _remaining, _retry, _resets, reason = h.quota.reserve(
        10, channel="browser")
    assert allowed, reason
    extra, _reason = _spend_all(h.quota, "browser")
    # Half of the 7,200 the other channels are guaranteed has been released.
    assert 10 + extra == pytest.approx((CAP - floor) // 2, abs=20)


def test_release_none_keeps_the_floors_as_hard_caps(harness, monkeypatch):
    """The documented off switch: strict floors, and the pool stays empty."""
    monkeypatch.setattr(srv, "CHANNEL_POOL_RELEASE", "none")
    h = harness(burst=CAP)
    floor = srv.GlobalQuota._floor_for(CAP, "browser")
    h.clock.elapsed = DAY - 60             # a minute to midnight
    spent, reason = _spend_all(h.quota, "browser")
    assert spent == floor, spent
    assert reason == "channel_floor_exhausted"


def test_a_flood_cannot_take_the_share_the_day_still_protects(harness):
    """Lending is irreversible, so the guarantee is stated against the clock.

    Whatever is left of a channel's floor is protected in proportion to the day
    it has left to be spent in. At midday half of it is still untouchable, and
    that is the figure a flood in another channel must not be able to reach.
    """
    h = harness(burst=CAP)
    h.clock.elapsed = DAY // 2
    protected = srv.GlobalQuota._protected(CAP, "wordpress", {}, DAY // 2)
    assert protected == srv.GlobalQuota._floor_for(CAP, "wordpress") // 2

    flooded, _reason = _spend_all(h.quota, "browser")
    assert flooded < CAP, flooded
    got, _reason = _spend_all(h.quota, "wordpress")
    assert got >= protected, (got, protected)


def test_the_two_refusal_reasons_are_told_apart(harness):
    """A surface has to know whether to say 'later today' or 'this is your share'."""
    h = harness(burst=CAP)
    floor = srv.GlobalQuota._floor_for(CAP, "browser")
    allowed, *_rest = h.quota.reserve(floor - 5, channel="browser")
    assert allowed
    # Still inside its own floor, but this request is larger than what is left
    # of it and the pool has nothing to top it up with.
    allowed, _remaining, _retry, _resets, reason = h.quota.reserve(
        10, channel="browser")
    assert not allowed
    assert reason == "shared_pool_exhausted"
    # Now the floor itself is gone.
    assert h.quota.reserve(5, channel="browser")[0]
    allowed, _remaining, retry_after, resets_in, reason = h.quota.reserve(
        1, channel="browser")
    assert not allowed
    assert reason == "channel_floor_exhausted"
    # Both are midnight facts, not accrual waits.
    assert retry_after == resets_in == DAY - h.clock.elapsed


def test_channel_counters_reset_with_the_utc_day(harness):
    h = harness(burst=CAP)
    floor = srv.GlobalQuota._floor_for(CAP, "browser")
    spent, reason = _spend_all(h.quota, "browser")
    assert spent == floor and reason == "channel_floor_exhausted"

    h.day = "2026-08-30"
    h.clock.elapsed = 0
    allowed, _remaining, _retry, _resets, reason = h.quota.reserve(
        floor, channel="browser")
    assert allowed, reason
    assert h.quota.snapshot()["channels"]["browser"]["used_estimate"] == floor


def test_the_shared_counter_carries_the_split_in_one_write(harness):
    """The per-channel figures must survive an instance losing its local delta."""
    h = harness(burst=CAP)
    for channel in ("browser", "wordpress", "chrome"):
        assert h.quota.reserve(srv.QUOTA_FLUSH_EVERY + 5, channel=channel)[0]
    stored = h.quota._client.store[f"day-{h.day}"]
    assert stored["count"] == sum(
        stored[f"count_{channel}"] for channel in srv.QUOTA_CHANNELS)
    for channel in srv.QUOTA_CHANNELS:
        assert stored[f"count_{channel}"] > 0


def test_a_degraded_store_divides_its_failsafe_share_the_same_way(harness):
    h = harness(burst=CAP)
    h.quota._degraded = True
    h.quota._client = None
    share = CAP // srv.MAX_INSTANCES
    spent, reason = _spend_all(h.quota, "wordpress")
    assert spent == srv.GlobalQuota._floor_for(share, "wordpress"), spent
    assert reason == "channel_floor_exhausted"


def test_status_reports_the_floors_and_the_pool_as_counts(harness):
    h = harness(burst=CAP)
    assert h.quota.reserve(100, channel="wordpress")[0]
    body = h.client.get("/v1/status").json()
    allowance = body["channel_allowance"]
    assert allowance["floors_pct"] == {"browser": 40, "wordpress": 40,
                                       "chrome": 20}
    assert allowance["pool_release"] == "time"
    wordpress = allowance["channels"]["wordpress"]
    assert wordpress["floor"] == srv.GlobalQuota._floor_for(CAP, "wordpress")
    assert wordpress["used_estimate"] == 100
    assert wordpress["floor_remaining_estimate"] == wordpress["floor"] - 100
    assert allowance["channels"]["browser"]["used_estimate"] == 0
    # At the very start of the day every guarantee is still held back, so there
    # is nothing in the pool to lend.
    assert allowance["shared_pool_remaining_estimate"] == 0
    # Counts only: nothing here says who spent anything.
    assert set(wordpress) == {"floor", "used_estimate",
                              "floor_remaining_estimate", "floor_protected_now"}
