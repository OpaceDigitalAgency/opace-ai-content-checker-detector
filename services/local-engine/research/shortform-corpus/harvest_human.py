#!/usr/bin/env python3
"""Harvest human short-form passages from Opace blog markdown.

Filter is on ORIGINAL PUBLICATION DATE (front matter `date`), 2010-2020.
`modified` is recorded for scrutiny, not used for exclusion: the site was
migrated to Astro in 2024, which rewrote every file without touching prose.

The six owner sanity-check samples are excluded by SOURCE SLUG.
"""
import os, re, json, glob, random, datetime, collections, statistics

ROOT = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest"
BLOG = os.path.join(ROOT, "src/content/blog")
# 2024 WordPress migration snapshot: predates the 2026 SEO refresh campaign that
# inserted modern internal-link paragraphs into old posts. Used as a whitelist.
MIG  = os.path.join(ROOT, "migration/src/content/blog")
OUT = os.path.dirname(os.path.abspath(__file__))

# Held out entirely - the owner's sanity check. Excluded by slug, not hash.
HELD_OUT = {
    "post-panda-seo-checklist-part-1.md",
    "social-media-campaign-objectives.md",
    "emerging-online-trends-esports.md",
    "social-media-future.md",
    "mobile-friendly-seo.md",
    "seo-ranking-guidelines.md",
}

YEAR_MIN, YEAR_MAX = 2010, 2020
TARGETS = [100, 300, 400, 600]
MAX_PASSAGES_PER_POST = 6

CTA_PAT = re.compile(
    r"call us today|contact us today|contact us on|get in touch|watch this space"
    r"|for more information|please call|drop us a line|find out more about our"
    r"|follow us on|like us on|our facebook page|on twitter|youtube page"
    r"|subscribe to our|sign up to our|share this|related posts?|read more"
    r"|opace digital agency|about the author|leave a comment|filed under"
    r"|this entry was posted|tagged with|previous post|next post",
    re.I,
)
EDNOTE_PAT = re.compile(r"editor'?s?\s*note", re.I)


def strip_markup(text: str) -> str:
    t = text
    t = re.sub(r"```.*?```", " ", t, flags=re.S)          # fenced code
    t = re.sub(r"~~~.*?~~~", " ", t, flags=re.S)
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)            # images
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)         # links -> text
    t = re.sub(r"<script.*?</script>", " ", t, flags=re.S | re.I)
    t = re.sub(r"<style.*?</style>", " ", t, flags=re.S | re.I)
    t = re.sub(r"<[^>]+>", " ", t)                          # html tags
    t = re.sub(r"^\s{0,3}>+\s?", "", t, flags=re.M)        # blockquote marks
    t = t.replace("**", "").replace("__", "")
    t = re.sub(r"(?<!\w)[*_](?=\S)(.+?)(?<=\S)[*_](?!\w)", r"\1", t)
    t = re.sub(r"\\([\[\]()])", r"\1", t)                  # escaped brackets
    t = re.sub(r"&nbsp;?", " ", t)
    t = re.sub(r"&amp;", "&", t)
    t = re.sub(r"[ \t]+", " ", t)
    return t


def paragraphs(body: str):
    """Return cleaned prose paragraphs, dropping headings, bullets and boilerplate."""
    out = []
    for block in re.split(r"\n\s*\n", body):
        b = block.strip()
        if not b:
            continue
        if re.match(r"^#{1,6}\s", b):          # heading block
            continue
        if re.match(r"^[-*+]\s|^\d+\.\s", b):  # list block
            continue
        if re.match(r"^\|", b) or set(b) <= set("-=| \t"):  # tables / rules
            continue
        b = strip_markup(b).strip()
        if not b:
            continue
        if EDNOTE_PAT.search(b):               # post-hoc addition
            continue
        if CTA_PAT.search(b):                  # nav / CTA / social boilerplate
            continue
        words = b.split()
        if len(words) < 20:                    # fragments, captions, stubs
            continue
        if not re.search(r"[.!?]", b):         # not a sentence
            continue
        letters = sum(c.isalpha() for c in b)
        if letters / max(1, len(b)) < 0.6:     # markup residue
            continue
        out.append(" ".join(words))
    return out


def norm_words(s):
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower())


def migration_text(fname):
    """Normalised prose of the 2024 migration snapshot, or None if absent."""
    mp = os.path.join(MIG, fname)
    if not os.path.exists(mp):
        return None
    raw = open(mp, encoding="utf-8", errors="replace").read()
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    body = raw[m.end():] if m else raw
    return re.sub(r"\s+", " ", norm_words(strip_markup(body)))


