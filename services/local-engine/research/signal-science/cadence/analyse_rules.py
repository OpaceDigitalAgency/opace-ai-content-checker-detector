"""Rule-level follow-up: the three signals with real conditional direction,
their combinations, their confounds, and the owner's nine documents.

Run `analyse.py` first — this reads the same feature file and re-derives its own
gates so the two scripts do not depend on each other's state.
"""

from __future__ import annotations

import glob
import json
import math
import os
import random
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cadence  # noqa: E402
from analyse import auroc, finite, load, pct, wilson  # noqa: E402

THRESHOLD = 0.984
TOP = ["tri_compression_flat", "balanced_construction", "template_repetition_z"]
SAMPLES = ("/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-"
           "other-plugins/3d333977-d6e8-4c79-83bd-ca366ac347bb/scratchpad/samples")
NINE_SCORES = {
    "1-panda-penguin": 0.022274, "2-social-objectives": 0.054359,
    "3-esports": 0.032582, "4-facebook-stale": 0.117187,
    "5-mobile-algorithm": 0.207766, "6-eu-ranking": 0.089308,
    "7-pure-ai-no-instructions": 0.971812, "8-heavily-edited-by-hand": 0.985607,
    "9-ai-with-humanise-instructions": 0.808228,
}


def gates_from(rows, keys, q=0.95):
    out = {}
    for k in keys:
        hu = [r[k] for r in finite(rows, k) if r["side"] == "human"]
        out[k] = pct(hu, q)
    return out


