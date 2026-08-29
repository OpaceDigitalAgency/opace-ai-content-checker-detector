# PAID-TOOLS — how commercial AI detectors work, and what that means for Opace

> Part of the **v0.2 working set** with [`BRIEF.md`](BRIEF.md) (intent; its §21 addendum defines the detection capability tiers this document motivated) and [`v0.1-REVIEW.md`](v0.1-REVIEW.md) (audit evidence and the target architecture — §8.4 specifies how the classifier this document calls for is built, §8.5 how it stays consistent and store-compliant across channels).

Date: 27 August 2026
Evidence base: the owner's two live scans of a 100% GPT-5.6 article (Originality.ai report `7ojqbw85d6r1vpua`, 14pp; Copyleaks "New Scans 4:24 PM" report, 15pp), the vendors' public methodology pages, the Pangram Labs technical report (arXiv:2402.14873), academic studies on paraphrase/rewrite detection, and a live test of the same article text through the Opace v0.1 engine and the best open-source rule detector. Sources are linked at the end.

## 1. What the two reports actually say

**The test article:** ~2,915 words, UK eCommerce website cost guide, generated entirely by GPT-5.6 with no human edits.

**Copyleaks:** 100% AI, 0% plagiarism. Its unit of decision is the sentence/segment: every segment was classed "AI Text" (coverage 100%, 2,915 words; "Human Text 0%"). Its definition matters: AI Text is *"a body of text that has been generated **or altered** by AI technology"* — AI ancestry counts, not just pure generation. The "AI Phrases" panel (58 phrases, e.g. "consent, accessibility and" at 307× the human-corpus frequency, "error handling and recovery" 65×, "Discovery and planning" 31×) is an **explanation layer, not the detector**: it shows n-grams that occur far more often in their AI corpus than their human corpus, computed per million documents, to justify a verdict the neural classifier already made.

**Originality.ai:** "100% Likely AI", 2% plagiarism (8 matched sites). Its unit of decision is the whole document with a per-block heatmap; nearly every block is highlighted at the red end. Its published score semantics: the score is **the probability that AI was used (beyond the chosen 15% "AI Allowance"), not the proportion of text that is AI**. The Deep Scan adds per-paragraph percentages and LLM-written rewrite suggestions — again an explanation/remediation layer on top of the classifier.

Both verdicts are correct for this article, and neither tool needed a watermark, metadata or invisible characters to get there.

## 2. How these tools work under the hood

All serious commercial detectors have converged on the same core: **a large transformer classifier fine-tuned on massive paired human/AI corpora, run server-side**. Differences are in training strategy, decision unit and calibration bias.

| Tool | Core method | Decision unit | Known calibration (Pangram benchmark, 1,976 docs) | Notable extras |
|---|---|---|---|---|
| **Copyleaks** | Transformer binary classifier; trained on web/enterprise text collected since 2015 plus AI corpora; incorporates perplexity-style predictability and "overly perfect" uniformity signals | Sentence/segment, aggregated to document coverage | Not in the Pangram bench; claims ~99% on balanced sets; independent reviews note degradation on short texts and heavy edits | AI Phrases n-gram frequency explanations; "generated **or altered** by AI" definition; source-code detection |
| **Originality.ai** | Transformer classifier reading the whole article ("we look at the entire article", not next-word prediction); Lite/Turbo model variants | Whole document + block heatmap | 93.7% accuracy, **9.24% false-positive rate** — measurably biased towards calling text AI | AI Allowance slider (probability-of-use semantics); paid Deep Scan with fix suggestions; aimed at publishers/SEO |
| **GPTZero** | Started as perplexity + burstiness statistics; now a 7-component ensemble including a Paraphraser Shield (catches humanizer-processed text) and internet text search | Sentence and document | 94.2% accuracy, 2.01% FPR, **10.02% false-negative rate** — biased towards calling text human (safer for education) | Most transparent methodology of the commercial set |
| **Pangram** | Transformer trained with **hard negative mining + synthetic mirrors**: an initial classifier scans a huge human pool; every human text it wrongly flags is added to training alongside an LLM-generated "mirror" of the same content, and retraining repeats. This actively hunts down the classifier's own false-positive classes | Document/segment | 99.85% accuracy, 0.19% FPR, 0.11% FNR — ~38× lower error than DetectGPT-class methods; not biased against non-native English | The strongest published evidence; notably **excluded Claude** from its benchmark because outputs needed too much manual clean-up |
| **Turnitin** | Sentence-segment classifier plus a dedicated AI-paraphrase detector | Sentence segments | Institution-only; documented false-positive concerns | Explicitly targets AI-paraphrased human text as a category |

