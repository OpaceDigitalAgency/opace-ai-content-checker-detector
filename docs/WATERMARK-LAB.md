# Opace Watermark Lab — SynthID-Text, in your browser

A faithful TypeScript port of Google DeepMind's SynthID-Text detection mathematics, with a
visual lab for watching it work on real passages. Everything runs locally. Nothing is sent
anywhere.

**Status:** working and tested, shipped inside the Opace AI Content Integrity checker.
**Licence:** MIT (the ported mathematics is Apache-2.0 — see [Credits](#credits-and-provenance)).
**Version:** `@opace/watermark-lab` 0.1.0.

---

## The one thing to understand first

A SynthID-class watermark is **private-key evidence, not a universal AI stamp.**

The mathematics only tells you something if you hold the key the text was generated under.
Score watermarked text with the wrong key and the signal vanishes into noise. That is not a
flaw — it is the entire design, and it is the single most important thing this lab exists to
demonstrate.

The practical consequence, stated plainly because it is easy to sell people the opposite:

> **This lab cannot tell you whether text came from Claude, Gemini or ChatGPT.**
> Those providers hold their keys privately. Without Anthropic's key, no amount of
> mathematics here says anything about Claude output. A score near 0.5 means
> "indistinguishable from unwatermarked **under this key**" — it never proves a human
> wrote it.

What the lab *can* do is run the real detection mathematics, correctly, on keys we published
ourselves, so anyone can see exactly how the technique behaves — including how it fails.

---

## What SynthID-Text actually does

Watermarking happens at generation time, not afterwards. You cannot add a SynthID watermark
to text that already exists.

**Generating.** When a language model picks each next word, it normally samples from its
probability distribution. Tournament sampling runs a small knockout competition between
candidate tokens instead. Each candidate is assigned a pseudo-random 0 or 1 — its *g-value* —
derived from the preceding few tokens plus a secret key. Candidates with a g-value of 1 win
their round. Repeated over many tokens, the output carries slightly more 1s than chance would
give, while remaining fluent, because ties are broken on the model's own preferences.

**Detecting.** Recompute the g-values for the text you are given, using the key. Take the mean.
Unwatermarked text sits at **0.5** — a coin flip. Watermarked text sits measurably above it.
The distance from 0.5, scaled by how many positions you scored, is the evidence.

The signal is statistical, so it needs length. A few dozen tokens tell you very little; several
hundred tell you a lot.

### The chain, concretely

```
text → GPT-2 BPE tokens → 5-token sliding windows (4 tokens of context + current)
     → per-layer hash: SHA-256 IV, then an LCG over the window and each key
     → g-value: bit 0 of the final hash state, per key layer
     → mask out repeated contexts and everything after end-of-text
     → mean g over unmasked positions × layers
     → z-score against Bernoulli(0.5) → one-sided p-value
```

Two masks matter and are easy to get wrong. **Repeated contexts** are excluded because the same
window produces the same g-value, so counting it twice would inflate the score on repetitive
text. **Everything after the end-of-text token** is excluded because it is not generated
content.

---

## What we built

### `@opace/watermark-lab` — the engine

Six modules, ~1,100 lines of TypeScript, no runtime dependencies, no network calls.

| Module | What it does |
|---|---|
| `hashing.ts` | The LCG and SHA-256 hash chain, in exact 64-bit integer arithmetic via `BigInt`. Includes signed/unsigned conversion and arithmetic right shift, because JavaScript has no native int64 and getting this subtly wrong produces plausible but incorrect scores. |
| `gvalues.ts` | g-value computation per key layer, plus the context-repetition, end-of-text and combined masks. |
| `scoring.ts` | Mean and weighted-mean g, z-score, and a `erfc`-based p-value. |
| `keys.ts` | The three published Opace demo key sets and the reference parameters. |
| `detector.ts` | The public `score()` entry point. Pure and deterministic: same input, same output, always. |
| `tokenizer/gpt2.ts` | A byte-level GPT-2 BPE tokeniser, ported so arbitrary pasted text can be tokenised in the browser with no server and no model download. |

**Parameters.** `ngramLen` 5 (a 4-token context window) and `contextHistorySize` 1024, both
matching the reference. Watermarking depth is **6 layers**, where the reference example uses 30.
Fewer layers make the per-layer signal stronger and easier to see at the passage lengths a
person will actually paste. This is a deliberate teaching choice and it is recorded in every
fixture manifest.

**The three demo keys** — `opace-demo-alpha`, `opace-demo-beta`, `opace-demo-gamma` — are
published in the source. Publishing them is the point: anyone can regenerate the fixtures and
check our arithmetic. They are worthless as security and were never meant to be otherwise.

### Where it appears for a user

**1. The watermark scan, inside the checker.** Paste any text, and among the named checks is a
watermark scan that scores your text under all three demo keys and reports a row for each. On
ordinary text every row sits near 0.5 and the verdict is "no signal", with an explanation of
why that proves nothing about authorship. A verdict is withheld below **40 scored positions**;
a signal is only reported below a one-sided **p < 0.001**.

**2. The Watermark Readiness Lab** — a dedicated page where you can:

- load the detector on demand (a 1.7 MB chunk, fetched only when asked)
- pick from **24 built-in passages**, or paste your own
- choose which of the three keys to score under
- see the passage **coloured token by token by its g-value**, so the signal is visible rather
  than merely asserted
- read mean g, weighted mean g, scored positions and the p-value
- run the **wrong-key experiment** deliberately, and watch a genuinely watermarked passage
  collapse to noise

That last one is the lab's most useful feature. It makes the private-key point impossible to
misunderstand.

---

## What it can prove today

The 24 fixtures were generated with the **real reference implementation** — Google DeepMind's
Python code, GPT-2 124M, torch 2.4.0, transformers 4.43.3 — not by our own port. That matters:
it means our TypeScript is checked against an independent source of truth rather than against
itself.

12 watermarked passages (80–400 tokens, four per key), 8 unwatermarked, 4 deliberately degraded.

**30 tests, all passing.** Measured results, from `fixtures/reference-scores.json`:

| Experiment | Mean g | Reading |
|---|---|---|
| Watermarked, scored with **its own** key | **0.64 – 0.68** | clear signal |
| Watermarked, scored with the **wrong** key | **0.487 – 0.513** | signal gone |
| Unwatermarked, scored with **every** key | **0.508 – 0.511** | no false signal |

The wrong-key row is the headline. A passage that scores 0.681 under `alpha` scores **0.499**
under `beta` and **0.487** under `gamma`. Identical mathematics, different key, nothing to see.

**Robustness — and the large gap in it.** Take the strongest 400-token passage at 0.6807 and
damage it. The unmeasured attacks are listed in the same table on purpose, because a table
containing only survivable damage reads as a claim of general durability:

| Damage | Mean g | Positions left | Status |
|---|---|---|---|
| None | 0.6807 | 393 | measured |
| Truncated to 50% | 0.6521 | 195 | measured |
| Truncated to 25% | 0.6545 | 96 | measured |
| Tokens substituted | 0.6535 | 393 | measured |
| **Paraphrased** | **0.5088** | median 180 | **0 of 40 detected** |
| **Translation round-trip** | — | — | **NOT MEASURED** |
| **Targeted removal** | — | — | **NOT MEASURED** |

Against the two edits we did measure, the signal weakens but survives, and it degrades gradually
rather than falling off a cliff. Shortening costs you *confidence* (fewer positions) more than it
costs *signal strength*.

> **Read the top four rows only as the top four rows.** Truncation and token substitution leave
> most token choices in place, which is why the mark rides through them. Paraphrase does not: it
> replaces the token choices the g-values are computed from, and it is the most effective known
> attack on statistical text watermarks at the lengths people actually paste. **We have not
> measured it, so this lab says nothing about how the mark holds up under it.** Anyone deciding
> whether a SynthID-class watermark is fit for their purpose should treat paraphrase as an open
> question here, not a covered case.

That last point is not our own finding, so here is where it comes from and how far it can be
trusted. The literature is more balanced than "paraphrase kills it", and the balance matters.

**The SynthID-Text authors measured this themselves.** Supplementary section C.6 of the Nature
paper evaluates detectability after 20% and 50% random word deletion and after paraphrasing by
Gemini Ultra, over 3,000 ELI5 prompts on Gemma 2B-IT and 7B-IT. Their conclusion, quoted: editing
"weakens detectability, but the watermark can still be detected with high accuracy if the text is
sufficiently long. The paraphrasing attack is quite strong, especially if we use a strong
paraphrasing model like Gemini Ultra" ([Dathathri et al., Supplementary
Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-024-08025-4/MediaObjects/41586_2024_8025_MOESM1_ESM.pdf),
read 29 August 2026; results are plotted in Figure C3, not tabulated).

