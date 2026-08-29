"""Split generated.jsonl into browsable per-provider / per-model / per-register
files and write INDEX.md.

  samples/<provider>/<provider>__<model-id>__<register-family>__2026-08-28.jsonl

Model ids in filenames are sanitised (lowercase, dots and slashes to hyphens);
every row still carries the exact unsanitised id in `model_requested`.
The combined generated.jsonl stays as the input to the scoring pipeline.
"""

from __future__ import annotations

import collections
import json
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, "samples")
DATE = "2026-08-28"

FAMILY = {
    "company-blog": "article",
    "news-piece": "article",
    "thought-leadership": "article",
    "howto-explainer": "article",
    "seo-service-page": "marketing-seo",
    "landing-page": "marketing-seo",
    "category-page": "marketing-seo",
    "product-description": "marketing-seo",
    "social-linkedin": "social-post",
    "social-x-thread": "social-post",
    "social-facebook": "social-post",
    "social-instagram": "social-post",
    "academic-essay": "academic",
    "academic-lit-review": "academic",
    "academic-discussion": "academic",
    "press-release": "other-shared",
    "newsletter": "other-shared",
    "case-study": "other-shared",
    "faq-page": "other-shared",
}


def sanitise(model_id: str) -> str:
    s = model_id.lower()
    s = s.split("/", 1)[-1] if "/" in s else s
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def main():
    rows = []
    for line in open(os.path.join(HERE, "generated.jsonl")):
        d = json.loads(line)
        if d.get("__error__") or not d.get("text") or not d.get("usable", True):
            continue
        rows.append(d)

    if os.path.isdir(SAMPLES):
        shutil.rmtree(SAMPLES)

    buckets: dict[tuple[str, str, str], list[dict]] = collections.defaultdict(list)
    for d in rows:
        fam = FAMILY.get(d.get("register") or d.get("genre"), "other-shared")
        d["register_family"] = fam
        buckets[(d["provider"], d["model_requested"], fam)].append(d)

    index = []
    for (prov, model, fam), items in sorted(buckets.items()):
        d = os.path.join(SAMPLES, prov)
        os.makedirs(d, exist_ok=True)
        fname = f"{prov}__{sanitise(model)}__{fam}__{DATE}.jsonl"
        path = os.path.join(d, fname)
        items.sort(key=lambda r: (r["register"], r["prompt_style"], r["id"]))
        with open(path, "w") as f:
            for r in items:
                f.write(json.dumps(r) + "\n")
        styles = collections.Counter(r["prompt_style"] for r in items)
        regs = collections.Counter(r["register"] for r in items)
        index.append({
            "file": os.path.relpath(path, HERE),
            "provider": prov,
            "model_exact": model,
            "register_family": fam,
            "tier": items[0].get("tier"),
            "registers": dict(regs),
            "prompt_styles": dict(styles),
            "n": len(items),
            "words": sum(r["words"] for r in items),
            "date": DATE,
        })

    with open(os.path.join(HERE, "index.json"), "w") as f:
        json.dump(index, f, indent=1)

    total_n = sum(i["n"] for i in index)
    total_w = sum(i["words"] for i in index)
    lines = [
        "# Generated corpus - file inventory",
        "",
        f"Generated {DATE} via OpenRouter. **{total_n:,} samples**, "
        f"**{total_w:,} words**, {len(index)} files, "
        f"{len({i['model_exact'] for i in index})} models, "
        f"{len({i['provider'] for i in index})} providers.",
        "",
        "Every row carries the exact unsanitised OpenRouter model id in "
        "`model_requested`; filenames use a sanitised form. `generated.jsonl` "
        "in this directory is the combined file the scoring pipeline reads.",
        "",
        "Register families: `article` (blog, news, how-to, thought-leadership), "
        "`marketing-seo` (service pages, landing pages, category pages, product "
        "descriptions), `social-post` (LinkedIn, X threads, Facebook, "
        "Instagram), `academic` (essays, literature reviews, discussion "
        "sections), `other-shared` (press releases, newsletters, case studies, "
        "FAQ pages).",
        "",
        "| File | Provider | Exact model id | Tier | Register family | Prompt styles (plain / house-brief / human-voice) | Samples | Words | Date |",
        "|---|---|---|---|---|---|---:|---:|---|",
    ]
    for i in sorted(index, key=lambda x: (x["provider"], x["model_exact"], x["register_family"])):
        s = i["prompt_styles"]
        st = f"{s.get('plain',0)} / {s.get('house-brief',0)} / {s.get('human-voice',0)}"
        lines.append(
            f"| `{i['file']}` | {i['provider']} | `{i['model_exact']}` | "
            f"{i['tier']} | {i['register_family']} | {st} | {i['n']} | "
            f"{i['words']:,} | {i['date']} |"
        )

    lines += ["", "## Totals by model", "",
              "| Exact model id | Provider | Tier | Samples | Words | Files |",
              "|---|---|---|---:|---:|---:|"]
    bym = collections.defaultdict(lambda: [0, 0, 0, "", ""])
    for i in index:
        a = bym[i["model_exact"]]
        a[0] += i["n"]; a[1] += i["words"]; a[2] += 1
        a[3] = i["provider"]; a[4] = i["tier"]
    for m, (n, w, fc, prov, tr) in sorted(bym.items()):
        lines.append(f"| `{m}` | {prov} | {tr} | {n} | {w:,} | {fc} |")

    lines += ["", "## Totals by register", "",
              "| Register | Family | Samples | Words | Mean words |",
              "|---|---|---:|---:|---:|"]
    byr = collections.defaultdict(lambda: [0, 0])
    for d in rows:
        a = byr[d["register"]]; a[0] += 1; a[1] += d["words"]
    for r, (n, w) in sorted(byr.items()):
        lines.append(f"| {r} | {FAMILY.get(r,'other-shared')} | {n} | {w:,} | {w//n} |")

    lines += ["", "## Totals by prompt style", "",
              "| Prompt style | Samples | Words | Mean words |", "|---|---:|---:|---:|"]
    bys = collections.defaultdict(lambda: [0, 0])
    for d in rows:
        a = bys[d["prompt_style"]]; a[0] += 1; a[1] += d["words"]
    for s_, (n, w) in sorted(bys.items()):
        lines.append(f"| {s_} | {n} | {w:,} | {w//n} |")
    lines.append("")

    with open(os.path.join(HERE, "INDEX.md"), "w") as f:
        f.write("\n".join(lines))
    print(f"{len(index)} files, {total_n} samples, {total_w} words -> samples/ + INDEX.md")


if __name__ == "__main__":
    main()
