"""MANIFEST.md: one section per source, with its licence, what it was used for
and the caveat that matters. Counts come from manifest.json so the prose and
the numbers cannot drift apart."""

from __future__ import annotations

import collections
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

SOURCES = [
    ("europepmc-oa", "Europe PMC open-access subset", """
**Licence:** per article, one of CC BY, CC BY-NC, CC BY-NC-ND, CC BY-NC-SA or CC0. \
Articles under any other licence are rejected at fetch time and the exact string \
is stored on every row.

Full-text JATS XML for open-access articles first published 2018-2022, read \
through the Europe PMC REST API. Introduction, background, literature review, \
discussion and conclusion sections are extracted; **abstracts are deliberately \
excluded** because they are formulaic and are not what a user pastes into a \
detector. Tables, figures, formulae and reference lists are stripped before the \
prose is taken.

**Used for:** the academic registers - `academic-introduction`, \
`academic-lit-review`, `academic-discussion`, `academic-conclusion`.

**Caveat:** Europe PMC is a biomedical index first. Twenty-two subject queries \
were used to widen it deliberately - education, sociology, linguistics, history, \
ethics and philosophy, policy and law, anthropology, business and management, \
economics, communication and media - and the discipline label is carried per row, \
but this is *not* a humanities archive and the humanities coverage is \
health-adjacent humanities rather than, say, literary criticism or theology. That \
gap is real and is listed under "What could not be obtained". Section detection is \
by heading text, so a paper whose discussion is headed "General remarks" is missed \
rather than mislabelled.
"""),
    ("gov.uk", "GOV.UK research, policy and corporate reports", """
**Licence:** Open Government Licence v3.0 (Crown copyright). Documents whose text \
asserts third-party copyright are dropped.

Filtered on a 2018-2022 publication timestamp and taken through the GOV.UK search API to the content API to the \
publication's HTML attachment, which carries the full report body. PDF-only \
publications are skipped rather than OCR-guessed. Reports are split at h2 \
boundaries; contents pages, annexes, glossaries and reference lists are dropped.

**Used for:** `white-paper` (independent reports, policy papers, impact \
assessments, consultation outcomes), `research-summary` (research and statistics \
publications) and `company-update` (departmental corporate reports).

**Caveat:** the search filter is GOV.UK's `public_timestamp`, but the row's `era_year` is the document's own `first_published_at`, which for updated publications can be earlier - the delivered span is 2014-2022, not the 2018-2022 the filter asked for. Beyond that: one government's house style. That is why CRS was added alongside it. \
Chunking at headings means a single long report contributes several passages; \
per-source-per-register capping in `build_corpus.py` limits how far any one \
publisher can dominate a register.
"""),
    ("crs-report", "Congressional Research Service reports", """
**Licence:** works of the United States government, not subject to copyright under \
17 U.S.C. 105. Retrieved through EveryCRSReport.com, which publishes an HTML \
rendering of each report.

A random draw, seeded, from CRS reports published 2018-2022.

**Used for:** `white-paper`.

**Caveat:** US federal policy analysis has a distinctive neutral register of its \
own. Together with GOV.UK the white-paper class is two governments, not a spread \
of think-tanks and standards bodies. NGO and standards-body publications were \
sought and are noted as a gap.
"""),
    ("globalvoices", "Global Voices", """
**Licence:** CC BY 3.0. Global Voices' own attribution policy describes the licence \
as radically open and explicitly permits adaptation; no AI or research carve-out is \
asserted.

Reported international journalism, sampled month by month through the WordPress \
REST API with a per-year quota so the sample spans 2013-2021 rather than piling up \
in the most recent year.

**Used for:** `longform-journalism`.

**Caveat:** Global Voices is a translation-and-citizen-media newsroom; a proportion \
of its output is translated into English rather than drafted in it, which is a \
different kind of English from a British or American feature desk. Author bylines \
and translator credits are trimmed from the tail of each article.
"""),
    ("mongabay", "Mongabay", """
**Licence:** CC BY-ND 4.0. Storage here is verbatim, which ND permits; Mongabay's \
republishing page asserts no AI or research restriction.

Reported environmental features 2013-2021, same WordPress REST route and same \
per-year quota.

**Used for:** `longform-journalism`, as a second newsroom so the register is not one \
publication's house style.

**Caveat:** single-subject reporting - environment, conservation and land use - so \
topic and vocabulary are narrow even though the form is right.
"""),
    ("sec-edgar-10k-mdna", "SEC EDGAR 10-K narrative (Item 7)", """
**Licence:** mandatory public disclosure documents published by the SEC, which \
asserts no copyright over them and distributes them freely from EDGAR. Filers may \
hold copyright in the underlying text; use here is research use of a public record, \
and every row carries the Archives URL so the original is verifiable.

Management's Discussion and Analysis - the part of an annual report that is written \
as prose - from 10-K filings 2018-2022. Financial tables are stripped before \
chunking and any passage that is still mostly figures fails the prose test.

**Used for:** `company-update`.

**Caveat:** MD&A is written under legal review and reads like it. It is genuine \
human corporate narrative, which is the point, but it is not the same thing as a \
corporate blog post, and CC-licensed pre-2022 corporate blogs could not be found at \
any useful scale. At most three passages are kept per filing.
"""),
    ("persuade-2.0", "PERSUADE 2.0 student essays", """
**Licence:** CC BY 4.0 upstream (PERSUADE 2.0, The Learning Agency Lab). The Hugging \
Face mirror used here, `realbenpope/PERSUADE_manageable`, declares MIT. Both are \
recorded because they differ.

US grade 6-12 argumentative and expository essays collected 2010-2020. Only essays \
of 500 words or more are kept. The draw is a seeded random sample across all 25,996 \
essays, not the head of the file: the file is grouped, and taking the head produced \
a single prompt's worth of essays on the first attempt.

**Used for:** `student-essay`.

**Caveat:** the mirror's essay-level metadata carries only the competition split, \
not prompt name, grade or collection year, so `era_year` is null for this source and \
the 2010-2020 window is recorded here instead of per row. PERSUADE also appears in \
the cycle-2 corpus; it is not held-out material, but anyone combining the two \
corpora should deduplicate on `norm_sha256`.
"""),
    ("internet-archive-cc-texts", "Internet Archive Creative-Commons texts", """
**Licence:** per item, the `licenseurl` the uploader set - CC BY, CC BY-ND, CC BY-NC-ND, \
CC BY-NC-SA or the CC public-domain mark. Stored per row.

English-language Creative-Commons texts dated 2010-2022 whose subject metadata \
includes fiction, novel, short stories, literature, storytelling, memoir, creative \
writing or essays. Passages are taken from the middle of each work, past the front \
matter.

**Used for:** `story` - creative long-form, fiction and creative non-fiction.

**Caveat: this is the weakest source in the corpus and the reason is structural.** \
Modern short fiction under an open licence barely exists. Strange Horizons, the \
obvious candidate, states that all its material is "copyrighted to the original \
authors and may not be reproduced without permission"; the commercial genre \
magazines are all rights-reserved. What is left is the Internet Archive's \
Creative-Commons text pool, which is uneven self-publishing and scanned material. \
Filters applied: an English-word test, the shared prose test, an OCR-mojibake \
rejection, at most three passages per item and at most four items per uploader. \
Some passages are creative non-fiction or essays about literature rather than \
original fiction, and some are OCR of scanned pages. Treat this register's numbers \
with more suspicion than the others.
"""),
    ("openrouter-longform-2026-08-28", "Opace OpenRouter long-form generation run", """
**Licence:** owner-generated, unrestricted internal use.

Thirteen current models generating into the eight long-form registers the shipped \
detector fails on, at 800-2,000 word targets, across the same three prompt styles \
as the earlier `generated-corpus` run - plain, house-brief, human-voice - so the \
comparison carries across both runs. Model allocation is weighted to the known \
evaders: grok-4.6, qwen3.8-max, deepseek-v4-pro and claude-opus-5 take the largest \
shares, the remaining flagship tiers take medium shares, and the cheap models carry \
volume.

**Used for:** the whole AI side.

**Caveat:** these are single-shot generations from a fixed prompt bank of 68 topics \
x 3 styles. They are not edited, not human-revised and not adversarially rewritten, \
so they are the easy case relative to a user who redrafts model output. Nothing here \
measures hybrid human-AI text.
"""),
]