Three structural facts follow:

1. **Zero-shot statistical methods lost.** DetectGPT-style perplexity/curvature approaches scored 76.9% on the Pangram bench with a 14.4% FPR — commercial classifiers beat them by an order of magnitude. (Relevant to us: Binoculars/Fast-DetectGPT, our researched local candidates, are this class — useful free signals, not parity.)
2. **The moat is training data and hard-negative curation**, not architecture. Pangram's entire advantage is a training loop that manufactures difficult examples; Copyleaks' is a decade of collected human writing.
3. **Explanations are post-hoc.** AI Phrases, heatmaps and suggestions are UX layers to make a neural verdict feel inspectable. No vendor discloses thresholds or lets you reproduce a score.

## 3. Would the Opace tool have flagged this article?

I ran a ~430-word verbatim excerpt of the same article through both our built engine and the strongest open-source rule detector:

| Engine | Result |
|---|---|
| **Opace v0.1 (shipped core)** | Clean: 0 unicode findings, 0 pattern findings, summary `pass` |
| **`avoid-ai-writing` (best OSS rule/stylometric detector, ~25 categories + burstiness/TTR/entropy)** | Score 1/100, classification **HUMAN_ONLY**, 98.9% human, high confidence |
| **Copyleaks / Originality (trained classifiers)** | 100% AI — correct |

This is the single most important strategic datum in this document: **well-prompted, fact-dense, restrained AI prose contains no rule-detectable slop at all.** The article has no clichés, no filler, varied sentence content, concrete figures — every surface signal the rule tier looks for has been prompted away. Even the Phase-1 upgrade in `v0.1-REVIEW.md` (full rule library + stylometrics) would **not** have flagged it. What Copyleaks and Originality are reading is distributional: token-level predictability, uniform information density, systematic topic coverage, consistent register across 2,900 words — properties only a trained model can score.

Consequences for the roadmap:

- The rule tier (Phase 1) is still essential — it catches carriers, slop-grade AI text, and provides explainable editorial value — but it can never be the detection story.
- Detection parity with paid tools requires the **trained-classifier layer**: Layer 3 (distilled in-browser model) and Layer 4 (Binoculars/Fast-DetectGPT locally; BYOK adapters to Copyleaks/Originality/Pangram) from `v0.1-REVIEW.md` §8. Realistic expectation, stated honestly: local free models will land well above rules but below Pangram-class accuracy; exact-parity claims must wait for our benchmark evidence.
- Our AI-Phrases-style explanation layer is cheap to build (n-gram frequency ratios over open human/AI corpora) and is currently the most-liked explanatory feature in the paid tools — worth adopting as an evidence panel.

### 3.1 Do any free or open-source tools flag this as accurately as the paid ones?

Not out of the box — but the gap is graded, not absolute:

- **Rule/stylometric engines (avoid-ai-writing class): no, and never will.** Proven above — 98.9% "human" on a 100% AI article. They read style; this text has clean style.
- **Fine-tuned open classifiers (RADAR, RoBERTa-era detectors, most HuggingFace models): no.** They were trained on GPT-2/3.5-era corpora and independent 2026 reviews find they degrade badly on GPT-4o/Claude-4/Gemini-class output, precisely because nobody refreshes their training data. Same architecture as the paid tools, stale fuel.
- **Zero-shot statistical methods (Binoculars, Fast-DetectGPT): closest free option, with real costs.** They read token-probability structure rather than style, so fluent modern prose does not evade them the way it evades rules — and Fast-DetectGPT's January 2026 update (Llama-3-8B scoring pairs) specifically reports substantially better results on newer-model text. But they need multi-GB local models, run far above browser weight, sit measurably below the commercial classifiers at low false-positive operating points (DetectGPT-class methods scored 76.9% with 14.4% FPR on the Pangram bench; the modern variants are better but not 99%-class), and are weakened by paraphrase. We snapshot both repos and have run neither with models — untested locally, so treated as `not_run` evidence.
- **The paid tools' own moat is data, not code.** Pangram published its method; Copyleaks' and Originality's edge is a decade of curated human/AI corpora and continuous retraining on each new model generation. That is a maintenance treadmill, which is both why free tools decay and why a maintained open alternative is a genuine gap in the market.

