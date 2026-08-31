"""Matched AI generation against the human-structured-corpus briefs.

OWNER GATES (do not remove):
  - Balance verified via GET /api/v1/key BEFORE any generation; cumulative
    spend tracked per call; HARD STOP at $20.
  - Pilot mode (default): 20 pairs across 5 models, then STOP. Bulk requires
    explicit --bulk after owner go-ahead.
  - The model receives ONLY the extracted brief (topic, type, length,
    structure outline, tone, audience) -- never the human body text.
  - Held-out slice decided BEFORE generation (see below): topics whose slug
    hash falls in the eval bucket, plus the entire Google/Gemini model
    family, are eval-only and must never be trained on.

Model mix (weighted to evaders + flagships per owner):
  meta-llama/llama-4-maverick (weakest detection), x-ai/grok-4.6,
  anthropic/claude-opus-5, openai/gpt-5.6-terra,
  google/gemini-3.1-pro-preview (gemini family = HELD-OUT eval-only).

Usage:
  OPENROUTER_API_KEY=... python3 generate_matched.py            # pilot (20)
  OPENROUTER_API_KEY=... python3 generate_matched.py --bulk --n 1200
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(os.path.dirname(HERE), "corpus.jsonl")
OUT = os.path.join(HERE, "matched.jsonl")
LEDGER = os.path.join(HERE, "cost-ledger.jsonl")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
KEYINFO = "https://openrouter.ai/api/v1/key"
HARD_CAP = 20.0

MODELS = [
    ("meta-llama/llama-4-maverick", "meta", "evader-priority"),
    ("x-ai/grok-4.6", "xai", "evader-priority"),
    ("anthropic/claude-opus-5", "anthropic", "flagship"),
    ("openai/gpt-5.6-terra", "openai", "flagship"),
    ("google/gemini-3.5-flash", "google", "flagship-heldout"),  # 3.1-pro dropped: degenerate <100w outputs, see manifest
]
# per-model target-length bands (evidence from pilot/re-pilots: each model
# only receives briefs in the band where it demonstrated +/-20% adherence)
LENGTH_BANDS = {
    "openai/gpt-5.6-terra": (600, 4000),      # overshoots short briefs
    "meta-llama/llama-4-maverick": (0, 1200), # runs out of steam on long
    "anthropic/claude-opus-5": (0, 600),
    "google/gemini-3.5-flash": (0, 2000),
    "x-ai/grok-4.6": (0, 4000),
}

HELDOUT_FAMILY = "google"       # entire family eval-only
HELDOUT_TOPIC_BUCKET = 0.15     # sha256(slug) % 100 < 15 -> eval-only topics

SYSTEM = ("You are a professional writer producing finished web copy for "
          "publication. You output the article itself and nothing else.")


def slug(topic):
    import re
    return re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")[:60]


def is_heldout_topic(topic):
    h = int(hashlib.sha256(slug(topic).encode()).hexdigest(), 16)
    return (h % 100) < HELDOUT_TOPIC_BUCKET * 100


def brief_prompt(brief):
    """Build the generation prompt from the brief ONLY."""
    o = brief.get("structure_outline") or []
    outline_lines = []
    for s in o[:20]:
        h = s.get("heading")
        comp = []
        if s.get("paras"):
            comp.append(f"{s['paras']} paragraph{'s' if s['paras'] > 1 else ''}")
        if s.get("bullets"):
            comp.append(f"{s['bullets']} bullet list{'s' if s['bullets'] > 1 else ''}")
        outline_lines.append(f"- {'(intro, no heading)' if not h else h}: "
                             + (", ".join(comp) if comp else "brief"))
    w = brief["length_words"]
    lo, hi, cap = int(w * 0.95), int(w * 1.05), int(w * 1.15)
    per_sec = max(20, int(w / max(1, len(outline_lines))))
    return (
        f"Write a {brief['type'].replace('-', ' ')} of {lo}-{hi} words "
        f"on the topic: {brief['topic']}\n"
        f"LENGTH IS THE HARD CONSTRAINT: at least {int(w * 0.85)} and at "
        f"most {cap} words. Count as you go; that is roughly {per_sec} "
        f"words per section below. Keep sections tight to stay in range -- "
        f"never pad, never cut the article short of {int(w * 0.85)} words.\n\n"
        f"Audience: {brief['audience']}\n"
        f"Tone: {brief['tone']}\n\n"
        f"Structure it as follows (markdown headings and bullet lists where "
        f"indicated):\n" + "\n".join(outline_lines) + "\n\n"
        f"Write naturally within this structure. Output only the article in "
        f"markdown."
    )


def key_balance(key):
    req = urllib.request.Request(KEYINFO, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())["data"]
    limit = d.get("limit")
    usage = d.get("usage", 0.0)
    remaining = (limit - usage) if limit is not None else None
    print(f"key: limit={limit} usage={usage:.4f} "
          f"remaining={'unlimited' if remaining is None else round(remaining, 4)}")
    return remaining


def call(model_id, prompt, key, max_tokens=2600, temperature=0.9):
    body = {
        "model": model_id,
        "messages": [{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": prompt}],
        "temperature": temperature,
        "usage": {"include": True},
        # google endpoints spend reasoning tokens out of max_tokens; without
        # headroom the visible answer is truncated to a few words
        "max_tokens": (max_tokens + 1600 if model_id.startswith("google/")
                       else max_tokens),
        "reasoning": ({"effort": "low"} if model_id.startswith("google/")
                      else {"enabled": False}),
    }
    req = urllib.request.Request(
        ENDPOINT, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}",
                 "Content-Type": "application/json",
                 "HTTP-Referer": "https://opace.agency/",
                 "X-Title": "Opace AI Content Integrity - matched corpus"},
        method="POST")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:200]
            if e.code == 400 and "easoning is mandatory" in detail:
                body["reasoning"] = {"effort": "low"}
                body["max_tokens"] = max_tokens + 1600
                req = urllib.request.Request(
                    ENDPOINT, data=json.dumps(body).encode(),
                    headers=req.headers, method="POST")
                continue
            if e.code in (429, 500, 502, 503):
                time.sleep(4 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {e.code}: {detail}")
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(4 * (attempt + 1))
    raise RuntimeError("retries exhausted")


def structure_adherence(text, brief):
    import re
    o = brief.get("structure_outline") or []
    want_secs = sum(1 for s in o if s.get("heading"))
    want_bullets = sum(s.get("bullets", 0) for s in o) > 0
    got_secs = len(re.findall(r"(?m)^#{2,6}\s", text))
    got_bullets = bool(re.search(r"(?m)^\s*([-*]|\d+\.)\s+", text))
    return {
        "want_sections": want_secs, "got_sections": got_secs,
        "sections_ok": abs(got_secs - want_secs) <= max(1, round(0.34 * want_secs)),
        "want_bullets": want_bullets, "got_bullets": got_bullets,
        "bullets_ok": want_bullets == got_bullets,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bulk", action="store_true",
                    help="bulk run -- ONLY after owner go-ahead on the pilot")
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--budget", type=float, default=2.0,
                    help="soft budget for this run (hard cap $20 overall)")
    ap.add_argument("--repilot", action="store_true",
                    help="10-pair re-pilot weighted to length-failers")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--weights", default=(
        "llama-4-maverick=0.32,grok-4.6=0.30,claude-opus-5=0.12,"
        "gpt-5.6-terra=0.16,gemini-3.5-flash=0.10"))
    a = ap.parse_args()
    if a.repilot:
        a.n = 10

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key.startswith("sk-or-"):
        sys.exit("OPENROUTER_API_KEY missing")

    remaining = key_balance(key)
    spent_before = 0.0
    if os.path.exists(LEDGER):
        for line in open(LEDGER):
            try:
                spent_before += json.loads(line).get("cost_usd", 0)
            except Exception:
                pass
    print(f"ledger spend so far: ${spent_before:.4f} (hard cap ${HARD_CAP})")
    if spent_before >= HARD_CAP:
        sys.exit("hard cap reached")
    if remaining is not None and remaining < 1.0:
        sys.exit("key balance too low")

    # load briefs; stratify by register; skip AMBER for generation pairing?
    # -- no: pairs mirror the human register mix, both buckets.
    docs = [json.loads(l) for l in open(CORPUS)]
    by_reg = {}
    for d in docs:
        by_reg.setdefault(d["register"], []).append(d)
    import random
    rng = random.Random(20260831)
    for v in by_reg.values():
        rng.shuffle(v)

    # round-robin registers for the pilot sample
    sample = []
    regs = sorted(by_reg)
    i = 0
    while len(sample) < max(a.n * 6, 500) and any(by_reg.values()):
        r = regs[i % len(regs)]
        if by_reg[r]:
            sample.append(by_reg[r].pop())
        i += 1
        if i > 10000:
            break

    seen_hashes = set()
    used_partners = set()
    if os.path.exists(OUT):
        for line in open(OUT):
            try:
                r = json.loads(line)
                seen_hashes.add(r["sha256"])
                used_partners.add(r["human_partner_id"])
            except Exception:
                pass
    sample = [d for d in sample if d["id"] not in used_partners]

    # per-model allocation
    if a.repilot:
        alloc = [("openai/gpt-5.6-terra", 4), ("anthropic/claude-opus-5", 2),
                 ("google/gemini-3.5-flash", 2),
                 ("meta-llama/llama-4-maverick", 2),
                 ("x-ai/grok-4.6", 2)]
    elif a.bulk:
        weights = dict(w.split("=") for w in a.weights.split(","))
        alloc = [(mid, int(a.n * float(weights.get(mid.split("/")[-1], 0))))
                 for mid, _, _ in MODELS]
        alloc = [(m, k) for m, k in alloc if k > 0]
    else:
        alloc = [(mid, max(1, a.n // len(MODELS))) for mid, _, _ in MODELS]
    fam = {mid: family for mid, family, _ in MODELS}
    role_of = {mid: role for mid, _, role in MODELS}
    jobs = []
    pool = list(sample)
    for mid, k in alloc:
        lo, hi = LENGTH_BANDS.get(mid, (0, 4000))
        take = [d for d in pool if lo <= d["brief"]["length_words"] <= hi][:k]
        for d in take:
            pool.remove(d)
            jobs.append((mid, d))
        if len(take) < k:
            print(f"  note: only {len(take)}/{k} briefs in band for {mid}")
    print(f"{len(jobs)} jobs: " + ", ".join(f"{m.split('/')[-1]}={k}" for m, k in alloc))
    run_cost = 0.0
    results = []
    import threading
    lock = threading.Lock()
    stop = {"on": False}
    f = open(OUT, "a")

    def one(job):
        nonlocal run_cost
        mid, d = job
        family = fam[mid]
        role = role_of[mid]
        if stop["on"]:
            return None
        if True:
            if True:
                brief = d["brief"]
                prompt = brief_prompt(brief)
                w_target = brief["length_words"]
                mt = min(4000, int(w_target * 2.2) + 500)
                cost = 0.0
                text, attempts = "", 0
                best_text, best_dev = "", 9e9
                for attempt in range(3):
                    attempts += 1
                    p = prompt
                    temp = (0.9, 0.6, 0.4)[attempt]
                    if attempt == 1:
                        got = len(best_text.split())
                        p = (prompt + f"\n\nIMPORTANT: a previous draft came "
                             f"out at {got} words, which misses the target. "
                             f"This draft MUST be between {int(w_target*0.85)} "
                             f"and {int(w_target*1.15)} words.")
                    try:
                        resp = call(mid, p, key, max_tokens=mt, temperature=temp)
                    except Exception as e:
                        print(f"ERR {mid}: {e}")
                        break
                    usage = resp.get("usage") or {}
                    cost += float(usage.get("cost") or 0.0)
                    t = ((resp.get("choices") or [{}])[0].get("message") or {}).get("content", "").strip()
                    if t:
                        dev = abs(len(t.split()) - w_target) / max(1, w_target)
                        if dev < best_dev:
                            best_text, best_dev = t, dev
                    if best_text and best_dev <= 0.2:
                        break
                text = best_text
                if best_text and best_dev > 0.5:
                    # degenerate output (mostly google truncation) -- do not
                    # bank garbage pairs; cost is still counted in run_cost
                    print(f"DEGEN {mid} dev={best_dev:.0%} -- discarded")
                    return None
                with lock:
                    run_cost += cost
                    if spent_before + run_cost >= min(HARD_CAP, a.budget + spent_before):
                        stop["on"] = True
                if not text:
                    print(f"EMPTY {mid}")
                    return None
                sha = hashlib.sha256(text.encode()).hexdigest()
                with lock:
                    if sha in seen_hashes:
                        print(f"DUP {mid} -- skipped")
                        return None
                    seen_hashes.add(sha)
                words = len(text.split())
                adh = structure_adherence(text, brief)
                row = {
                    "id": f"matched-{sha[:12]}",
                    "human_partner_id": d["id"],
                    "model": resp.get("model") or mid,
                    "model_requested": mid,
                    "model_family": family,
                    "model_role": role,
                    "register": d["register"],
                    "legal_bucket_of_partner": d["legal_bucket"],
                    "brief": brief,
                    "prompt": prompt,
                    "params": {"temperature": 0.9,
                               "reasoning": "disabled-or-low",
                               "system": SYSTEM},
                    "eval_only": (family == HELDOUT_FAMILY)
                                 or is_heldout_topic(brief["topic"]),
                    "heldout_reason": ("model-family" if family == HELDOUT_FAMILY
                                       else ("topic-bucket" if is_heldout_topic(brief["topic"]) else None)),
                    "words": words,
                    "target_words": brief["length_words"],
                    "length_ok_pm20": abs(words - brief["length_words"]) <= 0.2 * brief["length_words"],
                    "structure_adherence": adh,
                    "attempts": attempts,
                    "cost_usd": round(cost, 6),
                    "sha256": sha,
                    "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "text": text,
                }
                with lock:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                    f.flush()
                    results.append(row)
                    if len(results) % 25 == 0:
                        print(f"  {len(results)} done, spend ${run_cost:.3f}")
                if not a.bulk:
                    print(f"ok {mid} {words}w target {brief['length_words']} "
                          f"${cost:.4f} eval_only={row['eval_only']}")
                return row

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        list(ex.map(one, jobs))
    if stop["on"]:
        print("BUDGET STOP hit")
    f.close()

    with open(LEDGER, "a") as f:
        f.write(json.dumps({
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "mode": "bulk" if a.bulk else ("repilot" if a.repilot else "pilot"),
            "pairs": len(results), "cost_usd": round(run_cost, 6)}) + "\n")

    # pilot report
    if results:
        n = len(results)
        len_ok = sum(1 for r in results if r["length_ok_pm20"])
        sec_ok = sum(1 for r in results if r["structure_adherence"]["sections_ok"])
        bul_ok = sum(1 for r in results if r["structure_adherence"]["bullets_ok"])
        print(json.dumps({
            "pairs": n,
            "length_within_pm20pct": f"{len_ok}/{n}",
            "sections_adherent": f"{sec_ok}/{n}",
            "bullets_adherent": f"{bul_ok}/{n}",
            "cost_total_usd": round(run_cost, 4),
            "cost_per_pair_usd": round(run_cost / n, 4),
            "by_model": {mid: {
                "n": sum(1 for r in results if r["model_requested"] == mid),
                "len_ok": sum(1 for r in results if r["model_requested"] == mid and r["length_ok_pm20"]),
                "cost": round(sum(r["cost_usd"] for r in results if r["model_requested"] == mid), 4),
            } for mid, _, _ in MODELS},
        }, indent=1))
    if not a.bulk:
        print("PILOT COMPLETE -- STOPPING. Bulk generation requires owner "
              "go-ahead and --bulk.")


if __name__ == "__main__":
    main()
