# Owner-Docs Tells Catalogue

> **Public research snapshot.** This first-party catalogue records hypotheses extracted from writing guidance. A listed tell is not authorship proof and is not necessarily a current product rule. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and [rule validation](../services/local-engine/research/rule-validation/RULE-VALIDATION.md) before quoting a capability.

> **Companion note:** a parallel web-research pack (`AI-TELLS-MEGA-PACK.md`) is being produced separately. This file is the owner-sourced complement for the same merge: every tell here comes from the owner's own anti-AI writing guidance, inverted into detection rules. Per BRIEF.md §5, all tells are editorial evidence only — never authorship proof.

## Source documents and verification

| # | Document | Words | Read? | One-line summary |
|---|----------|-------|-------|------------------|
| D1 | `HUMAN_WRITING_TECHNIQUES.md` | 1,734 | Yes (see note) | Consolidated guide: banned-word tiers 1–3, structural anti-patterns (openers, listicles, transitions, conclusions, cadence, bullet formatting), humanising techniques, publishing checklist. |
| D2 | `WRITING_GUIDELINES_ANTI_AI_CONTENT.md` | 1,826 | Yes | Zero-tolerance banned wordlist, overused-replacement limits, proximity-clustering rule, meta/title standards, code-comment style, validation greps. |
| D3 | `How to Bypass AI Detection.docx` | 3,674 | Yes | Detection-bypass techniques (active voice, paraphrasing, simplification, synonyms, personal anecdote), the six formulaic AI patterns with examples, a 61-word ban list plus ~60 banned phrase fragments, human-style exemplars. |
| D4 | `Writing instructions - AI-Scribe.docx` | 290 | Yes | 19 bullet writing instructions: direct address, deliberate imperfection, varied lengths, humour, natural punctuation, randomness. |
| D5 | `BrettBot approach to writing and themes.docx` | 1,237 | Yes | Analysis of Brett Sidaway's style: sarcasm, coined buzzwords (Googletax, #TWIPS), provocative titles, opinionated reframing. |
| D6 | `GPT words to avoid.docx` | 140 | Yes | Bare 60-item banned wordlist (duplicate of the list embedded in D3). |
| D7 | `BrettBot example articles.docx` | 5,398 | Yes | Five real human-written Opace articles (2011–2013) used as the target style — mined below for contrast features. |

**D1 substitution note:** the requested archived copy of `HUMAN_WRITING_TECHNIQUES.md` could not be read because macOS blocked Trash access. An identically named live copy in the canonical Opace website checkout was used instead. Its header states it consolidates D3, D4 and D6, which matches its content. If the archived copy differs, it was not verifiable.

**Corroboration caveat:** D1 explicitly consolidates D3/D4/D6, and D6 is a verbatim subset of the list inside D3. Agreement between those four is therefore *not* independent corroboration. D2 appears to be an independently written document (different structure, different examples, some contradictions — see below), so D2 + D3 agreement is treated as genuine corroboration. Confidence labels: **corroborated** (D2 and D3/D6 independently agree), **anecdotal (owner practice)** (asserted in one lineage without evidence).

**Internal inconsistency worth recording:** D2 bans "comprehensive" outright yet lists it as an approved alternative for "complete" and "detailed", and its own approved FAQ example uses "detailed reports". D1's Tier 1 suggests "advanced" as a replacement for "cutting-edge" while D2 rate-limits "advanced". The engine should treat these words as tells but the owner's own usage shows the false-positive risk is real.

---

## 1. Lexical tells (single words)

Inversion rule applied throughout: "never use X" ⇒ "presence of X is a tell".

### 1a. Corroborated ban-list words (D2 + D3/D6 independently agree)

