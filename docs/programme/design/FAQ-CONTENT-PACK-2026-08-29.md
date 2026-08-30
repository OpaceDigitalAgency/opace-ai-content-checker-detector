# FAQ and explanatory copy pack — Watermark Lab and Content Integrity Checker

**Date:** 29 August 2026
**Agent:** FAQ-1
**Status:** copy for hand-over. No application source, no existing mockup and nothing in `_source/`
was touched. Two new files only.

**Read to produce this:** `implementation/docs/WATERMARK-LAB.md` (current version, corrected 29 Aug
2026 — read, not edited; ownership contested), `Research-watermark-tools/Research-watermark-tools-.md`
(ChatGPT transcript, 1,563 lines), `ui-ux/WATERMARK-LAB-PLACEMENT-2026-08-29.md`,
`ui-ux/PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md`,
`WATERMARK-ROBUSTNESS-AND-PROVIDER-STATUS-2026-08-29.md`,
`C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md`, and `ui-ux/mockups/watermark-lab-v2.html` plus
`system.html` for the component vocabulary.

**Companion file:** `ui-ux/mockups/faq-preview.html` — the lab microcopy shown in place against its
four sections and three outcomes, and the checker FAQ rendered as the accordion block it will ship as,
with FAQPage JSON-LD.


> **Superseded wording, quoted deliberately — note added 30 August 2026 on publication.**
> This is a working document from 29–30 August 2026, kept as a historical record and not rewritten.
> Where it quotes claim wording the programme has since **retracted**, the quotation is the thing
> being retracted, never a live assertion. The retracted set and its corrected replacements are in
> [`../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md`](../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md);
> check any figure against
> [`../../measurements/CORPUS-RECONCILIATION-2026-08-29.md`](../../measurements/CORPUS-RECONCILIATION-2026-08-29.md)
> before repeating it. Do not quote any passage from this file as current wording.

---

## 0. The shape of this pack, and why it is not two FAQ lists

The two surfaces need different things, and giving them the same thing would be the mistake.

**The Watermark Lab does not get an FAQ block.** `watermark-lab-v2.html` contains one `<details>` in
the whole page, deliberately. The complaint that started the redesign was 1,112 words before the run
button, a 1,523-word result block, and a verdict that never says why. An FAQ accordion is that failure
wearing a different hat: copy that only works when it is collapsed. So the lab's explanatory material is
written here as **inline microcopy attached to named elements** — a section deck, a caption under a
number, a line under an outcome heading — and every item names its home and carries a word budget.

**The Content Integrity Checker does get an FAQ block.** It is the right pattern there and a genuine
search asset: people arrive at a checker holding a verdict they do not understand, they type the
question into a search box first, and the answers do not change with their text. That block is §2,
written as conventional Q&A with FAQPage markup.

**A glossary sits under both** and probably deserves its own URL. §3.

### 0.1 Vocabulary — the two surfaces do not share one

| | Watermark Lab | Content Integrity Checker |
|---|---|---|
| What it answers | what a watermark check can prove | what can be established about your text |
| Result vocabulary | three fixed outcomes: **No signal under these keys** / **Too short to score** / **Signal found** | the **Signal Scale**: Strong / Some / Faint / No signal, plus *not enough text* |
| Number shown | mean g, with the no-mark value `0.500` printed beside it, always | no headline percentage; a level name and a marked track |
| Runs | in your browser | default route is our EU server; the on-device route is a choice |

**Do not import the Signal Scale into the lab.** It describes AI probability from a trained classifier.
The lab measures something else entirely, and a shared vocabulary would imply a relationship between
the two readings that does not exist.

### 0.2 The claim / page boundary

The lab page and the standalone repo's page both build from `@opace/watermark-lab`, and every
claim-bearing sentence is **exported from the package** rather than written into the page. Every item
in this pack carries one of three tags.

| Tag | Meaning | Owned by |
|---|---|---|
| `[CLAIM: measured]` | Asserts a figure — a rate, a score, a threshold, a count. Cannot be written without its denominator, corpus, threshold and runtime. Renders through a `MEASURED` accessor. | the package, as a slot |
| `[CLAIM: boundary]` | Asserts what a check can and cannot establish. Carries no number and a numerator/denominator type cannot express it. Renders through `methodClaim()`. | the package, as a slot |
| `[CLAIM: world]` | Asserts a fact about something outside this product — a provider's status, a standard's contents, what a third party publishes. True on a date, not permanently, so it carries a **review interval** and the date it was last checked. | the package, as a slot |
| `[PAGE]` | Written for its position in a layout. Headings, framing, plain-English explanation of *why*, empty and waiting states, section lists, errors. | the page |
| `[SPLIT]` | More than one of the above. The assertions go to their slots; the explanation stays with the page. Every half is shown. | both, shown separately |

**Why the third kind exists.** A boundary claim is true because of how we built the thing, so it changes
only when we change the code. A world claim is true because of what someone else is doing today, and it
can go false while nobody touches our repository. Filing both under one tag means the second kind never
gets re-read. Every `[CLAIM: world]` therefore carries a review interval, and an overdue one should
surface to whoever owns the page rather than sitting quietly on it.

**Flagged, not silently rewritten:** `methodClaim('providers.status')` in §1 is tagged
`[CLAIM: boundary]` throughout this pack and is really a **world** claim — it is the single most
perishable thing either page says, and it is the one Anthropic can falsify without warning. Retagging it
touches copy in three places and is a change to settled material, so it is recorded here for the next
pass rather than made now. Suggested interval: **monthly**, and immediately on any provider announcement.

**Why claims split in two.** The slot inventory found that nine of the lab's twenty-one claims carry
**no number at all** — they are the "cannot establish" statements, and they are the more important
half. A measured-figure type cannot express them, and they were nearly designed out of the mechanism
because of it. `system.html` already marks them `claim--unsourced` and outlines them red under the
**Show claim slots** toggle, which is the right treatment: they are claims with no exported source yet.
Every `[CLAIM: boundary]` in this pack is one of those, and every one needs a home.

**Slot ids in this pack use the accessor paths that already exist** in `measured-figures.ts` and the
rebuilt mockups — `watermarkLab().wrongKey`, `registerScope().unmeasured`, `lengthSensitivity()`,
`editorialSignals().rate`, `measuredAt().humanFalsePositives`, and `methodClaim('…')` for the boundary
half. Where this pack names a slot that does not exist yet, it is marked **new**. Check any tag against
the toggle in `system.html` before creating a slot: 59 exist across four pages.

**Why the boundary sits there.** Package-exported prose cannot be written for a position, because the
package does not know where it will appear. If everything becomes a slot the redesign turns into a
wrapper around someone else's paragraphs, and the owner's actual complaint — wall-to-wall text a
competent copywriter cannot parse — comes straight back. The `[PAGE]` copy is the part that fixes it,
so it is written short, written to be read in place, and never written to be collapsed.

**Two properties every `[CLAIM: measured]` slot must have.**

1. **Every figure carries its denominator, corpus, threshold and runtime.** No bare rates. Bare rates
   are how three retracted figures travelled on this programme today. Detection is identical across
   runtimes at **877 / 922 = 95.1%**; false positives are **not** — **56 / 4,636 = 1.21%** on the EU
   server, **90 / 4,636 = 1.94%** in the browser. So a detection rate and a false-positive rate are
   never presented as a matched pair without naming the runtime for both.
   *(The 1.54% reweighted sample estimate and the 1.34% figure still live on the site are both
   superseded and must not ship.)*
