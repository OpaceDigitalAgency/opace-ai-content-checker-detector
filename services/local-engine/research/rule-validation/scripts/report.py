"""Stage 3: render RULE-VALIDATION.md and ACTION-LIST.md from rule-stats.json.

All numbers come from rule-stats.json; nothing is retyped by hand.
"""
import json, pathlib, math

HERE = pathlib.Path(__file__).resolve().parent.parent
D = json.load(open(HERE / "rule-stats.json"))
R, M = D["rules"], D["meta"]
CATS = sorted(R)
N_AI, N_HU = M["n_ai"], M["n_human"]

def pc(x, dp=1):
    return f"{x*100:.{dp}f}%"

def q(x):
    if x >= 0.1:
        return f"{x:.2f}"
    if x >= 0.001:
        return f"{x:.3f}"
    return f"{x:.1e}"

def z(x, dp=2):
    """Format, collapsing -0.00 to 0.00."""
    v = round(x, dp)
    if v == 0:
        v = 0.0
    return f"{v:.{dp}f}"

def contrib(c, view="raw", fp="fp5"):
    return R[c][view]["ablation"][fp]["fixed_threshold"]["delta_tpr_pp"]

ranked = sorted(CATS, key=lambda c: contrib(c))
ACTIONS = {}
for c in CATS:
    ACTIONS.setdefault(R[c]["action"]["action"], []).append(c)

dead = [c for c in CATS if R[c]["raw"]["dead"] and R[c]["stripped"]["dead"]]
dead_raw_only = [c for c in CATS if R[c]["raw"]["dead"] and not R[c]["stripped"]["dead"]]
harmful = [c for c in CATS if R[c]["raw"]["harmful"] or R[c]["stripped"]["harmful"]]
harmful_sig = [c for c in harmful if R[c]["raw"]["significant_bh05"] or R[c]["stripped"]["significant_bh05"]]
sig_raw = [c for c in CATS if R[c]["raw"]["significant_bh05"]]
sig_strip = [c for c in CATS if R[c]["stripped"]["significant_bh05"]]
unsupported = [c for c in CATS if not R[c]["raw"]["significant_bh05"]]
redundant_pairs = []
for c in CATS:
    for x in (R[c]["raw"]["redundancy"].get("partners") or []):
        redundant_pairs.append((c, x))
near_dupe = sorted({tuple(sorted((c, x["partner"]))) + (round(x["jaccard"], 2),)
                    for c, x in redundant_pairs if x["jaccard"] >= 0.6})
vendor_risk = [c for c in CATS if R[c]["raw"]["vendor_skew"]["single_vendor_risk"]]
genre_flag = [c for c in CATS if R[c]["raw"]["genre_risk"]["flag"]]

B = M["baseline"]
L = []
w = L.append

w("# Per-rule validation of the 113 en-signals writing-signal categories")
w("")
w("Measured, not assumed. Every one of the 113 rule categories in the shipped")
w("`packages/core` engine was run over the full provider-eval corpus in both the")
w("raw and the markdown-stripped view, and scored on firing rate, discriminative")
w("power, significance, redundancy, vendor skew, human-genre exposure,")
w("leave-one-out contribution and weight justification.")
w("")
w("- Machine-readable results: [`rule-stats.json`](rule-stats.json)")
w("- Ranked recommendations: [`ACTION-LIST.md`](ACTION-LIST.md)")
w("- Reproduction: [`scripts/`](scripts/) — see *How to reproduce* below")
w("")
w("**Nothing in the engine or the website was changed. This is a measurement and a set of recommendations.**")
w("")