| Word | Suggested severity | FP risk | Engine status |
|------|-------------------|---------|---------------|
| delve | high | low | Covered (TIER1) |
| beacon | high | low (literal lighthouse use) | Covered (TIER1) |
| testament (to) | high | low | Covered (TIER1_PHRASES) |
| tapestry | high | low (literal textiles) | Covered (TIER1) |
| symphony | high | low (literal music) | Covered (TIER1) |
| realm | medium | low | Covered (TIER1_PHRASES) |
| landscape (non-literal) | medium | medium (literal geography, landscaping trade) | Covered (TIER1_PHRASES — no literal-use guard) |
| journey (abstract) | medium | medium ("user journey", literal travel — D2 exempts both) | **NEW** |
| embark | medium | low | Covered (TIER1_PHRASES) |
| embrace / embracing | medium | medium (literal or emotional use) | Covered (TIER1) |
| unleash / unleashing | medium | low | Covered (TIER2) |
| unlock / unlocking | medium | medium (literal locks, gaming) | **NEW** (only appears as a suggestion string in the engine, never as a pattern) |
| foster | medium | medium (fostering children) | Covered (TIER2) |
| moreover | medium | medium (formal academic prose) | Covered (TRANSITIONS) |
| furthermore | medium | medium (formal academic prose) | Covered (TRANSITIONS) |
| nonetheless | low | high (ordinary formal register) | **NEW** |
| notably | low | high | Covered (TRANSITIONS) |
| thus | low | high (academic/technical writing) | **NEW** |
| ultimately | low | high | **NEW** (only inside HEDGE_STACK combinations) |
| underscore (verb) | medium | medium (finance/typography literal uses) | Covered (TIER1_PHRASES) |
| navigating (non-literal) | medium | medium (literal navigation) | Covered (TIER2) |
| nestled | high | low | Covered (TIER1) |
| bustling | high | low | Covered (TIER1) |
| enigma | medium | low | **NEW** |
| labyrinth | medium | low (literal mazes) | **NEW** |
| remnant | low | high (fabric trade, ordinary use) | **NEW** |
| pesky | low | medium | **NEW** |
| promptly | low | high (ordinary word) | **NEW** |
| folks | low | high (natural informal register, US dialect) | **NEW** |
| essence | low | medium ("in essence" stronger than bare noun; perfumery literal) | **NEW** |
| facet | low | medium (gemmology literal) | **NEW** |
| arena (non-literal) | low | high (sports venues) | **NEW** |
| exhaustive | low | medium | **NEW** |
| top-notch | medium | medium (genuine informal British usage) | **NEW** |
| revolutionise / revolutionize | medium | low | Covered (TIER2) |
| game-changer / game changer | high | low | Covered (TIER1) |
| cutting-edge | high | low | Covered (TIER1) |
| comprehensive | medium | high (legitimate in insurance, education) | Covered (TIER1) |
| elevate / elevating | medium | medium (literal lifting, music) | Covered (TIER2) |

### 1b. Single-source words (anecdotal, owner practice)

From D2 only:

| Word | Severity | FP risk | Engine status |
|------|----------|---------|---------------|
| transformative | medium | medium | Covered (TIER2) |
| revolutionary | medium | medium (history writing) | **NEW** (engine has revolutionize, transformative, but not the adjective "revolutionary") |
| AI-powered | medium | medium (legitimately descriptive in tech copy) | **NEW** |
| cool (marketing sense) | low | very high | **NEW** — tier C only |
| develop / developing (overuse) | note | very high | Partially (low-ttr covers repetition generally) — density rule, not a ban; see §4 |
| advanced (overuse) | note | very high | Density rule only |
| detailed (overuse) | note | very high | Density rule only |
| ai-assisted (overuse) | note | high | **NEW** — but Opace-site-specific; tier C |

From D1 only (Tier 1 table additions beyond the shared lists):

| Word | Severity | FP risk | Engine status |
|------|----------|---------|---------------|
| leverage (verb) | high | medium (finance literal) | Covered (TIER1_PHRASES) |
| harness (the power of) | medium | low as phrase; bare verb medium FP (horses) | Covered (TIER2 bare word; phrase form **NEW**) |
| streamline | medium | medium | Covered (TIER2) |
| seamless (integration) | high | low | Covered (TIER1) |
| robust (platform) | medium | high (engineering/statistics literal) | Covered (TIER1) |
| holistic (approach) | medium | medium (healthcare register) | Covered (TIER1) |
| empower | medium | medium | Covered (TIER2) |
| era (bare, abstract) | low | very high (history writing) | **NEW** — tier C; only viable inside phrases ("digital era", "in an era where" — the latter covered) |
| buckle up | medium | medium (motoring literal) | **NEW** |

From D3/D6 only: **"As A Professional"** (phrase, see §2), **"Leash"** (list item 25 — almost certainly a truncation artefact of "unleash"; record but do not implement).

From D4 (implicit, via "avoid padding with"): **significantly, substantially, crucial, essential** as empty emphasis. Engine: significant/significantly covered (TIER3), crucial covered (TIER2); **substantially** and **essential** NEW (both very high FP — tier C, density-only).

---

## 2. Phrase tells

### 2a. Corroborated phrases (D2 + D3/D6)

