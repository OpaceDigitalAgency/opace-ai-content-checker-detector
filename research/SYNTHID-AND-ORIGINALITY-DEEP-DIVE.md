# SynthID-Text and Originality.ai — deep dive for the Claude Watermark Readiness Lab

> **Public research snapshot.** This first-party study preserves technical and competitor evidence available on 27 August 2026. Provider tools and vendor claims can change. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and primary sources before quoting a current claim.

Date: 27 August 2026
Researcher: Claude (deep-dive agent for the Opace AI Content Integrity project)
Purpose: everything needed for Opace to (a) build a genuinely better free SynthID-Text educational and experimental tool than Originality.ai's, and (b) replicate their study-publishing formula. Governed by `BRIEF.md` §5 claim boundaries (public SynthID experiments are never Anthropic production watermark verification) and §21 tiers. Companion to `PAID-TOOLS.md` and `v0.1-REVIEW.md` §7 Phase 2 item 10.

Evidence classes are kept separate throughout: **[provider fact]** = DeepMind/Google/Anthropic published material or code; **[vendor claim]** = Originality.ai marketing/blog assertions; **[academic]** = peer-reviewed or arXiv findings; **[verified locally]** = read first-hand from our Apache-2.0 snapshot at `source-snapshots/synthid-text-reference` (commit `addb4a15…`, 13 June 2025).

---

## 1. How SynthID-Text actually works — at implementable depth

Primary sources: the Nature paper (Dathathri et al., *Scalable watermarking for identifying large language model outputs*, Nature 634, 818–823, Oct 2024, doi:10.1038/s41586-024-08025-4) and the reference implementation we already hold locally. Everything below is **[provider fact]** unless marked, and the code citations are **[verified locally]**.

### 1.1 Generation: tournament sampling

SynthID-Text is a *generation-time* watermark: it modifies the sampling step, never the text after the fact. Conceptually (paper form):

