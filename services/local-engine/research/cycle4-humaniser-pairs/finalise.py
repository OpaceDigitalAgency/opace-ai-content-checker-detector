#!/usr/bin/env python3
"""Assemble the split files, the manifest and the count tables.

Untouched sources keep `ai_original` / `human_original` and travel in the same
split as their own variants, so a source is never seen in training while one of
its rewrites is scored in test. That is the leakage this corpus exists to avoid:
a light edit in train and its heavy rewrite in test would let a model score well
by recognising the source rather than the transformation.
"""
import collections
import hashlib
import json
import os
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
SPLITS = ("train", "heldout_source", "heldout_rewriter", "heldout_register")


def load(p):
    if not os.path.exists(p):
        return []
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]


def sha_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def table(title, rows, key, extra=()):
    print(f"\n### {title}")
    c = collections.Counter(r[key] for r in rows)
    cost = collections.defaultdict(float)
    for r in rows:
        cost[r[key]] += float(r.get("cost_usd") or 0.0)
    w = max([len(str(k)) for k in c] + [len(key)]) + 2
    print(f"{key:<{w}}{'rows':>8}{'cost USD':>12}")
    for k, v in sorted(c.items(), key=lambda x: -x[1]):
        print(f"{str(k):<{w}}{v:>8}{cost[k]:>12.4f}")
    print(f"{'TOTAL':<{w}}{len(rows):>8}{sum(cost.values()):>12.4f}")