2. **A missing value fails loudly.** A slot with no value renders a visible failure token —
   `[[MISSING: robustness.paraphrase.status]]` — and fails the build. It never renders as an empty
   string, because a measured figure quietly vanishing from a page is indistinguishable from a page
   that never made the claim, which is how a weakness disclosure stops being disclosed with nobody
   noticing.

**And a sentence-shape rule that follows from (2).** No sentence in this pack may stay grammatical
with its figure removed. Two places where that was hard are recorded in §6 rather than glossed over.

### 0.3 Four rules this copy is written to

1. **The lab says nothing about Claude, Gemini or ChatGPT production watermarks.** It explains why it
   cannot, as a finding rather than an apology.
2. **A null result is never a human result.** Wherever `0.500`, "no mark found" or "No signal" appears,
   the copy says separately that it does not indicate a person wrote the text and does not indicate a
   machine wrote it. Two sentences, because a single balanced sentence gets half-read.
3. **A detection endpoint is not our mathematics.** If Anthropic ships a detection API, calling it
   makes us their client. Only a published key exercises what has been built here.
4. **Every figure carries "long-form", and short copy has none.** The corpus is 5,558 long-form
   documents of roughly 600 words and up. Short marketing, SEO and social copy has **no independent
   figure at all** and is published as having none. A long-form figure must never be allowed to stand
   in for one.
5. **Never write a blanket privacy claim.** "Runs locally" became false the day the EU server became
   the checker's default and propagated to four surfaces before anyone caught it. Every privacy line in
   this pack names its route.

### 0.4 Facts this copy may state, and where they come from

Taken verbatim from `implementation/docs/WATERMARK-LAB.md` rather than re-derived.

| Fact | Used at |
|---|---|
| A faithful TypeScript port of `google-deepmind/synthid-text` at commit `addb4a158143c7c6851a1308f78b89fceed59683`, Apache-2.0. No Opace-invented cryptography. | lab methods strip |
| A passage scores **0.6807** under its own key, **0.4987** and **0.4869** under the other two. Unwatermarked text sits at **0.508–0.511**. | lab §1 — the centre of the explainer |
| 24 fixtures generated with the real Python reference implementation, 30 tests passing | lab methods strip |
| Verdict withheld below **40 scored positions**; a signal reported only below one-sided **p < 0.001** | lab outcomes; checker C1 |
| Truncation and substitution measured. Paraphrase, translation round-trips and targeted removal **unmeasured** | lab §4 |
| **Detection only.** The generation path is not ported | lab §4, methods strip |
| GPT-2 tokenisation; text from a model with a different tokeniser needs that tokeniser | lab methods strip |
| 1.7 MB detector chunk fetched on demand; 10,000 tokens score in under 250 ms | lab load gate |

---

## 1. Watermark Lab — inline microcopy

Four sections, in the settled order. Nothing here is an accordion and no line is written to be read
only by the curious. Each item names its home and its word budget, because the budget is the point.

**Total copy above the first run control: 95 words.** Everything else arrives *after* the reader has
seen a number change.

---

### Section 1 — Read the same passage with two different keys

The wrong-key collapse is the strongest thing in the project and belongs at the top, before any
explanation of what a watermark is. Show it, then say what it means.

**H1** · `[PAGE]` · 9 words

> Same text, wrong key: the signal vanishes

**Deck under the H1** · `[SPLIT]` · 31 words

- `[CLAIM: boundary]` slot `methodClaim('providers.noPublicTextVerifier')` **new**:
  > As of 29 August 2026, no public tool can verify a production text watermark from Google, Anthropic
  > or OpenAI.
- `[PAGE]`:
  > This is why. Watch it happen on a passage we made ourselves.

**Section deck** · `[SPLIT]` · 55 words

- `[CLAIM: measured]` slots `watermarkLab().rightKey`, `watermarkLab().wrongKey`, `watermarkLab().noMarkValue` — every figure with its key id:
  > Mean g 0.6807 under `opace-demo-alpha`, the key it was generated with; 0.4987 under
  > `opace-demo-beta`; 0.4869 under `opace-demo-gamma`. Unwatermarked fixtures score 0.508–0.511 under
  > all three keys. 8 unwatermarked and 12 watermarked fixtures, GPT-2 124M, reference implementation.
- `[PAGE]`:
  > One passage. The same mathematics, run three times, changing nothing but the key. Two of those
  > three readings are indistinguishable from text carrying no mark at all.

**Caption under each key reading** · `[CLAIM: measured]` · one line each

| Key | Reading | Caption slot |
|---|---|---|
| `opace-demo-alpha` — generated under this key | **0.6807** | Signal found. No-mark value 0.500. |
| `opace-demo-beta` | **0.4987** | Nothing. No-mark value 0.500. |
| `opace-demo-gamma` | **0.4869** | Nothing. No-mark value 0.500. |

**The line that carries the page** · `[PAGE]` · 38 words · sits directly under the three readings

> Nothing changed but the key. That is not a bug, and it is not our port being weak — it is the design.
> A watermark is evidence for whoever holds the key, and it is evidence for nobody else.

*Build dependency, see §6.1: this sentence is uninterpretable if the three caption slots fail to
render. It must be gated on them.*

**"What is a watermark, then?" — inline block, not a disclosure** · `[PAGE]` · 64 words

> Nothing was added to the text. While the model writes, a secret key nudges it towards some word
> choices over others, in a pattern that only shows up statistically across hundreds of choices.
> Reading the text back with the same key produces the number above. Without that key there is nothing
> to read, and the writing looks completely ordinary — because it is completely ordinary writing.

**"Why can nobody check Claude?"** · `[SPLIT]` · 72 words