| Phrase | Severity | FP risk | Engine status |
|--------|----------|---------|---------------|
| in today's digital era / digital world / fast-paced world | high | low | Covered (TRANSITIONS `in today's`, FORMULAIC_OPENERS) |
| look no further | high | low | **NEW** |
| shed light (on) | medium | medium (legitimate idiom) | **NEW** |
| dive in / dive into / diving into | medium | medium (literal swimming) | Covered (TIER1_PHRASES) |
| deep dive | medium | medium | Covered (TIER1_PHRASES) |
| that being said / having said that | medium | high (common speech) | Covered (TRANSITIONS) |
| on the other hand | low | very high (ordinary idiom) | **NEW** — tier C only |
| remember that / remember, the key is to | medium | high (bare "remember that" is ordinary; the imperative-opener form is the tell) | **NEW** as sentence-initial imperative: `/(?:^|[.!?]\s+)Remember,?\s+(?:that\s+)?(?:the\s+key|it['']?s)\b/` |
| put it simply / to put it simply | medium | medium | **NEW** |
| to summarise / to summarize | medium | medium | Covered (TRANSITIONS) |
| world of [X] (abstract) | low | high | **NEW** — tier C |
| is key / the key is to | medium | high | **NEW**: `/\b(?:is|are)\s+key\b(?!\s*(?:word|board|stone))/` — still high FP |
| game changer (two words) | high | low | Covered (TIER1 has hyphenated; confirm unhyphenated matches) |

### 2b. Single-source phrases — D2 only (anecdotal)

| Phrase | Severity | FP risk | Engine status |
|--------|----------|---------|---------------|
| best positioned to benefit | medium | low | **NEW** |
| competitive advantages | low | very high (legitimate business term) | **NEW** — tier C |
| crucial to | medium | high | Partially (crucial in TIER2) |
| consulting with a (professional) | medium | medium | **NEW** (also in D3's fragment list — but D3's list may share ancestry; treat as weakly corroborated) |
| popular choice | low | high | **NEW** (D3: "are a popular choice for their") |
| stepping into | low | high | **NEW** — tier C |
| comprehensive suite of | high | low | **NEW** (D1 Tier 1 #21) |
| tailored solutions | high | low | **NEW** (D1 Tier 1 #22) |
| holistic approach | high | low | Partially (holistic TIER1; bigram would raise confidence) |
| break down (non-technical) | low | very high | **NEW** — tier C ("break down the process into" is the implementable form) |

### 2c. Single-source phrases — D3 fragment list (anecdotal, owner practice)

D3 carries ~60 verbatim fragments harvested from one AI-generated shed-insulation article. Many are topic-specific residue ("caulk or weatherstripping", "moisture can seep into", "an old rug or even leftover blankets…") and must NOT ship as generic tells — tier C, document only. The generic, implementable subset:

| Phrase | Severity | FP risk | Engine status |
|--------|----------|---------|---------------|
| before diving into | medium | low | **NEW**: `/\bbefore\s+diving\s+in(?:to)?\b/i` |
| common choices include | medium | low | **NEW** |
| break down the process into / the process can be broken down into | medium | low | **NEW**: `/\b(?:break(?:ing)?\s+(?:down\s+)?the\s+process\s+(?:down\s+)?into|process\s+can\s+be\s+broken\s+down\s+into)\b/i` |
| understanding your starting point | medium | low | **NEW** |
| while it might seem counterintuitive | medium | low | **NEW** |
| common pitfalls and how to avoid them | high | low | **NEW** |
| escape the stresses of daily life | medium | low | **NEW** |
| right? Well, not anymore | medium | low | **NEW**: `/\bright\?\s*Well,\s+not\s+any\s*more\b/i` |
| (this is) where things get interesting | medium | medium | **NEW**: `/\bwhere\s+things\s+get\s+interesting\b/i` |
| even the best plans can | low | medium | **NEW** |
| work(s) wonders (here) | medium | medium | **NEW**: `/\bworks?\s+wonders\b/i` |
| unlock its full potential | high | low | **NEW**: `/\bunlock(?:ing)?\s+(?:its|your|their|the)\s+full\s+potential\b/i` |
| even the most meticulously | medium | low | Partially (meticulously TIER1) |
| extending their lifespan (and) | low | medium | **NEW** — tier B |
| present challenges due to | low | medium | **NEW** — tier B |
| helping maintain a stable | low | medium | tier C |
| for incremental improvements | low | medium | tier C |
| an investment in both | low | medium | tier C |
| safety should never be (overlooked/compromised) | medium | medium | **NEW** — tier B |
| as a professional / As A Professional | medium | medium | **NEW** |

### 2d. Chatbot-register phrases — D3 "How to write" section and prompting section (D1 §5)

Boilerplate disclaimers as tells (D3: "Resist Boilerplate Disclaimers or 'AI/GenAI' References"):

| Phrase pattern | Severity | Engine status |
|----------------|----------|---------------|
| "I am not a lawyer, but…" / "I am not a [profession], but" | high | **NEW**: `/\bI\s+am\s+not\s+a\s+(?:lawyer|doctor|financial\s+advisor|professional)\s*,?\s+but\b/i` — FP medium (humans genuinely write this; treat as chatbot-register corroborator) |
| "AI may produce errors" / "AI is continuously evolving" | high | Partially (CUTOFF_DISCLAIMERS covers self-description; generic AI-caveat sentences **NEW**) |

---

## 3. Structural tells (with detection logic)

### 3a. Grandiose introduction (D1 §3a, D3 pattern 1 — corroborated)

Formula: *IntroPhrase + BroadContext + AssertionOfImportance* in the first paragraph.
- "In today's fast-paced digital world, …" — Covered (FORMULAIC_OPENERS)
- "As technology continues to evolve, …" — Covered (FORMULAIC_OPENERS `as … continue to evolve`)
- "The future of X is increasingly shaped by …" — **NEW**: `/\bthe\s+future\s+of\s+[\w\s]{1,30}\s+is\s+increasingly\s+(?:shaped|driven|defined)\s+by\b/i`. Severity high, FP low.
- **Positional weighting (NEW idea):** D1/D3 frame these as *opening* patterns. Suggest the engine multiply opener-category weights when the match sits in the first ~300 characters.

### 3b. Obligatory list / listicle promise (D1 §3b, D3 pattern 2 — corroborated)

- "Here are N steps/things/strategies/best practices to …" — **NEW**: `/\bhere\s+are\s+(?:\d+|five|six|seven|eight|nine|ten)\s+(?:steps|things|ways|tips|strategies|best\s+practices|key\s+elements)\b/i`. Severity medium, FP medium (human listicles exist — this is a genre tell as much as an AI tell).
- "Key elements include:" / "Common choices include:" — **NEW**: `/\bkey\s+(?:elements|aspects|factors|components|considerations)\s+include\b/i`. Severity medium.
- List-density metric — Partially covered (bullet-np-list). D3 adds the refinement that *generic advice under each bullet* is the tell; measurable proxy: ratio of bullets to paragraphs > ~0.6 across a long article. Tier B.

### 3c. Transitional filler chains (D1 §3c, D3 pattern 3 — corroborated)

- Individual words covered (TRANSITIONS). **NEW measurable rule:** two or more distinct filler transitions ("additionally", "moreover", "furthermore", "another important aspect", "by doing so") within one paragraph, or ≥3 paragraphs in a row *opening* with a filler transition. D3: "Overuses transitions … to chain points together."
- "Another important aspect to consider is" — **NEW**: `/\banother\s+(?:important|key|crucial)\s+(?:aspect|factor|thing|element|point)\s+to\s+consider\b/i`. Severity medium, FP low.
- "By doing so, you'll / you can" — **NEW**: `/\bby\s+doing\s+so,?\s+you(?:['']ll|\s+can|\s+will)\b/i`. Severity medium, FP low.
- "it's crucial to remember" — **NEW**: `/\bit['']?s\s+(?:crucial|important|essential)\s+to\s+remember\b/i`. Severity medium. (Engine covers "it's important to note that" but not "remember".)

### 3d. Marketing-buzz conclusion / CTA (D1 §3d, D3 pattern 4 — corroborated)

- "In conclusion, by following these steps, you can significantly boost…" — Partially (TRANSITIONS `in conclusion`). **NEW compound rule:** `in conclusion|by following these (?:steps|tips)` + benefit verb (`boost|improve|enhance|transform`) in the final paragraph. Severity high when compound.
- "Take action now (to)" — **NEW**: `/\btake\s+action\s+now\b/i`. Severity medium.
- "staying proactive ensures you remain at the forefront of" — **NEW**: `/\b(?:at|to)\s+the\s+forefront\s+of\b/i` (FP medium alone; high confidence in a closing paragraph) and `/\bstay(?:ing)?\s+(?:proactive|ahead\s+of\s+the\s+curve)\b/i`. Severity medium.

### 3e. Value-buzzword stacking (D1 §3e, D3 pattern 5 — corroborated)

Formula: power verb (*ensure, leverage, prioritise, harness, enhance, capitalise on*) + intangible adjective+noun (*holistic approach, seamless user experience, sustainable design, robust solution*).
- Individual words largely covered (TIER1/TIER2). **NEW measurable rule:** power verb within 5 tokens of an intangible buzz-adjective — e.g. `/\b(?:ensure|leverage|prioriti[sz]e|harness|enhance|capitali[sz]e\s+on|deliver)\w*\s+(?:\w+\s+){0,3}(?:holistic|seamless|robust|sustainable|scalable|exceptional|strategic)\b/i`. Severity high (compound), FP low.
- "Prioritise sustainability and accessibility" style paired-abstract-noun objects — tier B: `/\bprioriti[sz]e\s+\w+ity\s+and\s+\w+ity\b/i`.

### 3f. Excessive prepositional-phrase chains (D1 §3f, D3 pattern 6 — corroborated)

"By integrating this approach into your existing framework, you can create a more robust and adaptable solution, leading to increased efficiency."
- **NEW regex (opener form):** `/\bBy\s+\w+ing\s+[^,.]{5,60},\s+you\s+can\s+\w+/g` — the "By V-ing X, you can Y" template. Severity medium, FP medium (humans use it; flag on ≥2 occurrences per document).
- **NEW regex (outcome tail):** `/,\s*leading\s+to\s+(?:increased|improved|enhanced|greater|better)\s+\w+/gi`. Severity medium, FP low.
- **NEW stylometric:** count prepositional-phrase heads (of/in/to/for/with/by/into/across) per sentence; flag sentences with ≥5 combined with zero concrete numbers or named entities. Tier B (needs tuning).

### 3g. Staccato setup-and-expansion cadence (D1 §3g — single source, anecdotal but precise)

Short setup sentence (≤6 words) immediately followed by a long expansion (≥18 words), or the reverse (long explanation, short punchline), used repeatedly.
- Example flagged: "The answer is simple. The platform, scope, content, migration and support requirements determine the actual cost."
- **NEW measurable rule:** within a document, count adjacent sentence pairs where len(a) ≤ 6 words and len(b) ≥ 3× len(a) (or the mirror); flag when such pairs exceed ~15% of all adjacent pairs. D1's own caveat is the FP guard: "A short sentence is acceptable when it stands independently and does not introduce, restate or theatrically conclude the adjacent sentence." Severity medium, FP medium. Engine status: **NEW** (sentence-flatline measures the opposite failure — uniformity; this measures *formulaic* variation).

### 3h. Directive-verb + colon opener (D3 algorithm section — single source)

"Plan for scalability:", "Ensure that…", "Optimise your…" as bullet or sentence openers.
- **NEW regex:** `/^(?:[-*+\d.)\s]*)?(?:Plan|Ensure|Optimi[sz]e|Enhance|Leverage|Prioriti[sz]e|Implement|Utili[sz]e|Consider|Embrace)\b[^.:\n]{0,50}:/gm`. Flag when ≥3 list items in one list match. Severity medium, FP medium (legitimate technical checklists). Tier B.

### 3i. Correlative templates (D3 algorithm section — single source)

"not just X but also Y", "both X and Y" repeated mechanically.
- Engine covers the dash form (NOT_JUST_CONTRAST). **NEW:** the `not\s+(?:just|only)\s+[^,.]{1,50},?\s+but\s+(?:also\s+)?` form, flagged on density (≥2 per ~500 words) rather than single occurrence — FP high for single use. Tier B.

### 3j. Teach-and-preach section scaffolding (D3 — single source)

Sections named "Why it's important", "How to get started", "Best practices", "Common pitfalls".
- **NEW regex on headings:** `/^#{1,6}\s+(?:why\s+(?:it|this)\s+(?:matters|is\s+important)|how\s+to\s+get\s+started|best\s+practices|final\s+thoughts|key\s+takeaways)\s*$/gim`. Severity medium, FP medium. ("best practices" phrase itself covered in TIER1_PHRASES.)

