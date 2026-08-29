"""How human is each GRADTEX 'edit band' actually?

The cycle-2 report treats `light-edit` as lightly-edited AI. GRADTEX's own field
is `scenario_family=polish`, and each row carries `human_source_text`: the band is
a HUMAN document that an LLM has polished, not an AI document a human has tidied.
This measures how much of each band's wording is the human original's.
"""
import collections, difflib, json, statistics
import pandas as pd
import common3 as C

FAMS = {"polish": "light-edit", "paraphrase": "paraphrase", "completion": "partial-completion",
        "rewrite_style": "style-rewrite", "MGT": "full-generation"}


def main():
    df = pd.concat([pd.read_parquet(f"{C.RESEARCH}/cycle2-corpus/raw/gradtex_{s}.parquet")
                    for s in ("train", "validation", "test")], ignore_index=True)
    # the exact texts cycle 2 used, per band
    used = collections.defaultdict(set)
    for r in C.jsonl(C.DATASET2):
        if (r.get("source") or "").startswith("gradtex-ai"):
            used[r["edit_level"]].add(" ".join(r["text"].split())[:300])
    idx = {}
    for r in df.itertuples(index=False):
        if isinstance(r.text, str):
            idx[" ".join(r.text.split())[:300]] = r
    out = {}
    for fam, band in FAMS.items():
        keys = used.get(band, set())
        rs, pre, n = [], 0, 0
        for k in keys:
            r = idx.get(k)
            if r is None:
                continue
            n += 1
            if r.text.strip().lower().startswith("the original text"):
                pre += 1
            h = r.human_source_text
            if isinstance(h, str) and h.strip():
                rs.append(difflib.SequenceMatcher(None, h.split(), r.text.split()).ratio())
        out[band] = {"corpus_rows_matched": n, "of_corpus_rows": len(keys),
                     "median_word_overlap_with_human_source": round(statistics.median(rs), 3) if rs else None,
                     "n_with_human_source": len(rs),
                     "rows_carrying_leaked_prompt_preamble": pre}
    print(json.dumps(out, indent=1))
    json.dump(out, open(f"{C.HERE}/gradtex-direction.json", "w"), indent=1)


if __name__ == "__main__":
    main()
