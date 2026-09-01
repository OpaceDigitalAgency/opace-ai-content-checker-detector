# AI Tells Mega Pack

> **Public research snapshot.** This first-party brief preserves the hypotheses available on its stated research date. Many tells were later measured, demoted or declined. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and [rule validation](../services/local-engine/research/rule-validation/RULE-VALIDATION.md) before treating any entry as a current capability.

Synthesis of six parallel research passes (259 raw tells, deduped and merged to **114 entries**) for the Opace AI Content Integrity engine. Machine-readable companion: [`ai-tells-pack-seed.json`](./ai-tells-pack-seed.json) (`tells-seed:2026.08.1`).

Compiled: 27 August 2026. One researcher's output was truncated mid-stream by the pipeline; its surviving tells were merged, but its tangents were lost.

## Grading

| Tier | Meaning | Engine behaviour |
|------|---------|------------------|
| **A** (19) | Strong evidence, low false-positive risk when gated as specified | Flag at **medium** severity (pure artefact regexes may be elevated to **high**) |
| **B** (39) | Real signal, but overlaps genuine human writing | Flag at **low** severity, or contribute to a composite score; needs corroboration from 2+ other signals |
| **C** (56) | Informational, contradictory, semantic-only, or too dangerous to flag | Document, use as research input or negative weight — **do not implement as a user-facing flag** |

Counts by kind: phrase/regex 40, structural 31, stylometric 16, lexical 13, model packs 9, punctuation 5.

**Governing principles distilled from the corpus:**

1. **Density, never presence.** Every lexical and phrase tell is legitimate English in isolation. All studies (Kobak, Juzek & Ward, Liang, Pew) measure corpus-level *excess*; the engine must score cumulative density per 1,000 words and co-occurrence, never single hits.
2. **Tells decay.** 'Delve' died in 2025; OpenAI suppressed em dashes in November 2025; by mid-2026 only Claude out-dashes professional writers. Every rule carries an `era` tag and rule packs must be versioned per model generation.
3. **The non-native-writer landmine.** Stanford's study found >50% of genuine non-native TOEFL essays falsely flagged by perplexity/burstiness detectors. Low burstiness, uniform sentences and formal connectives are exactly what ESL writers produce. This is a legal-exposure risk: ship an explicit caveat, never rely on stylometrics alone, and keep perplexity out of the rule engine.
4. **Human uptake contamination.** Humans are absorbing AI vocabulary into writing *and speech* (Yakura arXiv:2409.01754; Max Planck podcast study; +15.1% news-crawl drift across 34 languages). Lexical tells need yearly rebaselining; structural/artefact tells age better.
5. **Context gating.** Several A-tier rules are only A-tier *inside their gate*: markdown leakage is near-proof in a WordPress visual-editor field and meaningless on Reddit; curly quotes are damning in wikitext and normal in Word.

---

## 1. Chatbot artefacts (phrase/regex — the near-proof class)

The highest-value new category. These strings barely occur in human writing, and several attribute the *specific* model.