So on the owner's article today: the only free path to the right verdict is Fast-DetectGPT/Binoculars with current scoring models on capable hardware — which is exactly what `v0.1-REVIEW.md` §7 Phase 2 wires into the local engine first, while the distilled browser classifier (§8.4) is built to bring a usable slice of that capability to the no-install surfaces.

## 4. Why hand-rewritten AI text still gets flagged

The owner's observation — completely hand-rewriting AI text and still scoring "AI" on one or both tools — is a known, studied effect with five stacking causes:

1. **The AI's plan survives your words.** Rewriting sentence-by-sentence preserves the document skeleton: section order, idea sequencing, one-idea-per-sentence rhythm, parallel list constructions, uniform paragraph lengths, systematic "cover every sub-topic" completeness. Classifiers read exactly these long-range structural regularities ("we look at the entire article"). Research on human-paraphrased LLM text confirms detection persists when structure is retained and drops mainly when the *organisation* changes.
2. **Detectors are deliberately trained to catch edited AI.** Copyleaks defines AI Text as "generated **or altered** by AI"; Turnitin ships a dedicated AI-paraphrase detector; GPTZero runs a Paraphraser Shield; Pangram's hard-negative loop generates "synthetic mirrors" of human text — i.e. AI-flavoured versions of real content — specifically so the model learns the residue that survives rewording. A hand-rewrite of an AI draft sits squarely in that trained category.
3. **Calibration bias.** Originality runs at a measured ~9.2% false-positive rate — roughly 1 in 11 genuinely human documents flagged — because its publisher market prefers over-flagging. If only one tool flags your rewrite, it is usually this one.
4. **Convergent style.** Professional UK business/SEO copy — structured headings, concrete figures, restrained register, consistent terminology — genuinely resembles the AI training distribution, because models were trained on exactly this genre. Non-native writers and heavily style-guided writers suffer the same effect (the documented false-positive bias). Grammarly-class assistance and smart-punctuation artefacts can additionally count as "altered by AI" under Copyleaks' definition.
5. **Aggregation drag.** Sentence-level tools aggregate: a few strongly-AI-scoring segments (retained lists, tables, definitional sentences) pull document coverage towards 100% even when other paragraphs score human.

**Practical implication:** to make an AI-assisted piece read as human to these classifiers you must change the *plan*, not the words — write from your own outline and notes, reorder ideas, vary information density, merge/split sections, inject genuinely new material and first-hand specifics. (And per `BRIEF.md` §5, Opace must never promise detector evasion — but explaining this mechanism honestly is legitimate, valuable content and a strong research-page topic.)

## 5. Overlap and gap: Opace family vs the paid tools

| Capability | Copyleaks / Originality / GPTZero / Pangram | Opace (current v0.1) | Opace (planned, per v0.1-REVIEW) |
|---|---|---|---|
| Trained AI-text classification | Core product, server-side, closed | Absent | Layer 3 local model + Layer 4 local detectors; BYOK to these same vendors |
| Explanation (phrases/heatmap) | Post-hoc UX layers | Absent | n-gram evidence panel; per-method evidence rows (stronger provenance than theirs) |
| Invisible Unicode / carriers | Not offered | Partial (7 chars; gaps) | Full carrier table — a genuine differentiator none of them ship |
| Homoglyph detection | Not offered | Partial (7 chars) | Full confusables — differentiator |
| Provenance / C2PA | Not offered | Absent (stub) | c2pa-js — differentiator |
| Protected facts / citations / fidelity gates | Not offered | Partial (no names/citations) | Full protect-and-gate loop — differentiator no detector has |
| Plagiarism | Copyleaks/Originality yes | Out of scope | Out of scope (state it) |
| Local/private processing | None — all upload to vendor servers | **Yes, fully local** | Yes, including local models — the headline differentiator |
| Receipts / auditable evidence | Shareable PDF reports, no reproducibility | Hash-only receipts | Versioned, reproducible receipts — differentiator |
| Calibrated published accuracy | Marketing claims; independent bench shows 9.2% FPR (Originality), 10% FNR (GPTZero) | None | The Integrity Index: reproducible, versioned benchmark — the credibility play none of them can make |
| Price/privacy | Credits/subscriptions; content leaves the building | Free | Free core + BYOK |

