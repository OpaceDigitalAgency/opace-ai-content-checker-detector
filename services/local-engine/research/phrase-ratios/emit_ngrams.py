"""Emit distinct per-document n-grams as `side <TAB> register <TAB> ngram` lines.

Counting is DOCUMENT FREQUENCY, not raw frequency: a phrase repeated eleven
times inside one white paper is one document's worth of evidence, not eleven.
Raw frequency is what makes a single verbose document look like a corpus-wide
machine tell.

Distinct-within-document is enforced here so the downstream `sort | uniq -c`
counts documents. Sorting externally keeps peak memory flat regardless of
corpus size — the alternative, a Counter over every 4-gram in 9.3M tokens,
is several gigabytes and was not worth the risk beside a running ONNX job.

The split is written too: mining half vs validation half, assigned by a hash of
the document id so it is stable across reruns and independent of file order.
Phrases are MINED on one half and TESTED on the other. A ratio table scored on
the documents it was mined from measures nothing.
"""
import hashlib
import json
import os
import re
import sys

from normalise import normalise

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.abspath(os.path.join(HERE, "..", "longform-corpus"))

# Word-ish tokens, keeping trailing punctuation attached so a phrase can span a
# sentence boundary the way the competitor's panel does ("process. Define the").
_TOK = re.compile(r"[^\s]+")
NGRAM_SIZES = (3, 4, 5)


def half(doc_id: str) -> str:
    """Stable mine/test assignment from the document id alone."""
    h = hashlib.sha256(doc_id.encode()).hexdigest()
    return "mine" if int(h[:8], 16) % 2 == 0 else "test"


def tokens(text: str) -> list[str]:
    out = []
    # Spelling normalised on BOTH sides first; see normalise.py for why.
    for raw in _TOK.findall(normalise(text.lower())):
        # Strip only outer quotes/brackets; keep commas and stops, they carry
        # the rhythm the panel is meant to show.
        t = raw.strip('"“”‘’()[]{}«»')
        if t:
            out.append(t)
    return out


def main(n: int, out_path: str) -> None:
    with open(out_path, "w") as fh:
        for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
            for line in open(os.path.join(CORPUS, name)):
                r = json.loads(line)
                tk = tokens(r["text"])
                seen = set()
                for i in range(len(tk) - n + 1):
                    g = " ".join(tk[i:i + n])
                    if g not in seen:
                        seen.add(g)
                        fh.write(f"{side}\t{half(r['id'])}\t{r['register']}\t{g}\n")


if __name__ == "__main__":
    main(int(sys.argv[1]), sys.argv[2])
