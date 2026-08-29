"""SECONDARY PROBE - EQ-Bench longform creative-writing reports.

WHY SEPARATE: eqbench.com / github.com/EQ-bench publishes no licence for its
result files. We therefore do NOT redistribute the text: this script fetches
the reports at run time into a scratch directory outside the repository,
scores them, and keeps only the scores. Nothing here is committed except the
script itself, so the probe is reproducible without republishing the corpus.

REGISTER WARNING: EQ-Bench longform is LITERARY FICTION written to a chapter
plan (~1,000-word chapters). It is article-LENGTH but not article-KIND, and
it is certainly not marketing or SEO copy. Read the numbers as "long-form
narrative prose", nothing wider.
"""
from __future__ import annotations

import html
import json
import os
import re
import sys
import urllib.request

BASE = ("https://raw.githubusercontent.com/EQ-bench/EQ-bench-site/main/"
        "results/creative-writing-longform/{}_longform_report.html")
SCRATCH = os.environ.get("PROBE_DIR", "/tmp/eqbench-probe")

# report basename -> (provider, era, model id, release month)
MODELS = {
    # OpenAI
    "gpt-5-2025-08-07": ("openai", "2025-26-late", "gpt-5-2025-08-07", "2025-08"),
    "gpt-5.2": ("openai", "2026-mid", "gpt-5.2", "2025-12"),
    "gpt-5.4": ("openai", "2026-mid", "gpt-5.4", "2026-03"),
    "gpt-5.5": ("openai", "2026-mid", "gpt-5.5", "2026-04"),
    "gpt-5.6-sol": ("openai", "2026-current", "gpt-5.6-sol", "2026-07"),
    "gpt-5.6-terra": ("openai", "2026-current", "gpt-5.6-terra", "2026-07"),
    # Anthropic
    "claude-opus-4-5-20251101": ("anthropic", "2026-mid", "claude-opus-4.5", "2025-11"),
    "claude-opus-4-6": ("anthropic", "2026-mid", "claude-opus-4.6", "2026-02"),
    "claude-opus-4-8": ("anthropic", "2026-mid", "claude-opus-4.8", "2026-05"),
    "claude-sonnet-5": ("anthropic", "2026-current", "claude-sonnet-5", "2026-06"),
    "claude-opus-5": ("anthropic", "2026-current", "claude-opus-5", "2026-07"),
    "claude-fable-5": ("anthropic", "2026-current", "claude-fable-5", "2026-06"),
    # Google
    "gemini-3-pro-preview": ("google", "2026-mid", "gemini-3-pro-preview", "2025-12"),
    "gemini-3.1-pro-preview": ("google", "2026-mid", "gemini-3.1-pro-preview", "2026-02"),
    "gemini-3.5-flash": ("google", "2026-current", "gemini-3.5-flash", "2026-05"),
    # xAI
    "grok-4.1-fast": ("grok", "2026-mid", "grok-4.1-fast", "2025-11"),
    "grok-4.20-beta": ("grok", "2026-current", "grok-4.20-beta", "2026-03"),
    # DeepSeek
    "deepseek-ai__DeepSeek-V3.2": ("deepseek", "2026-mid", "deepseek-v3.2", "2025-12"),
    "deepseek-ai__DeepSeek-V4-Pro": ("deepseek", "2026-current", "deepseek-v4-pro", "2026-04"),
    "deepseek-ai__DeepSeek-V4-Flash-0731": ("deepseek", "2026-current", "deepseek-v4-flash-0731", "2026-07"),
    # Mistral
    "mistralai__Mistral-Large-3-675B-Instruct-2512": ("mistral", "2026-mid", "mistral-large-3-2512", "2025-12"),
    "mistralai__Ministral-3-14B-Instruct-2512": ("mistral", "2026-mid", "ministral-3-14b-2512", "2025-12"),
    "mistralai__Mistral-Small-4-119B-2603": ("mistral", "2026-current", "mistral-small-4-2603", "2026-03"),
    "mistral-medium-3.1": ("mistral", "2025-26-late", "mistral-medium-3.1", "2025-08"),
    # Meta - NOTHING newer than Llama 4 exists; kept as the honest ceiling.
    "meta-llama__llama-4-maverick": ("meta", "2025-26", "llama-4-maverick", "2025-04"),
    # newcomers
    "moonshotai__Kimi-K2.6": ("moonshot", "2026-current", "kimi-k2.6", "2026-06"),
    "kimi-k3": ("moonshot", "2026-current", "kimi-k3", "2026-07"),
    "zai-org__GLM-5": ("zhipu", "2026-mid", "glm-5", "2026-03"),
    "GLM-5.3": ("zhipu", "2026-current", "glm-5.3", "2026-08"),
    "Qwen__Qwen3.5-397B-A17B": ("alibaba", "2026-mid", "qwen3.5-397b-a17b", "2026-02"),
    "Qwen__Qwen3.8-27B": ("alibaba", "2026-current", "qwen3.8-27b", "2026-08"),
    "minimax__minimax-m2.5": ("minimax", "2026-current", "minimax-m2.5", "2026-05"),
}

MIN_W, MAX_W, CAP = 120, 1200, 45


def clean(b: str) -> str:
    b = re.sub(r"<br\s*/?>", "\n", b)
    b = re.sub(r"<[^>]+>", "", b)
    b = html.unescape(b).strip()
    return re.sub(r"^Model Output:\s*", "", b)


def main() -> None:
    os.makedirs(SCRATCH, exist_ok=True)
    out = []
    for name, (prov, era, mid, rel) in MODELS.items():
        path = os.path.join(SCRATCH, name.replace("/", "_") + ".html")
        if not os.path.exists(path):
            try:
                with urllib.request.urlopen(BASE.format(name), timeout=180) as r:
                    open(path, "wb").write(r.read())
            except Exception as e:
                print(f"SKIP {name}: {e}", flush=True)
                continue
        t = open(path, encoding="utf-8", errors="replace").read()
        blocks = [clean(b) for b in re.findall(r'<div class="response-content">(.*?)</div>', t, re.S)]
        kept = 0
        for i, b in enumerate(blocks):
            if kept >= CAP:
                break
            w = len(b.split())
            if w < MIN_W or w > MAX_W:
                continue
            if not b or sum(1 for c in b if ord(c) < 128) / len(b) < 0.97:
                continue
            out.append({"id": f"probe-{mid}-{i}", "provider": prov, "era": era,
                        "model": mid, "side": "ai", "genre": "longform-fiction",
                        "register": "article-prose-fiction", "model_release": rel,
                        "source": "EQ-bench/EQ-bench-site creative-writing-longform",
                        "licence": "NONE STATED - probe only, text not redistributed",
                        "words": w, "text": b})
            kept += 1
        print(f"{name:46s} blocks={len(blocks):4d} kept={kept}", flush=True)
    dst = os.path.join(SCRATCH, "prose-probe.jsonl")
    with open(dst, "w") as f:
        for r in out:
            f.write(json.dumps(r) + "\n")
    print(f"wrote {len(out)} -> {dst}")


if __name__ == "__main__":
    main()
