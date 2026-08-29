#!/usr/bin/env python3
"""Generate matched AI short-form samples via OpenRouter.

Lengths 100/300/400/600 words, three prompt styles, topics taken from the
harvested human passages so the model cannot learn topic instead of authorship.

The key is read from OPENROUTER_API_KEY and is never written to disk or logged.

  OPENROUTER_API_KEY=... python3 generate_shortform.py --pilot
  OPENROUTER_API_KEY=... python3 generate_shortform.py --full --budget 55

Spend is checked against OpenRouter's own reported usage.cost after every call
and the run stops hard at --budget.
"""
import os, sys, json, time, random, argparse, urllib.request, urllib.error, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
OUT_DIR = os.path.join(HERE, "ai-samples")
SPEND_LOG = os.path.join(HERE, "shortform-spend-log.jsonl")
ERRORS = os.path.join(HERE, "shortform-generation-errors.jsonl")

TODAY = "2026-08-29"
LENGTHS = [100, 300, 400, 600]

# NOTE: `openai/gpt-5.6` was requested but DOES NOT EXIST on OpenRouter. The 5.6
# family is sol / luna / terra (each with a -pro variant). The owner's missed
# article came from gpt-5.6-sol, which is present and is weighted heavily in the
# humanise style below. Verified against /api/v1/models on 2026-08-29.
MODELS = [
    # (openrouter id, provider, label, weight_plain, weight_house, weight_humanise)
    ("openai/gpt-5.6-sol",            "openai",   "gpt-5-6-sol",       1, 1, 5),
    ("openai/gpt-5.5",                "openai",   "gpt-5-5",           1, 1, 4),
    ("openai/gpt-5.6-luna",           "openai",   "gpt-5-6-luna",      3, 3, 2),
    ("openai/gpt-5.6-terra",          "openai",   "gpt-5-6-terra",     1, 1, 2),
    ("anthropic/claude-sonnet-5",     "anthropic","claude-sonnet-5",   2, 2, 2),
    ("google/gemini-3.7-flash",       "google",   "gemini-3-7-flash",  3, 3, 1),
    ("x-ai/grok-4.6",                 "xai",      "grok-4-6",          2, 2, 1),
    ("deepseek/deepseek-v4-pro-0813", "deepseek", "deepseek-v4-pro",   3, 3, 1),
    ("meta-llama/llama-4-maverick",   "meta",     "llama-4-maverick",  3, 3, 1),
    ("mistralai/mistral-medium-3-5",  "mistral",  "mistral-medium-3-5",2, 2, 1),
    ("qwen/qwen3.8-max",              "qwen",     "qwen3-8-max",       2, 2, 1),
    ("z-ai/glm-5.3",                  "zai",      "glm-5-3",           2, 2, 1),
]

SYSTEM = ("You are a professional writer producing finished web copy for "
          "publication. You output the copy itself and nothing else.")

HOUSE_BRIEF = (
    "Write for a UK digital agency's blog. Audience is small and medium business "
    "owners. Use UK English. Be concrete and practical, give specific advice "
    "rather than generalities, and keep a warm professional tone. Do not include "
    "a title, headings, bullet lists or a sign-off - continuous prose only."
)

# The owner's own instructions, verbatim, typos included. This is the case that
# defeated the detector, so it is reproduced exactly rather than paraphrased.
HUMANISE = open(os.path.join(HERE, "humanise-style-verbatim.txt"),
                encoding="utf-8").read().strip()

# Discourse markers. The humanise style bans most of these, so its samples should
# show unusually low density - recorded per sample so it can be tested, not assumed.
DISCOURSE = [
    "however", "moreover", "furthermore", "therefore", "nonetheless",
    "nevertheless", "notably", "thus", "ultimately", "consequently",
    "additionally", "meanwhile", "similarly", "conversely", "accordingly",
    "on the other hand", "in addition", "as a result", "for example",
    "for instance", "in contrast", "that said", "in other words",
    "of course", "indeed", "besides", "hence", "instead", "although",
    "whereas", "despite", "in particular", "overall", "finally",
]
_DISC_RE = [(m, re.compile(r"\b" + re.escape(m) + r"\b", re.I)) for m in DISCOURSE]


def discourse_density(text):
    words = max(1, len(text.split()))
    hits = sum(len(r.findall(text)) for _, r in _DISC_RE)
    return {"discourse_markers": hits,
            "discourse_per_1k": round(1000.0 * hits / words, 3)}


