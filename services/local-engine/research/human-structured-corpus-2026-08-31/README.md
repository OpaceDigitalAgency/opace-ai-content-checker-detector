# Structure-preserved human corpus (2026-08-31)

Purpose: the document-shape tells measured in
`../document-tells-2026-08-31/` had no fair human baseline — existing human
corpora are structure-stripped (292 structured docs, ~zero bullet lists).
This corpus keeps headings, paragraphs and bullet lists as markdown, with
licence and provenance recorded per document.

## Pipeline principle

Version-controlled and openly licensed sources plus historical web captures,
not pre-cleaned datasets: git repositories give exact-dated native markdown;
Common Crawl CC-MAIN-2021-49 (Nov/Dec 2021) gives pre-AI-era frozen captures
of licence-whitelisted domains fetched by WARC offset (no bulk download);
live APIs are used where the publisher's own metadata dates the content.

## Files

- `corpus.jsonl` — one doc per line: id, text (markdown), source, url,
  licence, legal_bucket, published_date, register, human_confidence, title,
  brief (extracted generation brief), plus per-source provenance fields
  (git_commit/git_author, capture, raw_html).
- `manifest.json` — counts by source/register/bucket/confidence, SHA-256 of
  corpus.jsonl and each raw file, rejected sources with reasons.
- `raw/` — per-source jsonl + fetch logs; `raw/html/` gzipped HTML captures
  for Common Crawl sources.
- `fetch_*.py` — resumable fetch scripts; `build_corpus.py` merges;
  `measure_new_human.py` re-runs the shape tells against this corpus.
- `new-human-summary.json`, `new-human-per-doc.jsonl` — measurement outputs.

## Legal buckets

- GREEN (CC0 / OGL v3.0 / CC BY 4.0/3.0/2.5): GOV.UK + Service Manual + GDS
  blog, Google Search Central blog, github/docs, 18F repos, Microsoft style
  guide, Wikinews, Global Voices.
- AMBER (CC BY-SA — banked separately; redistribution obligations pending a
  legal view; measurement use only): Stack Exchange, GitLab handbook, MDN.
- RED (not banked): wikiHow (robots/ToS prohibits AI/ML use), Mongabay
  (licence not verifiable on-page), business.govt.nz (CC BY-NC), Wayback
  business blogs (licences unverifiable), post-2022 content without
  provenance.

Licences were verified at source during fetch (LICENSE file at the pinned
git commit; licence statement in the captured/live page), not assumed.

## Human-confidence labels

- H1 — provenance human: named author + pre-2022 git commit or editorial
  publication (git sources, Google Search Central, GDS blog, Global Voices).
- H2 — high confidence: pre-2022 capture/date from an editorial org or
  dated platform (GOV.UK pages last updated pre-2022, Wikinews, Stack
  Exchange pre-2022 Q&A).
- H3 — historical likely-human: pre-2022 first-published but possibly
  revised later, or generic pre-2022 web. Never treated as proven — GPT-3
  and commercial copy tools existed from 2020.

## Matched-generation briefs

Each doc carries `brief` = {topic, type, length_words, structure_outline,
tone, audience}. The authorised matched-AI-generation phase must feed models
ONLY this brief, never the human text. Generation itself is gated on a
20-pair pilot reported to the owner before bulk spend (see programme notes).

## Known limitations

- Git-sourced markdown loses templating variables (liquid `{% data %}`
  removed), leaving occasional mid-sentence gaps; structure is unaffected.
- Live-API sources (GOV.UK, Stack Exchange, Wikinews, Global Voices) do not
  store a separate raw HTML copy; the fetch scripts + URLs + publisher
  metadata are the provenance.
- Registers are source-assigned, not hand-labelled per doc.
- The true "listicle" register (10-best-X commercial pages) has no
  licence-clear source; FAQ/how-to hard negatives are over-sampled instead,
  and `n_headings >= 5` subsets stand in for listicle shape.