### 3k. Proximity clustering (D2 §2.2 — single source, precise)

Same overused word ≥2 times within a 3-sentence window.
- **NEW measurable rule:** for each TIER1–3 lexical hit, check a ±3-sentence window for a repeat of the same lemma; escalate severity one step when found. This is a *modifier* rule, not a standalone tell. FP low as a modifier.

### 3l. Template-driven page structure (D2 §3.1 — single source)

Identical section skeletons, uniform benefit-list formatting, FAQ answers all shaped alike.
- Partially covered (uniform-sections, uniform-list-items, punct-distribution). D2 adds cross-*page* comparison (identical structures across pages of one site) — out of scope for a single-document engine; record for the WordPress plugin's site-level layer. Tier C for now.

### 3m. Label-and-explanation bullet punctuation (D1 §3h — single source, owner house style)

Owner rule: bullets must use `**Label** - explanation` with spaced hyphen, never `Label.` followed by prose, never em/en dash.
- Inversion is ambiguous: this is a *house-style preference*, and the em-dash-after-bold-label form is already flagged (SEPARATOR_DASH_RE). The `Label.` prose form as a tell: `/^[-*+]\s+[A-Z][\w\s]{2,40}\.\s+[A-Z]/gm` — bullet starting with a short capitalised noun phrase ended by a full stop then a new sentence. Tier B, FP medium. Engine status: dash form covered; full-stop form **NEW**.