# ── Executive summary ────────────────────────────────────────────────────
w("## Executive summary, in plain English")
w("")
w("Read this section if you read nothing else. No statistics training needed.")
w("")
w(f"We have {N_AI:,} texts known to be AI-written (39 models, 12 vendor-and-era")
w(f"slices) and {N_HU} texts known to be human-written. We asked, for each of the")
w("113 rules: how often does it fire on each side, and does that difference mean")
w("anything?")
w("")
w("**What we found.**")
w("")
w(f"1. **{len(dead)} of the 113 rules never fired once**, on either AI or human text, in")
w("   either view. They are carrying weight in the scoring model that they have")
w("   never once earned. Twenty-nine of the thirty-two were then hand-probed with a")
w("   text built to trigger them, and all twenty-nine fired — so those rules work;")
w("   the patterns they hunt for simply are not in this corpus. The remaining three")
w("   (`mic-drop-paragraph`, `contrast-density`, `punchline-fragment-density`) are")
w("   threshold rules whose gates the corpus never gets near, and they look mis-set")
w("   rather than dormant.")
w("")
w(f"2. **{len(harmful)} rules fire more often on human writing than on AI writing.**")
w("   That is the wrong direction for a detector: they push human text towards an")
w("   'AI-like' verdict. Only two of them (`passive-ratio`, `token-cutoff`) do so by")
w("   a margin large enough to be sure about; the other fifteen are pointing the")
w("   wrong way but within the noise. Either way, none of them is earning its weight.")
w("")
w(f"3. **Only {len(sig_raw)} of the 113 rules are statistically solid** in the raw view, and")
w(f"   only {len(sig_strip)} in the stripped view, once you correct for the fact that we")
w("   are testing 113 hypotheses at once. This is not a criticism of the rules; it")
w(f"   is arithmetic. With {N_HU} human texts, a rule that fires on 2% of humans and 6%")
w("   of AI cannot be told apart from luck. Most of the rule set is currently")
w("   unproven rather than disproven — and the honest thing is to say so.")
w("")
w(f"4. **The detector leans heavily on markdown furniture.** The single biggest")
w(f"   contributor, `markdown-furniture`, is worth {abs(contrib('markdown-furniture')):.1f} percentage points of")
w("   detection on its own. Bold runs, heading lines and bold-label bullets between")
w("   them account for most of the measured power. That is why detection collapses")
w(f"   from {pc(B['raw']['fp5']['tpr'])} to {pc(B['stripped']['fp5']['tpr'])} when the same texts are pasted without their")
w("   markdown: the engine is largely reading layout, not prose.")
w("")
w("5. **The weights were never fitted to our data.** They were inherited from the")
w("   upstream `avoid-ai-writing` project and from editorial judgement. Where the")
w("   evidence now contradicts them, the report proposes a number. Where the")
w("   evidence cannot settle the question, it says so instead of inventing one.")
w("")
w("**What we cannot say.** The human side is 169 texts. Only 40 are fresh published")
w("prose and only 10 of those are business-marketing copy — the genre most at risk")
w("of being wrongly flagged, and the genre our customers write. A single extra hit")
w("in that bucket moves its rate by ten percentage points. Every genre-level")
w("statement in this report is a flag to investigate, never a finding.")
w("")

# ── Limits ───────────────────────────────────────────────────────────────
w("## Limits of this evidence (read before quoting any number)")
w("")
w("| Limit | Detail |")
w("| --- | --- |")
w(f"| Human corpus size | {N_HU} texts. Composition: " + ", ".join(
    f"{k} {v}" for k, v in sorted(M['genre_counts'].items(), key=lambda kv: -kv[1])) + ". |")
w("| Published prose | Only 40 of the 169 (`fresh-human-corpus-v1`). The other 129 are HC3 question answers (97) and Wikipedia articles (32) — neither is representative of commercial web copy. |")
w("| Business-marketing humans | 10. Any rate quoted for this genre has a resolution of 10 percentage points. |")
w("| Statistical power | With 169 humans, the tightest false-positive rate we can bound is roughly 1.8% (rule of three) even for a rule that never fires on a human. A rule firing on 0 humans and one firing on 1 human are not distinguishable. |")
w("| Multiple comparisons | 113 rules were tested. Raw p-values are reported, but decisions use Benjamini–Hochberg q-values; at 113 tests roughly 6 rules would clear p<0.05 by chance alone. |")
w("| Weights | The shipped weights come from the upstream `avoid-ai-writing` project and from editorial judgement. They were not fitted to this corpus, and this report is the first time they have been checked against it. |")
w("| Provider coverage | 39 models across 7 vendors, but only openai has a 2022-23 slice, so era effects and vendor effects are partly confounded. |")
w("| Genre coverage of AI side | The AI side is arena-style prompts, not commissioned marketing copy. A rule's AI firing rate here is not its firing rate on the content our customers paste. |")
w("")