def build_prompt(style, topic, length):
    ask = (f"Write approximately {length} words of continuous prose about: "
           f"{topic}. Do not include a title or headings.")
    if style == "plain":
        return SYSTEM, ask
    if style == "house":
        return SYSTEM, HOUSE_BRIEF + "\n\n" + ask
    if style == "humanise":
        return SYSTEM, HUMANISE + "\n\n" + ask
    raise ValueError(style)


_spend = {"cost": 0.0, "calls": 0, "stop": False}


def call(model, system, user, key, budget, max_tokens):
    if _spend["stop"]:
        return None, "budget-stop"
    body = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 1.0,
        "usage": {"include": True},
    }).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://opace.agency",
        "X-Title": "Opace short-form corpus",
    })
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f"http {e.code}: {e.read()[:200].decode('utf-8', 'replace')}"
    except Exception as e:                                    # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"

    usage = resp.get("usage") or {}
    cost = float(usage.get("cost") or 0.0)
    _spend["cost"] += cost
    _spend["calls"] += 1
    if _spend["cost"] >= budget:
        _spend["stop"] = True
    try:
        text = resp["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        return None, "no content in response"
    return {"text": text, "usage": usage, "cost": cost}, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--budget", type=float, default=55.0, help="hard USD stop")
    ap.add_argument("--n", type=int, default=2000)
    args = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        sys.exit("OPENROUTER_API_KEY missing from environment")

    topics = json.load(open(os.path.join(HERE, "topics.json")))
    rng = random.Random(20260829)
    n = 24 if args.pilot else args.n

    # even split over lengths and styles; models weighted per style
    styles = ["plain", "house", "humanise"]
    jobs = []
    for i in range(n):
        style = styles[i % 3]
        length = LENGTHS[(i // 3) % 4]
        wi = 3 + styles.index(style)
        pool = [m for m in MODELS for _ in range(m[wi])]
        model = rng.choice(pool)
        jobs.append((style, length, model, rng.choice(topics)))
    rng.shuffle(jobs)

    os.makedirs(OUT_DIR, exist_ok=True)
    buckets = collections.defaultdict(list)
    ok = err = 0
    t0 = time.time()

    for i, (style, length, model, topic) in enumerate(jobs):
        mid, provider, label = model[0], model[1], model[2]
        system, user = build_prompt(style, topic["topic"], length)
        res, e = call(mid, system, user, key, args.budget,
                      max_tokens=int(length * 2.2) + 200)
        if e:
            err += 1
            with open(ERRORS, "a") as fh:
                fh.write(json.dumps({"model": mid, "style": style,
                                     "length": length, "error": e}) + "\n")
            if e == "budget-stop":
                print("!! budget reached, stopping", flush=True)
                break
            continue
        ok += 1
        text = res["text"]
        rec = {
            "id": f"ai__{provider}__{label}__{style}__{length}__{i}",
            "text": text,
            "label": 1,
            "provider": provider,
            "model": mid,
            "style": style,
            "target_len": length,
            "word_count": len(text.split()),
            "topic": topic["topic"],
            "topic_categories": topic["categories"],
            "group": f"aitopic__{topic['source_slug']}",
            "generated": TODAY,
            "source": "openrouter-shortform-2026-08-29",
            "cost_usd": round(res["cost"], 8),
            **discourse_density(text),
        }
        buckets[(provider, label, style)].append(rec)
        if i % 25 == 0:
            print(f"  {i}/{len(jobs)} ok={ok} err={err} "
                  f"spend=${_spend['cost']:.4f} {time.time()-t0:.0f}s", flush=True)

    for (provider, label, style), recs in buckets.items():
        d = os.path.join(OUT_DIR, provider)
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, f"{provider}__{label}__{style}__{TODAY}.jsonl")
        with open(p, "a", encoding="utf-8") as fh:
            for r in recs:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(SPEND_LOG, "a") as fh:
        fh.write(json.dumps({"at": TODAY, "requests": ok + err, "ok": ok,
                             "errors": err,
                             "cost_usd": round(_spend["cost"], 6)}) + "\n")
    print(f"\nDONE ok={ok} err={err} spend=${_spend['cost']:.4f}")


if __name__ == "__main__":
    main()