---

## 4. Stylometric tells (measurable thresholds)

| Tell | Source | Detection logic | Severity / FP | Engine status |
|------|--------|-----------------|---------------|---------------|
| High passive-voice ratio | D3 (corroborated by D1 §4b) | Ratio of passive constructions (be-form + past participle, optionally + "by") to total finite clauses; flag above ~25% in marketing/blog register. D3: AI drafts "sound more scholarly" via passive. | medium / high (academic and scientific prose is legitimately passive — register-gate this) | **NEW** |
| Uniform sentence length | D1 §4e, D3 "switch up long and short sentences" | stdev of sentence lengths below threshold | — | Covered (sentence-flatline) |
| Uniform paragraph length/structure | D1 §4e, D2 §3.2 (2–8 sentence variation required) | paragraph-length variance | — | Covered (uniformity, cross-para-burstiness) |
| Word repetition without synonym variation | D3 (climate-change example: same noun repeated across adjacent sentences), D2 | Repeated content-lemma in adjacent sentences; document-level type-token ratio | medium / medium | Partially (low-ttr is document-level; the adjacent-sentence lemma repeat is **NEW** and sharper) |
| Overlong "scholarly" sentences with Latinate vocabulary | D3 simplification examples ("delineates a conspicuous correlation amid stressors…") | Mean word length + rare-word ratio + mean sentence length jointly high | low / high | **NEW** — tier B (readability-score proxy, e.g. Flesch below ~30 in a blog register) |
| Empty-emphasis adverb density | D4 | Count of significantly/substantially/crucially/essentially per 1,000 words | low / high | Partially (TIER3, CONFIDENCE_CALIBRATION) |
| Zero typos + perfectly consistent punctuation | D4 (inversion of "apply natural punctuation… vary punctuation usage inconsistently", "vary spacing patterns") | Absence of any irregular spacing, no doubled spaces, perfectly consistent quote/dash usage across a long text | note / very high (any professionally edited text) | Covered in spirit (smart-punct-signature, punct-distribution) — keep at "note" severity |
| Em-dash presence | D1 checklist ("No em dashes?") | density per 1,000 words | — | Covered (em-dash-density) |
| No first-person anywhere | D3/D4/D7 (inversion — see §6) | Zero occurrences of I/we/my/our in a full-length opinion/blog piece | low / high (news register legitimately impersonal) | **NEW** — tier B, register-gated |
| No concrete numbers or named entities | D2 §2.4/§3.3, D3, D7 contrast | Count of digits, percentages, proper nouns, dates per 1,000 words below threshold | medium / medium | **NEW** — tier B ("specificity score") |

