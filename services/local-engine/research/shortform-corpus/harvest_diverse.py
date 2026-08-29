#!/usr/bin/env python3
"""Widen the human short-form corpus beyond the Opace blog.

Cuts short passages at 100/300/400/600 words from the 4,636-document human
long-form corpus (Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR,
PERSUADE 2.0, Internet Archive), which is already collected, dated and verified.

Per-source quotas keep any single source under a third of the whole, while
leaving the Opace blog a meaningful share - it is the only conversational,
commercial, first-person voice, and that is the register the tool is weakest on.

Cuts on paragraph boundaries. Sources with no blank-line structure (SEC EDGAR,
Internet Archive) fall back to sentence boundaries; this is recorded per row as
`cut_on` so it is never mistaken for paragraph cutting.
"""
import os, re, json, random, collections, statistics

RS = ("/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/"
      "ai-watermark-and-content-authenticity/implementation/services/local-engine/research")
LONGFORM = os.path.join(RS, "longform-corpus/human-longform.jsonl")
HERE = os.path.dirname(os.path.abspath(__file__))
BLOG = os.path.join(HERE, "human-shortform.jsonl")
OUT = os.path.join(HERE, "human-shortform-widened.jsonl")

TARGETS = [100, 300, 400, 600]
PER_SOURCE_TARGET = 400        # per source, spread over the four bands
PER_DOC_PER_TARGET = 1         # keep one passage per doc per band: max diversity
_SENT = re.compile(r"(?<=[.!?])\s+")


def units(text):
    """Paragraphs if the text has them, else sentences. Returns (units, how)."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    paras = [re.sub(r"\s+", " ", p) for p in paras]
    good = [p for p in paras if len(p.split()) >= 15]
    if len(good) >= 2:
        return good, "paragraph"
    sents = [s.strip() for s in _SENT.split(re.sub(r"\s+", " ", text)) if s.strip()]
    return [s for s in sents if len(s.split()) >= 5], "sentence"


def cut(us, target, cap):
    out, buf, n = [], [], 0
    lo, hi = target * 0.70, target * 1.70
    for u in us:
        w = len(u.split())
        if w > hi and not buf:
            continue
        buf.append(u); n += w
        if n >= target * 0.85:
            if lo <= n <= hi:
                out.append((" ".join(buf), n))
                if len(out) >= cap:
                    return out
            buf, n = [], 0
    return out


def main():
    rng = random.Random(20260829)
    docs = collections.defaultdict(list)
    for l in open(LONGFORM, encoding="utf-8", errors="replace"):
        d = json.loads(l)
        docs[d["source"]].append(d)

    samples = []
    for source, ds in sorted(docs.items()):
        rng.shuffle(ds)
        per_band = PER_SOURCE_TARGET // len(TARGETS)
        got = collections.Counter()
        for d in ds:
            if all(got[t] >= per_band for t in TARGETS):
                break
            us, how = units(d["text"])
            if len(us) < 2:
                continue
            for t in TARGETS:
                if got[t] >= per_band:
                    continue
                for text, wc in cut(us, t, PER_DOC_PER_TARGET):
                    samples.append({
                        "id": f"human__{source}__{d['id']}__{t}",
                        "text": text, "label": 0, "source": source,
                        "group": f"{source}__{d['id']}",
                        "register": d.get("register"),
                        "publisher": d.get("publisher"),
                        "discipline": d.get("discipline"),
                        "era": d.get("era"), "era_year": d.get("era_year"),
                        "source_ref": d.get("source_ref"),
                        "licence": d.get("licence"),
                        "target_len": t, "word_count": wc, "cut_on": how,
                    })
                    got[t] += 1

    blog = [json.loads(l) for l in open(BLOG)]
    for b in blog:
        b.setdefault("register", "marketing-blog")
        b.setdefault("cut_on", "paragraph")
        # the blog rows are dated by front matter, not undated
        if b.get("era_year") is None and b.get("published"):
            b["era_year"] = int(b["published"][:4])
    allrows = blog + samples
    rng.shuffle(allrows)
    with open(OUT, "w", encoding="utf-8") as fh:
        for r in allrows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    n = len(allrows)
    by_src = collections.Counter(r["source"] for r in allrows)
    print(f"widened human short-form corpus: {n} passages, "
          f"{len(by_src)} sources, {len(set(r['group'] for r in allrows))} groups\n")
    print(f"{'source':28s} {'n':>5} {'share':>7}   " +
          "  ".join(f"{t:>5}" for t in TARGETS) + "   cut_on")
    for s, c in by_src.most_common():
        bands = collections.Counter(r["target_len"] for r in allrows if r["source"] == s)
        how = sorted(set(r["cut_on"] for r in allrows if r["source"] == s))
        print(f"{s:28s} {c:5d} {100*c/n:6.1f}%   " +
              "  ".join(f"{bands[t]:5d}" for t in TARGETS) + f"   {','.join(how)}")
    print(f"\nlargest single source: {100*by_src.most_common(1)[0][1]/n:.1f}% "
          f"({by_src.most_common(1)[0][0]})")
    bb = collections.Counter(r["target_len"] for r in allrows)
    print("by length band:", dict(sorted(bb.items())))
    print("registers:", dict(collections.Counter(
        r.get("register") for r in allrows).most_common(12)))


if __name__ == "__main__":
    main()
