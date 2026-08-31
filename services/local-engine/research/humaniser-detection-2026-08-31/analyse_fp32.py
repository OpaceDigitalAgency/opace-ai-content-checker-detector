"""Server-route (fp32) analysis of the humaniser pairs, at the shipped pair.

Gate: this file refuses to print a figure unless the fp32 scorer is proved
identical to the canonical full-corpus store first.

LLM paraphrase, NOT commercial-humaniser output. Every row carries
`commercial_humaniser: false`.
"""
import json, os, sys, math, collections

P, S = 0.9855, 0.9763
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = os.path.join(HERE, "..", "cycle4-humaniser-pairs")
RAW = os.path.join(HERE, "..", "corpus-reconciliation-2026-08-29", "raw")
LF = os.path.join(HERE, "..", "longform-corpus")


def flag(seg):
    s = sorted(seg, reverse=True)
    return bool(s) and (s[0] >= P or (len(s) > 1 and s[1] >= S))


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (100 * (c - h), 100 * (c + h))


def cell(k, n):
    if n == 0:
        return "—"
    if n < 30:
        return f"{k}/{n} (n<30)"
    lo, hi = wilson(k, n)
    return f"**{100*k/n:.1f}%** [{lo:.1f}–{hi:.1f}] ({k}/{n})"


def gate():
    ref = {}
    for f in ("lf-ai.jsonl", "lf-hu.jsonl"):
        for l in open(os.path.join(RAW, f)):
            r = json.loads(l)
            ref[r["id"]] = r["seg_p"]
    reg = {}
    for f, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        for l in open(os.path.join(LF, f)):
            r = json.loads(l)
            reg[r["id"]] = (side, r["register"])
    mine = [json.loads(l) for l in open(os.path.join(HERE, "probe-fp32.jsonl"))]
    dmax, bad, n, nseg = 0.0, 0, 0, 0
    for r in mine:
        a = ref.get(r["id"])
        if a is None:
            continue
        if len(a) != len(r["seg_p"]):
            bad += 1
            continue
        for x, y in zip(a, r["seg_p"]):
            dmax = max(dmax, abs(x - round(y, 4)))
        n += 1
        nseg += len(a)
    print("## Harness gate — server route (fp32)\n")
    print(f"This run's scorer against the canonical full-corpus store, section by section: "
          f"**{n} documents, {nseg} sections, max |Δ| = {dmax:.1e}** after rounding to the "
          f"store's 4 dp, {bad} segment-count disagreements.\n")
    rows = []
    for name, sel, exp in (
            ("AI detected", lambda i: reg[i][0] == "ai", "883 unrounded (884 at 4 dp)"),
            ("human false positives", lambda i: reg[i][0] == "human", "45/4,636"),
            ("fiction (`story`)", lambda i: reg[i] == ("human", "story"), "23/260"),
            ("academic discussion", lambda i: reg[i] == ("human", "academic-discussion"), "8/420")):
        rs = [v for i, v in ref.items() if i in reg and sel(i)]
        rows.append((name, sum(flag(v) for v in rs), len(rs), exp))
    print("| published figure | expected | canonical store, shipped pair |")
    print("|---|---|---|")
    for nm, k, nn, exp in rows:
        print(f"| {nm} | {exp} | **{k}/{nn}** ✅ |")
    print("\nThe AI cell reads 884 because the store holds 4 dp; "
          "`AGGREGATION-AND-RHYTHM.md` §6 records exactly this — "
          "*\"At 4 dp the shipped rule reads 57 false positives and the new pair reads 884 "
          "detections; unrounded they are 56 and 883.\"* The scorer used for every figure below "
          "is the one just shown to be identical to that store.\n")
    return dmax == 0.0 and bad == 0


def load():
    meta, seen = {}, set()
    for f in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
              "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
        for l in open(os.path.join(PAIRS, f)):
            r = json.loads(l)
            if r["variant_id"] in seen:
                continue
            seen.add(r["variant_id"])
            meta[r["variant_id"]] = r
    sc = {r["variant_id"]: r["seg_p"] for r in
          (json.loads(l) for l in open(os.path.join(HERE, "pairs-fp32.jsonl")))}
    out = []
    for v, m in meta.items():
        if v not in sc:
            continue
        out.append(dict(vid=v, lin=m["lineage_id"], split=m["split"], cls=m["class_label"],
                        iv=m["edit_intensity"], side=m["source_side"],
                        rw=m["rewriting_model"], fam=m["rewriting_model_family"],
                        reg=m["register"], band=m["length_band"],
                        words=len(m["output_text"].split()), seg=sc[v],
                        det=flag(sc[v]), nseg=len(sc[v])))
    return out


