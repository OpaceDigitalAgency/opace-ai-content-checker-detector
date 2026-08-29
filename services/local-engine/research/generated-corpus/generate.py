"""Generate the 2026 article corpus via OpenRouter.

The API key is read from the OPENROUTER_API_KEY environment variable and is
never written to disk, logged or echoed.

Usage:
  OPENROUTER_API_KEY=... python3 generate.py --pilot
  OPENROUTER_API_KEY=... python3 generate.py --full --budget 38
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
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from prompts import build_tasks
import prompts2

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "generated.jsonl")
SPEND_LOG = os.path.join(HERE, "spend-log.jsonl")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

# Current flagship + mid-tier per provider, resolved from
# https://openrouter.ai/api/v1/models on 2026-08-28.
MODELS = [
    # (openrouter id, provider label, tier, model release date on OpenRouter)
    # tier: pro-flagship | standard | flash-or-mini
    # --- pass 1 (150 articles/marketing each) + pass 2 (100 new registers each)
    ("anthropic/claude-opus-5",        "anthropic", "pro-flagship",  "2026-07-24"),
    ("anthropic/claude-sonnet-5",      "anthropic", "standard",      "2026-06-30"),
    ("openai/gpt-5.6-terra",           "openai",    "standard",      "2026-07-09"),
    ("openai/gpt-5.6-luna",            "openai",    "flash-or-mini", "2026-07-09"),
    ("google/gemini-3.7-flash",        "google",    "flash-or-mini", "2026-08-13"),
    ("x-ai/grok-4.6",                  "xai",       "standard",      "2026-08-12"),
    ("deepseek/deepseek-v4-pro-0813",  "deepseek",  "standard",      "2026-08-12"),
    ("meta-llama/llama-4-maverick",    "meta",      "flash-or-mini", "2025-04-05"),
    ("mistralai/mistral-medium-3-5",   "mistral",   "standard",      "2026-04-30"),
    ("qwen/qwen3.8-max",               "qwen",      "standard",      "2026-08-03"),
    ("moonshotai/kimi-k3",             "moonshot",  "pro-flagship",  "2026-07-16"),
    ("z-ai/glm-5.3",                   "zai",       "standard",      "2026-08-18"),
    # --- pass 3, added on owner request (mixed registers)
    ("openai/gpt-5.6-sol",             "openai",    "standard",      "2026-07-09"),
    ("anthropic/claude-fable-5",       "anthropic", "pro-flagship",  "2026-06-09"),
    ("google/gemini-3.1-pro-preview",  "google",    "pro-flagship",  "2026-02-19"),
    ("google/gemini-3.5-flash",        "google",    "flash-or-mini", "2026-05-19"),
    ("openai/gpt-5.4",                 "openai",    "standard",      "2026-03-05"),
    ("openai/gpt-5.6-sol-pro",         "openai",    "pro-flagship",  "2026-07-09"),
    ("openai/gpt-5.6-luna-pro",        "openai",    "pro-flagship",  "2026-07-09"),
    ("anthropic/claude-opus-4.8",      "anthropic", "pro-flagship",  "2026-05-27"),
    ("google/gemini-3.6-flash",        "google",    "flash-or-mini", "2026-07-21"),
]

# Batch endpoints, roughly half price. Used where the provider offers one; the
# run is not time-critical. Falls back to the sync id if the batch id errors.
BATCH_ALIAS = {
    "anthropic/claude-fable-5": "anthropic/claude-fable-5:batch",
    "anthropic/claude-opus-4.8": "anthropic/claude-opus-4.8:batch",
    "google/gemini-3.1-pro-preview": "google/gemini-3.1-pro-preview:batch",
    "google/gemini-3.5-flash": "google/gemini-3.5-flash:batch",
    "google/gemini-3.6-flash": "google/gemini-3.6-flash:batch",
}

TIER = {m[0]: m[2] for m in MODELS}

SYSTEM = (
    "You are a professional writer producing finished web copy for publication. "
    "You output the article itself and nothing else."
)

_lock = threading.Lock()
_spend = {"cost": 0.0, "calls": 0, "stop": False}

FENCE = re.compile(r"^\s*```(?:markdown|md|html|text)?\s*\n(.*?)\n\s*```\s*$", re.S)
PREAMBLE = re.compile(
    r"^\s*(?:sure[,!.]?|certainly[,!.]?|of course[,!.]?|here(?:'s| is)[^\n]{0,120})\n+",
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


# models whose endpoint refuses reasoning:{enabled:false} - learned at runtime
_no_disable: set[str] = set()
# models whose :batch alias failed - fall back to the sync id
_no_batch: set[str] = set()


USE_BATCH = {"on": False}


def call(model_id: str, prompt: str, temperature: float, key: str,
         max_tokens: int = 2400) -> dict:
    wire_id = model_id
    if USE_BATCH["on"] and model_id in BATCH_ALIAS and model_id not in _no_batch:
        wire_id = BATCH_ALIAS[model_id]
    body = {
        "model": wire_id,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": (max_tokens + 1600) if model_id in _no_disable else max_tokens,
        "usage": {"include": True},
    }
    if model_id in _no_disable:
        # endpoint mandates reasoning; ask for the cheapest amount of it
        body["reasoning"] = {"effort": "low"}
    else:
        # keep this a writing task, not a reasoning task, and keep spend honest
        body["reasoning"] = {"enabled": False}
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://opace.agency/",
            "X-Title": "Opace AI Content Integrity - corpus build",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read().decode())


def one(args) -> dict | None:
    model_id, provider, tier, release, task, key, budget = args
    if _spend["stop"]:
        return None
    last_err = None
    temperature = task["temperature"]
    for attempt in range(5):
        try:
            resp = call(model_id, task["prompt"], temperature, key,
                        task.get("max_tokens", 2400))
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            last_err = f"HTTP {e.code}: {detail}"
            if model_id in BATCH_ALIAS and model_id not in _no_batch and e.code in (400, 404):
                _no_batch.add(model_id)
                continue
            if e.code == 400 and "easoning is mandatory" in detail:
                _no_disable.add(model_id)
                continue
            if e.code == 400 and ("emperature" in detail or "unsupported" in detail.lower()):
                # provider rejects our temperature; retry at its default
                temperature = 1.0
                continue
            if e.code in (429, 500, 502, 503, 524):
                time.sleep(3 * (attempt + 1) + attempt * 5)
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
        return {
            "__error__": f"empty content (finish_reason={finish})",
            "model": model_id,
            "prompt_id": task["prompt_id"],
            "cost": cost,
        }

    text, notes = clean(raw)
    words = len(text.split())
    sha = hashlib.sha256(text.encode()).hexdigest()
    return {
        "id": f"{provider}-2026-generated-{sha[:10]}",
        "provider": provider,
        "era": "2026-generated",
        "model": resp.get("model") or model_id,
        "model_requested": model_id,
        "model_tier": tier,
        "tier": tier,
        "model_release": release,
        "side": "ai",
        "source": "openrouter-2026-08-28",
        "genre": task["register"],
        "register": task["register"],
        "domain": task["domain"],
        "prompt_id": task["prompt_id"],
        "topic_id": task["topic_id"],
        "prompt_style": task["prompt_style"],
        "length_band": task.get("length_band", "long"),
        "target_words": task.get("target_words", [600, 1000]),
        "temperature": temperature,
        "temperature_requested": task["temperature"],
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
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


def run(models, tasks, key, budget, out_path, workers=6):
    jobs = []
    for mid, prov, tier, rel in models:
        for t in tasks:
            jobs.append((mid, prov, tier, rel, t, key, budget))
    print(f"{len(jobs)} requests across {len(models)} models", flush=True)
    ok = err = 0
    t0 = time.time()
    with open(out_path, "a") as f, ThreadPoolExecutor(max_workers=workers) as ex:
        for i, r in enumerate(ex.map(one, jobs), 1):
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
                print(
                    f"  {i}/{len(jobs)}  ok={ok} err={err}  "
                    f"spend=${_spend['cost']:.4f}  {time.time()-t0:.0f}s",
                    flush=True,
                )
            if _spend["stop"]:
                print(f"BUDGET CAP ${budget} reached - stopping", flush=True)
                break
    with open(SPEND_LOG, "a") as f:
        f.write(json.dumps({
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "requests": len(jobs), "ok": ok, "errors": err,
            "cost_usd": round(_spend["cost"], 6),
        }) + "\n")
    print(f"DONE ok={ok} err={err} spend=${_spend['cost']:.4f}", flush=True)
    return ok, err, _spend["cost"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--n", type=int, default=150)
    ap.add_argument("--budget", type=float, default=38.0)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--models", default="")
    ap.add_argument("--pass2", action="store_true")
    ap.add_argument("--mix", action="store_true")
    ap.add_argument("--batch", action="store_true")
    a = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key.startswith("sk-or-"):
        sys.exit("OPENROUTER_API_KEY missing from environment")

    if a.mix:
        n1 = round(a.n * 0.6)
        t1 = build_tasks(n_per_model=n1)
        t2 = prompts2.build_tasks(n_per_model=a.n - n1)
        tasks = t1 + t2
        import random as _r
        _r.Random(20260828).shuffle(tasks)
    elif a.pass2:
        tasks = prompts2.build_tasks(n_per_model=a.n)
    else:
        tasks = build_tasks(n_per_model=a.n)
    models = MODELS
    if a.models:
        wanted = set(a.models.split(","))
        models = [m for m in MODELS if m[0] in wanted]
    if a.pilot:
        models = [m for m in models if m[0] in
                  ("anthropic/claude-opus-5", "google/gemini-3.7-flash")]
        tasks = tasks[:5]

    USE_BATCH["on"] = a.batch
    run(models, tasks, key, a.budget, a.out, a.workers)


if __name__ == "__main__":
    main()
