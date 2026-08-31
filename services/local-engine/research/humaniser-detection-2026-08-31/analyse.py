"""Analysis for the humaniser-pairs detection measurement, 31 August 2026.

Reads the four score files (fp32 probe, fp32 pairs, browser probe, browser
pairs), gates on the published shipped-point figures, and prints every cut.

NOTHING here changes a threshold. 0.9855/0.9763 is read-only input.

The material is LLM paraphrase — `commercial_humaniser: false` on every row,
`transformation_family: generic_llm_rewrite`. Every figure this prints
describes robustness to "an LLM was asked to reword this", not to a commercial
humaniser product.
"""
import json, os, sys, math, collections

PRIMARY, SECONDARY = 0.9855, 0.9763
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS_DIR = os.path.join(HERE, "..", "cycle4-humaniser-pairs")
REF_BROWSER = os.path.join(HERE, "..", "corpus-reconciliation-2026-08-29", "raw",
                           "browser-runtime-scores.json")


def flag(seg, primary=PRIMARY, secondary=SECONDARY):
    s = sorted(seg, reverse=True)
    if not s:
        return False
    return s[0] >= primary or (len(s) > 1 and s[1] >= secondary)


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (100 * (c - h), 100 * (c + h))


def cell(k, n, min_n=30):
    if n == 0:
        return "—"
    if n < min_n:
        return f"{k}/{n} (n<30, count only)"
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100*k/n:.1f}% [{lo:.1f}–{hi:.1f}]"


def load_jsonl(p):
    return [json.loads(l) for l in open(p) if l.strip()]


# ---------------------------------------------------------------- gate 1: fp32
def gate_fp32():
    rows = load_jsonl(os.path.join(HERE, "probe-fp32.jsonl"))
    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]
    got = {
        "AI detected": (sum(flag(r["seg_p"]) for r in ai), len(ai), 883, 922),
        "human false positives": (sum(flag(r["seg_p"]) for r in hu), len(hu), 45, 4636),
        "fiction (story)": (sum(flag(r["seg_p"]) for r in hu if r["register"] == "story"),
                            sum(1 for r in hu if r["register"] == "story"), 23, 260),
        "academic-discussion": (
            sum(flag(r["seg_p"]) for r in hu if r["register"] == "academic-discussion"),
            sum(1 for r in hu if r["register"] == "academic-discussion"), 8, 420),
    }
    ok = True
    print("## Harness gate — fp32 server route, shipped 0.9855/0.9763, segments-v3\n")
    print("| published | expected | this run | |")
    print("|---|---|---|---|")
    for name, (k, n, ek, en) in got.items():
        good = (k, n) == (ek, en)
        ok &= good
        print(f"| {name} | {ek}/{en} | **{k}/{n}** | {'✅' if good else '❌ MISMATCH'} |")
    return ok


# ------------------------------------------------------------- gate 2: browser
def gate_browser():
    """The browser harness is validated against the canonical segments-v3
    browser run, per segment, rather than by re-scoring 5,558 documents
    through onnxruntime-web (about five hours)."""
    ref = {r["id"]: r for r in json.load(open(REF_BROWSER))}
    mine = load_jsonl(os.path.join(HERE, "browser-probe-out.jsonl"))
    dmax = 0.0
    nseg_mismatch = 0
    n = 0
    for r in mine:
        a = ref[r["id"]]
        b = [x["probability_ai"] for x in a["segments"]]
        if len(b) != len(r["seg_p"]):
            nseg_mismatch += 1
            continue
        for x, y in zip(b, r["seg_p"]):
            dmax = max(dmax, abs(x - y))
        n += 1
    # And the reference itself must reproduce the four published browser figures.
    allr = list(ref.values())
    ai = [r for r in allr if r["side"] == "ai"]
    hu = [r for r in allr if r["side"] == "human"]
    P = lambda rs: sum(flag([x["probability_ai"] for x in r["segments"]]) for r in rs)
    pub = {
        "AI detected": (P(ai), len(ai), 889, 922),
        "human false positives": (P(hu), len(hu), 90, 4636),
        "fiction (story)": (P([r for r in hu if r["register"] == "story"]),
                            sum(1 for r in hu if r["register"] == "story"), 26, 260),
        "academic-discussion": (P([r for r in hu if r["register"] == "academic-discussion"]),
                                sum(1 for r in hu if r["register"] == "academic-discussion"), 21, 420),
    }
    ok = True
    print("\n## Harness gate — browser route (onnxruntime-web WASM, int8), "
          "shipped 0.9855/0.9763, segments-v3\n")
    print("Reference: the canonical full-corpus browser run "
          "`corpus-reconciliation-2026-08-29/raw/browser-runtime-scores.json`.\n")
    print("| published (browser) | expected | reference run | |")
    print("|---|---|---|---|")
    for name, (k, nn, ek, en) in pub.items():
        good = (k, nn) == (ek, en)
        ok &= good
        print(f"| {name} | {ek}/{en} | **{k}/{nn}** | {'✅' if good else '❌ MISMATCH'} |")
    print(f"\nThis run's browser scorer against that reference, per section, on "
          f"{n} long-form documents: **max |Δp| = {dmax:.2e}**, "
          f"segment-count mismatches {nseg_mismatch}.")
    ok &= (dmax < 1e-6 and nseg_mismatch == 0)
    print(f"Browser harness reproduces the reference exactly: "
          f"{'✅' if dmax < 1e-6 and nseg_mismatch == 0 else '❌'}")
    return ok