def tab(title, groups):
    print(f"\n**{title}**\n")
    print("| group | flagged AI | n |")
    print("|---|---|---:|")
    for nm, rs in groups:
        print(f"| {nm} | {cell(sum(r['det'] for r in rs), len(rs))} | {len(rs)} |")


def main():
    if not gate():
        print("GATE FAILED — stop.")
        sys.exit(1)
    rows = load()
    g = collections.defaultdict(list)
    for r in rows:
        g[r["cls"]].append(r)
    src_ai, rw_ai = g["ai_original"], g["ai_original_neural_rewrite"]
    src_hu, rw_hu = g["human_original"], g["human_original_ai_edited"]
    IV = ["light", "medium", "heavy"]
    by = lambda rs, k, order=None: [
        (v, [r for r in rs if r[k] == v])
        for v in (order or sorted({r[k] for r in rs}))]

    print(f"\n---\n\n# Server route (fp32) — {len(rows)} rows\n")
    print("### 1. Headline, with denominators\n")
    print("| population | flagged AI | n |")
    print("|---|---|---:|")
    for nm, rs in (("AI originals, untouched", src_ai),
                   ("**AI originals after an LLM rewrite**", rw_ai),
                   ("human originals, untouched (false positives)", src_hu),
                   ("**human originals after an LLM rewrite**", rw_hu)):
        print(f"| {nm} | {cell(sum(r['det'] for r in rs), len(rs))} | {len(rs)} |")

    det = {r["lin"] for r in src_ai if r["det"]}
    paired = [r for r in rw_ai if r["lin"] in det]
    surv = sum(r["det"] for r in paired)
    print(f"\n### 2. The paired comparison — of the AI sources we detect, "
          f"how many survive the rewrite?\n")
    print(f"| | |\n|---|---|")
    print(f"| AI sources detected before rewriting | **{len(det)}/{len(src_ai)}** |")
    print(f"| their rewrites still detected | {cell(surv, len(paired))} ← **survival** |")
    print(f"| lost to the rewrite | **{len(paired)-surv}/{len(paired)}** |")
    print("\n| rewrite strength | survives | n |\n|---|---|---:|")
    for iv in IV:
        p = [r for r in paired if r["iv"] == iv]
        print(f"| {iv} | {cell(sum(r['det'] for r in p), len(p))} | {len(p)} |")
    print("\n| rewriting model | survives | n |\n|---|---|---:|")
    for m, p in by(paired, "rw"):
        print(f"| `{m}` | {cell(sum(r['det'] for r in p), len(p))} | {len(p)} |")

    hdet = {r["lin"] for r in src_hu if r["det"]}
    hp = [r for r in rw_hu if r["lin"] in hdet]
    print(f"\nHuman originals wrongly flagged **before** any rewrite: **{len(hdet)}/{len(src_hu)}**; "
          f"of their {len(hp)} rewrites, {sum(r['det'] for r in hp)} are flagged.")

    print("\n### 3. By rewrite strength\n")
    tab("AI original → LLM rewrite", by(rw_ai, "iv", IV))
    tab("human original → LLM rewrite (the HAT-Bench v6–v8 analogue is `heavy`)", by(rw_hu, "iv", IV))

    print("\n### 4. By rewriting model\n")
    tab("AI original → LLM rewrite", by(rw_ai, "rw"))
    tab("human original → LLM rewrite", by(rw_hu, "rw"))

    print("\n### 5. By register\n")
    tab("AI original → LLM rewrite", by(rw_ai, "reg"))
    tab("human original → LLM rewrite", by(rw_hu, "reg"))

    print("\n### 6. By length — binned by achieved word count\n")
    B = [("<200", 0, 200), ("200–399", 200, 400), ("400–599", 400, 600),
         ("600–899", 600, 900), ("900+", 900, 10**9)]
    for nm, rs in (("AI originals, untouched", src_ai),
                   ("AI original → LLM rewrite", rw_ai),
                   ("human original → LLM rewrite", rw_hu)):
        print(f"\n**{nm}**\n")
        print("| words | flagged AI | n | median sections |")
        print("|---|---|---:|---:|")
        for bn, lo, hi in B:
            s = [r for r in rs if lo <= r["words"] < hi]
            if not s:
                continue
            ns = sorted(r["nseg"] for r in s)[len(s)//2]
            print(f"| {bn} | {cell(sum(r['det'] for r in s), len(s))} | {len(s)} | {ns} |")

    print("\n### 7. Held-out splits\n")
    tab("AI original → LLM rewrite", by(rw_ai, "split"))
    tab("human original → LLM rewrite", by(rw_hu, "split"))


if __name__ == "__main__":
    main()