1. At each generation step, sample **N = 2^m candidate tokens** from the model's (top-k, temperature-scaled) distribution.
2. Run an **m-layer knockout tournament** (m = 30 in the paper's main configuration; the reference repo uses **depth = number of keys**, e.g. the HF example uses 9 keys). In each layer ℓ, candidates compete in pairs; the one with the higher **g-value** g_ℓ(token, r_t) advances. Ties are broken randomly.
3. The tournament winner is emitted.

The shipped implementation is the *vectorised, equivalent* form: instead of literally sampling 2^m candidates, it reweights the whole (top-k) distribution once per layer. From `logits_processing.py` (`update_scores`, non-distortionary N=2 case):

```
probs = softmax(scores)                       # over top-k candidates
for each depth ℓ:
    g_mass = Σ_v g_ℓ(v)·p(v)                  # expected g at this layer
    p(v)  ←  p(v) · (1 + g_ℓ(v) − g_mass)     # boost g=1 tokens, damp g=0
```

The distortionary variant (`update_scores_distortionary`, num_leaves N>2) uses
`coeff_in_g = (1−(1−g_mass)^N)/g_mass` for g=1 tokens and `coeff_not_in_g = (1−g_mass)^(N−1)` for g=0 tokens — more competitors per match, stronger watermark, some quality cost.

### 1.2 Keys, context and g-values

- **Random seed**: r_t = hash(last H tokens ‖ watermarking keys). The paper uses a sliding context window **H = 4**, which in the repo is `ngram_len = 5` (context of ngram_len−1 tokens plus the candidate token). Comment in `synthid_mixin.py`: *"ngram_len: 5 — this corresponds to H=4 context window size in the paper."*
- **Keys**: one integer key per tournament layer (`keys: Sequence[int]`; the repo default has ~13+ keys, the HF docs example 9). The keys are hashed with SHA-256 into a 64-bit IV, then each (context, candidate, layer-key) triple is hashed with a **linear congruential generator** (`hashing_function.accumulate_hash`, multiplier 6364136223846793005 — newlib/musl LCG parameters). The README warns this **provides no cryptographic security guarantees** — important honesty point for our lab copy.
- **g-values**: `get_gvals` applies the hash 12 more times, then takes `(hash >> 30) % 2` — i.e. **Bernoulli(0.5) binary g-values** per (context, token, layer). Detection recomputes exactly the same g-values from the text alone, given the keys.

### 1.3 Non-distortion and repeated-context masking

- **Single-token non-distortion**: averaged over the seed, the output distribution equals the unwatermarked LM distribution — quality is preserved per token. The cost is reduced *inter-response diversity* (same context ⇒ same nudges).
- **Repeated-context masking** (Algorithm 3): the processor keeps a rolling `context_history` of hashed (n−1)-gram contexts; if the current context was already used, watermarking is **skipped** for that step. This restores non-distortion at the sequence level and prevents the watermark biasing repetitive text. The detector must reproduce this mask (`compute_context_repetition_mask`) and also mask everything after the first EOS (`compute_eos_token_mask`).

### 1.4 Detection maths

The detector needs: the **tokeniser**, the **keys/config**, and the text. No model forward pass is required — this is why detection is cheap.

- **Mean score** (`detector_mean.py`):
  `Score(x) = (1/(m·T)) Σ_t Σ_ℓ g_ℓ(x_t, r_t)` over unmasked positions.
  Unwatermarked text ⇒ E[score] = 0.5. Watermarked text scores higher. The theoretical single-layer expectation under a uniform LM (`g_value_expectations.py`, Corollary 27): **0.5 + 0.25·(1−1/vocab)** for N=2, and **7/8 − 3/(8·vocab)** for N=3.
- **Weighted mean**: earlier tournament layers carry more watermark signal, so layer weights default to a linear 10→1 ramp (normalised to sum to m).
- **Frequentist**: hypothesis test on the g-value sum ⇒ p-value; the README recommends computing thresholds empirically **per token length** at the desired false-positive rate.
- **Bayesian detector** (`detector_bayesian.py`, requires training per key on watermarked/unwatermarked samples): outputs P(watermarked|g-values) in [0,1]; the paper shows it beats the frequentist score, especially on short text.

### 1.5 Performance, robustness, limitations

- **Detectability grows with length and entropy.** ~95% TPR at 1% FPR around 200 tokens (configuration-dependent); low-temperature, low-entropy output (and factual/code output) watermarks weakly.
- **Production evidence**: live experiment on ~20 million Gemini responses — thumbs-up/down rates changed by 0.01%/0.02% (statistically insignificant); a 3,000-question ELI5 human study found no rater preference difference. Latency cost 0.57% on Gemma 7B at m=30.
- **Robustness**: survives copying and cropping (score is per-token and needs no document structure); weakens under **paraphrase**, degrades badly under **translation** and thorough rewriting; vulnerable to **watermark stealing/spoofing** attacks (paper acknowledges; see also Jovanović et al., *Black-Box Detection of Language Model Watermarks*, arXiv:2405.20777 **[academic]**).
- **Structural limits**: only detects text from services that watermark and only with the right key; open-weight models can't be forced to watermark; a *negative* result never proves human authorship.

### 1.6 What's needed to run generation + detection locally **[verified locally]**

- Repo: `google-deepmind/synthid-text` (Apache-2.0, snapshot in-tree; also on PyPI as `synthid-text`). Reference only, not production; HF Transformers has the production-ready port (`SynthIDTextWatermarkLogitsProcessor` with `ngram_len`, `keys`, `sampling_table_size`, `sampling_table_seed`, `context_history_size`, `skip_first_ngram_calls`, `debug_mode`; `SynthIDTextWatermarkingConfig` passed to `model.generate()`).
- Compute: GPT-2 runs on CPU (high-RAM helps); Gemma 2B IT wants a 16 GB GPU (T4); Gemma 7B a 32 GB GPU (A100). **Detection is trivial** (hashing + means) — only *generation* needs the model. This matters for our lab design: pre-generate corpora once, detect live anywhere.
- Ecosystem context: Google's **SynthID Detector portal** (announced 20 May 2025, waitlist for journalists/researchers; text/video "rolling out") verifies Google-keyed content only; >10bn items watermarked by May 2025, >100bn reported by May 2026 with cross-vendor expansion coverage (image/audio/video side). MarkLLM (`source-snapshots/markllm`) is the open toolkit covering the wider KGW/EXP watermark families plus attack/robustness pipelines — our source for paraphrase/edit attack demos beyond SynthID itself.

### 1.7 The Anthropic context (claim boundary)

**[provider fact]** Anthropic's Help Centre ("How Claude marks AI-generated content"): Claude models launched on or after **2 August 2026** weave "an imperceptible watermark directly into the text itself" (worldwide, all surfaces — API, Claude, Claude Code, Cowork, Tag), driven by EU AI Act Article 50; files get C2PA-signed metadata; the watermark "will travel with the text when it's copied and pasted… and **may** persist through some editing"; third-party detection is "forthcoming technical documentation" — **no public detector or spec exists yet**; and "lack of a detected mark doesn't mean the content wasn't AI-generated".

Binding consequence for everything below (per `BRIEF.md` §5): the Opace lab runs **public SynthID-Text experiments with keys we choose**. It must never present those as detecting, verifying or removing Anthropic's production watermark — the honest framing is *"this is the published science Anthropic-class watermarks build on; official Claude verification will be integrated if and when Anthropic ships a supported interface"*. That framing is itself a differentiator: nobody else is saying it precisely.

---

## 2. What Originality.ai's SynthID tool does — and does not do

Page: `originality.ai/blog/synthid-watermarking-tool` ("free interactive demonstration"). All **[vendor claim]** unless noted.

### 2.1 What it is

- An **educational simulation** embedded in a blog article: animated GIF overview, then staged interactions — (1) candidate-token display with illustrative probabilities (example: "The policy is important because…" with alternatives like "matters"/"significant"), (2) tournament scoring with "context-specific key values", (3) an evidence-accumulation chart across a passage, (4) a final "evidence score" verdict.
- The article around it is decent education: a "10-second" conceptual intro; a seven-category watermarking taxonomy (Unicode, linguistic, statistical, tournament, distortion-free, data-driven, metadata); a SynthID-Text section citing the Nature architecture; a comparison table; 9 references. Key teaching lines: "The watermark is the statistical relationship that accumulates across many token choices" and "Detection aggregates evidence across many eligible token choices."
- It is honest about its own nature: *"The tool is an educational simplification with illustrative values and thresholds. It does not generate text with Gemini or Claude and does not run Google's or Anthropic's detector."* It even cites Anthropic's Help Centre EU marking statement — they are already chasing the Claude-watermark search intent.

### 2.2 What it does not do (the gap list)

1. **No real model, no real keys, no real maths.** Illustrative values only; it never computes an actual g-value, never runs the published algorithm, and cannot process user text.
2. **No "try your own text"** and no reproducibility — nothing to export, no receipt, no code link a user can run.
3. **No wrong-key demonstration** — the single most instructive experiment (right key ⇒ signal; wrong key ⇒ 0.5 noise) is absent.
4. **No attack/robustness demos** — no paraphrase, translation, cropping or length-sensitivity experiments, despite the article claiming these behaviours.
5. **No detector-side maths** — mean score, thresholds, FPR-vs-length are asserted, not shown.
6. **Strategic framing, not neutral education**: the surrounding guide (`/blog/google-ai-watermark-synthid`, 26 July 2026) concludes watermarking should be "combined with a robust, industry-leading AI detector" — the tool exists to funnel to the paid detector. Their separate technical guide avoids the tournament maths entirely.

**Bottom line:** it is a well-written animated explainer wearing the word "tool". Nothing in it would survive contact with the reference implementation — which we hold, under a licence that lets us ship it.

---

## 3. Their study/SEO playbook, decoded

Evidence: the Gemini 3.7 Flash study (`/blog/is-gemini-3-7-flash-detectable`), Claude Fable 5 study, studies round-up, AI Allowance pages, congressional-record study.

### 3.1 The formula

1. **Trigger**: a frontier-model release. **Cadence is days**: Gemini 3.7 Flash released 13 Aug 2026 → study 18 Aug 2026 (5 days); Claude Fable 5 released 9 June 2026 → study 18 June 2026 (9 days).
2. **Fixed template**, reused verbatim per model: *Quick answer* ("Yes, Originality.ai has 99%+ accuracy with AI Allowance (15% settings) for detecting X") → intro name-dropping other recent models → dataset section (a standing corpus: "5,000 high-quality human-written samples" across health/news/finance/tech/arts; ~1,000 AI completions generated from human-written prompts) → results table/chart → "not trained on X data, still detects it" generalisation claim → related-study links → author bio (founder, Jonathan Gillham) → newsletter.
3. **Interlinking machine**: every study links every other study (`is-grok-4-6-detectable`, `is-gpt-5-6-detectable`, `is-claude-fable-5-detectable`, `is-deepseek-detectable`, …), plus evergreen hubs: `/blog/ai-accuracy`, `/blog/ai-detection-studies-round-up` (16 studies, 6 framed as peer-reviewed third-party), `/blog/introducing-ai-allowance`, `/blog/score-meaning`, `/blog/ai-content-detector-false-positives`.
4. **Authority tiers**: (a) rapid first-party model studies; (b) a curated round-up of third-party academic studies (venue-prestige framing, "97%–100% accuracy" claims foregrounded, FPR trade-offs downplayed); (c) headline-bait data journalism — the **Congressional Record study** (21 Aug 2026: 115,089 texts, Extensions of Remarks 1.3%→64.9% "Likely AI" 2020→2026, Politico coverage) — pure PR asset targeting journalists.
5. **Weaknesses we can honestly exploit**: no false-positive reporting in the model studies; self-scored benchmarks with no reproducible corpus or code; the round-up is circular (their blog cites studies that cite their blog); accuracy numbers quietly depend on the AI Allowance setting chosen.

### 3.2 The Opace replication (better, honestly)

Same trigger and cadence, different spine: *new model release → run it through the versioned Opace battery (Tier A carriers + rules/stylometrics + local model + BYOK Copyleaks/Originality where authorised) within a week → publish with the corpus version, the threshold, the measured FPR **and the reproduction command***. Every study we publish that includes FPR and reproducibility is a study they structurally cannot match without exposing their own 9.24% FPR (Pangram bench, `PAID-TOOLS.md` §2). Add the two study types they don't do: *wrong-key/attack watermark experiments* (nobody else publishes these for search) and *false-positive-first studies* on verified human text.

---

## 4. Gap analysis and specification sketch — the Opace SynthID lab that beats theirs

### 4.1 Why we win

| Dimension | Originality tool | Opace lab (spec) |
|---|---|---|
| Mechanism shown | Animated illustration, fake values | **Real g-values, real tournament reweighting, real mean-score detection** (exact published algorithm) |
| User's own text | No | Yes — browser layer recomputes g-values/scores on any pasted token stream (simulated LM, real maths) |
| Real generation + detection | No | Optional **local-engine runner**: Apache-2.0 reference code + GPT-2 (CPU-friendly) via the existing Python loopback engine |
| Wrong-key demo | No | Yes — flagship interaction |
| Attack demos | No | Paraphrase / translate / crop / shorten, with measured score decay (MarkLLM attack pipelines where useful) |
| Reproducibility | None | Exportable receipt: keys, config, scores, masks, versions, `pip`-runnable command |
| Claim honesty | Good disclaimer, detector-funnel framing | Explicit Anthropic boundary + "absence of mark ≠ human" everywhere |

### 4.2 Component A — browser visualisation layer (free, no install)

Runs the **real maths in TypeScript** (the algorithm is ~200 lines: LCG hash, g-value extraction, per-layer reweighting, mean/weighted-mean scores — all verified against the reference implementation as golden fixtures; no model needed):

1. **Watch a watermark being written**: step through token-by-token generation over a *pre-generated, bundled* candidate stream (from the local runner, so probabilities are genuine GPT-2 outputs, honestly labelled). Show top-k candidates, per-layer g-values, the reweighting arithmetic, and the winner — with the actual numbers, not illustrative ones.
2. **Score accumulation chart**: running mean g-value vs the 0.5 null line and the theoretical expectation (0.5 + 0.25·(1−1/vocab)); confidence bands vs token count.
3. **Wrong-key toggle** (the killer demo): re-score the same text with a different key ⇒ instant collapse to noise. Teaches "watermarks are private-key evidence, not a universal AI stamp" better than any paragraph.
4. **Attack sliders**: crop the passage, delete/replace tokens, swap in a bundled paraphrase — watch the score decay curve live.
5. **Length/entropy explorer**: score vs length; low-entropy (repetitive/factual) vs high-entropy passages, demonstrating repeated-context masking visibly (masked steps greyed out).
6. **Paste-your-own-text mode**: tokenise in-browser (GPT-2 tokeniser is small), compute g-values under a *published Opace demo key* — result is honest noise unless the text came from our runner, which is itself the lesson, and the copy says so.

### 4.3 Component B — real local runner (Tier: local engine, opt-in)

Wraps the snapshot (`v0.1-REVIEW.md` §7 Phase 2 item 10) in the existing Python loopback job engine: `generate(prompt, keys, config) → watermarked + unwatermarked pair`, `detect(text, keys) → {mean, weighted_mean, masks, per-token g-values}` with GPT-2 default (CPU) and Gemma optional (GPU preflight). Every run emits a **receipt**: config hash, keys (demo keys only), scores, masks, package versions, snapshot commit — exportable and reproducible via a documented command. Wrong-key, attack and length batteries ship as named experiments with golden expected ranges, satisfying the review's "wrong-key/attack/length behaviour proven" gate.

### 4.4 Claim-boundary copy (per BRIEF §5, verbatim-ready)

> "This lab runs Google DeepMind's published, Apache-2.0 SynthID-Text reference method with keys we chose and published. It demonstrates how generation-time text watermarks work. It does **not** run Google's or Anthropic's production detectors or keys, cannot tell you whether text came from Gemini or Claude, and a clean result never proves text is human-written. Anthropic states that Claude models launched on or after 2 August 2026 embed text markings; when Anthropic publishes a supported verification interface, Opace will integrate it and label it as official."

Result states follow the brief: real runs report `pass`/`attention`/scores with method versions; anything about production watermarks is `unsupported`; unrun experiments are `not_run` — never collapsed.

### 4.5 Content pairing

Ship with three research pages that out-teach their article on its own turf: "How SynthID-Text actually works, with the maths" (§1 of this document is the draft), "Why a watermark detector needs the key" (wrong-key demo embed), and "What Anthropic has and hasn't said about Claude watermarking" — the highest-intent, lowest-competition query in this space right now, with Aug 2026 press (TechCrunch, Axios, Fortune, Forbes) all citing only the Help Centre page.

---

## 5. Strategic notes

1. **WordPress plugin gap confirmed [provider fact — WordPress.org]**: "This plugin has been closed as of 2 July 2026 and is not available for download. This closure is permanent. Reason: Author Request." (`wordpress.org/plugins/originality-ai/`, last version 1.2.0). The market leader has *voluntarily left WordPress*; our standalone plugin launches into an empty slot with residual search demand ("originality ai wordpress plugin" now resolves to a dead listing plus their off-directory page).
2. **AI Allowance is now their whole detection story [vendor claim]**: five thresholds (0/5/15/25/40%), "15% is best for most use cases", score = probability AI use exceeds the allowance (not proportion of AI text), "99.4% accuracy at 15% allowance across a 456,872-sample benchmark". All their new studies are run at 15%. Their public docs currently surface **API v3**; no v4 timing was verifiable on `docs.originality.ai` (state as unverified). For our BYOK adapter: pin the allowance setting in every receipt, because their score semantics change with it.
3. **They are already circling Claude watermarking**: the SynthID tool page quotes Anthropic's EU marking statement, and a Fable 5 detectability study shipped 9 days after model release. Expect an Originality "Claude watermark checker" content play; our defensible counter is the *real* runner + boundary honesty, which their simulation-plus-detector-funnel format cannot copy without undermining the paid product.
4. **Their calibration history is our benchmark ammunition**: measured 9.24% FPR (Pangram bench) vs their per-study silence on false positives; the Integrity Index's false-positive-first reporting attacks exactly this.
5. **SynthID ecosystem timing**: Google's Detector portal remains gated (waitlist); HF Transformers is the production implementation; nobody offers a public, reproducible, educational SynthID experiment surface. The niche is genuinely empty — Originality's simulation is the only competitor and it computes nothing.

---

## 6. Sources

**Originality.ai (all [vendor claim]):**
- https://originality.ai/blog/synthid-watermarking-tool — interactive SynthID demo + taxonomy article
- https://originality.ai/blog/is-gemini-3-7-flash-detectable — Gemini 3.7 Flash study (18 Aug 2026)
- https://originality.ai/blog/is-claude-fable-5-detectable — Claude Fable 5 study (18 June 2026)
- https://originality.ai/blog/introducing-ai-allowance — AI Allowance thresholds/semantics
- https://originality.ai/blog/ai-detection-studies-round-up — 16-study round-up
- https://originality.ai/blog/likely-ai-language-congressional-record — congressional study (21 Aug 2026)
- https://originality.ai/blog/google-ai-watermark-synthid — their SynthID guide (26 July 2026)
- https://docs.originality.ai/api-v2-0-new — API docs (v3 visible; v4 unverified)
- https://en-gb.wordpress.org/plugins/originality-ai/ — plugin closure notice (2 July 2026)

**Google DeepMind / Google ([provider fact]):**
- https://www.nature.com/articles/s41586-024-08025-4 — SynthID-Text Nature paper (Dathathri et al., 2024)
- `source-snapshots/synthid-text-reference` — Apache-2.0 reference implementation, commit `addb4a158143c7c6851a1308f78b89fceed59683` (read first-hand: `logits_processing.py`, `hashing_function.py`, `detector_mean.py`, `detector_bayesian.py`, `g_value_expectations.py`, `synthid_mixin.py`, `README.md`)
- https://huggingface.co/docs/transformers/en/internal/generation_utils — `SynthIDTextWatermarkLogitsProcessor` / `SynthIDTextWatermarkingConfig`
- https://blog.google/innovation-and-ai/products/google-synthid-ai-content-detector/ — SynthID Detector portal (20 May 2025)
- https://deepmind.google/models/synthid/ — SynthID overview

**Anthropic ([provider fact]):**
- https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content — Claude marking policy (models launched ≥ 2 Aug 2026)
- Press context: TechCrunch, Axios, Fortune, Forbes, 11–13 Aug 2026 (coverage of the same Help Centre policy)

**Academic ([academic]):**
- arXiv:2405.20777 — Black-Box Detection of Language Model Watermarks (stealing/spoofing risk)
- `source-snapshots/markllm` — MarkLLM open-source watermarking/attack toolkit (local snapshot)

Not verified in this pass: Originality API v4 timing; active-install count of the retired plugin; the exact m used in Gemini production. Each is marked unverified above where referenced.