# ----------------------------------------------------------------- the measure
def load_pairs():
    meta = {}
    seen = set()
    for f in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
              "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
        for line in open(os.path.join(PAIRS_DIR, f)):
            r = json.loads(line)
            if r["variant_id"] in seen:
                continue
            seen.add(r["variant_id"])
            meta[r["variant_id"]] = r
    fp = {r["variant_id"]: r["seg_p"] for r in load_jsonl(os.path.join(HERE, "pairs-fp32.jsonl"))}
    br = {}
    import glob
    for f in ([os.path.join(HERE, "pairs-browser-out.jsonl")]
                + sorted(glob.glob(os.path.join(HERE, "shard*-out.jsonl")))
                + sorted(glob.glob(os.path.join(HERE, "r*-out.jsonl")))):
        if os.path.exists(f):
            for r in load_jsonl(f):
                br[r["id"]] = r["seg_p"]
    rows = []
    for vid, m in meta.items():
        if vid not in fp or vid not in br:
            continue
        rows.append({
            "vid": vid, "lineage": m["lineage_id"], "split": m["split"],
            "cls": m["class_label"], "intensity": m["edit_intensity"],
            "side": m["source_side"], "rewriter": m["rewriting_model"],
            "family": m["rewriting_model_family"], "register": m["register"],
            "band": m["length_band"], "words": len(m["output_text"].split()),
            "cos": m.get("lexical_cosine_tfidf"),
            "fp32": fp[vid], "browser": br[vid],
        })
    return rows


def table(title, groups, rt):
    print(f"\n**{title}** — {rt}\n")
    print("| group | detected | denominator |")
    print("|---|---|---|")
    for name, rs in groups:
        k = sum(flag(r[rt]) for r in rs)
        print(f"| {name} | {cell(k, len(rs))} | {len(rs)} |")


