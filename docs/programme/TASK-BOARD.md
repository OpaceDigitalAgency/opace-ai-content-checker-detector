# Task board — single source of truth for open work

Tracked, in-repository, so it survives context loss, session ends and fresh clones.
**Update this file the moment an item changes state.** Statuses: DONE (with date and
pointer), IN PROGRESS (with owner), QUEUED, BLOCKED (on what), OWNER (waiting on David),
PARKED (by agreement).

Last updated: 1 September 2026, by the repository research-discovery audit.

## Done today — 1 September 2026

| Item | Evidence |
|---|---|
| GitHub homepage model/corpus positioning corrected: actual Cycle-2 fit split now leads (5,109 AI / 3,835 human), all 102 exact 2022–2026 generator identifiers are listed with counts, the human training sources and separate evidence axes are scannable, and the false wholly-unseen evaluation claim is replaced by the measured overlap | `README.md`; `docs/programme/GITHUB-HOMEPAGE-MODEL-COVERAGE-AUDIT-2026-09-01.md` |
| GitHub research discovery graph completed: 117/117 meaningful Markdown sources linked directly from one canonical index; 21/21 public research papers mapped to their repository evidence; 33 prior zero-inbound sources and 19 GitHub-broken parent-workspace links corrected; dated foundation research published with authority warnings; regression gate added and proved by catching the next cycle-5 report until it was indexed | `docs/RESEARCH-INDEX.md`; `research/README.md`; `docs/programme/RESEARCH-DISCOVERY-AND-LINK-AUDIT-2026-09-01.md`; `npm run test:research-links` |

## Done today — 31 August 2026

| Item | Evidence |
|---|---|
| Checker run no longer races the on-device model | site commit `cda07147`; verified live |
| Kill-switch + ten-path zero-logging drills re-proven on `opace-detector-00027-yuq` | `.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31.md` |
| Per-request limit raised to 8,000 words / 100,000 chars, deployed via `deploy.sh` as revision `opace-detector-00008-wsf` (revision counter restarted its series — newer than `00027-yuq`, not a rollback); both drills re-proven on it: kill switch via real alert policy (48.4 s delivery, 44–88 s range over five fires, ~5.3 s downtime, byte-exact restore) and ten-path zero-logging probe (fresh markers, zero hits, canary-proven; 7,000-word draft scored, 8,500-word refused `too_long`) | `.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31-8K.md` |
| Server-side input normalisation `md-strip-v1` shipped (owner GO): `/v1/check` strips markdown syntax before segmentation per the `strip_test.py` contract; advertised as `input_normalisation` in `/v1/health` + `/v1/status` for the site to gate on; `test_normalise.py` added as a second deploy gate; deployed as `opace-detector-00009-jdw`; both drills re-proven (kill switch 43.45 s, range 43–88 s over six fires, ~4 s downtime; ten-path probe zero hits); end-to-end fix proof `govuk-fa21a585224e` 0.9861 flagged → 0.0947 clean. Client half (snapshot strip + offset mapping) still open with the website agent | `.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31-NORM.md` |
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
| Input-surface measurement (owner-directed follow-up): no path normalises before the model on either route; the exposure is markdown syntax specifically — same 600 human docs flag 22.5% as raw markdown, 0.0% as plain text, 0.2% as raw HTML; `.html` upload gives away ~7pp AI detection; `contentType` never reaches the model. Recommendation: normalise model input client+server, keep raw for rules/tells; interim disclosure | `docs/measurements/INPUT-SURFACE-2026-08-31.md` |
| Shape-tell escalation arm priced (measurement only, decision with the owner): declined on the raw-markdown surface (+0.06pp for +0.16pp held out); clears the minimum-evidence bar on the stripped surface (+1.39pp for +0.06pp held out, +55 AI / +1 human in corpus) — conditional on input normalisation and a fiction pricing of wpp_cv. Side-finding to triage: the shipped pair flags 22.5% of structured human docs when raw markdown is scored; stripping the syntax un-flags 59/60 | `docs/measurements/ESCALATION-ARM-2026-08-31.md`; `services/local-engine/research/escalation-arm-2026-08-31/` |

## Done — website agent batch 6, 31 August 2026 (site commits `2a40e92f`, `fcf2fd1f`)

