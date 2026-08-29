# Cycle-2 corpus manifest

Built 2026-08-28. **15,514 documents**: 5,655 AI, 9,859 human.

Purpose: cycle-2 retrain corpus: published-register prose on both sides (articles, marketing/SEO, social posts, academic writing), no chat replies.

## Sources included

### `elisabeth-pl-pl/GRADTEX`

**Licence:** CC BY 4.0

Graded AI-detection benchmark built on MAGE (Apache-2.0). Human texts inherited from MAGE; 13 generation and editing scenarios applied by seven models.

**Used for:** AI side: article, tech-news, scientific, encyclopaedic and review prose from claude-sonnet-4.6, gpt-5.4-mini, gemini-3.5-flash, qwen3.5-27b, gemma-4-31b/e4b and mistral-small-3.2, plus gpt-3.5-turbo and davinci-00x for older-era coverage. Human side: the MAGE human pool (XSum, SciXGen, SQuAD, Yelp, ELI5, Change-My-View).

**Caveat:** The 2026 frontier generators appear ONLY in GRADTEX's own test split, so rows drawn from them are re-split here by content hash. Anyone benchmarking against a published GRADTEX leaderboard must not use this corpus's train rows. The `fiction` and `conversations` domains are excluded entirely: wrong register.

### `mild-rgb/aita-human-vs-ai`

**Licence:** Apache-2.0

First-person r/AmItheAsshole judgement narratives written by seven August-2026 models against the same floor prompt.

**Used for:** AI side of the social register: gpt-5.6-luna-pro, gemini-3.7-flash, grok-4.6, deepseek-v4-pro, qwen3.8-max, glm-5.3 and nemotron-3.5-lightning.

