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

  Per-channel floors and the shared pool — who gets the daily allowance
    CHANNEL_FLOOR_BROWSER_PCT   [40] guaranteed share of GLOBAL_DAILY_INFERENCES
    CHANNEL_FLOOR_WORDPRESS_PCT [40] for each surface. The percentages must sum
    CHANNEL_FLOOR_CHROME_PCT    [20] to 100 or less; whatever they leave, plus
                                     every floor a channel does not spend, is
                                     one shared pool any channel may draw on
                                     once its own floor is gone.

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

  WordPress channel — disabled until the staged deployment gates pass
    ENABLE_WORDPRESS_CHANNEL [0]
    WP_REPLAY_BACKEND       [QUOTA_BACKEND]  firestore required in production
    WP_REPLAY_COLLECTION    [detector_wordpress_replay]
    WP_CHALLENGE_TTL_SECONDS [120] clamped to 30..300
    WP_TOKEN_TTL_SECONDS    [120]  clamped to 30..300, always one check
    WP_POW_BITS             [POW_BITS] clamped to 14..24
    WP_SITE_INFERENCES_PER_DAY  [600] one site's ceiling inside the WordPress
    WP_SITE_INFERENCES_PER_HOUR [60]  floor, counted in a shared store so it
                                      survives an instance being replaced
    WP_SITE_QUOTA_BACKEND   [WP_REPLAY_BACKEND]
    WP_SITE_QUOTA_COLLECTION [detector_wordpress_site_quota]
    WP_SITE_FLUSH_EVERY     [10]   local inferences before the shared per-site
    WP_SITE_FLUSH_SECONDS   [15]   counter is updated, or this long

  Chrome extension channel — disabled until Store ID and deploy gates pass
    ENABLE_CHROME_CHANNEL   [0]
    CHROME_EXTENSION_IDS    [] exact comma-separated a-p IDs, no wildcards
    CHROME_REPLAY_BACKEND   [QUOTA_BACKEND] firestore required in production
    CHROME_REPLAY_COLLECTION [detector_chrome_replay]
    CHROME_CHALLENGE_TTL_SECONDS [120] clamped to 30..300
    CHROME_TOKEN_TTL_SECONDS [120] clamped to 30..300, always one check
    CHROME_POW_BITS         [POW_BITS] clamped to 14..24

  Size
    MAX_CHARS               [100000]
    MAX_WORDS               [8000]   caps a single request at ~20 inferences
    MAX_BODY_BYTES          [700000]
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
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
import extension_channel as extension_channel
import wordpress_channel as wp_channel


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "") or default)
    except ValueError:
        return default


def _env_flag(name: str, default: bool) -> bool:
    return (os.environ.get(name, "1" if default else "0") or "").strip().lower() in (
        "1", "true", "yes", "on")


def utf16_length(value: str) -> int:
    """Count the same UTF-16 code units used by browser character limits."""
    return len(value.encode("utf-16-le")) // 2


MODEL_PATH = os.environ.get("MODEL_PATH", "./model/tier3-cycle2-e5small-fp32.onnx")
TOKENIZER_DIR = os.environ.get("TOKENIZER_DIR", "./model/tokenizer")
ORT_THREADS = _env_int("ORT_THREADS", 2)
# The model registry, such as it is: which operating-point file and model
# config this process serves. Input normalisation, the flag rule and the
# feature contract are properties of the MODEL, not of the pipeline — cycle 2
# was measured on md-strip-v1 prose with a two-probability rule; cycle 5 was
# trained and measured on raw text with a margin-space rule and an 8-feature
# structural input. Both files are baked into the image beside the weights.
MODEL_CONFIG_PATH = os.environ.get("MODEL_CONFIG_PATH", "")
THRESHOLDS_PATH = os.environ.get("THRESHOLDS_PATH", "")

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

# --- who gets the daily allowance -------------------------------------------
# One shared ceiling is first come, first served: whichever surface wakes up
# earliest empties it, and the others spend the rest of the day on their
# fallback. Floors fix that without buying anything. Each channel is guaranteed
# a percentage of GLOBAL_DAILY_INFERENCES that no other channel can touch;
# everything above its own floor comes out of one shared pool, which is
# whatever the floors leave over plus every floor its owner has not spent.
#
# The pool is not a separate bucket that is topped up during the day. It is an
# arithmetic consequence of the counters that were already there:
#
#     pool_now = cap - total_used - SUM over the other channels of
#                                   (their floor - what they have used)
#
# so a channel that sits idle lends its guarantee to whoever is busy, and a
# channel that is busy can never drive an idle one below its floor. At the
# shipped 40/40/20 the floors account for the whole cap, so the pool starts at
# zero and grows only out of unspent guarantees — which is the point.
#
# Setting a channel to 100 and the rest to 0 restores the old single-bucket
# behaviour for that channel; setting all three to 0 makes every request draw
# on the pool alone, which is exactly the pre-floor service. Neither is
# recommended, but neither is a special case in the code.
#
# **How an unspent floor reaches the pool, and why it has to.** At the shipped
# 40/40/20 the floors account for the whole cap, so if every unspent floor were
# held back until midnight the pool would be empty by construction and the
# floors would be plain hard caps — arithmetic, not opinion: with the
# percentages summing to 100, "cap less everything spent less the other
# channels' unspent floors" reduces exactly to this channel's own unspent
# floor. That is not a theoretical objection. Today the website checker is the
# only busy surface, so hard caps would cut it from 12,000 section readings a
# day to 4,800 and throw the other 7,200 away at midnight, in the name of
# protecting two channels that had not asked for them.
#
# So an unspent floor is protected in proportion to the DAY IT HAS LEFT to be
# spent in:
#
#     protected = (floor - used) * seconds_remaining_today / 86400
#
# At 00:00 UTC an idle channel's whole guarantee is untouchable, which is the
# case that matters: a plugin flood first thing in the morning cannot take the
# website's share. As the day runs on without that channel claiming it, the
# guarantee it did not use is released to whoever is working, rather than being
# wasted. A channel that uses the service at any ordinary cadence never notices,
# because it spends against its floor as it goes.
#
# This is the one place where the design is weaker than the plainest reading of
# "no channel can push another below its floor": late in the UTC day, a channel
# that has been idle since midnight can find part of its guarantee already lent
# out. The alternative is a guarantee that is honoured by destroying the
# capacity instead of lending it. CHANNEL_POOL_RELEASE=none restores the strict
# reading — floors become hard caps and the pool is whatever the percentages
# leave unallocated — and is a single reviewed env var, exactly as
# GLOBAL_BURST_INFERENCES is its own off switch.
CHANNEL_POOL_RELEASE = os.environ.get(
    "CHANNEL_POOL_RELEASE", "time").strip().lower()
if CHANNEL_POOL_RELEASE not in ("time", "none"):
    raise RuntimeError("CHANNEL_POOL_RELEASE must be 'time' or 'none'")
QUOTA_CHANNELS = ("browser", "wordpress", "chrome")
CHANNEL_FLOOR_PCT = {
    "browser": _env_int("CHANNEL_FLOOR_BROWSER_PCT", 40),
    "wordpress": _env_int("CHANNEL_FLOOR_WORDPRESS_PCT", 40),
    "chrome": _env_int("CHANNEL_FLOOR_CHROME_PCT", 20),
}
if any(value < 0 or value > 100 for value in CHANNEL_FLOOR_PCT.values()):
    raise RuntimeError("CHANNEL_FLOOR_*_PCT must each be between 0 and 100")
if sum(CHANNEL_FLOOR_PCT.values()) > 100:
    # Floors that sum above the cap are not a preference, they are a promise
    # the service cannot keep. Refuse to start rather than discover it under
    # load, when the symptom would be one channel being refused inside its own
    # guaranteed share.
    raise RuntimeError("CHANNEL_FLOOR_*_PCT must sum to 100 or less")

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

# The WordPress service channel is deliberately a separate credential class.
# It does not use browser Origin/UA signals, and its one-shot credentials are
# never accepted by the browser route (or vice versa).
ENABLE_WORDPRESS_CHANNEL = _env_flag("ENABLE_WORDPRESS_CHANNEL", False)
WP_CHALLENGE_TTL_SECONDS = max(
    30, min(_env_int("WP_CHALLENGE_TTL_SECONDS", 120), 300))
WP_TOKEN_TTL_SECONDS = max(
    30, min(_env_int("WP_TOKEN_TTL_SECONDS", 120), 300))
WP_POW_BITS = max(14, min(_env_int("WP_POW_BITS", POW_BITS), 24))
WP_REPLAY_BACKEND = os.environ.get(
    "WP_REPLAY_BACKEND", QUOTA_BACKEND).strip().lower()
WP_REPLAY_COLLECTION = os.environ.get(
    "WP_REPLAY_COLLECTION", "detector_wordpress_replay")
WP_HANDSHAKE_PER_MINUTE = _env_int("WP_HANDSHAKE_PER_MINUTE", 10)
WP_HANDSHAKE_PER_HOUR = _env_int("WP_HANDSHAKE_PER_HOUR", 60)
WP_HANDSHAKE_PER_DAY = _env_int("WP_HANDSHAKE_PER_DAY", 200)

# One site must not be able to eat the whole WordPress floor. The four in-process
# limiters already charge a per-site scope, but they live inside a process that
# Cloud Run replaces whenever the service scales to zero, so a site that keeps
# coming back gets a fresh allowance each time. These two ceilings are counted
# in the same shared store the channel's replay ledger uses, so they survive
# that. 600 section readings a day is roughly 200 average drafts — far more
# than a working editorial team runs — and 60 an hour keeps a scripted loop from
# spending a day's worth before lunch.
WP_SITE_INFERENCES_PER_DAY = max(0, _env_int("WP_SITE_INFERENCES_PER_DAY", 600))
WP_SITE_INFERENCES_PER_HOUR = max(0, _env_int("WP_SITE_INFERENCES_PER_HOUR", 60))
WP_SITE_QUOTA_BACKEND = os.environ.get(
    "WP_SITE_QUOTA_BACKEND", WP_REPLAY_BACKEND).strip().lower()