1. Input-contract disclosure moved to the live "How certain is this reading?" drawer (`2a40e92f`); production verified on BOTH routes: the previously-flagged 18F markdown page reads Likely human on server and browser routes, raw syntax intact in the draft view
2. **The 27.3% finding published** as the twenty-first paper (`/research/the-27-percent-problem/`): 114/418 shipped-model FPs on never-trained structured human markdown, the 22.5%→0.0% strip mechanism, md-strip-v1 already live (0.14%), cycle-5 candidate (0.2% on the same 418) framed strictly as a candidate
3. Owner phrase candidates measured under the dual-corpus gate (`measure_owner_phrases.py`, `owner-phrases.json`): **"at its core" ships** (2.8× c2 / 2.1× gen; 3.24 v 1.45 per 1,000; 13/6 docs — small-sample tagged); FAILED and not shipped: "in short" (0.9×/1.2× — the owner's live-read candidate is not a population tell), "the key takeaway" (1.9× c2), "the bottom line" (1.6×/1.7×), "put simply" (2.4×/0.6×), "in essence" (1.7×/0.3× — backwards on 2026), "simply put" (0.6×/0.2× — backwards). Lexicon now 21 patterns; tells paper records the round

## Done — website agent batch 5, 31 August 2026 (site commits `2f3a3679`…`dcad08bc`)

1. Input normalisation SHIPPED, client side (`dcad08bc`): model input normalised to plain prose at the snapshot choke point on both routes — contract `md-strip-v1`, verbatim port of `strip_test.py`'s rules, golden fixtures generated by the Python original, idempotence asserted. Push was gated on `/v1/health` reporting `input_normalisation: "md-strip-v1"` (server deployed first). Raw draft still feeds the rules core, tells, draft view and character checks; every model span (sections, sentence underlines) is mapped normalised→raw at the boundary, with rendered-DOM offset tests where headings/bullets shift offsets materially. Live before/after, same build, same 18F handbook page: raw 0.9873 FLAGGED → normalised 0.3465 Likely human. Fine-print disclosure names the contract.
2. too_long refusal reads as a stated limit, with both numbers, from the constant (`2f3a3679`)
3. Server ceiling doubled after gate (8,000 words / 100,000 chars, `0698c692`); every naming surface derives from the constants (`deab10c7`)
4. Model-status line restyled into the settings card; word/char counts persist in the results view (`a78d3f49`)

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

## Done — corpus agent (data lane, 2026-08-31)

1. **DONE** — structured human corpus: 3,529 docs, `services/local-engine/research/human-structured-corpus-2026-08-31/` (GREEN 2,779 / AMBER 750; H1 1,564 / H2 1,278 / H3 687; manifest with per-file SHA-256; wikiHow/Mongabay/GitLab-handbook rejected with reasons)
2. **DONE** — side-by-side scaffold table (preliminary + final) appended to `docs/measurements/DOCUMENT-TELLS-2026-08-31.md`; paras/section variance human 6.32 vs AI 1.56, ±20% consecutive-pair rate AI 36.6% vs human 25.3%
3. **DONE** — structural fingerprint per model/register: `fingerprint-final.json` (llama-4-maverick most template-regular; gemini-flash family closest to human)
4. **DONE** — shape-tell re-test on the proper baseline: shape uniformity FLIPS to a real tell (2.9×), composite scaffold 6.6× and survives hard negatives, bullet rhythm and keyphrase echo are anti-tells, word-count regularity is the strongest tell measured (wpp_cv ≤ 0.2: 16×; sec-within-15% ≥ 0.9: 13.8×); lead-in frame repetition is an anti-tell (humans 26% vs AI 3%)
5. **DONE** — matched generation: 1,110 pairs banked, `human-structured-corpus-2026-08-31/matched-generation/matched.jsonl` (85.5% length-adherent after retry ladder; llama 393 / grok 369 / terra 181 / opus 151 / gemini 16; eval-only slice 192 rows = 176 topic-bucket + 16 google-family, NEVER train on these; ledger $19.79, key delta $20.52 — see manifest spend_reconciliation; gemini-3.1-pro dropped for degenerate outputs, budget cap stopped the gemini-3.5-flash block early)

## Done — cycle-5 training run (training agent, 2026-08-31)

1. **DONE** — cycle-5 candidate trained and evaluated, all eight gates measured, ship recommendation written: `services/local-engine/research/cycle5-train/CYCLE5-REPORT.md` (+ `results-c5.json`, `results-c5abl.json`, `int8-delta.json`, `runtime-bench.json`). Architecture: e5-small + the 7 measured fingerprint components (+ missingness flag) into the head; calibration spread was a selection gate (fitted T 1.048 vs cycle-4's fatal 1.714); the int8 gate ran at EVERY epoch and rejected epoch 2 in-run (1.08% flips) — first time that defect class was caught before the end of a cycle
2. **DONE** — headlines at matched FP on the eval view: long-form 97.5% (658/675) vs shipped 95.7%; 100-word short-form 76.8% (43/56) vs 19.6% — the cycle-4 trade resolved, not re-balanced; human fiction FP 3.1% (7/227) vs 8.8%; academic FP flat 0.8%; the nine: 3/3 AI, 0/6 humans
3. **DONE** — first independent evasion measurement (matched held-out slice): candidate 86.9% (153/176) on topic-bucket AI at 0.2% (1/418) FP on structured human partners; **the shipped model false-positives 27.3% (114/418) of structured modern human writing** — strongest argument yet for replacing it, and publishable regardless of the cycle-5 decision
4. **DONE** — structural-feature ablation (identical architecture, zeroed features, retrained): features buy +50 pts at 100 words and +9.6 pts on the independent slice, cost −1.2 pts long-form
5. Candidate exports under NEW names only (`research/models/tier3-cycle5-full-*`); nothing deployed, no threshold touched; snapshot-vs-final matched-manifest reconciliation clean (0 eval-only rows trained; 300 post-freeze rows neither trained nor evaluated)

## Waiting on the owner (cycle 5)

- Accept/decline the cycle-5 candidate — costs stated in the report: 3-input ONNX needs the feature port + parity contract in both runtimes; heavy-LLM-rewrites-of-human flags rise 21.2%→28.5%; deployable pair deliberately not fitted (threshold changes unauthorised)
- ~~Publish the 27.3% structured-human FP finding against the shipped model (CYCLE5-REPORT §4)~~ **DONE 1 September 2026** as `/research/the-27-percent-problem/`; mapped to evidence in `docs/RESEARCH-INDEX.md`.

## Next (unblocked)

- Promote whichever fingerprint components survive the human baseline into shipped tells — word-count regularity and the composite scaffold are the candidates with measured double-digit/6× lifts
- ~~**Next training cycle now unblocked**: paired corpus (owner-approved) + 918 training-eligible matched pairs + structural features; calibration spread as a training objective (cycle-4 lesson); evaluate on the held-out slice (176 topic-bucket + google family) for the first genuinely independent evasion measurement~~ **DONE 31 Aug 2026** — cycle-5 block above (note: trained from a 756-row snapshot, 618 matched rows; the 300 later-arriving training-eligible rows remain unused and available to a future cycle)
- Escalation-arm pricing of the shape tells against the shipped pair runs in `research/escalation-arm-2026-08-31/` (separate agent); partial fp32 scores for the human corpus left at `human-structured-corpus-2026-08-31/human-fp32.jsonl` (883/3,529 rows, do not treat as complete)
- **Grammarly-rung measurement (owner, 31 Aug):** the rewrite ladder measures LLM rewrites (1.4%/11.0%/21.0% flagged) but never the light grammar-tool pass real writers use. Owner's agency observes human copy flagging as AI after a Grammarly pass in paid tools. Measure that rung: human originals vs their Grammarly-class-polished versions, on our detector and (BYO-account) commercial ones. Related confounds to record in the study design: gov/academic human prose was tool-polished pre-2022 (biases the human baseline towards AI-likeness — makes current lifts conservative), and models were trained on exactly that prose (circularity). Corpus gap on record: licence-clear "ordinary business blog" human writing remains unobtainable; the human baseline is 44% government-adjacent, mitigated by per-register direction checks.

## Waiting on the owner

- Verdict-redesign acceptance (five-band ladder, live since 30 Aug). **Owner decision, 1 September
  2026: design acceptance is deliberately deferred to the very end of the programme**, not to be
  chased in the interim.
- Threshold position: advice given (leave it; lowering to catch the 0.8082 miss would flag ~22% of humans) — silence = keep
- DPIA + lawful-basis notice: qualified legal review remains outstanding, but no longer blocks
  publication — **owner decision, 31 August 2026: no external/lawyer review commissioned; the
  notice is published on engineering-verified accuracy instead.** See
  `docs/legal/LAWFUL-BASIS-NOTICE.md`.

**Moved to the Phase 2 lane, 1 September 2026 (owner decision) — no longer tracked here:** the
JustDone manual test pack and the £20–50/month commercial-humaniser subscriptions decision. See
`docs/programme/PHASE-2-NEXT-STEPS.md` §11.6–§11.7.

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