- `[CLAIM: boundary]` slot `methodClaim('providers.status')` **new**, closing over `watermarkLab().claudeStatus` which already exists — one row per provider, never prose. Every sentence below is
  primary-verified, 29 August 2026:
  > **Anthropic** — has committed that Claude models launched on or after 2 August 2026 will support
  > text marking at launch, and says it is working to add marking to models released before that date
  > ([support article](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content)).
  > No Claude model has launched on or after that cutoff: Opus 5 launched 24 July 2026, Sonnet 5 on
  > 30 June 2026. Anthropic publishes no per-model status. A detection API is announced in the future
  > tense and not released
  > ([news post](https://www.anthropic.com/news/claude-text-watermark)). Whether any given piece of
  > Claude output carries a mark today is not publicly established.
  > **Google** — Gemini app and web text carries SynthID. The method is open-sourced; the production
  > key and configuration are not. Public verification covers images, video and audio; text is absent
  > from the accepted formats, and the SynthID Detector portal is gated to journalists and media
  > professionals.
  > **OpenAI** — provenance documentation covers images and audio only
  > (`POST /v1/content_provenance_checks`, image and audio MIME types). No text watermark is publicly
  > documented.

- `[PAGE]`:
  > The mathematics is public. The keys are not. That gap is the entire reason this page exists.

**Methods strip, foot of the section** · `[SPLIT]` · 58 words · P8 pattern, provenance not warning

- `[CLAIM: measured]` slot `provenance.build` **new**:
  > A faithful TypeScript port of `google-deepmind/synthid-text`, commit
  > `addb4a158143c7c6851a1308f78b89fceed59683`, Apache-2.0. No cryptography of our own invention.
  > Checked against 24 fixtures generated by the reference Python implementation; 30 tests passing.
- `[CLAIM: boundary]` slot `methodClaim('runtime.route')` **new**:
  > Runs in this browser tab. Nothing loaded or pasted on this page is sent to any server.
- `[CLAIM: boundary]` slot `methodClaim('capability.detectionOnly')` **new**:
  > Detection only. The generation path is not ported, so text cannot be watermarked here.
- `[CLAIM: boundary]` slot `methodClaim('capability.tokeniser')` **new**:
  > GPT-2 tokenisation. Text from a model with a different tokeniser would need that model's tokeniser
  > to score meaningfully.

---

### Section 2 — See which words carry the mark

The token colouring turns an assertion into something visible. The copy's job is to stop a reader
concluding that individually coloured words are individually incriminating. Almost all `[PAGE]`: this
section explains a mechanism and asserts nothing measurable.

**Section deck** · `[PAGE]` · 44 words

> Every word gets a 0 or a 1 from the key and the four words before it. Watermarked text carries
> slightly more 1s than chance allows. No single word means anything — the evidence is the average, and
> it only becomes evidence at length.

**Legend caption** · `[PAGE]` · 22 words

> Darker means a 1 under this key. A whole passage of ordinary writing looks about half dark, because
> chance gives you half.

**Line under the colouring, where a reader will try to read individual words** · `[PAGE]` · 35 words

> Do not read this word by word. A single dark word in unwatermarked text is a coin landing heads.
> What separates the two passages above is the count over several hundred flips.

**The two masks** · `[PAGE]` · 48 words

> Two things are excluded from the count and shown greyed out. Repeated four-word contexts, because the
> same context always produces the same value and counting it twice would flatter repetitive writing.
> And anything after the end-of-text marker, because it is not generated content.

---

### Section 3 — Run it on your own text, and watch it come back empty

Where the reader meets a null result on their own writing, and where nearly all of the lab's
explanatory weight belongs. Everything is attached to an outcome, not stored in a Q&A block.

**Section deck** · `[PAGE]` · 52 words

> This is the experiment most people came for, and it is the one that surprises them. Paste anything —
> your own draft, something from Claude, something from ChatGPT. Almost every result will be empty, and
> the reason it is empty is the most useful thing this page can teach you.

**Load gate, written as the boast it is** · `[SPLIT]` · 36 words

- `[CLAIM: measured]` slot `runtime.cost` **new**:
  > Detector bundle 1.7 MB, fetched on demand. 10,000 tokens score in under 250 ms. Runs in this
  > browser tab; nothing leaves your machine.
- `[PAGE]`:
  > Load it when you are ready.

**Paste box label and placeholder** · `[SPLIT]`

- `[PAGE]`: **Your text** · "Paste a few hundred words."
- `[CLAIM: measured]` slot `watermarkLab().positionFloor`:
  > Below 40 scored positions no reading is given.

**Live counter** · `[SPLIT]`

- `[CLAIM: measured]` slots `run.words` **new**, `run.scoredPositions` **new**, `watermarkLab().positionFloor`
- `[PAGE]` frame, with the state word chosen by the page:
  > `312 words · 397 scored positions` — enough to score.
  > `28 words · 22 scored positions` — not enough. We need about 40.

---

#### Outcome 1 — No signal under these keys · tag: *not a verdict*

The common case. Almost everything pasted here lands on it.

**Outcome line** · `[CLAIM: measured]` slot `result.reading` **new** · 21 words

> Your text carries no mark from any of our three demo keys. Mean g **0.503**, against a no-mark value
> of **0.500**, over **397** scored positions.

**The refusal — two separate sentences, never merged** · `[CLAIM: boundary]` slot `methodClaim('result.nullMeaning')` **new**, exported
as an ordered pair of strings and rendered as two blocks · 24 words

> This does not say a person wrote it.
> This does not say a machine wrote it.

*See §6.2. This is a claim by definition and a layout instruction at the same time.*

**Why it is empty** · `[SPLIT]` · 58 words

- `[CLAIM: boundary]` slot `methodClaim('keys.published')` **new**:
  > This page scores under three demo keys published by Opace: `opace-demo-alpha`, `opace-demo-beta`,
  > `opace-demo-gamma`. A mark made with any other key is not detectable here.
- `[PAGE]`:
  > Nobody writes their articles with our keys. If your text came from a model that does watermark, the
  > mark was made with a key we do not have, so it is invisible to this mathematics in exactly the way
  > the top of this page showed you. An empty result is a statement about our keys, not about your
  > writing.

**Why no public verifier exists** · `[SPLIT]` · 63 words

- `[CLAIM: boundary]` — reuses `methodClaim('providers.status')` and `methodClaim('providers.noPublicTextVerifier')` from §1. Do not restate
  provider facts in a second slot; render the same one twice.
- `[PAGE]`:
  > Nobody is holding out on you. The keys are simply not public, and that includes every commercial AI
  > detector you could take your text to instead.

**"So will you support Anthropic's detector when it ships?"** · `[SPLIT]` · 60 words

- `[CLAIM: boundary]` slot `methodClaim('roadmap.detectionApi')` **new**:
  > A published key would activate this lab's mathematics on Claude text with no new detection code. A
  > detection endpoint would not: calling it makes this product a client of Anthropic's service and
  > uses none of this lab's mathematics.
- `[PAGE]`:
  > So it depends entirely on what ships. If it is an endpoint, we would report their verdict on the
  > checker, labelled as theirs, and say so.

**Route out, beside the outcome** · `[PAGE]` · 19 words

> Wanted a verdict on your text? The Content Integrity Checker runs five other checks that do give one.

---

#### Outcome 2 — Too short to score

A refusal, disclosed before the paste as well as after it.

**Outcome line** · `[SPLIT]` · 29 words

- `[CLAIM: measured]` slots `run.scoredPositions` **new**, `watermarkLab().positionFloor`:
  > Scored positions: **22**. Minimum for a reading: **40**.
- `[PAGE]`:
  > We are not giving you a reading at all, rather than giving you a weak one.

**The refusal** · `[CLAIM: boundary]` slot `methodClaim('result.withheldMeaning')` **new** · 26 words

> This is not "no watermark" and it is not "watermark". It is "we did not look, because looking would
> have been dishonest at this length."

**What fixes it** · `[SPLIT]` · 13 words

- `[CLAIM: measured]` slot `run.wordsShortBy` **new**: **150**
- `[PAGE]`: "Add roughly another {n} words and run it again."

---

#### Outcome 3 — Signal found

Rare, and it needs the tightest copy on the page, because this is the one result a reader over-reads.

**Outcome line** · `[CLAIM: measured]` slot `result.reading` **new** · 24 words

> Mean g **0.6612** under `opace-demo-alpha`, against a no-mark value of **0.500**, over **388** scored
> positions. One-sided p below **0.001**.

**What it means** · `[CLAIM: boundary]` slot `methodClaim('result.signalMeaning')` **new** · 41 words

> These words were produced with a demo key Opace published. That is the only thing this result
> establishes: the text was made on this page, or by someone using a key that sits in our source in the
> open for exactly that purpose.

**What it does not mean** · `[CLAIM: boundary]` slot `methodClaim('result.signalLimits')` **new** · 26 words

> It does not mean the text came from Claude, Gemini or ChatGPT. Those keys are private and this page
> has never held one.

---

### Section 4 — Try to break it

The section that has to be written most carefully, because a table of survivable damage over-reassures.

**Section deck** · `[PAGE]` · 46 words

> A mark that any edit destroys is useless, and a mark nothing destroys does not exist. So: take our
> strongest passage and damage it. Two kinds of damage are measured below. Three more are in the table
> with nothing in them, and that is deliberate.

**Table caption** · `[SPLIT]` · 24 words

- `[CLAIM: measured]` slot `robustness.fixture` **new**:
  > One 400-token watermarked fixture, mean g 0.6807 undamaged, 393 scored positions, scored under
  > `opace-demo-alpha`.
- `[PAGE]`:
  > Positions left matters as much as mean g: shortening costs you confidence more than it costs signal.

**The table** · `[CLAIM: measured]` slot `robustness.rows` **new** · every row including the empty ones

| Damage | Mean g | Positions left | Measured |
|---|---|---|---|
| None | 0.6807 | 393 | yes |
| Truncated to 50% | 0.6521 | 195 | yes |
| Truncated to 25% | 0.6545 | 96 | yes |
| Tokens substituted | 0.6535 | 393 | yes |
| Paraphrased | — | — | **no** |
| Translation round-trip | — | — | **no** |
| Targeted removal | — | — | **no** |

*The three unmeasured rows are part of the slot, not omissions from it. A renderer that drops rows
whose figures are empty reintroduces the exact defect this table was rebuilt to fix, so the "no" value
is a required string and an absent one is a build failure — see §0.2 and §6.4.*

**The line under the table — the most important sentence in §4** · `[SPLIT]` · 57 words

- `[CLAIM: boundary]` slot `watermarkLab().robustnessUnmeasured`:
  > Paraphrase robustness is **not measured** by Opace. This lab makes no claim about how the mark holds
  > up under it.
- `[PAGE]`:
  > Read the top four rows as the top four rows and nothing more. Truncation and substitution leave most
  > word choices in place, which is why the mark rides through them. Paraphrase replaces the very
  > choices the reading is computed from.

**"Does paraphrasing remove a watermark?"** · `[SPLIT]` · 74 words

- `[CLAIM: measured]` slot `literature.paraphrase` **new**, third-party figures with their own corpora:
  > Dathathri et al. (Nature, Supplementary §C.6; 3,000 ELI5 prompts, Gemma 2B-IT and 7B-IT) report that
  > editing weakens detectability but the watermark remains detectable with high accuracy if the text is
  > sufficiently long, with a strong paraphrasing model the hardest case. Kirchenbauer et al.
  > (arXiv:2306.04634) report detection after roughly 800 tokens at a 1e-5 false-positive rate following
  > strong human paraphrase. Neither measures this lab's keys, tokeniser or fixtures.
- `[PAGE]`:
  > We have not measured it, so we cannot tell you from our own numbers, and we are not going to reach
  > for someone else's. What the published work says is that length decides it: the SynthID authors
  > describe paraphrase as a strong attack, and the detection that survives it needs far more text than
  > anyone pastes into a box.

**The third-party paraphrase figure — cut, and it must stay cut.** `[not for publication]`

A widely quoted "roughly 70% down to 4–5%" figure circulates for paraphrase against matched-key
detection. It is not in this pack and must not be added, in any form, including as a hedge or an
allusion. RV-1's primary-source pass found it quoted verbatim but misattributed, carried by a
single-author repository with no denominator, no runtime, no replication and a repository tip one day
old, and colliding unexplained with a peer-reviewed DetectGPT result at the same 1% false-positive
rate — and DetectGPT is not a watermark. The defensible answer to "does paraphrase remove it" is
**unmeasured**, which is also the true one. Do not fill the gap with a number.

**Honest limits, plain list at the page foot, not collapsed** · `[CLAIM: boundary]` slot `methodClaim('limits.list')` **new** · every
item is a statement of what the check can and cannot establish

> - Demo keys only. Nothing here detects, verifies, clears or removes any production watermark from
>   Google, Anthropic, OpenAI or anyone else.
> - Detection only. Text cannot be watermarked here; the generation path is not ported.
> - GPT-2 tokenisation. Text from a model with a different tokeniser would need that model's tokeniser
>   to score meaningfully.
> - No verdict is given below 40 scored positions.
> - A reading near 0.500 is not proof of human authorship. It means no signal under this key, which is
>   also exactly what unwatermarked AI text looks like.
> - Truncation and substitution are measured. Paraphrase, translation round-trips and targeted removal
>   are not measured, and paraphrase is the one to worry about.

---

### Placement and ownership summary

| Copy item | Home | Words | Tag |
|---|---|---|---|
| H1 | above §1 | 9 | `[PAGE]` |
| Deck under H1 | above §1 | 31 | `[SPLIT]` |
| Section 1 deck | above the three readings | 55 | `[SPLIT]` |
| Key captions ×3 | under each reading | 18 | `[CLAIM: measured]` |
| "Nothing changed but the key" | under the three readings | 38 | `[PAGE]`, gated |
| "What is a watermark, then?" | inline, §1 | 64 | `[PAGE]` |
| "Why can nobody check Claude?" | inline, §1 | 72 | `[SPLIT]` |
| Methods strip | foot of §1 | 58 | `[SPLIT]` — four slots |
| §2 deck, legend, two warnings, masks | around the colouring | 149 | `[PAGE]` |
| §3 deck | above the paste box | 52 | `[PAGE]` |
| Load gate | above the paste box | 36 | `[SPLIT]` |
| Box label, placeholder, counter | the paste box | 32 | `[SPLIT]` |
| Outcome 1 block | attached to outcome | 245 | `[SPLIT]` — 4 slots |
| Outcome 2 block | attached to outcome | 68 | `[SPLIT]` — 3 slots |
| Outcome 3 block | attached to outcome | 91 | `[CLAIM: measured]` ×1, `[CLAIM: boundary]` ×2 |
| §4 deck, caption, table, paraphrase | around the damage table | 253 | `[SPLIT]` |
| Honest limits | page foot | 118 | `[CLAIM: boundary]` |

Page-owned words on the lab: **about 620**. Slot-owned: **about 560**. Nothing above is an accordion.
The only thing that should ever collapse on this page is the raw per-token data behind the colouring,
which is a data dump rather than an explanation.

---

## 2. Content Integrity Checker — the FAQ block

Twenty entries. This is where a conventional FAQ belongs and where the search value is: people arrive
holding a verdict they cannot read, and they type the question before they read the page.

Each entry carries the question as a visitor would type it, an answer of two to four sentences, a
**does not mean** line where a misreading is likely, a **boundary** line naming which sentences are
package-owned, and the document that settles it.

The definition of a Content Credential is deliberately not an FAQ entry. It belongs in the glossary at
§3, which both pages link to, and duplicating it here would create two copies of a definition that will
drift.

---

**C1 · Q: What does the watermark row on my result mean?**

**A.** It is one of six checks and the narrowest one. It reads your text for marks made with the three
demo keys Opace published, using a faithful port of Google DeepMind's SynthID-Text mathematics. It
cannot see marks made with anyone else's key, which in practice means every production model.

**Does not mean:** this row is not an AI detector and it does not feed the AI signal reading above it.
The two never mix.

**Boundary:** `[SPLIT]` — sentences 2 and 3 are `[CLAIM: measured]` `provenance.build` and `[CLAIM: boundary]`
`methodClaim('keys.published')` from the lab package. Sentence 1 and the *does not mean* line are `[PAGE]`.

*Settled by:* `WATERMARK-LAB.md` "Where it appears for a user"; `PLAIN-LANGUAGE` §0 rule 2.

---

**C2 · Q: It says "no mark found" — is that bad?**

**A.** It is the normal answer, and it is the answer almost every piece of text on the internet gets.
Text carrying no watermark and text watermarked under a key we do not hold produce identical readings
here, so there is nothing to separate them.

**Does not mean:** no mark found does not indicate a person wrote it. It does not indicate a machine
wrote it either. It carries no information about authorship at all.

**Boundary:** `[SPLIT]` — the *does not mean* line is `[CLAIM: boundary]`, slot `methodClaim('result.nullMeaning')`, the same
ordered pair the lab renders, and it must render as two sentences here too. The rest is `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §3.5 outcome table; `WATERMARK-LAB.md` "Honest limits".

---

**C3 · Q: Why can't you check if text came from Claude or ChatGPT?**

**A.** Because a watermark is only visible to whoever holds the key it was made with, and no provider
publishes theirs. Our own demonstration makes the point better than any explanation: one passage reads
0.6807 under its own key and 0.4987 under a different one, with nothing changed but the key. As of
29 August 2026 no public tool can verify a production text watermark from any major provider.

**Does not mean:** this is not a shortcoming of our implementation that a better tool would solve. The
Watermark Lab shows the mathematics working correctly and still unable to answer that question.

**Boundary:** `[SPLIT]` — sentence 2 is `[CLAIM: measured]` `watermarkLab().rightKey` and `watermarkLab().wrongKey`;
sentence 3 is `[CLAIM: boundary]` `methodClaim('providers.noPublicTextVerifier')`. Sentence 1 and the *does not mean* line are `[PAGE]`.

*Settled by:* `RESEARCH-CLAIM-VERIFICATION` §1, §2, §4, §5; `WATERMARK-LAB.md` "The one thing to
understand first".

---

**C4 · Q: Is Claude's text watermarked?**

**A.** Anthropic has committed that Claude models launched on or after 2 August 2026 will support text
marking at launch, and says it is working to add marking to models released before that date. No Claude
model has launched on or after that cutoff — Opus 5 launched on 24 July 2026 and Sonnet 5 on 30 June —
so every model in service today depends on the retrofit, and Anthropic publishes no per-model status.
Whether any given piece of Claude output carries a mark today is not publicly established.

**Does not mean:** the **retracted** wording "Anthropic now watermarks Claude's text" — quoted here as the
thing retracted — is a present-tense claim Anthropic does not
make, and neither do we. It equally does not mean Claude output is unmarked; nobody outside Anthropic
can tell you either way.

**Boundary:** `[CLAIM: boundary]` throughout, slot `methodClaim('providers.status')`. This entry is a slot with a question glued
to the front of it, and that is correct: every sentence asserts a checkable fact with a date. The only
`[PAGE]` element is the question wording itself.

*Settled by:* `RESEARCH-CLAIM-VERIFICATION` §1, primary sources read 29 Aug 2026 — the support article
for the launch scope, the news post for the future-tense framing and the detection API. Do not swap
those citations; getting them the wrong way round is a recorded defect in two of our own documents.

---

**C5 · Q: Can researchers detect an AI watermark some other way?**

**A.** They can detect whether a *model* appears to be watermarking, which is a different question from
whether *your document* is. A peer-reviewed method from ETH Zurich infers the presence and parameters
of a watermarking scheme by querying a model many times over. It does not recover the secret key and it
cannot tell you anything about a passage someone hands you.

**Does not mean:** a negative result from that method does not prove a model has no watermark, and it
gives no route to checking a pasted document. We do not run it, and nothing in this product does.

**Boundary:** `[SPLIT]` — sentences 2 and 3 are `[CLAIM: boundary]`, slot `methodClaim('literature.blackBox')`. The framing and
the *does not mean* line are `[PAGE]`.

*Settled by:* `RESEARCH-CLAIM-VERIFICATION` §9 — Gloaguen et al., ICLR 2025.

---

**C6 · Q: Are the hidden characters you found the AI watermark?**

**A.** No, and this is the most misread result in the tool. Hidden characters are real, invisible code
points sitting between your visible letters; a statistical watermark is a pattern in which words were
chosen and has no characters at all. Finding hidden characters tells you a tool wrote into the text
after somebody typed it.

**Does not mean:** hidden characters say nothing about who or what wrote the words, and they are not
evidence of AI. The narrow no-break space that turns up in ChatGPT output is the usual example people
mistake for a watermark; it is not one. A copy, paste or save strips most of them anyway.

**Boundary:** `[SPLIT]` — the *does not mean* line's first sentence is `[CLAIM: boundary]`, slot
`methodClaim('layers.characterVsStatistical')`, because it states what a check can and cannot establish. Everything
else is `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §1.4 fixed line and §3.2; `RESEARCH-CLAIM-VERIFICATION` §7 caution.

---

**C7 · Q: My text has no hidden characters. Does that prove a human wrote it?**

**A.** No. Almost all published writing carries none, so a clean result is the ordinary case rather
than a distinction. Copying text between applications removes them, so a clean reading is also what you
get from text that had them an hour ago.

**Does not mean:** clean does not indicate human authorship, and it does not indicate machine
authorship. It indicates nothing was hidden in the copy you gave us.

**Boundary:** `[SPLIT]` — the *does not mean* line is `[CLAIM: boundary]`. The rest is `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §1.4 second fixed line.

---

**C8 · Q: Why won't the tool let me remove some of the hidden characters?**

**A.** Because some of them are a signed content credential, and removing them would destroy it
permanently. Since December 2025 the C2PA standard allows a signed manifest to be embedded in plain
text as non-rendering Unicode, across 257 code points that our hidden-character check flags in full.
Those findings are still listed, still counted and still shown in your draft; the fix control is
disabled and labelled, and removal sits behind a separate confirmation that states what it destroys.

**Does not mean:** holding them back is not us deciding they are harmless. It is us refusing to make an
unrecoverable change on your behalf without saying so first.

**Boundary:** `[SPLIT]` — sentence 2 is `[CLAIM: measured]`, slot `c2pa.textCarrierSet` **new** (the 257 code points, the
spec version and the clause). Sentences 1 and 3 describe a control in a layout and are `[PAGE]`. The
disabled control's own label is flagged at §5.3 as a genuinely awkward case.

*Settled by:* `C2PA-TEXT-CREDENTIAL-CONFLICT` §1 and §3, reproduced against the shipped engine;
`WATERMARK-LAB.md` "The conflict with the cleaner".

---

**C9 · Q: You found valid Content Credentials — does that mean the file is genuine?**

**A.** It means the file has not been altered since it was signed. It does not yet mean we know who
signed it, because this release does not check the signing certificate against C2PA's published trust
list. Read a valid signature as an integrity check rather than an identity check.

**Does not mean:** valid is not the same as trustworthy. Anyone can sign anything, and whether the
signer is who they claim is a question we are not answering in this release.

**Boundary:** `[CLAIM: boundary]` throughout, slot `methodClaim('c2pa.validationScope')`. Every sentence states what the check
does and does not establish. The question wording is `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §3.6 fixed note; `RESEARCH-CLAIM-VERIFICATION` §6 — the trust list is
published and reachable, so this is an upgradeable limit rather than a permanent one, and the copy must
be regenerated the day it is consulted.

---

**C10 · Q: What does "Strong signal" mean on the AI check?**

**A.** It means the writing is full of the patterns our model sees in machine-written text. It is a
statement about what our instrument read, not about who sat at the keyboard. The reading, the flag
point it was measured against and the runtime that produced it are printed underneath it.

**Does not mean:** a strong signal is not proof of authorship and it is not an accusation. We never
label a person from a meter reading.

**Boundary:** `[SPLIT]` — sentence 3 names three values that are all `[CLAIM: measured]` slots
(`run.score` **new**, `thresholds.flagPoint` **new**, `measuredAt().runtimeLabel`). The rest is `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §1.1 and §0 rule 1.

---

**C11 · Q: What does "No signal" mean — was my text written by a human?**

**A.** It means none of the patterns our model looks for showed up. Lightly edited AI writing produces
the same reading, and so does AI writing from a model our training never saw.

**Does not mean:** no signal does not indicate a person wrote it, and it does not indicate a machine
wrote it. Nothing on this axis is ever called human, in words, in colour or in an icon.

**Boundary:** `[SPLIT]` — the *does not mean* line is `[CLAIM: boundary]`, and it is the same ordered pair as
`methodClaim('result.nullMeaning')` on the lab, reworded for the Signal Scale. The rest is `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §0 rule 6 and §1.1.

---

**C12 · Q: Why does it say there isn't enough text to give a result?**

**A.** Below the length floor a reading would be a guess dressed up as a measurement, so we decline and
tell you roughly how many more words would fix it. Nothing has gone wrong, and no number is printed
faintly in the background.

**Does not mean:** a withheld reading is not a low reading. An empty meter would mean "No signal",
which is a different answer, so the withheld state is drawn differently.

**Boundary:** `[PAGE]` throughout. This describes a waiting state and asserts nothing measurable. The
floor value itself is a `[CLAIM: measured]` slot (`watermarkLab().positionFloor`) wherever it is printed
on the result, not here.

*Settled by:* `PLAIN-LANGUAGE` §1.7.

---

**C13 · Q: My article is short. Can I trust the result?**

**A.** Detection falls with length, and the fall is measured: cut the same long-form documents to their
first 512 words and detection drops from 620 of 654 to 552 of 654. Every figure we publish comes from
long-form prose of roughly 600 words and up, so a shorter piece sits outside what we measured. False
positives behave differently from detection here, which is why a weak reading on a short piece is weak
news and a flag on one is not automatically wrong.

**Does not mean:** short text does not make the tool unreliable in both directions, and the 512-word
figure is not a figure for short copy. It is what happens to *these* documents when they are truncated.

**Boundary:** `[SPLIT]`, and the awkward one — see §5.4. The figures are `[CLAIM: measured]`, slots
`lengthSensitivity()` and `registerScope().register`, and they render with their denominators. The
interpretive clauses — "weak news", "not automatically wrong" — are conclusions drawn from those
figures and must be generated alongside them, not hand-written.

*Settled by:* `measured-figures.ts` via `system.html` — `length.full` 620/654 = 94.8%, `length.cut`
552/654 = 84.4%. Runtime named at the point of render.

---

**C14 · Q: Does it work on a short paragraph, a product description or a social post?**

**A.** We have no measurement for those and we do not publish one. Everything this tool reports was
measured on long-form prose of roughly 600 words and up; short marketing, SEO and social copy has no
figure at all, because every sample this programme owns for those registers sits inside the training
set. You will still get a reading. We simply cannot tell you how often it is right.

**Does not mean:** no figure is not a low figure, and it is not a high one. It is an absence, and
letting a long-form figure stand in for it would be the most tempting dishonest move available to us.

**Boundary:** `[CLAIM: boundary]` throughout, slots `registerScope().unmeasured` and
`registerScope().unmeasuredReason`. The question wording is `[PAGE]`.

*Settled by:* `measured-figures.ts` — `unmeasured: 'Short marketing, SEO and social copy'`; coordinator
correction, 29 Aug 2026.

---

**C15 · Q: The writing notes flagged my article and I wrote every word. Why?**

**A.** Because they are editorial suggestions rather than detection. Measured on a corpus of 5,558
documents, these rules fired on about one human document in four. They exist to make the writing
better, and they are kept on their own axis in neutral grey precisely so they cannot be read as
evidence.

**Does not mean:** a page full of writing notes is not a page full of AI evidence. The two are not
connected, and the engine throws if they ever contaminate each other.

**Boundary:** `[SPLIT]` — sentence 2 is `[CLAIM: measured]`, slot `editorialSignals().rate`, and it carries its
corpus in the sentence. See §5.5: this is one of two sentences in the pack that would stay grammatical
if its figure vanished, and the rewrite is recorded there.

*Settled by:* `PLAIN-LANGUAGE` §0 rules 2 and 3, §1.5 fixed line.

---

**C16 · Q: Is my text uploaded anywhere when I use the checker?**

**A.** That depends on the route, and the control says which one you are on. The default route sends
your text to our server in Belgium, which is where the stronger model runs. The on-device route keeps
everything in your browser and is a deliberate choice you make before running, with a weaker reading as
the trade.

**Does not mean:** do not read "runs locally" anywhere on this product as covering the checker's
default. It covers the Watermark Lab, which is genuinely browser-only, and the on-device checker route.

**Boundary:** `[CLAIM: boundary]` throughout, slot `methodClaim('runtime.route')`, rendered per route. A privacy sentence that
is page-owned is a privacy sentence that can go stale in one surface and not another, which is exactly
how "runs locally" survived on four surfaces after it stopped being true.

*Settled by:* `PLAIN-LANGUAGE` §4.4 route icons; correction from the redesign session, 29 Aug 2026.

---

**C17 · Q: Can I use this to prove someone used AI?**

**A.** No. Nothing this tool produces is proof of authorship, and no combination of the three answers
adds up to one. The most it can honestly support is a conversation: here is what our model read, here
is what was hidden in the text, here is what we would change about the writing.

**Does not mean:** a strong signal is not a finding of misconduct and should never be the sole basis for
an accusation, a grade or a dismissal.

**Boundary:** `[SPLIT]` — sentences 1 and 2 are `[CLAIM: boundary]`, slot `methodClaim('product.notProof')`. The third sentence
and the *does not mean* line are `[PAGE]`.

*Settled by:* `PLAIN-LANGUAGE` §0 rule 1 and §1.2, the base-rate test.

---

### The file-upload entries

Three entries added 29 August 2026, after the redesign was found to have dropped file upload and the
owner caught it. The pack already explained what a Content Credential *is* (C8, C9, and the glossary) and
never told a visitor that file checking exists at all. That is the more visible half of the feature that
nearly vanished, and losing upload would have left the provenance check on the page as a permanently dead
control.

**On the built page these sit with C8 and C9, not at the end.** They are numbered C18 to C20 here so the
existing numbering does not churn; `faq-preview.html` renders them in their reading position, immediately
after the Content Credentials pair.

---

**C18 · Q: What kinds of file can I check?**

**A.** Uploaded JPEG, PNG, WebP and PDF files go through the Content Credentials check. Any other file
type is reported as one we do not read, which is not the same as a file that failed. Pasted text and
uploaded files are checked differently and come back with different answers: a file can carry credentials
we can report on, and pasted text is never given a provenance verdict at all.

**Does not mean:** an unsupported file type is not a finding about that file. It means we did not look,
and nothing about the file has been established either way.

**Boundary:** `[CLAIM: boundary]` slot `methodClaim('provenance.acceptedTypes')` **new** — the format
list, the "unsupported is not a failure" rule and the text/file asymmetry are all statements of what the
check can establish. The question wording is `[PAGE]`.

*Settled by:* `implementation/docs/CAPABILITIES.md` §2.4, read 29 Aug 2026.

---

**C19 · Q: Does checking a file send it anywhere?**

**A.** No. The file is read in your browser, using the Content Authenticity Initiative's own C2PA
library, and it is not uploaded to us. That is a different route from the text check, whose default sends
your text to our EU server, and the two do not share an answer.

**Does not mean:** this is not a privacy statement about the product as a whole. It covers the file path
and nothing else; read C16 for the text path, which answers differently.

**Boundary:** `[CLAIM: boundary]` slot `methodClaim('runtime.route.file')` **new**, rendered per path.
It must not reuse the text route's string, and the two must be separately editable — a shared privacy
string is exactly how "runs locally" survived on four surfaces after it stopped being true.

*Settled by:* `implementation/docs/CAPABILITIES.md` §2.4: the browser checker reads credentials from
uploaded JPEG, PNG, WebP and PDF "entirely locally, using the official Content Authenticity Initiative
`@contentauth/c2pa-web` SDK".

> **Confirm before this ships, and do not inherit it.** That sentence describes the build *before* upload
> was dropped from the redesign. It is a documented fact, not an assumption, which is why this entry is
> written rather than blocked — but the restored upload path has not been read by me, and a restored
> feature is exactly where a route quietly changes. Re-read the restored path. **If it proxies the file
> anywhere at all, this entry is wrong and must be rewritten, not softened.**

---

**C20 · Q: Why does the file check find things the text check cannot?**

**A.** Because a file can carry a signed manifest and a paragraph mostly cannot. Content Credentials were
designed to travel inside image and PDF containers, so an uploaded file either carries one or it does
not, and we can tell you which. Pasted text gets no provenance verdict: we recognise the wrapper of a
text credential, but only far enough to refuse to destroy it.

**Does not mean:** recognising a wrapper is not validating a credential. In pasted text we do not parse
the manifest, check any signature or consult a trust list, and even on a file, where the credential is
read properly, the certificate trust list is still not consulted in this release.

**Boundary:** `[SPLIT]` — the container sentence is `[CLAIM: world]` slot
`methodClaim('c2pa.textVsFileSupport')` **new**, review interval **per C2PA specification release**,
since text support arrived in 2.3 and the reference implementation may yet follow. Everything about what
we do and do not do is `[CLAIM: boundary]` slot `methodClaim('provenance.textVsFile')` **new**.

*Settled by:* `implementation/docs/CAPABILITIES.md` §2.4; `C2PA-TEXT-CREDENTIAL-CONFLICT` §1. Consistent
with C9: this release does not consult the trust list on either path.

---

## 3. Glossary — five things the internet constantly conflates

These five are treated as interchangeable almost everywhere online, and that confusion is why people
believe a free tool can catch Claude. Separating them cleanly is the largest credibility opportunity in
the product and, because each is a distinct query cluster, the largest search opportunity too.

On-page form: five rows, each answering the same three columns — *what it is*, *where it lives*, *what
finding it proves*. `[PAGE]` throughout except the four figures marked below, which are claim slots.

**The one-line version, above the table** · `[PAGE]`

> A watermark is in the word choices. A credential is a signature on the file. Invisible characters are
> characters. A detector score is a guess about style. Only the first two were put there on purpose by
> whoever made the content, and only one of them can be checked by anyone holding the key.

---

**Statistical watermark** *(also: SynthID-Text, AI text watermark)* · `[PAGE]`

A pattern in **which words the model chose**, created by a secret key at the moment of writing, and
read back by recomputing that key's values and testing whether the average is too high to be chance.
Nothing is added to the text.

- **Lives in:** the word choices. Nothing to see, nothing to delete.
- **Finding it proves:** something holding that key produced these words at some point.
- **Not finding it proves:** nothing, unless you hold every key that could have been used.
- **Survives:** copying, pasting, reformatting, saving. Weakened by heavy editing. What happens under
  paraphrase is unmeasured here. `[CLAIM: boundary]` slot `watermarkLab().robustnessUnmeasured`

---

**Metadata** · `[PAGE]`

Structured information carried **alongside** a file rather than inside its visible content — EXIF in a
photograph, document properties in a Word file, a generator tag in an export. Easy to read, trivially
easy to strip or forge.

- **Lives in:** the file's container, not the text.
- **Finding it proves:** something wrote that field. Nothing stops anyone writing anything into it.
- **Survives:** very little. Uploading a photograph to most platforms removes it.

---

**Content credential** *(C2PA)* · `[PAGE]`, with two claim slots

Metadata's serious relative: a **cryptographically signed** record of how a file was made and edited,
under an open standard. Since C2PA 2.3, published December 2025, the standard also covers plain text,
embedded as non-rendering Unicode so it survives copy and paste. `[CLAIM: measured]` slot `c2pa.textCarrierSet` **new**

- **Lives in:** the file — or for text, in invisible code points woven through it.
- **Finding it proves:** the content has not been altered since it was signed. Who signed it is a
  separate question, and this release does not consult the certificate trust list.
  `[CLAIM: boundary]` slot `methodClaim('c2pa.validationScope')` **new**
- **Survives:** whatever the signer attached it to, until someone edits the content or strips those
  characters. Our own hidden-character cleaning would have destroyed the text form, which is why those
  characters are now held back.

---

**Unicode artefact** *(invisible characters, zero-width characters, homoglyphs)* · `[PAGE]`

Real code points with no visible width, or letters from another alphabet that look identical to Latin
ones. A zero-width space between two words. A Cyrillic "а" inside an English word.

- **Lives in:** the text, as actual characters, findable and removable.
- **Finding it proves:** a tool wrote into the text after somebody typed it. Sometimes that tool was a
  word processor doing something innocent, sometimes it was hiding a payload, sometimes it was signing a
  content credential.
- **Proves nothing about:** who or what wrote the words. This is the conflation that does the most
  damage, because "invisible AI watermark" is a phrase people search for and it describes two unrelated
  things. `[CLAIM: boundary]` slot `methodClaim('layers.characterVsStatistical')` **new**

---

**AI detector score** · `[PAGE]`

A statistical estimate of how much a piece of writing **resembles** machine-written text, produced by a
model trained on examples. It reads style, not provenance.

- **Lives in:** nowhere. It is computed from the visible words each time and stored in no file.
- **A high score proves:** the writing carries patterns the model associates with machine text. It is
  not proof of authorship, at any strength, ever. `[CLAIM: boundary]` slot `methodClaim('product.notProof')` **new**
- **Fails when:** the text is short, has been edited, or was written by someone whose style happens to
  be regular. `[CLAIM: measured]` slots `lengthSensitivity()`, `registerScope().unmeasured` and `editorialSignals().rate` carry the figures.

---

## 4. Verification status, and what must never be published

RV-1's primary-source pass on 29 August 2026 resolved every marker this pack carried. Nothing below is
outstanding.

### 4.1 Resolved — safe to publish as written

| Claim | Verdict | Source read |
|---|---|---|
| Claude models launched on or after 2 Aug 2026 support marking at launch; earlier models are a work in progress with no per-model status | confirmed | support article 16266773 |
| No Claude model has launched on or after that cutoff (Opus 5, 24 July 2026; Sonnet 5, 30 June 2026) | confirmed | Anthropic newsroom and the Opus 5 launch post |
| Detection API announced, future tense, not released | confirmed | news post `claude-text-watermark` |
| Gemini app and web text carries SynthID; no public verification for arbitrary text; the Detector portal is gated | confirmed | DeepMind SynthID pages |
| OpenAI `POST /v1/content_provenance_checks` is real and accepts image and audio MIME types only | confirmed | OpenAI developer documentation |
| No text watermark is publicly documented by OpenAI | confirmed-absent, on documented absence | as above |
| C2PA trust list and conformance programme are live and publicly reachable | confirmed | c2pa.org/conformance |
| Black-box detection infers whether a *model* watermarks, not whether a document does | confirmed, peer-reviewed | Gloaguen et al., ICLR 2025 |

### 4.2 Prohibited — do not publish, in any form, including as a hedge

Every wording quoted in this section is **retracted**. It appears here as the thing being prohibited.

1. **The paraphrase figure (~70% → 4–5%).** Cut from §1 §4 and it stays cut. Misattributed, no
   denominator, no runtime, one author, no replication, and an unexplained collision with a
   peer-reviewed DetectGPT result at the same 1% false-positive rate. The answer is **unmeasured**.
2. **Any present-tense claim that Claude output is watermarked today** — retracted wording, quoted
   here only as the thing prohibited — including the softer "Anthropic now watermarks Claude's
   text". Anthropic's own article opens in the future tense.
3. **The other figures from the same third-party source** (71%, 68%, 38%, 34%) anywhere near our own
   measurements.
4. **Dates for OpenAI's Verify tool.** The endpoint is verified; the surrounding dates are not, because
   the pages carrying them returned HTTP 403 and were never read.
5. **"OpenAI does not watermark text"** as a positive assertion. The publishable form is: "OpenAI's
   provenance documentation covers images and audio only; no text watermark is publicly documented."
6. **The independent black-box null result on Claude as evidence of absence.** A negative black-box test
   does not prove a watermark is absent, and its author does not claim it does. It is suggestive
   corroboration for the hedged wording and nothing more. The symmetry with our own rule is worth
   noticing: this is the same error as reading "no signal" as "a human wrote it".

### 4.2a Established from our own source, with one confirmation outstanding

| Item | Claim | Source | Outstanding |
|---|---|---|---|
| C18 | Provenance runs on uploaded JPEG, PNG, WebP and PDF; other types are reported as unread, not failed; pasted text gets no provenance verdict | `CAPABILITIES.md` §2.4 | none |
| C19 | The file is read in the browser and not uploaded to us | `CAPABILITIES.md` §2.4 | **yes** — re-read the *restored* upload path before publishing. The source describes the build before upload was dropped. If the restored path proxies the file anywhere, rewrite the entry; do not soften it. |
| C20 | Recognising a text credential's wrapper is not validating it; the trust list is consulted on neither path | `CAPABILITIES.md` §2.4, `C2PA-TEXT-CREDENTIAL-CONFLICT` §1 | none |

### 4.3 Ours, and must keep its provenance through any edit

- The robustness figures (0.6807 / 0.6521 / 0.6545 / 0.6535 over 393 / 195 / 96 / 393 positions) come
  from one 400-token fixture under `opace-demo-alpha`. Quoted without the position counts, the mark
  looks more durable than it is.
- The length figures in C13 are `length.full` 620/654 = 94.8% against `length.cut` 552/654 = 84.4%, the
  same long-form documents truncated to their first 512 words. They are not a figure for short copy;
  short marketing, SEO and social copy has none.
- Detection is identical across runtimes at 877/922 = 95.1%. False positives are not: 56/4,636 = 1.21%
  on the EU server, 90/4,636 = 1.94% in the browser. Never pair a detection rate with a false-positive
  rate without naming the runtime for both. The 1.54% and 1.34% figures are superseded.
- **One inherited discrepancy, flagged not resolved.** `PLAIN-LANGUAGE` §2 records `HANDOVER.md` and
  `thresholds.json` disagreeing on the human-fiction false-positive rate — 12.69% against 6.15% — from
  the same corpus. No entry in this pack quotes it, deliberately. Any future entry that needs it waits
  for the reconciliation.

---

## 5. Boundary friction — five cases that resist a clean split

Flagged rather than worked around, because finding these early is the point.

### 5.1 A page sentence with a hard dependency on a slot

> "Nothing changed but the key."

Pure framing, so `[PAGE]` by the rule. But it is meaningless if the three caption slots above it fail
to render, and worse than meaningless: a reader sees a confident sentence with no numbers to attach it
to. **Resolution asked for:** the page must gate this sentence on `fixtures.wrongKeyCollapse` being
present, so a slot failure removes the sentence rather than orphaning it. That is a build rule, not a
copy decision, and it needs someone to own it.

### 5.2 A claim that is also a layout instruction

> "This does not say a person wrote it. / This does not say a machine wrote it."

It is a `[CLAIM: boundary]` by definition — a statement of what the check cannot establish — but its whole
effectiveness is that it is two sentences in two blocks rather than one balanced sentence. A package
that exports it as a single string will get it rendered as one paragraph by some page, sooner or later,
and the design intent dies silently. **Resolution asked for:** export it as an ordered pair of strings,
and make rendering them as two blocks a contract rather than a convention.

### 5.3 A control label that is neither

> "Held back: removing it would destroy the content credential."

That is the label on a disabled checkbox. It asserts a consequence, which makes it claim-shaped, and it
is written for a control in a layout, which makes it page-shaped. **Genuinely ambiguous, and I have not
resolved it.** My recommendation is `[CLAIM: boundary]`, because the consequence it asserts is the whole reason
the control is disabled and it must not drift from the engine's behaviour. But it is the one item in
this pack I would expect a reviewer to overrule.

### 5.4 Interpretation of a figure, which is neither the figure nor framing

C13 reads: "detection drops from 620 of 654 to 552 of 654 ... so a weak reading on a short piece is
weak news."

The figures are slots. The word "weak" is a conclusion drawn from them, and it can become false if
the figures move. Written as page copy it goes stale silently, which is the failure mode §0.2 exists to
prevent. **Resolution asked for:** the interpretive clause is generated from the data alongside the
figure, per `PLAIN-LANGUAGE` §8.3 which already specifies a generated weakness line. It should not be
hand-written in the page, and it should not be hand-written here either — the wording in C13 is a
worked example of the output, not the string to ship.

### 5.5 Two sentences that stayed grammatical without their figure

The rule in §0.2 is that no sentence may survive its figure vanishing. Two drafts broke it and were
rewritten:

| Was | Problem | Now |
|---|---|---|
| "about one human document in four (measured on 5,558 documents)" | drop the figure and "(measured on documents)" still reads | "Measured on a corpus of 5,558 documents, these rules fired on about one human document in four." Drop either figure and the sentence breaks. |
| "No verdict below 40 scored positions" | drop the figure and "No verdict below scored positions" nearly reads | "No verdict is given below 40 scored positions." Still weak. **Flagged:** the strongest fix is that the slot renders `[[MISSING: thresholds.minScoredPositions]]` rather than nothing, which is a renderer guarantee and not something copy can achieve on its own. |

The second row generalises: sentence shape reduces the risk, it does not remove it. The renderer
guarantee in §0.2 is doing the real work, and copy discipline is the second line of defence.

---

## 6. Notes for whoever builds these pages

1. **The lab gets no accordion.** If the section 1 copy will not fit visibly, cut it rather than
   collapsing it. The only thing that should ever collapse on the lab page is the raw per-token data
   behind the colouring, which is a data dump and not an explanation.
2. **The checker's FAQ questions ship as the visible heading text.** They are written as queries, not
   as tidy headings, and the FAQPage JSON-LD in `faq-preview.html` mirrors them exactly, which is the
   condition for the markup being valid. Paraphrasing a heading for looks silently breaks the markup.
3. **The "does not mean" line is not a disclaimer and must not be styled as one.** It is the most useful
   sentence in most entries. In the preview it renders as a bordered line inside the answer, in body
   colour, never in red and never in small print.
4. **The two vocabularies stay apart.** Signal Scale words belong to the checker. Outcome names belong
   to the lab. A reviewer who sees a bare "No signal" on the lab page should treat it as a defect, not a
   near-miss — the lab's equivalent is "No signal under these keys", and the trailing words are the
   whole meaning.
5. **`0.500` prints beside every lab reading.** It is what makes the copy survive a threshold change
   without an edit, and it removes the need for a sentence explaining what a low number means.
6. **The refusals are the product.** Lab outcome 1, the "no public verifier" block, and C2, C3, C4 and
   C17 all say some version of "we cannot tell you". They are written as findings. Do not soften them
   into apologies in a later pass, and do not add a "but soon" that is not backed by something shipped.
7. **Every privacy line names its route.** The lab is browser-only and may say so plainly. The checker's
   default is the EU server. No sentence in this pack claims privacy for the product as a whole, and
   none should be added.
8. **Where a claim slot is reused across pages, render the same slot — do not restate the fact.**
   `providers.status` appears three times in this pack. Three copies of a provider fact is three things
   to update the day Anthropic ships its detector, and the one that gets missed is the one that
   embarrasses us.
