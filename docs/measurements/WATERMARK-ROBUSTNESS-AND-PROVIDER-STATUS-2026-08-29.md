# Watermark robustness disclosure and provider-claim verification

**Date:** 29 August 2026
**Agent:** W1
**Owned and edited:** `implementation/docs/WATERMARK-LAB.md`
**Not edited (hand-off below):** `implementation/README.md`, `DESCRIPTIONS.md`, `docs/CAPABILITIES.md`, website repo

---

## 1. Job 1 — the robustness table

### The problem

`WATERMARK-LAB.md` presented four rows of damage, every one of them a case where the watermark
survives, and closed with "the signal weakens but survives, and it degrades gracefully rather
than falling off a cliff". The document's own "Honest limits" section, four sections further
down, admitted that paraphrase, translation round-trips and targeted removal were unmeasured.

A reader who skims the table forms the impression that the mark is durable. The retraction four
sections later does not reach them. Absence of a row reads as absence of a problem.

### Before

```
**Robustness.** Take the strongest 400-token passage at 0.6807 and damage it:

| Damage | Mean g | Positions left |
|---|---|---|
| None | 0.6807 | 393 |
| Truncated to 50% | 0.6521 | 195 |
| Truncated to 25% | 0.6545 | 96 |
| Tokens substituted | 0.6535 | 393 |

The signal weakens but survives, and it degrades gracefully rather than falling off a cliff.
Shortening costs you *confidence* (fewer positions) more than it costs *signal strength*.
```

### After

The table now carries a **Status** column and three explicit unmeasured rows:

| Damage | Mean g | Positions left | Status |
|---|---|---|---|
| None | 0.6807 | 393 | measured |
| Truncated to 50% | 0.6521 | 195 | measured |
| Truncated to 25% | 0.6545 | 96 | measured |
| Tokens substituted | 0.6535 | 393 | measured |
| **Paraphrased** | — | — | **NOT MEASURED** |
| **Translation round-trip** | — | — | **NOT MEASURED** |
| **Targeted removal** | — | — | **NOT MEASURED** |

Changes made alongside it:

- The heading became "Robustness — and the large gap in it", with a sentence saying the
  unmeasured rows are in the table on purpose because a table of only survivable damage reads as
  a claim of general durability.
- "degrades gracefully" became "degrades gradually", and the survival sentence is now scoped:
  "Against the two edits we did measure…".
- A blockquote immediately under the table explains the mechanism: truncation and substitution
  leave most token choices in place, paraphrase replaces the token choices the g-values are
  computed from. It states that paraphrase is the most effective known attack at the lengths
  people actually paste, and that the lab says nothing about it.
- The "Honest limits" bullet now cross-references the table rows rather than being the only place
  the gap appears, and names paraphrase as the one to worry about.
- The "Planned → Adversarial robustness" item now says paraphrase should be measured first,
  against the same 400-token fixture, so the empty cells fill with our own numbers.

The point of impression formation and the point of disclosure are now the same place.

---

## 2. The paraphrase figures — **traceable, but not to peer review**

**Claim as received:** paraphrase drops matched-key detection from roughly **70% to 4–5%**.

**Source as received:** `research-watermark-tools-/Research-watermark-tools-.md` line 953, an
exported ChatGPT transcript, attributing the figures to **Unmark**
(`github.com/ivanusto/unmark-web`) as "their own numbers". The line carries no citation link.

**The transcript's attribution is wrong, and my own first attempt to check it was also wrong.**
I fetched Unmark's top-level README, found no figures, and drafted the lab document saying the
numbers were untraceable and that the project published no such benchmark. That was published,
committed and pushed before a parallel check found them. Both statements were false. Corrected in
commit two. Recorded here because it is the same failure mode the brief warned about, arriving by
a different door: I did not search hard enough and then wrote a confident negative.

### What is actually true

