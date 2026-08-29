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
| **Paraphrased** | — | — | **NOT MEASURED** |
| **Translation round-trip** | — | — | **NOT MEASURED** |
| **Targeted removal** | — | — | **NOT MEASURED** |

Against the two edits we did measure, the signal weakens but survives, and it degrades gradually
rather than falling off a cliff. Shortening costs you *confidence* (fewer positions) more than it
costs *signal strength*.

> **Read the top four rows only as the top four rows.** Truncation and token substitution leave
> most token choices in place, which is why the mark rides through them. Paraphrase does not: it
> replaces the token choices the g-values are computed from, and it is the attack most likely to
> defeat this technique in practice. **We have not measured it, so this lab says nothing about
> how the mark holds up under it.** Anyone deciding whether a SynthID-class watermark is fit for
> their purpose should treat paraphrase as an open question here, not a covered case.

That last point is not our own finding, so here is where it comes from and how far it can be
trusted. The published literature on LLM text watermarking treats paraphrase as the strong
attack, and the finding is not marginal: Rastogi and Pruthi conclude that with limited access to
a black-box watermarked model, paraphrasing attacks can be made effective enough to render the
watermark ineffective ([*Revisiting the Robustness of Watermarking to Paraphrasing Attacks*,
arXiv:2411.05277](https://arxiv.org/abs/2411.05277), read 29 August 2026). That work is about
watermarking in general rather than SynthID-Text in particular, and we are citing its direction,
not importing a number from it. We have not read a SynthID-specific paraphrase measurement we
could check ourselves — the Nature paper is paywalled to us and we will not paraphrase what we
have not read.

While reviewing a competing tool we were shown a much more dramatic figure: a drop from roughly
70% to 4–5% matched-key detection under paraphrase. **We are not publishing it as a finding,
because we could not trace it.** It reached us in an AI chat transcript that attributed it to another
project's self-reported results; that project's repository publishes no such benchmark, and we
found no paper carrying those numbers. It may well be directionally right. It is not checkable,
so it does not belong in a document whose whole value is that its figures are checkable.

Measuring paraphrase against our own fixtures is on the list below. Until we have, the row stays
marked as unmeasured, and we would rather show an empty cell than borrow someone else's.

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
- **Nothing here is adversarially hardened.** We have measured truncation and substitution.
  We have not measured paraphrase attacks, translation round-trips or targeted removal, and
  they are marked as unmeasured rows in the robustness table rather than left out of it.
  Paraphrase is the one to worry about.

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

- **Anthropic now watermarks Claude's text.** Models launched on or after 2 August 2026 carry a
  watermark, with older models to follow ([Anthropic, *Claude text
  watermark*](https://www.anthropic.com/news/claude-text-watermark), read 29 August 2026). The
  key is Anthropic's. Their own page is explicit that third-party detectors cannot check it
  because those companies "don't have our key", and a detection API is future tense: "We will
  soon be offering a watermark detection API." Until that ships, nothing here can be pointed at
  Claude output. Note the distinction when it does ship: a *detector endpoint* would make this
  product a client of Anthropic's service and would not use this lab's mathematics at all. Only
  a **published key** activates what is built here.
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
  verifier can tell a credential that merely parses from one signed by a recognised issuer —
  a real upgrade available to the checker's file path. And the
  [C2PA specification](https://spec.c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html)
  defines embedding only for structured containers: images, audio, video, PDF, fonts and
  ZIP-based documents. **There is no provision for plain text.** No amount of C2PA work will let
  anyone say anything about a pasted paragraph, which is what this lab is for.
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
