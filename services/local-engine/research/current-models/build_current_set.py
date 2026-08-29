"""Build the current-model (post-mid-2025) measurement set.

Sources (all downloaded by fetch_sources.sh into raw/):
  S1 lmarena-ai/arena-expert-5k  - expert Arena votes, models sampled
     2025-08..2025-10. Licence: user prompts CC-BY-4.0, model outputs under
     each provider's terms of use (identical footing to the
     arena-human-preference-140k shard already used by provider-eval).
     Register: CHAT REPLY.
  S2 TeichAI/Claude-Opus-4.6-Reasoning-887x  (apache-2.0)
     TeichAI/Claude-Sonnet-4.6-Reasoning-1100x (apache-2.0)
     Single-model distillation sets, Feb 2026 Anthropic models.
     Register: CHAT REPLY (single-turn user -> assistant).
  S3 elisabeth-pl-pl/GRADTEX (cc-by-4.0), MGT rows only (multiclass_label
     == "MGT" = wholly machine-written; MIX rows are part-human and are
     excluded). Feb-May 2026 models. Domains: news, science, tech_news,
     reviews, knowledge, fiction, social_media.
     Register: ARTICLE-STYLE PROSE.
  S4 mild-rgb/aita-human-vs-ai (apache-2.0), label == "ai" rows only.
     Seven August-2026 frontier models. Register: FIRST-PERSON FORUM
     NARRATIVE, written to a "sound like a Reddit poster" prompt - i.e.
     deliberately human-styled, an adversarial rather than a default case.

Rejected sources are documented in CURRENT-MODEL-EVAL.md, not here.

Output shape matches provider-eval/eval-set.jsonl:
  id, provider, era, model, side, genre, text  (+ source, words, sha256,
  register, model_release, licence)

QUARANTINE: any text whose sha256 (raw or whitespace-normalised) matches a
row of the scratchpad eval-samples.json test set is dropped, and any text
matching a corpus.jsonl row of ANY split is dropped (the provider-eval set
only dropped the train split; we are stricter because nothing here needs to
overlap the engine's own corpus at all).
"""

from __future__ import annotations

import ast
import hashlib
import json
import os
import random
import re

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
CORPUS = os.path.join(HERE, "..", "corpus", "corpus.jsonl")
QUARANTINE = os.environ.get(
    "QUARANTINE_JSON",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)
OUT = os.path.join(HERE, "current-eval-set.jsonl")

SEED = 20260828
CAP_PER_PROVIDER = 200
MIN_W, MAX_W = 120, 1200

# model id prefix -> (provider, era, release month). Only models RELEASED
# after 2025-07-01 are listed; everything else in the source is ignored.
MODELS = [
    # --- OpenAI ---
    (r"^gpt-5-chat", ("openai", "2025-26-late", "2025-08")),
    (r"^gpt-5-high|^gpt-5-mini|^gpt-5-nano|^gpt-5-old|^gpt-5", ("openai", "2025-26-late", "2025-08")),
    (r"^gpt-oss-", ("openai", "2025-26-late", "2025-08")),
    # --- Anthropic ---
    (r"^claude-sonnet-4\.6$", ("anthropic", "2026-mid", "2026-02")),
    (r"^claude-opus-4-1", ("anthropic", "2025-26-late", "2025-08")),
    (r"^claude-sonnet-4-5", ("anthropic", "2025-26-late", "2025-09")),
    (r"^claude-haiku-4-5|^claude-haiku-4\.5", ("anthropic", "2025-26-late", "2025-10")),
    (r"^claude-opus-4-6", ("anthropic", "2026-mid", "2026-02")),
    (r"^claude-sonnet-4-6", ("anthropic", "2026-mid", "2026-02")),
    # --- Google ---
    (r"^gemini-2\.5-flash-preview-09-2025", ("google", "2025-26-late", "2025-09")),
    (r"^gemini-2\.5-flash-lite-preview-09-2025", ("google", "2025-26-late", "2025-09")),
    # --- xAI (provider key 'grok' to match provider-eval) ---
    (r"^grok-4-fast", ("grok", "2025-26-late", "2025-09")),
    # --- DeepSeek ---
    (r"^deepseek-v3\.1", ("deepseek", "2025-26-late", "2025-08")),
    (r"^deepseek-v3\.2", ("deepseek", "2025-26-late", "2025-09")),
    # --- Mistral ---
    (r"^mistral-medium-2508", ("mistral", "2025-26-late", "2025-08")),
    # --- Alibaba / Qwen ---
    (r"^qwen3-235b-a22b-(instruct|thinking)-2507", ("alibaba", "2025-26-late", "2025-07")),
    (r"^qwen3-30b-a3b-instruct-2507", ("alibaba", "2025-26-late", "2025-07")),
    (r"^qwen3-coder-480b", ("alibaba", "2025-26-late", "2025-07")),
    (r"^qwen3-max", ("alibaba", "2025-26-late", "2025-09")),
    (r"^qwen3-next", ("alibaba", "2025-26-late", "2025-09")),
    (r"^qwen3-vl", ("alibaba", "2025-26-late", "2025-10")),
    # --- Moonshot ---
    (r"^kimi-k2-0711", ("moonshot", "2025-26-late", "2025-07")),
    (r"^kimi-k2-0905", ("moonshot", "2025-26-late", "2025-09")),
    # --- Z.ai / Zhipu ---
    (r"^glm-4\.5", ("zhipu", "2025-26-late", "2025-07")),
    (r"^glm-4\.6", ("zhipu", "2025-26-late", "2025-09")),
    # --- Microsoft ---
    (r"^mai-1-preview", ("microsoft", "2025-26-late", "2025-08")),
    # --- other newcomers ---
    (r"^longcat-flash-chat", ("meituan", "2025-26-late", "2025-09")),
    (r"^step-3", ("stepfun", "2025-26-late", "2025-07")),
    (r"^ling-flash-2\.0|^ring-flash-2\.0", ("inclusionai", "2025-26-late", "2025-09")),
]

