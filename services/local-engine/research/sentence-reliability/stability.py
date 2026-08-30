"""Is a sentence's score stable under trivial, meaning-preserving rewording?

If a number is printed beside a sentence, a reader will believe the sentence
earned it. That belief is only defensible if an edit that changes nothing a
reader would call substantive leaves the number roughly where it was.

The edits are mechanical and reversible, chosen so that no one would say the
meaning moved:

  contractions   expand  "don't" -> "do not"      (and the reverse where safe)
  spelling       British <-> American  -ise/-ize, -our/-or, -re/-er
  connectives    "however," <-> "but"   "therefore" <-> "so"
  serial comma   insert / remove before a final "and" in a three-item list
  quotes         curly <-> straight

Reported per edit and pooled: the absolute change in probability, and the rate
at which the edit moves a sentence across a cut a display might use. Rank
stability is reported too — for a RELATIVE display, what matters is not whether
the number moved but whether the sentence kept its place in the document's
order.
"""
import json, os, re, sys, random
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, ".."))
HARNESS_DIR = os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29")
CORPUS = os.path.join(RESEARCH, "longform-corpus")
sys.path.insert(0, HERE); sys.path.insert(0, HARNESS_DIR)
_cwd = os.getcwd(); os.chdir(HARNESS_DIR)
import harness  # noqa
os.chdir(_cwd)
from sentences import split_sentences  # noqa
from score_sentences import score_texts  # noqa

CONTRACTIONS = {
    "don't": "do not", "doesn't": "does not", "didn't": "did not",
    "isn't": "is not", "aren't": "are not", "wasn't": "was not",
    "weren't": "were not", "can't": "cannot", "won't": "will not",
    "wouldn't": "would not", "shouldn't": "should not", "couldn't": "could not",
    "it's": "it is", "that's": "that is", "there's": "there is",
    "they're": "they are", "we're": "we are", "you're": "you are",
    "hasn't": "has not", "haven't": "have not", "hadn't": "had not",
}
_SPELL = [(re.compile(r"\b(\w+?)ize\b"), r"\1ise"), (re.compile(r"\b(\w+?)ization\b"), r"\1isation"),
          (re.compile(r"\b(\w+?)or\b"), None)]  # -or handled explicitly below
_OR_WORDS = {"color": "colour", "behavior": "behaviour", "favor": "favour",
             "labor": "labour", "honor": "honour", "neighbor": "neighbour"}
_RE_WORDS = {"center": "centre", "theater": "theatre", "meter": "metre", "fiber": "fibre"}


def edit_contractions(t):
    out = t
    for a, b in CONTRACTIONS.items():
        out = re.sub(rf"\b{re.escape(a)}\b", b, out, flags=re.I)
    return out


def edit_spelling(t):
    out = re.sub(r"\b(\w+?)ization\b", r"\1isation", t)
    out = re.sub(r"\b(\w+?)ize\b", r"\1ise", out)
    out = re.sub(r"\b(\w+?)izing\b", r"\1ising", out)
    for a, b in {**_OR_WORDS, **_RE_WORDS}.items():
        out = re.sub(rf"\b{a}\b", b, out, flags=re.I)
    return out


def edit_connectives(t):
    out = re.sub(r"\bHowever,\s*", "But ", t)
    out = re.sub(r"\bhowever,\s*", "but ", out)
    out = re.sub(r"\bTherefore,\s*", "So ", out)
    out = re.sub(r"\btherefore,\s*", "so ", out)
    out = re.sub(r"\bAdditionally,\s*", "Also, ", out)
    out = re.sub(r"\bFurthermore,\s*", "Also, ", out)
    return out


def edit_serial_comma(t):
    # remove a serial comma: "a, b, and c" -> "a, b and c"
    return re.sub(r",(\s+and\s)", r"\1", t)


def edit_quotes(t):
    return t.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")


EDITS = {"contractions": edit_contractions, "spelling": edit_spelling,
         "connectives": edit_connectives, "serial_comma": edit_serial_comma,
         "quotes": edit_quotes}

N_DOCS = 300


def main():
    rng = random.Random(20260830)
    docs = []
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        rows = [json.loads(l) for l in open(os.path.join(CORPUS, name))]
        docs += [(r, side) for r in rng.sample(rows, N_DOCS)]

    per_edit = {k: {"deltas": [], "n": 0} for k in EDITS}
    rank_rows = []
    for r, side in docs:
        sents = [s for s in split_sentences(r["text"]) if s.scorable]
        if len(sents) < 10:
            continue
        sents = sents[:40]
        base_texts = [s.text for s in sents]
        base = score_texts(base_texts)
        # apply ALL edits together for the rank test, each alone for the delta test
        for name, fn in EDITS.items():
            idx = [i for i, t in enumerate(base_texts) if fn(t) != t]
            if not idx:
                continue
            got = score_texts([fn(base_texts[i]) for i in idx])
            for i, g in zip(idx, got):
                per_edit[name]["deltas"].append(abs(g - base[i]))
                per_edit[name]["n"] += 1
        allfn = lambda t: edit_quotes(edit_serial_comma(edit_connectives(edit_spelling(edit_contractions(t)))))
        edited_texts = [allfn(t) for t in base_texts]
        if edited_texts == base_texts:
            continue
        edited = score_texts(edited_texts)
        ob = sorted(range(len(base)), key=lambda i: -base[i])
        oe = sorted(range(len(edited)), key=lambda i: -edited[i])
        k = max(1, len(base) // 5)
        rank_rows.append({
            "side": side,
            "top1_same": int(ob[0] == oe[0]),
            "topk_overlap": len(set(ob[:k]) & set(oe[:k])) / k,
            "max_abs_delta": float(np.max(np.abs(np.array(edited) - np.array(base)))),
        })

    out = {"documents_sampled": len(docs), "documents_used": len(rank_rows),
           "per_edit": {}, "combined_edit": {}}
    for name, v in per_edit.items():
        if not v["n"]:
            out["per_edit"][name] = "no sentence in the sample was affected by this edit"
            continue
        d = np.array(v["deltas"])
        out["per_edit"][name] = {
            "sentences_affected": v["n"],
            "median_abs_delta": round(float(np.median(d)), 4),
            "p90_abs_delta": round(float(np.percentile(d, 90)), 4),
            "p99_abs_delta": round(float(np.percentile(d, 99)), 4),
            "max_abs_delta": round(float(d.max()), 4),
            "moved_more_than_0.10": f"{int((d>0.10).sum())}/{len(d)} ({100*(d>0.10).mean():.1f}%)",
            "moved_more_than_0.25": f"{int((d>0.25).sum())}/{len(d)} ({100*(d>0.25).mean():.1f}%)",
        }
    if rank_rows:
        t1 = np.array([r["top1_same"] for r in rank_rows], float)
        ov = np.array([r["topk_overlap"] for r in rank_rows])
        mx = np.array([r["max_abs_delta"] for r in rank_rows])
        out["combined_edit"] = {
            "note": "all five edits applied at once, then the document's sentence ranking compared",
            "top_ranked_sentence_unchanged": f"{int(t1.sum())}/{len(t1)} ({100*t1.mean():.1f}%)",
            "top_fifth_overlap_mean": round(float(ov.mean()), 4),
            "max_abs_delta_median": round(float(np.median(mx)), 4),
            "max_abs_delta_p90": round(float(np.percentile(mx, 90)), 4),
        }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
