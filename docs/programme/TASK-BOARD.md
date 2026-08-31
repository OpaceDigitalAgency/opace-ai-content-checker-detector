# Task board — single source of truth for open work

Tracked, in-repository, so it survives context loss, session ends and fresh clones.
**Update this file the moment an item changes state.** Statuses: DONE (with date and
pointer), IN PROGRESS (with owner), QUEUED, BLOCKED (on what), OWNER (waiting on David),
PARKED (by agreement).

Last updated: 31 August 2026, by the orchestrating session working with the owner.

## Done today — 31 August 2026

| Item | Evidence |
|---|---|
| Checker run no longer races the on-device model | site commit `cda07147`; verified live |
| Kill-switch + ten-path zero-logging drills re-proven on `opace-detector-00027-yuq` | `.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31.md` |
| Per-request limit raised to 8,000 words / 100,000 chars, deployed via `deploy.sh` as revision `opace-detector-00008-wsf` (revision counter restarted its series — newer than `00027-yuq`, not a rollback); both drills re-proven on it: kill switch via real alert policy (48.4 s delivery, 44–88 s range over five fires, ~5.3 s downtime, byte-exact restore) and ten-path zero-logging probe (fresh markers, zero hits, canary-proven; 7,000-word draft scored, 8,500-word refused `too_long`) | `.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31-8K.md` |
| Corpus reconciliation on deployed cycle-2 model (the §5a contradiction closed) | `docs/measurements/CORPUS-RECONCILIATION-2026-08-31.md` |
| Lawful-basis notice drafted; DPIA updated; citations point at the 31 Aug probe | `docs/legal/LAWFUL-BASIS-NOTICE.md` |
| CAPABILITIES.md stale band-boundary entry corrected | `docs/CAPABILITIES.md` |
| Provider status panel built on the Lab page, shared data module with checker, lapse-degradation + build backstop | site commit `520b09d3`; live |
| Writing-notes restyle; plain-English rule names; jargon headings rewritten | site commit `8e819641`; live |
| Rule-tell aggregate figures reproduced exactly (kept, now cited) | `docs/measurements/RULE-TELL-AGGREGATES-2026-08-31.md` |
| Evidence layer v1 ("Why it reads this way"): 21-phrase curated lexicon, rhythm tell, closer tell, strongest passage | site commit `d935848b`; live |
| Document-tells measurement: echo declined, scaffold split verdict, phrase lexicon gated | `docs/measurements/DOCUMENT-TELLS-2026-08-31.md` |
| Four-way separability analysis run: "Likely AI but human edited" not supportable (0.448); handover figures confirmed | `services/local-engine/research/fourway-separability-2026-08-31/RESULTS.md` |
| Consolidated technical architecture, science, evidence, claim boundaries and 20-paper research map | `docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md`; discrepancies kept separately in `docs/programme/ARCHITECTURE-DOC-FOLLOW-UP-ISSUES-2026-08-31.md` |
| Shape-tell escalation arm priced (measurement only, decision with the owner): declined on the raw-markdown surface (+0.06pp for +0.16pp held out); clears the minimum-evidence bar on the stripped surface (+1.39pp for +0.06pp held out, +55 AI / +1 human in corpus) — conditional on input normalisation and a fiction pricing of wpp_cv. Side-finding to triage: the shipped pair flags 22.5% of structured human docs when raw markdown is scored; stripping the syntax un-flags 59/60 | `docs/measurements/ESCALATION-ARM-2026-08-31.md`; `services/local-engine/research/escalation-arm-2026-08-31/` |

## Done — website agent batch 2, 31 August 2026 (commits `242169f6`…`a5d66ca2`)

1. Evidence card renders from Potentially AI upward, with honest sub-flag intro
2. Under-repetition tell shipped (ported verbatim from signal-science; bound = 1st percentile of 4,636 fresh humans; suppresses the opposite-tail editing note)
3. Composite scaffold tell shipped (4.8% AI vs 1.7% human, n=292 in fine print; names the repeating shape)
4. The three drafted site-copy corrections applied (rewrite-strength ladder 1.4%/11.0%/21.0% with denominators; merged heading split into its two attacks)
5. Humaniser weakness published as the fourteenth research paper; sweep of measured-but-unpublished findings recorded in the agent's report (candidates: per-sentence reliability, four-way separability, phrase ratios, sensitivity curve, synthetic cadence, paired-corpus construction)
6. Research tile added to the suite nav
7. Paste-HTML structure capture shipped (real tags when the clipboard carries them; fingerprint-matched, sanitised, staled on edit)

## Done — website agent batch 3, 31 August 2026 (commits `9e12db0e`, `50b12c77`)