**Caveat:** The human half of this dataset is REDACTED upstream (the Reddit text is not the publisher's to redistribute), so only the AI half is usable. The corpus's human social register therefore comes from a different Reddit pool (GRADTEX/MAGE: Change-My-View, ELI5, Writing Prompts) and from MAGA's human Reddit rows. That is a genuine confound: a classifier could learn AITA-topic rather than AI-authorship. Measure the social register separately and treat a strong social result with suspicion.

### `HAT-Baselines/HAT-Bench`

**Licence:** Apache-2.0

289k-row human/AI hybrid benchmark. Each essay_id carries v0 (pure human) through v8 (progressively AI-edited) with token- and sentence-level AI-span labels.

**Used for:** Both sides across four domains — student essays, research abstracts, news, business reports — from gpt-5.4 (`openai/gpt-5.4-2026-03-05`), gpt-5.4-nano, gemini-2.5-flash and qwen3-8b. v0 rows are the human side; v1–v8 supply the partially-edited AI side with the edit level recorded per sample.

**Caveat:** Read as bounded byte ranges from the head of each of the 16 main cells (55 MB per cell against files of 20–790 MB), not the whole benchmark, so the sample is the head of each file rather than a random draw across it. The four generator cells share essay_ids, so v0 rows duplicate across cells and are deduplicated by text hash — which is why human business reports are the thinnest cell in the corpus. Only the essay cells have datable provenance; abstracts, news and reports are human by dataset construction with no published collection date.

### `anyangsong/MAGA`

**Licence:** MIT

MAGA-Bench: ~1M generations, 12 generators, 20 domains, four alignment-augmentation methods.

**Used for:** Older-era AI coverage tagged `2024-2025-older`, and human rows for the reference and social registers.

**Caveat:** Read from the two validation shards only (MGB_val, MAGA_val), because the train shards are sorted by domain and a prefix range would return one domain. MAGA's Reddit generations open with a visible 'Here is the body of the post:' preamble, so the social register takes its AI from AITA instead and only MAGA's human Reddit rows are kept. MAGA human rows carry no published collection date.

### `allenai/c4 (en)`

**Licence:** ODC-BY 1.0

Colossal Clean Crawled Corpus, English split — the April 2019 Common Crawl snapshot. Every document predates ChatGPT by construction.

**Used for:** The bulk of the human business, marketing and SEO copy: agency and service pages, product and company pages, SEO blog posts, plus journalism and scholarly web writing. This is the register where the current false positives concentrate.

**Caveat:** Genre is assigned by URL and phrase heuristics, not by a human reading each page, so the `business-marketing-copy` and `seo-blog-post` labels are approximate. Forum and thread pages are rejected outright. Ten shard heads of 12 MB each were streamed; the sample is the head of each shard, not a uniform draw. The underlying pages remain their authors' copyright — ODC-BY covers the database, and this corpus is research use.

### `realbenpope/PERSUADE_manageable`

**Licence:** MIT (mirror); upstream PERSUADE 2.0, The Learning Agency Lab, CC BY 4.0

US grade 6–12 argumentative student essays, collected 2010–2020.

**Used for:** Human academic register, and specifically non-professional human writing — the class a detector most often mistakes for AI.

**Caveat:** Mirror licence (MIT) and upstream licence (CC BY 4.0) differ; both are recorded. Only `persuade_full_text.csv` is used, so the demographic and score metadata in the companion file is not carried through.

### `Opace OpenRouter generation run`

**Licence:** Owner-generated, unrestricted internal use

The owner's own 2026 generation run into `../generated-corpus/generated.jsonl`.

**Used for:** Current-model AI across exactly the registers the tool's users check. The completed run is 4,050 documents from 21 models across 19 registers: SEO service pages, product descriptions, case studies, company blogs, FAQ pages, landing and category pages, press releases and newsletters (marketing); thought leadership, how-to explainers and news pieces (article); LinkedIn posts, X threads, Facebook posts and Instagram captions (social); academic essays, literature reviews and discussion sections (academic).

**Caveat:** This is the only AI source in the corpus written to the owner's own register brief rather than borrowed from a benchmark, and it is the newest — claude-opus-5, claude-sonnet-5, gpt-5.6-terra/luna/sol, gemini-3.7-flash, grok-4.6, deepseek-v4-pro, kimi-k3, glm-5.3, qwen3.8-max, llama-4-maverick, mistral-medium-3.5. `build_corpus.py` re-reads the file on every run, and refuses to file an unrecognised register rather than defaulting it to `article` — an earlier pass of this build did default it, and quietly mislabelled 727 social posts and 461 academic documents as articles.

### `tests/battery/human-corpus-v1.json, human-corpus-v2.json`

**Licence:** Owner-curated (Opace)

The shipped human regression battery, with per-row source URL, archive URL, date and verification notes.

**Used for:** Admitted as themselves and PINNED to the test split. Never train, never calibration.

**Caveat:** This file is being extended by another workstream and grew from 300 to 3,484 rows during this build. The build snapshots it once, at quarantine-index time, so the index and the admitted rows can never disagree; the snapshot size is recorded below.

## Rows kept, by source

| source tag | documents in corpus.jsonl |
|---|---|
| `battery-human-corpus-v2` | 4,164 |
| `openrouter-2026-08` | 2,628 |
| `gradtex-human (MAGE)` | 2,368 |
| `c4-en-2019` | 1,993 |
| `gradtex-ai` | 1,390 |
| `persuade-2.0` | 507 |
| `maga-human` | 343 |
| `maga-ai` | 278 |
| `aita-human-vs-ai` | 277 |
| `hatbench-reports-v0` | 205 |
| `hatbench-essays-gpt-5.4` | 118 |
| `hatbench-abstracts-gpt-5.4` | 112 |
| `hatbench-essays-v0` | 92 |
| `hatbench-news-gemini-2.5-flash` | 84 |
| `hatbench-news-gpt-5.4-nano` | 81 |
| `hatbench-abstracts-v0` | 80 |
| `hatbench-news-gpt-5.4` | 79 |
| `hatbench-news-qwen3-8b` | 69 |
| `hatbench-news-v0` | 67 |
| `hatbench-abstracts-gemini-2.5-flash` | 64 |
| `hatbench-essays-qwen3-8b` | 62 |
| `hatbench-essays-gpt-5.4-nano` | 62 |
| `hatbench-reports-gemini-2.5-flash` | 56 |
| `hatbench-abstracts-gpt-5.4-nano` | 54 |
| `hatbench-reports-gpt-5.4-nano` | 54 |
| `hatbench-reports-gpt-5.4` | 48 |
| `hatbench-reports-qwen3-8b` | 47 |
| `hatbench-essays-gemini-2.5-flash` | 47 |
| `hatbench-abstracts-qwen3-8b` | 45 |
| `battery-human-corpus-v1` | 40 |

Counts after deduplication by normalised text hash, quarantine, and register balancing. 2,292 candidates were dropped as duplicates and 176 on quarantine grounds ({'c4:8gram-overlap': 13, 'c4:battery-exact-match': 163}).

## Sources measured and rejected

### `TeichAI/Claude-Sonnet-4.6-Reasoning-1100x, TeichAI/Claude-Opus-4.6-Reasoning-887x`

**Licence:** Apache-2.0

Licence-clear and current, but rejected on register grounds after measurement. Of 1,982 single-turn assistant replies, **0** survive a published-register filter (no chat opener, no heading or bullet scaffolding, no direct address to a questioner, at least two prose paragraphs). Relaxing the filter to allow up to 10% markup lines lifts the yield to 1. These are markdown-formatted chat answers — precisely the register cycle 1 overfitted to — so including them would reproduce the failure this corpus exists to fix. The extractor is retained in `sources.py` with its cap set to 0 so the measurement is reproducible.

## Sources recorded but not included (licence unclear or unusable)

- **`wikiHow (as an independent source)`** — CC BY-NC-SA 3.0. The obvious source of human how-to and SEO-style copy, and deliberately NOT pulled directly: the non-commercial clause is incompatible with a commercial plugin. How-to text enters only through MAGE/GRADTEX and MAGA, under those datasets' own licences, and that inherited position is itself worth a legal read before shipping a model trained on it.

- **`introvoyz041/PERSUADE_corpus_2.0`** — MIT. Listed as a PERSUADE mirror but contains only scoring-rubric PDFs, no essay text. Recorded so nobody else spends time on it.

- **`mild-rgb/aita-human-vs-ai human half`** — Apache-2.0 (dataset), Reddit text (not the publisher's to license). Rebuildable by hydrating from AI2's Scruples by `q_id`. Not done here: it would mean redistributing Reddit-authored text whose terms are not clear for this use. Recorded as a deliberate omission, not an oversight.

## Quarantine

Two tiers, deliberately different:

- **Hard, aborts the build.** An exact normalised-text-hash collision with either evaluation set raises `RuntimeError` and stops the run. Evaluation leakage is not recoverable after the fact, so it must stop the build rather than be quietly filtered.

- **Soft, drops the candidate.** A collision with the shipped regression battery drops that candidate and is counted. The battery is being extended by another workstream from the same public archives this corpus draws on, so collisions there are expected rather than exceptional. The battery rows themselves are still admitted — as themselves, pinned to the test split.

On top of both, any candidate sharing more than 10% of its 8-grams with the held-out index is dropped, which catches near-duplicates differing only in punctuation.

Held-out rows indexed at build time:

| held-out set | rows |
|---|---|
| `eval-samples.json` | 34 |
| `provider-eval/eval-set.jsonl:test` | 72 |
| `tests/battery/human-corpus-v1.json` | 40 |
| `tests/battery/human-corpus-v2.json` | 4,164 |

`verify_corpus.py` re-checks all of this against the finished file, including feeding a known held-out row back through the check to prove the abort actually fires.

## Splits

group-aware, content-hash ordered, 70/15/15 quantile cut applied WITHIN each (register, side, provider, era) stratum; never index-based.

| split | documents |
|---|---|
| train | 7,856 |
| cal | 1,708 |
| test | 5,950 |

## Register balance

| register / side | available | asked for | balanced target | kept |
|---|---|---|---|---|
| academic/ai | 1,463 | 1300 | 1,300 | 1,300 |
| academic/human | 1,772 | 1300 | 1,300 | 1,300 |
| article/ai | 1,834 | 1300 | 1,300 | 1,300 |
| article/human | 2,033 | 1300 | 1,300 | 1,300 |
| marketing/ai | 2,306 | 1600 | 1,600 | 1,600 |
| marketing/human | 3,030 | 1600 | 1,600 | 1,600 |
| reference/ai | 1,124 | 450 | 450 | 450 |
| reference/human | 836 | 450 | 450 | 450 |
| report/ai | 461 | 450 | 205 | 205 |
| report/human | 205 | 450 | 205 | 205 |
| social/ai | 1,753 | 800 | 800 | 800 |
| social/human | 816 | 800 | 800 | 800 |

Plus 4,204 battery rows, exempt from balancing and pinned to test.

## Honest gaps

- **Human business reports are the thinnest cell: 205 documents.** They come from HAT-Bench `reports` v0 only, and the four generator cells share essay_ids so the v0 rows deduplicate heavily. The `report` register is therefore capped at 205 per side — an order of magnitude below marketing. Fixing this needs a genuine open corpus of human-written business reports (annual reports, NGO and government publications under OGL or CC BY are the obvious place to look); none was pulled in this pass.

- **The social register has no matched human side, and this is the corpus's weakest claim.** AI social is r/AmItheAsshole narratives plus LinkedIn posts, X threads, Facebook posts and Instagram captions from the owner's run. Human social is Change-My-View, ELI5, Writing Prompts and MAGA Reddit — long-form forum prose, and *nothing* from LinkedIn, X, Facebook or Instagram, because no licence-clear pre-2022 corpus of platform social copy was found. So for platform-social posts the corpus has an AI class with no human class at all, and for forum posts it has two different sub-communities on either side. A model can score well on this register by learning platform or topic rather than authorship. Treat every social-register number as unproven. The two fixes are hydrating the AITA human half from AI2's Scruples by `q_id`, and sourcing pre-2022 platform social copy with clear terms.

- **No professional human marketing copy with named authorship.** The human marketing side is C4 web pages from the April 2019 crawl, labelled by URL and phrase heuristics rather than read by a person. It is genuinely pre-ChatGPT and genuinely commercial, but it is crawl-quality: some of it is thin, some is templated, and the genre labels are approximate. Nobody has eyeballed a sample.

- **Sampling is head-of-file, not random.** HAT-Bench and C4 are read as byte ranges from the start of each file, and MAGA from its validation shards. Within a file the rows are not shuffled, so the sample inherits whatever ordering the publisher used. This is a bounded-bandwidth compromise and it is not a uniform draw.

- **The owner's generation run is complete and fully wired in** — 4,050 documents, 21 models, 19 registers, covering all four target registers including social and academic. No gap here; recorded because the brief asked for the slot to be accounted for either way. It is a single-vendor sample though: everything routed through OpenRouter on one day with one prompt family, so whatever house style those prompts induce is shared across all 4,050 documents and a classifier may learn the prompt rather than the models.

- **Only 205 human business reports, so `report` is capped at 205 per side** — an order of magnitude below marketing, and the one register where the corpus cannot support a confident claim either way.

- **Era coverage is lumpy.** 2022–2023 models (gpt-3.5-turbo, davinci-002/003) contribute only a few dozen documents after register balancing, so the corpus can say very little about detection decay across model generations. GRADTEX is the only source carrying them.

- **Reference and academic human text leans encyclopaedic and student-written.** There are no open-access journal discussion sections, no government or NGO publications, and no CC-licensed blog corpora in this build. All three were identified as good candidates and none was pulled; they are the first thing to add in a follow-up pass.

- **Genre labels are machine-assigned throughout.** Register and genre come from source metadata where it exists and from heuristics where it does not. No human has validated a sample of the labels, so the per-genre breakdowns in CORPUS-REPORT.md carry that uncertainty.