| ID | Tell | Tier | Severity | Notes |
|----|------|------|----------|-------|
| `art-citation-tokens` | Exposed citation tokens: `:contentReference[oaicite:N]`, `oai_citation`, `citeturn0search0`, `turn0image0`, `attributableIndex` (ChatGPT); `[cite: N]`, `[span_N](start_span)` (Gemini); `grok_render_citation_card_json` (Grok); `【N†L261-269】` (DeepSeek); `ppl-ai-file-upload`, `[attached_file:1]`, `[web:1]` (Perplexity); `:::writing{variant=...}` | **A** | high | Essentially zero FP; model-attributing. Strings change per product release — version this pack. Source: Wikipedia:Signs_of_AI_writing (WP:OAICITE etc.) |
| `art-utm-fingerprints` | `utm_source=chatgpt.com` / `openai` / `copilot.com` / `perplexity`; `referrer=grok.com` in URLs | **A** | medium | Proves the tool touched the URL, not that the prose is AI (humans fetch citations via AI) — hence medium |
| `art-as-an-ai` | 'As an AI language model', refusal residue | **A** | high | Guard against quoted use in articles *about* AI. Already partially in engine |
| `art-cutoff-disclaimer` | 'as of my last knowledge update', 'in the provided search results', RAG gap-speculation ('likely supports...') | **A** | high | 'my last knowledge update' has zero human usage; historians' 'records are limited' variants → medium. Extends existing cutoff rules with RAG-era variants |
| `art-collab-leakage` | 'I hope this helps', 'Would you like me to...', 'You're absolutely right', sign-offs in published prose | **A** | high | Gate by content type: normal in genuine correspondence |
| `art-sycophantic-openers` | 'Great question!', 'Certainly!', 'I'd be happy to', prompt echo | **A** | medium | Published-prose gate. Found verbatim in Elsevier papers (Scientific American) |
| `art-placeholders` | '[Your Name]', 'INSERT_SOURCE_URL', `access-date=2025-XX-XX` | **A** | high | Near-zero FP for date/URL placeholders |
| `art-reasoning-leak` | Narrated deliberation ('the user wants... so I should'), reviewer notes embedded in the deliverable | **A** | high | Reasoning-model era; near-zero FP in finished prose |
| `art-pua-unicode` | Private Use Area characters (U+E000–F8FF), often wrapping citation tokens | **A** | high | Icon fonts are the only real FP; near-definitive adjacent to citations |
| `art-token-cutoff` | Abrupt mid-sentence cutoff at end of text | B | low | Human paste-mangling looks identical |
| `art-fabricated-refs` | Cluster of dead unarchived links, invalid ISBN checksums, DOIs resolving elsewhere, unused references | B | low | ISBN checksum validation is offline-computable and worth building; the rest needs network checks |
| `art-stale-access-dates` | Citation access-dates predating the edit by a year | C | — | Copied citations and offline drafting confound |

## 2. Phrase and regex rules

### Tier A

- **`phr-neg-parallelism` — Negative parallelism family.** 'It's not just X, it's Y' / 'not only X but Y' / 'X isn't the problem, Y is'. ~3x human rate on 490k webpages (Pew 2026); 25% of EQ-Bench's composite slop score; LinkedIn algorithmically demotes it since May 2026. FP: staple of speech-writing and ad copy — flag at **2+ per document**, never single use. Sources: Pew, Wikipedia WP:AIPARALLEL, gc.ai, antislop-sampler, Economist 2026-07-30.
- **`phr-not-x-not-y-just-z` — Tripled negation.** 'Not X. Not Y. Just Z.' / 'No fluff. No filler. Just results.' ChatGPT-family favourite; low base rate in human prose. FP: deliberate ad copy.
- **`phr-todays-fastpaced` — Vague-change opener.** 'In today's fast-paced/digital/ever-changing world/landscape/era'. FP low: even human uses flag weak templated writing.
- **`phr-testament-to`** — 'stands/serves as a testament to' (4,000x per Pangram). FP: obituaries, award speeches, sports — genre-downgrade there.
- **`phr-despite-challenges`** — 'Despite its X, [subject] faces challenges... continues to thrive' + 'Future Outlook' closers. The rigid full formula rarely occurs in human writing.
- **`lex-metaphor-cluster`** (regexable) — figurative *tapestry* (17,000x), *testament*, *complex/intricate interplay* (21,000x), *ever-evolving landscape* (11,000x); flag 2+ distinct items per document. Exclude literal/business uses of 'landscape'.

### Tier B (low severity / corroboration required)