1. Compressed-rhythm (paragraph cadence) tell shipped: verbatim TS port of `signal-science/cadence/cadence.py` with the probe's mutation tests; quotes the single highest-scoring paragraph; rates 28.9% (266/921) vs 14.0% (483/3,451) in fine print; over-structured register, never "AI"; nothing touches the verdict
2. Cadence sample fixtures rescued from the dying scratchpad into `signal-science/cadence/samples/` (engine commit `f1fbdd8`); all 12 python probe tests pass from the repo copy
3. Word-count regularity tells shipped from the structured-corpus addendum: wpp_cv ≤ 0.2 (13.2% vs 0.8%, 16×) and sec15 ≥ 0.9 (10.5% vs 0.76%, ~14×), 500-word floors, hard-negative rates in fine print
4. Shape baselines re-based on the 2,513-doc structured human corpus: scaffold now 0.72% human (18/2,513, ~6.6×), rhythm 31.0%/8.6%, closer demoted to colour (~1.8×, never counted); sections-per-article, bullet-happiness and keyphrase echo NOT shipped, as the measurement directs

## Done — website agent batch 4, 31 August 2026 (site commit `dba8d498`)

Six research papers published; the library is now twenty papers, nav and index updated:

| Paper | Source measurement |
|---|---|
| the-rhythm-you-can-hear | `SYNTHETIC-CADENCE.md` (the founder's-ear story, the 5-for-5 refusal, fiction gap) |
| why-no-sentence-gets-a-number | `PER-SENTENCE-RELIABILITY.md` |
| the-verdict-we-refuse-to-give | `FOUR-WAY-VERDICT-SEPARABILITY.md` + `fourway-separability-2026-08-31/RESULTS.md` (final run) |
| the-tells-we-tested | `DOCUMENT-TELLS-2026-08-31.md` incl. the structured-corpus addendum and the verdict flips |
| eighteen-phrases | `AI-PHRASE-RATIOS.md` (table read from the shipped JSON, never retyped) |
| the-price-of-strictness | `SENSITIVITY-CURVE.md` (measurement note; default unmoved) |

Judged too thin to publish standalone: `PHASE-2-PAIRED-CORPUS.md` (corpus construction; its substance already carries the humaniser and four-way papers' method stamps).

## In progress — corpus agent (data lane)

1. Structured human corpus, Git/Search-Central/Common-Crawl strategy, three legal buckets, H1–H3 human-confidence labels, ~4,000 doc cap
2. Owner's side-by-side scaffold table (human vs AI, ≥500 words): preliminary from existing data first, final on the new corpus; rows: sections/article, heading depths, paragraphs/section, words/paragraph, sequential paragraph-length variation, lists/section, items/list, sentence CV, with denominators
3. Full structural fingerprint per model and register
4. Shape-tell re-test on the proper human baseline (echo, scaffold, bullets, word-count regularity)
5. Matched AI generation: brief-extraction fields banked per human doc; then 20-pair PILOT reported to the orchestrator for review BEFORE bulk; $20 hard self-cap of the $30 OpenRouter balance (owner authorised); model mix weighted to evaders (llama-4-maverick, grok-4.6) + flagships; whole-topic + whole-model-family held-out eval slice decided before generation

## Next (unblocked when the above land)

- Promote whichever fingerprint components survive the human baseline into shipped tells
- Next training cycle: paired corpus (owner-approved) + matched pairs + structural features; calibration spread as a training objective (cycle-4 lesson); evaluate on the held-out slice for the first genuinely independent evasion measurement
- **Grammarly-rung measurement (owner, 31 Aug):** the rewrite ladder measures LLM rewrites (1.4%/11.0%/21.0% flagged) but never the light grammar-tool pass real writers use. Owner's agency observes human copy flagging as AI after a Grammarly pass in paid tools. Measure that rung: human originals vs their Grammarly-class-polished versions, on our detector and (BYO-account) commercial ones. Related confounds to record in the study design: gov/academic human prose was tool-polished pre-2022 (biases the human baseline towards AI-likeness — makes current lifts conservative), and models were trained on exactly that prose (circularity). Corpus gap on record: licence-clear "ordinary business blog" human writing remains unobtainable; the human baseline is 44% government-adjacent, mitigated by per-register direction checks.

## Waiting on the owner

- JustDone manual test pack (12 documents; their terms ban automation): `services/local-engine/research/justdone-eval-2026-08-31/manual-run/`
- £20–50/month commercial-humaniser subscriptions decision (training on genuine humaniser output)
- Verdict-redesign acceptance (five-band ladder, live since 30 Aug)
- Threshold position: advice given (leave it; lowering to catch the 0.8082 miss would flag ~22% of humans) — silence = keep
- DPIA + lawful-basis notice: qualified legal review (needs a real lawyer)

## Parked by agreement

- Watermark lab spin-out repository (R4 generation gate applies when revived)
- Build reproducibility (blocks plugin submission)
- Store submissions: WordPress.org, Chrome Web Store, npm, PyPI, Astro catalogue (all gates open; R1 credential guard required before any rebuild/release)
- Chrome/WordPress/Astro credential-guard port (R1) — required only when the above unparks

## Standing rules for whoever updates this

- Sync outward from the repository; never trust untracked root copies.
- No claim without measurement: every figure carries corpus, denominator, threshold, runtime.
- Tells illustrate, never decide: the AI verdict remains model-only until a signal is trained in.
- A measured decline is a good outcome; record it here like any other completion.
