#!/usr/bin/env python3
"""Pilot: is the owner's missed article a LENGTH problem or a STYLE problem?

Fully crossed 4 lengths x 3 styles. Model is balanced identically inside every
cell (half gpt-5.6-sol, half gpt-5.6-luna) so model cannot confound the
length x style comparison. Topics come from the harvested human passages.

Key is read from OPENROUTER_API_KEY and is never logged or written to disk.
"""
import os, sys, json, time, random, argparse, threading, re, collections
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
OUT = os.path.join(HERE, "pilot-ai-samples.jsonl")
ERRORS = os.path.join(HERE, "pilot-errors.jsonl")
TODAY = "2026-08-29"

LENGTHS = [100, 300, 400, 600]
STYLES = ["plain", "house", "humanise"]
# balanced in every cell; sol is the model that produced the missed article
CELL_MODELS = [("openai/gpt-5.6-sol", "openai", "gpt-5-6-sol"),
               ("openai/gpt-5.6-luna", "openai", "gpt-5-6-luna")]

SYSTEM = ("You are a professional writer producing finished web copy for "
          "publication. You output the copy itself and nothing else.")

HOUSE_BRIEF = (
    "Write for a UK digital agency's blog. Audience is small and medium business "
    "owners. Use UK English. Be concrete and practical, give specific advice "
    "rather than generalities, and keep a warm professional tone. Do not include "
    "a title, headings, bullet lists or a sign-off - continuous prose only.")

HUMANISE = open(os.path.join(HERE, "humanise-style-verbatim.txt"),
                encoding="utf-8").read().strip()

DISCOURSE = ["however","moreover","furthermore","therefore","nonetheless",
    "nevertheless","notably","thus","ultimately","consequently","additionally",
    "meanwhile","similarly","conversely","accordingly","on the other hand",
    "in addition","as a result","for example","for instance","in contrast",
    "that said","in other words","of course","indeed","besides","hence",
    "instead","although","whereas","despite","in particular","overall","finally"]
_DR = [re.compile(r"\b"+re.escape(m)+r"\b", re.I) for m in DISCOURSE]

def discourse(text):
    w = max(1, len(text.split()))
    h = sum(len(r.findall(text)) for r in _DR)
    return h, round(1000.0*h/w, 3)

def build(style, topic, length):
    ask = (f"Write approximately {length} words of continuous prose about: "
           f"{topic}. Do not include a title or headings.")
    if style == "plain":    return SYSTEM, ask
    if style == "house":    return SYSTEM, HOUSE_BRIEF + "\n\n" + ask
    if style == "humanise": return SYSTEM, HUMANISE + "\n\n" + ask
    raise ValueError(style)

_lock = threading.Lock()
_spend = {"cost": 0.0, "calls": 0, "stop": False}

def call(model, system, user, key, budget, max_tokens):
    with _lock:
        if _spend["stop"]:
            return None, "budget-stop"
    body = json.dumps({"model": model,
        "messages":[{"role":"system","content":system},
                    {"role":"user","content":user}],
        "max_tokens": max_tokens, "temperature": 1.0,
        "usage": {"include": True}}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json",
        "HTTP-Referer": "https://opace.agency", "X-Title": "Opace short-form pilot"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f"http {e.code}: {e.read()[:160].decode('utf-8','replace')}"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"
    usage = resp.get("usage") or {}
    cost = float(usage.get("cost") or 0.0)
    with _lock:
        _spend["cost"] += cost; _spend["calls"] += 1
        if _spend["cost"] >= budget:
            _spend["stop"] = True
    try:
        text = resp["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return None, "no content field"
    if not text or not text.strip():
        return None, "empty content"
    text = text.strip()
    if len(text.split()) < 40:
        return None, f"too short ({len(text.split())} words)"
    return {"text": text, "cost": cost, "usage": usage}, None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-cell", type=int, default=80)
    ap.add_argument("--budget", type=float, default=11.0)
    ap.add_argument("--workers", type=int, default=12)
    a = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY","")
    if not key:
        sys.exit("OPENROUTER_API_KEY missing from environment")

    topics = json.load(open(os.path.join(HERE,"topics.json")))
    rng = random.Random(20260829)
    jobs = []
    for length in LENGTHS:
        for style in STYLES:
            for i in range(a.per_cell):
                jobs.append((style, length, CELL_MODELS[i % 2], rng.choice(topics)))
    rng.shuffle(jobs)
    print(f"pilot: {len(jobs)} samples, {len(LENGTHS)}x{len(STYLES)} cells "
          f"of {a.per_cell}, hard stop ${a.budget}", flush=True)

    ok = err = 0
    t0 = time.time()
    fh = open(OUT, "w", encoding="utf-8")
    eh = open(ERRORS, "w", encoding="utf-8")

    def work(job):
        nonlocal ok, err
        try:
            _work(job)
        except Exception as exc:                      # noqa: BLE001
            with _lock:
                err += 1
                eh.write(json.dumps({"error": f"worker: {type(exc).__name__}: {exc}"})+"\n")

    def _work(job):
        nonlocal ok, err
        style, length, model, topic = job
        mid, provider, label = model
        system, user = build(style, topic["topic"], length)
        res, e = call(mid, system, user, key, a.budget, int(length*2.2)+220)
        if e:
            with _lock:
                err += 1
                eh.write(json.dumps({"model":mid,"style":style,"length":length,
                                     "error":e})+"\n")
            return
        text = res["text"]; h, hp = discourse(text)
        rec = {"id": f"ai__{label}__{style}__{length}__{rng.randrange(10**9)}",
               "text": text, "label": 1, "provider": provider, "model": mid,
               "model_label": label, "style": style, "target_len": length,
               "word_count": len(text.split()), "topic": topic["topic"],
               "topic_categories": topic["categories"],
               "group": f"aitopic__{topic['source_slug']}",
               "generated": TODAY, "source": "openrouter-shortform-pilot-2026-08-29",
               "cost_usd": round(res["cost"], 8),
               "discourse_markers": h, "discourse_per_1k": hp}
        with _lock:
            ok += 1
            fh.write(json.dumps(rec, ensure_ascii=False)+"\n"); fh.flush()
            if ok % 50 == 0:
                print(f"  ok={ok} err={err} spend=${_spend['cost']:.4f} "
                      f"{time.time()-t0:.0f}s", flush=True)

    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        list(ex.map(work, jobs))
    fh.close(); eh.close()

    with open(os.path.join(HERE,"shortform-spend-log.jsonl"),"a") as sf:
        sf.write(json.dumps({"at":TODAY,"run":"pilot","requests":ok+err,"ok":ok,
                             "errors":err,"cost_usd":round(_spend["cost"],6)})+"\n")
    print(f"\nDONE ok={ok} err={err} ACTUAL SPEND ${_spend['cost']:.4f} "
          f"in {time.time()-t0:.0f}s")

if __name__ == "__main__":
    main()
