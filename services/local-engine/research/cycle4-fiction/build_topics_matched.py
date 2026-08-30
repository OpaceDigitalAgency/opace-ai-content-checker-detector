"""Topic seeds taken from the HUMAN documents that will sit beside them in
training - the newly harvested fiction and register material, never the
measurement corpus.

Cycle 3's AI short-form was 100% web-design and SEO against a human side
spanning eight registers, which lets a classifier satisfy its loss on subject
matter rather than authorship. These seeds are drawn from the same documents
the human side of each cell is built from, so the two sides share their topics.

Only metadata is used - the archive.org subject string, the GOV.UK or Mongabay
headline. No human body text is copied into a prompt.

Writes topics-matched.json.
"""
from __future__ import annotations

import glob
import hashlib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

REGISTER_OF = {
    "govuk": "gov-guidance",
    "mongabay": "environmental-journalism",
    "globalvoices": "world-journalism",
    "crs": "policy-report",
    "edgar": "corporate-filing",
    "epmc": "medical-research",
}

# Situations keep the seed a writing brief rather than a request to reproduce a
# named work: the subject string sets the genre, this sets what happens.
SITUATIONS = [
    "an argument that neither side wins", "a homecoming that goes wrong",
    "a small theft with large consequences", "a promise kept too late",
    "someone waiting for a message that does not come",
    "a journey interrupted by weather", "an object returned to its owner",
    "a secret discovered by the wrong person", "a debt called in",
    "two people who want the same thing", "a last day in a place",
    "a stranger who knows too much", "an apology that arrives years late",
    "a decision made on someone else's behalf", "a search that finds something else",
    "a rule broken for a good reason", "a talent that becomes a burden",
    "a night that changes nothing", "a warning that is ignored",
    "a reunion between people who have both changed",
]

_CLEAN = re.compile(r"[^A-Za-z0-9 ,'&:-]+")


def tidy(s, n=110):
    s = _CLEAN.sub(" ", str(s or "")).strip()
    return re.sub(r"\s+", " ", s)[:n]


def main() -> None:
    out = []

    # ---- fiction, from the newly harvested Internet Archive items ----------
    seen = set()
    fic = []
    for line in open(os.path.join(HERE, "human-fiction-new.jsonl"), errors="replace"):
        r = json.loads(line)
        ident = r.get("identifier")
        if ident in seen:
            continue
        seen.add(ident)
        subj = tidy(r.get("discipline"), 90)
        title = tidy(r.get("section_title"), 70)
        if len(subj.split()) < 2:
            continue
        fic.append((ident, subj, title))
    for i, (ident, subj, title) in enumerate(fic):
        for k in range(4):
            sit = SITUATIONS[(i * 4 + k) % len(SITUATIONS)]
            out.append({
                "register": "fiction",
                "genre_label": subj,
                "topic": (f"Genre and subject matter: {subj}. "
                          f"Write an original scene about {sit}."),
                "group": "fmatch-" + hashlib.sha256(
                    (ident + str(k)).encode()).hexdigest()[:12],
            })

    # ---- the other registers, from the newly harvested documents ----------
    for path in sorted(glob.glob(os.path.join(HERE, "raw-new", "*.filtered.jsonl"))):
        key = os.path.basename(path).split(".")[0]
        reg = REGISTER_OF.get(key)
        if not reg:
            continue
        titles, seen_t = [], set()
        for line in open(path, errors="replace"):
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            t = tidy(r.get("section_title") or r.get("title"), 110)
            if key == "edgar":
                # every EDGAR section carries the same heading; the filer is
                # what makes one filing's subject matter different from another
                t = f"{tidy(r.get('publisher'), 60)}: {t}"
            if key == "epmc":
                t = tidy(r.get("section_title") or r.get("discipline"), 110)
            if len(t.split()) < 3 or t.lower() in seen_t:
                continue
            seen_t.add(t.lower())
            titles.append(t)
        for t in titles[:220]:
            out.append({
                "register": reg,
                "genre_label": reg,
                "topic": t,
                "group": "rmatch-" + hashlib.sha256(
                    (reg + t).encode()).hexdigest()[:12],
            })

    json.dump(out, open(os.path.join(HERE, "topics-matched.json"), "w"), indent=1)
    import collections
    print(collections.Counter(r["register"] for r in out))
    print(len(out), "seeds,", len({r["group"] for r in out}), "groups")


if __name__ == "__main__":
    main()