- **`phr-copula-avoidance`** — serves as / stands as / functions as / boasts / features replacing is/has; measurable ~10% drop in is/are frequency (Geng & Trotta arXiv:2404.08627). FP: estate-agent and press-release register. Score as per-document ratio.
- **`phr-weasel-attribution`** — 'Experts argue', 'Industry reports', 'Observers have cited' with no named source. FP: lazy human journalism — but a quality flag either way. Escalate when >50% of authority claims are unnamed.
- **`phr-legacy-framing`** — 'pivotal moment', 'enduring legacy', 'indelible mark', 'setting the stage for', 'deeply rooted' stacked on mundane subjects (WP:AILEGACY).
- **`phr-notability-canned`** — 'profiled in multiple outlets', 'maintains an active social media presence' (RAG-era, GPT-5 vintage).
- **`phr-buzzword-phrases`** — unlock the potential of, harness the power of, embark on a journey, at the forefront of, bridging the gap, pave the way for, navigate the complexities of. Pre-2022 corporate jargon; density only.
- **`phr-worth-noting`** — 'it's worth/important to note that' (3,000x, Pangram); flag 2+ per document.
- **`phr-pivotal-role`** — 'plays a crucial/pivotal/vital role in shaping' (155x, GPTZero).
- **`phr-narrative-cliches`** — 'faced numerous challenges' (30,000x), 'newfound sense of purpose' (4,000x), 'poignant reminder' (49,000x). Two or three co-occurring is strong evidence.
- **`phr-valuable-insights`** — 'provides valuable insights into', 'at its core', 'key takeaway'. Strongest outside academia.
- **`phr-faux-insight`** — 'Here's what nobody tells you', 'Here's the kicker', 'Plot twist:'. FP: LinkedIn growth-hackers invented the register.
- **`phr-rhetorical-qa`** — 'The result? A platform that scales.' Fading in newest models; flag 2+.
- **`phr-lets-dive-in`** — 'Let's dive in / break it down / unpack'. Blogger house style since ~2015; weak amplifier.
- **`phr-didactic-note`** — 'it's important to remember', 'may vary', unsolicited safety advice. Peak 2023, decaying.
- **`lex-transition-openers`** — sentence-initial Additionally/Moreover/Furthermore (see also `str-transition-stacking`). ESL convention — clusters only.

### Tier C (document only)