EXCLUDED = """
## Sources examined and rejected

**The Conversation** - excluded on the publisher's own terms. Its republishing \
guidelines state that its Creative Commons licence "prohibits using our content as \
training data for AI systems". It would otherwise have been the single best fit for \
long-form journalism written by academics, and its exclusion is the largest single \
loss in this build.

**Strange Horizons** - excluded. "All material in Strange Horizons is copyrighted to \
the original authors and may not be reproduced without permission."

**BAWE (British Academic Written English)** - not obtained. Distributed under a \
licence that does not permit redistribution of the corpus, and registration-gated.

**ICLE (International Corpus of Learner English)** - not obtained. Commercial \
licence, not open.

**ASAP-AES** - not used. The Hugging Face mirrors carry no clear licence statement, \
and the essays are mostly below the 500-word floor.

**Internet Archive pulp-magazine archive (Interzone and similar)** - rejected. \
Scanned commercial magazines with no open licence.

**Feedbooks CC originals** - unreachable (403).

**arXiv full text** - not used in this pass. The Atom API returns abstracts only, and \
per-article licence has to come from the OAI-PMH `arXivRaw` metadata; the cost of \
doing that correctly did not fit this pass, and Europe PMC already supplied sectioned \
full text with per-article licences.
"""

GAPS = """
## What could not be obtained, and why

1. **Humanities full text at scale.** Europe PMC gave social science, education, \
linguistics, ethics and policy, but not literary criticism, theology, classics or \
philosophy proper. DOAJ returns metadata and abstracts, not full text; CORE needs an \
API key this session did not have; SSOAR is PDF-first. The academic register here is \
therefore social-science-and-STEM weighted, and a detector tuned on it should not be \
claimed to be validated on humanities essays.

2. **Modern open-licensed short fiction.** Explained under the Internet Archive \
section above. This is a licensing fact about the world, not a shortfall of effort: \
the literary magazines that publish modern short fiction reserve rights.

3. **Think-tank, NGO and standards-body white papers.** The white-paper register is \
two governments (UK and US). IPCC, WHO, World Bank and OECD publications are largely \
PDF-first and, in WHO's case, NC-licensed; they were not fetched in this pass.

4. **Pre-2022 corporate blogs under an open licence.** Searched for, not found at \
useful scale. SEC MD&A narrative stands in for corporate communications, and reads \
differently.

5. **Era spread on the academic side.** Europe PMC's relevance ordering returns recent \
work, so the first pass was 2022-heavy; four extra per-year passes for 2018-2021 were \
run to correct it. The result is better spread but still tilts recent, and the \
per-year counts are in REPORT.md.
"""