def main():
    ok = gate_fp32() and gate_browser()
    print("\n" + ("ALL GATES PASS — figures below may be used.\n" if ok else
                  "GATE FAILURE — STOP. Nothing below may be quoted.\n"))
    if not ok:
        sys.exit(1)
    rows = load_pairs()
    print(f"\n---\n\n# The measurement — {len(rows)} rows scored on both runtimes\n")
    print("**These are LLM paraphrases, not commercial-humaniser output.** Every row carries "
          "`commercial_humaniser: false` and `transformation_family: generic_llm_rewrite`. "
          "Read every figure as robustness to *an LLM was asked to reword this*.\n")

    src_ai = [r for r in rows if r["cls"] == "ai_original"]
    src_hu = [r for r in rows if r["cls"] == "human_original"]
    rw_ai = [r for r in rows if r["cls"] == "ai_original_neural_rewrite"]
    rw_hu = [r for r in rows if r["cls"] == "human_original_ai_edited"]

    for rt in ("fp32", "browser"):
        label = ("fp32 server route (Python onnxruntime 1.29.0)" if rt == "fp32"
                 else "browser route (onnxruntime-web WASM, int8)")
        print(f"\n## Runtime: {label}\n")
        print("### 1. Headline, with denominators\n")
        print("| population | flagged AI | denominator |")
        print("|---|---|---|")
        for nm, rs in (("AI originals, untouched", src_ai),
                       ("AI originals after an LLM rewrite", rw_ai),
                       ("human originals, untouched (false positives)", src_hu),
                       ("human originals after an LLM rewrite", rw_hu)):
            print(f"| {nm} | {cell(sum(flag(r[rt]) for r in rs), len(rs))} | {len(rs)} |")

        # ---- paired survival, AI side
        det = {r["lineage"] for r in src_ai if flag(r[rt])}
        paired = [r for r in rw_ai if r["lineage"] in det]
        surv = sum(flag(r[rt]) for r in paired)
        print(f"\n### 2. The paired comparison — of the AI sources we detect, "
              f"how many survive the rewrite?\n")
        print(f"- AI sources detected before rewriting: **{len(det)}/{len(src_ai)}**")
        print(f"- Their rewrites still detected: **{cell(surv, len(paired))}**  "
              f"← *survival rate*")
        print(f"- Lost to the rewrite: **{len(paired)-surv}/{len(paired)}**")
        undet = [r for r in rw_ai if r["lineage"] not in det]
        print(f"- (Rewrites whose source we already missed: {sum(flag(r[rt]) for r in undet)}"
              f"/{len(undet)} detected — excluded from the survival rate above.)")

        # human side paired
        hdet = {r["lineage"] for r in src_hu if flag(r[rt])}
        print(f"\n- Human originals wrongly flagged *before* any rewrite: "
              f"**{len(hdet)}/{len(src_hu)}**. After an LLM rewrite the same lineages' "
              f"variants are flagged {sum(flag(r[rt]) for r in rw_hu if r['lineage'] in hdet)}"
              f"/{sum(1 for r in rw_hu if r['lineage'] in hdet)}.")

        by = lambda rs, k: [(v, [r for r in rs if r[k] == v])
                            for v in sorted({r[k] for r in rs})]
        order = {"light": 0, "medium": 1, "heavy": 2}
        print("\n### 3. By rewrite strength\n")
        for nm, rs in (("AI original → LLM rewrite (detection of AI)", rw_ai),
                       ("human original → LLM rewrite (flag rate)", rw_hu)):
            grp = sorted(by(rs, "intensity"), key=lambda t: order.get(t[0], 9))
            table(nm, grp, rt)
        # paired survival by intensity
        print(f"\n**Survival of a detected AI source, by rewrite strength** — {rt}\n")
        print("| strength | survives | denominator |")
        print("|---|---|---|")
        for iv in ("light", "medium", "heavy"):
            p = [r for r in paired if r["intensity"] == iv]
            print(f"| {iv} | {cell(sum(flag(r[rt]) for r in p), len(p))} | {len(p)} |")

        print("\n### 4. By rewriting model\n")
        for nm, rs in (("AI original → LLM rewrite", rw_ai),
                       ("human original → LLM rewrite", rw_hu)):
            table(nm, by(rs, "rewriter"), rt)
        print(f"\n**Survival of a detected AI source, by rewriting model** — {rt}\n")
        print("| rewriting model | survives | denominator |")
        print("|---|---|---|")
        for mdl, p in by(paired, "rewriter"):
            print(f"| {mdl} | {cell(sum(flag(r[rt]) for r in p), len(p))} | {len(p)} |")

        print("\n### 5. By register\n")
        table("AI original → LLM rewrite", by(rw_ai, "register"), rt)
        table("human original → LLM rewrite", by(rw_hu, "register"), rt)

        print("\n### 6. By length\n")
        bands = [("under 200", 0, 200), ("200–399", 200, 400), ("400–599", 400, 600),
                 ("600–899", 600, 900), ("900+", 900, 10 ** 9)]
        for nm, rs in (("AI original → LLM rewrite", rw_ai),
                       ("AI originals, untouched", src_ai)):
            print(f"\n**{nm}** — {rt}, binned by achieved word count\n")
            print("| words | detected | denominator |")
            print("|---|---|---|")
            for bn, lo, hi in bands:
                s = [r for r in rs if lo <= r["words"] < hi]
                print(f"| {bn} | {cell(sum(flag(r[rt]) for r in s), len(s))} | {len(s)} |")

        print("\n### 7. Held-out splits (unseen sources / unseen rewriter family / unseen register)\n")
        table("AI original → LLM rewrite", by(rw_ai, "split"), rt)

    # runtime disagreement
    print("\n---\n\n## Runtime disagreement on the rewritten text\n")
    for nm, rs in (("AI original → LLM rewrite", rw_ai),
                   ("human original → LLM rewrite", rw_hu)):
        d = sum(1 for r in rs if flag(r["fp32"]) != flag(r["browser"]))
        bo = sum(1 for r in rs if flag(r["browser"]) and not flag(r["fp32"]))
        print(f"- {nm}: verdicts differ on **{d}/{len(rs)}** ({100*d/len(rs):.1f}%); "
              f"browser-only flags {bo}, server-only {d-bo}.")


if __name__ == "__main__":
    main()
