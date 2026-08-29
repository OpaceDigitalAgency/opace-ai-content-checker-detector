"""Long-form AI generation via OpenRouter.

Adapted from ../generated-corpus/generate.py. Same request handling, same
record shape, same three prompt styles; longer targets and only the long-form
registers the shipped model fails on.

The API key is read from OPENROUTER_API_KEY and is never written to disk,
logged or echoed. Hard budget cap stops the run.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import prompts_lf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "ai-longform-raw.jsonl")
SPEND_LOG = os.path.join(HERE, "logs", "spend-log.jsonl")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

# (openrouter id, provider label, tier, release date, samples requested)
# Allocation is deliberately weighted to the models that currently evade the
# shipped detector: grok-4.6 (13.6% caught), claude-opus-5 (24.8%),
# qwen3.8-max and deepseek-v4-pro. Cheap models carry volume.
PLAN = [
    # counts calibrated against a 13-request probe (2026-08-28, $0.3843) so the
    # full run lands inside the remaining authorised budget.
    ("x-ai/grok-4.6",                 "xai",       "standard",      "2026-08-12", 120),
    ("qwen/qwen3.8-max",              "qwen",      "standard",      "2026-08-03", 110),
    ("deepseek/deepseek-v4-pro-0813", "deepseek",  "standard",      "2026-08-12", 130),
    ("anthropic/claude-opus-5",       "anthropic", "pro-flagship",  "2026-07-24",  22),
    ("openai/gpt-5.6-sol-pro",        "openai",    "pro-flagship",  "2026-07-09",  12),
    ("moonshotai/kimi-k3",            "moonshot",  "pro-flagship",  "2026-07-16",  25),
    ("google/gemini-3.1-pro-preview", "google",    "pro-flagship",  "2026-02-19",  20),
    ("anthropic/claude-sonnet-5",     "anthropic", "standard",      "2026-06-30",  25),
    ("z-ai/glm-5.3",                  "zai",       "standard",      "2026-08-18",  80),
    ("mistralai/mistral-medium-3-5",  "mistral",   "standard",      "2026-04-30",  40),
    ("google/gemini-3.7-flash",       "google",    "flash-or-mini", "2026-08-13", 120),
    ("openai/gpt-5.6-luna",           "openai",    "flash-or-mini", "2026-07-09", 120),
    ("meta-llama/llama-4-maverick",   "meta",      "flash-or-mini", "2025-04-05", 100),
]

SYSTEM = (
    "You are a professional writer producing finished long-form prose for publication. "
    "You output the piece itself and nothing else."
)

_lock = threading.Lock()
TIMEOUT = {"s": 420}
_spend = {"cost": 0.0, "calls": 0, "stop": False}

FENCE = re.compile(r"^\s*```(?:markdown|md|html|text)?\s*\n(.*?)\n\s*```\s*$", re.S)
PREAMBLE = re.compile(
    r"^\s*(?:sure[,!.]?|certainly[,!.]?|of course[,!.]?|here(?:'s| is)[^\n]{0,140})\n+",
    re.I,
)


def clean(text: str) -> tuple[str, list[str]]:
    notes = []
    t = text.strip()
    m = FENCE.match(t)
    if m:
        t = m.group(1).strip()
        notes.append("stripped-code-fence")
    m = PREAMBLE.match(t)
    if m:
        t = t[m.end():].strip()
        notes.append("stripped-preamble")
    return t, notes


_no_disable: set[str] = set()


def call(model_id: str, prompt: str, temperature: float, key: str, max_tokens: int) -> dict:
    body = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": (max_tokens + 1200) if model_id in _no_disable else max_tokens,
        "usage": {"include": True},
    }
    if model_id in _no_disable:
        body["reasoning"] = {"effort": "low"}
    else:
        body["reasoning"] = {"enabled": False}
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://opace.agency/",
            "X-Title": "Opace AI Content Integrity - long-form corpus build",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT["s"]) as r:
        return json.loads(r.read().decode())


def one(args) -> dict | None:
    model_id, provider, tier, release, task, key, budget = args
    if _spend["stop"]:
        return None
    last_err = None
    temperature = task["temperature"]
    for attempt in range(5):
        try:
            resp = call(model_id, task["prompt"], temperature, key, task["max_tokens"])
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            last_err = f"HTTP {e.code}: {detail}"
            if e.code == 400 and "easoning is mandatory" in detail:
                _no_disable.add(model_id)
                continue
            if e.code == 400 and ("emperature" in detail or "unsupported" in detail.lower()):
                temperature = 1.0
                continue
            if e.code in (429, 500, 502, 503, 524):
                time.sleep(3 * (attempt + 1) + attempt * 4)
                continue
            return {"__error__": last_err, "model": model_id, "prompt_id": task["prompt_id"]}
        except Exception as e:  # noqa: BLE001
            last_err = f"{type(e).__name__}: {e}"
            time.sleep(3 * (attempt + 1))
    else:
        return {"__error__": last_err, "model": model_id, "prompt_id": task["prompt_id"]}

    usage = resp.get("usage") or {}
    cost = float(usage.get("cost") or 0.0)
    with _lock:
        _spend["cost"] += cost
        _spend["calls"] += 1
        if _spend["cost"] >= budget:
            _spend["stop"] = True

    choice = (resp.get("choices") or [{}])[0]
    raw = (choice.get("message") or {}).get("content") or ""
    finish = choice.get("finish_reason")
    if not raw.strip():
        return {"__error__": f"empty content (finish_reason={finish})",
                "model": model_id, "prompt_id": task["prompt_id"], "cost": cost}

    text, notes = clean(raw)
    words = len(text.split())
    sha = hashlib.sha256(text.encode()).hexdigest()
    return {
        "id": f"{provider}-2026-longform-{sha[:10]}",
        "side": "ai",
        "register": task["register"],
        "genre": task["register"],
        "provider": provider,
        "model": resp.get("model") or model_id,
        "model_requested": model_id,
        "era": "2026-generated",
        "era_year": 2026,
        "model_tier": tier,
        "tier": tier,
        "model_release": release,
        "source": "openrouter-longform-2026-08-28",
        "licence": "owner-generated; unrestricted internal use",
        "domain": task["domain"],
        "prompt_id": task["prompt_id"],
        "topic_id": task["topic_id"],
        "prompt_style": task["prompt_style"],
        "length_band": task["length_band"],
        "target_words": task["target_words"],
        "temperature": temperature,
        "temperature_requested": task["temperature"],
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "word_count": words,
        "words": words,
        "sha256": sha,
        "corpus_split": None,
        "finish_reason": finish,
        "clean_notes": notes,
        "usage": {
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
            "cost_usd": round(cost, 8),
        },
        "text": text,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--budget", type=float, default=12.55)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--timeout", type=int, default=420)
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key.startswith("sk-or-"):
        sys.exit("OPENROUTER_API_KEY missing from environment")

    TIMEOUT["s"] = a.timeout

    # Resume: skip (model, prompt_id) pairs already present in the output, so a
    # stopped run can be restarted at higher concurrency without re-spending.
    done = set()
    if a.resume and os.path.exists(a.out):
        for line in open(a.out):
            if not line.strip():
                continue
            d = json.loads(line)
            done.add((d.get("model_requested"), d.get("prompt_id")))
        print(f"resume: {len(done)} (model, prompt) pairs already done", flush=True)

    jobs = []
    for mid, prov, tier, rel, n in PLAN:
        n = max(1, round(n * a.scale))
        if a.probe:
            n = 1
        for t in prompts_lf.sample_for(mid, n):
            if (mid, t["prompt_id"]) in done:
                continue
            jobs.append((mid, prov, tier, rel, t, key, a.budget))
    # interleave models so a budget stop does not starve the last model
    jobs.sort(key=lambda j: hashlib.md5(f"{j[0]}::{j[4]['prompt_id']}".encode()).hexdigest())
    print(f"{len(jobs)} requests, budget cap ${a.budget}", flush=True)

    ok = err = 0
    t0 = time.time()
    os.makedirs(os.path.dirname(SPEND_LOG), exist_ok=True)
    # as_completed, not map: map yields in submission order, so one slow
    # generation blocks every finished result behind it and the run looks
    # stalled when it is not.
    with open(a.out, "a") as f, ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = [ex.submit(one, j) for j in jobs]
        for i, fut in enumerate(as_completed(futs), 1):
            r = fut.result()
            if r is None:
                continue
            with _lock:
                f.write(json.dumps(r) + "\n")
                f.flush()
            if "__error__" in r:
                err += 1
            else:
                ok += 1
            if i % 25 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} ok={ok} err={err} spend=${_spend['cost']:.4f} "
                      f"{time.time()-t0:.0f}s", flush=True)
            if _spend["stop"]:
                print(f"BUDGET CAP ${a.budget} reached - stopping", flush=True)
                break
    with open(SPEND_LOG, "a") as f:
        f.write(json.dumps({
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "run": "longform", "requests": len(jobs), "ok": ok, "errors": err,
            "cost_usd": round(_spend["cost"], 6),
        }) + "\n")
    print(f"DONE ok={ok} err={err} spend=${_spend['cost']:.4f}", flush=True)


if __name__ == "__main__":
    main()
