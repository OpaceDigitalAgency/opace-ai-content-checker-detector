#!/usr/bin/env python3
"""Deliberate test: does SEO keyword repetition degrade detection?

Adds one prompt style, `seo-repetition`, which instructs heavy verbatim keyword
repetition and a narrow vocabulary - ordinary SEO practice, not an evasion
technique. Lengths are held identical to the existing pilot cells so repetition
is the only thing that changes.

Key read from OPENROUTER_API_KEY; never logged or written to disk.
"""
import os, sys, json, time, random, argparse, threading, re, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
TODAY = "2026-08-29"
LENGTHS = [100, 300, 400, 600]
CELL_MODELS = [("openai/gpt-5.6-sol", "openai", "gpt-5-6-sol"),
               ("openai/gpt-5.6-luna", "openai", "gpt-5-6-luna")]
# repetitions of the exact phrase, ~4-5% of word count: aggressive but real
REPEATS = {"heavy":    {100: 5, 300: 13, 400: 17, 600: 25},
           "moderate": {100: 3, 300: 7,  400: 9,  600: 13}}

SYSTEM = ("You are a professional writer producing finished web copy for "
          "publication. You output the copy itself and nothing else.")

STOP = set("the a an and or of to in for on with is are be can may that this it "
           "you your at as by from not if than then when what which their its "
           "own more most how why guide tips top best complete step".split())


def keyword(topic):
    """Primary keyword phrase: the leading content words of the topic."""
    t = re.sub(r"\(.*?\)", " ", topic)
    t = re.sub(r"[^A-Za-z0-9 ]+", " ", t)
    words = [w for w in t.split() if w.lower() not in STOP and len(w) > 2]
    return " ".join(words[:3]).lower() if words else topic.lower()


def build(topic, length, strength="heavy"):
    kw = keyword(topic)
    n = REPEATS[strength][length]
    narrow = ("- Keep the vocabulary deliberately narrow: reuse the same words rather "
              "than varying them, and reuse the same sentence openings.\n"
              if strength == "heavy" else
              "- Prefer reusing the same words for the same things rather than "
              "reaching for synonyms.\n")
    user = (
        f"Write approximately {length} words of continuous prose about: {topic}.\n\n"
        f"This is search-optimised copy. The primary keyword phrase is \"{kw}\".\n"
        f"- Use the exact phrase \"{kw}\" at least {n} times, including in the "
        f"first sentence and in the last sentence.\n"
        f"- Repeat it verbatim every time. Do not swap in synonyms, pronouns, "
        f"abbreviations or shortened forms for it.\n"
        f"- Also repeat the individual nouns from that phrase on their own "
        f"throughout the text.\n"
        + narrow +
        f"- UK English. No title, no headings, no bullet lists - continuous prose only."
    )
    return SYSTEM, user, kw


_lock = threading.Lock()
_spend = {"cost": 0.0, "stop": False}


def call(model, system, user, key, budget, max_tokens):
    with _lock:
        if _spend["stop"]:
            return None, "budget-stop"
    body = json.dumps({"model": model,
                       "messages": [{"role": "system", "content": system},
                                    {"role": "user", "content": user}],
                       "max_tokens": max_tokens, "temperature": 1.0,
                       "usage": {"include": True}}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json",
        "HTTP-Referer": "https://opace.agency", "X-Title": "Opace SEO repetition test"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f"http {e.code}"
    except Exception as e:                                  # noqa: BLE001
        return None, f"{type(e).__name__}"
    usage = resp.get("usage") or {}
    cost = float(usage.get("cost") or 0.0)
    with _lock:
        _spend["cost"] += cost
        if _spend["cost"] >= budget:
            _spend["stop"] = True
    try:
        text = resp["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return None, "no content"
    if not text or len(text.split()) < 40:
        return None, "too short"
    return {"text": text.strip(), "cost": cost}, None


def ttr(t):
    w = [x.lower().strip('.,;:!?"\'()') for x in t.split()]
    return len(set(w)) / max(1, len(w))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-cell", type=int, default=80)
    ap.add_argument("--budget", type=float, default=4.0)
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--out", default=os.path.join(HERE, "seo-ai-samples.jsonl"))
    ap.add_argument("--strength", default="heavy", choices=["heavy", "moderate"])
    a = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        sys.exit("OPENROUTER_API_KEY missing from environment")
    topics = json.load(open(os.path.join(HERE, "topics.json")))
    rng = random.Random(20260829)

    jobs = []
    for L in LENGTHS:
        for i in range(a.per_cell):
            jobs.append((L, CELL_MODELS[i % 2], rng.choice(topics)))
    rng.shuffle(jobs)
    print(f"seo-repetition: {len(jobs)} samples, hard stop ${a.budget}", flush=True)

    fh = open(a.out, "w", encoding="utf-8")
    ok = err = 0
    t0 = time.time()

    def work(job):
        nonlocal ok, err
        L, model, topic = job
        mid, provider, label = model
        system, user, kw = build(topic["topic"], L, a.strength)
        res, e = call(mid, system, user, key, a.budget, int(L * 2.2) + 220)
        if e:
            with _lock:
                err += 1
            return
        rec = {"id": f"ai__{label}__seo-repetition__{L}__{rng.randrange(10**9)}",
               "text": res["text"], "label": 1, "provider": provider, "model": mid,
               "model_label": label, "style": f"seo-{a.strength}", "target_len": L,
               "word_count": len(res["text"].split()), "topic": topic["topic"],
               "keyword": kw, "topic_categories": topic["categories"],
               "group": f"aitopic__{topic['source_slug']}", "generated": TODAY,
               "source": "openrouter-seo-repetition-2026-08-29",
               "cost_usd": round(res["cost"], 8), "ttr": round(ttr(res["text"]), 4),
               "discourse_per_1k": 0.0}
        with _lock:
            ok += 1
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); fh.flush()
            if ok % 40 == 0:
                print(f"  ok={ok} err={err} ${_spend['cost']:.4f} "
                      f"{time.time()-t0:.0f}s", flush=True)

    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        list(ex.map(work, jobs))
    fh.close()
    print(f"\nDONE ok={ok} err={err} ACTUAL SPEND ${_spend['cost']:.4f}")


if __name__ == "__main__":
    main()