| Check | Result |
|---|---|
| Does Unmark publish the figures? | **Yes** — in `sidecar/README.md`, not the top-level README, under "Honest limits: read before trusting a verdict" |
| Are they Unmark's own numbers? | **No.** Unmark correctly credits "upstream". The transcript dropped that attribution |
| Where do they originate? | [github.com/xlr8harder/synthid](https://github.com/xlr8harder/synthid) — a self-published independent replication of SynthID-Text on `Qwen3-4B-Instruct-2507` |
| Is it a paper? | **No.** No peer review, no venue, no preprint |
| Is it checkable? | **Yes** — generated corpus (120,000 responses), trained detectors and prompts released publicly on HuggingFace. Reproducible in principle |
| Stated confound | The source itself: "Semantic fidelity was not independently judged" — some of the 4–5% may be rewrites that lost the meaning |

Verbatim from the upstream README, read 29 Aug 2026: "Blind rephrasing with an unwatermarked 4B
model reduced matching-key detection from roughly 70% to 4–5% among rewrites passing a 90–110%
token-length gate." Also 71.1% / 67.5% TPR for its two keys at 200 tokens and 1% FPR, and
70.8% → 33.8% purely from a sampler change.

### The numerical coincidence that nearly caused a bad citation

Krishna et al., *Paraphrasing evades detectors of AI-generated text* ([arXiv:2303.13408](https://arxiv.org/abs/2303.13408),
NeurIPS 2023, verified 29 Aug 2026) report: "DIPPER drops detection accuracy of DetectGPT from
70.3% to 4.6% (at a constant false positive rate of 1%)."

**Those are DetectGPT numbers — a post-hoc zero-shot classifier, not a watermark** — and they are
all but identical to the SynthID replication's independently measured figures. Anyone citing
"70% → 4–5%" for watermarking may be relaying the DetectGPT result by mistake. This warning is now
in the lab document.

### What the literature actually supports

Balanced, and the balance matters. Verified first-hand:

- **Nature, Dathathri et al., Supplementary §C.6** (open access via the [Springer supplementary
  PDF](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-024-08025-4/MediaObjects/41586_2024_8025_MOESM1_ESM.pdf),
  extracted and read 29 Aug 2026). 3,000 ELI5 prompts, Gemma 2B-IT and 7B-IT, 20%/50% random word
  deletion plus Gemini Ultra paraphrase. Verbatim: editing "weakens detectability, but the
  watermark can still be detected with high accuracy if the text is sufficiently long. The
  paraphrasing attack is quite strong, especially if we use a strong paraphrasing model like
  Gemini Ultra." Results are Figure C3, a plot, **not tabulated** — so the specific 70% → 4–5%
  pair cannot have come from here.
  *(My first draft said this paper was paywalled to us. The article page is behind an IdP
  redirect; the supplementary PDF is public. Corrected.)*
- **Kirchenbauer et al.**, *On the Reliability of Watermarks for LLMs*
  ([arXiv:2306.04634](https://arxiv.org/abs/2306.04634), ICLR 2024, verified 29 Aug 2026) pulls
  the opposite way: watermarks "remain detectable even after human and machine paraphrasing",
  because paraphrases leak n-grams, with detection after ~800 tokens on average at 1e-5 FPR
  following strong human paraphrase.
- **Rastogi and Pruthi** ([arXiv:2411.05277](https://arxiv.org/abs/2411.05277), verified 29 Aug
  2026): limited black-box access to a watermarked model sharpens paraphrase attacks enough to
  render the watermark ineffective. General LLM watermarking, not SynthID-specific.

**Defensible form, now used in the document:** paraphrase is the most effective known attack on
statistical text watermarks *at the lengths people actually paste*; detection degrades with
paraphrase strength and recovers with length. The flat claim "paraphrase defeats watermarking" is
not supported. This is pointed for our lab, which withholds a verdict below 40 scored positions
while typical pastes are a few hundred tokens, well short of Kirchenbauer's ~800.

### What was published

The figure is cited in `WATERMARK-LAB.md` as third-party, self-published, not peer-reviewed, with
its own semantic-fidelity confound stated, and with an explicit note that it is a different model,
different keys and different detectors from ours and does not transfer to our numbers.

## 3. Job 2 — provider claims

### 3.1 "OpenAI now ships a public C2PA + SynthID verification API"

**Status: TRUE for images and audio. FALSE for text.**

| Item | Finding | Source, read 29 Aug 2026 |
|---|---|---|
| Public tool exists | Yes, "Verify OpenAI-generated content" | `https://openai.com/research/verify/` (the transcript's URL is real; `openai.com/verify` redirects to it) |
| Public API exists | Yes: `POST /v1/content_provenance_checks`, with Python/JS/Go/Ruby SDK methods | [developers.openai.com/api/docs/guides/content-provenance](https://developers.openai.com/api/docs/guides/content-provenance) |
| What it verifies | C2PA Content Credentials **and** SynthID. Images carry both; audio carries SynthID only. No video | same |
| Accepted inputs | `image/png`, `image/jpeg`, `image/webp`; `audio/mp3`, `audio/ogg` (Opus), `audio/aac`, `audio/flac`, `audio/wav`, `audio/pcm`. 50 MiB; audio ≤ 60s | same, verified directly |
| **Plain text** | **Not accepted, in any form.** The tool takes a file upload with no text box; the API accepts image and audio MIME types only. OpenAI's help centre lists text support as a stated *goal* under the EU Code of Practice, not a shipped feature | same |

The transcript's word "authoritatively" overstates it: a hit means content likely originated from
OpenAI tools, and a miss proves nothing.

**What this changes for the product:** something real, but on the **file-upload provenance path,
not the watermark lab**. The checker already reads C2PA locally from JPEG/PNG/WebP/PDF via
`@contentauth/c2pa-web`. An OpenAI provenance call would add a SynthID image/audio signal and an
issuer attribution the local read cannot produce. It requires an OpenAI API key and a network
round trip, which collides with the product's local-first privacy posture — that is a product
decision, not a technical blocker.

**What it does not change:** anything at all about pasted text. This is the mistake the brief
predicted, and it is easy to make, because "OpenAI ships SynthID verification" sounds like it
touches a SynthID **text** lab. It does not.

### 3.2 "C2PA has a governed trust list"

**Status: TRUE. And — correcting my own first answer — C2PA now *does* reach plain text.**

| Item | Finding | Source, read 29 Aug 2026 |
|---|---|---|
| Governed conformance programme and trust list | Yes, launched mid-2025, replacing the Interim Trust List (ITL operational to 31 Dec 2025, frozen 1 Jan 2026) | [c2pa.org/conformance](https://c2pa.org/conformance/) |
| Publicly downloadable | Yes, no auth, no membership: `raw.githubusercontent.com/c2pa-org/conformance-public/main/trust-list/C2PA-TRUST-LIST.pem` (30 certs) and `C2PA-TSA-TRUST-LIST.pem` (22 certs), with `.json` equivalents. Membership is needed to *get listed*, not to *consult* | same |
| **Plain text** | **Supported since C2PA 2.3 (December 2025)**, §A.8 *Embedding Manifests into Unstructured Text* — manifest encoded as non-rendering Unicode variation selectors so credentials survive copy-paste. §A.9 (2.4) covers structured text | [C2PA Specification 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html) |
| Soft bindings for text | Yes — the approved algorithm list includes zero-width-character watermarks, SimHash text fingerprints, MinHash and semantic text watermarks | [soft binding algorithm list](https://raw.githubusercontent.com/c2pa-org/softbinding-algorithm-list/main/softbinding-algorithm-list.json) |
| Reference implementation | **No text support.** `c2pa-rs` handles images, audio, video and read-only PDF only | [c2pa-rs supported formats](https://raw.githubusercontent.com/contentauth/c2pa-rs/main/docs/supported-formats.md) |

**I got this wrong first time and shipped it.** I checked C2PA spec 2.1, found no text provision,
and published "There is no provision for plain text" in `WATERMARK-LAB.md`. The spec had moved two
minor versions on. Corrected in commit two.

**Why it still does not overlap with the watermark lab** — a better reason than the one I first
gave, and worth keeping straight:

1. **It is invisible-character metadata, and this product's other half deletes it on sight.** The
   sibling checks exist to find and strip invisible Unicode carriers. Any cleaning, normalisation
   or retyping destroys the credential. A statistical watermark lives in word choices with no
   carrier to remove. There is a genuine product tension here worth someone's attention: the
   checker's invisible-character cleaning would silently destroy a C2PA text credential.
2. **It answers a different question.** A manifest records who signed a claim about this text. It
   cannot survive paraphrase and cannot be recovered from one. The two techniques fail in opposite
   circumstances, which is the argument for pairing them.
3. **Nothing to integrate today.** No text support in `c2pa-rs`.

**What trust-list validation would take:** very little. `c2pa-rs` / `c2patool` already ship it,
off by default — the `trust` subcommand with `--trust_anchors` (accepts a URL or path to a PEM
bundle; env `C2PATOOL_TRUST_ANCHORS`), `--allowed_list`, `--trust_config`. Point `trust_anchors`
at the published `C2PA-TRUST-LIST.pem`, cache and refresh it, and chain validation plus
`validation_status` reporting comes free. This makes the `docs/CAPABILITIES.md` §2.4 boundary
("certificate trust lists are deliberately not consulted") an upgradeable disclosure rather than a
permanent limit.

### 3.3 The finding neither claim contained — Anthropic's text-watermarking commitment

> **This section's original wording is superseded and must not be quoted.** It was headed
> "**Anthropic now watermarks Claude's text**" and the table below opened with a bare "Yes". Both
> flatten a *commitment* into a claim of *coverage*, and the flattened form was retracted across the
> programme on 29–30 August 2026. Anthropic commits that Claude models launched on or after
> 2 August 2026 support marking at launch, and says it is working to add marking to models released
> earlier. **No Claude model has launched on or after that cutoff** — Opus 5 launched 24 July 2026,
> Sonnet 5 on 30 June — so the commitment covers no shipping model, Anthropic publishes no
> per-model status, and whether any given piece of Claude output carries a mark today is not
> publicly established. 2 August 2026 is also not Anthropic's date: it is when Article 50 of the EU
> AI Act began to apply, inherited as a legal boundary rather than chosen as a rollout date. The
> correct wording is in `docs/programme/CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md` §6 and
> `docs/programme/design/PROVIDER-STATUS-PANEL-2026-08-29.md` §1.3. The rest of this section —
> the private key, and the detection API being future tense and unreleased — is unaffected and
> stands.

This is the material roadmap item, and the research transcript missed it.

| Item | Finding | Source, read 29 Aug 2026 |
|---|---|---|
| Anthropic watermarks Claude text | **Committed, not demonstrated.** Models launched on or after **2 August 2026** support marking at launch; earlier models to follow during the EU AI Act transition period. No model has yet launched on or after that date, and no per-model status is published | [anthropic.com/news/claude-text-watermark](https://www.anthropic.com/news/claude-text-watermark), verified directly |
| Can a third party detect it today? | **No.** Anthropic's own wording: AI detection software uses a different method "because the companies that provide it don't have our key" | same |
| Detection API | **Future tense.** "We will soon be offering a watermark detection API. We're in the process of working out the details of its implementation." | same |

### 3.4 Any published key or detector for production **text** — from anyone

| Provider | Status |
|---|---|
| OpenAI | Nothing for text. The AI Text Classifier was withdrawn 20 July 2023 for low accuracy and has not returned |
| Google DeepMind | SynthID does watermark Gemini text, but the SynthID Detector portal is **gated** (journalist/media collaboration plus an early-tester waitlist). `google-deepmind/synthid-text` ships **no production key** — its README calls it a reference implementation not intended for production use |
| Anthropic | Watermark shipped, detection **unreleased** (§3.3) |

**Every route to production text is withdrawn, waitlisted or unreleased. There is no public key
or detector for statistical text watermarks from any of the three labs as of 29 August 2026.**

---

## 4. What changed in `WATERMARK-LAB.md`'s "What's next"

The section previously read "Waiting on the providers… If Anthropic ships text watermarking with
any public verification path…" — written as a hypothetical. Half of that hypothetical has now
happened, so the section records it, with dates and primary links, and states that the honest
status is nonetheless **unchanged**.

One distinction was added that matters for planning and did not exist before:

> A *detector endpoint* would make this product a client of Anthropic's service and would not use
> this lab's mathematics at all. Only a **published key** activates what is built here.

The brief's framing — "wiring it up is a small piece of work" — holds only for the published-key
case. If Anthropic ships an endpoint instead, the SynthID-Text port does not get used for it,
and the work is an API integration in a different part of the product. Worth knowing before
anyone budgets it as "already built".

**The binding rule is untouched.** Nothing added softens it, and the Anthropic finding
strengthens it: Claude output now genuinely carries a watermark under a key we do not have, which
makes "a score near 0.5 means no signal under this key, never proof a human wrote it" more
important to state, not less.

---

## 5. Cross-surface sweep — where else the over-reassurance appears

**Result: nowhere else.** The survival narrative is localised to `WATERMARK-LAB.md`.

Searched `implementation/` for `truncat|robust|degrad|survive|gracefully|paraphras` across all
non-vendored files.

| Surface | Finding | Action |
|---|---|---|
| `docs/WATERMARK-LAB.md` | The whole problem | **Fixed** |
| Chrome store listing (`extensions/submission/chrome-web-store/store-listing.md`) | No robustness claim of any kind. Conservative throughout | None needed |
| WordPress `readme.txt` | No robustness claim. Explicitly disclaims Claude watermark detection and removal | None needed |
| Chrome extension `panel.ts` | Renders "Official verifier unavailable" for `watermark.anthropic`. Correct | None needed |
| `packages/watermark-lab/README.md` | Mentions "4 degradation variants" as a fixture count. No survival narrative | None needed |

### Hand-off — files I do not own

**`implementation/README.md`** — no change required. Its watermark sections (lines 46–56, 119,
304–308, 531) make no robustness or durability claim. Line 119 and line 531 already state the
production-watermark boundary correctly. The only optional item, for the owning session's
judgement:

- Line 306 and line 308 describe the lab and the in-checker `watermark.known_keys` method without
  mentioning robustness at all, which is safe. If any future edit adds a durability line there,
  it must carry the paraphrase gap with it.
- Line 119 says "No public verifier exists for Anthropic production keys". **Still true on 29 Aug
  2026**, and worth keeping under review: Anthropic has said a detection API is coming. When it
  ships, this line and line 531 both need revisiting. Flagging so it is not missed.

**`implementation/DESCRIPTIONS.md`** — no change required. Line 95 (`@opace/watermark-lab` copy)
states demo-keys-only and the 0.5 boundary correctly and makes no robustness claim. Line 127 and
line 161 are likewise clean. Optional, for the owning session:

- Line 95 could gain four words — "robustness against paraphrase unmeasured" — but the copy is
  already boundary-heavy and this is a judgement call about listing length, not a correction.

**`docs/CAPABILITIES.md`** (not owned) — two items, neither a falsehood:

- Line 571 lists "truncation and substitution degradation variants" as a factual fixture
  inventory. Accurate. It inherits the same omission as the old table but does not editorialise
  about survival, so it does not mislead on its own. Adding "paraphrase unmeasured" would align
  it with the corrected lab doc.
- Line 72 states certificate trust lists are deliberately not consulted. Still accurate, and now
  upgradeable — see §3.2.

**Website repo** (not in this tree; `local-signals-ui.ts` and `thresholds.json` owned by another
session) — I could not inspect the live checker's watermark section or the Readiness Lab page
copy, because neither is in this repository. **Requested check for whoever owns it:** if either
surface reproduces the four-row robustness table or any "degrades gracefully" phrasing, it needs
the same three unmeasured rows and the paraphrase note. If it only shows the wrong-key collapse
and the per-key table, no change is needed. Exact wording to use if it does, matching the doc:

> Truncation and token substitution are measured. Paraphrase, translation round-trips and
> targeted removal are **not measured**. Paraphrase is the attack most likely to defeat this
> technique, and this lab says nothing about it.

---

## 6. Answers to the three questions asked

1. **Are the paraphrase figures traceable?** **Yes, but not to peer review** — and my first answer
   of "no" was wrong and was briefly published. They originate in
   [xlr8harder/synthid](https://github.com/xlr8harder/synthid), a self-published independent
   replication on `Qwen3-4B-Instruct-2507` with released HuggingFace artefacts, relayed through
   Unmark's `sidecar/README.md`, which credits upstream correctly; the ChatGPT transcript dropped
   that credit. They are cited in the lab document as third-party, self-published, not
   peer-reviewed, carrying their own "semantic fidelity was not independently judged" confound,
   and explicitly not transferable to our GPT-2 fixtures. A near-identical pair of numbers
   (70.3% → 4.6%) belongs to Krishna et al. for **DetectGPT, not a watermark**; that conflation
   risk is now flagged in the document.
2. **Does either provider claim hold for text?** Both claims are **true**. On text:
   - **OpenAI: no.** `POST /v1/content_provenance_checks` accepts image and audio MIME types only.
     Text support is a stated goal, not a shipped feature.
   - **C2PA: yes, since spec 2.3 (Dec 2025)** — §A.8 embeds manifests in plain text via Unicode
     variation selectors. This corrects my first answer. It still does not overlap the watermark
     lab: it is strippable invisible-character metadata that this product's own cleaning would
     destroy, it cannot survive paraphrase, and `c2pa-rs` has no text support to integrate.
3. **What changes for the roadmap?** The lab's status is unchanged: ready, unproven against
   production output. Around it, four things:
   - **Anthropic has committed to watermarking Claude text** — models launched on or after
     2 Aug 2026, a set that is currently empty — under a private key, with the detection API
     promised but unreleased. The item to track. *(Corrected: this bullet previously read
     "Anthropic now watermarks Claude text", which is the retracted coverage claim. See §3.3.)* Note that a detector *endpoint* makes this
     product a client and does not use this lab's mathematics; only a **published key** does.
   - **C2PA trust-list validation** is a contained upgrade to the existing file path, using flags
     `c2pa-rs` already ships.
   - **OpenAI's provenance API** is a real addition to that same file path, at the cost of a
     network call against a local-first posture.
   - **C2PA text credentials create a product tension** nobody has looked at: the checker's
     invisible-character cleaning would destroy them. Worth a decision before it surprises someone.
   - The one piece of unmeasured science belonging to this lab is **paraphrase robustness**, and
     nothing external blocks it.

---

## 7. Process note, recorded deliberately

This report initially contained three false statements, two of which were committed and pushed
before being caught by a parallel check:

| False statement | Reality | Caught by |
|---|---|---|
| "The paraphrase figures are not traceable; Unmark publishes no such benchmark" | They are in Unmark's `sidecar/README.md`, credited upstream to xlr8harder/synthid | Parallel agent that cloned the repo rather than fetching the README |
| "C2PA has no provision for plain text" | §A.8 since spec 2.3, Dec 2025. I checked spec 2.1 | Same |
| "The Nature paper is paywalled to us" | The article page is behind an IdP redirect; the supplementary PDF is public and contains §C.6 | Same |

Two further errors were caught **before** publication, during drafting: an assertion that the
Nature paper reports paraphrase degradation (not then verified) and an assertion that Rastogi and
Pruthi measured SynthID specifically (they do not).

The pattern in all five is the same, and it is not the one the brief anticipated. The brief warned
against repeating an unverified claim as fact. What actually went wrong was the mirror image:
writing confident **negatives** from a search that stopped too early. "Not found" was treated as
"does not exist" three times. A negative claim needs the same evidence standard as a positive one,
and checking one README or one spec version is not that standard.
