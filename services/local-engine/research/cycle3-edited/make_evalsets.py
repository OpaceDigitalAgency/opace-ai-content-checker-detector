"""Materialise the held-out evaluation sets once, so every model is scored on
byte-identical documents."""
import json, os
import common3 as C, eval_sets as E, score_sets as S

def main():
    lf = S.longform()
    ai = [r for r in lf if r["side"] == "ai"]
    hu = [r for r in lf if r["side"] == "human"]
    sets = {}
    sets["hat-test"] = [{"id": f"hat-{r['sha'][:16]}-{r['version']}", "text": r["text"],
                         "ai_ratio": r["ai_ratio"], "band": r["version"],
                         "register": r["register"], "genre": r["genre"],
                         "generator": r["generator"], "domain": r["domain"],
                         "side": "human" if r["version"] == "v0" else "ai"}
                        for r in E.hat_test()]
    sets["fresh"] = [{"id": r["id"], "text": r["text"], "side": r["side"],
                      "register": r["register"],
                      "ai_ratio": 1.0 if r["side"] == "ai" else 0.0,
                      "band": "full-generation" if r["side"] == "ai" else "human"}
                     for r in lf]
    hu_ctrl = hu[:1200]
    sets["fresh-edited"] = E.fresh_edited(ai, hu_ctrl)
    sets["fresh-mixed"] = E.fresh_mixed(ai, hu)
    c2test = [r for r in C.jsonl(C.DATASET2) if r["split"] == "test"]
    sets["cycle2-test"] = [{"id": r["id"], "text": r["text"], "side": r["side"],
                            "register": r["register"],
                            "band": r.get("edit_level") or ("full-generation" if r["side"] == "ai" else "human"),
                            "ai_ratio": 1.0 if r["side"] == "ai" else 0.0,
                            "source": r.get("source")}
                           for r in c2test if "hatbench" not in (r.get("source") or "")]
    with open(os.path.join(C.HERE, "evalsets.jsonl"), "w") as fh:
        for name, rows in sets.items():
            for r in rows:
                r["set"] = name
                fh.write(json.dumps(r) + "\n")
    for k, v in sets.items():
        print(k, len(v))

if __name__ == "__main__":
    main()