# GRADTEX / AITA generator id -> (provider, era, release month). These sets
# carry a flat generator string rather than an Arena-style model id.
GENERATORS = {
    # GRADTEX (Feb-May 2026 releases)
    "claude-sonnet-4.6": ("anthropic", "2026-mid", "2026-02"),
    "gpt-5.4-mini": ("openai", "2026-mid", "2026-03"),
    "gemini-3.5-flash": ("google", "2026-mid", "2026-05"),
    "gemma-4-31b-it": ("google", "2026-mid", "2026-04"),
    "gemma-4-e4b-it": ("google", "2026-mid", "2026-04"),
    "qwen3.5-27b": ("alibaba", "2026-mid", "2026-02"),
    "mistral-small-3.2-24b-instruct": ("mistral", "2025-26", "2025-06"),  # pre-cutoff, excluded below
    # AITA (August 2026 frontier)
    "openai/gpt-5.6-luna-pro": ("openai", "2026-current", "2026-07"),
    "google/gemini-3.7-flash": ("google", "2026-current", "2026-08"),
    "x-ai/grok-4.6": ("grok", "2026-current", "2026-08"),
    "deepseek/deepseek-v4-pro": ("deepseek", "2026-current", "2026-04"),
    "qwen/qwen3.8-max": ("alibaba", "2026-current", "2026-08"),
    "z-ai/glm-5.3": ("zhipu", "2026-current", "2026-08"),
    "nvidia/nemotron-3.5-lightning": ("nvidia", "2026-current", "2026-06"),
}
# mistral-small-3.2 predates our mid-2025 cutoff, so it is not "current".
EXCLUDE_GENERATORS = {"mistral-small-3.2-24b-instruct", "gpt-3.5-turbo",
                      "davinci-003", "davinci-002"}
MODELS = [(re.compile(p), v) for p, v in MODELS]


def classify(mid: str):
    for rx, v in MODELS:
        if rx.match(mid):
            return v
    return None


def sha(t: str) -> str:
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


def norm_sha(t: str) -> str:
    return hashlib.sha256(re.sub(r"\s+", " ", t).strip().lower().encode("utf-8")).hexdigest()


def parse_conv(s: str):
    """arena-expert stores conversations as a numpy-array repr string."""
    t = s.replace("array([", "[").replace("],\n       dtype=object)", "]").replace("], dtype=object)", "]")
    t = re.sub(r"\}\s*\n\s*\{", "}, {", t)
    t = re.sub(r"\}\s*\n\s*\]", "}]", t)
    return ast.literal_eval(t)


def assistant_turns(conv):
    out = []
    for turn in conv:
        if turn.get("role") != "assistant":
            continue
        parts = turn.get("content") or []
        s = "\n".join(
            p["text"] for p in parts
            if isinstance(p, dict) and p.get("type") == "text" and p.get("text")
        )
        if s.strip():
            out.append(s)
    return out


def acceptable(t: str) -> bool:
    w = len(t.split())
    if w < MIN_W or w > MAX_W:
        return False
    if not t:
        return False
    if sum(1 for ch in t if ord(ch) < 128) / len(t) < 0.97:
        return False          # English / mostly-ASCII proxy
    if len(re.findall(r"[A-Za-z]", t)) / len(t) < 0.55:
        return False          # reject tables / maths / symbol dumps
    fenced = sum(len(m) for m in re.findall(r"```.*?```", t, re.S))
    if fenced / len(t) > 0.20:
        return False          # reject code-dominated answers
    return True