BUDGET = 13.0


def main():
    man = json.load(open(os.path.join(HERE, "manifest.json")))
    global SPEND
    SPEND = 0.0
    raw = os.path.join(HERE, "ai-longform-raw.jsonl")
    if os.path.exists(raw):
        for line in open(raw):
            if not line.strip():
                continue
            d = json.loads(line)
            SPEND += (d.get("usage") or {}).get("cost_usd") or 0.0
    c = man["counts"]
    by_src = c["human_by_source"]
    L = ["# Long-form corpus: manifest\n",
         f"Built 28 August 2026. **{c['human'] + c['ai']:,} documents**: "
         f"{c['human']:,} human, {c['ai']:,} AI.\n",
         "Purpose: close the long-form gap in the training data. The shipped model "
         "detects marketing copy at 87% and academic prose at 0-5%; the training data "
         "barely contains academic or long-form journalistic writing on either side. "
         "Short-form social is explicitly out of scope for this build.\n",
         "\n## Sources included\n"]
    for key, title, body in SOURCES:
        n = by_src.get(key) or (c["ai"] if key.startswith("openrouter") else 0)
        L.append(f"### {title}\n")
        L.append(f"**Documents delivered:** {n:,}\n")
        L.append(body.strip() + "\n")
    L.append(EXCLUDED.strip() + "\n")
    L.append(GAPS.strip() + "\n")
    L.append("\n## Quarantine\n")
    L.append("Every candidate document is hashed on normalised text (NFKC, lowercased, "
             "punctuation stripped, whitespace collapsed) and checked against the "
             "held-out material below. An exact collision aborts the build. "
             "Near-duplicates are also screened, using 12-word shingle overlap at a "
             f"{man['shingle_overlap_threshold']:.0%} threshold; those are dropped and "
             "listed in `manifest.json` rather than aborting, because a shingle hit is "
             "a heuristic and not proof of identity.\n")
    L.append("| held-out source | texts |")
    L.append("|---|---|")
    for k, v in man["quarantine_sources"].items():
        L.append(f"| `{k}` | {v:,} |")
    L.append("")
    L.append(f"Result: **{len(man['exact_collisions'])} exact collisions**, "
             f"**{len(man['near_dupes_dropped'])} near-duplicates dropped**, "
             f"**{man['internal_duplicates_dropped']} internal duplicates dropped**.\n")
    L.append("\n## Build notes, including what went wrong\n")
    L.append(f"**Spend: ${SPEND:.2f} of the ${BUDGET:.0f} authorised.** That is every "
             "OpenRouter call made by this build - the 13-request calibration probe "
             "($0.38) and the three generation passes. Per-call cost is stored on every "
             "AI row under `usage.cost_usd`, so the total is recomputable from the "
             "delivered file rather than taken on trust.\n")
    L.append("The generation run was stopped and restarted twice, and the reason is "
             "worth recording because it wasted about an hour. `ThreadPoolExecutor.map` "
             "yields results in submission order, so a single slow generation blocks "
             "every finished result behind it and the run looks stalled when it is not. "
             "The first diagnosis - throttling - was wrong; a direct API call took 1.3 "
             "seconds while the run appeared frozen. Switching to `as_completed` fixed "
             "it. `--resume` was added at the same time and skips (model, prompt) pairs "
             "already in the output, so no spend was repeated.\n")
    L.append("A second, unrelated trap: the Tier 3 scorer left ONNX Runtime and OpenMP "
             "at their default one-thread-per-core and took 48 minutes to score 250 "
             "documents on a loaded machine. Capped at four threads it scores 50 in 1.9 "
             "seconds. `score_tier3.py` now sets both.\n")
    rej = man.get("rebuild_rejections") or {}
    if rej:
        L.append("Spot-reading the delivered rows caught a quality bug the sentence-count "
                 "prose test missed: GOV.UK contents pages and table dumps have long "
                 "entries, so they pass a sentence test, but their lines are short and "
                 "mostly unterminated. A fragment rule was added to "
                 "`common.looks_like_prose` and the corpus rebuilt from `raw/`, "
                 "rejecting " + ", ".join(f"{v} {k}" for k, v in sorted(rej.items())) +
                 " rows.\n")
    L.append("Twenty-eight of 952 generation requests returned no content, all with "
             "`finish_reason=length` - reasoning-mandatory endpoints spending the token "
             "budget before emitting prose. They are recorded in "
             "`ai-longform-raw.jsonl` and excluded from the delivered file.\n")
    L.append("\n## Files\n")
    L.append("| file | what it is |")
    L.append("|---|---|")
    for fn, what in [
        ("`human-longform.jsonl`", "human side, eval-set shape"),
        ("`ai-longform.jsonl`", "AI side, eval-set shape"),
        ("`samples/<provider>/<provider>__<model>__<register>__2026-08-28.jsonl`",
         "per-provider split, same naming convention as `../generated-corpus/samples`"),
        ("`manifest.json`", "machine-readable counts, collisions and drops"),
        ("`MANIFEST.md`", "this file"),
        ("`REPORT.md`", "word-count and register distributions, shipped-model baseline"),
        ("`tier3-scores.jsonl`", "per-document shipped-Tier-3 scores"),
        ("`raw/`", "unprocessed fetch output, one file per source"),
        ("`logs/`", "fetch and generation logs, including the spend log"),
        ("`fetch_*.py`, `build_corpus.py`, `score_tier3.py`, `report.py`",
         "the build, re-runnable"),
    ]:
        L.append(f"| {fn} | {what} |")
    L.append("")
    L.append("\n## Row shape\n")
    L.append("`id`, `side`, `register`, `provider`, `model`, `era`, `genre`, `text`, "
             "`prompt_style`, `tier`, `word_count`, `licence`, `source`, `era_year`, "
             "plus `sha256` and `norm_sha256`. Human rows carry `source_ref`, "
             "`publisher`, `discipline` and `section_title`; AI rows carry `domain`, "
             "`prompt_id`, `length_band`, `temperature`, `generated_at`, `model_served` "
             "and per-call `usage` including cost.\n")
    open(os.path.join(HERE, "MANIFEST.md"), "w").write("\n".join(L) + "\n")
    print("wrote MANIFEST.md")


if __name__ == "__main__":
    main()