---

## 5. Formatting tells

| Tell | Source | Logic | Engine status |
|------|--------|-------|---------------|
| Heavy bold styling | D4 inversion (bold recommended for scanning — weak signal both ways) | bold-phrase density | Covered (formatting) |
| Bullet-list overload where prose would serve | D1 §3b, D3 | bullets-to-prose ratio | Partially (bullet-np-list) |
| Em/en dash in label bullets | D1 §3h | see §3m | Covered (SEPARATOR_DASH_RE) |
| Title-case headings | — (not in owner docs; engine already has it) | — | Covered (TITLE_CASE_HEADER) |
| Verbose natural-language code comments | D2 §5.2 (`// Initialise the advanced user management system for comprehensive data handling`) | comment length + buzzword content in code blocks | **NEW** — tier C (only relevant if the engine ever scans code) |
| Over-descriptive camelCase identifiers (`advancedUserManagementSystemHandler`) | D2 §5.3 | identifier length > ~30 chars with buzzword segments | **NEW** — tier C |
| Templated meta descriptions ("Learn about [keyword] with our [service]") | D2 §4.1 | `/\b(?:Discover|Learn\s+about|Explore)\s+(?:comprehensive|advanced|our)\b/i` in meta description fields | **NEW** — tier B (WordPress plugin context makes this implementable) |