def main() -> None:
    rng = random.Random(SEED)

    # ---- quarantine ----
    q_raw, q_norm = set(), set()
    with open(QUARANTINE) as f:
        for d in json.load(f):
            t = d.get("text") or ""
            q_raw.add(sha(t))
            q_norm.add(norm_sha(t))
    corpus_sha = set()
    if os.path.exists(CORPUS):
        with open(CORPUS) as f:
            for line in f:
                corpus_sha.add(json.loads(line)["sha256"])
    print(f"quarantine: {len(q_raw)} test samples, {len(corpus_sha)} corpus rows", flush=True)

    rows, seen = [], set()
    dropped = {"quarantine": 0, "corpus": 0, "dupe": 0, "filtered": 0}

    def add(provider, era, model, release, text, source, register, licence, genre):
        h = sha(text)
        if h in q_raw or norm_sha(text) in q_norm:
            dropped["quarantine"] += 1
            return False
        if h in corpus_sha:
            dropped["corpus"] += 1
            return False
        if h in seen:
            dropped["dupe"] += 1
            return False
        if not acceptable(text):
            dropped["filtered"] += 1
            return False
        seen.add(h)
        rows.append({
            "id": f"{provider}-{era}-{h[:10]}",
            "provider": provider,
            "era": era,
            "model": model,
            "side": "ai",
            "genre": genre,
            "source": source,
            "register": register,
            "model_release": release,
            "licence": licence,
            "words": len(text.split()),
            "sha256": h,
            "text": text,
        })
        return True

    # ---- S1: arena-expert-5k ----
    pools: dict[str, list] = {}
    df = pd.read_parquet(os.path.join(RAW, "arena-expert-5k.parquet"))
    for _, r in df.iterrows():
        for side in ("a", "b"):
            mid = r[f"model_{side}"]
            pe = classify(mid)
            if pe is None:
                continue
            try:
                conv = parse_conv(r[f"conversation_{side}"])
            except Exception:
                continue
            for t in assistant_turns(conv):
                pools.setdefault(pe[0], []).append((mid, pe, t))
    for provider, pool in sorted(pools.items()):
        rng.shuffle(pool)
        kept = 0
        for mid, pe, t in pool:
            if kept >= CAP_PER_PROVIDER:
                break
            if add(provider, pe[1], mid, pe[2], t, "lmarena-ai/arena-expert-5k",
                   "chat-reply", "prompts CC-BY-4.0; outputs under provider ToU", None):
                kept += 1
        print(f"arena-expert  {provider:12s} pool={len(pool):5d} kept={kept}", flush=True)

    # ---- S2: TeichAI Claude 4.6 ----
    for fname, model, release in (
        ("teichai-claude-opus-4.6-887x.jsonl", "claude-opus-4.6", "2026-02"),
        ("teichai-claude-sonnet-4.6-1100x.jsonl", "claude-sonnet-4.6", "2026-02"),
    ):
        path = os.path.join(RAW, fname)
        pool = []
        with open(path) as f:
            for line in f:
                d = json.loads(line)
                for m in d.get("messages", []):
                    if m.get("role") == "assistant" and m.get("content"):
                        pool.append(m["content"])
        rng.shuffle(pool)
        kept = 0
        for t in pool:
            if kept >= 150:
                break
            if add("anthropic", "2026-mid", model, release, t,
                   f"TeichAI/{model}", "chat-reply", "apache-2.0", None):
                kept += 1
        print(f"teichai       {model:20s} pool={len(pool):5d} kept={kept}", flush=True)

    # ---- S3: GRADTEX (MGT only) ----
    g = pd.read_parquet(os.path.join(RAW, "gradtex-test.parquet"))
    g = g[g["multiclass_label"].astype(str) == "MGT"]
    pools = {}
    for _, r in g.iterrows():
        gm = str(r["generator_model"])
        if gm in EXCLUDE_GENERATORS or gm not in GENERATORS:
            continue
        pools.setdefault(gm, []).append((r["text"], str(r["domain"])))
    for gm, pool in sorted(pools.items()):
        prov, era, rel = GENERATORS[gm]
        rng.shuffle(pool)
        kept = 0
        for t, domain in pool:
            if kept >= 150:
                break
            if add(prov, era, gm, rel, t, "elisabeth-pl-pl/GRADTEX",
                   "article-prose", "cc-by-4.0", domain):
                kept += 1
        print(f"gradtex       {gm:32s} pool={len(pool):5d} kept={kept}", flush=True)

    # ---- S4: mild-rgb AITA (ai rows only) ----
    pools = {}
    with open(os.path.join(RAW, "mildrgb-aita-dataset.jsonl")) as f:
        for line in f:
            d = json.loads(line)
            if d.get("label") != "ai" or not d.get("text"):
                continue
            pools.setdefault(d["generator"], []).append(d["text"])
    for gm, pool in sorted(pools.items()):
        if gm not in GENERATORS:
            continue
        prov, era, rel = GENERATORS[gm]
        rng.shuffle(pool)
        kept = 0
        for t in pool:
            if kept >= 150:
                break
            if add(prov, era, gm, rel, t, "mild-rgb/aita-human-vs-ai",
                   "forum-narrative", "apache-2.0", "aita"):
                kept += 1
        print(f"aita          {gm:32s} pool={len(pool):5d} kept={kept}", flush=True)

    with open(OUT, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"\ndropped: {dropped}")
    print(f"wrote {len(rows)} rows -> {OUT}")


if __name__ == "__main__":
    main()