`phr-in-connection-with` (legal-register FP), `phr-false-ranges` ('from X to Y', needs semantics), `phr-colon-reveal`, `phr-audience-bracketing` ('Whether you're a X or Y'), `phr-analogy-template` ('Think of X as the Y of Z'), `phr-paired-adjectives` ('simple and straightforward' — legal doubling FP), `phr-weak-verbs` ('is designed to'), `phr-flip-script`, `phr-refers-to`, `phr-fake-profound-kicker` ('In the end, it was never about the code.'), `phr-conservation-boilerplate`, `phr-x-rather-than-y` (Grok-leaning), `phr-ultimate-guide` (human SEO since ~2010), `lex-concrete-overuse`.

## 3. Lexical wordlists

- **`lex-focal-density` (A, medium).** The triple-validated core: delve, showcase/showcasing, boasts, underscore(s), intricate/intricacies, surpassing, garnered, emphasizing, realm, groundbreaking, advancements, aligns, meticulous(ly), commendable, pivotal, elucidate. Evidence: Juzek & Ward COLING 2025 (delve 0.21→14.38 occurrences per million, method excludes non-LLM explanations); Kobak et al. Science Advances 2025; Liang et al. ICML 2024 (meticulous 34.7x, commendable 9.8x, intricate 11.2x); Pew 2026. Implement as a **weighted density score per 1,000 words**, never single-hit flags. Era-decay: delve is GPT-3.5/4-era and declining.
- **`lex-kobak-style-407` (B).** The berenslab `excess_words.csv` style subset (~407 words with per-year excess ratios usable as weights). Derived from biomedical abstracts — some domain skew.
- **`lex-liang-adjectives` / `lex-liang-adverbs` (B).** Top-100 overused evaluative adjectives and -ly adverbs from ICLR-review analysis (Appendix Tables 2–3). Cluster-scored only; hitherto/herein also legalese.
- **`lex-buzzword-corporate` (B).** leverage, utilize, harness, foster, streamline, empower, elevate, unlock, seamless, robust, game-changer. VERY high FP (pre-existing SaaS jargon) — largely already covered by our avoid-ai-writing tier 1–3 port.
- **`lex-promo-travel` (B).** nestled, in the heart of, bustling, vibrant, breathtaking, rich cultural heritage, treasure trove, diverse array. Upgrade weight only when the register appears in a genre that forbids it (encyclopedic, legal, news, technical) — the "genre glitch" principle.
- **Tier C:** `lex-magic-adverbs` (quietly/deeply/fundamentally), `lex-clinical-formality` (utilize/individuals/in order to), `lex-latinate-shift`, `lex-crosslingual-34` and `lex-multilingual-translationese` (hold for a future non-English module — a genuine differentiator: slop-gate's Korean/Russian/Chinese/Filipino packs and Juzek's 34-language lists; note канцелярит/公文腔 predate AI as bureaucratic registers).

## 4. Punctuation signatures

- **`pun-emdash-density` (B, era-conditional).** Human mean ~3.23/1,000 words (range 0.33–17.12; Twain 10.13); GPT-4.1 ~10.6; Claude ~9 unconstrained, 0.19 suppressed; web text doubled 2023–2026 (Pew). **But**: OpenAI suppressed em dashes November 2025; by mid-2026 only Claude exceeds professional writers, making the tell partially *model-attributing* rather than AI-detecting. Documented false-accusation smear against human essayists. Keep the existing density rule at low severity, add era/model conditioning, never flag presence.
- **`pun-unicode-decoration` (A, context-gated).** Mathematical-alphanumeric bold (𝗯𝗼𝗹𝗱), → arrows as connectors, literal • bullets, narrow/no-break spaces in plain-text venues. Humans rarely type math alphanumerics outside LinkedIn formatters.
- **`pun-quote-inconsistency` (B, context-gated).** Curly quotes in plain-text-native surfaces, or curly and straight mixed in one document. ChatGPT curly since ~mid-2025; DeepSeek too; Gemini/Claude straight. FP very high without the gate (Word/macOS smart punctuation).
- **Tier C:** `pun-oxford-comma` (+63% corpus drift but house-style FP is disqualifying), `pun-colon-titles`, `pun-human-marker-deficit` (fewer ?/;/asides — 2023-era, plain-style human FP).

## 5. Structural rules

### Tier A

- **`str-participial-tails` (A, medium).** Sentence-final present-participle significance clauses (', highlighting the importance of X', ', underscoring/reflecting/symbolizing/fostering/cementing...') at 2–5x human rate. Corroborated empirically (Reinhart et al., PNAS 2025) and observationally (WP:SUPERFICIAL). Regex-approximable; flag at ≥3 per 1,000 words. A hallmark that survives 'plain prose' prompting better than formatting tells.
- **`str-markdown-leakage` (A, context-gated).** Literal `**bold**`, `## headings`, `[text](url)`, `---`, fences, `&nbsp;`/`\n` literals in venues where markdown is not native (WordPress classic editor fields, wikitext, plain CMS fields). Near-zero FP inside the gate.

### Tier B

- **`str-rule-of-three`** — balanced tricolons at ~3x human rate; flag >1 polished triad per 200 words or all-lists-have-exactly-three. Classical rhetoric FP is high.
- **`str-bold-label-bullets`** — `- **Term:** description` repeated; label-restating bodies. Definition-list FP in tech docs.
- **`str-mechanical-bold`** — key-term bolding through flowing prose.
- **`str-emoji-headers`** — 🚀✅💡 heading/bullet decoration; GPT-4o-era, declining; genre-gate (weak on social).
- **`str-heading-inflation`** — >3 headings per 300 words, Overview/Key Points/Conclusion scaffolding, skipped levels, first heading repeating the title. Extends our uniform-sections rules. SEO-writer FP.
- **`str-essay-scaffold`** — signposted intro + three bodies + recap imposed on any genre/length.
- **`str-ritual-conclusion`** — 'In conclusion/In summary/Overall' content-free restatement (OpenAI reportedly could not fully suppress). Overlaps existing formulaic rules.
- **`str-uniform-paragraphs`** — 3+ consecutive near-identical-length paragraphs ('brick wall'). Easy to measure; even sceptics concede craft writers rarely choose it.
- **`str-staccato-fragments`** — 3+ consecutive parallel fragments under 10 words. Protect-list known bylines (ad-copy FP high).
- **`str-transition-stacking`** — >50% of paragraphs opening with Furthermore/Moreover/Additionally.
- **`art-fabricated-refs`** — see artefacts.

### Tier C

`str-nominalisation` (needs POS; legal/bureaucratic FP), `str-title-case-headings` (needs house-style config), `str-compound-headings` ('Awards and recognition'), `str-fractal-summaries`, `str-anaphora`, `str-question-headings` and `str-uniform-faq` (**SEO/AEO confound — deliberately taught to humans; needs a genre prior**), `str-unnecessary-tables`, `str-deletion-test` (could ship as a *quality* metric, not an authenticity flag), `str-citation-absence`, `str-elegant-variation` (needs coreference; Fowler-era human habit), `str-genre-glitch`, `str-balanced-noncommitment`, `str-manufactured-personality` (the newest frontier — AI faking casual dev-blog voice; no wordlist catches it), `str-invented-labels`, `str-false-agency` (metonymy FP), `str-edit-summary-formulas` and `str-defensive-comments` and `str-hallucinated-conventions` (platform-specific; generalise to git commits/CMS revision notes as a future surface).

## 6. Stylometric thresholds

- **`sty-sentence-uniformity` (B).** Sentence-length SD < ~5 words or SD/mean < ~0.4 (humans 0.6–1.2). Corroborated by Desaire (>99% accuracy feature set), Munoz-Ortiz, practitioner lists. **Carries the TOEFL false-positive landmine** — never standalone, ship the non-native caveat, and note frontier models now score human-like (threshold decay). Refines our existing flatline/burstiness rules with concrete thresholds.
- **Tier C, documented for the record:**
  - `sty-low-perplexity` — do not implement; >50% non-native FP rate, legal exposure.
  - `sty-ttr-paradox` — AI can be *higher* TTR within-document (thesaurus effect) yet more homogeneous across documents; direction register-dependent. Our TTR rule should stay low-weight against matched genre baselines.
  - `sty-hedging-reversal` — **counterintuitive**: epistemic hedges *decreased* 22.8% in post-LLM scientific abstracts; LLM advice hedges ~40% less than human. A naive hedge counter fires backwards. The tell is formulaic note-*framing*, not hedge frequency.
  - `sty-positivity-skew`, `sty-homogenisation` (corpus-level only), `sty-style-shift` (needs per-author history), `sty-first-words` (unverified, unlicensed source).
  - `sty-machine-cleanliness` and `sty-anti-tells` — **the false-positive spec**: perfect grammar, 'robotic feel', formality, transition words in isolation, mixed register are all documented ineffective indicators. Encode as exclusions and QA tests.
  - `sty-human-whitelist` — **implement as negative weights**: plain copulas, plain verbs (wrote not authored), definitive superlatives, typos, wordy human constructions ('in order to', 'the fact that'), first-person anecdote with irrelevant detail, and pre-30-Nov-2022 timestamps (near-proof of human authorship). Mirrors kjmagnan1s's protect-list seam.

## 7. Model-specific packs (with era/version tags)

| Pack | Contents | Era | Tier |
|------|----------|-----|------|
| `mod-era-vocab-tiers` | GPT-4 era (2023–mid-24): delve, tapestry, testament, boasts, intricate. GPT-4o era (mid-24–mid-25): align with, enhance, fostering, showcasing, highlighting. GPT-5 era (mid-25+): emphasizing, enhance, highlighting, showcasing | rolling | B |
| `mod-claude-pack` | Em-dash ~5x GPT (5.4 vs 1.1/1,000; only model above professional writers mid-2026), more colons, straight quotes, varied rhythm, least formulaic structure (structural rules under-detect Claude) | 2025–26 | B |
| `mod-claude-rpisms` | Fiction/RP: ministrations, 'audible pop', 'rivulets of', 'despite herself', 'knuckles turning white', '...for now.' | 2024–25 | B (fiction lane) |
| `mod-fiction-promptonyms` | Elara Voss/Vex, Dr. Aris Thorne, Elias Vance, Kael, Lyra, Zephyr, Whispering Woods, Eldoria ('elara' = #1 over-represented token in antislop-sampler, 98,586 hits) | 2024–25 | B (fiction lane) |
| `mod-fiction-phrases` | 'took a deep breath' (28,671), 'voice barely above a whisper' (19,295), 'couldn't help but feel', 'maybe, just maybe', 'little did she know' — 2,500 ranked phrases available Apache-2.0 | 2025 | B (fiction lane) |
| `mod-grok-idiolect` | causal/empirical/correlate vocabulary, 'underscore' into 2026, extreme length, 'X rather than Y' | 2025–26 | C |
| `mod-vendor-accents` | GPT vs Claude ROC-AUC 0.96 on 18 content-free features; 5-way attribution 97.1% surviving paraphrase (Sun et al., ICML 2025) | 2025–26 | C (ML roadmap) |
| `mod-structural-dialects` | ChatGPT: numbered lists + bold + declaratives; Gemini: rigid hierarchy; Claude: least formulaic | 2026 | C |
| `mod-rlhf-root-cause` | Preference-tuning causes the tells (annotators prefer focal words); formatting collapses under 'plain prose' instruction while em dashes persist → layer the engine: formatting tier / punctuation tier / rhythm tier, each with decay expectations | 2024–26 | C (design input) |

Citation-token model attribution (`art-citation-tokens`, `art-utm-fingerprints`) also belongs functionally to this family.

---

## Implementation notes (mapping to our engine)

**Target:** rule packs feed `packages/core/src/patterns/en-signals-v2-data.ts`; findings envelope needs `rule_id`, `severity`, `message`, `suggestion`, `evidence`.

1. **Tier → severity.** Tier A → `severity: "medium"`, except the artefact class (`art-citation-tokens`, `art-as-an-ai`, `art-cutoff-disclaimer`, `art-collab-leakage`, `art-placeholders`, `art-reasoning-leak`, `art-pua-unicode`) which warrants `"high"` — these are near-proof and should say so in `message`. Tier B → `"low"`, and B rules should also feed a composite document score so three co-occurring B signals can surface a summary finding. Tier C → not emitted; retain in data files flagged `enabled: false` for research.
2. **Rule IDs.** Use the seed `id` values as `rule_id` (namespaced, e.g. `en.v2.art-citation-tokens`). Every finding's `evidence` should quote the matched span plus the density figure where the rule is density-based ('4 focal words per 1,000 — human baseline <1').
3. **Density rules need a counting layer.** `lex-focal-density`, `lex-metaphor-cluster`, `phr-neg-parallelism`, `str-participial-tails`, `str-rule-of-three` fire on counts per 1,000 words with thresholds in the JSON notes — extend the engine beyond single-match regex to match-count aggregation per rule.
4. **Context gates.** Add a `surface` concept (markdown-native vs plain-text vs wikitext; article vs email; fiction vs marketing) before enabling `str-markdown-leakage`, `pun-quote-inconsistency`, `pun-unicode-decoration`, `art-collab-leakage`, and the fiction packs. Genre priors also guard the SEO/AEO confound (`str-question-headings`, `str-uniform-faq` stay C precisely because SEO guides teach humans the same shape).
5. **Era decay.** Add `era` and optional `decay_after` metadata; the em-dash rule and Era-1 vocabulary should down-weight for content dated 2026+. Track vendor decay events (OpenAI em-dash fix, Nov 2025) in a changelog.
6. **Negative weights.** Implement `sty-human-whitelist` as score reducers and a per-site protect-list (author signature phrases, deliberate fragments) — directly modelled on kjmagnan1s/anti-slop's protect-list seam. Encode `sty-anti-tells` as QA fixtures: sample human texts (ESL essays, professional essayists with heavy em-dash use, legal drafting) that must NOT trigger medium+ findings.
7. **`suggestion` fields.** For lexical/phrase hits, ship the replacement maps already published (kjmagnan1s Tier 1 tables: leverage→use, utilize→use, serves as a→is; avectats7 weak-verb table).
8. **Messaging.** Humans detect AI at ~55% unaided vs ~90% for heavy LLM users (Russell et al.) — the product should report *explainable evidence density*, never verdicts, and the docs must cite the TOEFL non-native finding.

## Licensing notes

| Source | Licence | Action |
|--------|---------|--------|
| berenslab/llm-excess-vocab (900-word CSV) | Research artefact, GitHub repo (verify licence file before bundling) | Data = facts from a CC-BY Science Advances paper; safe to derive with citation |
| sam-paech/antislop-sampler (2,000 words, 2,500 phrases, regexes) | Apache-2.0 | Bundleable with attribution + licence notice |
| sam-paech/slop-forensics (per-model profiles, trigrams) | MIT | Bundleable with attribution |
| SicariusSicariiStuff/SLOP_Detector (SLOP.yml, penalty.yml) | Apache-2.0 | Bundleable with attribution |
| hwajongpark/slop-gate, avectats7/anti-ai-writing, kjmagnan1s/anti-slop, aplaceforallmystuff/claude-slop-detector, haidrrrry/humanize-ai-writing, shaswatco | MIT | Bundleable with attribution |
| **AlpinDale/gptslop (gptslop.yaml, claudeslop.yaml)** | **AGPL-3.0 — viral** | **Do not copy lists verbatim; reimplement independently** (the underlying rentry.org/claudeisms observations are uncopyrightable facts) |
| **jalaalrd/anti-ai-slop-writing** (first-word tables) | **No licence** | Do not copy; treat as unverified pointers only |
| Wikipedia:Signs_of_AI_writing and related pages | CC BY-SA 4.0 | Paraphrased guidance fine; verbatim excerpts require attribution + share-alike — prefer independent re-expression in rule text |
| Academic papers (Kobak, Liang, Juzek & Ward, Reinhart PNAS, Sun ICML, Pew) | Facts and findings uncopyrightable | Cite in docs; do not reproduce large tables verbatim where the paper is paywalled |
| GPTZero / Pangram / Copyleaks / Originality vendor lists | Proprietary marketing content | Use figures as citations; do not bundle their lists |

## Tangents for future research

Preserved from the researchers' logs (researcher 6's tangents lost to output truncation).

**Ready-made datasets and feeds**
- berenslab `excess_words.csv` (900 words, style/content-tagged, per-year excess ratios as weights) and tjuzek/ai-34-languages (per-language top-20 lists + aiwordexplorer.com) — shippable bundled lexicons.
- sam-paech/slop-forensics publishes per-model slop profiles (~10 models incl. Grok-4, GLM-4.6, Gemma-3), MIT — could power per-model attribution.
- tropes.fyi: maintained 49-trope directory tracking tells as Rising/Consistent/Fading — a ready-made model for era-versioning; worth monitoring/scraping.
- GPTZero's weekly-updated top-50 vocabulary table (dynamic render; needs browser scrape) — poll to keep the lexicon fresh.
- Blake Stockton's ongoing 101-part 'Don't Write Like AI' series — a feed to monitor.
- Grokipedia as a large pure-Grok corpus; huggingface msakota/edisum_dataset (GPT-3.5 edit summaries).
- Freeburg's ~700,000-word human em-dash baseline (3.23/1,000 mean; Huck Finn 10.13) — obtain the raw dataset for calibration.
- Academic-publishing corpus as labelled data: 139 GPT-fabricated papers found on Google Scholar via artefact-string search; librarian estimate 60,000+ papers with LLM text.

**Engine design implications**
- Feedback-loop contamination: LLM words leaking into human speech (Yakura arXiv:2409.01754) and news writing (+15.1%) — every lexical tell needs publication-date-aware decay and yearly human-corpus rebaselining.
- TOEFL false-positive disaster (>50% of non-native essays flagged) — cite in ethics/scoring docs; never perplexity/burstiness alone.
- Model-era drift and vendor decay events (OpenAI's Nov 2025 em-dash fix is the first documented deliberate tell-removal) — versioned tell-sets keyed to model generation; track tell-decay events.
- RLHF root cause (arXiv:2508.01930): annotators prefer focal-word variants — tells persist across vendors while pipelines share annotator pools.
- arXiv 2603.27006 ('The Last Fingerprint'): formatting tells collapse under 'plain prose' instructions, em dashes persist — argues for the layered engine (formatting / punctuation / rhythm tiers).
- Counterintuitive hedging reversal (arXiv 2603.16131, 2505.09662) — absence of hedging may itself signal in scientific registers.
- Over-polishing paradox: applying every rule at max strictness produces the uniform profile that itself reads as AI.
- Wikipedia's G15 speedy-deletion criterion separates 'objective' from judgement tells — precedent for our tiering; the 'Ineffective indicators' section is effectively a false-positive spec.
- kjmagnan1s context-profile matrix (per-surface strictness: linkedin/blog/technical/investor-email/docs/casual) — best per-surface calibration design found; directly reusable.
- EQ-Bench composite weighting (words 60% / not-x-but-y 25% / trigrams 15%) — benchmark our scoring formula against it.
- SLOP_Detector graded penalty classes — worked example of weighting tells by human-prose overlap.
- Anti-detection skills (conorbronsdon/avoid-ai-writing et al.) are converging on the same public lists — our published lexicon will be gamed; consider unpublished holdout signals.
- Humans: ~55–64% unaided detection, ~90% for heavy LLM users (Russell et al. arXiv:2501.15654) — supports an explainable-tells product over black-box scores; RAID benchmark (arXiv:2405.07940) shows detectors break under paraphrase.

**New detection surfaces**
- Citation-residue tokens give near-zero-FP detection AND model attribution — nobody outside Wikipedia catalogues them systematically; highest-value engine category.
- utm_source=chatgpt.com as a cheap crawlable site-level 'AI-assisted citation' metric.
- Fiction tell family (promptonyms, Claudeisms) — a separate detector lane for creative writing.
- Edit-summary/changelog tells generalise to git commit messages and CMS revision notes — untapped surface.
- Hybrid-document detection: SenFlow (arXiv:2606.18946) models inter-sentence flow to find AI-inserted passages inside human documents — paragraph-level mixed authorship.
- Binoculars (ICML 2024) zero-shot perplexity-ratio detector — statistical complement, with the usual FP caveats.
- Pangram claims embedding-space clustering places text near specific commercial models — competitor capability to benchmark.
- Non-English: Japanese POS/comma-placement tells (PMC10411719); slop-gate's Korean/Russian/Chinese/Filipino packs — cross-language module opportunity and UK/EU differentiator.
- Stylometric grammar frontier: tense/aspect/mood handling and noun-over-verb preference (arXiv:2508.16385) as durable features harder for humanisers to strip.
- Desaire follow-up: small hand-crafted feature sets robust to 'write like a chemist' style prompting.
- Wikipedia 'AI or not' quiz — human calibration/test-set idea for our product UX.
- LinkedIn's May 2026 demotion of contrastive construction: platform policy is itself becoming a source of tells and a commercial argument.
- 'Manufactured personality' (fake casual dev-blog voice avoiding all classic tells) — newest frontier, no wordlist catches it; needs semantic/behavioural detection.
- dabit3/deslop targets AI *code* slop — adjacent product category, noted and parked.
