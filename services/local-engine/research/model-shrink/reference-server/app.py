"""Opace AI Content Integrity — hardened inference endpoint.

One job: accept text, score every part of it, return the verdict, remember
nothing — and do it inside a cost envelope that a determined abuser cannot
blow open.

Design rules, in priority order:
  1. No request content is written anywhere. Not to disk, not to a log line,
     not to an error trace, not to a metric label, not to a URL. The text
     exists only as a local variable for the duration of the request.
  2. The whole document is scored, not just its opening. Segmentation mirrors
     `src/lib/local-signals/segments.ts` exactly (see segments.py), because the
     same document must score the same whether it was checked here or in the
     browser. Segments are bounded by MEASURED WordPiece tokens (segments-v2);
     the word-count proxy v1 used left 5.78% of segments over the 512-token
     window, silently dropping their ends. The verdict is the MAXIMUM segment
     score, never the mean.
  3. A global daily cap bounds the work the service will ever do, regardless of
     how the traffic arrives. It is denominated in INFERENCES, not requests,
     because since (2) a request is no longer a fixed unit of cost: one
     4,000-word document is about ten forward passes, and a dense one more. It is persisted outside the
     instance, because an in-memory counter dies with the instance and a
     scale-to-zero service recycles instances constantly.
  4. Per-client limits stop one visitor monopolising the global allowance, and
     they too are priced in inferences.
  5. When any limit blocks a check, the response tells the front end to offer
     the in-browser model instead of failing. The tool never simply breaks.
  6. The model is loaded once at process start and held in memory.

Run:  uvicorn app:APP --host 0.0.0.0 --port 8080 --workers 1 --no-access-log

Environment (defaults in brackets — the README carries the reasoning):

  Model
    MODEL_PATH              [./model/tier3-cycle2-e5small-fp32.onnx]
    TOKENIZER_DIR           [./model/tokenizer]
    ORT_THREADS             [2]

  Global cost ceiling — the control that actually bounds the bill
    GLOBAL_DAILY_INFERENCES [12000]  segment scorings per UTC day, service-wide
    QUOTA_BACKEND           [firestore]  firestore | memory
    QUOTA_PROJECT           [ ]      GCP project id; from the metadata server
                                     when unset
    QUOTA_COLLECTION        [detector_quota]
    QUOTA_FLUSH_EVERY       [25]     local inferences before the shared counter
                                     is updated
    QUOTA_FLUSH_SECONDS     [15]     or this long, whichever comes first
    QUOTA_RECHECK_SECONDS   [30]     how often a capped instance re-reads the
                                     shared counter before refusing again
    MAX_INSTANCES           [2]      sizes the fail-safe when the store is down

  Per-client limits
    REQ_PER_MINUTE          [5]      requests, whatever their length
    REQ_PER_HOUR            [30]
    REQ_PER_DAY             [100]
    INF_PER_MINUTE          [20]     inferences, so long documents cost more
    INF_PER_HOUR            [150]
    INF_PER_DAY             [500]
    TRUST_PROXY_HEADER      [x-forwarded-for]
    PROXY_IP_POSITION       [last]   last | first — see _client_ip()

  Bot resistance
    ALLOWED_ORIGINS         [ ]      comma separated; enforced server-side too
    REQUIRE_ORIGIN          [1]
    REQUIRE_BROWSER_UA      [1]
    REQUIRE_TOKEN           [1]
    TOKEN_SECRET            [ ]      MUST be set and shared across instances
    TOKEN_TTL_SECONDS       [900]
    TOKEN_MAX_USES          [20]
    POW_BITS                [14]     leading zero bits required of the client
    CHALLENGE_TTL_SECONDS   [120]

  Size
    MAX_CHARS               [100000]
    MAX_WORDS               [8000]   caps a single request at ~20 inferences
    MAX_BODY_BYTES          [220000]
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import os
import secrets
import threading
import time
from collections import defaultdict
from datetime import datetime, timezone

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from transformers import AutoTokenizer

from segments import (INPUT_NORMALISATION, MODEL_MAX_TOKENS,
                      SEGMENTATION_CONTRACT, SEGMENT_TOKEN_BUDGET, count_words,
                      normalise_input, scoring_order, segment_count,
                      segment_text)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "") or default)
    except ValueError:
        return default


def _env_flag(name: str, default: bool) -> bool:
    return (os.environ.get(name, "1" if default else "0") or "").strip().lower() in (
        "1", "true", "yes", "on")


MODEL_PATH = os.environ.get("MODEL_PATH", "./model/tier3-cycle2-e5small-fp32.onnx")
TOKENIZER_DIR = os.environ.get("TOKENIZER_DIR", "./model/tokenizer")
ORT_THREADS = _env_int("ORT_THREADS", 2)

GLOBAL_DAILY_INFERENCES = _env_int("GLOBAL_DAILY_INFERENCES", 12000)
# How much of the daily allowance may be spent at once, before the rest has to
# be waited for; the remainder accrues evenly across the UTC day. See
# GlobalQuota._allowance_at for what this is for.
#
# **It defaults to the whole cap, which means off.** At burst == cap the
# allowance curve is flat and every path below behaves exactly as it did before
# pacing existed, byte for byte. That is deliberate: this is the one control
# that bounds the bill, a deploy of it cannot be separated from a deploy of
# anything else in this file, and it should not start changing production
# behaviour as a side effect of shipping something unrelated. Enabling it is a
# single reviewed env var — GLOBAL_BURST_INFERENCES=3000 is the analysed
# setting — and reverting it is the same edit backwards.
GLOBAL_BURST_INFERENCES = max(1, _env_int("GLOBAL_BURST_INFERENCES",
                                          GLOBAL_DAILY_INFERENCES))
QUOTA_BACKEND = os.environ.get("QUOTA_BACKEND", "firestore").strip().lower()
QUOTA_PROJECT = os.environ.get("QUOTA_PROJECT", "").strip() or None
QUOTA_COLLECTION = os.environ.get("QUOTA_COLLECTION", "detector_quota")
QUOTA_FLUSH_EVERY = _env_int("QUOTA_FLUSH_EVERY", 25)
QUOTA_FLUSH_SECONDS = _env_int("QUOTA_FLUSH_SECONDS", 15)
QUOTA_RECHECK_SECONDS = _env_int("QUOTA_RECHECK_SECONDS", 30)
MAX_INSTANCES = max(1, _env_int("MAX_INSTANCES", 2))

REQ_PER_MINUTE = _env_int("REQ_PER_MINUTE", 5)
REQ_PER_HOUR = _env_int("REQ_PER_HOUR", 30)
REQ_PER_DAY = _env_int("REQ_PER_DAY", 100)
INF_PER_MINUTE = _env_int("INF_PER_MINUTE", 20)
INF_PER_HOUR = _env_int("INF_PER_HOUR", 150)
INF_PER_DAY = _env_int("INF_PER_DAY", 500)
TRUST_PROXY_HEADER = os.environ.get("TRUST_PROXY_HEADER", "x-forwarded-for").lower()
PROXY_IP_POSITION = os.environ.get("PROXY_IP_POSITION", "last").strip().lower()

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",")
                   if o.strip()]
REQUIRE_ORIGIN = _env_flag("REQUIRE_ORIGIN", True)
REQUIRE_BROWSER_UA = _env_flag("REQUIRE_BROWSER_UA", True)
REQUIRE_TOKEN = _env_flag("REQUIRE_TOKEN", True)
TOKEN_TTL_SECONDS = _env_int("TOKEN_TTL_SECONDS", 900)
TOKEN_MAX_USES = _env_int("TOKEN_MAX_USES", 20)
POW_BITS = _env_int("POW_BITS", 14)
CHALLENGE_TTL_SECONDS = _env_int("CHALLENGE_TTL_SECONDS", 120)

MAX_CHARS = _env_int("MAX_CHARS", 100000)
MAX_WORDS = _env_int("MAX_WORDS", 8000)
MAX_BODY_BYTES = _env_int("MAX_BODY_BYTES", 220000)
MIN_WORDS = 60
# The most inferences a single accepted request can cost. Derived from
# MAX_CHARS rather than MAX_WORDS since segments-v2: a segment is bounded by
# measured tokens, and a WordPiece token never consumes fewer than one
# character, so MAX_CHARS characters can never produce more than this many
# segments however dense the prose. Real English runs about 1.27 tokens a word,
# so an 8,000-word document costs about 20; this is the ceiling, not the price.
MAX_SEGMENTS_PER_REQUEST = -(-MAX_CHARS // SEGMENT_TOKEN_BUDGET)

# TOKEN_SECRET has to be identical on every instance or a token minted by one
# instance fails on the next. An unset secret is a misconfiguration, not a
# fallback: the process generates a random one so it still runs locally, and
# says so once, without touching request data.
TOKEN_SECRET = (os.environ.get("TOKEN_SECRET", "") or "").encode("utf-8")
if not TOKEN_SECRET:
    TOKEN_SECRET = secrets.token_bytes(32)
    if REQUIRE_TOKEN:
        print("WARNING: TOKEN_SECRET unset — tokens will not verify across "
              "instances. Set it from Secret Manager before deploying.",
              flush=True)

# Operating point. The margin is a logit difference, not a probability:
# probabilities saturate near 1.0 and compare badly. TEMPERATURE and
# THRESHOLD_PROB come from tier3-cycle2-config.json and exist only so the
# number shown to a person matches what the browser build shows.
#
# 2026-08-29: raised 0.980 -> 0.984 to match the browser exactly. They were
# calibrated independently and drifted apart, and that 0.004 gap was LARGER
# than the disagreement between the two runtimes it was supposed to absorb:
# measured across 60 documents, the routes differ by a median of 0.0002 in the
# decision region, but disagreed on the verdict for 3 of them — every one
# inside the 0.980-0.984 corridor, including a genuine human academic paper
# the server flagged at 0.9800 and the browser cleared. One shared threshold
# gives 60/60 agreement. A tool that contradicts itself depending on which
# route happened to run is worse than one that is slightly miscalibrated.
#
# On the corpus this costs 2.2 points of detection (96.0% -> 93.8%) and nearly
# halves false positives (1.98% -> 1.12%), which is the direction the project's
# acceptance criteria ask for. See docs/measurements/ROUTE-PARITY.md.
#
# This number is measured against the CURRENT segmentation pipeline. The
# token-bounded segmentation fix will move both routes' operating points, so it
# must be re-derived then rather than carried across unexamined. The durable
# finding is that both routes must share one threshold, not that it is 0.984.
#
# 2026-08-29: the verdict is no longer "the highest section clears the flag
# point". It is now MINIMUM EVIDENCE: flag when the highest section clears
# THRESHOLD_PROB, or when the SECOND-highest clears SECONDARY_THRESHOLD_PROB.
# Two sections agreeing at a lower point is better evidence than one section
# alone, and it is the case the old rule was worst at.
#
# THE PRIMARY IS 0.9855 AND THE SECONDARY IS 0.9763. Every figure below
# reproduces at exactly that pair, on the full 5,558-document fresh long-form
# corpus (922 AI, 4,636 human), scored end to end on BOTH runtimes, from
# UNROUNDED section scores. Nothing here is quoted from a different operating
# point or a different rule.
#
# The unrounded caveat is not pedantry. lf-*.jsonl stores sections at 4 decimal
# places, and the secondary parameter is decided by single-digit numbers of
# documents: 19 AI and 9 human on fp32. At 4 dp the shipped rule reads 57 false
# positives and this rule reads 884 detections; unrounded they are 56 and 883.
# The rounding was worth a document in both directions, which is the same order
# as the effect being fitted, so every number below comes from a full-precision
# re-score of all 21,093 segments.
#
#                     detection            human FP           two-section AI
#   shipped 0.984
#     fp32 server     877/922 = 95.12%     56/4,636 = 1.208%    30/37 = 81.08%
#     int8 browser    877/922 = 95.12%     90/4,636 = 1.941%    31/37 = 83.78%
#   this rule, 0.9855 / 0.9763
#     fp32 server     883/922 = 95.77%     45/4,636 = 0.971%    34/37 = 91.89%
#     int8 browser    889/922 = 96.42%     90/4,636 = 1.941%    34/37 = 91.89%
#
# Both routes get the whole two-section gain, 81.08% -> 91.89%, which is the
# weakness the owner actually hit. Server false positives fall well below the
# shipped rule, from 56 to 45, and browser false positives are held exactly
# flat at 90.
#
# The earlier candidate, 0.9845/0.9765, was fitted on fp32 alone and is NOT
# false-positive-neutral once the browser is measured: it takes browser false
# positives from 90 to 106 while cutting server ones from 56 to 51. It was
# approved as detection gained at matched false positives, which is true on
# fp32 and false on the browser, so it is not the trade a browser visitor
# would have got. That is why it is not what ships.
#
# Cross-validated, 200 split-halves, held out against plain maximum: fp32
# +0.76pp detection at -0.268pp false positives, winning 194 of 200; browser
# +1.28pp at -0.001pp, winning 200 of 200. Refitting the pair inside each half
# rather than fixing it costs about 0.2 to 0.3pp, so most of the gain is real
# and not leaderboard selection.
#
# What it still costs, recorded rather than buried. Browser academic
# discussion goes 16/420 = 3.81% to 21/420 = 5.00%. On fp32 that register does
# not move at all, 8/420 = 1.90% either way, and fiction improves on both
# routes: fp32 29/260 = 11.15% to 23/260 = 8.85%, browser 28/260 = 10.77% to
# 26/260 = 10.00%. Academic discussion is the register OBJECTIVE.md names as
# the one to watch, and on the browser route it is the one thing this makes
# worse.
#
# Route disagreement also rises slightly against what ships today: 48/5,558 =
# 0.86% to 55/5,558 = 0.99%. It is well below the 63/5,558 = 1.13% the fp32-only
# pair would have cost, but it is not an improvement on the current rule and
# should not be quoted as one.
#
# The secondary arm's own marginal documents have poor precision on the browser
# taken alone: it newly flags 23 AI against 37 human there, against 19 AI and 9
# human on fp32. The browser stays false-positive-neutral because the higher
# primary removes about as many as the secondary adds, not because the second
# section is better evidence on that runtime. Worth knowing before anyone
# tunes either number in isolation.
#
# Fitted on section scores from both runtimes. The browser numbers come from
# onnxruntime-web's WASM provider under headless Node. WebGPU was not measured,
# and the providers diverge most between 0.90 and 0.98, which is where the
# secondary now sits, so these parameters are not proven for a WebGPU visitor.
#
# Source of record: docs/measurements/AGGREGATION-AND-RHYTHM.md §2 for the
# rule, and the full-corpus two-runtime fit under
# services/local-engine/research/corpus-reconciliation-2026-08-29/.
TEMPERATURE = 0.8324
THRESHOLD_PROB = 0.9855
SECONDARY_THRESHOLD_PROB = 0.9763

# --- model, loaded once ------------------------------------------------------
_opts = ort.SessionOptions()
_opts.intra_op_num_threads = ORT_THREADS
_opts.log_severity_level = 3           # ORT must not print anything about inputs
SESSION = ort.InferenceSession(MODEL_PATH, _opts, providers=["CPUExecutionProvider"])
INPUT_NAMES = [i.name for i in SESSION.get_inputs()]
TOKENIZER = AutoTokenizer.from_pretrained(TOKENIZER_DIR)


def count_tokens(strings):
    """WordPiece token counts, no special tokens, no truncation.

    This is what segments-v2 bounds a segment by. It must be the same tokeniser
    that scores the segment, or the bound is a guess again.
    """
    strings = list(strings)
    if not strings:
        return []
    return [len(ids) for ids in TOKENIZER(
        strings, add_special_tokens=False, truncation=False)["input_ids"]]
with open(MODEL_PATH, "rb") as _fh:
    MODEL_ID = hashlib.sha256(_fh.read()).hexdigest()[:16]


# --- the graceful-degradation contract ---------------------------------------
# Every blocked check carries this block. The front end reads `fallback.action`
# and offers the in-browser model rather than showing a dead end. `processed`
# is "none" so the same rendering path that handles a 200 can tell that no
# assessment was made.
LOCAL_FALLBACK = {
    "available": True,
    "mode": "local-browser",
    "action": "offer_local_model",
    "download_mb": 34.3,
    "label": "Run the check in your browser instead",
    "note": "A one-off 34 MB download, then nothing leaves your device, there "
            "is no limit on how many checks you run, and it reads documents of "
            "any length.",
}


def _blocked(status: int, error: str, message: str, *, retryable: bool,
             retry_after: int | None = None, extra: dict | None = None
             ) -> JSONResponse:
    body = {
        "error": error,
        "message": message,
        "processed": "none",
        "retained": "nothing",
        "retryable": retryable,
        "fallback": LOCAL_FALLBACK,
    }
    if retry_after is not None:
        body["retry_after"] = int(retry_after)
    if extra:
        body.update(extra)
    headers = {"retry-after": str(max(int(retry_after), 1))} if retry_after else {}
    return JSONResponse(body, status_code=status, headers=headers)


# --- client identity ---------------------------------------------------------
# Counters are keyed on a keyed hash of the client's network, with a pepper
# generated at process start and never persisted, so the keys cannot be
# reversed to an address after the fact and cannot be correlated across
# restarts. A plain hash of an IPv4 address is enumerable and therefore
# reversible; this is not.
_PEPPER = secrets.token_bytes(16)


def _client_ip(request: Request) -> str:
    """The address to rate-limit on.

    Cloud Run *appends* the connecting address to any X-Forwarded-For the
    caller supplied, so the LAST entry is the one Google observed and the only
    one that cannot be spoofed. Reading the first entry — the usual reflex, and
    correct behind Cloudflare's CF-Connecting-IP — would let an attacker defeat
    every per-IP limit here by sending a random header. PROXY_IP_POSITION
    exists so this stays correct if a CDN is put in front later.
    """
    hdr = request.headers.get(TRUST_PROXY_HEADER)
    if hdr:
        parts = [p.strip() for p in hdr.split(",") if p.strip()]
        if parts:
            return parts[-1] if PROXY_IP_POSITION == "last" else parts[0]
    return request.client.host if request.client else "unknown"


def _network(ip: str) -> str:
    """Collapse an address to the unit a single user actually controls.

    One residential IPv6 customer is routinely handed a /64 or larger, so
    limiting on the full 128-bit address limits nothing at all. IPv4 is limited
    on the address itself; /24 would sweep up shared office egress.
    """
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return "unparsed:" + ip[:64]
    if addr.version == 6:
        return str(ipaddress.ip_network(f"{addr}/64", strict=False))
    return str(addr)


def _key(net: str) -> str:
    return hashlib.blake2b(_PEPPER + net.encode("utf-8"), digest_size=16).hexdigest()


def _bind(net: str) -> str:
    """Stable, non-stored pseudonym of the network, for binding a token to it.

    Keyed on TOKEN_SECRET rather than the per-process pepper because the token
    has to verify on whichever instance handles the next request. It is never
    written down anywhere: it exists inside the token the client is holding.
    """
    return hmac.new(TOKEN_SECRET, b"bind|" + net.encode("utf-8"),
                    hashlib.sha256).hexdigest()[:16]


# --- per-client rate limiting ------------------------------------------------
_SPAN_LABEL = {60: "minute", 3600: "hour", 86400: "day"}


class WeightedLimiter:
    """Sliding-window limiter where an event can cost more than one unit.

    Two instances of it are used. One counts requests, so a client cannot make
    5,000 trivial calls a second; the other counts inferences, so a client
    submitting 4,000-word documents exhausts its allowance twelve times faster
    than one submitting paragraphs. Charging by request alone would let the
    expensive traffic through the cheap gate, which is the mistake this whole
    revision exists to avoid.
    """

    def __init__(self, windows: list[tuple[int, int]]):
        self._windows = sorted(windows)
        self._max_span = max(span for span, _ in windows)
        self._events: dict[str, list[tuple[float, int]]] = defaultdict(list)
        self._lock = threading.Lock()

    def consume(self, key: str, cost: int = 1) -> tuple[bool, int, str]:
        """Returns (allowed, retry_after_seconds, window_label)."""
        now = time.time()
        with self._lock:
            events = [e for e in self._events[key] if now - e[0] < self._max_span]
            self._events[key] = events
            for span, limit in self._windows:
                used = sum(c for t, c in events if now - t < span)
                if used + cost > limit:
                    oldest = min((t for t, _ in events if now - t < span),
                                 default=now)
                    return (False, max(1, int(span - (now - oldest))),
                            _SPAN_LABEL.get(span, f"{span}s"))
            events.append((now, cost))
            if len(self._events) > 50_000:      # bounded memory; drop cold keys
                for k, v in list(self._events.items()):
                    if not v or now - v[-1][0] > self._max_span:
                        self._events.pop(k, None)
            return True, 0, ""


REQUEST_LIMITER = WeightedLimiter([(60, REQ_PER_MINUTE), (3600, REQ_PER_HOUR),
                                   (86400, REQ_PER_DAY)])
INFERENCE_LIMITER = WeightedLimiter([(60, INF_PER_MINUTE), (3600, INF_PER_HOUR),
                                     (86400, INF_PER_DAY)])


# --- global daily cap --------------------------------------------------------
def _utc_day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _seconds_elapsed_today() -> int:
    now = datetime.now(timezone.utc)
    return int(now.hour * 3600 + now.minute * 60 + now.second)


def _seconds_to_utc_midnight() -> int:
    return 86400 - _seconds_elapsed_today()


class GlobalQuota:
    """A service-wide daily ceiling on inferences actually performed.

    This is the control that bounds cost, because it does not care how the
    traffic arrives — one IP or a hundred thousand, one instance or all of
    them. Per-client limits decide *who* gets served; this decides *how much*
    gets served in total.

    It counts inferences rather than requests. A cap of 5,000 requests would
    mean up to 100,000 inferences at the shipped MAX_WORDS, an order of
    magnitude more compute than the number suggests, and the free tier is
    denominated in vCPU-seconds.

    The counter has to outlive an instance, so it lives in Firestore. Writing
    to it once per request would be wasteful and slow, so each instance keeps a
    local delta and flushes it with an atomic server-side increment every
    QUOTA_FLUSH_EVERY inferences or QUOTA_FLUSH_SECONDS, whichever comes first.
    The cost of that batching is a bounded overshoot: at most
    MAX_INSTANCES * (QUOTA_FLUSH_EVERY + MAX_SEGMENTS_PER_REQUEST) inferences
    past the cap, which is 222 at the shipped settings against a cap of 12,000.
    MAX_SEGMENTS_PER_REQUEST is a MAX_CHARS-derived worst case since
    segments-v2; a real 8,000-word document costs about twenty.

    If the store is unreachable the instance falls back to its own share of the
    cap, GLOBAL_DAILY_INFERENCES // MAX_INSTANCES, so an outage degrades the
    ceiling to roughly the same number rather than removing it.

    **The cap is paced, not a single bucket.** A flat daily ceiling is a cost
    control that doubles as an availability weapon: the allowance can be
    emptied in about 25 minutes by a handful of source networks, and the tool's
    server route is then dead until 00:00 UTC. That is 57 minutes of denial
    bought for every minute of attack, and IPv6 makes the source networks free,
    so no per-network limit removes the leverage. Pacing removes it instead:
    GLOBAL_BURST_INFERENCES is spendable immediately and the remainder accrues
    evenly across the day, so denial lasts about as long as the attack rather
    than until midnight. Recovery after a drain is on the order of a minute,
    not a day.

    It costs nothing and stores nothing. The allowance is a pure function of the
    counter that was already there and the wall clock, so Firestore's document,
    its atomic increment, the flush batching and the degraded fallback are all
    untouched. The ceiling is min(paced allowance, cap) at every instant, so the
    daily total — and therefore the bill — can only be lower than before, never
    higher.
    """

    @staticmethod
    def _allowance_at(cap: int, burst: int, elapsed: int) -> int:
        """How much of `cap` may have been spent by `elapsed` seconds into the day.

        burst >= cap collapses this to a flat cap, which is the off switch.
        """
        if burst >= cap:
            return cap
        accrued = (cap - burst) * min(max(elapsed, 0), 86400) / 86400.0
        return min(cap, int(burst + accrued))

    @staticmethod
    def _wait_for(cap: int, burst: int, elapsed: int, needed: int) -> int:
        """Seconds until the paced allowance reaches `needed`, capped at midnight.

        Returned as the 429's retry-after, which is why it must never be zero:
        a client told to retry in zero seconds retries immediately and is
        refused again.
        """
        remaining_today = 86400 - min(max(elapsed, 0), 86400)
        if burst >= cap or needed > cap:
            return max(1, remaining_today)
        rate = (cap - burst) / 86400.0
        if rate <= 0:
            return max(1, remaining_today)
        shortfall = needed - GlobalQuota._allowance_at(cap, burst, elapsed)
        if shortfall <= 0:
            return 1
        return max(1, min(remaining_today, int(shortfall / rate) + 1))

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._day = _utc_day()
        self._synced_total = 0          # last figure read from the shared store
        self._local = 0                 # performed here since that read
        self._flushed = 0               # of _local, how much is already written
        self._last_flush = 0.0
        self._last_read = 0.0
        self._client = None
        self._firestore = None
        self._degraded = QUOTA_BACKEND != "firestore"
        if not self._degraded:
            try:
                from google.cloud import firestore  # noqa: PLC0415
                self._firestore = firestore
                self._client = firestore.Client(project=QUOTA_PROJECT)
            except Exception:
                self._degraded = True

    def _doc(self):
        return self._client.collection(QUOTA_COLLECTION).document(f"day-{self._day}")

    def _push(self, delta: int) -> None:
        """Atomic increment, then read back the authoritative total.

        Firestore's Increment is applied server-side, so two instances writing
        at once cannot lose each other's counts. There is no read-modify-write
        and therefore no transaction, no retry loop, and none of the
        one-write-per-second contention a Cloud Storage object guarded by a
        generation precondition would impose exactly when it matters most.
        """
        doc = self._doc()
        if delta:
            doc.set({"count": self._firestore.Increment(delta), "day": self._day},
                    merge=True)
        snap = doc.get()
        data = snap.to_dict() if snap.exists else None
        self._synced_total = int((data or {}).get("count", 0))
        self._last_read = time.time()

    def reserve(self, cost: int = 1) -> tuple[bool, int, int, int]:
        """Claim `cost` inferences.

        Returns (allowed, remaining_today, retry_after, resets_in). `retry_after`
        is the wait until enough allowance has accrued, which is what makes a
        refusal recoverable in minutes; `resets_in` is still the seconds to
        00:00 UTC, for the body's own reporting.
        """
        now = time.time()
        elapsed = _seconds_elapsed_today()
        resets_in = 86400 - elapsed
        with self._lock:
            day = _utc_day()
            if day != self._day:
                self._day, self._synced_total = day, 0
                self._local = self._flushed = 0
                self._last_flush = self._last_read = 0.0

            if self._degraded or self._client is None:
                # The instance's own share, paced on the same curve so a
                # Firestore outage degrades the ceiling without also restoring
                # the drain-it-all-at-once behaviour this exists to remove.
                share = max(1, GLOBAL_DAILY_INFERENCES // MAX_INSTANCES)
                burst = max(1, GLOBAL_BURST_INFERENCES // MAX_INSTANCES)
                allowance = self._allowance_at(share, burst, elapsed)
                if self._local + cost > allowance:
                    return (False, max(0, share - self._local),
                            self._wait_for(share, burst, elapsed,
                                           self._local + cost), resets_in)
                self._local += cost
                return True, share - self._local, 0, resets_in

            used = self._synced_total + (self._local - self._flushed)
            allowance = self._allowance_at(GLOBAL_DAILY_INFERENCES,
                                           GLOBAL_BURST_INFERENCES, elapsed)

            # At or over what has accrued: re-read occasionally in case the
            # figure is stale, then refuse. A refusal must never write, or a
            # flood would burn the daily write quota in minutes.
            if used + cost > allowance:
                if now - self._last_read > QUOTA_RECHECK_SECONDS:
                    try:
                        self._push(self._local - self._flushed)
                        self._flushed = self._local
                    except Exception:
                        self._last_read = now
                    used = self._synced_total + (self._local - self._flushed)
                if used + cost > allowance:
                    return (False, max(0, GLOBAL_DAILY_INFERENCES - used),
                            self._wait_for(GLOBAL_DAILY_INFERENCES,
                                           GLOBAL_BURST_INFERENCES, elapsed,
                                           used + cost), resets_in)

            self._local += cost
            pending = self._local - self._flushed
            if pending >= QUOTA_FLUSH_EVERY or (
                    pending and now - self._last_flush > QUOTA_FLUSH_SECONDS):
                try:
                    self._push(pending)
                    self._flushed = self._local
                except Exception:
                    # Keep serving on a transient error; the delta is carried
                    # into the next attempt rather than lost.
                    pass
                self._last_flush = now
            used = self._synced_total + (self._local - self._flushed)
            return True, max(0, GLOBAL_DAILY_INFERENCES - used), 0, resets_in

    def snapshot(self) -> dict:
        elapsed = _seconds_elapsed_today()
        allowance = self._allowance_at(GLOBAL_DAILY_INFERENCES,
                                       GLOBAL_BURST_INFERENCES, elapsed)
        with self._lock:
            used = self._synced_total + (self._local - self._flushed)
            return {"cap": GLOBAL_DAILY_INFERENCES,
                    "used_estimate": used,
                    "remaining_estimate": max(0, GLOBAL_DAILY_INFERENCES - used),
                    # What a check submitted right now can actually draw on.
                    # The front end warns on this rather than on the daily
                    # figure, which can be large while nothing is spendable yet.
                    "available_now_estimate": max(0, allowance - used),
                    "burst": GLOBAL_BURST_INFERENCES,
                    "accrual_per_hour": round(
                        max(0, GLOBAL_DAILY_INFERENCES - GLOBAL_BURST_INFERENCES) / 24.0, 1),
                    "resets_in_seconds": 86400 - elapsed,
                    "backend": "memory-failsafe" if self._degraded else "firestore"}


QUOTA = GlobalQuota()


# --- proof of work and short-lived tokens ------------------------------------
# The page asks for a challenge, spends a fraction of a second solving it, and
# exchanges the solution for a token that covers its next TOKEN_MAX_USES
# checks. A visitor never notices. A curl loop has to implement the exchange
# and pay the work again every TOKEN_MAX_USES requests, which is what removes
# the one-line attack.
_TOKEN_USES: dict[str, tuple[int, float]] = {}
_TOKEN_LOCK = threading.Lock()


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _sign(kind: str, payload: str) -> str:
    return _b64(hmac.new(TOKEN_SECRET, f"{kind}|{payload}".encode("utf-8"),
                         hashlib.sha256).digest()[:16])


def _leading_zero_bits(digest: bytes) -> int:
    bits = 0
    for byte in digest:
        if byte:
            return bits + (8 - byte.bit_length())
        bits += 8
    return bits


def _make_challenge(bind: str) -> str:
    payload = f"{int(time.time())}.{bind}.{_b64(secrets.token_bytes(9))}"
    return f"{payload}.{_sign('chal', payload)}"


def _check_challenge(challenge: str, bind: str, nonce: str) -> str | None:
    """Returns an error code, or None when the solution is good."""
    parts = challenge.split(".")
    if len(parts) != 4:
        return "malformed_challenge"
    issued, cbind, _rand, sig = parts
    if not hmac.compare_digest(sig, _sign("chal", ".".join(parts[:3]))):
        return "bad_challenge_signature"
    if not hmac.compare_digest(cbind, bind):
        return "challenge_not_yours"
    try:
        age = time.time() - int(issued)
    except ValueError:
        return "malformed_challenge"
    if age < 0 or age > CHALLENGE_TTL_SECONDS:
        return "challenge_expired"
    if not nonce or len(nonce) > 64:
        return "bad_nonce"
    digest = hashlib.sha256(f"{challenge}:{nonce}".encode("utf-8")).digest()
    if _leading_zero_bits(digest) < POW_BITS:
        return "insufficient_work"
    return None


def _mint_token(bind: str) -> tuple[str, int]:
    exp = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{exp}.{bind}.{_b64(secrets.token_bytes(9))}"
    return f"{payload}.{_sign('tok', payload)}", exp


def _spend_token(token: str | None, bind: str) -> str | None:
    """Returns an error code, or None when the token was valid and had a use left."""
    if not token:
        return "token_missing"
    parts = token.split(".")
    if len(parts) != 4:
        return "token_malformed"
    exp, tbind, jti, sig = parts
    if not hmac.compare_digest(sig, _sign("tok", ".".join(parts[:3]))):
        return "token_invalid"
    if not hmac.compare_digest(tbind, bind):
        return "token_not_yours"
    try:
        expiry = int(exp)
    except ValueError:
        return "token_malformed"
    now = time.time()
    if expiry < now:
        return "token_expired"
    with _TOKEN_LOCK:
        if len(_TOKEN_USES) > 100_000:
            for k, (_c, e) in list(_TOKEN_USES.items()):
                if e < now:
                    _TOKEN_USES.pop(k, None)
        used, _e = _TOKEN_USES.get(jti, (0, expiry))
        if used >= TOKEN_MAX_USES:
            return "token_exhausted"
        _TOKEN_USES[jti] = (used + 1, expiry)
    return None


# --- automation detection ----------------------------------------------------
_AUTOMATED_UA = (
    "curl/", "wget/", "python-requests", "python-urllib", "httpx/", "aiohttp",
    "go-http-client", "libwww-perl", "java/", "okhttp", "scrapy", "postman",
    "insomnia", "httpie", "node-fetch", "axios/", "guzzlehttp", "restsharp",
    "powershell", "wininet", "apachebench", "siege", "wrk/", "vegeta", "k6/",
    "locust", "headlesschrome", "phantomjs", "puppeteer", "playwright",
    "selenium", "bot", "spider", "crawler", "scraper",
)


def _ua_looks_automated(ua: str | None) -> str | None:
    if not ua or not ua.strip():
        return "user_agent_missing"
    low = ua.lower()
    # Named tools first, so the reason recorded is the accurate one: "curl/8.4.0"
    # is also short enough to trip the length check, and "automated" is the
    # truer answer than "missing".
    if any(marker in low for marker in _AUTOMATED_UA):
        return "user_agent_automated"
    if len(ua.strip()) < 16:
        return "user_agent_missing"
    # Every current browser sends a Mozilla/5.0 prefix. This is a weak signal —
    # it is trivially forged — and it is here to stop the lazy attack, not the
    # determined one. It is deliberately the last check, so a forged UA still
    # has to pass origin, token, per-client and global limits.
    if not low.startswith("mozilla/"):
        return "user_agent_unrecognised"
    return None


# --- API ---------------------------------------------------------------------
class CheckRequest(BaseModel):
    # No max_length here: pydantic would raise a 422 saying "validation error",
    # when the honest answer to an oversized document is a 413 carrying the
    # actual limit and the local-model offer. The check is explicit below.
    text: str
    # Retained for compatibility and for the interface's own copy. It no longer
    # affects scoring: the server now reads whatever it is sent, in full.
    full_word_count: int | None = Field(None, ge=0)


APP = FastAPI(title="Opace content-integrity inference", docs_url=None, redoc_url=None)
APP.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "x-opace-token"],
    max_age=86400,
)


@APP.middleware("http")
async def _nosniff(request: Request, call_next):
    """`X-Content-Type-Options: nosniff` on every response, errors included.

    This endpoint only ever returns JSON, so there is nothing here for a
    browser to usefully sniff — which is exactly why the header is free to
    send and worth sending: it removes the whole class of "the browser decided
    this JSON was something else" from the surface. Cloud Run adds no security
    headers of its own, so if it is not set here it is not set at all.

    Deliberately NOT a CSP. A CSP on a JSON-only origin constrains a document
    that never exists; the CSP that matters for this product belongs on the
    pages at opace.agency, where the visitor's draft is actually typed.
    """
    response = await call_next(request)
    response.headers["x-content-type-options"] = "nosniff"
    return response


@APP.middleware("http")
async def _size_guard(request: Request, call_next):
    """Refuse an oversized body before anything reads it.

    Content-Length is advisory, but rejecting on it costs nothing and stops the
    common case of a large paste. A body that lies about its length is still
    bounded by MAX_CHARS and MAX_WORDS after parsing.
    """
    if request.method == "POST":
        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
            return _blocked(
                413, "too_large",
                f"That is larger than this endpoint accepts. Send at most "
                f"{MAX_CHARS:,} characters or {MAX_WORDS:,} words.",
                retryable=False,
                extra={"max_chars": MAX_CHARS, "max_words": MAX_WORDS})
    return await call_next(request)


def _gate(ua: str | None, origin: str | None) -> JSONResponse | None:
    """Everything that can refuse a request without reading its body."""
    # Fail CLOSED. This used to read `REQUIRE_ORIGIN and ALLOWED_ORIGINS and
    # ...`, so an unset or empty ALLOWED_ORIGINS turned the check off entirely
    # and REQUIRE_ORIGIN=1 enforced nothing. Production sets the allowlist, so
    # that was latent rather than live, but a control that stops enforcing when
    # a config value goes missing is the exact shape this project keeps getting
    # caught by: the kill switch failed twice, once silently, for the same
    # reason. If enforcement is asked for and there is nothing to enforce
    # against, refuse rather than admit. Turning it off is REQUIRE_ORIGIN=0,
    # which is explicit and greppable.
    if REQUIRE_ORIGIN and (not ALLOWED_ORIGINS or origin not in ALLOWED_ORIGINS):
        return _blocked(
            403, "origin_not_allowed",
            "This endpoint only serves the Opace website. Run the check in "
            "your browser instead — the model is open and the local route has "
            "no limits.", retryable=False)
    if REQUIRE_BROWSER_UA:
        why = _ua_looks_automated(ua)
        if why:
            return _blocked(
                403, "automation_detected",
                "This endpoint serves the Opace website's checker, not scripted "
                "clients. The model itself is open — run it locally instead.",
                retryable=False, extra={"detail": why})
    return None


def _score(text: str) -> tuple[float, float, int]:
    enc = TOKENIZER(text, truncation=True, max_length=512,
                    padding="max_length", return_tensors="np")
    feed = {n: enc[n].astype(np.int64) for n in INPUT_NAMES if n in enc}
    logits = SESSION.run(None, feed)[0][0]
    margin = float(logits[1] - logits[0])
    p = 1.0 / (1.0 + np.exp(-margin / TEMPERATURE))
    n_tokens = int(enc["attention_mask"].sum())
    return margin, float(p), n_tokens


def _score_document(text: str) -> tuple[list[dict], int]:
    """Score every segment and return the per-segment rows in document order.

    Segments are scored in `scoring_order`, which puts the middle and the end
    first. The verdict is the maximum, so the order cannot change the answer;
    matching the browser's order means a failure part-way through leaves the
    two routes with the same evidence.
    """
    parts = segment_text(text, count_tokens)
    rows: list[dict | None] = [None] * len(parts)
    for index in scoring_order(len(parts)):
        seg = parts[index]
        margin, p, n_tokens = _score(seg.text)
        rows[index] = {
            "index": seg.index,
            "word_start": seg.word_start,
            "word_end": seg.word_end,
            "words": seg.words,
            "char_start": seg.start,
            "char_end": seg.end,
            "probability_ai": round(p, 4),
            "margin": round(margin, 6),
            "flagged": bool(p >= THRESHOLD_PROB),
            "tokens_scored": n_tokens,
            # True only if a single segment somehow exceeded the window.
            # Under segments-v1 this fired on 5.78% of segments and was NOT a
            # drift signal — both routes truncated identically. Under
            # segments-v2 every segment is measured to fit before it is
            # scored, so this is now genuinely a "should never happen".
            "truncated": n_tokens >= MODEL_MAX_TOKENS,
        }
    return [r for r in rows if r is not None], len(parts)


@APP.get("/v1/challenge")
async def challenge(request: Request,
                    ua: str | None = Header(None, alias="user-agent"),
                    origin: str | None = Header(None, alias="origin")):
    """Step one of the token exchange. Cheap, unauthenticated, rate-limited."""
    refused = _gate(ua, origin)
    if refused:
        return refused
    net = _network(_client_ip(request))
    ok, retry_after, window = REQUEST_LIMITER.consume(_key(net), 1)
    if not ok:
        return _blocked(429, "rate_limited",
                        "Too many requests from this connection. Try again "
                        "shortly, or switch to in-browser processing.",
                        retryable=True, retry_after=retry_after,
                        extra={"scope": "per_connection", "window": window})
    return {
        "challenge": _make_challenge(_bind(net)),
        "algorithm": "sha256(challenge + ':' + nonce)",
        "difficulty_bits": POW_BITS,
        "expires_in": CHALLENGE_TTL_SECONDS,
        "instructions": f"Find any nonce whose digest starts with {POW_BITS} "
                        "zero bits, then POST {challenge, nonce} to /v1/token.",
    }


class TokenRequest(BaseModel):
    challenge: str = Field(..., max_length=256)
    nonce: str = Field(..., max_length=64)


@APP.post("/v1/token")
async def token(request: Request, body: TokenRequest,
                ua: str | None = Header(None, alias="user-agent"),
                origin: str | None = Header(None, alias="origin")):
    refused = _gate(ua, origin)
    if refused:
        return refused
    net = _network(_client_ip(request))
    bind = _bind(net)
    why = _check_challenge(body.challenge, bind, body.nonce)
    if why:
        return _blocked(400, "challenge_failed",
                        "That challenge could not be verified. Request a new "
                        "one from /v1/challenge.", retryable=True,
                        extra={"detail": why})
    tok, exp = _mint_token(bind)
    return {"token": tok, "expires_at": exp, "max_checks": TOKEN_MAX_USES,
            "header": "x-opace-token"}


@APP.post("/v1/check")
async def check(request: Request, body: CheckRequest,
                ua: str | None = Header(None, alias="user-agent"),
                origin: str | None = Header(None, alias="origin"),
                client_token: str | None = Header(None, alias="x-opace-token")):
    # Order matters, and it is deliberately cheapest-first. The per-client
    # limits sit in front of the global cap so that one abuser is refused out
    # of their own allowance rather than out of everyone else's, and the
    # inference-weighted limit sits behind the request-count limit so that
    # working out what a document costs is itself rate-limited.
    refused = _gate(ua, origin)
    if refused:
        return refused

    net = _network(_client_ip(request))
    ip_key = _key(net)

    if REQUIRE_TOKEN:
        why = _spend_token(client_token, _bind(net))
        if why:
            return _blocked(
                401, "token_required",
                "This check needs a short-lived token. The page requests one "
                "automatically; reload it and try again.", retryable=True,
                extra={"detail": why, "obtain": "/v1/challenge"})

    ok, retry_after, window = REQUEST_LIMITER.consume(ip_key, 1)
    if not ok:
        return _blocked(
            429, "rate_limited",
            "You have run a lot of checks from this connection. Try again in "
            "a few minutes, or switch to in-browser processing, which has no "
            "limit.", retryable=True, retry_after=retry_after,
            extra={"scope": "per_connection", "window": window})

    # md-strip-v1: the model input is normalised to the plain-prose surface the
    # published accuracy figures were measured on, BEFORE the size checks and
    # segmentation, exactly as the client does at snapshot time — so both routes
    # segment and score the same bytes. Markdown syntax goes; every word and
    # paragraph break stays. See INPUT_NORMALISATION in segments.py and
    # docs/measurements/INPUT-SURFACE-2026-08-31.md for the measurement
    # (raw markdown flagged 22.5% of structured human docs; stripped, 0.0%).
    text = normalise_input(body.text)
    if len(text) > MAX_CHARS:
        return _blocked(
            413, "too_large",
            f"Send at most {MAX_CHARS:,} characters. For anything longer, the "
            f"in-browser check reads documents of any length.",
            retryable=False, extra={"max_chars": MAX_CHARS})

    words = count_words(text)
    if words > MAX_WORDS:
        return _blocked(
            413, "too_long",
            f"This endpoint scores documents up to {MAX_WORDS:,} words — a "
            f"long article. Yours is {words:,}. The in-browser check has no "
            f"length limit and uses the same model.",
            retryable=False,
            extra={"max_words": MAX_WORDS, "word_count": words})
    if words < MIN_WORDS:
        return JSONResponse(
            {"error": "too_short",
             "message": f"Needs at least {MIN_WORDS} words to give a reading. "
                        f"Below 200 words accuracy falls sharply and below 100 "
                        f"words the result is not meaningful.",
             "processed": "none", "retained": "nothing", "retryable": False,
             "word_count": words}, status_code=422)

    cost = segment_count(text, count_tokens)

    ok, retry_after, window = INFERENCE_LIMITER.consume(ip_key, cost)
    if not ok:
        return _blocked(
            429, "rate_limited",
            "You have checked a lot of text from this connection — long "
            "documents count for more, because each one is scored section by "
            "section. Try again later, or switch to in-browser processing, "
            "which has no limit.", retryable=True, retry_after=retry_after,
            extra={"scope": "per_connection", "window": window,
                   "unit": "inferences", "required": cost})

    allowed, remaining, retry_after, resets_in = QUOTA.reserve(cost)
    if not allowed:
        # retry_after is the accrual wait, usually a couple of minutes, not the
        # hours-to-midnight this used to quote. The wording follows it: telling
        # someone to come back tomorrow when the true wait is 90 seconds sends
        # them away for no reason.
        wait = "shortly" if retry_after <= 90 else (
            f"in about {max(1, round(retry_after / 60))} minutes"
            if retry_after < 5400 else
            f"in about {max(1, round(retry_after / 3600))} hours")
        return _blocked(
            429, "daily_allowance_exhausted",
            f"The shared allowance for server-side checks is fully spoken for "
            f"right now. It refills continuously, so try again {wait} — or run "
            f"the check in your browser now, which uses the same model, reads "
            f"the whole document and has no limit.",
            retryable=True, retry_after=retry_after,
            extra={"scope": "service_wide", "unit": "inferences",
                   "required": cost, "remaining": remaining,
                   "resets_in_seconds": resets_in, "resets_at": "00:00 UTC"})

    t0 = time.perf_counter()
    rows, n_segments = await run_in_threadpool(_score_document, text)
    ms = (time.perf_counter() - t0) * 1000
    del text, body                       # nothing holds the content past here

    # The reported probability is still the MAXIMUM segment score, never the
    # mean. Averaging was measured to dilute detection from 93.3% to 57.8% on
    # the same documents: one AI section inside an otherwise human draft is
    # washed out by the human sections around it. `aggregation` stays "max"
    # because that is what this field IS, and the browser refuses any other
    # value; the flag rule is reported separately below.
    ordered = sorted(rows, key=lambda r: r["probability_ai"], reverse=True)
    strongest = ordered[0]
    # None for a single-section document. There is no second section, so the
    # secondary arm cannot fire and such documents are unaffected by the rule
    # change by definition. test_aggregation.py asserts exactly that.
    runner_up = ordered[1] if len(ordered) > 1 else None

    primary_fired = bool(strongest["probability_ai"] >= THRESHOLD_PROB)
    secondary_fired = bool(runner_up is not None
                           and runner_up["probability_ai"] >= SECONDARY_THRESHOLD_PROB)

    return {
        "model": "tier3-cycle2",
        "model_build": MODEL_ID,
        "precision": "fp32",
        "segmentation_contract": SEGMENTATION_CONTRACT,
        "aggregation": "max",
        "probability_ai": strongest["probability_ai"],
        "margin": strongest["margin"],
        "flagged": bool(primary_fired or secondary_fired),
        "threshold": THRESHOLD_PROB,
        # Everything the client needs to re-derive the verdict itself. The
        # front end recomputes `flagged` from these and refuses the response if
        # it disagrees, so a route that drifts is caught loudly rather than
        # quietly reporting a different answer from the other one.
        "secondary_threshold": SECONDARY_THRESHOLD_PROB,
        "second_probability_ai": runner_up["probability_ai"] if runner_up else None,
        "second_segment": runner_up["index"] if runner_up else None,
        "flag_rule": "minimum-evidence",
        # Which arm actually fired, for the copy the reader sees. "primary" is
        # one very confident section; "secondary" is two sections agreeing,
        # which is the better evidence of the two and is worth saying out loud.
        # "primary" wins the label when both fired.
        "flag_reason": ("primary" if primary_fired
                        else "secondary" if secondary_fired else None),
        "word_count": words,
        "words_sent": words,
        "segment_count": n_segments,
        "strongest_segment": strongest["index"],
        "segments": rows,
        "tokens_scored": sum(r["tokens_scored"] for r in rows),
        "truncated": any(r["truncated"] for r in rows),
        "inference_ms": round(ms, 1),
        "inferences": n_segments,
        "processed": "server",
        "retained": "nothing",
        "daily_allowance_remaining": remaining,
    }


@APP.get("/v1/health")
async def health():
    # Deliberately unauthenticated and ungated: Cloud Run and any uptime check
    # need it, and it discloses nothing about any request.
    return {"ok": True, "model": "tier3-cycle2", "precision": "fp32",
            "model_build": MODEL_ID, "threads": ORT_THREADS,
            "segmentation_contract": SEGMENTATION_CONTRACT,
            "input_normalisation": INPUT_NORMALISATION}


@APP.get("/v1/status")
async def status():
    """What the front end needs to warn a visitor before they type 2,000 words."""
    snap = QUOTA.snapshot()
    return {
        "ok": True,
        "unit": "inferences",
        "service_daily_cap": snap["cap"],
        "service_daily_remaining_estimate": snap["remaining_estimate"],
        # The allowance is paced across the day rather than handed out in one
        # bucket, so "remaining today" and "spendable now" are different
        # numbers. A front end sizing up a 2,000-word paste wants the latter.
        "service_available_now_estimate": snap["available_now_estimate"],
        "service_burst": snap["burst"],
        "service_accrual_per_hour": snap["accrual_per_hour"],
        "resets_in_seconds": snap["resets_in_seconds"],
        "per_connection": {
            "requests": {"per_minute": REQ_PER_MINUTE, "per_hour": REQ_PER_HOUR,
                         "per_day": REQ_PER_DAY},
            "inferences": {"per_minute": INF_PER_MINUTE, "per_hour": INF_PER_HOUR,
                           "per_day": INF_PER_DAY},
        },
        "max_chars": MAX_CHARS,
        "max_words": MAX_WORDS,
        "max_inferences_per_request": MAX_SEGMENTS_PER_REQUEST,
        "segmentation_contract": SEGMENTATION_CONTRACT,
        "input_normalisation": INPUT_NORMALISATION,
        "token_required": REQUIRE_TOKEN,
        "fallback": LOCAL_FALLBACK,
    }


@APP.exception_handler(RequestValidationError)
async def _validation_no_echo(request: Request, exc: RequestValidationError):
    """Say WHICH field failed and WHY, never WHAT was sent.

    FastAPI's default handler returns `exc.errors()` unfiltered, and pydantic
    v2 puts the offending value in each error's `input` key — so a malformed
    request has its own body handed straight back to the sender. Nothing was
    ever written down by that path, so rule 1 held either way; but a service
    whose promise is that the document is scored in memory and discarded should
    not repeat any part of a submission in any response, to anyone, including
    the sender. This keeps `loc`, `type` and `msg` — which between them name
    the field and the rule it broke — and drops `input`, `ctx` and `url`, which
    are the only keys a submitted value can reach.

    The status stays 422: it is what FastAPI's default returned, it is what the
    too-short refusal above returns, and `src/lib/local-signals/server-route.ts`
    branches on the status code. The body carries the full refusal contract
    (`error`, `message`, `processed`, `retained`, `retryable`, `fallback`) so
    the front end reads it like every other block rather than as a shape it
    does not recognise.
    """
    fields = []
    for err in exc.errors()[:10]:
        # String parts only. pydantic puts a byte OFFSET in `loc` for a
        # malformed-JSON error ("body", 35) and list indices there for nested
        # models; both are derived from what was sent, and neither reads as a
        # field name, so they are dropped rather than reported.
        path = [part for part in err.get("loc", ())
                if isinstance(part, str) and part != "body"]
        fields.append({
            "field": ".".join(path) or "body",
            # pydantic's own rule identifier, e.g. "string_type",
            # "missing", "greater_than_equal". A fixed vocabulary, never
            # anything the caller chose.
            "rule": str(err.get("type", "invalid")),
            # pydantic's stock sentence for that rule. It describes what was
            # required, not what arrived.
            "reason": str(err.get("msg", "Invalid value.")),
        })
    named = ", ".join(field["field"] for field in fields) or "the request body"
    return JSONResponse(
        {"error": "invalid_request",
         "message": f"The request body was not in the expected shape "
                    f"({named}). What you sent is not repeated back here.",
         "processed": "none",
         "retained": "nothing",
         "retryable": False,
         "fields": fields,
         "fallback": LOCAL_FALLBACK},
        status_code=422)


@APP.exception_handler(Exception)
async def _no_leak(request: Request, exc: Exception):
    # Default handlers print the request body into the traceback. This one
    # deliberately discards everything about the request.
    return JSONResponse({"error": "internal", "message": "Check failed.",
                         "processed": "none", "retained": "nothing",
                         "retryable": True, "fallback": LOCAL_FALLBACK},
                        status_code=500)
