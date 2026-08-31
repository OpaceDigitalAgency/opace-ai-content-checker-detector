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
| Corpus reconciliation on deployed cycle-2 model (the §5a contradiction closed) | `docs/measurements/CORPUS-RECONCILIATION-2026-08-31.md` |
| Lawful-basis notice drafted; DPIA updated; citations point at the 31 Aug probe | `docs/legal/LAWFUL-BASIS-NOTICE.md` |
| CAPABILITIES.md stale band-boundary entry corrected | `docs/CAPABILITIES.md` |
| Provider status panel built on the Lab page, shared data module with checker, lapse-degradation + build backstop | site commit `520b09d3`; live |
| Writing-notes restyle; plain-English rule names; jargon headings rewritten | site commit `8e819641`; live |
| Rule-tell aggregate figures reproduced exactly (kept, now cited) | `docs/measurements/RULE-TELL-AGGREGATES-2026-08-31.md` |
| Evidence layer v1 ("Why it reads this way"): 21-phrase curated lexicon, rhythm tell, closer tell, strongest passage | site commit `d935848b`; live |
| Document-tells measurement: echo declined, scaffold split verdict, phrase lexicon gated | `docs/measurements/DOCUMENT-TELLS-2026-08-31.md` |
| Four-way separability analysis run: "Likely AI but human edited" not supportable (0.448); handover figures confirmed | `services/local-engine/research/fourway-separability-2026-08-31/RESULTS.md` |

## In progress — website agent (evidence/UX lane)

1. Show evidence card from Potentially AI upward (currently flagged-only) — owner hit this live
2. Under-repetition tell (adjacent-sentence overlap, signal-science figures)
3. Composite scaffold tell (4.8% AI vs 1.7% human, n=292 caveat)
4. The three drafted site-copy corrections (humaniser re-measurement §5)
5. Publish the humaniser weakness as a research page + sweep for measured-but-unpublished findings
6. IntegritySuiteNav research link
7. Paste-HTML structure capture (real h/p/ul tags from the clipboard's text/html flavour; sanitised, browser-side only, invalidated on edit)

## In progress — corpus agent (data lane)

1. Structured human corpus, Git/Search-Central/Common-Crawl strategy, three legal buckets, H1–H3 human-confidence labels, ~4,000 doc cap
2. Owner's side-by-side scaffold table (human vs AI, ≥500 words): preliminary from existing data first, final on the new corpus; rows: sections/article, heading depths, paragraphs/section, words/paragraph, sequential paragraph-length variation, lists/section, items/list, sentence CV, with denominators
3. Full structural fingerprint per model and register
4. Shape-tell re-test on the proper human baseline (echo, scaffold, bullets, word-count regularity)
5. Matched AI generation: brief-extraction fields banked per human doc; then 20-pair PILOT reported to the orchestrator for review BEFORE bulk; $20 hard self-cap of the $30 OpenRouter balance (owner authorised); model mix weighted to evaders (llama-4-maverick, grok-4.6) + flagships; whole-topic + whole-model-family held-out eval slice decided before generation

## Next (unblocked when the above land)

- Promote whichever fingerprint components survive the human baseline into shipped tells
- Next training cycle: paired corpus (owner-approved) + matched pairs + structural features; calibration spread as a training objective (cycle-4 lesson); evaluate on the held-out slice for the first genuinely independent evasion measurement

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