def parse(path):
    raw = open(path, encoding="utf-8", errors="replace").read()
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if not m:
        return None
    head, body = m.group(1), raw[m.end():]

    def field(k):
        mm = re.search(r'^%s:\s*"?([^"\n]+?)"?\s*$' % k, head, re.M)
        return mm.group(1).strip() if mm else None

    cats = re.findall(r"^\s*-\s*(.+?)\s*$", head.split("tags:")[0].split("categories:")[-1], re.M) \
        if "categories:" in head else []
    return {
        "file": os.path.basename(path),
        "slug": field("slug") or os.path.basename(path)[:-3],
        "title": field("title"),
        "date": (field("date") or "")[:10],
        "modified": (field("modified") or "")[:10],
        "categories": [c for c in cats if c and not c.startswith("-")][:4],
        "paras": paragraphs(body),
        "mig": migration_text(os.path.basename(path)),
    }


def cut(paras, target):
    """Greedy paragraph-boundary cutter. Never splits a paragraph."""
    passages, buf, n = [], [], 0
    lo, hi = target * 0.70, target * 1.70
    for p in paras:
        w = len(p.split())
        if w > hi and not buf:
            continue                       # single paragraph too long for this target
        buf.append(p); n += w
        if n >= target * 0.85:
            if lo <= n <= hi:
                passages.append((" \n\n".join(buf), n))
            buf, n = [], 0
    if buf and lo <= n <= hi:
        passages.append((" \n\n".join(buf), n))
    return passages


def main():
    rng = random.Random(20260829)
    posts = []
    for path in sorted(glob.glob(os.path.join(BLOG, "*.md"))):
        if os.path.basename(path) in HELD_OUT:
            continue
        d = parse(path)
        if not d or not d["date"]:
            continue
        try:
            y = int(d["date"][:4])
        except ValueError:
            continue
        if not (YEAR_MIN <= y <= YEAR_MAX):
            continue
        if d["mig"] is None:
            continue                      # no 2024 snapshot -> cannot verify
        kept = []
        for para in d["paras"]:
            probe = re.sub(r"\s+", " ", norm_words(para)).strip()
            probe = " ".join(probe.split()[:12])   # 12-word opening shingle
            if probe and probe in d["mig"]:
                kept.append(para)
        d["dropped_paras"] = len(d["paras"]) - len(kept)
        d["paras"] = kept
        if not d["paras"]:
            continue
        d["year"] = y
        d["body_words"] = sum(len(p.split()) for p in d["paras"])
        posts.append(d)

    # Bias towards older, longer, more substantial posts (owner: "the best ones")
    posts.sort(key=lambda p: (p["year"], -p["body_words"]))

    # Allocate scarcest length first. A post may serve several lengths; every
    # passage keeps its post slug as `group`, so cutting one post at several
    # lengths cannot leak across the group-aware train/test split.
    MAX_TARGETS_PER_POST = 4
    PER_POST_PER_TARGET = 2
    QUOTA = 320
    served = collections.Counter()
    plan = collections.defaultdict(list)

    for target in (600, 400, 300, 100):
        taken = 0
        for p in posts:
            if taken >= QUOTA:
                break
            if served[p["slug"]] >= MAX_TARGETS_PER_POST:
                continue
            got = cut(p["paras"], target)
            if not got:
                continue
            if len(got) > PER_POST_PER_TARGET:
                idx = sorted(rng.sample(range(len(got)), PER_POST_PER_TARGET))
                got = [got[i] for i in idx]
            served[p["slug"]] += 1
            plan[target].append((p, got))
            taken += len(got)

    samples = []
    for target in TARGETS:
        for p, got in plan[target]:
            for j, (text, wc) in enumerate(got):
                samples.append({
                    "id": f"human__{p['slug']}__{target}__{j}",
                    "text": text,
                    "label": 0,
                    "source": "opace-blog",
                    "source_url": f"https://opace.agency/blog/{p['slug']}/",
                    "source_file": p["file"],
                    "group": p["slug"],
                    "title": p["title"],
                    "published": p["date"],
                    "modified": p["modified"],
                    "categories": p["categories"],
                    "target_len": target,
                    "word_count": wc,
                })

    with open(os.path.join(OUT, "human-shortform.jsonl"), "w", encoding="utf-8") as fh:
        for s in samples:
            fh.write(json.dumps(s, ensure_ascii=False) + "\n")

    by_t = collections.Counter(s["target_len"] for s in samples)
    by_y = collections.Counter(s["published"][:4] for s in samples)
    cats = collections.Counter(c for s in samples for c in s["categories"])
    print("paragraphs dropped as post-2024 insertions:",
          sum(p["dropped_paras"] for p in posts))
    print(f"eligible posts (2010-2020, migration-verified, excl. 6 held out): {len(posts)}")
    print(f"passages: {len(samples)}  from {len(set(s['group'] for s in samples))} posts")
    print("by target length:", dict(sorted(by_t.items())))
    wc = [s["word_count"] for s in samples]
    print("actual words: min %d median %d max %d" % (min(wc), int(statistics.median(wc)), max(wc)))
    for t in TARGETS:
        w = [s["word_count"] for s in samples if s["target_len"] == t]
        if w:
            print(f"  target {t}: n={len(w)} median={int(statistics.median(w))} range={min(w)}-{max(w)}")
    print("by publication year:", dict(sorted(by_y.items())))
    print("top categories:", cats.most_common(10))


if __name__ == "__main__":
    main()
