"""Render every results/*.json into the markdown tables SIGNAL-SCIENCE.md cites.

Kept separate from the analysis so a table can be regenerated without recomputing
anything, and so every number in the flagship document has one traceable source.
"""
from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "results")
T = os.path.join(HERE, "tables")

PRETTY = {
    "lex_mattr_100": "vocabulary variety in a 100-word window (MATTR)",
    "lex_ttr_first400": "type-token ratio, first 400 words",
    "lex_hapax_rate": "share of vocabulary used exactly once",
    "lex_dis_rate": "share of vocabulary used exactly twice",
    "lex_yule_k": "Yule's K (repetition concentration)",
    "lex_distinct2": "distinct word pairs / word pairs",
    "lex_distinct3": "distinct word triples / word triples",
    "lex_repeat_trigram_rate": "repeated word-triple rate",
    "lex_top_content_share": "share of text in its 50 commonest words",
    "lex_short_word_rate": "words of 3 letters or fewer",
    "lex_long_word_rate": "words of 8 letters or more",
    "lex_mean_word_len": "mean word length",
    "lex_function_word_rate": "function-word rate",
    "lex_cliche_word_rate": "'AI vocabulary' words per 1,000",
    "lex_cliche_phrase_rate": "'AI phrases' per 1,000 words",
    "lex_discourse_marker_rate": "discourse markers per 1,000 words",
    "lex_hedge_rate": "hedges per 1,000 words",
    "lex_booster_rate": "intensifiers per 1,000 words",
    "lex_1sg_rate": "first-person singular per 1,000 words",
    "lex_2p_rate": "second person per 1,000 words",
    "lex_contraction_rate": "contractions per 1,000 words",
    "dis_adjacent_sent_cohesion": "content-word overlap between neighbouring sentences",
    "dis_para_jaccard_mean": "content-word overlap between paragraphs",
    "syn_mean_sent_len": "mean sentence length",
    "syn_sd_sent_len": "sentence-length standard deviation",
    "syn_cv_sent_len": "sentence-length coefficient of variation",
    "syn_distinct_opener_ratio": "distinct sentence openers / sentences",
    "syn_passive_approx_rate": "passive constructions per sentence (approx)",
    "syn_comma_per_sent": "commas per sentence",
    "syn_subordinator_rate": "subordinators per 1,000 words",
    "rhy_burstiness": "burstiness of sentence lengths",
    "rhy_spectral_flatness": "spectral flatness of the sentence-length series",
    "rhy_autocorr_lag1": "sentence-length autocorrelation, lag 1",
    "rhy_cv_para_words": "paragraph-length variation (CV)",
    "rhy_masd_norm": "mean successive sentence-length change",
    "inf_word_entropy": "word-unigram entropy",
    "inf_compress_ratio": "gzip compression ratio",
    "inf_compress_ratio_words": "gzip compression ratio, words only",
    "inf_uid_masd": "surprisal change between adjacent words",
    "inf_uid_sent_var": "between-sentence surprisal variance",
    "inf_bigram_surprisal_sd": "word-pair surprisal spread",
    "inf_surprisal_sd": "word surprisal spread",
    "inf_rare_word_rate": "rare-word rate",
    "pun_emdash_per1kw": "em dashes per 1,000 words",
    "pun_curly_share": "share of quotes/apostrophes that are curly",
    "pun_rule_of_three_rate": "'X, Y and Z' lists per 1,000 words",
    "pun_semicolon_per1kc": "semicolons per 1,000 characters",
    "pun_colon_per1kc": "colons per 1,000 characters",
    "fmt_md_heading_rate": "markdown headings per line",
    "fmt_md_bullet_rate": "markdown bullets per line",
    "fmt_md_bold_rate": "markdown bold spans per 1,000 words",
    "fmt_any_markdown": "any markdown present",
    "pun_hash_per1kc": "'#' per 1,000 characters",
    "pun_asterisk_per1kc": "'*' per 1,000 characters",
    "dis_conclusion_marker": "closes with a summary marker",
    "lex_to_rate": "'to' per 1,000 words", "lex_of_rate": "'of' per 1,000 words",
    "lex_a_rate": "'a' per 1,000 words", "lex_the_rate": "'the' per 1,000 words",
    "lex_and_rate": "'and' per 1,000 words", "lex_that_rate": "'that' per 1,000 words",
    "lex_is_rate": "'is' per 1,000 words", "lex_it_rate": "'it' per 1,000 words",
    "lex_3p_rate": "third person per 1,000 words",
    "lex_1pl_rate": "first-person plural per 1,000 words",
    "lex_propernoun_approx_rate": "capitalised non-initial words (proper nouns, approx)",
    "lex_digit_token_rate": "tokens containing a digit",
    "inf_compress_ratio_alpha": "gzip compression ratio, letters only",
    "inf_word_entropy_norm": "word entropy, normalised by vocabulary size",
    "inf_surprisal_mean": "mean word surprisal", "inf_surprisal_p95": "95th-percentile word surprisal",
    "inf_bigram_surprisal_mean": "mean word-pair surprisal",
    "inf_bigram_known_rate": "share of word pairs seen in the background corpus",
    "pun_emdash_per1kc": "em dashes per 1,000 characters",
    "pun_lparen_per1kc": "opening parentheses per 1,000 characters",
    "pun_hyphen_per1kc": "hyphens per 1,000 characters",
    "pun_comma_per1kc": "commas per 1,000 characters",
    "pun_straight_apos_per1kc": "straight apostrophes per 1,000 characters",
    "pun_curly_apos_per1kc": "curly apostrophes per 1,000 characters",
    "pun_double_space_rate": "double space after a full stop, per 1,000 characters",
    "pun_ellipsis_any": "ellipses per 1,000 words",
    "fmt_allcaps_rate": "ALL-CAPS words", "fmt_md_numlist_rate": "numbered-list lines",
    "fmt_titlecase_line_rate": "short Title Case lines (headings without markup)",
    "fmt_blankline_rate": "blank lines", "fmt_mean_line_len": "mean line length",
    "fmt_url_rate": "URLs per 1,000 words", "fmt_emoji_rate": "emoji per 1,000 words",
    "syn_the_opener_rate": "sentences opening with 'The'",
    "syn_coord_opener_rate": "sentences opening with And/But/So",
    "syn_max_opener_repeat": "commonest sentence opener's share",
    "syn_distinct_opener2_ratio": "distinct two-word openers / sentences",
    "syn_pct_short_sent": "sentences under 10 words",
    "syn_pct_long_sent": "sentences over 30 words",
    "syn_iqr_sent_len": "sentence-length interquartile range",
    "syn_range_sent_len": "sentence-length range", "syn_n_sentences": "sentence count",
    "syn_question_rate": "questions", "syn_exclaim_rate": "exclamations",
    "rhy_n_paragraphs": "paragraph count", "rhy_mean_para_words": "mean paragraph length",
    "rhy_mean_para_sents": "mean sentences per paragraph",
    "rhy_cv_para_sents": "paragraph sentence-count variation (CV)",
    "rhy_sentlen_entropy": "sentence-length distribution entropy",
    "rhy_autocorr_lag2": "sentence-length autocorrelation, lag 2",
    "lex_distinct2": "distinct word pairs / word pairs",
    "lex_dis_rate": "share of vocabulary used exactly twice",
    "dis_first_para_rel_len": "first paragraph length, relative to average",
    "dis_last_para_rel_len": "last paragraph length, relative to average",
}