---

## 6. Contrast features from the BrettBot example articles (D7, guided by D5)

What the target human writing does that generated text typically does not. Recorded as **absence-of-humanity signals**: individually weak, meaningful only in aggregate, and never more than tier B/C corroboration.

**Observed in the five articles:**

1. **Concrete, checkable specifics** — "15-20 tweets per day", "64% of Twitter users", "160-character Twitter bio", "90 days", "over 200 measurements", named people (Danny Sullivan), named updates (Hummingbird, Panda), dates. *Inversion:* specificity score (§4, last row).
2. **First-person stance and ownership of opinion** — "I'm not just pointing the finger…", "in our opinion", "I think these are some of the ways", "My concern is". *Inversion:* zero-first-person signal (§4). FP high; register-gate.
3. **Genuine hedged uncertainty, distinct from AI hedging** — "Anecdotally, many would argue", "perhaps it was always intended", "I welcome comment from those who…". Human hedges attach to a committed claim; AI hedge-stacks avoid one (engine's HEDGE_STACK already captures the AI side).
4. **Typos and grammatical slips survive publication** — "an digital marketing company", "unable to found by", "clawed by Panda and frozen out by Panda" (meant Penguin), "forms" for "forums", "hoURLy", "unless they are the same person!". *Inversion:* flawlessness-plus-blandness co-occurrence, already approximated by smart-punct-signature. Never flag errors as human-proof either — tier C observation only.
5. **Sarcasm and editorial bite** — "Google have very kindly introduced ANOTHER major change", "surprise surprise, Google+", rhetorical questions with real stakes ("Is there a contradiction here again?"). Not implementable as a rule; document only.
6. **Coined terms and wordplay** — "Googletax", "#TWIPS". Novel-coinage detection is not implementable reliably; document only.
7. **Digression and asymmetric structure** — sections of wildly different lengths (the #TWIPS article ends with ~50 reader-submitted tips verbatim, misspellings intact); one-sentence paragraphs beside 200-word ones. Supports the engine's existing uniformity metrics as the inverse.
8. **CAPS for emphasis and inconsistent typography** — "ALL searches", "ANOTHER". Mildly implementable: total absence of any emphasis irregularity in a long opinionated piece is a weak flatness signal. Tier C.
9. **Analogies drawn from lived context, not stock imagery** — "like a kid in an exam", "the wife and the cleaner", "a sole trader selling scrap car parts in Liverpool… fabric in Finchley". Contrast with AI stock imagery (tapestry/symphony/beacon). Document only.

**D5's own caution applies:** D5 is an AI-written analysis of Brett's style (it uses "delve"-adjacent phrasing itself: "a deeper dive into"). Its buzzword-coining suggestions ("Soci-mental", "Algorhythm Blues") are synthetic, not evidence of the human corpus. Only D7 is primary evidence.

---

## 7. NEW vs covered summary

| Category | Already in engine | NEW from owner docs |
|----------|------------------|---------------------|
| Lexical | delve, tapestry, beacon, robust, comprehensive, cutting-edge, seamless, game-changer, nestled, bustling, holistic, symphony, embrace, harness, navigate, foster, elevate, unleash, streamline, empower, revolutionize, crucial, transformative, meticulous(ly), embark, underscore, leverage, landscape, realm | journey (abstract), unlock/unlocking, enigma, labyrinth, remnant, pesky, promptly, folks, essence, facet, arena, thus, ultimately (bare), nonetheless, exhaustive, top-notch, revolutionary, AI-powered, buckle up, era (bare), essential, substantially, cool (mkt) |
| Phrase | testament to, dive into, deep dive, at its core, best practices, in today's, that being said, to summarize, in conclusion, it's worth noting | look no further, shed light, put it simply, is key, comprehensive suite of, tailored solutions, best positioned to benefit, unlock full potential, before diving into, common choices include, break down the process into, understanding your starting point, while it might seem counterintuitive, common pitfalls and how to avoid them, where things get interesting, work wonders, right? Well not anymore, even the best plans can, escape the stresses of daily life, as a professional, consulting with a professional, popular choice, take action now, at the forefront of, stay ahead of the curve, another important aspect to consider, by doing so you'll, it's crucial to remember, I am not a [profession] but, the future of X is increasingly shaped by, here are N steps, key elements include |
| Structural | formulaic openers, let's-constructions, generic conclusions, not-just-dash contrast, bullet-np-list, uniform sections/lists, label-dash bullets | setup-and-expansion cadence (§3g), directive-verb+colon openers (§3h), "not only…but also" density (§3i), teach-and-preach headings (§3j), proximity-clustering modifier (§3k), power-verb+buzz-adjective compound (§3e), "By V-ing X, you can Y" + ", leading to increased Z" (§3f), filler-transition chaining threshold (§3c), compound conclusion+CTA rule (§3d), positional opener weighting (§3a), full-stop label bullets (§3m) |
| Stylometric | sentence-flatline, uniformity, burstiness, low-ttr, punct-distribution, smart-punct-signature, fnword-trigram-entropy, em-dash-density, hedge-stack | passive-voice ratio, adjacent-sentence lemma repetition, specificity score (numbers/entities per 1,000 words), zero-first-person (register-gated), readability-register mismatch |
| Formatting | bold density, title-case headers, separator-dash bullets | templated meta descriptions, AI-style code comments/identifiers (tier C) |

---

## 8. Merge plan

**Tier A — safe to flag now** (corroborated or unambiguous, low FP):
- Lexical: enigma, labyrinth, look no further (phrase), top-notch, buckle up, unlock/unlocking (with literal-lock guard), journey (abstract, with "user journey"/travel guard), revolutionary, AI-powered, comprehensive suite of, tailored solutions.
- Phrases: unlock full potential, before diving into, common pitfalls and how to avoid them, break down the process into, while it might seem counterintuitive, common choices include, understanding your starting point, where things get interesting, right? Well not anymore, the future of X is increasingly shaped by, take action now, another important aspect to consider is, by doing so you'll, it's crucial to remember, here are N steps, key elements include, put it simply.
- Structural: power-verb + buzz-adjective compound (§3e), ", leading to increased Z" tail (§3f), compound conclusion+CTA (§3d), proximity-clustering severity modifier (§3k).

**Tier B — implement behind corroboration** (only score when co-occurring with ≥1 tier-A hit, or ship at "note" severity pending testing against the web-research pack):
- shed light, is key, work wonders, popular choice, consulting with a professional, as a professional, at the forefront of, stay ahead of the curve, essence, facet, exhaustive, pesky, folks, "I am not a [profession], but".
- Structural: setup-and-expansion cadence (§3g), directive-verb+colon openers (§3h), not-only-but-also density (§3i), teach-and-preach headings (§3j), filler-chain threshold (§3c), listicle-density (§3b), full-stop label bullets (§3m), positional opener weighting (§3a).
- Stylometric: passive-voice ratio (register-gated), adjacent-sentence lemma repetition, specificity score, readability-register mismatch, templated meta descriptions (plugin context).

**Tier C — document only, do not flag** (very high FP, site-specific, or inverse-signals):
- thus, ultimately, nonetheless, promptly, remnant, arena, era, cool, essential, substantially, on the other hand, world of, competitive advantages, break down, stepping into.
- Opace-specific overuse counters (develop, advanced, detailed, ai-assisted) — these were D2's *replacement fatigue* on one site, not general AI tells.
- D3's topic-specific shed-article fragments not promoted above.
- All §6 absence-of-humanity signals except where already implemented (uniformity family): zero-first-person, no-emphasis-irregularity, coinage absence, error absence. These may inform a future "humanity corroboration" score but must never appear as user-facing flags — flagging the *absence* of typos or opinion crosses BRIEF.md §5's line from editorial evidence towards authorship inference.
- Code-comment and identifier tells (only if the engine ever scans code blocks).

**Merge mechanics:** fold tier A lexical items into TIER1/TIER2 of `en-signals-v2-data.ts` with suggestion strings mirroring the owner docs' "use instead" columns (D1 Tier 1 table supplies them ready-made); tier A phrases into a new `OWNER_PHRASES` category (weight ~4–6) so provenance stays traceable against the web pack; structural compounds as new categories with CATEGORY_META messages using the existing "stylistic hint, not evidence of authorship" wording. Reconcile against `AI-TELLS-MEGA-PACK.md` before shipping: any owner-only tell that the web pack independently reports moves up one tier; any owner-only tell the web pack contradicts stays at C.