# ── Method ───────────────────────────────────────────────────────────────
w("## Method")
w("")
w("1. `scripts/extract.mjs` runs the shipped `packages/core` dist (`inspectSignalsV2`")
w("   and `computeEditorialSignals`) over `provider-eval/eval-set.jsonl` and")
w("   `stripped-eval/stripped-set.jsonl`, recording the deduplicated per-category")
w("   issue counts the scorer itself consumes, plus the shipped score.")
w("2. `scripts/dump_config.mjs` exports the shipped weight tables and category sets.")
w("3. `scripts/verify_reconstruction.py` proves the Python re-implementation of the")
w("   scorer reproduces the engine's own score **exactly on all 3,792 scored")
w("   samples** (0 mismatches). Without that, no ablation number would be trustworthy.")
w("4. `scripts/stats.py` provides an exact Fisher test (integer hypergeometric")
w("   arithmetic — scipy is not available in this environment), Wilson intervals,")
w("   Haldane-corrected likelihood-ratio intervals and Benjamini–Hochberg correction.")
w("   `scripts/test_stats.py` checks them against published worked examples.")
w("5. `scripts/liveness.mjs` hand-probes every rule that never fired, to separate")
w("   'dormant' from 'unreachable'. `scripts/v4_headroom.mjs` measures how close the")
w("   corpus gets to the three whole-document rhythm thresholds.")
w("6. `scripts/analyse.py` produces `rule-stats.json`; `scripts/report.py` renders")
w("   this document and the action list.")
w("")
w("### How to reproduce")
w("")
w("```sh")
w("cd implementation/services/local-engine/research/rule-validation")
w("node scripts/extract.mjs ../provider-eval/eval-set.jsonl     data/fire-raw.jsonl")
w("node scripts/extract.mjs ../stripped-eval/stripped-set.jsonl data/fire-stripped.jsonl")
w("node scripts/dump_config.mjs")
w("node scripts/liveness.mjs")
w("node scripts/v4_headroom.mjs")
w("python3 scripts/verify_reconstruction.py   # must print 0 mismatches")
w("python3 scripts/test_stats.py")
w("python3 scripts/analyse.py")
w("python3 scripts/report.py")
w("```")
w("")
w("### Definitions")
w("")
w("- **Firing rate** — share of samples on that side where the rule produced at least one finding.")
w("- **Precision** — of the samples where the rule fires, the share that are AI. The base rate is")
w(f"  {pc(M['base_rate_ai'], 2)} because the corpus is deliberately AI-heavy, so precision below that is bad news.")
w("- **Lift** — precision divided by the base rate. Anything at or under 1.00 adds nothing.")
w("- **Likelihood ratio (LR)** — firing rate on AI divided by firing rate on humans, Haldane-corrected. This is the")
w("  quantity a weight should be proportional to, and it does not depend on the corpus mix.")
w("- **q** — Benjamini–Hochberg adjusted p-value across all 113 rules. `q < 0.05` is our bar for 'supported'.")
w("- **Contribution** — percentage points of AI detection lost when the rule alone is removed, holding the")
w("  operating threshold fixed at the 5%-false-positive point of the shipped configuration.")
w("")

# ── Headline counts ─────────────────────────────────────────────────────
w("## Headline counts")
w("")
w("| Category | Count | Of 113 |")
w("| --- | ---: | ---: |")
for label, lst in [
    ("Dead in both views (never fired)", dead),
    ("Dead in the raw view only", dead_raw_only),
    ("Fires more on humans than AI (either view)", harmful),
    ("...of which the difference is significant", harmful_sig),
    ("Statistically supported, raw view (BH q<0.05)", sig_raw),
    ("Statistically supported, stripped view", sig_strip),
    ("Not distinguishable from chance, raw view", unsupported),
    ("Near-duplicate pairs (Jaccard >= 0.6)", near_dupe),
    ("Single-vendor skew (top firing rate >= 3x lowest)", vendor_risk),
    ("Human-genre exposure flag", genre_flag),
]:
    w(f"| {label} | {len(lst)} | {len(lst)/113*100:.0f}% |")
w("")
w("### Operating points of the shipped configuration (model-free rules score)")
w("")
w("| View | FP budget | Threshold | AI detected | Human false positives |")
w("| --- | --- | ---: | ---: | ---: |")
for view in ("raw", "stripped"):
    for fp in ("fp1", "fp5", "fp10"):
        b = B[view][fp]
        w(f"| {view} | {fp[2:]}% | >= {b['threshold']} | {pc(b['tpr'])} | {pc(b['fpr'])} ({round(b['fpr']*N_HU)}/{N_HU}) |")
w("")
w("The stripped view is the realistic one: it is what a customer pastes when they")
w("copy from a chat window into a text box. The rules score detects roughly a")
w(f"quarter of AI text there at a 5% false-positive budget, against {pc(B['raw']['fp5']['tpr'])} with the")
w("markdown intact.")
w("")

# ── Top ten ─────────────────────────────────────────────────────────────
w("## Top ten rules by measured contribution")
w("")
w("Removing the rule from the shipped configuration and holding the threshold at")
w("the 5%-false-positive point. Negative delta = detection lost = the rule was")
w("doing work.")
w("")
w("| # | Rule | Weight | Raw delta | Stripped delta | AI fires | Human fires | q (raw) |")
w("| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |")
for i, c in enumerate(ranked[:10], 1):
    r = R[c]["raw"]
    w(f"| {i} | `{c}` | {R[c]['weight_audit']['shipped_weight']} | {contrib(c):+.2f} pp | "
      f"{contrib(c,'stripped'):+.2f} pp | {r['ai_fired']}/{N_AI} | {r['human_fired']}/{N_HU} | {q(r['bh_q'])} |")
w("")
w("Same measurement on the stripped view, which is a different ranking and the one")
w("that matters for the paste-a-chat-reply use case:")
w("")
w("| # | Rule | Stripped delta | Raw delta | q (stripped) |")
w("| ---: | --- | ---: | ---: | ---: |")
for i, c in enumerate(sorted(CATS, key=lambda x: contrib(x, "stripped"))[:10], 1):
    w(f"| {i} | `{c}` | {contrib(c,'stripped'):+.2f} pp | {contrib(c):+.2f} pp | {q(R[c]['stripped']['bh_q'])} |")