WP_SITE_QUOTA_COLLECTION = os.environ.get(
    "WP_SITE_QUOTA_COLLECTION", "detector_wordpress_site_quota")
WP_SITE_FLUSH_EVERY = max(1, _env_int("WP_SITE_FLUSH_EVERY", 10))
WP_SITE_FLUSH_SECONDS = max(1, _env_int("WP_SITE_FLUSH_SECONDS", 15))

# Chrome cannot safely impersonate the website Origin and must not bundle a
# shared secret. Its optional EU route therefore has a distinct, disabled by
# default credential class. Production enablement requires the exact public
# Web Store extension ID; unpacked/development IDs are test allowlist entries,
# never wildcards.
ENABLE_CHROME_CHANNEL = _env_flag("ENABLE_CHROME_CHANNEL", False)
_CHROME_EXTENSION_ID_VALUES = [
    value.strip().lower()
    for value in os.environ.get("CHROME_EXTENSION_IDS", "").split(",")
    if value.strip()
]
if any(len(value) != 32 or any(character not in "abcdefghijklmnop"
                               for character in value)
       for value in _CHROME_EXTENSION_ID_VALUES):
    raise RuntimeError("CHROME_EXTENSION_IDS contains an invalid Chrome ID")
CHROME_EXTENSION_IDS = set(_CHROME_EXTENSION_ID_VALUES)
CHROME_CHALLENGE_TTL_SECONDS = max(
    30, min(_env_int("CHROME_CHALLENGE_TTL_SECONDS", 120), 300))
CHROME_TOKEN_TTL_SECONDS = max(
    30, min(_env_int("CHROME_TOKEN_TTL_SECONDS", 120), 300))
CHROME_POW_BITS = max(14, min(_env_int("CHROME_POW_BITS", POW_BITS), 24))
CHROME_REPLAY_BACKEND = os.environ.get(
    "CHROME_REPLAY_BACKEND", QUOTA_BACKEND).strip().lower()
CHROME_REPLAY_COLLECTION = os.environ.get(
    "CHROME_REPLAY_COLLECTION", "detector_chrome_replay")
CHROME_HANDSHAKE_PER_MINUTE = _env_int("CHROME_HANDSHAKE_PER_MINUTE", 10)
CHROME_HANDSHAKE_PER_HOUR = _env_int("CHROME_HANDSHAKE_PER_HOUR", 60)
CHROME_HANDSHAKE_PER_DAY = _env_int("CHROME_HANDSHAKE_PER_DAY", 200)

MAX_CHARS = _env_int("MAX_CHARS", 100000)
MAX_WORDS = _env_int("MAX_WORDS", 8000)
# PHP's default JSON encoder may use six ASCII bytes per UTF-16 code unit. The
# body ceiling allows the advertised 100,000-unit document plus its small
# request envelope. MAX_CHARS and MAX_WORDS remain the decoded inference-cost
# boundaries.
MAX_BODY_BYTES = _env_int("MAX_BODY_BYTES", 700000)
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

# --- which model's contract this process serves ------------------------------
# Defaults are the cycle-2 shape above; a thresholds file in the cycle-5 shape
# (it carries `secondary_gap`, which is a margin-space quantity that cannot be
# confused with a probability) switches the process to the margin-space rule.
#
# THE CYCLE-5 RULE IS A DIFFERENT COMPARISON, NOT DIFFERENT NUMBERS. Ported
# from cycle5-train/analyse.py::key_margin / flagged_margin, the exact code
# the operating point was fitted with (CYCLE5-OPERATING-POINT-2026-08-31.md):
#
#     flag  <=>  max(m1, m2 + secondary_gap) >= threshold
#
# where m1/m2 are the top two per-segment RAW LOGIT MARGINS (AI logit minus
# human logit), never passed through softmax or temperature for the verdict.
# Temperature calibrates only the DISPLAYED probability. A single-segment
# document has no m2, so the rule degenerates to m1 >= threshold, exactly as
# key_margin does with a one-element list.
MODEL_NAME = "tier3-cycle2"
SCORING = "probability-v1"
INPUT_NORMALISATION_ACTIVE = INPUT_NORMALISATION      # md-strip-v1 (cycle 2)
FEATURES_CONTRACT = None
MARGIN_THRESHOLD = None
SECONDARY_GAP = None
FEATURE_NORM = None
if THRESHOLDS_PATH:
    with open(THRESHOLDS_PATH) as _fh:
        _thr = json.load(_fh)
    if "secondary_gap" in _thr:
        SCORING = "margin-v1"
        MARGIN_THRESHOLD = float(_thr["threshold"])
        SECONDARY_GAP = float(_thr["secondary_gap"])
        TEMPERATURE = float(_thr["temperature"])
        MODEL_NAME = str(_thr.get("version", MODEL_NAME))
        # raw-v1 for cycle 5: trained markdown-in on both the encoder and the
        # structural features; its headline FP figures are measured on raw
        # text (PHASE1-PARITY-NOTE-2026-09-01.md). Stripping here would
        # corrupt the very structure features 0-4 and 7 read.
        INPUT_NORMALISATION_ACTIVE = str(
            _thr.get("input_normalisation", INPUT_NORMALISATION))
        FEATURES_CONTRACT = _thr.get("features_contract")
    else:
        raise RuntimeError(
            "THRESHOLDS_PATH is set but not in the margin-space shape this "
            "server knows how to serve; refusing to guess a flag rule.")
if MODEL_CONFIG_PATH:
    with open(MODEL_CONFIG_PATH) as _fh:
        _cfg = json.load(_fh)
    FEATURE_NORM = _cfg.get("feature_norm")
    MODEL_NAME = str(_cfg.get("version", MODEL_NAME))

# --- model, loaded once ------------------------------------------------------
_opts = ort.SessionOptions()
_opts.intra_op_num_threads = ORT_THREADS
_opts.log_severity_level = 3           # ORT must not print anything about inputs
SESSION = ort.InferenceSession(MODEL_PATH, _opts, providers=["CPUExecutionProvider"])
INPUT_NAMES = [i.name for i in SESSION.get_inputs()]
TOKENIZER = AutoTokenizer.from_pretrained(TOKENIZER_DIR)

# A 3-input graph (cycle 5) declares a `feats` input: the 8 structural
# features, computed PER SEGMENT with the vendored training-time extraction
# code (c5features/ — verbatim copies of the measurement modules
# struct_features.py imports; parity against full-vector-golden.json is a
# deploy gate, test_c5features.py). Refuse to start half-configured: a feats
# model with no feature_norm would silently score garbage.
USE_FEATS = "feats" in INPUT_NAMES
if USE_FEATS:
    if not FEATURE_NORM:
        raise RuntimeError("model declares a feats input but MODEL_CONFIG_PATH "
                           "provided no feature_norm; refusing to serve.")
    if SCORING != "margin-v1":
        raise RuntimeError("a feats model without a margin-space thresholds "
                           "file has no fitted operating point; refusing.")
    import sys as _sys
    _sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "c5features"))
    from struct_features import extract as _feat_extract  # noqa: E402
    from c5norm import z_norm as _z_norm  # noqa: E402


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
    "note": "A one-off 34 MB download, then nothing leaves your device. There "
            "is no shared daily allowance, and each run accepts up to 100,000 "
            "characters.",
}

# WordPress cannot promise that every host can run the 34 MB ONNX model. A
# service refusal therefore returns a deterministic plugin-local fallback,
# never an instruction to spoof the website route. No model reading is implied.
WORDPRESS_FALLBACK = {
    "available": True,
    "mode": "wordpress-local",
    "action": "run_wordpress_subset",
    "download_mb": 0,
    "label": "Run the local WordPress integrity checks instead",
    "note": "The plugin can still inspect provenance, credentials and text "
            "signals locally. No trained-model reading was made.",
}

CHROME_FALLBACK = {
    "available": True,
    "mode": "chrome-on-device",
    "action": "offer_extension_model",
    "download_mb": 34.5,
    "label": "Run the full check on this device instead",
    "note": "The extension can use the verified Cycle-5 model locally after "
            "explicit download consent. Text is not uploaded for scoring and "
            "there is no shared daily allowance.",
}


