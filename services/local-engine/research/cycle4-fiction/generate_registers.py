"""Generate the AI side the cycle-3 corpus was missing: fiction first, then the
other registers the human short-form corpus carries and the AI side did not.

Why this exists. Cycle 3 held 1,248 AI short-form documents, every one of them
on a web-design or SEO topic, against a human short-form side spanning fiction,
government guidance, biomedical research, environmental journalism, corporate
filings, policy analysis, world journalism and student essays. Human fiction
had 400 passages and 260 long-form documents; AI fiction had none. Cycle 3's
fiction false positives rose 23/260 -> 29/260 and all six new ones were genuine
narrative fiction. This file generates the missing side.

The key is read from OPENROUTER_API_KEY. It is never logged, never written to
disk, and never echoed.

  OPENROUTER_API_KEY=... python3 generate_registers.py --pilot --budget 0.30
  OPENROUTER_API_KEY=... python3 generate_registers.py --n 780 --budget 3.30

Spend is taken from OpenRouter's own reported usage.cost after every call and
the run stops hard at --budget. Samples are appended as they arrive, so an
abort keeps everything already paid for.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
SF = os.path.join(os.path.dirname(HERE), "shortform-corpus")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

TODAY = "2026-08-30"
LENGTHS = [100, 300, 400, 600]
# Chosen from the length table: 600-1,199 words is where long-form
# detection sags (88.5% and 90.7% against 97.7% above 1,200), and no AI
# document in the corpus exceeds 3,061 words while the server takes 4,000.
LONG_LENGTHS = [800, 1000, 1200, 1600, 2500, 3500]

# Same roster the cycle-3 generation used, verified against /api/v1/models.
MODELS = [
    ("openai/gpt-5.6-sol", "openai", "gpt-5-6-sol", 3),
    ("openai/gpt-5.5", "openai", "gpt-5-5", 2),
    ("openai/gpt-5.6-luna", "openai", "gpt-5-6-luna", 3),
    ("openai/gpt-5.6-terra", "openai", "gpt-5-6-terra", 2),
    ("anthropic/claude-sonnet-5", "anthropic", "claude-sonnet-5", 3),
    ("google/gemini-3.7-flash", "google", "gemini-3-7-flash", 3),
    ("x-ai/grok-4.6", "xai", "grok-4-6", 2),
    ("deepseek/deepseek-v4-pro-0813", "deepseek", "deepseek-v4-pro", 3),
    ("meta-llama/llama-4-maverick", "meta", "llama-4-maverick", 2),
    ("mistralai/mistral-medium-3-5", "mistral", "mistral-medium-3-5", 2),
    ("z-ai/glm-5.3", "zai", "glm-5-3", 2),
]

SYSTEM = {
    "fiction": ("You are a fiction writer. You output the prose itself and "
                "nothing else - no title, no author note, no commentary."),
    "default": ("You are a professional writer producing finished prose for "
                "publication. You output the copy itself and nothing else."),
}

# Register briefs. The marketing one is the owner's house brief verbatim; the
# others are its equivalent for a register where "UK digital agency blog" would
# be nonsense, and each is written from the human source's own conventions.
BRIEFS = {
    "fiction": ("Write as a published literary or genre novelist would. Continuous "
                "narrative prose with named characters and dialogue where it fits. "
                "Do not summarise the story or explain it; write the scene itself. "
                "UK English. No title, no headings, no closing moral."),
    "gov-guidance": ("Write as UK government public guidance. Plain English, second "
                     "person, concrete steps and eligibility conditions, the tone of "
                     "GOV.UK. No headings or bullet lists - continuous prose."),
    "medical-research": ("Write as the body prose of an open-access biomedical research "
                         "paper: methods and findings in the passive where convention "
                         "requires, hedged conclusions, no headings or citations list."),
    "environmental-journalism": ("Write as a conservation and environment reporter filing "
                                 "for an international outlet. Named places, quoted sources, "
                                 "specific figures. Continuous prose, no headings."),
    "corporate-filing": ("Write as the management discussion and analysis section of an "
                         "annual report: measured, comparative against the prior period, "
                         "cautious about forward-looking statements. Continuous prose."),
    "policy-report": ("Write as a non-partisan legislative research service analyst: "
                      "neutral, structured argument, options laid out without "
                      "recommendation. Continuous prose, no headings."),
    "world-journalism": ("Write as a citizen journalist filing for an international "
                         "volunteer translation network. Local detail, named people, "
                         "first-hand texture. Continuous prose, no headings."),
    "student-essay": ("Write as a capable secondary-school or first-year undergraduate "
                      "student writing an argumentative essay under time pressure. "
                      "Continuous prose, no headings."),
}

HUMANISE = open(os.path.join(SF, "humanise-style-verbatim.txt"),
                encoding="utf-8").read().strip()

# The repetition condition. Human fiction sits low on type-token ratio because
# character names, dialogue tags and motifs recur; the AI side needs documents
# that do the same, or the model keeps reading low TTR as evidence of a human.
REPEAT = {
    "fiction": ("Keep the cast small - two or three named characters - and name them "
                "often rather than using pronouns. Let one object, place or phrase "
                "recur through the passage. Keep the vocabulary plain and repeat it."),
    "default": ("Keep the vocabulary tight and deliberately repetitive: reuse the same "
                "key terms rather than reaching for synonyms, as real documents in this "
                "genre do."),
}

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
_WORD = re.compile(r"[a-z']+")


def discourse_density(text):
    words = max(1, len(text.split()))
    hits = sum(len(r.findall(text)) for _, r in _DISC_RE)
    return {"discourse_markers": hits,
            "discourse_per_1k": round(1000.0 * hits / words, 3)}


def ttr(text):
    w = _WORD.findall(text.lower())
    return round(len(set(w)) / len(w), 4) if w else 0.0


def build_prompt(style, register, topic, length, repeat):
    sysmsg = SYSTEM.get(register, SYSTEM["default"])
    if register == "fiction":
        ask = (f"Write approximately {length} words of continuous narrative prose. "
               f"{topic}")
    else:
        ask = (f"Write approximately {length} words of continuous prose about: "
               f"{topic}. Do not include a title or headings.")
    if style == "plain":
        user = ask
    elif style == "brief":
        user = BRIEFS[register] + "\n\n" + ask
    elif style == "humanise":
        user = HUMANISE + "\n\n" + ask
    else:
        raise ValueError(style)
    if repeat:
        user += "\n\n" + REPEAT.get(register, REPEAT["default"])
    return sysmsg, user


class Spend:
    def __init__(self, budget):
        self.lock = threading.Lock()
        self.cost = 0.0
        self.calls = 0
        self.budget = budget
        self.stop = False

    def add(self, c):
        with self.lock:
            self.cost += c
            self.calls += 1
            if self.cost >= self.budget:
                self.stop = True
            return self.cost


def call(model, system, user, key, spend, max_tokens):
    if spend.stop:
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
        "X-Title": "Opace register corpus",
    })
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f"http {e.code}: {e.read()[:200].decode('utf-8', 'replace')}"
    except Exception as e:                                    # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"
    usage = resp.get("usage") or {}
    spend.add(float(usage.get("cost") or 0.0))
    try:
        text = (resp["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, TypeError):
        return None, "no content in response"
    if len(text.split()) < 40:  # empty or reasoning-only completion
        return None, f"short/empty completion ({len(text.split())} words)"
    return {"text": text, "usage": usage,
            "cost": float(usage.get("cost") or 0.0)}, None


FIC_SHARE = float(os.environ.get("FIC_SHARE", "0.70"))


def plan(n, rng, topics, lengths=None):
    lengths = lengths or LENGTHS
    fic = [t for t in topics if t["register"] == "fiction"]
    non = [t for t in topics if t["register"] != "fiction"]
    regs = sorted({t["register"] for t in non})
    n_fic = int(round(n * FIC_SHARE))
    jobs = []
    styles = ["plain", "brief", "humanise"]
    for i in range(n_fic):
        jobs.append({"register": "fiction", "topic": fic[i % len(fic)]})
    per = (n - n_fic) // len(regs) if regs else 0
    for r in regs:
        pool = [t for t in non if t["register"] == r]
        for j in range(per):
            jobs.append({"register": r, "topic": pool[j % len(pool)]})
    for k, j in enumerate(jobs):
        j["style"] = styles[k % 3]
        j["length"] = lengths[(k // 3) % len(lengths)]
        j["repeat"] = bool(k % 2)
        pool = [m for m in MODELS for _ in range(m[3])]
        j["model"] = rng.choice(pool)
    rng.shuffle(jobs)
    return jobs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=780)
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--budget", type=float, required=True)
    ap.add_argument("--out", default=os.path.join(HERE, "ai-registers.jsonl"))
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--long", action="store_true",
                    help="1,000-4,000 word documents instead of 100-600")
    ap.add_argument("--seed", type=int, default=20260830)
    a = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        sys.exit("OPENROUTER_API_KEY missing from environment")

    topics = json.load(open(os.environ.get("C4_TOPICS")
                          or os.path.join(HERE, "topics.json")))
    rng = random.Random(a.seed)
    jobs = plan(20 if a.pilot else a.n, rng, topics,
                LONG_LENGTHS if a.long else LENGTHS)

    spend = Spend(a.budget)
    errs = os.path.join(HERE, "generation-errors.jsonl")
    lock = threading.Lock()
    counts = collections.Counter()
    t0 = time.time()
    fh = open(a.out, "a", encoding="utf-8")

    def run(idx_job):
        i, j = idx_job
        if spend.stop:
            return
        mid, provider, label = j["model"][0], j["model"][1], j["model"][2]
        system, user = build_prompt(j["style"], j["register"], j["topic"]["topic"],
                                    j["length"], j["repeat"])
        res, e = call(mid, system, user, key, spend,
                      max_tokens=min(max(int(j["length"] * 2.6) + 900, 2600), 20000))
        if e:
            with lock:
                counts["err"] += 1
                with open(errs, "a") as f:
                    f.write(json.dumps({"model": mid, "register": j["register"],
                                        "length": j["length"], "error": e}) + "\n")
            return
        text = res["text"]
        rec = {
            "id": f"c4__{provider}__{label}__{j['register']}__{j['style']}__"
                  f"{j['length']}__{'rep' if j['repeat'] else 'nat'}__{i}",
            "text": text,
            "label": 1,
            "side": "ai",
            "register_seed": j["register"],
            "provider": provider,
            "model": mid,
            "style": j["style"],
            "repeat_condition": j["repeat"],
            "target_len": j["length"],
            "word_count": len(text.split()),
            "ttr": ttr(text),
            "topic": j["topic"]["topic"],
            "genre_label": j["topic"]["genre_label"],
            "group": "c4-" + j["topic"]["group"],
            "generated": TODAY,
            "source": "openrouter-registers-2026-08-30",
            "cost_usd": round(res["cost"], 8),
            **discourse_density(text),
        }
        with lock:
            counts["ok"] += 1
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            if counts["ok"] % 25 == 0:
                print(f"  {counts['ok']} ok {counts['err']} err "
                      f"${spend.cost:.4f} {time.time()-t0:.0f}s", flush=True)

    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        list(ex.map(run, enumerate(jobs)))
    fh.close()
    with open(os.path.join(HERE, "spend-log.jsonl"), "a") as f:
        f.write(json.dumps({"at": TODAY, "pilot": a.pilot, "ok": counts["ok"],
                            "errors": counts["err"],
                            "cost_usd": round(spend.cost, 6)}) + "\n")
    print(f"\nDONE ok={counts['ok']} err={counts['err']} spend=${spend.cost:.4f}")


if __name__ == "__main__":
    main()