def main():
    rows = load()
    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]
    miss = [r for r in ai if r["p_max"] < THRESHOLD]
    clear = [r for r in hu if r["p_max"] < THRESHOLD]
    gates = gates_from(rows, TOP)
    print("gates (95th percentile of the full human distribution):",
          {k: round(v, 3) for k, v in gates.items()})

    def fires(r, k):
        v = r.get(k)
        return isinstance(v, (int, float)) and not math.isnan(v) and v >= gates[k]

    def n_fire(r):
        return sum(fires(r, k) for k in TOP)

    # ---- 1. bootstrap the conditional ratio, because n = 45 ----
    print("\n### Conditional ratio with a bootstrap interval (n=45 misses)")
    rng = random.Random(3)
    for k in TOP + ["ANY", "TWO"]:
        def hit(r):
            return n_fire(r) >= (1 if k == "ANY" else 2) if k in ("ANY", "TWO") \
                else fires(r, k)
        mv = np.array([1.0 if hit(r) else 0.0 for r in miss])
        cv = np.array([1.0 if hit(r) else 0.0 for r in clear])
        a, h = int(mv.sum()), int(cv.sum())
        ra, rh = a / len(miss), h / len(clear)
        rs = np.random.default_rng(3)
        da = mv[rs.integers(0, len(mv), size=(2000, len(mv)))].mean(1)
        dh = cv[rs.integers(0, len(cv), size=(2000, len(cv)))].mean(1)
        boots = sorted((da / np.where(dh == 0, np.nan, dh)).tolist())
        boots = [b for b in boots if not math.isnan(b)]
        lo, hi = boots[int(0.025 * len(boots))], boots[int(0.975 * len(boots))]
        wl, wh = wilson(a, len(miss))
        print(f"{k:26s} misses {a:2d}/45 = {ra*100:5.2f}% [{wl:.1f}–{wh:.1f}]   "
              f"cleared humans {h:4d}/{len(clear)} = {rh*100:4.2f}%   "
              f"ratio {ra/rh if rh else float('inf'):5.2f} [{lo:.2f}–{hi:.2f}]")

    # ---- 2. is it length, or is it cadence? ----
    print("\n### Confound check: AUROC within word-count strata "
          "(AI vs human, all documents)")
    bands = [(0, 800), (800, 1200), (1200, 1600), (1600, 10 ** 9)]
    print(f"{'signal':28s} " + " ".join(f"{a}-{b:<6}" for a, b in bands))
    for k in TOP:
        cells = []
        for a, b in bands:
            sub = [r for r in finite(rows, k) if a <= r["n_words"] < b]
            cells.append(auroc([r[k] for r in sub if r["side"] == "ai"],
                               [r[k] for r in sub if r["side"] == "human"]))
        print(f"{k:28s} " + " ".join(f"{c:11.3f}" for c in cells))
    print("(n per band: " + ", ".join(
        f"{a}-{b}: {sum(1 for r in rows if a <= r['n_words'] < b)}"
        for a, b in bands) + ")")

    print("\n### Confound check: paragraph markup. "
          "Human documents whose source lost paragraph breaks are excluded from "
          "every paragraph signal, so the register that matters most cannot be "
          "tested at all.")
    for reg in sorted(set(r["register"] for r in hu)):
        rr = [r for r in hu if r["register"] == reg]
        print(f"  {reg:26s} {sum(r['has_paragraph_markup'] for r in rr):4d}/{len(rr)}"
              f" have paragraph markup")

    # ---- 3. escalation on the ANY/TWO rules ----
    print("\n### Narrow escalation using the three-signal rule")
    for need in (1, 2, 3):
        for lo in (0.80, 0.90, 0.95, 0.97):
            g = [r for r in ai if lo <= r["p_max"] < THRESHOLD and n_fire(r) >= need]
            c = [r for r in hu if lo <= r["p_max"] < THRESHOLD and n_fire(r) >= need]
            print(f"  >= {need} signals, band {lo:.2f}-0.984: +{len(g)} AI, "
                  f"+{len(c)} human FP -> {877+len(g)}/922 = "
                  f"{(877+len(g))/922*100:.2f}%, {56+len(c)}/4636 = "
                  f"{(56+len(c))/4636*100:.2f}%")

    print("\n### Per register, the best-looking escalation (>=1 signal, band 0.95)")
    print(f"{'register':26s} {'shipped':>16s} {'escalated':>16s}")
    for reg in sorted(set(r["register"] for r in hu)):
        rr = [r for r in hu if r["register"] == reg]
        base = sum(1 for r in rr if r["p_max"] >= THRESHOLD)
        extra = sum(1 for r in rr
                    if 0.95 <= r["p_max"] < THRESHOLD and n_fire(r) >= 1)
        print(f"{reg:26s} {base:4d}/{len(rr):<5d}={base/len(rr)*100:5.2f}% "
              f"{base+extra:4d}/{len(rr):<5d}={(base+extra)/len(rr)*100:5.2f}%")

    # ---- 3b. the winning rule in detail, and cross-validated ----
    print("\n### The >=2-of-three rule in band 0.80-0.984, in detail")
    g = [r for r in ai if 0.80 <= r["p_max"] < THRESHOLD and n_fire(r) >= 2]
    c = [r for r in hu if 0.80 <= r["p_max"] < THRESHOLD and n_fire(r) >= 2]
    print("  AI gained:", [(r["register"], r.get("prompt_style"), r.get("provider"),
                            round(r["p_max"], 3)) for r in g])
    print("  human cost:", [(r["register"], round(r["p_max"], 3),
                             r["has_paragraph_markup"]) for r in c])
    print(f"{'register':26s} {'shipped':>16s} {'escalated':>16s}")
    for reg in sorted(set(r["register"] for r in hu)):
        rr = [r for r in hu if r["register"] == reg]
        base = sum(1 for r in rr if r["p_max"] >= THRESHOLD)
        extra = sum(1 for r in rr
                    if 0.80 <= r["p_max"] < THRESHOLD and n_fire(r) >= 2)
        print(f"{reg:26s} {base:4d}/{len(rr):<5d}={base/len(rr)*100:5.2f}% "
              f"{base+extra:4d}/{len(rr):<5d}={(base+extra)/len(rr)*100:5.2f}%")
    for st in ("plain", "house-brief", "human-voice"):
        ss = [r for r in ai if r.get("prompt_style") == st]
        b = sum(1 for r in ss if r["p_max"] >= THRESHOLD)
        e = sum(1 for r in ss if 0.80 <= r["p_max"] < THRESHOLD and n_fire(r) >= 2)
        print(f"  detection, {st:12s} {b}/{len(ss)} -> {b+e}/{len(ss)}")

    print("\n### Held out: 200 split-halves, gates refitted on each training half")
    rr = random.Random(29)
    idx = list(range(len(rows)))
    gain, cost = [], []
    for _ in range(200):
        rr.shuffle(idx)
        h = len(idx) // 2
        tr = [rows[i] for i in idx[:h]]
        te = [rows[i] for i in idx[h:]]
        gg = gates_from(tr, TOP)
        def nf2(r, gg=gg):
            return sum(1 for k in TOP
                       if isinstance(r.get(k), (int, float))
                       and not math.isnan(r[k]) and r[k] >= gg[k])
        a2 = [r for r in te if r["side"] == "ai"]
        h2 = [r for r in te if r["side"] == "human"]
        gain.append(sum(1 for r in a2
                        if 0.80 <= r["p_max"] < THRESHOLD and nf2(r) >= 2)
                    / len(a2) * 100)
        cost.append(sum(1 for r in h2
                        if 0.80 <= r["p_max"] < THRESHOLD and nf2(r) >= 2)
                    / len(h2) * 100)
    print(f"  detection gained +{np.mean(gain):.3f}pp (sd {np.std(gain):.3f}), "
          f"95% of splits [{np.percentile(gain, 2.5):.2f}, {np.percentile(gain, 97.5):.2f}]")
    print(f"  false positives  +{np.mean(cost):.3f}pp (sd {np.std(cost):.3f}), "
          f"95% of splits [{np.percentile(cost, 2.5):.2f}, {np.percentile(cost, 97.5):.2f}]")

    # ---- 3c. the paragraph-level combination rule, aggregated ----
    print("\n### The paragraph-level rule aggregated to the document")
    for k in ("paragraph_cadence_max", "paragraph_cadence_rate"):
        rs = finite(rows, k)
        a2 = [r for r in rs if r["side"] == "ai"]
        h2 = [r for r in rs if r["side"] == "human"]
        gg = pct([r[k] for r in h2], 0.95)
        fa = sum(1 for r in a2 if r[k] >= gg)
        fh = sum(1 for r in h2 if r[k] >= gg)
        m2 = [r for r in a2 if r["p_max"] < THRESHOLD]
        c2 = [r for r in h2 if r["p_max"] < THRESHOLD]
        am = sum(1 for r in m2 if r[k] >= gg)
        hc = sum(1 for r in c2 if r[k] >= gg)
        print(f"  {k}: gate {gg:.2f} | AI {fa}/{len(a2)}={fa/len(a2)*100:.2f}%  "
              f"human {fh}/{len(h2)}={fh/len(h2)*100:.2f}%  "
              f"LR {(fa/len(a2))/(fh/len(h2)):.2f}")
        print(f"    conditional: misses {am}/{len(m2)}={am/len(m2)*100:.2f}%  "
              f"cleared {hc}/{len(c2)}={hc/len(c2)*100:.2f}%  "
              f"ratio {(am/len(m2))/(hc/len(c2)) if hc else float('inf'):.2f}  "
              f"AUROC {auroc([r[k] for r in m2], [r[k] for r in c2]):.3f}")

    # ---- 4. the owner's nine documents ----
    print("\n### The owner's nine documents")
    hdr = ["doc", "p_max"] + TOP + ["n>=gate"]
    print(f"{'document':34s} {'p_max':>7s} " +
          " ".join(f"{k[:14]:>15s}" for k in TOP) + "  fires")
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        name = os.path.basename(path)[:-5]
        text = json.load(open(path))["text"]
        f = cadence.compute(text)
        f["side"] = "ai"
        cells = []
        for k in TOP:
            v = f.get(k)
            mark = "*" if (isinstance(v, float) and not math.isnan(v)
                           and v >= gates[k]) else " "
            cells.append(f"{v:14.2f}{mark}" if isinstance(v, float)
                         and not math.isnan(v) else f"{'n/a':>14s} ")
        nf = sum(1 for k in TOP
                 if isinstance(f.get(k), float) and not math.isnan(f[k])
                 and f[k] >= gates[k])
        print(f"{name:34s} {NINE_SCORES[name]:7.3f} " + " ".join(cells) + f"  {nf}")

    print("\n### Every signal on the nine documents")
    allk = [k for k in cadence.SIGNAL_NAMES]
    vals = {}
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        name = os.path.basename(path)[:-5]
        vals[name] = cadence.compute(json.load(open(path))["text"])
    names = sorted(vals)
    print(f"{'signal':26s} " + " ".join(f"{n.split('-')[0]:>7s}" for n in names))
    for k in allk:
        cells = []
        for n in names:
            v = vals[n].get(k)
            cells.append(f"{v:7.2f}" if isinstance(v, float)
                         and not math.isnan(v) else f"{'n/a':>7s}")
        print(f"{k:26s} " + " ".join(cells))

    # ---- 5. which passages fire, in document 9 ----
    print("\n### Passages that fire in 9-ai-with-humanise-instructions")
    text = json.load(open(os.path.join(
        SAMPLES, "9-ai-with-humanise-instructions.json")))["text"]
    for para in cadence.split_paragraphs(text):
        ss = [cadence.analyse_sentence(s) for s in cadence.split_sentences(para)]
        if len(ss) < 3:
            continue
        tot = sum(s.n_words for s in ss)
        tri = any(sum(x.n_words for x in ss[i:i + 3]) <= 45
                  for i in range(len(ss) - 2))
        bal = any(s.balanced for s in ss)
        if tri or bal or tot <= 55:
            tags = [t for t, on in (("compressed-triple", tri),
                                    ("balanced", bal),
                                    ("micro-paragraph", tot <= 55)) if on]
            print(f"\n  [{'/'.join(tags)}] roles={''.join(s.role for s in ss)} "
                  f"{tot} words")
            for s in ss:
                print(f"    {s.role}  {s.text}")

    print("\n### The three passages the owner quoted, scored as standalone paragraphs")
    quotes = [
        ("intro/body example",
         "A business owner may build a website to explain an offer, collect "
         "enquiries, manage appointments or sell online. Write the priority "
         "customer tasks into the brief before asking for web design prices. "
         "Otherwise, each web designer may price a different solution."),
        ("body example",
         "Page count affects effort but is not a complete measure. More complex "
         "sites do not always have more pages: five researched sections can take "
         "more work than 20 template-led pages using approved copy. Separate "
         "reusable layouts from per-page content, entry and review."),
        ("conclusion example",
         "A specialist platform changes the operating model. The WordPress "
         "website cost UK guide covers hosting, themes, plugins, licences and "
         "support; the eCommerce website cost UK guide covers catalogue work, "
         "payments, shipping, tax and integrations."),
    ]
    for label, q in quotes:
        ss = [cadence.analyse_sentence(s) for s in cadence.split_sentences(q)]
        print(f"  {label:20s} roles={''.join(s.role for s in ss)} "
              f"words={sum(s.n_words for s in ss)} "
              f"tri<=45={any(sum(x.n_words for x in ss[i:i+3]) <= 45 for i in range(max(0,len(ss)-2)))} "
              f"balanced={any(s.balanced for s in ss)} "
              f"utility={sum(s.utility for s in ss)} "
              f"enumeration={sum(s.enumeration for s in ss)}")


if __name__ == "__main__":
    main()