def main():
    sources = load(os.path.join(HERE, "sources.jsonl"))
    pairs = load(os.path.join(HERE, "pairs.jsonl"))
    quar = load(os.path.join(HERE, "quarantine.jsonl"))
    src = {s["source_id"]: s for s in sources}

    # untouched source rows, in the corpus schema
    used = {p["source_id"] for p in pairs}
    src_rows = []
    for s in sources:
        if s["source_id"] not in used:
            continue                     # every variant failed: no anchor to keep
        src_rows.append({
            "variant_id": s["source_id"] + "::source",
            "source_id": s["source_id"], "lineage_id": s["lineage_id"],
            "split": s["split"], "class_label": s["class_label"],
            "edit_intensity": "none", "transformation_family": None,
            "transformation_tool": None, "commercial_humaniser": False,
            "source_text": None, "output_text": s["text"],
            "source_side": s["side"], "generating_model": s["origin_model"],
            "generating_provider": s["origin_provider"],
            "generating_prompt_style": s["origin_prompt_style"],
            "source_corpus": s["origin_corpus"],
            "source_row_id": s["origin_row_id"],
            "source_date": s["origin_date"], "source_licence": s["origin_licence"],
            "measurement_overlap": s["measurement_overlap"],
            "measurement_overlap_note": s["measurement_overlap_note"],
            "rewriting_model": None, "rewriting_model_family": None,
            "rewriting_prompt": None, "rewriting_settings": None,
            "register": s["register"], "length_band": s["band"],
            "source_word_count": s["word_count"],
            "output_word_count": s["word_count"],
            "cut_on": s.get("cut_on"), "cost_usd": 0.0,
            "corpus_seed": s["corpus_seed"],
            "reserved_rewriter_for_source": s["rewriter_model"],
        })

    allrows = src_rows + pairs

    # ---- integrity gates that must hold before anything is written
    fail = []
    lin = collections.defaultdict(set)
    for r in allrows:
        lin[r["lineage_id"]].add(r["split"])
    for k, v in lin.items():
        if len(v) > 1:
            fail.append(f"lineage {k} spans splits {sorted(v)}")
    for r in pairs:
        s = src.get(r["source_id"])
        if not s or r["split"] != s["split"]:
            fail.append(f"{r['variant_id']} split does not match its source")
    fams = collections.defaultdict(set)
    regs = collections.defaultdict(set)
    for r in pairs:
        fams[r["rewriting_model_family"]].add(r["split"])
        regs[r["register"]].add(r["split"])
    if "train" in fams.get("mistral", set()):
        fail.append("held-out rewriting family in train")
    if "train" in regs.get("technical-explainer", set()):
        fail.append("held-out register in train")
    if fail:
        print("REFUSING TO WRITE SPLITS:")
        for f in fail:
            print("  ", f)
        raise SystemExit(1)

    # ---- write splits
    written = {}
    for sp in SPLITS:
        rows = [r for r in allrows if r["split"] == sp]
        p = os.path.join(HERE, f"corpus-{sp}.jsonl")
        with open(p, "w", encoding="utf-8") as fh:
            for r in sorted(rows, key=lambda x: (x["lineage_id"],
                                                 x["edit_intensity"])):
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        written[sp] = (len(rows), p)

    # ---- report
    print("=" * 74)
    print("cycle4-humaniser-pairs")
    print("=" * 74)
    print(f"sources selected      {len(sources)}")
    print(f"sources with >=1 kept variant {len(used)}")
    print(f"paired variants kept  {len(pairs)}")
    print(f"quarantined           {len(quar)}")
    print(f"total corpus rows     {len(allrows)}")
    spend = sum(float(r.get("cost_usd") or 0) for r in pairs) + \
        sum(float(r.get("cost_usd") or 0) for r in quar)
    # Authoritative total: every billed call, including the two pilots and the
    # rows later superseded by a harness fix. The row-level figure above only
    # covers calls whose output survived into the corpus.
    logged = load(os.path.join(HERE, "spend-log.jsonl"))
    billed = sum(float(r.get("cost_usd") or 0) for r in logged)
    print(f"spend on rows kept    ${spend:.4f}")
    print(f"TOTAL BILLED          ${billed:.4f}  over {len(logged)} API calls "
          f"(includes both pilots and retried harness failures)")

    table("by class label", allrows, "class_label")
    table("by edit intensity", allrows, "edit_intensity")
    table("by split", allrows, "split")
    table("by register", allrows, "register")
    table("by length band", allrows, "length_band")
    table("by rewriting model", pairs, "rewriting_model")
    table("by rewriting family", pairs, "rewriting_model_family")
    table("by generating model", allrows, "generating_model")
    table("by source corpus", allrows, "source_corpus")
    table("by source provider", allrows, "generating_provider")
    if quar:
        table("quarantine reasons", quar, "quarantine_reason")

    print("\n### split x class")
    cc = collections.Counter((r["split"], r["class_label"]) for r in allrows)
    labs = sorted({r["class_label"] for r in allrows})
    print(f"{'split':<20}" + "".join(f"{l[:26]:>30}" for l in labs))
    for sp in SPLITS:
        print(f"{sp:<20}" + "".join(f"{cc[(sp,l)]:>30}" for l in labs))

    print("\n### protected-span damage by intensity "
          "(share of variants where a protected span was lost or added)")
    by = collections.defaultdict(list)
    for r in pairs:
        by[r["edit_intensity"]].append(r)
    print(f"{'intensity':<10}{'n':>7}{'any':>10}{'numbers':>10}{'names':>10}"
          f"{'quotes':>10}{'urls':>8}{'citations':>11}")
    for i in ("light", "medium", "heavy"):
        rs = by.get(i, [])
        n = len(rs) or 1
        def pc(k):
            return 100.0 * sum(1 for r in rs
                               if r.get("protected_spans", {})
                               .get(k, {}).get("changed")) / n
        anyc = 100.0 * sum(1 for r in rs if r.get("protected_span_changed")) / n
        print(f"{i:<10}{len(rs):>7}{anyc:>9.1f}%{pc('numbers'):>9.1f}%"
              f"{pc('names'):>9.1f}%{pc('quotations'):>9.1f}%"
              f"{pc('urls'):>7.1f}%{pc('citations'):>10.1f}%")

    print("\n### transformation distance by intensity (median)")
    for m in ("four_gram_retention", "word_levenshtein_ratio",
              "lexical_cosine_tfidf", "sentence_order_preservation"):
        line = f"{m:<32}"
        for i in ("light", "medium", "heavy"):
            v = [r.get(m) for r in by.get(i, []) if r.get(m) is not None]
            line += f"{statistics.median(v) if v else float('nan'):>12.4f}"
        print(line + "     (light / medium / heavy)")

    # ---- manifest
    files = {}
    for name in ["sources.jsonl", "pairs.jsonl", "quarantine.jsonl",
                 "pilot.jsonl", "pilot2.jsonl", "spend-log.jsonl"] + \
            [f"corpus-{s}.jsonl" for s in SPLITS]:
        p = os.path.join(HERE, name)
        if os.path.exists(p):
            files[name] = {"rows": sum(1 for _ in open(p, encoding="utf-8")),
                           "bytes": os.path.getsize(p),
                           "sha256": sha_file(p)}
    manifest = {
        "corpus": "cycle4-humaniser-pairs",
        "purpose": "paired transformations for HANDOVER.md section 9 item 3: "
                   "AI rewrites of a human original, detected 30-35 percent, "
                   "with no training data anywhere in the project",
        "built": "2026-08-30",
        "seed": 20260830,
        "sources": len(sources),
        "paired_variants": len(pairs),
        "quarantined": len(quar),
        "total_rows": len(allrows),
        "openrouter_spend_usd_rows_kept": round(spend, 6),
        "openrouter_spend_usd_total_billed": round(billed, 6),
        "openrouter_api_calls": len(logged),
        "class_labels": sorted({r["class_label"] for r in allrows}),
        "edit_intensities": ["none", "light", "medium", "heavy"],
        "splits": {k: v[0] for k, v in written.items()},
        "held_out_rewriting_family": "mistral (mistralai/mistral-medium-3-5)",
        "held_out_register": "technical-explainer",
        "training_rewriting_models": sorted(
            {r["rewriting_model"] for r in pairs
             if r["rewriting_model_family"] != "mistral"}),
        "rewriting_families_never_used": [
            "anthropic", "qwen", "x-ai", "z-ai", "moonshotai"],
        "similarity_metric": "lexical only (tf-cosine, n-gram retention, word "
                             "edit distance). No embedding model was available "
                             "offline; nothing here is labelled semantic "
                             "similarity.",
        "not_done_deliberately": [
            "no training, no threshold change, no deployment, no publication",
            "no detector scoring: that needs the segmented harness and would "
            "otherwise produce a figure with no stated runtime",
            "no commercial humaniser was used, so no row may carry one",
            "no row is labelled ai_original_human_edited: an LLM rewriting "
            "prose is not a professional human edit",
        ],
        "files": files,
    }
    mp = os.path.join(HERE, "manifest.json")
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    print(f"\nmanifest -> {mp}")
    for sp, (n, p) in written.items():
        print(f"  corpus-{sp}.jsonl  {n} rows")


if __name__ == "__main__":
    main()