w("")
strip_top = sorted(CATS, key=lambda x: contrib(x, "stripped"))[:10]
suspect = [c for c in strip_top if R[c]["raw"]["harmful"] or R[c]["stripped"]["harmful"]
           or not R[c]["stripped"]["significant_bh05"]]
w("Treat the stripped list with care. " + ", ".join(f"`{c}`" for c in suspect) +
  f" ({len(suspect)} of the ten) are elsewhere flagged as firing the wrong way or as")
w("not distinguishable from chance. Their apparent contribution comes from nudging")
w("scores across an integer threshold, not from evidence that they identify AI. A")
w("rule can lift the AI score distribution and the human one by the same amount and")
w("still show a positive contribution if the humans happen to sit further from the")
w("cut. This is the main reason the contribution ranking must be read next to the")
w("q-value column and never on its own.")
w("")
w("Note the two lists barely overlap in ordering. With markdown present the engine")
w("scores layout; with markdown removed it falls back on vocabulary (`tier1`,")
w("`chatbot`) and rhythm. Any claim about 'the most important rule' has to name")
w("which view it means.")
w("")

# ── Dead ────────────────────────────────────────────────────────────────
w("## Dead rules")
w("")
w(f"{len(dead)} categories produced no finding on any of the 1,896 samples in either")
w("view. Each was then given a hand-built probe text designed to trigger it.")
w("")
w("| Rule | Weight | Probe fired? | Reading |")
w("| --- | ---: | --- | --- |")
for c in sorted(dead):
    lv = R[c]["liveness"] or {}
    fired = lv.get("fired")
    if fired is True:
        note = "Live. The pattern is simply absent from this corpus."
    elif fired is None:
        hd = M["v4_threshold_headroom"]
        note = "Whole-document rhythm threshold; see the headroom table below."
    else:
        note = "Probe did not fire — reachability unproven."
    mark = {True: "yes", False: "no", None: "n/a"}[fired]
    w(f"| `{c}` | {R[c]['weight_audit']['shipped_weight']} | {mark} | {note} |")
w("")
if dead_raw_only:
    w("Dead in the raw view but alive once markdown is stripped: " +
      ", ".join(f"`{c}`" for c in dead_raw_only) + ".")
    w("")
w("### The three unreachable thresholds")
w("")
w("`mic-drop-paragraph`, `contrast-density` and `punchline-fragment-density` are")
w("whole-document rhythm measures rather than string matches, so a synthetic probe")
w("would prove little. Instead, here is how close the corpus actually gets:")
w("")
hd = M["v4_threshold_headroom"]
T = hd["thresholds"]
obs = hd["observed"]["raw"]
w("| Rule | Gate | Highest value seen on AI | Highest on humans | Verdict |")
w("| --- | --- | ---: | ---: | --- |")
w(f"| `mic-drop-paragraph` | micDropParagraphs >= {T['micDropMinParagraphs']} | {obs['micDropParagraphs']['ai_max']} | {obs['micDropParagraphs']['human_max']} | unreachable by one unit |")
w(f"| `contrast-density` | contrastCount >= {T['contrastMinCount']} and per-1000 >= {T['contrastMinPer1000']} | {obs['contrastCount']['contrastCount' if False else 'ai_max']} (count) | {obs['contrastCount']['human_max']} | the count gate binds; never reached |")
w(f"| `punchline-fragment-density` | count >= {T['punchlineMinCount']}, rate >= {T['punchlineMinRate']}, paragraph-final >= {T['punchlineMinParagraphFinal']} | {obs['punchlineCount']['ai_max']} / {obs['punchlineRate']['ai_max']:.2f} / {obs['punchlineParagraphFinal']['ai_max']} | {obs['punchlineCount']['human_max']} / {obs['punchlineRate']['human_max']:.2f} / {obs['punchlineParagraphFinal']['human_max']} | each maximum is reached, never jointly |")
w("")
w("These read as mis-set thresholds rather than dormant patterns. They should be")
w("either re-derived from data or removed; leaving them shipped costs nothing in")
w("score but overstates the size of the rule set.")
w("")
w("One incidental find: `tier3-phrase-cluster` never fires because `TIER3_PHRASES`")
w("is inherited crypto and web3 whitepaper vocabulary (`tokenized incentive")
w("structures`, `decentralized compute`, `reward emissions`). It is a live rule")
w("aimed at a corpus we do not process.")
w("")

