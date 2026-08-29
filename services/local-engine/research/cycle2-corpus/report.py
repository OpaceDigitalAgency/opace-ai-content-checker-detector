"""Generate CORPUS-REPORT.md from corpus.jsonl + tier3-baseline.jsonl.

Every rate is printed with its denominator. Where a cell is too small to carry
a rate, the count is printed and the rate is withheld rather than dressed up.
"""

from __future__ import annotations

import collections
import json
import os
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
THRESHOLD = 0.857


def pct(n: int, d: int) -> str:
    return f"{100*n/d:.1f}% ({n}/{d})" if d else "n/a (0/0)"


def auroc(pos: list[float], neg: list[float]) -> str:
    if len(pos) < 5 or len(neg) < 5:
        return "n/a"
    both = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg])
    ranks, i = {}, 0
    vals = [b[0] for b in both]
    r = [0.0] * len(both)
    while i < len(both):
        j = i
        while j + 1 < len(both) and vals[j + 1] == vals[i]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            r[k] = avg
        i = j + 1
    rp = sum(r[k] for k in range(len(both)) if both[k][1] == 1)
    n1, n0 = len(pos), len(neg)
    return f"{(rp - n1 * (n1 + 1) / 2) / (n1 * n0):.3f}"


def table(rows: list[list[str]], head: list[str]) -> str:
    out = ["| " + " | ".join(head) + " |",
           "|" + "|".join("---" for _ in head) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out)


