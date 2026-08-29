"""CYCLE-2 evaluation: shipped model vs cycle-2 model on IDENTICAL held-out data.

Everything here is measured on dataset.jsonl split == "test", which neither
model has seen. The shipped model was trained on the cycle-1 chat corpus; the
cycle-2 model on the cycle-2 train split. Neither trained on these rows.

Outputs eval-results.json (every table the report needs) and prints a summary.
"""
from __future__ import annotations

import collections
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from score_lib import OnnxScorer, probs, margins, thr_for_fpr  # noqa: E402

DATA = os.path.join(HERE, "dataset.jsonl")
MODELS = os.path.join(RESEARCH, "models")
SHIPPED_ONNX = os.path.join(MODELS, "tier3-e5small-int8-perchannel.onnx")
SHIPPED_TOK = os.path.join(RESEARCH, "tier3", "checkpoint")
SHIPPED_THR = 0.857                      # models/tier3-config.json shipping.threshold
CYCLE2_ONNX = os.path.join(MODELS, "tier3-cycle2-e5small-int8-perchannel.onnx")
CYCLE2_TOK = os.path.join(HERE, "cycle2-checkpoint")
BUDGETS = [0.01, 0.02, 0.03, 0.05, 0.09]

# OBJECTIVE.md criterion 1: >=50% detection on EVERY long-form category, not on
# average. These are the owner's categories mapped onto the corpus genre labels.
LONGFORM_CATEGORIES = {
    "blog posts and articles": ["news", "news-piece", "tech-news", "journalism",
                                "seo-blog-post", "blog-editorial", "how-to-guide",
                                "company-blog"],
    "academic essays, lit reviews, discussion": ["academic-essay", "academic-lit-review",
                                                 "academic-discussion", "student-essay",
                                                 "academic"],
    "white papers and research documents": ["scientific-writing", "research-abstract",
                                            "business-report", "scholarly-web"],
    "stories and creative long-form": ["creative-fiction"],
    "company updates, case studies, press releases": ["case-study", "press-release",
                                                      "newsletter", "thought-leadership"],
    "marketing and SEO copy": ["seo-service-page", "landing-page", "category-page",
                               "faq-page", "product-description", "business-marketing",
                               "business-marketing-copy"],
}
FLOOR = 0.50
CACHE = os.path.join(HERE, "scores-cache.json")


def load(split):
    return [json.loads(l) for l in open(DATA) if json.loads(l)["split"] == split]


def auroc(s, y):
    from sklearn.metrics import roc_auc_score
    return float(roc_auc_score(y, s)) if len(set(y)) > 1 else float("nan")


def curve(s_test, y_test, s_cal, y_cal):
    """Two curves. `achievable` sets the threshold on the held-out TEST humans,
    which is the best the model could do if the operating point were perfect.
    `deployable` sets it on CAL humans only - which is what you can actually do
    before seeing the test set - and reports the FPR it really lands at."""
    out = {"achievable": {}, "deployable": {}}
    for b in BUDGETS:
        k = f"{int(b*100)}%"
        t = thr_for_fpr(s_test[y_test == 0], b)
        out["achievable"][k] = {
            "threshold": round(float(t), 6),
            "tpr": round(float((s_test[y_test == 1] >= t).mean()), 4),
            "fpr": round(float((s_test[y_test == 0] >= t).mean()), 4),
            "n_ai": int((y_test == 1).sum()), "n_human": int((y_test == 0).sum()),
        }
        tc = thr_for_fpr(s_cal[y_cal == 0], b)
        out["deployable"][k] = {
            "threshold": round(float(tc), 6),
            "tpr": round(float((s_test[y_test == 1] >= tc).mean()), 4),
            "fpr_realised": round(float((s_test[y_test == 0] >= tc).mean()), 4),
            "n_ai": int((y_test == 1).sum()), "n_human": int((y_test == 0).sum()),
        }
    return out


def breakdown(rows, s, y, thr, key, side):
    """TPR (side='ai') or FPR (side='human') per value of `key`, with denominators."""
    want = 1 if side == "ai" else 0
    buckets = collections.defaultdict(lambda: [0, 0])
    for r, sc, yy in zip(rows, s, y):
        if yy != want:
            continue
        v = str(r.get(key))
        buckets[v][1] += 1
        if sc >= thr:
            buckets[v][0] += 1
    out = {}
    for k, (hit, n) in sorted(buckets.items(), key=lambda x: -x[1][1]):
        out[k] = {"rate": round(hit / n, 4), "n": n, "hits": hit}
    return out