def name(k):
    return PRETTY.get(k, k)


def w(path, text):
    open(os.path.join(T, path), "w", encoding="utf-8").write(text)
    print("wrote tables/" + path)


def band(d):
    a = abs(d)
    return "negligible" if a < 0.11 else "small" if a < 0.28 else \
        "medium" if a < 0.43 else "large"


def main() -> None:
    os.makedirs(T, exist_ok=True)
    fa = json.load(open(os.path.join(R, "feature-analysis.json")))

    # --- table 1: the full ranked battery ---------------------------------
    for label, key in (("all", "register_and_length_matched"),
                       ("freshlongform", "fresh_longform_register_matched")):
        ov = fa[key]
        n = fa["n_register_matched_pairs"] if label == "all" else fa["n_fresh_matched_pairs"]
        lines = [
            f"# Feature battery — {key.replace('_', ' ')}",
            "",
            f"{n:,} AI documents matched 1:1 to {n:,} human documents on register "
            "family and log word count. Effect sizes are Cliff's delta; `dir` says "
            "whether AI scores high or low. `TPR@1%` is single-feature detection "
            "with the threshold set on the human half so that 1 human in 100 is "
            "wrongly flagged. p-values are Mann-Whitney U, Benjamini-Hochberg "
            "adjusted across all "
            f"{len(ov)} features at q=0.05.",
            "",
            "| rank | signal | AUROC | Cliff's δ | size | TPR@1% FP | TPR@5% FP | dir | median AI | median human | BH p |",
            "|---:|---|---:|---:|---|---:|---:|:--:|---:|---:|---:|",
        ]
        rank = sorted(ov, key=lambda k: -abs(ov[k]["cliffs_delta"]))
        for i, k in enumerate(rank, 1):
            d = ov[k]
            p = d["p_bh_adjusted"]
            ps = "<1e-300" if p == 0 else f"{p:.1e}"
            lines.append(
                f"| {i} | {name(k)} `{k}` | {max(d['auroc'],1-d['auroc']):.3f} | "
                f"{d['cliffs_delta']:+.3f} | {band(d['cliffs_delta'])} | "
                f"{d['tpr_at_1pc_fpr']*100:.1f}% | {d['tpr_at_5pc_fpr']*100:.1f}% | "
                f"{d['direction']} | {d['median_ai']:.4g} | {d['median_human']:.4g} | {ps} |")
        w(f"feature-battery-{label}.md", "\n".join(lines) + "\n")

    # --- table 2: per register ---------------------------------------------
    fams = fa["by_register_family"]
    top = fa["top30_by_effect"][:12]
    lines = ["# Top signals by register family", "",
             "AUROC, oriented so 0.5 is useless and 1.0 is perfect. Each register "
             "compares that register's AI documents against that register's human "
             "documents only.", "",
             "| register | n AI | n human | " + " | ".join(name(k) for k in top) + " |",
             "|---|---:|---:|" + "---:|" * len(top)]
    for fam, d in sorted(fams.items()):
        F = d["features"]
        cells = []
        for k in top:
            if k in F:
                a = F[k]["auroc"]
                cells.append(f"{max(a, 1-a):.3f}")
            else:
                cells.append("–")
        lines.append(f"| {fam} | {d['n_ai']:,} | {d['n_human']:,} | " + " | ".join(cells) + " |")
    w("by-register.md", "\n".join(lines) + "\n")

    # --- table 3: evasion axes ---------------------------------------------
    out = ["# Top signals by provider, prompt style, model tier and era", "",
           "Oriented AUROC. Each AI group is compared against the same full human "
           "pool, so the columns are comparable with each other. The era rows are "
           "the weakest of these breakdowns: different eras were sampled from "
           "different sources with different register mixes, so an era difference "
           "is partly a source difference and should not be read as drift.", ""]
    for sec, title in (("by_prompt_style", "Prompt style"),
                       ("by_model_tier", "Model tier"),
                       ("by_provider", "Provider"),
                       ("by_era", "Era")):
        out += [f"## {title}", "",
                "| group | n | " + " | ".join(name(k) for k in top) + " |",
                "|---|---:|" + "---:|" * len(top)]
        for g, d in sorted(fa[sec].items(), key=lambda x: -x[1]["n"]):
            F = d["features"]
            cells = []
            for k in top:
                if k in F:
                    a = F[k]["auroc"]
                    cells.append(f"{max(a, 1-a):.3f}")
                else:
                    cells.append("–")
            out.append(f"| {g} | {d['n']:,} | " + " | ".join(cells) + " |")
        out.append("")
    w("by-evasion-axis.md", "\n".join(out) + "\n")

    # --- table 4: the famous heuristics ------------------------------------
    FAMOUS = [
        ("rhy_burstiness", "Burstiness of sentence length — GPTZero's headline metric"),
        ("syn_cv_sent_len", "Sentence-length coefficient of variation"),
        ("syn_sd_sent_len", "Sentence-length standard deviation ('perplexity's partner')"),
        ("lex_cliche_word_rate", "'AI vocabulary' — delve, leverage, robust, tapestry…"),
        ("lex_cliche_phrase_rate", "'AI phrases' — in today's…, it's not just…, dive into…"),
        ("lex_discourse_marker_rate", "Discourse markers — moreover, furthermore…"),
        ("pun_rule_of_three_rate", "The 'rule of three' list"),
        ("dis_conclusion_marker", "Closing with 'in conclusion' / 'ultimately'"),
        ("syn_passive_approx_rate", "Passive voice"),
        ("lex_hedge_rate", "Hedging language"),
        ("lex_booster_rate", "Intensifiers"),
        ("pun_emdash_per1kw", "The em dash"),
        ("pun_curly_share", "Curly quotes and apostrophes"),
        ("fmt_any_markdown", "Any markdown formatting present"),
        ("inf_compress_ratio", "Compression ratio"),
        ("rhy_spectral_flatness", "Spectral flatness of the rhythm series"),
        ("inf_uid_masd", "Uniform information density (adjacent-word surprisal change)"),
        ("inf_uid_sent_var", "Uniform information density (between-sentence variance)"),
    ]
    M, Fx = fa["register_and_length_matched"], fa["fresh_longform_register_matched"]
    lines = ["# The famous heuristics, measured", "",
             f"Matched corpus: {fa['n_register_matched_pairs']:,} AI vs "
             f"{fa['n_register_matched_pairs']:,} human, register and length matched. "
             f"Fresh long-form: {fa['n_fresh_matched_pairs']:,} pairs from data no "
             "model on this project has seen.", "",
             "| heuristic | AUROC | Cliff's δ | size | TPR@1% FP | fresh AUROC | fresh TPR@1% | verdict |",
             "|---|---:|---:|---|---:|---:|---:|---|"]
    for k, lab in FAMOUS:
        if k not in M:
            continue
        d, e = M[k], Fx.get(k, {})
        a = max(d["auroc"], 1 - d["auroc"])
        ea = max(e.get("auroc", 0.5), 1 - e.get("auroc", 0.5))
        verdict = ("worthless" if a < 0.56 and d["tpr_at_1pc_fpr"] < 0.05 else
                   "weak" if a < 0.65 else "moderate" if a < 0.75 else "strong")
        lines.append(
            f"| {lab} `{k}` | {a:.3f} | {d['cliffs_delta']:+.3f} | "
            f"{band(d['cliffs_delta'])} | {d['tpr_at_1pc_fpr']*100:.1f}% | {ea:.3f} | "
            f"{e.get('tpr_at_1pc_fpr', float('nan'))*100:.1f}% | **{verdict}** |")
    w("famous-heuristics.md", "\n".join(lines) + "\n")

    # --- table 5: redundancy ------------------------------------------------
    c = fa["top_feature_correlation"]
    lines = ["# Are the top signals independent?", "",
             "Pearson correlation between the strongest signals across all "
             f"{fa['n_ai'] + fa['n_human']:,} analysed documents. Mean absolute "
             f"off-diagonal correlation: **{c['spearman_abs_mean']:.3f}**.", "",
             "| | " + " | ".join(f"{i+1}" for i in range(len(c["features"]))) + " |",
             "|---|" + "---:|" * len(c["features"])]
    for i, k in enumerate(c["features"]):
        lines.append(f"| {i+1}. {name(k)} | " +
                     " | ".join(f"{v:+.2f}" for v in c["matrix"][i]) + " |")
    w("signal-redundancy.md", "\n".join(lines) + "\n")

    # --- scorecard ---------------------------------------------------------
    p = os.path.join(R, "scorecard-eval.json")
    if os.path.exists(p):
        sc = json.load(open(p))
        univ = sc.get("univariate_auroc_fresh_matched", {})
        lines = []
        for cardkey, title, blurb in (
            ("scorecard_prose_only", "THE SCORECARD (prose-only — the one to ship)",
             "Every formatting feature is withheld from this variant. Markdown "
             "headings, bullets and bold tell you where text was pasted from, not "
             "who wrote it, and a model that leans on them scores well here and "
             "fails on prose pasted out of a CMS. Withholding them made this "
             "model **better**, not worse: see `transparent-vs-neural.md`."),
            ("scorecard", "THE SCORECARD (unrestricted — formatting allowed in)",
             "Fitted with the whole battery available, including formatting. Kept "
             "for comparison, and as the evidence that formatting features cost "
             "accuracy on unseen prose rather than buying it.")):
            if cardkey not in sc:
                continue
            card = sc[cardkey]
            wts = list(zip(card["features"], card["weights"]))
            wts.sort(key=lambda x: -abs(x[1]))
            lines += [f"# {title}", "", blurb, "",
                      "Every weight is the change in log-odds of 'machine-written' "
                      "per one standard deviation of that feature, measured against "
                      "the training distribution. `alone` is the same feature's own "
                      "AUROC as a single detector on fresh matched long-form: where "
                      "a feature is strong alone but carries a small weight, its "
                      "evidence is already being counted by a correlated neighbour.",
                      "",
                      f"Fitted on {sc['splits'].get('train', 0):,} documents — the "
                      "same training split the cycle-2 neural model used. Intercept "
                      f"**{card['intercept']:+.4f}**.", "",
                      "| # | signal | weight (log-odds per SD) | alone (AUROC) | direction |",
                      "|---:|---|---:|---:|---|"]
            for i, (k, wt) in enumerate(wts, 1):
                u = univ.get(k)
                lines.append(f"| {i} | {name(k)} `{k}` | {wt:+.4f} | "
                             f"{u:.3f} | " if u else
                             f"| {i} | {name(k)} `{k}` | {wt:+.4f} | – | ")
                lines[-1] += f"{'more ⇒ machine' if wt > 0 else 'more ⇒ human'} |"
            lines += ["", "## Arithmetic", "",
                      "```", "clip each raw feature to its [1st, 99th] training percentile",
                      "z_i       = (x_i - mean_i) / sd_i",
                      "log_odds  = intercept + Σ weight_i × z_i",
                      "score     = 1 / (1 + exp(-log_odds))", "```", "",
                      "The constants are in `results/scorecard-model.json`. Nothing "
                      "else is involved: no hidden layer, no embedding, no lookup "
                      "the reader cannot see.", "", "---", ""]
        w("scorecard.md", "\n".join(lines) + "\n")
        card = sc["scorecard"]
        _unused = ["# THE SCORECARD", "",
                 "The transparent classifier in full. Every weight is a change in "
                 "log-odds of 'machine-written' per one standard deviation of that "
                 "feature, measured against the training distribution. A positive "
                 "weight means more of that feature is more machine-like.", "",
                 f"Fitted on {sc['splits'].get('train', 0):,} documents — the same "
                 "training split the cycle-2 neural model used. Intercept "
                 f"**{card['intercept']:+.4f}**.", "",
                 "| # | signal | weight (log-odds per SD) | direction |",
                 "|---:|---|---:|---|"]
        for i, (k, wt) in enumerate(wts, 1):
            lines.append(f"| {i} | {name(k)} `{k}` | {wt:+.4f} | "
                         f"{'more ⇒ machine' if wt > 0 else 'more ⇒ human'} |")
        lines += ["", "## Arithmetic", "",
                  "```", "clip each raw feature to its [1st, 99th] training percentile",
                  "z_i       = (x_i - mean_i) / sd_i",
                  "log_odds  = intercept + Σ weight_i × z_i",
                  "score     = 1 / (1 + exp(-log_odds))", "```", "",
                  "The constants are in `results/scorecard-model.json`. Nothing else "
                  "is involved: no hidden layer, no embedding, no lookup the reader "
                  "cannot see."]
        ev = sc["evaluation"].get("fresh_longform", {})
        lines = ["# Transparent versus neural, on identical held-out data", "",
                 "Fresh long-form corpus: "
                 f"{ev.get('scorecard', {}).get('n_ai', 0):,} AI documents from "
                 "current models against "
                 f"{ev.get('scorecard', {}).get('n_human', 0):,} human documents. "
                 "Neither model was trained on any of it. Detection rates at each "
                 "human false-positive budget; the threshold is set on that split's "
                 "human half.", "",
                 "| model | what it is | AUROC | @1% FP | @2% FP | @3% FP | @5% FP | @9% FP |",
                 "|---|---|---:|---:|---:|---:|---:|---:|"]
        WHAT = {"scorecard": f"{card['n_features']} readable features, additive",
                "scorecard_prose_only": f"{sc.get('scorecard_prose_only',{}).get('n_features',0)} readable features, no formatting, additive",
                "lr_full": "all 122 features, additive",
                "gbt": "all 122 features, gradient-boosted trees",
                "neural_cycle2": "e5-small transformer, 33M parameters (deployed)"}
        for m in ("scorecard_prose_only", "scorecard", "lr_full", "gbt", "neural_cycle2"):
            if m not in ev:
                continue
            d = ev[m]
            cells = "".join(f" {d['thresholds'][b]['tpr']*100:.1f}% |"
                            for b in ("1%", "2%", "3%", "5%", "9%"))
            lines.append(f"| **{m}** | {WHAT[m]} | {d['auroc']:.3f} |{cells}")
        fb = sc["evaluation"].get("human_battery_fpr", {})
        if fb:
            n = fb.get("scorecard", {}).get("n_human", 0)
            lines += ["", "## False positives on an independent human corpus", "",
                      f"{n:,} human documents from `tests/battery/human-corpus-v*.json` "
                      "— modern web, business, marketing, academic and non-native "
                      "English writing, held under an evaluation-only licence and "
                      "never trained on by any model here. Thresholds are the ones "
                      "fitted on the fresh long-form human half above, so this "
                      "measures whether a budget set on one human population holds "
                      "on another.", "",
                      "| model | @1% budget | @2% | @3% | @5% | @9% |",
                      "|---|---:|---:|---:|---:|---:|"]
            for m, d in fb.items():
                if "fpr_at_budget" not in d:
                    continue
                lines.append(f"| **{m}** | " + " | ".join(
                    f"{d['fpr_at_budget'][b]*100:.2f}%"
                    for b in ("1%", "2%", "3%", "5%", "9%")) + " |")
            nd = fb.get("neural_cycle2")
            if nd:
                lines.append(f"| **neural_cycle2** | at the shipped 0.984 threshold: "
                             f"**{nd['fpr_at_deployed_0984']*100:.2f}%** "
                             f"(n={nd['n_human']:,}) | | | | |")
        bd = sc.get("breakdowns_fresh", {}).get("register_family", {})
        if bd:
            ms = ["scorecard_prose_only", "scorecard", "gbt", "neural_cycle2"]
            lines += ["", "## Detection by register, at a 1% false-positive budget", "",
                      "| register | n AI | " + " | ".join(ms) + " |",
                      "|---|---:|" + "---:|" * len(ms)]
            for g, d in sorted(bd.items()):
                lines.append(f"| {g} | {d['n']:,} | " + " | ".join(
                    f"{d[m]['1%']*100:.1f}%" if m in d else "–" for m in ms) + " |")
        e = sc.get("explainability", {})
        if e.get("within_fresh_5fold"):
            wf = e["within_fresh_5fold"]
            lines += ["", "## How much of the black box is explainable?", "",
                      "Ridge and gradient-boosted regressions from the interpretable "
                      "features to the neural model's raw margin, 5-fold "
                      f"cross-validated **within** the fresh held-out set "
                      f"(n = {wf['all_features']['n']:,}). Fitting on the training "
                      "split and testing on fresh data instead measures something "
                      "harsher — whether the explanation survives a distribution "
                      "shift — and is reported below it as the caveat.", "",
                      "| what is used to predict the neural score | R² | Pearson r |",
                      "|---|---:|---:|"]
            LBL = {"all_features": "all 122 interpretable features, linear",
                   "scorecard_features": "the 24 scorecard features, linear",
                   "prose_only_features": "the 24 prose-only features, linear"}
            for k, lab in LBL.items():
                if k in wf:
                    lines.append(f"| {lab} | {wf[k]['linear_r2']:.3f} | "
                                 f"{wf[k]['linear_pearson']:.3f} |")
            if "gbt_r2" in wf.get("all_features", {}):
                lines.append(f"| all 122 features, gradient-boosted (non-linear) | "
                             f"{wf['all_features']['gbt_r2']:.3f} | "
                             f"{wf['all_features']['gbt_pearson']:.3f} |")
            for side in ("ai", "human"):
                k = "within_fresh_" + side
                if k in e and "all_features" in e[k]:
                    d = e[k]["all_features"]
                    lines.append(f"| all 122 features, within {side} documents only "
                                 f"(n={d['n']:,}) | {d['linear_r2']:.3f} | "
                                 f"{d['linear_pearson']:.3f} |")
            tr = e.get("all_features", {}).get("fresh_heldout", {})
            if tr:
                lines.append(f"| _caveat: fitted on the training split, tested on "
                             f"fresh data_ | {tr['r2']:.3f} | {tr['pearson_r']:.3f} |")
        w("transparent-vs-neural.md", "\n".join(lines) + "\n")

    # --- baselines ---------------------------------------------------------
    p = os.path.join(R, "baselines.json")
    if os.path.exists(p):
        b = json.load(open(p))
        NAMES = {
            "gltr_top10": "GLTR — share of tokens in the observer's top 10",
            "gltr_top100": "GLTR — share in top 100",
            "gltr_top1000": "GLTR — share in top 1,000",
            "gltr_beyond1000": "GLTR — share beyond rank 1,000",
            "mean_loglik": "mean log-likelihood (the classic perplexity baseline)",
            "log_perplexity": "log perplexity",
            "mean_logrank": "mean log rank (DetectGPT baseline)",
            "mean_entropy": "mean predictive entropy",
            "fast_detectgpt": "**Fast-DetectGPT** conditional-probability curvature",
            "self_binoculars": "*self*-Binoculars (degenerate: one model in both roles)",
            "surprisal_sd": "DivEye-inspired: surprisal spread",
            "surprisal_skew": "DivEye-inspired: surprisal skew",
            "surprisal_kurt": "DivEye-inspired: surprisal kurtosis",
            "surprisal_autocorr1": "DivEye-inspired: surprisal autocorrelation",
        }
        lines = ["# Published open-source methods on our modern corpus", "",
                 f"{b['n_ai']:,} AI and {b['n_human']:,} human long-form documents, "
                 "none seen by any model on this project. Observer model: "
                 f"{b['observer_model']}. AUROC is oriented so 0.5 is useless.", "",
                 "| method | AUROC | TPR@1% FP | TPR@5% FP | dir |",
                 "|---|---:|---:|---:|:--:|"]
        for k in sorted(b["methods"], key=lambda k: -b["methods"][k]["auroc_oriented"]):
            d = b["methods"][k]
            lines.append(f"| {NAMES.get(k, k)} | {d['auroc_oriented']:.3f} | "
                         f"{d['tpr_at_1pc_fpr']*100:.1f}% | "
                         f"{d['tpr_at_5pc_fpr']*100:.1f}% | {d['direction']} |")
        w("open-source-baselines.md", "\n".join(lines) + "\n")

    # --- model probe --------------------------------------------------------
    p = os.path.join(R, "model-probe.json")
    if os.path.exists(p):
        mp = json.load(open(p))
        n = mp["ablation_n"]
        lines = ["# Ablation: what moves the deployed model's score", "",
                 f"{n['ai']:,} AI and {n['human']:,} human long-form documents, each "
                 "altered one way at a time and re-scored through the deployed "
                 "artefact. 'flag rate' is the share crossing the shipped 0.984 "
                 "threshold. A large shift proves the model is *sensitive* to what "
                 "was changed; it does not prove that is the model's reason.", "",
                 "| change applied | AI flagged before → after | human FP before → after | mean margin shift (AI) | mean margin shift (human) |",
                 "|---|---:|---:|---:|---:|"]
        for k, d in mp["ablations"].items():
            a, h = d["ai"], d["human"]
            lines.append(
                f"| `{k}` | {a['flag_rate_before']*100:.1f}% → **{a['flag_rate_after']*100:.1f}%** "
                f"| {h['flag_rate_before']*100:.2f}% → **{h['flag_rate_after']*100:.2f}%** "
                f"| {a['mean_delta_margin']:+.3f} | {h['mean_delta_margin']:+.3f} |")
        occ = mp["occlusion"]
        lines += ["", "# Sentence occlusion", "",
                  f"Every sentence deleted in turn from {occ['n_docs']} documents: "
                  f"{occ['n_sentences']:,} deletions. Attribution is the drop in the "
                  "model's margin when that sentence is removed, so a positive value "
                  "means the sentence was pushing the document towards 'machine'.", "",
                  f"- Share of sentences with positive attribution: **{occ['share_positive']*100:.1f}%**",
                  f"- Absolute attribution concentrated in the top fifth of sentences: "
                  f"**{occ['top_quintile_share_of_absolute_attribution']*100:.1f}%**",
                  f"- Correlation between a sentence's position in the document and its "
                  f"attribution: **{occ['position_spearman']:+.3f}**", "",
                  "| what the deleted sentence looked like | Spearman ρ with attribution |",
                  "|---|---:|"]
        c = occ["sentence_feature_correlation"]
        for k in sorted(c, key=lambda k: -abs(c[k]["spearman"]))[:20]:
            lines.append(f"| {name(k)} `{k}` | {c[k]['spearman']:+.3f} |")
        if "score_feature_correlation" in mp:
            for lab, title in (("fresh_longform", "across both sides"),
                               ("fresh_within_ai", "within AI documents only"),
                               ("fresh_within_human", "within human documents only")):
                if lab not in mp["score_feature_correlation"]:
                    continue
                blk = mp["score_feature_correlation"][lab]
                lines += ["", f"# What the deployed score co-varies with — {title}", "",
                          f"n = {blk['n']:,}. Spearman ρ between the model's raw margin "
                          "and each interpretable feature. Correlation is not mechanism: "
                          "these features are correlated with each other, and the "
                          "across-sides figures partly restate that both track the label.",
                          "", "| signal | ρ |", "|---|---:|"]
                s = blk["spearman"]
                for k in sorted(s, key=lambda k: -abs(s[k]))[:20]:
                    lines.append(f"| {name(k)} `{k}` | {s[k]:+.3f} |")
        w("model-probe.md", "\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