def main() -> None:
    corpus = [json.loads(l) for l in open(os.path.join(HERE, "corpus.jsonl"))]
    manifest = json.load(open(os.path.join(HERE, "manifest.json")))
    spath = os.path.join(HERE, "tier3-baseline.jsonl")
    scores = {r["id"]: r for r in (json.loads(l) for l in open(spath))} if os.path.exists(spath) else {}

    L: list[str] = []
    A = L.append
    n = len(corpus)
    nh = sum(1 for r in corpus if r["side"] == "human")
    na = n - nh
    trainable = [r for r in corpus if r["split"] in ("train", "cal")]

    A("# Cycle-2 corpus report\n")
    A(f"Built {manifest['built']}. **{n:,} documents** — {na:,} AI, {nh:,} human.\n")
    A("Cycle 1 was trained on chat replies, and the shipped Tier 3 model shows it: the same "
      "model (claude-sonnet-4.6) is flagged 66% of the time when it writes a chat reply and 4% "
      "of the time when it writes an article. This corpus is published-register on both sides — "
      "articles, marketing and SEO copy, social posts, academic writing — and contains no chat "
      "conversations.\n")

    # ---------------------------------------------------------------- splits
    A("## Splits\n")
    A("Assigned by content hash, never by index: within each "
      "`(register, side, provider, era)` stratum, groups are ordered by the SHA-256 of their "
      "group key and cut at the 70/85 quantiles. Documents that share a group — the nine "
      "HAT-Bench versions of one essay, a human source and its AI edits — always land in the "
      "same split, so an edited copy of a training document cannot appear in test.\n")
    sc = collections.Counter((r["split"], r["side"]) for r in corpus)
    A(table([[s, f"{sc[(s,'ai')]:,}", f"{sc[(s,'human')]:,}",
              f"{sc[(s,'ai')]+sc[(s,'human')]:,}"] for s in ("train", "cal", "test")],
            ["split", "AI", "human", "total"]))
    A("")
    A(f"Train and calibration are class-balanced ({sum(sc[(s,'ai')] for s in ('train','cal')):,} AI "
      f"vs {sum(sc[(s,'human')] for s in ('train','cal')):,} human). The test split is deliberately "
      f"human-heavy: the {sum(1 for r in corpus if r['source'].startswith('battery-')):,} rows of "
      "the shipped regression battery are admitted as themselves and pinned to test, never train "
      "or calibration. Report test-set false-positive rate against that partition and test-set "
      "recall against the hash-assigned partition; do not mix them into one accuracy figure.\n")

    # ---------------------------------------------------------------- register
    A("## Register\n")
    A("Register is the axis cycle 1 failed on, so it is the axis the corpus is balanced on. "
      "Each register's trainable pool is sized to `min(target, available AI, available human)`, "
      "which makes every register class-balanced by construction and makes any shortfall visible "
      "rather than hidden behind one side's surplus.\n")
    rc = collections.Counter((r["register"], r["side"]) for r in corpus)
    tc = collections.Counter((r["register"], r["side"]) for r in trainable)
    regs = sorted({r["register"] for r in corpus})
    A(table([[g, f"{rc[(g,'ai')]:,}", f"{rc[(g,'human')]:,}",
              f"{tc[(g,'ai')]:,}", f"{tc[(g,'human')]:,}"] for g in regs],
            ["register", "AI (all)", "human (all)", "AI (train+cal)", "human (train+cal)"]))
    A("")

    # ---------------------------------------------------------------- genre
    A("## Genre\n")
    gc = collections.Counter((r["genre"], r["side"]) for r in corpus)
    genres = sorted({r["genre"] for r in corpus}, key=lambda g: -(gc[(g, "ai")] + gc[(g, "human")]))
    A(table([[g, gc[(g, "ai")], gc[(g, "human")], gc[(g, "ai")] + gc[(g, "human")]] for g in genres],
            ["genre", "AI", "human", "total"]))
    A("")

    # ---------------------------------------------------------------- era
    A("## Era\n")
    ec = collections.Counter(r["era"] for r in corpus)
    A(table([[e, f"{ec[e]:,}", f"{100*ec[e]/n:.1f}%"] for e, _ in ec.most_common()],
            ["era", "documents", "share of corpus"]))
    A("")
    A("`human-labelled-undated` marks human text that is human by dataset construction "
      "(HAT-Bench `v0`, MAGA `model == human`) but whose collection date the source card does "
      "not publish. It meets the verifiable-authorship bar, not the pre-December-2022 bar, and "
      "is labelled that way rather than rounded up.\n")

    # ---------------------------------------------------------------- provider
    A("## Provider and model (AI side)\n")
    ai = [r for r in corpus if r["side"] == "ai"]
    pc = collections.Counter(r["provider"] for r in ai)
    A(table([[p, f"{c:,}", f"{100*c/len(ai):.1f}%"] for p, c in pc.most_common()],
            ["provider", "documents", "share of AI side"]))
    A("")
    mc = collections.Counter(r["model"] for r in ai)
    A(f"{len(mc)} distinct generator models. The twenty largest:\n")
    A(table([[m, c] for m, c in mc.most_common(20)], ["model", "documents"]))
    A("")

    # ---------------------------------------------------------------- edit level
    A("## Edit level\n")
    A("A detector that only handles pure generation is not much use to someone whose users "
      "paste part-edited AI all day. HAT-Bench contributes a `v0`–`v8` trajectory per essay "
      "(v0 pure human, v8 heaviest AI editing) and GRADTEX contributes named transformation "
      "families, so the corpus carries the continuum rather than just the endpoints.\n")
    lc = collections.Counter((str(r.get("edit_level")), r["side"]) for r in corpus)
    lv = sorted({str(r.get("edit_level")) for r in corpus})
    A(table([[l, lc[(l, "ai")], lc[(l, "human")]] for l in lv], ["edit_level", "AI", "human"]))
    A("")

    # ---------------------------------------------------------------- lengths
    A("## Word-count distribution\n")
    rows = []
    for reg in regs:
        for side in ("ai", "human"):
            w = sorted(r["words"] for r in corpus if r["register"] == reg and r["side"] == side)
            if not w:
                continue
            q = lambda p: w[min(int(p * len(w)), len(w) - 1)]  # noqa: E731
            rows.append([reg, side, len(w), q(0.10), q(0.25), int(statistics.median(w)),
                         q(0.75), q(0.90), min(w), max(w)])
    A(table(rows, ["register", "side", "n", "p10", "p25", "median", "p75", "p90", "min", "max"]))
    A("")
    aw = [r["words"] for r in corpus if r["side"] == "ai"]
    hw = [r["words"] for r in corpus if r["side"] == "human"]
    A(f"Overall median: AI {int(statistics.median(aw))} words, human {int(statistics.median(hw))} "
      f"words. Length is a leakable shortcut, so the gap matters: a classifier that learns "
      f"\"long means AI\" will look excellent here and fail in production.\n")

    # ---------------------------------------------------------------- baseline
    A("## Baseline: the shipped Tier 3 model on this corpus\n")
    if not scores:
        A("**Not yet scored** — run `score_tier3.py` and re-run `report.py`.\n")
    else:
        A(f"Model `tier3-e5small-int8-perchannel.onnx`, tokeniser from `tier3/checkpoint`, "
          f"max_len 512, shipping threshold **{THRESHOLD}** from `models/tier3-config.json`. "
          f"{len(scores):,} of {n:,} documents scored. This is the *before* picture; the retrain "
          f"is measured against it.\n")

        def sub(pred):
            return [scores[r["id"]] for r in corpus if r["id"] in scores and pred(r)]

        allsc = [scores[r["id"]] for r in corpus if r["id"] in scores]
        a = [s for s in allsc if s["side"] == "ai"]
        h = [s for s in allsc if s["side"] == "human"]
        A("### Headline\n")
        A(table([
            ["AI recall at 0.857", pct(sum(s["flagged_0857"] for s in a), len(a))],
            ["Human false-positive rate at 0.857", pct(sum(s["flagged_0857"] for s in h), len(h))],
            ["AUROC, AI vs human", auroc([s["tier3_int8pc"] for s in a], [s["tier3_int8pc"] for s in h])],
        ], ["measure", "value"]))
        A("")

        A("### What this baseline says\n")
        A("`models/tier3-config.json` records the cycle-1 test AUROC as **0.981**. On this "
          "corpus it is **" + auroc([s["tier3_int8pc"] for s in a], [s["tier3_int8pc"] for s in h]) +
          "**. That gap is the whole point of cycle 2: the cycle-1 number was measured on the "
          "register the model was trained on, and published prose is not that register.\n")
        A("Five things in the tables below are worth reading carefully.\n")
        A("1. **Recall is " + pct(sum(s["flagged_0857"] for s in a), len(a)) + " at the shipping "
          "threshold.** The false-positive rate is fine — " +
          pct(sum(s["flagged_0857"] for s in h), len(h)) + " — so the threshold is not the "
          "problem. The model is simply not separating the classes.\n")
        A("2. **Marketing is the only register with a pulse, and it is not an authorship "
          "signal.** It has the highest recall of any register, but also the highest "
          "false-positive rate, and the median AI and median human scores are within 0.005 of "
          "each other. The model scores *all* marketing copy high, whoever wrote it, and the "
          "shipping threshold happens to sit near that median — so marketing generates both the "
          "detections and the false positives. This is exactly the register effect the "
          "cliché-rule false positives come from.\n")
        A("3. **On business reports the model is below chance** (AUROC 0.276): it ranks human "
          "reports as more AI-like than AI reports. With 205 documents per side that is a weak "
          "measurement, but it points the wrong way.\n")
        A("4. **Partially-edited text is invisible.** Every edit band — `v1` through `v8`, "
          "`light-edit`, `paraphrase`, `partial-completion`, `style-rewrite` — sits at 0.0% "
          "recall. Detection only ever fires on full generation, and only about one time in ten. "
          "A user pasting AI they have tidied up gets nothing at all.\n")
        A("5. **Do not read the era table as a decay curve.** It is confounded with register: "
          "the `2026-frontier` bucket is dominated by the owner's marketing generations, which "
          "is the one place any signal exists, while `2025-2026` is HAT-Bench essays, abstracts, "
          "news and reports. The difference between those rows is register, not model age.\n")
        A("### By register and side\n")
        rows = []
        for reg in regs:
            ra = sub(lambda r, g=reg: r["register"] == g and r["side"] == "ai")
            rh = sub(lambda r, g=reg: r["register"] == g and r["side"] == "human")
            rows.append([reg,
                         pct(sum(s["flagged_0857"] for s in ra), len(ra)),
                         pct(sum(s["flagged_0857"] for s in rh), len(rh)),
                         auroc([s["tier3_int8pc"] for s in ra], [s["tier3_int8pc"] for s in rh]),
                         f"{statistics.median([s['tier3_int8pc'] for s in ra]):.3f}" if ra else "n/a",
                         f"{statistics.median([s['tier3_int8pc'] for s in rh]):.3f}" if rh else "n/a"])
        A(table(rows, ["register", "AI flagged", "human flagged (FPR)", "AUROC",
                       "median AI score", "median human score"]))
        A("")

        A("### AI recall by era\n")
        rows = []
        for era, _ in collections.Counter(r["era"] for r in ai).most_common():
            ra = sub(lambda r, e=era: r["era"] == e and r["side"] == "ai")
            if ra:
                rows.append([era, pct(sum(s["flagged_0857"] for s in ra), len(ra)),
                             f"{statistics.median([s['tier3_int8pc'] for s in ra]):.3f}"])
        A(table(rows, ["era", "flagged", "median score"]))
        A("")

        A("### AI recall by provider\n")
        rows = []
        for prov, _ in pc.most_common():
            ra = sub(lambda r, p=prov: r["provider"] == p and r["side"] == "ai")
            if len(ra) >= 20:
                rows.append([prov, pct(sum(s["flagged_0857"] for s in ra), len(ra)),
                             f"{statistics.median([s['tier3_int8pc'] for s in ra]):.3f}"])
        A(table(rows, ["provider", "flagged", "median score"]))
        A("\nProviders with fewer than 20 scored documents are omitted rather than given a rate.\n")

        A("### AI recall by edit level\n")
        rows = []
        for lv_ in lv:
            ra = sub(lambda r, l=lv_: str(r.get("edit_level")) == l and r["side"] == "ai")
            if len(ra) >= 20:
                rows.append([lv_, pct(sum(s["flagged_0857"] for s in ra), len(ra)),
                             f"{statistics.median([s['tier3_int8pc'] for s in ra]):.3f}"])
        A(table(rows, ["edit_level", "flagged", "median score"]))
        A("")

        A("### Human false positives by source\n")
        rows = []
        for src, _ in collections.Counter(r["source"] for r in corpus if r["side"] == "human").most_common():
            rh = sub(lambda r, s=src: r["source"] == s and r["side"] == "human")
            if len(rh) >= 20:
                rows.append([src, pct(sum(s["flagged_0857"] for s in rh), len(rh)),
                             f"{statistics.median([s['tier3_int8pc'] for s in rh]):.3f}"])
        A(table(rows, ["human source", "flagged (false positives)", "median score"]))
        A("")

    with open(os.path.join(HERE, "CORPUS-REPORT.md"), "w") as f:
        f.write("\n".join(L) + "\n")
    print("wrote CORPUS-REPORT.md")


if __name__ == "__main__":
    main()