**Positioning conclusion:** do not sell Opace as "a detector like Copyleaks but free" — with rules alone that claim loses in one screenshot (§3 proves it). Sell the thing they structurally cannot be: a **local-first integrity and evidence platform** — carriers, provenance, protected facts, receipts, honest per-method states — with detection layers that grow from free-local (rules → stylometrics → local models) to BYOK parity using the vendors themselves as optional adapters, and a reproducible public benchmark that holds every vendor (and Opace) to measured false-positive rates rather than marketing claims.

## 6. What is the best we can realistically hope for — and can we beat them in a smarter way?

**Raw classifier accuracy, stated honestly.** Near-term (one training cycle on fresh corpora with the published hard-negative method): a local model that decisively beats every current free/open tool and approaches GPTZero-class territory (~94%, low-single-digit FPR) on current-model English text — enough that the owner's GPT-5.6 article flags correctly. Pangram-class 99.85%/0.19% FPR is a multi-cycle data-curation programme, not a first release; claiming it early would violate `BRIEF.md` §5. Every published number must come from our own versioned benchmark, per the brief's gates.

**The smarter ways to win (in priority order):**

1. **Incorporate them instead of only chasing them.** Their APIs exist; BYOK adapters make Opace the neutral desk that runs Copyleaks + Originality + GPTZero + local methods side-by-side on one text with one receipt. Nobody else offers the comparison view, and it converts their strength into our feature. (The two reports in this study disagree with each other often enough — 9.2% FPR vs 10% FNR biases — that "compare them honestly" is a real product.)
2. **Incorporate their published science.** Pangram's training loop is in the open literature; hard negative mining with synthetic mirrors is ours to implement legally. The AI-Phrases explanation layer is reproducible from open corpora. The heatmap/sentence-highlight UX is a design pattern, not IP.
3. **Own what they structurally cannot do.** Local/private processing (their business model requires upload), deterministic Tier-A evidence (carriers, provenance, protected facts, receipts), reproducible calibration (their marketing numbers vs our published FPR/TPR per corpus version), and false-positive-first framing for the people detectors hurt (the 1-in-11 humans Originality flags).
4. **Own the freshness treadmill niche.** Free detectors die of stale corpora; a maintained open model with a monthly fresh-corpus release (funded by the agency-services flywheel) is the gap between abandoned academic repos and closed commercial APIs — and every model refresh is a citable release for the SEO/authority strategy.
5. **Fight where the ground is level.** On hand-rewritten and lightly-edited AI text the commercial tools genuinely diverge (§4); our benchmark's rewritten-AI category can make Opace the reference for the one question everyone actually argues about.

**What we should not attempt:** matching their plagiarism databases, their internet-scale source matching, or headline accuracy claims without benchmark evidence. Out of scope, stated openly.

### 6.1 Plain-English positioning and the claims ladder

How to describe the Opace solution to an SEO person or copywriter, without jargon:

> **"Check your content before you publish — free, private, with proof."**
> Paste your draft and Opace shows you: an AI score, any hidden AI fingerprints in the text (invisible characters the paid tools don't even look at), and it locks your facts — names, prices, dates, links — so nothing gets broken while you fix the writing. You get a report you can hand to a client showing exactly what was checked. Your text never leaves your browser; the paid tools upload everything to their servers. Already pay for Copyleaks or Originality? Plug your account in and see their scores inside Opace, next to ours.

Jargon translation used elsewhere in these documents: *carriers* = hidden invisible characters; *provenance* = tamper-evident content credentials in files; *receipts* = the client-ready proof report; *per-method states* = no green tick for a check that did not run; *BYOK* = bring-your-own-key, connecting a paid detector account the user already owns.

The claims ladder — each step claimable only when its evidence exists, per `BRIEF.md` §5:

| Claim | When claimable | Evidence required |
|---|---|---|
| "The most complete free content checker" (detection + hidden characters + fact protection + reports, in one) | v0.2 launch | Feature truth — no free tool combines these today |
| "Beats every free tool" / "the most capable free AI checker" | After Layer-3 model ships (v0.2 Phase 2) | Public benchmark run vs the free field, published with the corpus version |
| "Real AI detection, free and private, approaching commercial accuracy" | After first calibrated model cycle (~GPTZero-class, ≤1–2% measured FPR) | Versioned benchmark with published FPR/TPR |
| "Matches the paid tools when you connect them" | With BYOK adapters live | Literal truth — their scores render in our interface |
| "As accurate as the leading paid detectors" (unqualified) | Not near-term; multi-cycle data programme | Only if/when the Index proves it; do not pre-claim |

The one-line market truth behind all of it: **today, nothing free that a normal person can actually use detects well-prompted current-model AI text (§3.1) — the capable free methods are unusable research code, and the usable free tools are blind. Being the first maintained, usable, honest free option is the opportunity.**

## 7. Actions fed back into the plan

1. Confirms `v0.1-REVIEW.md` Phase 2 priority: the classifier layer is not optional if detection is part of the promise; rules alone score 1/100 on real GPT-5.6 output.
2. Add an **AI Phrases-style evidence panel** (open-corpora n-gram ratios) to the Layer-1/2 roadmap — high explainability per unit of effort, and it feeds the rewrite workflow.
3. Add **BYOK adapters for Copyleaks and Originality** (both have public APIs) ahead of other providers — the owner already holds accounts, enabling the direct provider-comparison UX and honest "we called X, it said Y" badges the brief demands.
4. Add a research/content page: *"Why hand-rewritten AI text still flags as AI"* — §4 of this document is the draft; it targets a high-intent query neither vendor answers candidly, fits the authority strategy, and requires no product work.
5. Benchmark design: include a **hand-rewritten-AI** category (the owner can supply real examples) alongside human/AI/humanized text — it is the category where vendor behaviour diverges most and where our Index can say something nobody else measures.

## Sources

- Owner scans: Originality.ai report `app.originality.ai/share/7ojqbw85d6r1vpua` (27 Aug 2026); Copyleaks Analysis Report "New Scans 4:24 PM" (27 Aug 2026), both on the same GPT-5.6 article.
- [Pangram Labs technical report (arXiv:2402.14873)](https://arxiv.org/abs/2402.14873) — architecture, hard negative mining with synthetic mirrors, measured accuracy/FPR/FNR for Pangram, GPTZero, Originality, DetectGPT.
- [Originality.ai — highlight AI text](https://originality.ai/blog/highlight-ai-text) — whole-article approach, heatmap; AI Allowance semantics from the owner's report pages.
- [Copyleaks — how AI detection works](https://copyleaks.com/blog/how-does-ai-detection-work) and [AI Detector FAQs (PDF)](https://copyleaks.com/wp-content/uploads/2023/05/ai-content-detector-faqs.pdf) — transformer classification, sentence-level tagging, "generated or altered", training corpus claims (site blocks automated fetch; summarised from search caches and the owner's report).
- [Understanding the effects of human-written paraphrases in LLM-generated text detection (ScienceDirect, 2025)](https://www.sciencedirect.com/science/article/pii/S2949719125000275); [Can AI-Generated Text be Reliably Detected? (arXiv:2303.11156)](https://arxiv.org/pdf/2303.11156); [Detecting AI-Generated Text: Factors Influencing Detectability (arXiv:2406.15583)](https://arxiv.org/pdf/2406.15583); [Turnitin — AI paraphrasing detection](https://www.turnitin.com/blog/ai-paraphrasing-detection-strengthening-the-integrity-of-academic-writing); [GPTZero component overview via ScienceDirect study](https://www.sciencedirect.com/science/article/pii/S1075293526000668).
- [Eden AI — free, open source and commercial AI detection compared (2026)](https://www.edenai.co/post/top-free-ai-content-detection-apis-and-open-source-models) — open detectors trained on older corpora degrading on current models; [Almost AI, Almost Human: detecting AI-polished writing (arXiv:2502.15666)](https://arxiv.org/pdf/2502.15666) — lightly-edited AI as the hardest category.
- Fast-DetectGPT snapshot README (`source-snapshots/fast-detect-gpt`) — January 2026 Llama-3-8B scoring-pair update for newer-model text.
- Local tests (27 Aug 2026): article excerpt through Opace v0.1 core and `avoid-ai-writing` snapshot — scripts in the session scratchpad (`article-test.mjs`); owner's live checker run of the full article ("2 checks passed · 4 not run") recorded in `v0.1-REVIEW.md` §3.