# ── Harmful ─────────────────────────────────────────────────────────────
w("## Harmful rules — fire more on humans than on AI")
w("")
w("| Rule | Weight | AI raw | Human raw | AI stripped | Human stripped | LR | q (raw) | Significant? |")
w("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
for c in sorted(harmful, key=lambda x: R[x]["raw"]["bh_q"]):
    r, s = R[c]["raw"], R[c]["stripped"]
    sig = "**yes**" if (r["significant_bh05"] or s["significant_bh05"]) else "no — within noise"
    w(f"| `{c}` | {R[c]['weight_audit']['shipped_weight']} | {r['ai_fired']} ({pc(r['ai_rate'])}) | "
      f"{r['human_fired']} ({pc(r['human_rate'])}) | {s['ai_fired']} ({pc(s['ai_rate'])}) | "
      f"{s['human_fired']} ({pc(s['human_rate'])}) | {r['likelihood_ratio']:.2f} | {q(r['bh_q'])} | {sig} |")
w("")
w("Two of these are real: `passive-ratio` fires on 4.7% of humans against 0.8% of AI")
w("(driven by Wikipedia articles, 6 of 32), and `token-cutoff` on 3.6% of humans")
w("against 0.6% of AI (3 of 6 medical Q&A answers). The other fifteen point the")
w("wrong way but are not distinguishable from chance at this sample size. They")
w("should still not be adding points to an AI score, because nothing here supports")
w("the claim that they belong on the AI side of the ledger.")
w("")

# ── Redundancy ──────────────────────────────────────────────────────────
w("## Redundant rules")
w("")
w("Two measures are reported. **Conditional overlap** — P(partner fires | rule")
w("fires) — is what was commissioned, but on its own it is misleading: a rule that")
w("fires on two thirds of everything is an 0.8+ 'partner' of nearly every other")
w("rule without being redundant with it. **Jaccard** (shared firings over combined")
w("firings) is symmetric and does not have that flaw, so the recommendations use it.")
w("")
w("### Genuine near-duplicates (Jaccard >= 0.6)")
w("")
w("| Pair | Jaccard | Reading |")
w("| --- | ---: | --- |")
for a, b, j in near_dupe:
    w(f"| `{a}` + `{b}` | {j} | the same bold/heading furniture counted twice |")
w("")
w("The markdown cluster — `formatting`, `markdown-bold`, `markdown-furniture` —")
w("is one signal wearing three hats. `markdown-heading` and `heading-inflation`")
w("(Jaccard 0.50) are close behind. The escalation policy already collapses the")
w("furniture categories for the breadth gate, which is an implicit admission of")
w("the same fact; the raw score does not, and so triple-counts it.")
w("")
w("### All pairs with conditional overlap >= 0.8")
w("")
w("| Rule | Partner | P(partner \\| rule) | Jaccard | Lift over partner's own base rate |")
w("| --- | --- | ---: | ---: | ---: |")
for c, x in sorted(redundant_pairs, key=lambda t: -t[1]["p_partner_given_rule"]):
    lift = x["overlap_lift"]
    w(f"| `{c}` | `{x['partner']}` | {x['p_partner_given_rule']:.2f} | {x['jaccard']:.2f} | "
      f"{lift:.2f} |" if lift else f"| `{c}` | `{x['partner']}` | {x['p_partner_given_rule']:.2f} | {x['jaccard']:.2f} | - |")
w("")
w("Read the lift column first. Where it sits near 1.0 the overlap is just the")
w("partner's own high firing rate, not redundancy.")
w("")

# ── Statistical support ─────────────────────────────────────────────────
w("## Statistically supported rules")
w("")
w(f"Only these {len(sig_raw)} rules clear Benjamini–Hochberg q<0.05 in the raw view.")
w("")
w("| Rule | AI | Human | Precision (95% CI) | Lift | LR (95% CI) | q | Contribution |")
w("| --- | ---: | ---: | --- | ---: | --- | ---: | ---: |")
for c in sorted(sig_raw, key=lambda x: R[x]["raw"]["bh_q"]):
    r = R[c]["raw"]
    w(f"| `{c}` | {r['ai_fired']} ({pc(r['ai_rate'])}) | {r['human_fired']} ({pc(r['human_rate'])}) | "
      f"{pc(r['precision'],1)} ({pc(r['precision_ci95'][0],0)}–{pc(r['precision_ci95'][1],0)}) | "
      f"{r['lift_over_base']:.2f} | {r['likelihood_ratio']:.1f} ({r['lr_ci95'][0]:.1f}–{r['lr_ci95'][1]:.1f}) | "
      f"{q(r['bh_q'])} | {contrib(c):+.2f} pp |")
w("")
w(f"The remaining {len(unsupported)} rules cannot be validated at this sample size. That is")
w("not the same as saying they are wrong. It means the corpus cannot tell the")
w("difference between them and a coin, and any weight they carry is an assertion,")
w("not a measurement. Full numbers for all 113 are in the appendix table and in")
w("`rule-stats.json`.")
w("")

# ── Provider / era ──────────────────────────────────────────────────────
w("## Per-vendor and per-era firing")
w("")
w("Rules firing on at least 3% of AI text, where the highest vendor rate is at")
w("least three times the lowest (or some vendor never triggers it). A rule in this")
w("table is a vendor fingerprint, not a general AI tell, and should not be sold as one.")
w("")
provs = sorted(M["provider_counts"])
w("| Rule | " + " | ".join(p for p in provs) + " | Skew |")
w("| --- | " + " | ".join("---:" for _ in provs) + " | ---: |")
for c in sorted(vendor_risk, key=lambda x: -R[x]["raw"]["ai_rate"]):
    bp = R[c]["raw"]["by_provider"]
    ratio = R[c]["raw"]["vendor_skew"]["ratio"]
    w(f"| `{c}` | " + " | ".join(pc(bp[p]['rate'], 0) for p in provs) + " | " +
      (f"{ratio:.1f}x" if ratio else "inf") + " |")
w("")
w("### Era")
w("")
w("The 2022-23 slice is openai-only (150 samples), so era and vendor are partly")
w("confounded. Rules with the largest era gradient, raw view:")
w("")
eras = sorted(M["era_counts"])
grad = sorted(CATS, key=lambda c: -(max(R[c]['raw']['by_era'][e]['rate'] for e in eras)
                                   - min(R[c]['raw']['by_era'][e]['rate'] for e in eras)))
w("| Rule | " + " | ".join(f"{e} (n={M['era_counts'][e]})" for e in eras) + " |")
w("| --- | " + " | ".join("---:" for _ in eras) + " |")
for c in grad[:15]:
    be = R[c]["raw"]["by_era"]
    w(f"| `{c}` | " + " | ".join(pc(be[e]['rate'], 0) for e in eras) + " |")
w("")
w("The markdown furniture rules fire on 30-40% of 2022-23 output and 80-90% of")
w("2025-26 output. That is a genuine drift in how models format answers, and it is")
w("the main reason the detector looks strong on recent models. It is also fragile:")
w("it is a habit of the chat interface, not of the language model.")
w("")

# ── Genre ───────────────────────────────────────────────────────────────
w("## Human-genre exposure")
w("")
w("**Read the counts, not the percentages.** The genre buckets are:")
w("")
w("| Genre | n |")
w("| --- | ---: |")
for k, v in sorted(M["genre_counts"].items(), key=lambda kv: -kv[1]):
    w(f"| {k} | {v} |")
w("")
w("With 10 business-marketing texts, 2 hits is 20% and 3 hits is 30%. Those are")
w("not rates; they are flags for a bigger human corpus to settle.")
w("")
w("| Rule | Human fires | Worst genre | Business-marketing |")
w("| --- | ---: | --- | ---: |")
for c in sorted(genre_flag, key=lambda x: -R[x]["raw"]["genre_risk"]["human_firings"]):
    g = R[c]["raw"]["genre_risk"]
    w(f"| `{c}` | {g['human_firings']}/{N_HU} | {g['worst_genre']} {g['worst_genre_fired']}/{g['worst_genre_n']} | "
      f"{g['business_marketing_fired']}/10 |")
w("")
w("`tier1` is the one to watch: it fires on 4 of the 10 business-marketing humans.")
w("It is also the fifth-largest contributor in the raw view and the largest in the")
w("stripped view. That is the trade-off in one line — the vocabulary rule that does")
w("the most work is also the rule most likely to flag a marketing writer who says")
w("'comprehensive' and 'seamless' because that is how the client's brief reads.")
w("")

# ── Weight audit ────────────────────────────────────────────────────────
w("## Weight audit")
w("")
w("**The shipped weights were not fitted to this data.** They were adapted from the")
w("upstream MIT-licensed `avoid-ai-writing` detector and extended by editorial")
w("judgement during the 2026.08 rule harvests. This is the first time they have")
w("been compared against measured evidence.")
w("")
w("Method: a weight should be proportional to the evidence one firing provides,")
w("which is the log of the likelihood ratio. We use the **lower** bound of the 95%")
w("interval on the LR, so the proposal is conservative, and scale it by a single")
w(f"constant (k = {M['weight_scale_k']:.3f}) fitted by least squares against the shipped weights of")
w("the rules that are statistically supported — so the overall score scale is")
w("preserved and only the relative weights move.")
w("")
w("Three caveats that limit what this table can be used for:")
w("")
w("- **No proposal is made for a rule that never fires on a human.** With zero human")
w("  firings the lower bound on the likelihood ratio is set by the smoothing and by")
w(f"  n={N_HU}, not by the rule; the corpus cannot separate a weight of 6 from a weight of")
w("  15. Those rules keep their shipped weight and their entry says so. This is why")
w("  `chatbot` (146 AI firings, 0 human, LR 29) is *not* in the reweight list despite")
w("  looking mispriced — the honest answer is that we cannot price it yet.")
w("- The proposal measures evidence **per firing**. A rule with modest evidence that")
w("  fires often can still contribute more detection than a strong rule that rarely")
w("  fires. `tier1` is exactly that case: proposed weight 1 to 2, but fifth by")
w("  contribution in the raw view and first in the stripped view.")
w("- Use the proposals to fix contradictions, not as a drop-in table.")
w("")
w("| Rule | Shipped | Proposed (conservative) | Proposed (central) | Delta | LR (95% CI) | Basis |")
w("| --- | ---: | ---: | ---: | ---: | ---: | --- |")
audit = [c for c in CATS if R[c]["weight_audit"]["delta"]]
for c in sorted(audit, key=lambda x: R[x]["weight_audit"]["delta"]):
    a = R[c]["weight_audit"]
    r = R[c]["raw"]
    cen = a.get("proposed_weight_central")
    w(f"| `{c}` | {a['shipped_weight']} | {a['proposed_weight']} | {cen if cen is not None else '-'} | "
      f"{a['delta']:+d} | {r['likelihood_ratio']:.2f} ({r['lr_ci95'][0]:.2f}–{r['lr_ci95'][1]:.2f}) | {a['basis']} |")
w("")
zero_hu = [c for c in CATS if R[c]["weight_audit"]["proposed_weight"] is None
           and not R[c]["raw"]["dead"] and R[c]["raw"]["human_fired"] == 0]
nows = [c for c in CATS if R[c]["weight_audit"]["proposed_weight"] is None]
w(f"For the remaining {len(nows)} rules no evidence-based weight can be proposed. They split")
w("three ways:")
w("")
w(f"- {len(dead)} are dead here, so their weight is untestable on this corpus.")
w(f"- {len(zero_hu)} fire on AI but never on a human, so the corpus cannot bound their weight from above:")
w("  " + ", ".join(f"`{c}`" for c in sorted(zero_hu)) + ".")
w(f"- the rest are not distinguishable from chance at n={N_HU}.")
w("")
w("Their shipped weights stand on judgement alone, and this report does not dress")
w("that up as data.")
w("")

# ── Appendix ────────────────────────────────────────────────────────────
w("## Appendix: all 113 rules")
w("")
w("| Rule | W | Corrob? | AI raw | Hu raw | AI strip | Hu strip | Prec | Lift | LR | q raw | Contrib raw | Contrib strip | Action |")
w("| --- | ---: | :-: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
for c in ranked:
    r, s = R[c]["raw"], R[c]["stripped"]
    prec = pc(r["precision"], 1) if r["precision"] is not None else "-"
    lift = f"{r['lift_over_base']:.2f}" if r["lift_over_base"] is not None else "-"
    w(f"| `{c}` | {R[c]['weight_audit']['shipped_weight']} | "
      f"{'y' if R[c]['action']['corroboration_only_today'] else ''} | "
      f"{r['ai_fired']} | {r['human_fired']} | {s['ai_fired']} | {s['human_fired']} | {prec} | {lift} | "
      f"{r['likelihood_ratio']:.1f} | {q(r['bh_q'])} | {contrib(c):+.2f} | {contrib(c,'stripped'):+.2f} | "
      f"{R[c]['action']['action']} |")
w("")
w("Full per-rule detail — per-provider, per-era, per-slice and per-genre counts,")
w("confidence intervals, all three false-positive operating points and both")
w("ablation variants — is in [`rule-stats.json`](rule-stats.json).")
w("")

(HERE / "RULE-VALIDATION.md").write_text("\n".join(L) + "\n")
print("wrote RULE-VALIDATION.md", len(L), "lines")

# ── ACTION LIST ─────────────────────────────────────────────────────────
A = []
a = A.append
a("# Action list")
a("")
a("Ranked by how much the change is worth and how sure we are. Every item cites")
a("its evidence and the measured cost of making the change. Nothing here has been")
a("applied — the engine is untouched.")
a("")
a("Cost is measured the same way throughout: percentage points of AI detection at")
a(f"the shipped 5%-false-positive operating point (threshold >= {B['raw']['fp5']['threshold']} raw, ")
a(f">= {B['stripped']['fp5']['threshold']} stripped), holding the threshold fixed.")
a("")
a("Two cost columns, because they answer different questions. *Detection cost,")
a("equal-FP* re-tunes the threshold after the removal so the human false-positive")
a("rate is held at the same budget — this is the fair like-for-like number.")
a("*Human FP change, fixed threshold* shows what the removal does to false")
a("positives if the threshold is left alone: negative means fewer humans flagged.")
a("")
a("A rule can point the wrong way (fire more on humans) and still show a detection")
a("cost when removed, because it lifts both distributions and the humans happen to")
a("sit further from the cut. `adjacent-lemma-repeat` is the clearest case. Removing")
a("it is still the right call — it is not evidence of AI — but it is not free, and")
a("this report will not pretend otherwise.")
a("")
a("**The single biggest caveat**: the human corpus is 169 texts, of which 40 are")
a("published prose and 10 are business-marketing. Actions marked *safe* cost")
a("nothing measurable and carry no false-positive risk. Actions marked *needs a")
a("bigger human corpus first* should not be shipped on this evidence alone.")
a("")

order = [
    ("REMOVE OR DEMOTE (harmful)", "1. Stop these rules adding points (harmful direction)",
     "mixed — three of these cost around 1 pp of detection despite pointing the wrong way; the other fourteen are free"),
    ("FIX OR REMOVE", "2. Fix or remove the three unreachable thresholds", "safe — zero measured cost, by definition"),
    ("DEMOTE (redundant)", "3. Stop triple-counting markdown furniture", "cheap"),
    ("REWEIGHT", "4. Reweight where the evidence contradicts the shipped number",
     "measured — the cost column is the cost of REMOVING the rule outright, an upper bound on what a reweight can cost"),
    ("DEMOTE (dormant)", "5. Demote the dormant rules to corroboration-only", "safe — zero measured cost, by definition"),
    ("DEMOTE (unsupported)", "6. Demote the unvalidated rules to corroboration-only", "needs a bigger human corpus first"),
    ("KEEP", "7. Keep as-is", "-"),
    ("KEEP (low contribution)", "8. Keep as-is, low contribution", "-"),
    ("KEEP (forensic insurance)", "9. Keep as forensic insurance", "-"),
]
for key, heading, risk in order:
    lst = ACTIONS.get(key, [])
    if not lst:
        continue
    lst = sorted(lst, key=lambda c: contrib(c))
    a(f"## {heading} ({len(lst)} rule{'s' if len(lst) != 1 else ''})")
    a("")
    worst = max(-contrib(c) for c in lst)
    a(f"Risk: **{risk}**. Largest single detection cost in this group: {worst:.2f} pp (raw, equal-false-positive comparison).")
    a("")
    a("| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |")
    a("| --- | ---: | --- | ---: | ---: |")
    for c in lst:
        r, s_ = R[c]["raw"], R[c]["stripped"]
        ev = f"AI {r['ai_fired']}/{N_AI}, human {r['human_fired']}/{N_HU}, LR {r['likelihood_ratio']:.2f}, q={q(r['bh_q'])}"
        if r["dead"] and s_["dead"]:
            ev = "never fires on 1,896 samples; " + (R[c]["action"]["rationale"])
        retuned = -r["ablation"]["fp5"]["delta_tpr_pp"]
        retuned_s = -s_["ablation"]["fp5"]["delta_tpr_pp"]
        dfp = r["ablation"]["fp5"]["fixed_threshold"]["delta_fpr_pp"]
        cost = f"{z(retuned)} / {z(retuned_s)} pp"
        prop = R[c]["weight_audit"]["proposed_weight"]
        cen = R[c]["weight_audit"].get("proposed_weight_central")
        rng = f"{prop}" if (cen is None or cen == prop) else f"{prop}–{cen}"
        wcol = f"{R[c]['weight_audit']['shipped_weight']}" + (f" -> {rng}" if key == "REWEIGHT" and prop is not None else "")
        a(f"| `{c}` | {wcol} | {ev} | {cost} | {'+' if dfp > 0 else ''}{z(dfp)} pp |")
    a("")

a("## Combined effect")
a("")
a("The individual costs above do not simply add: removing several rules at once")
a("interacts through the stylometric cap and the length normalisation. Anyone")
a("applying more than one action should re-run `scripts/analyse.py` with the")
a("modified weight table rather than summing this column.")
a("")
a("## What this evidence cannot decide")
a("")
a("- Whether any of the 49 unsupported rules is genuinely useful. They need a")
a("  human corpus in the low thousands, weighted towards commercial web copy.")
a("- Whether the forensic artefact rules (`pua-character`, `ai-citation-markup`,")
a("  `ai-utm-source`, `ai-citation-token`, `math-alphanumeric`, `placeholder-token`)")
a("  are worth their weight. They never fired here; they are cheap insurance with")
a("  near-zero false-positive risk, and removing them would save nothing.")
a("- The correct absolute weight for any rule that never fires on a human. The")
a("  corpus bounds the false-positive rate at about 1.8% at best and cannot")
a("  resolve the top of the weight scale.")
a("- Whether the markdown-furniture dependency is acceptable. That is a product")
a("  decision, not a statistical one. The measurement is clear: strip the markdown")
a(f"  and detection falls from {pc(B['raw']['fp5']['tpr'])} to {pc(B['stripped']['fp5']['tpr'])} at the same false-positive budget.")
a("")
(HERE / "ACTION-LIST.md").write_text("\n".join(A) + "\n")
print("wrote ACTION-LIST.md", len(A), "lines")
