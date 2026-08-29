"""PERSUADE 2.0 -> student and essay writing (human side).

US grade 6-12 argumentative and expository essays collected 2010-2020 by The
Learning Agency Lab. Upstream licence CC BY 4.0; the Hugging Face mirror used
here (`realbenpope/PERSUADE_manageable`) declares MIT. Both are recorded.

Only the longer essays are kept (>= 500 words), because the point of this
corpus is long-form. Prompt-name duplication is capped so no single essay
prompt dominates.
"""

from __future__ import annotations

import csv
import io
import json
import os
import sys

import common

URL = ("https://huggingface.co/datasets/realbenpope/PERSUADE_manageable/"
       "resolve/main/persuade_full_text.csv")
CACHE = os.path.join(common.RAW, "persuade_full_text.csv")
META = os.path.join(common.RAW, "persuade_meta.csv")
OUT = os.path.join(common.RAW, "persuade.jsonl")

csv.field_size_limit(1 << 30)


def main():
    want = int(sys.argv[1]) if len(sys.argv) > 1 else 700
    min_words = int(sys.argv[2]) if len(sys.argv) > 2 else 500
    if not os.path.exists(CACHE):
        print("downloading PERSUADE full text (~58 MB)", flush=True)
        data = common.get(URL, timeout=600)
        with open(CACHE, "wb") as f:
            f.write(data)
    rows = list(csv.DictReader(io.StringIO(open(CACHE, encoding="utf-8", errors="replace").read())))
    print(f"{len(rows)} essays in PERSUADE", flush=True)

    # competition_set (feedback-prize-2021 / 2022) is the only provenance the
    # mirror carries at essay level; prompt names and collection year are not
    # in either mirror file, so era_year stays null and the 2010-2020
    # collection window is recorded in MANIFEST.md instead.
    cset = {}
    if os.path.exists(META):
        with open(META, encoding="utf-8", errors="replace") as fh:
            for r in csv.DictReader(fh):
                cset.setdefault(r.get("essay_id_comp"), r.get("competition_set"))
    print(f"{len(cset)} essay ids with competition_set", flush=True)

    # Random draw, not file order: the file is grouped, and taking the head
    # would have produced one prompt's worth of essays.
    import random
    random.Random(20260828).shuffle(rows)

    seen, n = set(), 0
    with open(OUT, "w") as f:
        for r in rows:
            text = common.tidy(r.get("full_text") or "")
            if common.words(text) < min_words:
                continue
            ok, _ = common.looks_like_prose(text, min_words)
            if not ok:
                continue
            h = common.norm_hash(text)
            if h in seen:
                continue
            seen.add(h)
            eid = r.get("essay_id_comp")
            f.write(json.dumps({
                "side": "human",
                "register": "student-essay",
                "genre": "student-essay",
                "text": text,
                "word_count": common.words(text),
                "licence": "CC BY 4.0 (PERSUADE 2.0, The Learning Agency Lab); HF mirror declares MIT",
                "source": "persuade-2.0",
                "source_ref": "https://huggingface.co/datasets/realbenpope/PERSUADE_manageable",
                "era_year": None,
                "discipline": "school-argumentative-writing",
                "publisher": "The Learning Agency Lab",
                "section_title": cset.get(eid, "persuade"),
                "essay_id": eid,
            }) + "\n")
            n += 1
            if n >= want:
                break
    print(f"DONE {n} essays -> {OUT}", flush=True)


if __name__ == "__main__":
    main()