**Length is the variable that decides it.** Kirchenbauer et al. find watermarks "remain detectable
even after human and machine paraphrasing", because paraphrases leak n-grams of the original, with
detection after roughly 800 tokens on average at a 1e-5 false-positive rate following strong human
paraphrase ([*On the Reliability of Watermarks for Large Language Models*,
arXiv:2306.04634](https://arxiv.org/abs/2306.04634), read 29 August 2026). Pulling the other way,
Rastogi and Pruthi show that limited black-box access to a watermarked model can sharpen a
paraphrase attack enough to render the watermark ineffective
([arXiv:2411.05277](https://arxiv.org/abs/2411.05277), read 29 August 2026).

Put together, the defensible statement is the one in the box above: paraphrase degrades detection
sharply at short lengths and detection recovers as the passage grows. That is an uncomfortable
shape for this lab specifically, because it withholds a verdict below 40 scored positions and
most people paste a few hundred tokens, not eight hundred.

**One third-party figure was removed from this document on 29 August 2026, and the reason is
worth keeping.** A self-published replication reported a large drop in matching-key detection
after blind rephrasing. It was cited here as third-party and unverified, which felt careful
enough at the time. It was not. On checking the provenance: the figures are **upstream
`watermarks-remover`'s, not the replication's own** — the source we took them from had
misattributed them — with no denominator, no runtime, a single author, no replication, and a
repository tip one day old when it was read. They also collide unexplained with a peer-reviewed
DetectGPT result at the same 1% false-positive rate, and two numbers that close from unrelated
methods is a reason to suspect a measurement, not to quote it.

**Drop the number, keep the finding.** Paraphrase remains the attack most likely to defeat this
technique at the lengths people actually paste, and that rests on primary sources rather than on
the figure that was removed: the Nature authors' own supplementary material says "the
paraphrasing attack is quite strong"; ETH Zurich measured over 90% scrub success with
off-the-shelf paraphrasers; a July 2026 preprint reports 98.3% for SynthID. Kirchenbauer et al.
are the honest counterweight, arguing paraphrase dilutes rather than destroys given around 800
tokens — which is more than most people paste, and more than this lab will score before it
withholds a verdict at 40 positions.

**Paraphrase is now measured, and it defeats this technique completely.** 40 rewrites of 12
watermarked passages by two named local paraphrasers — `Qwen/Qwen3-4B-Instruct-2507` (28) and
`humarin/chatgpt_paraphraser_on_T5_base` (12). Mean g fell from a baseline median of **0.6722**
to **0.5088**, against a null of 0.500. **Zero of 40 were detected** under this lab's own rule
(at least 40 scored positions, one-sided p < 0.001); the smallest p across all forty was
1.15 × 10⁻³.

The two obvious objections are closed by measurement rather than assertion:

- **It is not shortening.** Median 180 scored positions retained, minimum 57. Applying the
  90–110% token gate that published work uses moves the median by 0.0007 and leaves detection at
  zero. A **length-preserving deterministic control** — a 92-entry synonym table plus sentence
  reversal — leaves detection at **36 of 36**. Editing as such is not what does it.
- **It is not meaning destruction.** Semantic similarity median **0.979** (minimum 0.949) against
  a measured unrelated-fixture floor of 0.747, and a blind grader given unlabelled pairs found
  **0 of 24** destroyed. The decisive detail: the arm that produced the *better* paraphrases
  destroyed *more* signal, so the confound points the wrong way for the objection.

Word 4-gram retention fell to a median **9%** in the paraphrase arms against 57–87% in the
deterministic ones. That is the mechanism in one number: the watermark lives in token sequences,
and paraphrase replaces them while preserving meaning.

**Scope, stated so the figure cannot travel further than it should.** Demo keys, depth 6 rather
than the reference 30, longest passage 400 tokens. It says nothing about any production
watermark. It does **not** contradict Kirchenbauer et al.'s recovery claim at around 800 tokens,
because nothing here reaches that length. The blind grader is a model, not a person, and 14 of 24
rewrites were graded "partial" — detail drift with the topic intact.

We reached this figure by a poor route and are recording that too: it arrived in an AI chat
transcript, misattributed to a different project. That project turned out to be relaying it, and
correctly crediting the upstream source the transcript never named. Had we published it as the
transcript framed it, we would have credited the wrong people for a number neither of them
measured.

**One trap to flag for anyone else citing this.** Krishna et al. report that their DIPPER
paraphraser "drops detection accuracy of DetectGPT from 70.3% to 4.6% (at a constant false
positive rate of 1%)" ([arXiv:2303.13408](https://arxiv.org/abs/2303.13408)). Those numbers are
almost identical to the SynthID replication's, and they measure a completely different thing:
DetectGPT is a post-hoc zero-shot classifier, not a watermark. Two separate results that happen
to land on the same figures is an easy conflation to make and a hard one to notice. Treat any
citation that blurs them as unreliable.

Measuring paraphrase against our own fixtures is on the list below. Until we have, the row stays
marked as unmeasured, and someone else's number in someone else's setting is not a substitute.

**Faithfulness to the reference**, asserted test by test:
- g-values match the reference exactly
- the context-repetition mask matches, including on repeated contexts
- the end-of-text mask matches
- hash IV derivation is deterministic and key-dependent
- full scores agree with the reference implementation's own outputs

**Tokeniser parity** across 12 adversarial cases — accented Latin, emoji, CJK, contractions,
`CamelCase`, `snake_case`, a literal `<|endoftext|>` string, mixed line endings — plus a
decode → re-encode → decode round trip proving pasted text survives the trip intact.

**Practical properties:** arbitrary English prose scores ~0.5 under every key (no false
positives on ordinary writing); scoring is deterministic; the bundle is browser-safe with no
Node built-ins and no network primitives; and **10,000 tokens score in under 250 ms**.

---

## The conflict with the cleaner, and why it matters here

Two features of this product work against each other, and the lab is one of them.

C2PA carries **text** credentials in Unicode variation selectors — U+FE00–U+FE0F for byte values
0–15, U+E0100–U+E01EF for 16–255, with a U+FEFF sentinel (C2PA 2.4 §A.8.2–§A.8.4). They were
chosen precisely because they do not render. The integrity checker's invisible-character rules
flag all 257 of those code points, and until 29 August 2026 its safe fix **removed** the
U+FE00–U+FE0F range.

That silently destroyed any credential in the draft. Worse than partial damage: byte 0x00 is the
last byte of the `C2PATXT\0` magic, so the wrapper lost a magic byte and the reader then found
nothing at all — not even a corrupt credential it could report. Visible text unchanged.
Unrecoverable.

Fixed at source: `packages/core` now detects credentials and holds their characters back from the
fix while still flagging and counting them, with removal behind an explicit default-off option.
The characters are still reported — **detection did not change, only what the fix touches.**

Two things worth saying plainly, because they generalise:

- **Neither feature was wrong.** One exists to read provenance; the other removes the characters
  provenance is written in. Nobody had considered them meeting. The product's rule — refuse
  rather than round over when it cannot be certain — is exactly the right one to apply, and it is
  what the fix does.
- **The shipped WordPress, Chrome and Astro artefacts each pin an older engine** that predates the
  variation-selector rules, so they cannot destroy those characters today — but they still strip a
  leading U+FEFF, which kills a credential placed at the start of a draft. The guard reaches them
  only when each artefact is rebuilt against the fixed core, which changes its recorded hash. That
  rebuild is a **publication blocker** for those three surfaces.

Full analysis: `.agent/docs/ai-content-integrity/C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md`.

---

## Honest limits

- **Demo keys only.** Nothing here detects, verifies, clears or removes any production
  watermark from Google, Anthropic, OpenAI or anyone else.
- **GPT-2 tokenisation.** The fixtures were generated with GPT-2. Text from a model with a
  different tokeniser would need that model's tokeniser to score meaningfully.
- **Short passages are uninformative.** Below 40 scored positions no verdict is offered at all.
- **A score near 0.5 is not proof of human authorship.** It means "no signal under this key",
  which is also what unwatermarked AI text looks like.
- **This is detection only.** No watermarking of your own text, no removal, no stripping.
- **The z-score assumes independent Bernoulli g-values**, which is an approximation. It is good
  enough to rank and to threshold, and it is not a calibrated probability of provenance.
- **Paraphrase defeats it completely: 0 of 40 rewrites detected.** Measured, not suspected. A
  reader who paraphrases a watermarked passage removes the mark while keeping the meaning, and
  this lab will report no signal. Translation round-trips and targeted removal remain unmeasured
  and are marked as such in the robustness table rather than left out of it.

---

## Credits and provenance

This work exists because of other people's work, and the debts are specific.

| Source | Licence | What we took |
|---|---|---|
| **[google-deepmind/synthid-text](https://github.com/google-deepmind/synthid-text)** — commit `addb4a158143c7c6851a1308f78b89fceed59683` | Apache-2.0 | The detection mathematics itself: LCG hashing, g-value derivation, the masks, and the mean and weighted-mean scores. Ported from Python and torch to TypeScript. The reference generation path also produced our fixtures. **This is the foundation; there is no Opace-invented cryptography here.** |
| **[OpenAI GPT-2](https://github.com/openai/gpt-2)** | MIT | Byte-level BPE tokeniser algorithm, adapted from `src/encoder.py`, plus the vocabulary and merges assets. SHA-256: vocab `196139…36783`, merges `1ce166…6adc5`. |
| **[guillaumemeyer/watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover)** | MIT | The project that started this line of work, and the source of the carrier and confusable table data used by the sibling invisible-character checks. |

The SynthID-Text paper is *Scalable watermarking for identifying large language model outputs*
(Dathathri et al., Nature, 2024).

Opace's own contribution is the TypeScript port, the browser tokeniser, the demo key sets, the
fixture corpus, the test suite that proves parity with the reference, and the visual lab.

---

## What's next

**Waiting on the providers — and as of 29 August 2026, still waiting.** The mathematics is ready.
What is missing is a key, and only a provider can supply that.

Two things moved in 2026, and neither one changes what this lab can say about pasted text:

- **Anthropic has committed to watermarking future Claude models. No shipping model is covered
  today.** Anthropic has committed that Claude models launched on or after 2 August 2026 will
  support text marking at launch, and says it is working to add marking to models released
  before that date. **As of 29 August 2026 no Claude model has launched after that cutoff** —
  Opus 5 launched 24 July, Sonnet 5 on 30 June — Anthropic publishes no per-model status, and
  there is no public detector. Whether any given piece of Claude output carries a mark today is
  **not publicly established**.

  The company's own framing is future tense. The news post opens: *"Future Claude models will
  generate text that contains a watermark"* ([Anthropic, *Claude text
  watermark*](https://www.anthropic.com/news/claude-text-watermark)). The launch scope is in the
  support article: *"Claude models launched on or after August 2, 2026 support marking at
  launch."* Both read 29 August 2026. Cite them separately — the news post for the framing and
  the detection API, the support article for the launch scope.

  A detection API is also future tense: *"We will soon be offering a watermark detection API."*
  Until something ships, nothing here can be pointed at Claude output. **Note the distinction
  when it does.** A *detector endpoint* would make this product a client of Anthropic's service
  and would not use this lab's mathematics at all. Only a **published key** activates what is
  built here.

  **Why 2 August, and why it can never mean what it looks like it means.** Article 50 of the EU
  AI Act applies from **2 August 2026**, and the Act turns on whether a system was placed on the
  market before or on/after that day. Anthropic's boundary is that legal cutoff, not a chosen
  deployment date — which is the mechanism behind the caveat above rather than a hedge. A date
  inherited from a regulation marks when an *obligation* attached to newly placed systems, not a
  day on which existing output started carrying a mark.

  Two dates, not a contradiction: **14 August 2026** is when the announcement was published,
  **2 August 2026** is the scope of the commitment. Cite the news post for the framing and the
  support article for the launch scope.

  Do not write "Anthropic watermarks Claude's text", or any present-tense coverage claim. It is
  not a claim Anthropic makes, and it currently covers zero shipping models.

- **OpenAI shipped a public provenance verification API**, `POST /v1/content_provenance_checks`,
  checking C2PA Content Credentials and SynthID ([OpenAI, *Content
  provenance*](https://developers.openai.com/api/docs/guides/content-provenance), read 29 August
  2026). It accepts image and audio files only — PNG, JPEG, WebP, MP3, Opus, AAC, FLAC, WAV,
  PCM. **It accepts no text input of any kind.** OpenAI's help centre lists text support as an
  intention, not a shipped feature. It is a genuine addition for the checker's file-upload
  provenance path and it is irrelevant to this lab.

That second bullet is the trap worth naming, because it is the easy mistake to make in this
area: metadata travels with a **file**, a text watermark lives in the **words**. A provenance API
for images and audio tells you nothing about a paragraph someone pasted into a box.

So the honest status is unchanged: *ready, unproven against production output, and saying so.*

**Planned:**

- **Watermark your own text.** The generation path (tournament sampling) is not ported; only
  detection is. Adding it would let someone watermark a passage with their own key and then
  detect it, closing the loop inside the browser.
- **More tokenisers.** GPT-2's tokeniser is the only one embedded. Llama and Gemma tokenisers
  would widen what can be scored meaningfully.
- **Adversarial robustness.** Paraphrase attacks, translation round-trips and targeted removal
  are unmeasured, and they are the attacks that matter in practice. **Paraphrase is the one to
  measure first**, against the same 400-token fixture the table above uses, so the empty cells
  fill with our own numbers rather than someone else's.
- **C2PA cross-reference.** The checker already reads C2PA Content Credentials for images and
  PDFs. Provenance metadata and statistical watermarking answer different questions and are
  stronger together. Two notes on scope, both checked on 29 August 2026. C2PA has run a governed
  [conformance programme and trust list](https://c2pa.org/conformance/) since mid-2025, so a
  verifier can tell a credential that merely parses from one signed by a recognised issuer, which
  is a real upgrade available to the checker's file path.
- **C2PA in plain text — a real mechanism, and still not a watermark.** Correcting an assumption
  this document previously carried: C2PA 2.3 (December 2025) added §A.8, *Embedding Manifests into
  Unstructured Text*, which encodes a manifest as non-rendering Unicode variation selectors so
  Content Credentials can ride along with copy-pasted text
  ([C2PA Specification 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html),
  read 29 August 2026). Pasted text can therefore carry a credential. Three reasons it does not
  overlap with this lab, and the first is the interesting one:
  - **It is invisible-character metadata, and this product's other half deletes it on sight.** The
    sibling checks exist to find and strip invisible Unicode carriers. Any such cleaning, any
    normalisation, any retyping, and the credential is gone. A statistical watermark lives in the
    word choices and has no such carrier to remove.
  - **It proves a different thing.** A manifest says who signed a claim about this text. It says
    nothing once the text is edited, and it cannot be recovered from a paraphrase. The two
    techniques fail in opposite circumstances, which is exactly why they are worth pairing.
  - **The reference implementation has not caught up.** `c2pa-rs` supports images, audio, video
    and read-only PDF. **No text format at all**, so there is nothing to integrate today even if
    we wanted to.
- **A standalone home.** The lab is currently a package inside a larger repository, which makes
  it hard to find for anyone searching for SynthID tooling specifically.

---

## Reproducing this yourself

```bash
git clone https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker
cd opace-ai-content-verification-integrity-checker/packages/watermark-lab
npm install && npm test
```

That builds the bundle and runs all 30 tests, including the parity checks against the reference
implementation's own scores. Everything needed is committed: the fixtures, the reference
scores, the demo keys and the tokeniser assets. No downloads, no API keys, no network access.

The claim boundary in this document is binding on every surface that ships this code. If you
find a place where it is overstated, that is a bug — please open an issue.