def spread(p):
    return {"p05": round(float(np.percentile(p, 5)), 4),
            "p25": round(float(np.percentile(p, 25)), 4),
            "p50": round(float(np.percentile(p, 50)), 4),
            "p75": round(float(np.percentile(p, 75)), 4),
            "p95": round(float(np.percentile(p, 95)), 4),
            "sd": round(float(np.std(p)), 4),
            "frac_within_0.05_of_median": round(float((np.abs(p - np.median(p)) <= 0.05).mean()), 4)}


def get_scores(name, onnx, tokdir, rows, cache):
    if name in cache and len(cache[name]) == len(rows):
        return np.array(cache[name])
    sc = OnnxScorer(onnx, tokdir, name)
    lg = sc.logits([r["text"] for r in rows])
    cache[name] = lg.tolist()
    json.dump(cache, open(CACHE, "w"))
    return np.array(lg)


def category_of(genre):
    for cat, genres in LONGFORM_CATEGORIES.items():
        if genre in genres:
            return cat
    return None


def main():
    test, cal = load("test"), load("cal")
    for r in test:
        r["longform_category"] = category_of(r["genre"])
    for r in test:
        r["human_set"] = ("human-corpus-v2" if str(r.get("source","")).startswith("battery-")
                          else "supplementary")
    creative = [r for r in test if r.get("eval_only")]
    test = [r for r in test if not r.get("eval_only")]
    print(f"creative long-form held aside (AI only, no matched human set): {len(creative)}")
    y_te = np.array([1 if r["side"] == "ai" else 0 for r in test])
    y_cal = np.array([1 if r["side"] == "ai" else 0 for r in cal])
    print(f"test {len(test)} ({int(y_te.sum())} ai / {int((1-y_te).sum())} human); cal {len(cal)}")

    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    res = {"test_rows": len(test), "test_ai": int(y_te.sum()), "test_human": int((1 - y_te).sum()),
           "cal_rows": len(cal), "budgets": BUDGETS, "models": {}}

    for name, onnx, tokdir in [("shipped", SHIPPED_ONNX, SHIPPED_TOK),
                               ("cycle2", CYCLE2_ONNX, CYCLE2_TOK)]:
        if not os.path.exists(onnx):
            print(f"!! {name}: {onnx} missing, skipping")
            continue
        print(f"== scoring {name} ==", flush=True)
        lg_te = get_scores(f"{name}:test", onnx, tokdir, test, cache)
        lg_cr = get_scores(f"{name}:creative", onnx, tokdir, creative, cache) if creative else None
        lg_cal = get_scores(f"{name}:cal", onnx, tokdir, cal, cache)
        s_te, s_cal = margins(lg_te), margins(lg_cal)
        p_te = probs(lg_te)

        m = {"onnx": os.path.basename(onnx),
             "size_mb": round(os.path.getsize(onnx) / 1e6, 1),
             "test_auroc": round(auroc(s_te, y_te), 4),
             "operating_curve": curve(s_te, y_te, s_cal, y_cal),
             "prob_spread_all": spread(p_te),
             "prob_spread_ai": spread(p_te[y_te == 1]),
             "prob_spread_human": spread(p_te[y_te == 0]),
             "max_human_prob": round(float(p_te[y_te == 0].max()), 4),
             "median_ai_prob": round(float(np.median(p_te[y_te == 1])), 4),
             "humans_above_median_ai": int((p_te[y_te == 0] > np.median(p_te[y_te == 1])).sum()),
             "per_register_auroc": {},
             "longform_categories": {},
             "criteria": {},
             "breakdowns": {}}

        for reg in sorted({r["register"] for r in test}):
            idx = np.array([r["register"] == reg for r in test])
            if len(set(y_te[idx])) > 1:
                m["per_register_auroc"][reg] = {"auroc": round(auroc(s_te[idx], y_te[idx]), 4),
                                                "n": int(idx.sum())}

        for b in BUDGETS:
            k = f"{int(b*100)}%"
            thr = m["operating_curve"]["achievable"][k]["threshold"]
            m["breakdowns"][k] = {
                "tpr_by_register": breakdown(test, s_te, y_te, thr, "register", "ai"),
                "tpr_by_genre": breakdown(test, s_te, y_te, thr, "genre", "ai"),
                "tpr_by_provider": breakdown(test, s_te, y_te, thr, "provider", "ai"),
                "tpr_by_model_tier": breakdown(test, s_te, y_te, thr, "model_tier", "ai"),
                "tpr_by_prompt_style": breakdown(test, s_te, y_te, thr, "prompt_style", "ai"),
                "tpr_by_source": breakdown(test, s_te, y_te, thr, "source", "ai"),
                "tpr_by_edit_level": breakdown(test, s_te, y_te, thr, "edit_level", "ai"),
                "fpr_by_register": breakdown(test, s_te, y_te, thr, "register", "human"),
                "fpr_by_genre": breakdown(test, s_te, y_te, thr, "genre", "human"),
                "fpr_by_source": breakdown(test, s_te, y_te, thr, "source", "human"),
                "fpr_by_era": breakdown(test, s_te, y_te, thr, "era", "human"),
            }

        # ---- OBJECTIVE.md criterion 1: per-category floor, at each budget
        s_cr = margins(lg_cr) if lg_cr is not None else None
        for b in BUDGETS:
            k = f"{int(b*100)}%"
            thr = m["operating_curve"]["achievable"][k]["threshold"]
            cats = {}
            for cat in LONGFORM_CATEGORIES:
                if cat == "stories and creative long-form":
                    if s_cr is None:
                        continue
                    hits = int((s_cr >= thr).sum()); n = len(s_cr)
                else:
                    idx = [i for i, r in enumerate(test)
                           if r.get("longform_category") == cat and r["side"] == "ai"]
                    if not idx:
                        continue
                    hits = int((s_te[idx] >= thr).sum()); n = len(idx)
                cats[cat] = {"rate": round(hits / n, 4), "hits": hits, "n": n,
                             "meets_50pc_floor": bool(hits / n >= FLOOR)}
            m["longform_categories"][k] = cats

        # lowest budget at which EVERY long-form category with n>=20 clears 50%
        passing = None
        for b in BUDGETS:
            k = f"{int(b*100)}%"
            cats = {c: v for c, v in m["longform_categories"][k].items() if v["n"] >= 20}
            if cats and all(v["meets_50pc_floor"] for v in cats.values()):
                passing = k
                break
        prob_ai, prob_hu = p_te[y_te == 1], p_te[y_te == 0]

        # ---- false positives on the representative human corpus, by genre.
        # OBJECTIVE.md's corrected baseline requires business-marketing quoted
        # separately: it is the class that fails and the class that matters.
        hc = np.array([r.get("human_set") == "human-corpus-v2" for r in test])
        m["human_corpus_v2"] = {"n": int((hc & (y_te == 0)).sum())}
        for b in BUDGETS:
            k = f"{int(b*100)}%"
            thr = m["operating_curve"]["achievable"][k]["threshold"]
            by = {}
            for keyname in ("genre", "difficulty"):
                buckets = collections.defaultdict(lambda: [0, 0])
                for r, sc, yy, isv2 in zip(test, s_te, y_te, hc):
                    if yy != 0 or not isv2:
                        continue
                    v = str(r.get(keyname))
                    buckets[v][1] += 1
                    buckets[v][0] += int(sc >= thr)
                by[keyname] = {kk: {"rate": round(h / n, 4), "hits": h, "n": n}
                               for kk, (h, n) in sorted(buckets.items(),
                                                        key=lambda x: -x[1][1]) if n}
            idx = hc & (y_te == 0)
            by["overall"] = {"rate": round(float((s_te[idx] >= thr).mean()), 4),
                             "n": int(idx.sum())}
            bm = np.array([r.get("genre") in ("business-marketing",
                                              "business-marketing-copy") for r in test]) & idx
            by["business_marketing"] = {
                "rate": round(float((s_te[bm] >= thr).mean()), 4) if bm.sum() else None,
                "hits": int((s_te[bm] >= thr).sum()), "n": int(bm.sum())}
            m.setdefault("fpr_human_corpus_v2", {})[k] = by

        # median comparison the corrected baseline calls out: human marketing vs AI
        bm_all = np.array([r.get("genre") in ("business-marketing",
                                              "business-marketing-copy") for r in test]) & (y_te == 0)
        art = np.array([r.get("longform_category") == "blog posts and articles"
                        for r in test]) & (y_te == 1)
        m["inversion_check"] = {
            "median_human_business_marketing": round(float(np.median(p_te[bm_all])), 4)
            if bm_all.sum() else None,
            "n_human_business_marketing": int(bm_all.sum()),
            "median_ai_articles": round(float(np.median(p_te[art])), 4) if art.sum() else None,
            "n_ai_articles": int(art.sum()),
            "inverted": bool(bm_all.sum() and art.sum()
                             and np.median(p_te[bm_all]) >= np.median(p_te[art])),
        }
        m["criteria"] = {
            "1_all_longform_categories_50pc": {
                "lowest_budget_meeting_floor": passing,
                "pass": passing is not None,
                "authorised_ceiling": "9%",
            },
            "2_scores_spread": {
                "sd_all": round(float(np.std(p_te)), 4),
                "ai_median": round(float(np.median(prob_ai)), 4),
                "human_median": round(float(np.median(prob_hu)), 4),
                "separation_of_medians": round(float(np.median(prob_ai) - np.median(prob_hu)), 4),
                "frac_all_in_0.80_0.90": round(float(((p_te >= .8) & (p_te <= .9)).mean()), 4),
                "decile_histogram_ai": [int(x) for x in np.histogram(prob_ai, bins=10, range=(0, 1))[0]],
                "decile_histogram_human": [int(x) for x in np.histogram(prob_hu, bins=10, range=(0, 1))[0]],
                "pass": bool(np.std(p_te) >= 0.20 and ((p_te >= .8) & (p_te <= .9)).mean() < 0.25),
            },
            "3_academic_credible": {},
            "4_false_positive_rate": {},
        }
        for b in BUDGETS:
            k = f"{int(b*100)}%"
            acad = m["longform_categories"][k].get("academic essays, lit reviews, discussion")
            if acad:
                m["criteria"]["3_academic_credible"][k] = acad
        if passing:
            a = m["operating_curve"]["achievable"][passing]
            v2 = m["fpr_human_corpus_v2"][passing]
            m["criteria"]["4_false_positive_rate"] = {
                "budget": passing, "realised_fpr": a["fpr"],
                "human_denominator": a["n_human"],
                "false_positives": int(round(a["fpr"] * a["n_human"])),
                "human_corpus_v2_fpr": v2["overall"]["rate"],
                "human_corpus_v2_n": v2["overall"]["n"],
                "business_marketing_fpr": v2["business_marketing"]["rate"],
                "business_marketing_n": v2["business_marketing"]["n"],
            }

        # the shipped model additionally at its own live threshold
        if name == "shipped":
            m["at_shipping_threshold_0.857"] = {
                "tpr": round(float((p_te[y_te == 1] >= SHIPPED_THR).mean()), 4),
                "fpr": round(float((p_te[y_te == 0] >= SHIPPED_THR).mean()), 4),
                "tpr_by_register": breakdown(test, p_te, y_te, SHIPPED_THR, "register", "ai"),
                "tpr_by_genre": breakdown(test, p_te, y_te, SHIPPED_THR, "genre", "ai"),
                "tpr_by_prompt_style": breakdown(test, p_te, y_te, SHIPPED_THR, "prompt_style", "ai"),
                "tpr_by_model_tier": breakdown(test, p_te, y_te, SHIPPED_THR, "model_tier", "ai"),
                "fpr_by_genre": breakdown(test, p_te, y_te, SHIPPED_THR, "genre", "human"),
            }
        res["models"][name] = m
        print(f"  {name}: AUROC {m['test_auroc']}  TPR@1%FPR {m['operating_curve']['achievable']['1%']['tpr']}"
              f"  TPR@5%FPR {m['operating_curve']['achievable']['5%']['tpr']}", flush=True)

    json.dump(res, open(os.path.join(HERE, "eval-results.json"), "w"), indent=2)
    print("wrote eval-results.json")


if __name__ == "__main__":
    main()