def _blocked(status: int, error: str, message: str, *, retryable: bool,
             retry_after: int | None = None, extra: dict | None = None,
             fallback: dict | None = None,
             ) -> JSONResponse:
    body = {
        "error": error,
        "message": message,
        "processed": "none",
        "retained": "nothing",
        "retryable": retryable,
        "fallback": fallback or LOCAL_FALLBACK,
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
        allowed, retry_after, window, _scope = self.consume_scoped(
            [("per_connection", key)], cost)
        return allowed, retry_after, window

    def consume_scoped(
            self, scopes: list[tuple[str, str]], cost: int = 1
            ) -> tuple[bool, int, str, str]:
        """Atomically charge every scope, or none.

        WordPress traffic is limited by exact IP, collapsed connection network,
        site and install. Checking all four under one lock avoids charging the
        earlier scopes when a later scope refuses the request.
        """
        now = time.time()
        unique_scopes = []
        seen_keys = set()
        for scope, key in scopes:
            if key not in seen_keys:
                unique_scopes.append((scope, key))
                seen_keys.add(key)
        with self._lock:
            live: dict[str, list[tuple[float, int]]] = {}
            for scope, key in unique_scopes:
                events = [e for e in self._events[key]
                          if now - e[0] < self._max_span]
                self._events[key] = events
                live[key] = events
                for span, limit in self._windows:
                    used = sum(c for t, c in events if now - t < span)
                    if used + cost > limit:
                        oldest = min((t for t, _ in events if now - t < span),
                                     default=now)
                        return (False,
                                max(1, int(span - (now - oldest))),
                                _SPAN_LABEL.get(span, f"{span}s"), scope)
            for _scope, key in unique_scopes:
                live[key].append((now, cost))
            if len(self._events) > 50_000:      # bounded memory; drop cold keys
                for k, v in list(self._events.items()):
                    if not v or now - v[-1][0] > self._max_span:
                        self._events.pop(k, None)
            return True, 0, "", ""


REQUEST_LIMITER = WeightedLimiter([(60, REQ_PER_MINUTE), (3600, REQ_PER_HOUR),
                                   (86400, REQ_PER_DAY)])
INFERENCE_LIMITER = WeightedLimiter([(60, INF_PER_MINUTE), (3600, INF_PER_HOUR),
                                     (86400, INF_PER_DAY)])
WP_HANDSHAKE_LIMITER = WeightedLimiter([
    (60, WP_HANDSHAKE_PER_MINUTE), (3600, WP_HANDSHAKE_PER_HOUR),
    (86400, WP_HANDSHAKE_PER_DAY)])
CHROME_HANDSHAKE_LIMITER = WeightedLimiter([
    (60, CHROME_HANDSHAKE_PER_MINUTE),
    (3600, CHROME_HANDSHAKE_PER_HOUR),
    (86400, CHROME_HANDSHAKE_PER_DAY)])


# --- global daily cap --------------------------------------------------------
def _utc_day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _seconds_elapsed_today() -> int:
    now = datetime.now(timezone.utc)
    return int(now.hour * 3600 + now.minute * 60 + now.second)


def _seconds_to_utc_midnight() -> int:
    return 86400 - _seconds_elapsed_today()


def _utc_hour() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H")


def _seconds_to_utc_hour_end() -> int:
    now = datetime.now(timezone.utc)
    return 3600 - int(now.minute * 60 + now.second)


def _quota_channel(channel: str | None) -> str:
    """Map a credential class to the allowance bucket it spends from.

    `channel` is None on the website route, which is the browser bucket. The
    credential-class strings are the ones the channels advertise, so the two
    never drift apart silently.
    """
    if channel == wp_channel.CHANNEL:
        return "wordpress"
    if channel == extension_channel.CHANNEL:
        return "chrome"
    return "browser"


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

    **The cap is also divided, not only paced.** Pacing decides *when* the
    allowance may be spent; the per-channel floors decide *who* may spend it.
    Each channel is guaranteed CHANNEL_FLOOR_*_PCT of the cap and may spend
    beyond that only out of the shared pool — the cap less everything already
    spent less the floors the other channels have not yet used. The two
    controls compose in one direction only: the paced allowance is checked
    first and bounds the whole service, then the floor arithmetic decides
    whether this particular channel may take the next slice of it. Neither can
    raise the daily total, so the bill is untouched by both.
    """

    @staticmethod
    def _floor_for(cap: int, channel: str) -> int:
        """This channel's guaranteed share of `cap`, in inferences."""
        return max(0, cap * CHANNEL_FLOOR_PCT.get(channel, 0) // 100)

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
        # The same three figures again, per channel. They ride in the same
        # Firestore document and the same atomic increment as the total, so
        # dividing the allowance costs no extra read, no extra write and no
        # extra failure mode.
        self._synced_channel: dict[str, int] = {}
        self._local_channel: dict[str, int] = defaultdict(int)
        self._flushed_channel: dict[str, int] = defaultdict(int)
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

    def _push(self, delta: int, channel_deltas: dict[str, int] | None = None) -> None:
        """Atomic increment, then read back the authoritative total.

        Firestore's Increment is applied server-side, so two instances writing
        at once cannot lose each other's counts. There is no read-modify-write
        and therefore no transaction, no retry loop, and none of the
        one-write-per-second contention a Cloud Storage object guarded by a
        generation precondition would impose exactly when it matters most.

        The per-channel counters are fields of the same document and go up in
        the same write, so the split total and the grand total can never be
        read a moment apart from each other.
        """
        doc = self._doc()
        payload: dict = {}
        if delta:
            payload["count"] = self._firestore.Increment(delta)
        for channel, channel_delta in (channel_deltas or {}).items():
            if channel_delta:
                payload[f"count_{channel}"] = self._firestore.Increment(channel_delta)
        if payload:
            doc.set({**payload, "day": self._day}, merge=True)
        snap = doc.get()
        data = snap.to_dict() if snap.exists else None
        data = data or {}
        self._synced_total = int(data.get("count", 0))
        self._synced_channel = {channel: int(data.get(f"count_{channel}", 0))
                                for channel in QUOTA_CHANNELS}
        self._last_read = time.time()

    def _flush_deltas(self) -> tuple[int, dict[str, int]]:
        """What this instance has performed but not yet written down."""
        return (self._local - self._flushed,
                {channel: self._local_channel.get(channel, 0)
                 - self._flushed_channel.get(channel, 0)
                 for channel in QUOTA_CHANNELS})

    def _mark_flushed(self) -> None:
        self._flushed = self._local
        for channel in QUOTA_CHANNELS:
            self._flushed_channel[channel] = self._local_channel.get(channel, 0)

    def _used_by_channel(self) -> dict[str, int]:
        """Caller must hold the lock. Inferences spent per channel today."""
        return {
            channel: (self._synced_channel.get(channel, 0)
                      + self._local_channel.get(channel, 0)
                      - self._flushed_channel.get(channel, 0))
            for channel in QUOTA_CHANNELS}

    @staticmethod
    def _protected(cap: int, channel: str, used_by_channel: dict[str, int],
                   elapsed: int) -> int:
        """How much of `channel`'s unspent floor is still held back from the pool.

        The whole of it at 00:00 UTC, none of it at 24:00, straight-line in
        between — see the CHANNEL_POOL_RELEASE note above for why an unspent
        guarantee has to reach the pool at all.
        """
        unspent = max(0, GlobalQuota._floor_for(cap, channel)
                      - used_by_channel.get(channel, 0))
        if CHANNEL_POOL_RELEASE != "time":
            return unspent
        remaining = 86400 - min(max(elapsed, 0), 86400)
        return int(unspent * remaining / 86400.0)

    @staticmethod
    def _pool_remaining(cap: int, used_by_channel: dict[str, int],
                        elapsed: int, *, excluding: str | None = None) -> int:
        """What the shared pool can still lend, from `excluding`'s point of view."""
        protected = sum(
            GlobalQuota._protected(cap, other, used_by_channel, elapsed)
            for other in QUOTA_CHANNELS if other != excluding)
        return max(0, cap - sum(used_by_channel.values()) - protected)

    @staticmethod
    def _channel_admits(cap: int, channel: str, cost: int,
                        used_by_channel: dict[str, int], elapsed: int) -> str:
        """Empty string if the floors and the pool allow `cost`, else the reason.

        Two ways to be allowed, and the first is unconditional: a channel
        inside its own floor is spending a guarantee nobody else can reach.
        Otherwise the request has to come out of the shared pool, which is the
        cap less everything spent less the guarantees still owed to the other
        channels.
        """
        own_used = used_by_channel.get(channel, 0)
        own_floor = GlobalQuota._floor_for(cap, channel)
        if own_used + cost <= own_floor:
            return ""
        if cost <= GlobalQuota._pool_remaining(cap, used_by_channel, elapsed,
                                               excluding=channel):
            return ""
        # Both doors are shut. Which one the caller is standing at decides the
        # wording a surface can honestly show: a channel that has spent its
        # whole guarantee is in a different position from one that still has a
        # guarantee left but asked for more than it covers.
        return ("channel_floor_exhausted" if own_used >= own_floor
                else "shared_pool_exhausted")

    def reserve(self, cost: int = 1,
                channel: str | None = None) -> tuple[bool, int, int, int, str]:
        """Claim `cost` inferences for `channel`.

        Returns (allowed, remaining_today, retry_after, resets_in, reason).
        `retry_after` is the wait until enough allowance has accrued, which is
        what makes a refusal recoverable in minutes; `resets_in` is still the
        seconds to 00:00 UTC, for the body's own reporting. `reason` is empty
        when the claim succeeded, and otherwise says which of the three
        ceilings refused it: "paced_allowance", "channel_floor_exhausted" or
        "shared_pool_exhausted". A surface reads it to decide whether to say
        "try again in a few minutes" or "the server is busy for today, the
        on-device route is available now".
        """
        bucket = channel if channel in QUOTA_CHANNELS else _quota_channel(channel)
        now = time.time()
        elapsed = _seconds_elapsed_today()
        resets_in = 86400 - elapsed
        with self._lock:
            day = _utc_day()
            if day != self._day:
                self._day, self._synced_total = day, 0
                self._local = self._flushed = 0
                self._synced_channel = {}
                self._local_channel = defaultdict(int)
                self._flushed_channel = defaultdict(int)
                self._last_flush = self._last_read = 0.0

            if self._degraded or self._client is None:
                # The instance's own share, paced on the same curve so a
                # Firestore outage degrades the ceiling without also restoring
                # the drain-it-all-at-once behaviour this exists to remove.
                # The floors divide that share on the same percentages, so a
                # store outage costs capacity and not fairness.
                share = max(1, GLOBAL_DAILY_INFERENCES // MAX_INSTANCES)
                burst = max(1, GLOBAL_BURST_INFERENCES // MAX_INSTANCES)
                allowance = self._allowance_at(share, burst, elapsed)
                if self._local + cost > allowance:
                    return (False, max(0, share - self._local),
                            self._wait_for(share, burst, elapsed,
                                           self._local + cost), resets_in,
                            "paced_allowance")
                refusal = self._channel_admits(
                    share, bucket, cost,
                    {name: self._local_channel.get(name, 0)
                     for name in QUOTA_CHANNELS}, elapsed)
                if refusal:
                    return (False, max(0, share - self._local),
                            max(1, resets_in), resets_in, refusal)
                self._local += cost
                self._local_channel[bucket] += cost
                return True, share - self._local, 0, resets_in, ""

            used = self._synced_total + (self._local - self._flushed)
            allowance = self._allowance_at(GLOBAL_DAILY_INFERENCES,
                                           GLOBAL_BURST_INFERENCES, elapsed)

            # At or over what has accrued: re-read occasionally in case the
            # figure is stale, then refuse. A refusal must never write, or a
            # flood would burn the daily write quota in minutes.
            if used + cost > allowance:
                if now - self._last_read > QUOTA_RECHECK_SECONDS:
                    try:
                        total_delta, channel_deltas = self._flush_deltas()
                        self._push(total_delta, channel_deltas)
                        self._mark_flushed()
                    except Exception:
                        self._last_read = now
                    used = self._synced_total + (self._local - self._flushed)
                if used + cost > allowance:
                    return (False, max(0, GLOBAL_DAILY_INFERENCES - used),
                            self._wait_for(GLOBAL_DAILY_INFERENCES,
                                           GLOBAL_BURST_INFERENCES, elapsed,
                                           used + cost), resets_in,
                            "paced_allowance")

            # There is service-wide allowance. Whether THIS channel may take it
            # is the second question, and the one the floors exist to answer.
            # As above, re-read a stale figure before refusing, because a
            # refusal here sends a real user to their fallback for the rest of
            # the day and a stale local delta is not good enough grounds.
            refusal = self._channel_admits(
                GLOBAL_DAILY_INFERENCES, bucket, cost, self._used_by_channel(),
                elapsed)
            if refusal:
                if now - self._last_read > QUOTA_RECHECK_SECONDS:
                    try:
                        total_delta, channel_deltas = self._flush_deltas()
                        self._push(total_delta, channel_deltas)
                        self._mark_flushed()
                    except Exception:
                        self._last_read = now
                    refusal = self._channel_admits(
                        GLOBAL_DAILY_INFERENCES, bucket, cost,
                        self._used_by_channel(), elapsed)
                if refusal:
                    used = self._synced_total + (self._local - self._flushed)
                    # Floors and the pool are both arithmetic on the UTC day.
                    # Accrual cannot help: as another channel spends, its
                    # unspent floor falls by exactly what it used, so the pool
                    # does not move. Midnight is the honest answer.
                    return (False, max(0, GLOBAL_DAILY_INFERENCES - used),
                            max(1, resets_in), resets_in, refusal)

            self._local += cost
            self._local_channel[bucket] += cost
            pending = self._local - self._flushed
            if pending >= QUOTA_FLUSH_EVERY or (
                    pending and now - self._last_flush > QUOTA_FLUSH_SECONDS):
                try:
                    total_delta, channel_deltas = self._flush_deltas()
                    self._push(total_delta, channel_deltas)
                    self._mark_flushed()
                except Exception:
                    # Keep serving on a transient error; the delta is carried
                    # into the next attempt rather than lost.
                    pass
                self._last_flush = now
            used = self._synced_total + (self._local - self._flushed)
            return True, max(0, GLOBAL_DAILY_INFERENCES - used), 0, resets_in, ""

    def snapshot(self) -> dict:
        elapsed = _seconds_elapsed_today()
        allowance = self._allowance_at(GLOBAL_DAILY_INFERENCES,
                                       GLOBAL_BURST_INFERENCES, elapsed)
        with self._lock:
            used = self._synced_total + (self._local - self._flushed)
            by_channel = self._used_by_channel()
            cap = GLOBAL_DAILY_INFERENCES
            floors = {channel: self._floor_for(cap, channel)
                      for channel in QUOTA_CHANNELS}
            # What is left of each guarantee, and what is left of the pool
            # every channel shares once its guarantee is gone. Counts only:
            # nothing here identifies a site, an install or a visitor.
            channels = {
                channel: {
                    "floor": floors[channel],
                    "used_estimate": by_channel.get(channel, 0),
                    "floor_remaining_estimate": max(
                        0, floors[channel] - by_channel.get(channel, 0)),
                    # Of that remaining floor, how much is still held back from
                    # the pool at this moment rather than lendable.
                    "floor_protected_now": self._protected(
                        cap, channel, by_channel, elapsed),
                }
                for channel in QUOTA_CHANNELS}
            pool = self._pool_remaining(cap, by_channel, elapsed)
            return {"cap": cap,
                    "used_estimate": used,
                    "remaining_estimate": max(0, cap - used),
                    "channels": channels,
                    "shared_pool_remaining_estimate": pool,
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


class SingleUseLedger:
    """Atomic challenge/token spend ledger for a non-website channel.

    Memory mode exists only for local tests and a single-process developer
    server. A deploy must use Firestore: DocumentReference.create is atomic and
    fails when the phase/JTI document already exists, so two instances cannot
    both accept the same credential. Store failure is fail-closed; there is no
    silent memory fallback for replay protection.
    """

    def __init__(self, backend: str = WP_REPLAY_BACKEND, *, client=None,
                 collection: str = WP_REPLAY_COLLECTION) -> None:
        self.backend = backend
        self.collection = collection
        self._client = client
        self._lock = threading.Lock()
        self._spent: dict[str, int] = {}
        self._last_prune = 0
        if backend == "firestore" and self._client is None:
            try:
                from google.cloud import firestore  # noqa: PLC0415
                self._client = firestore.Client(project=QUOTA_PROJECT)
            except Exception:
                self._client = None

    @staticmethod
    def _document_id(phase: str, jti: str) -> str:
        return hashlib.sha256(f"{phase}|{jti}".encode("ascii")).hexdigest()

    def spend(self, phase: str, jti: str, expires_at: int, *,
              now: int | None = None) -> str:
        """Return accepted, replayed or unavailable without storing content."""
        current = int(time.time() if now is None else now)
        key = f"{phase}|{jti}"
        if self.backend == "memory":
            with self._lock:
                if current - self._last_prune >= 60 or len(self._spent) >= 100_000:
                    self._spent = {
                        item: expiry for item, expiry in self._spent.items()
                        if expiry >= current}
                    self._last_prune = current
                if key in self._spent:
                    return "replayed"
                # Do not evict a still-live replay marker to admit a new one.
                if len(self._spent) >= 100_000:
                    return "unavailable"
                self._spent[key] = int(expires_at)
                return "accepted"

        if self.backend != "firestore" or self._client is None:
            return "unavailable"
        try:
            doc = self._client.collection(self.collection).document(
                self._document_id(phase, jti))
            # Firestore's create precondition is the required atomic
            # create-if-absent operation. expires_at is suitable for a
            # collection TTL policy; it is not request data.
            doc.create({
                "expires_at": datetime.fromtimestamp(expires_at, timezone.utc),
                "created_at": datetime.fromtimestamp(current, timezone.utc),
            })
            return "accepted"
        except Exception as exc:
            if exc.__class__.__name__ == "AlreadyExists":
                return "replayed"
            return "unavailable"

    def reset(self) -> None:
        """Test-only reset for the local memory backend."""
        with self._lock:
            self._spent.clear()


class SiteQuota:
    """Durable per-site inference ceilings, counted in the shared store.

    One WordPress site must not be able to spend the whole WordPress floor.
    The four in-process limiters already charge a per-site scope, but they are
    exactly as durable as the process holding them: this service scales to
    zero, so a site that comes back after an idle period meets a fresh
    allowance every time. These two ceilings live where the daily quota lives,
    so they do not.

    Two windows, both aligned to UTC rather than sliding: the day the rest of
    the service already resets on, and the hour inside it. That is a deliberate
    trade. A sliding window needs the individual event times, which means
    storing a row per check; aligned windows need two integers, which fit in
    one small document per site per day and cost one atomic increment. Nothing
    request-shaped is written: the document id is a hash of an identifier that
    is itself a hash of the site origin, and the fields are two counts and an
    expiry.

    The counter is batched exactly as GlobalQuota's is — a local delta flushed
    every WP_SITE_FLUSH_EVERY inferences or WP_SITE_FLUSH_SECONDS — so the
    overshoot is bounded rather than zero, and a stale local view is re-read
    from the store before anyone is refused on the strength of it.

    Store failure degrades to per-instance counting rather than failing closed.
    That is the opposite of the replay ledger's rule, and deliberately so: a
    replayed credential that gets through is a security failure, while a rate
    counter that loses its history costs at most one instance-lifetime's worth
    of extra allowance to one site, and failing closed would take the channel
    down for everyone on a Firestore blip.
    """

    def __init__(self, backend: str = WP_SITE_QUOTA_BACKEND, *, client=None,
                 collection: str = WP_SITE_QUOTA_COLLECTION,
                 per_day: int = WP_SITE_INFERENCES_PER_DAY,
                 per_hour: int = WP_SITE_INFERENCES_PER_HOUR) -> None:
        self.backend = backend
        self.collection = collection
        self.per_day = per_day
        self.per_hour = per_hour
        self._lock = threading.Lock()
        self._sites: dict[str, dict] = {}
        self._client = client
        self._firestore = None
        self._degraded = backend != "firestore"
        if not self._degraded and self._client is None:
            try:
                from google.cloud import firestore  # noqa: PLC0415
                self._firestore = firestore
                self._client = firestore.Client(project=QUOTA_PROJECT)
            except Exception:
                self._degraded = True
        elif not self._degraded:
            try:
                from google.cloud import firestore  # noqa: PLC0415
                self._firestore = firestore
            except Exception:
                self._degraded = True

    @property
    def enabled(self) -> bool:
        return self.per_day > 0 or self.per_hour > 0

    @staticmethod
    def _site_key(site_id: str) -> str:
        """An opaque, fixed-charset document name for a site identifier."""
        return hashlib.sha256(site_id.encode("utf-8")).hexdigest()

    def _state(self, key: str, day: str, hour: str) -> dict:
        state = self._sites.get(key)
        if state is None or state["day"] != day:
            state = {"day": day, "hour": hour,
                     "synced_day": 0, "synced_hour": 0,
                     "local_day": 0, "local_hour": 0,
                     "flushed_day": 0, "flushed_hour": 0,
                     "last_flush": 0.0, "last_read": 0.0}
            self._sites[key] = state
            if len(self._sites) > 20_000:   # bounded memory; drop cold sites
                for name, value in list(self._sites.items()):
                    if value["day"] != day:
                        self._sites.pop(name, None)
        elif state["hour"] != hour:
            # The day total carries across the hour boundary; the hour total
            # does not, and neither does what has been written down for it.
            state["hour"] = hour
            state["synced_hour"] = state["local_hour"] = 0
            state["flushed_hour"] = 0
        return state

    def _used(self, state: dict) -> tuple[int, int]:
        return (state["synced_day"] + state["local_day"] - state["flushed_day"],
                state["synced_hour"] + state["local_hour"] - state["flushed_hour"])

    def _sync(self, key: str, state: dict, now: float) -> None:
        """Write this instance's outstanding delta and read the shared totals."""
        if self._degraded or self._client is None or self._firestore is None:
            return
        day_delta = state["local_day"] - state["flushed_day"]
        hour_delta = state["local_hour"] - state["flushed_hour"]
        document = self._client.collection(self.collection).document(
            f"{key}-{state['day']}")
        payload: dict = {}
        if day_delta:
            payload["count"] = self._firestore.Increment(day_delta)
        if hour_delta:
            payload[f"h{state['hour'][-2:]}"] = self._firestore.Increment(hour_delta)
        if payload:
            # expires_at is what a Firestore TTL policy deletes on. It is
            # housekeeping, not correctness: an undeleted document simply holds
            # counts for a day that has already reset.
            document.set({**payload, "expires_at": datetime.fromtimestamp(
                now + 172800, timezone.utc)}, merge=True)
        snapshot = document.get()
        data = (snapshot.to_dict() if snapshot.exists else None) or {}
        state["synced_day"] = int(data.get("count", 0))
        state["synced_hour"] = int(data.get(f"h{state['hour'][-2:]}", 0))
        state["flushed_day"] = state["local_day"]
        state["flushed_hour"] = state["local_hour"]
        state["last_read"] = now
        state["last_flush"] = now

    def reserve(self, site_id: str, cost: int = 1,
                ) -> tuple[bool, str, int, int, int]:
        """Claim `cost` inferences for one site.

        Returns (allowed, window, retry_after, remaining_day, remaining_hour).
        `window` is "" when allowed and otherwise "day" or "hour", which is the
        one the caller should quote.
        """
        if not self.enabled:
            return True, "", 0, -1, -1
        now = time.time()
        key = self._site_key(site_id)
        day, hour = _utc_day(), _utc_hour()
        to_midnight = max(1, _seconds_to_utc_midnight())
        to_hour_end = max(1, _seconds_to_utc_hour_end())
        with self._lock:
            state = self._state(key, day, hour)
            if state["last_read"] == 0.0 and not self._degraded:
                # First sight of this site on this instance. Read the shared
                # figure before deciding anything: without this a replaced
                # instance hands the site a whole fresh allowance, which is the
                # exact failure the durable counter exists to prevent. One
                # read per site per instance lifetime.
                try:
                    self._sync(key, state, now)
                except Exception:
                    state["last_read"] = now
            used_day, used_hour = self._used(state)
            over = self._over(used_day, used_hour, cost)
            if over and now - state["last_read"] > QUOTA_RECHECK_SECONDS:
                # Never refuse a real editor on a local figure that may simply
                # be older than the last instance replacement.
                try:
                    self._sync(key, state, now)
                except Exception:
                    state["last_read"] = now
                used_day, used_hour = self._used(state)
                over = self._over(used_day, used_hour, cost)
            if over == "day":
                return (False, "day", to_midnight,
                        max(0, self.per_day - used_day),
                        max(0, self.per_hour - used_hour) if self.per_hour else -1)
            if over == "hour":
                return (False, "hour", to_hour_end,
                        max(0, self.per_day - used_day) if self.per_day else -1,
                        max(0, self.per_hour - used_hour))

            state["local_day"] += cost
            state["local_hour"] += cost
            pending = state["local_day"] - state["flushed_day"]
            if pending >= WP_SITE_FLUSH_EVERY or (
                    pending and now - state["last_flush"] > WP_SITE_FLUSH_SECONDS):
                try:
                    self._sync(key, state, now)
                except Exception:
                    # Carry the delta into the next attempt rather than lose it.
                    state["last_flush"] = now
            used_day, used_hour = self._used(state)
            return (True, "", 0,
                    max(0, self.per_day - used_day) if self.per_day else -1,
                    max(0, self.per_hour - used_hour) if self.per_hour else -1)

    def _over(self, used_day: int, used_hour: int, cost: int) -> str:
        """Which window refuses this, day first because its wait is longer."""
        if self.per_day and used_day + cost > self.per_day:
            return "day"
        if self.per_hour and used_hour + cost > self.per_hour:
            return "hour"
        return ""

    def snapshot(self) -> dict:
        return {"per_site_inferences_per_day": self.per_day,
                "per_site_inferences_per_hour": self.per_hour,
                "windows": "utc-aligned",
                "backend": "memory-failsafe" if self._degraded else self.backend}

    def reset(self) -> None:
        """Test-only reset of the local view."""
        with self._lock:
            self._sites.clear()


WP_REPLAY_LEDGER = SingleUseLedger()
CHROME_REPLAY_LEDGER = SingleUseLedger(
    CHROME_REPLAY_BACKEND, collection=CHROME_REPLAY_COLLECTION)
WP_SITE_QUOTA = SiteQuota()


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


_SHA256_ID = r"^sha256:[0-9a-f]{64}$"
_INSTALL_ID = r"^wp_[A-Za-z0-9_-]{16,64}$"
_CHROME_EXTENSION_ID = r"^[a-p]{32}$"
_CHROME_INSTALL_ID = r"^cx_[A-Za-z0-9_-]{16,64}$"
_REQUEST_ID = r"^req_[A-Za-z0-9_-]{16,64}$"


class WordPressChallengeRequest(BaseModel):
    site_id: str = Field(..., pattern=_SHA256_ID)
    install_id: str = Field(..., pattern=_INSTALL_ID)
    request_id: str = Field(..., pattern=_REQUEST_ID)
    body_sha256: str = Field(..., pattern=_SHA256_ID)


class WordPressTokenRequest(BaseModel):
    challenge: str = Field(..., max_length=2048)
    nonce: str = Field(..., max_length=64)


class WordPressCheckRequest(CheckRequest):
    site_id: str = Field(..., pattern=_SHA256_ID)
    install_id: str = Field(..., pattern=_INSTALL_ID)
    request_id: str = Field(..., pattern=_REQUEST_ID)


class ChromeChallengeRequest(BaseModel):
    extension_id: str = Field(..., pattern=_CHROME_EXTENSION_ID)
    install_id: str = Field(..., pattern=_CHROME_INSTALL_ID)
    request_id: str = Field(..., pattern=_REQUEST_ID)
    body_sha256: str = Field(..., pattern=_SHA256_ID)


class ChromeTokenRequest(BaseModel):
    challenge: str = Field(..., max_length=2048)
    nonce: str = Field(..., max_length=64)


class ChromeCheckRequest(CheckRequest):
    extension_id: str = Field(..., pattern=_CHROME_EXTENSION_ID)
    install_id: str = Field(..., pattern=_CHROME_INSTALL_ID)
    request_id: str = Field(..., pattern=_REQUEST_ID)


APP = FastAPI(title="Opace content-integrity inference", docs_url=None, redoc_url=None)
_CORS_ORIGINS = [
    *ALLOWED_ORIGINS,
    *(f"chrome-extension://{extension_id}"
      for extension_id in sorted(CHROME_EXTENSION_IDS)),
]
APP.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "x-opace-token",
                   "x-opace-chrome-token"],
    max_age=86400,
)


def _request_fallback(request: Request) -> dict:
    if request.url.path.startswith("/v1/wordpress/"):
        return WORDPRESS_FALLBACK
    if request.url.path.startswith("/v1/chrome/"):
        return CHROME_FALLBACK
    return LOCAL_FALLBACK


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
    """Enforce the byte ceiling even if Content-Length is absent or false."""
    if request.method == "POST":
        route_max_chars = (
            min(50_000, MAX_CHARS)
            if request.url.path.startswith("/v1/chrome/") else MAX_CHARS)

        def refusal() -> JSONResponse:
            return _blocked(
                413, "too_large",
                f"That is larger than this endpoint accepts. Send at most "
                f"{route_max_chars:,} characters or {MAX_WORDS:,} words.",
                retryable=False,
                extra={"max_chars": route_max_chars,
                       "max_words": MAX_WORDS,
                       "max_body_bytes": MAX_BODY_BYTES},
                fallback=_request_fallback(request))

        # This cheap preflight avoids reading a plainly oversized declared
        # body. The streamed count below is the security boundary: clients may
        # omit or falsify Content-Length, especially over HTTP/2.
        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
            return refusal()

        chunks: list[bytes] = []
        received = 0
        async for chunk in request.stream():
            received += len(chunk)
            if received > MAX_BODY_BYTES:
                return refusal()
            chunks.append(chunk)
        # Starlette's cached request passes this exact body to FastAPI after
        # the middleware returns; no second socket read or truncation occurs.
        request._body = b"".join(chunks)
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
            "no shared daily allowance.", retryable=False)
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
    if USE_FEATS:
        # Per-segment features on the segment's own raw text — the exact
        # convention score_battery.py used to produce every fitted margin.
        z = _z_norm(_feat_extract(text), FEATURE_NORM)
        feed["feats"] = np.array([z], dtype=np.float32)
    logits = SESSION.run(None, feed)[0][0]
    margin = float(logits[1] - logits[0])
    p = 1.0 / (1.0 + np.exp(-margin / TEMPERATURE))
    n_tokens = int(enc["attention_mask"].sum())
    return margin, float(p), n_tokens


def _seg_flagged(margin: float, p: float) -> bool:
    """Whether one segment alone clears the primary arm, for the per-segment
    row. Margin space when the margin rule is live, else probability."""
    if SCORING == "margin-v1":
        return bool(margin >= MARGIN_THRESHOLD)
    return bool(p >= THRESHOLD_PROB)


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
            "flagged": _seg_flagged(margin, p),
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


def _wordpress_scopes(ip: str, net: str, site_id: str | None = None,
                      install_id: str | None = None) -> list[tuple[str, str]]:
    scopes = [
        ("per_connection", _key("wp-net|" + net)),
        ("per_ip", _key("wp-ip|" + ip)),
    ]
    if site_id:
        scopes.append(("per_site", _key("wp-site|" + site_id)))
    if site_id and install_id:
        scopes.append(("per_install", _key(
            "wp-install|" + site_id + "|" + install_id)))
    return scopes


def _wordpress_rate_refusal(retry_after: int, window: str,
                            scope: str) -> JSONResponse:
    return _blocked(
        429, "rate_limited",
        "This WordPress connection has reached its service allowance. The "
        "plugin can run its local integrity checks instead.",
        retryable=True, retry_after=retry_after,
        extra={"scope": scope, "window": window},
        fallback=WORDPRESS_FALLBACK)


def _wordpress_disabled() -> JSONResponse | None:
    if ENABLE_WORDPRESS_CHANNEL:
        return None
    return _blocked(
        503, "wordpress_channel_disabled",
        "The WordPress inference channel is not enabled. The plugin can run "
        "its local integrity checks instead.", retryable=False,
        fallback=WORDPRESS_FALLBACK)


@APP.post("/v1/wordpress/challenge")
async def wordpress_challenge(request: Request,
                              body: WordPressChallengeRequest):
    """Issue one body-bound WordPress challenge without browser impersonation."""
    if disabled := _wordpress_disabled():
        return disabled
    ip = _client_ip(request)
    net = _network(ip)
    ok, retry_after, window, scope = WP_HANDSHAKE_LIMITER.consume_scoped(
        _wordpress_scopes(ip, net, body.site_id, body.install_id), 1)
    if not ok:
        return _wordpress_rate_refusal(retry_after, window, scope)
    challenge_value, claims = wp_channel.issue_challenge(
        TOKEN_SECRET,
        network=_bind(net),
        site_id=body.site_id,
        install_id=body.install_id,
        request_id=body.request_id,
        body_hash=body.body_sha256,
        ttl_seconds=WP_CHALLENGE_TTL_SECONDS,
        now=int(time.time()),
    )
    return {
        "channel": wp_channel.CHANNEL,
        "challenge": challenge_value,
        "algorithm": "sha256(challenge + ':' + nonce)",
        "difficulty_bits": WP_POW_BITS,
        "expires_at": claims["exp"],
        "expires_in": WP_CHALLENGE_TTL_SECONDS,
        "retained": "nothing",
    }


@APP.post("/v1/wordpress/token")
async def wordpress_token(request: Request, body: WordPressTokenRequest):
    if disabled := _wordpress_disabled():
        return disabled
    ip = _client_ip(request)
    net = _network(ip)
    ok, retry_after, window, scope = WP_HANDSHAKE_LIMITER.consume_scoped(
        _wordpress_scopes(ip, net), 1)
    if not ok:
        return _wordpress_rate_refusal(retry_after, window, scope)
    claims, why = wp_channel.verify_challenge(
        TOKEN_SECRET, body.challenge,
        network=_bind(net), nonce=body.nonce,
        difficulty_bits=WP_POW_BITS, now=int(time.time()))
    if why:
        return _blocked(
            400, "challenge_failed",
            "That WordPress challenge could not be verified. Request a new "
            "one before retrying.", retryable=True,
            extra={"detail": why, "obtain": "/v1/wordpress/challenge"},
            fallback=WORDPRESS_FALLBACK)

    spent = WP_REPLAY_LEDGER.spend(
        "challenge", claims["jti"], claims["exp"], now=int(time.time()))
    if spent == "replayed":
        return _blocked(
            409, "challenge_replayed",
            "That WordPress challenge has already been exchanged. Request a "
            "new one.", retryable=True,
            extra={"obtain": "/v1/wordpress/challenge"},
            fallback=WORDPRESS_FALLBACK)
    if spent != "accepted":
        return _blocked(
            503, "replay_store_unavailable",
            "The service cannot safely confirm that this challenge is unused. "
            "No inference was run.", retryable=True, retry_after=30,
            fallback=WORDPRESS_FALLBACK)

    token_value, token_claims = wp_channel.issue_score_token(
        TOKEN_SECRET, claims, ttl_seconds=WP_TOKEN_TTL_SECONDS,
        now=int(time.time()))
    return {
        "channel": wp_channel.CHANNEL,
        "token": token_value,
        "expires_at": token_claims["exp"],
        "max_checks": 1,
        "header": "x-opace-wordpress-token",
        "retained": "nothing",
    }


@APP.post("/v1/wordpress/check")
async def wordpress_check(
        request: Request, body: WordPressCheckRequest,
        client_token: str | None = Header(
            None, alias="x-opace-wordpress-token")):
    if disabled := _wordpress_disabled():
        return disabled
    ip = _client_ip(request)
    net = _network(ip)
    claims, why = wp_channel.verify_score_token(
        TOKEN_SECRET, client_token,
        network=_bind(net), site_id=body.site_id,
        install_id=body.install_id, request_id=body.request_id,
        body_hash=wp_channel.body_sha256(body.text), now=int(time.time()))
    if why:
        return _blocked(
            401, "wordpress_token_required",
            "This check needs a fresh body-bound WordPress token. No inference "
            "was run.", retryable=True,
            extra={"detail": why, "obtain": "/v1/wordpress/challenge"},
            fallback=WORDPRESS_FALLBACK)

    spent = WP_REPLAY_LEDGER.spend(
        "token", claims["jti"], claims["exp"], now=int(time.time()))
    if spent == "replayed":
        return _blocked(
            409, "token_replayed",
            "That WordPress token has already been used. Request a new one.",
            retryable=True,
            extra={"obtain": "/v1/wordpress/challenge"},
            fallback=WORDPRESS_FALLBACK)
    if spent != "accepted":
        return _blocked(
            503, "replay_store_unavailable",
            "The service cannot safely confirm that this token is unused. No "
            "inference was run.", retryable=True, retry_after=30,
            fallback=WORDPRESS_FALLBACK)

    return await _process_check(
        body,
        _wordpress_scopes(ip, net, body.site_id, body.install_id),
        WORDPRESS_FALLBACK,
        channel=wp_channel.CHANNEL,
        site_id=body.site_id)


def _chrome_scopes(ip: str, net: str, extension_id: str | None = None,
                   install_id: str | None = None) -> list[tuple[str, str]]:
    scopes = [
        ("per_connection", _key("chrome-net|" + net)),
        ("per_ip", _key("chrome-ip|" + ip)),
    ]
    if extension_id:
        scopes.append(("per_extension", _key(
            "chrome-extension|" + extension_id)))
    if extension_id and install_id:
        scopes.append(("per_install", _key(
            "chrome-install|" + extension_id + "|" + install_id)))
    return scopes


def _chrome_rate_refusal(retry_after: int, window: str,
                         scope: str) -> JSONResponse:
    return _blocked(
        429, "rate_limited",
        "This extension connection has reached its service allowance. Run "
        "the full Cycle-5 check on this device instead.",
        retryable=True, retry_after=retry_after,
        extra={"scope": scope, "window": window},
        fallback=CHROME_FALLBACK)


def _chrome_access_refusal(origin: str | None,
                           extension_id: str) -> JSONResponse | None:
    if not ENABLE_CHROME_CHANNEL:
        return _blocked(
            503, "chrome_channel_disabled",
            "The Chrome EU-service channel is not enabled. Run the full "
            "Cycle-5 check on this device instead.", retryable=False,
            fallback=CHROME_FALLBACK)
    if extension_id not in CHROME_EXTENSION_IDS:
        return _blocked(
            403, "extension_not_allowed",
            "This extension build is not authorised for the EU service. Run "
            "the full check on this device instead.", retryable=False,
            fallback=CHROME_FALLBACK)
    expected = f"chrome-extension://{extension_id}"
    if not origin or not hmac.compare_digest(origin, expected):
        return _blocked(
            403, "extension_origin_required",
            "The EU service accepts this route only from the authorised "
            "extension origin. No inference was run.", retryable=False,
            fallback=CHROME_FALLBACK)
    return None


@APP.post("/v1/chrome/challenge")
async def chrome_challenge(request: Request, body: ChromeChallengeRequest,
                           origin: str | None = Header(None, alias="origin")):
    """Issue one body-bound challenge to an allowlisted extension origin."""
    if refused := _chrome_access_refusal(origin, body.extension_id):
        return refused
    ip = _client_ip(request)
    net = _network(ip)
    ok, retry_after, window, scope = CHROME_HANDSHAKE_LIMITER.consume_scoped(
        _chrome_scopes(ip, net, body.extension_id, body.install_id), 1)
    if not ok:
        return _chrome_rate_refusal(retry_after, window, scope)
    challenge_value, claims = extension_channel.issue_challenge(
        TOKEN_SECRET,
        network=_bind(net),
        extension_id=body.extension_id,
        install_id=body.install_id,
        request_id=body.request_id,
        body_hash=body.body_sha256,
        ttl_seconds=CHROME_CHALLENGE_TTL_SECONDS,
        now=int(time.time()),
    )
    return {
        "channel": extension_channel.CHANNEL,
        "challenge": challenge_value,
        "algorithm": "sha256(challenge + ':' + nonce)",
        "difficulty_bits": CHROME_POW_BITS,
        "expires_at": claims["exp"],
        "expires_in": CHROME_CHALLENGE_TTL_SECONDS,
        "retained": "nothing",
    }


@APP.post("/v1/chrome/token")
async def chrome_token(request: Request, body: ChromeTokenRequest,
                       origin: str | None = Header(None, alias="origin")):
    if not ENABLE_CHROME_CHANNEL:
        return _chrome_access_refusal(origin, "")
    ip = _client_ip(request)
    net = _network(ip)
    claims, why = extension_channel.verify_challenge(
        TOKEN_SECRET, body.challenge, network=_bind(net), nonce=body.nonce,
        difficulty_bits=CHROME_POW_BITS, now=int(time.time()))
    if why:
        return _blocked(
            400, "challenge_failed",
            "That extension challenge could not be verified. Request a new "
            "one before retrying.", retryable=True,
            extra={"detail": why, "obtain": "/v1/chrome/challenge"},
            fallback=CHROME_FALLBACK)
    if refused := _chrome_access_refusal(origin, claims["extension_id"]):
        return refused
    ok, retry_after, window, scope = CHROME_HANDSHAKE_LIMITER.consume_scoped(
        _chrome_scopes(ip, net, claims["extension_id"],
                       claims["install_id"]), 1)
    if not ok:
        return _chrome_rate_refusal(retry_after, window, scope)
    spent = CHROME_REPLAY_LEDGER.spend(
        "challenge", claims["jti"], claims["exp"], now=int(time.time()))
    if spent == "replayed":
        return _blocked(
            409, "challenge_replayed",
            "That extension challenge has already been exchanged. Request a "
            "new one.", retryable=True,
            extra={"obtain": "/v1/chrome/challenge"},
            fallback=CHROME_FALLBACK)
    if spent != "accepted":
        return _blocked(
            503, "replay_store_unavailable",
            "The service cannot safely confirm that this challenge is "
            "unused. No inference was run.", retryable=True, retry_after=30,
            fallback=CHROME_FALLBACK)
    token_value, token_claims = extension_channel.issue_score_token(
        TOKEN_SECRET, claims, ttl_seconds=CHROME_TOKEN_TTL_SECONDS,
        now=int(time.time()))
    return {
        "channel": extension_channel.CHANNEL,
        "token": token_value,
        "expires_at": token_claims["exp"],
        "max_checks": 1,
        "header": "x-opace-chrome-token",
        "retained": "nothing",
    }


@APP.post("/v1/chrome/check")
async def chrome_check(
        request: Request, body: ChromeCheckRequest,
        origin: str | None = Header(None, alias="origin"),
        client_token: str | None = Header(
            None, alias="x-opace-chrome-token")):
    if refused := _chrome_access_refusal(origin, body.extension_id):
        return refused
    ip = _client_ip(request)
    net = _network(ip)
    claims, why = extension_channel.verify_score_token(
        TOKEN_SECRET, client_token, network=_bind(net),
        extension_id=body.extension_id, install_id=body.install_id,
        request_id=body.request_id,
        body_hash=extension_channel.body_sha256(body.text),
        now=int(time.time()))
    if why:
        return _blocked(
            401, "chrome_token_required",
            "This check needs a fresh body-bound extension token. No "
            "inference was run.", retryable=True,
            extra={"detail": why, "obtain": "/v1/chrome/challenge"},
            fallback=CHROME_FALLBACK)
    spent = CHROME_REPLAY_LEDGER.spend(
        "token", claims["jti"], claims["exp"], now=int(time.time()))
    if spent == "replayed":
        return _blocked(
            409, "token_replayed",
            "That extension token has already been used. Request a new one.",
            retryable=True,
            extra={"obtain": "/v1/chrome/challenge"},
            fallback=CHROME_FALLBACK)
    if spent != "accepted":
        return _blocked(
            503, "replay_store_unavailable",
            "The service cannot safely confirm that this token is unused. No "
            "inference was run.", retryable=True, retry_after=30,
            fallback=CHROME_FALLBACK)
    return await _process_check(
        body,
        _chrome_scopes(ip, net, body.extension_id, body.install_id),
        CHROME_FALLBACK,
        channel=extension_channel.CHANNEL,
        max_chars=min(50_000, MAX_CHARS))


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

    return await _process_check(
        body, [("per_connection", ip_key)], LOCAL_FALLBACK,
        channel=None)


async def _process_check(body: CheckRequest,
                         rate_scopes: list[tuple[str, str]],
                         fallback: dict, *, channel: str | None,
                         max_chars: int = MAX_CHARS,
                         max_words: int = MAX_WORDS,
                         site_id: str | None = None):
    """Shared scoring path after a channel's credential has been verified."""
    wordpress = channel == wp_channel.CHANNEL
    chrome = channel == extension_channel.CHANNEL
    local_option = (
        "run the plugin's disclosed local integrity subset"
        if wordpress else (
            "run the full Cycle-5 check on this device, which has no shared "
            "daily allowance"
            if chrome else
            "switch to in-browser processing, which has no shared daily "
            "allowance"))

    ok, retry_after, window, scope = REQUEST_LIMITER.consume_scoped(
        rate_scopes, 1)
    if not ok:
        return _blocked(
            429, "rate_limited",
            "You have run a lot of checks from this connection. Try again in "
            f"a few minutes, or {local_option}.",
            retryable=True, retry_after=retry_after,
            extra={"scope": scope, "window": window}, fallback=fallback)

    # Input normalisation is a property of the MODEL being served. md-strip-v1
    # (cycle 2): normalise to the plain-prose surface its figures were measured
    # on — markdown syntax goes, every word and paragraph break stays
    # (INPUT-SURFACE-2026-08-31.md: raw markdown flagged 22.5% of structured
    # human docs; stripped, 0.0%). raw-v1 (cycle 5): the model was trained and
    # measured markdown-in on both the encoder and the structural features, so
    # the text passes through untouched — stripping would corrupt the very
    # structure the features read (PHASE1-PARITY-NOTE-2026-09-01.md). The
    # active value is advertised in /v1/health and /v1/status and echoed on
    # every 200, so the client can hold the same convention.
    if INPUT_NORMALISATION_ACTIVE == "md-strip-v1":
        text = normalise_input(body.text)
    else:
        text = body.text
    if utf16_length(text) > max_chars:
        return _blocked(
            413, "too_large",
            f"Send at most {max_chars:,} characters. For anything longer, the "
            + ("service refuses the whole request rather than scoring a "
               "truncated document."
               if wordpress else (
                   "extension also refuses the whole document rather than "
                   "scoring a truncated version. Shorten it and try again."
                   if chrome else
                   "in-browser check accepts up to 100,000 characters.")),
            retryable=False, extra={"max_chars": max_chars},
            fallback=fallback)

    words = count_words(text)
    if words > max_words:
        return _blocked(
            413, "too_long",
            f"This endpoint scores documents up to {max_words:,} words — a "
            f"long article. Yours is {words:,}. " + (
                "No partial model reading was made; the plugin's disclosed "
                "local integrity subset remains available."
                if wordpress else (
                    "No partial model reading was made. The extension's "
                    "on-device route remains available when the document is "
                    "within its 50,000-character limit."
                    if chrome else
                    "The in-browser check accepts up to 100,000 characters "
                    "and uses the same model.")),
            retryable=False,
            extra={"max_words": max_words, "word_count": words},
            fallback=fallback)
    if words < MIN_WORDS:
        short_body = {
            "error": "too_short",
            "message": f"Needs at least {MIN_WORDS} words to give a reading. "
                       f"Below 200 words accuracy falls sharply and below 100 "
                       f"words the result is not meaningful.",
            "processed": "none", "retained": "nothing", "retryable": False,
            "word_count": words,
        }
        if wordpress or chrome:
            short_body["fallback"] = fallback
        return JSONResponse(short_body, status_code=422)

    cost = segment_count(text, count_tokens)

    ok, retry_after, window, scope = INFERENCE_LIMITER.consume_scoped(
        rate_scopes, cost)
    if not ok:
        return _blocked(
            429, "rate_limited",
            "You have checked a lot of text from this connection — long "
            "documents count for more, because each one is scored section by "
            f"section. Try again later, or {local_option}.",
            retryable=True, retry_after=retry_after,
            extra={"scope": scope, "window": window,
                   "unit": "inferences", "required": cost},
            fallback=fallback)

    # One site's durable ceiling inside the WordPress floor. It sits in front
    # of the global reserve so that a site over its own limit is refused out of
    # its own allowance rather than out of the channel's.
    if wordpress and site_id and WP_SITE_QUOTA.enabled:
        site_ok, site_window, site_retry, site_day, site_hour = (
            WP_SITE_QUOTA.reserve(site_id, cost))
        if not site_ok:
            return _blocked(
                429, "rate_limited",
                "This site has reached its share of the WordPress service "
                "allowance " + ("for today. It resets at 00:00 UTC. "
                                if site_window == "day" else
                                "for this hour. It resets on the hour. ")
                + "The plugin can run its local integrity checks now.",
                retryable=True, retry_after=site_retry,
                extra={"scope": "per_site", "window": site_window,
                       "unit": "inferences", "required": cost,
                       "reason": "site_allowance_exhausted",
                       "site_remaining_today": site_day,
                       "site_remaining_this_hour": site_hour},
                fallback=fallback)

    allowed, remaining, retry_after, resets_in, reason = QUOTA.reserve(
        cost, channel=channel)
    if not allowed:
        # retry_after is the accrual wait, usually a couple of minutes, not the
        # hours-to-midnight this used to quote. The wording follows it: telling
        # someone to come back tomorrow when the true wait is 90 seconds sends
        # them away for no reason.
        wait = "shortly" if retry_after <= 90 else (
            f"in about {max(1, round(retry_after / 60))} minutes"
            if retry_after < 5400 else
            f"in about {max(1, round(retry_after / 3600))} hours")
        if reason == "paced_allowance":
            message = (
                f"The shared allowance for server-side checks is fully spoken for "
                f"right now. It refills continuously, so try again {wait} — or "
                f"{local_option}."
                if wordpress else (
                    f"The shared allowance for server-side checks is fully spoken "
                    f"for right now. It refills continuously, so try again {wait} "
                    f"— or run the full Cycle-5 check on this device now, with no "
                    f"shared daily allowance."
                    if chrome else
                    f"The shared allowance for server-side checks is fully spoken "
                    f"for right now. It refills continuously, so try again {wait} "
                    f"— or run the check in your browser now, which uses the same "
                    f"model and accepts up to 100,000 characters with no shared "
                    f"daily allowance."))
        else:
            # A floor or pool refusal is not an accrual wait and must not be
            # described as one. Both are arithmetic on the UTC day: they change
            # at midnight and not before, so promising a refill in a few
            # minutes would be a lie the clock disproves.
            surface = ("The WordPress plugin's share of" if wordpress else
                       "The extension's share of" if chrome else
                       "The website checker's share of")
            message = (
                f"{surface} today's server allowance is fully spent, and the "
                f"capacity the other surfaces have not used is spoken for too. "
                f"It resets at 00:00 UTC. In the meantime you can "
                f"{local_option}.")
        return _blocked(
            429, "daily_allowance_exhausted",
            message,
            retryable=True, retry_after=retry_after,
            extra={"scope": ("service_wide" if reason == "paced_allowance"
                             else "channel"),
                   "reason": reason,
                   "channel_bucket": _quota_channel(channel),
                   "unit": "inferences",
                   "required": cost, "remaining": remaining,
                   "resets_in_seconds": resets_in, "resets_at": "00:00 UTC"},
            fallback=fallback)

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
    # The sort key is the margin. Under one shared temperature the ordering is
    # identical to the probability ordering (sigmoid is monotonic), so the
    # cycle-2 behaviour is unchanged; under margin-v1 the margins ARE the rule.
    ordered = sorted(rows, key=lambda r: r["margin"], reverse=True)
    strongest = ordered[0]
    # None for a single-section document. There is no second section, so the
    # secondary arm cannot fire and such documents are unaffected by the rule
    # change by definition. test_aggregation.py asserts exactly that.
    runner_up = ordered[1] if len(ordered) > 1 else None

    if SCORING == "margin-v1":
        # analyse.py::flagged_margin, verbatim semantics:
        #   flag <=> max(m1, m2 + gap) >= threshold
        primary_fired = bool(strongest["margin"] >= MARGIN_THRESHOLD)
        secondary_fired = bool(
            runner_up is not None
            and runner_up["margin"] + SECONDARY_GAP >= MARGIN_THRESHOLD)
    else:
        primary_fired = bool(strongest["probability_ai"] >= THRESHOLD_PROB)
        secondary_fired = bool(runner_up is not None
                               and runner_up["probability_ai"] >= SECONDARY_THRESHOLD_PROB)

    verdict = {
        # The two comparison rules carry different parameter fields, on
        # purpose: reusing `threshold` for a margin would invite exactly the
        # probability-vs-margin confusion the cycle-4 lesson was about.
        "scoring": SCORING,
        "threshold": THRESHOLD_PROB if SCORING == "probability-v1" else None,
        "secondary_threshold": (SECONDARY_THRESHOLD_PROB
                                if SCORING == "probability-v1" else None),
        "threshold_margin": MARGIN_THRESHOLD,
        "secondary_gap": SECONDARY_GAP,
    }

    return {
        "model": MODEL_NAME,
        "model_build": MODEL_ID,
        "precision": "fp32",
        "segmentation_contract": SEGMENTATION_CONTRACT,
        "input_normalisation": INPUT_NORMALISATION_ACTIVE,
        "features_contract": FEATURES_CONTRACT,
        "aggregation": "max",
        "probability_ai": strongest["probability_ai"],
        "margin": strongest["margin"],
        "flagged": bool(primary_fired or secondary_fired),
        # Everything the client needs to re-derive the verdict itself. The
        # front end recomputes `flagged` from these and refuses the response if
        # it disagrees, so a route that drifts is caught loudly rather than
        # quietly reporting a different answer from the other one.
        **verdict,
        "second_probability_ai": runner_up["probability_ai"] if runner_up else None,
        "second_margin": runner_up["margin"] if runner_up else None,
        "second_segment": runner_up["index"] if runner_up else None,
        "flag_rule": ("margin-minimum-evidence" if SCORING == "margin-v1"
                      else "minimum-evidence"),
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
        **({"channel": channel} if channel else {}),
        "daily_allowance_remaining": remaining,
    }


@APP.get("/v1/health")
async def health():
    # Deliberately unauthenticated and ungated: Cloud Run and any uptime check
    # need it, and it discloses nothing about any request.
    return {"ok": True, "model": MODEL_NAME, "precision": "fp32",
            "model_build": MODEL_ID, "threads": ORT_THREADS,
            "segmentation_contract": SEGMENTATION_CONTRACT,
            "input_normalisation": INPUT_NORMALISATION_ACTIVE,
            "features_contract": FEATURES_CONTRACT,
            "scoring": SCORING}


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
        # Who is guaranteed what, and what is left of the pool everyone shares
        # once their guarantee is gone. Counts only — this says how much has
        # been spent, never by whom. The owner watches these to see whether the
        # 40/40/20 split still matches real demand.
        "channel_allowance": {
            "floors_pct": dict(CHANNEL_FLOOR_PCT),
            "pool_release": CHANNEL_POOL_RELEASE,
            "channels": snap["channels"],
            "shared_pool_remaining_estimate": snap["shared_pool_remaining_estimate"],
        },
        "resets_in_seconds": snap["resets_in_seconds"],
        "per_connection": {
            "requests": {"per_minute": REQ_PER_MINUTE, "per_hour": REQ_PER_HOUR,
                         "per_day": REQ_PER_DAY},
            "inferences": {"per_minute": INF_PER_MINUTE, "per_hour": INF_PER_HOUR,
                           "per_day": INF_PER_DAY},
        },
        "max_chars": MAX_CHARS,
        "max_words": MAX_WORDS,
        "max_body_bytes": MAX_BODY_BYTES,
        "max_inferences_per_request": MAX_SEGMENTS_PER_REQUEST,
        "segmentation_contract": SEGMENTATION_CONTRACT,
        "input_normalisation": INPUT_NORMALISATION_ACTIVE,
        "features_contract": FEATURES_CONTRACT,
        "scoring": SCORING,
        "model": MODEL_NAME,
        "token_required": REQUIRE_TOKEN,
        "wordpress_channel": {
            "enabled": ENABLE_WORDPRESS_CHANNEL,
            "credential_class": wp_channel.CHANNEL,
            "origin_required": False,
            "browser_user_agent_required": False,
            "challenge_ttl_seconds": WP_CHALLENGE_TTL_SECONDS,
            "token_ttl_seconds": WP_TOKEN_TTL_SECONDS,
            "token_max_checks": 1,
            "pow_bits": WP_POW_BITS,
            "replay_backend": WP_REPLAY_BACKEND,
            "per_site": WP_SITE_QUOTA.snapshot(),
        },
        "chrome_channel": {
            "enabled": ENABLE_CHROME_CHANNEL and bool(CHROME_EXTENSION_IDS),
            "credential_class": extension_channel.CHANNEL,
            "origin_required": True,
            "allowed_extension_count": len(CHROME_EXTENSION_IDS),
            "browser_user_agent_required": False,
            "max_chars": min(50_000, MAX_CHARS),
            "challenge_ttl_seconds": CHROME_CHALLENGE_TTL_SECONDS,
            "token_ttl_seconds": CHROME_TOKEN_TTL_SECONDS,
            "token_max_checks": 1,
            "pow_bits": CHROME_POW_BITS,
            "replay_backend": CHROME_REPLAY_BACKEND,
        },
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
         "fallback": _request_fallback(request)},
        status_code=422)


@APP.exception_handler(Exception)
async def _no_leak(request: Request, exc: Exception):
    # Default handlers print the request body into the traceback. This one
    # deliberately discards everything about the request.
    return JSONResponse({"error": "internal", "message": "Check failed.",
                         "processed": "none", "retained": "nothing",
                         "retryable": True,
                         "fallback": _request_fallback(request)},
                        status_code=500)
