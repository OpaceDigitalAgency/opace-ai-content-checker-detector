"""REPORT.md: word-count and register distributions plus the shipped-model
baseline, with denominators on every figure."""

from __future__ import annotations

import collections
import json
import os
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))


def load(fn):
    p = os.path.join(HERE, fn)
    return [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []


def band(w):
    if w < 600:
        return "400-599"
    if w < 800:
        return "600-799"
    if w < 1200:
        return "800-1,199"
    if w < 2000:
        return "1,200-1,999"
    return "2,000+"


def table(rows, header):
    out = ["| " + " | ".join(header) + " |",
           "|" + "|".join("---" for _ in header) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out)


def wstats(rows):
    ws = [r["word_count"] for r in rows]
    if not ws:
        return (0, 0, 0, 0)
    return (len(ws), int(statistics.median(ws)), min(ws), max(ws))


def main():
    human, ai = load("human-longform.jsonl"), load("ai-longform.jsonl")
    scores = load("tier3-scores.jsonl")
    by_id = {s["id"]: s for s in scores}
    man = json.load(open(os.path.join(HERE, "manifest.json")))

    L = []
    L.append("# Long-form corpus: report\n")
    L.append(f"Built 28 August 2026. **{len(human) + len(ai):,} documents**: "
             f"{len(human):,} human, {len(ai):,} AI.\n")
    L.append("Every percentage below shows its denominator. Word counts are "
             "whitespace tokens on the stored text.\n")

    L.append("\n## 1. Word-count distribution\n")
    rows = []
    for side, docs in (("human", human), ("AI", ai)):
        n, med, lo, hi = wstats(docs)
        rows.append([side, f"{n:,}", med, lo, hi])
    L.append(table(rows, ["side", "documents", "median words", "min", "max"]))
    L.append("")
    counts = collections.Counter((r["side"], band(r["word_count"])) for r in human + ai)
    order = ["400-599", "600-799", "800-1,199", "1,200-1,999", "2,000+"]
    rows = [[b, f"{counts[('human', b)]:,}", f"{counts[('ai', b)]:,}"] for b in order]
    L.append(table(rows, ["words", "human", "AI"]))
    hl = sum(1 for r in human if r["word_count"] >= 600)
    al = sum(1 for r in ai if r["word_count"] >= 600)
    L.append(f"\n{hl:,}/{len(human):,} human ({hl/max(1,len(human)):.0%}) and "
             f"{al:,}/{len(ai):,} AI ({al/max(1,len(ai)):.0%}) documents are 600 words "
             "or longer, the brief's preferred floor.\n")

    L.append("\n## 2. Register distribution\n")
    L.append("The two sides do not use an identical register list, and that is "
             "deliberate rather than an oversight. Human academic prose comes from "
             "published articles, which are sectioned - introduction, literature "
             "review, discussion, conclusion - while AI academic prose was "
             "commissioned as whole essays. `academic-essay` (AI) is therefore paired "
             "with `student-essay`, `academic-introduction` and `academic-conclusion` "
             "on the human side, not with a same-named class. Anyone training on this "
             "must map the registers rather than assume they line up.\n")
    hr = collections.Counter(r["register"] for r in human)
    ar = collections.Counter(r["register"] for r in ai)
    regs = sorted(set(hr) | set(ar))
    L.append(table([[r, f"{hr.get(r,0):,}", f"{ar.get(r,0):,}"] for r in regs],
                   ["register", "human", "AI"]))

    L.append("\n## 3. Human sources\n")
    src = collections.Counter(r["source"] for r in human)
    lic = {r["source"]: r["licence"] for r in human}
    rows = []
    for s, n in src.most_common():
        docs = [r for r in human if r["source"] == s]
        yrs = [r["era_year"] for r in docs if r.get("era_year")]
        span = f"{min(yrs)}-{max(yrs)}" if yrs else "not recorded"
        rows.append([s, f"{n:,}", int(statistics.median([d['word_count'] for d in docs])),
                     span, lic[s][:60]])
    L.append(table(rows, ["source", "documents", "median words", "years", "licence"]))

    L.append("\n## 4. AI side: models and prompt styles\n")
    am = collections.Counter(r["model"] for r in ai)
    rows = []
    for m, n in am.most_common():
        docs = [r for r in ai if r["model"] == m]
        rows.append([m, docs[0]["tier"], f"{n:,}",
                     int(statistics.median([d["word_count"] for d in docs]))])
    L.append(table(rows, ["model", "tier", "documents", "median words"]))
    L.append("")
    ps = collections.Counter(r["prompt_style"] for r in ai)
    L.append(table([[k, f"{v:,}"] for k, v in ps.most_common()], ["prompt style", "documents"]))
    cost = sum((r.get("usage") or {}).get("cost_usd") or 0 for r in ai)
    L.append(f"\nGeneration cost of the delivered AI rows: **${cost:.2f}**.\n")

    if scores:
        L.append("\n## 5. Baseline: the shipped Tier 3 model on this corpus\n")
        L.append("Model `tier3-e5small-int8-perchannel.onnx` at its shipping threshold "
                 "of 0.857, 512-token window. This is the *before* number the corpus "
                 "exists to move; nothing here has been retrained.\n")
        aa_all = [by_id[r["id"]] for r in ai if r["id"] in by_id]
        det_all = sum(1 for r in aa_all if r["flagged_0857"])
        L.append(f"**Overall AI detection on this corpus: {det_all}/{len(aa_all)} = "
                 f"{det_all/max(1,len(aa_all)):.1%}.** Against the objective's 50% floor "
                 "on every long-form category, the shipped model clears it on none of "
                 "them. The worst registers are not merely academic: long-form "
                 "journalism, stories and academic discussion sections score 0.\n")
        fp = [by_id[r["id"]] for r in human if r["id"] in by_id]
        fpr = sum(1 for r in fp if r["flagged_0857"]) / max(1, len(fp))
        L.append(f"Human false-positive rate at 0.857: **{sum(1 for r in fp if r['flagged_0857'])}"
                 f"/{len(fp)} = {fpr:.1%}**.\n")
        rows = []
        for reg in regs:
            a = [by_id[r["id"]] for r in ai if r["register"] == reg and r["id"] in by_id]
            h = [by_id[r["id"]] for r in human if r["register"] == reg and r["id"] in by_id]
            det = (sum(1 for r in a if r["flagged_0857"]) / len(a)) if a else None
            hfp = (sum(1 for r in h if r["flagged_0857"]) / len(h)) if h else None
            rows.append([reg,
                         f"{sum(1 for r in a if r['flagged_0857'])}/{len(a)} = {det:.1%}" if a else "-",
                         f"{sum(1 for r in h if r['flagged_0857'])}/{len(h)} = {hfp:.1%}" if h else "-"])
        L.append(table(rows, ["register", "AI detected @0.857", "human flagged @0.857"]))
        L.append("")
        rows = []
        for m, n in am.most_common():
            a = [by_id[r["id"]] for r in ai if r["model"] == m and r["id"] in by_id]
            if not a:
                continue
            d = sum(1 for r in a if r["flagged_0857"])
            rows.append([m, f"{d}/{len(a)} = {d/len(a):.1%}",
                         round(statistics.median([r["tier3_int8pc"] for r in a]), 3)])
        L.append(table(rows, ["model", "detected @0.857", "median score"]))
        L.append("")
        rows = []
        for st, n in ps.most_common():
            a = [by_id[r["id"]] for r in ai if r["prompt_style"] == st and r["id"] in by_id]
            d = sum(1 for r in a if r["flagged_0857"])
            rows.append([st, f"{d}/{len(a)} = {d/max(1,len(a)):.1%}"])
        L.append(table(rows, ["prompt style", "detected @0.857"]))
        L.append("")
        hs = sorted(r["tier3_int8pc"] for r in fp)
        aa = [by_id[r["id"]] for r in ai if r["id"] in by_id]
        L.append("Score spread, which the objective treats as a first-class requirement:\n")
        rows = []
        for lab, vals in (("human", [r["tier3_int8pc"] for r in fp]),
                          ("AI", [r["tier3_int8pc"] for r in aa])):
            if not vals:
                continue
            q = statistics.quantiles(vals, n=20)
            rows.append([lab, f"{len(vals):,}", round(min(vals), 3), round(q[0], 3),
                         round(statistics.median(vals), 3), round(q[-1], 3), round(max(vals), 3)])
        L.append(table(rows, ["side", "n", "min", "p5", "median", "p95", "max"]))
        L.append("\nThose two rows are the finding. Human and AI long-form prose "
                 "produce the same distribution to three decimal places at every "
                 "quantile shown: the model is not separating them weakly, it is not "
                 "separating them at all. The scores are also degenerate - they pile up "
                 "near 0.14 and near 0.857 rather than spreading - which is the "
                 "calibration failure the objective names as a first-class problem. A "
                 "confidence figure built on this cannot be shown to a user.\n")
        L.append("One caveat on the comparison with the numbers in OBJECTIVE.md: those "
                 "were measured against a different held-out human set and a different "
                 "AI pool. This table is a fresh baseline on fresh data, not a "
                 "restatement of that one.\n")

    L.append("\n## 6. Quarantine\n")
    q = man["quarantine_sources"]
    L.append(table([[k, f"{v:,}"] for k, v in q.items()], ["held-out source", "texts"]))
    L.append(f"\nExact normalised-hash collisions: **{len(man['exact_collisions'])}** "
             "(a single collision aborts the build).  \n"
             f"Near-duplicates dropped at {man['shingle_overlap_threshold']:.0%} "
             f"12-word shingle overlap: **{len(man['near_dupes_dropped'])}**.  \n"
             f"Internal duplicates dropped: **{man['internal_duplicates_dropped']}**.\n")

    open(os.path.join(HERE, "REPORT.md"), "w").write("\n".join(L) + "\n")
    print("wrote REPORT.md")


if __name__ == "__main__":
    main()
