# Claim wording correction register

**Date:** 29 August 2026
**Agent:** CW-1
**Status:** register only. No file in this programme was edited to produce it, apart from this one.
**Applies to:** live site, `opace-website/astro-latest/src`, `implementation/**` shipped copy, and the redesign mockups now at `implementation/docs/programme/design/mockups/**`.

Another session applies these. Every entry gives the file, the exact current wording, why it is
wrong, the exact replacement, and a severity.

**How the live pages were read.** `curl` with a browser User-Agent and `Cache-Control: no-cache`,
directly against `https://opace.agency`, on 29 August 2026. No browser, so no page cache and no
`transferSize` ambiguity; the deployed JavaScript bundle was fetched separately by its hashed
filename and read as text. Live line numbers below are positions in the extracted visible text of
the fetched HTML, not source lines; the source line is given alongside wherever the copy was
traced back to `src`.

**What was run.** `implementation/tests/battery/shipped-claims-guard.test.mjs` — 3 tests, all
pass, so nothing in this register is something the guard already blocks. Every replacement wording
proposed here was then run past the guard's five `BANNED` patterns in isolation: all pass.

---

## 0. Read this first — the live site is behind `main`

This is the single most consequential thing found, because it changes who has to act.

`opace-website/astro-latest` is on `main` at `f321e8da`. The deployed pages do **not** contain
`DEFAULT_ROUTE_ACCURACY` (commit `c570440c`, "publish the measured figures, with their denominators
and their register"), and the deployed checker bundle
`/_astro/checker.astro_astro_type_script_index_0_lang.C8wEZR-9.js` contains no
`detectC2paTextCredentials`, no `c2pa_text_credential` skip reason and no `C2PATXT` magic (commit
`c841a658`, the C2PA text-credential guard). Both were verified by fetching the bundle and
grepping it.

Consequences, both of which are live right now:

1. The checker's model card is publishing **superseded, wrong-runtime detection figures** (§1.1).
   The corrected sentence already exists in source and is simply not deployed.
2. The checker's invisible-character fix is **still silently destroying C2PA text credentials**,
   and no live copy warns about it (§4.1). The fix exists in source and is not deployed.

**Several entries in this register need a deploy, not an edit.** Whoever owns the website branch
should treat that as the first action.

---

## 1. Live site — report first, as instructed

### 1.1 Checker: superseded figures, wrong runtime, no weakest case

- **Where:** live <https://opace.agency/tools/ai/content-verification-integrity/checker/>,
  "Named signals model (beta)" card. Source of the corrected text:
  `opace-website/astro-latest/src/lib/local-signals/published-figures.ts:42`
  and its call site
  `.../src/pages/tools/ai/content-verification-integrity/checker.astro:33`.
- **Current live wording:** "Measured on 5,558 long-form documents it had never seen, it detects
  about 90% of AI long-form writing and wrongly flags about 1.3% of human long-form writing. It
  runs on our EU server by default…"
- **Why it is wrong:** three breaches at once. The 90.3% / 1.34% pair was measured through the
  **int8 browser runtime, before segmentation existed**; it is printed here inside the card that
  says the check runs on the **fp32 EU server**. That is exactly the "Python, fp32-server and
  int8-browser numbers are never interchangeable" rule, and it is defect 5 in the guard's own
  header comment recurring. It also carries no weakest-case figure, which `DESCRIPTIONS.md` §6
  makes mandatory. `public/models/local-signals-v1/thresholds.json` publishes the correct pair for
  this route at the shipped threshold 0.984: `877/922 (95.1%)` detection at `56/4,636 (1.21%)`
  false positives.
- **Exact replacement** (this is what `DEFAULT_ROUTE_ACCURACY` already renders; deploying `main` is
  the fix):
  > Measured on the whole corpus, through the fp32 runtime our EU server runs: it detects 877/922
  > (95.1%) of AI long-form writing and wrongly flags 56/4,636 (1.21%) of human long-form writing.
  > Long-form only: short marketing, SEO and social copy has never been measured on independent
  > data.
- **Severity: must fix before next deploy** — and it is fixed in source, so the action is *deploy*,
  then confirm the string "Long-form only" appears on the live page.

### 1.2 Checker: "Anthropic has said newer Claude models carry text watermarking"

- **Where:** live checker, §01 intro paragraph.
  `.../src/pages/tools/ai/content-verification-integrity/checker.astro:20`
- **Current wording:** "Anthropic has said newer Claude models carry text watermarking of the same
  family as Google DeepMind's SynthID-Text."
- **Why it is wrong:** this is the coverage-for-commitment error in its purest form and it does not
  contain the date, which is why the date sweep alone would have missed it. "newer Claude models
  carry" is a present-tense statement about what Claude text contains today. Anthropic's own
  wording is a commitment: models *launched on or after* 2 August 2026 are watermarked from launch,
  earlier models transition later, no model-by-model status published. Separately, "of the same
  family as … SynthID-Text" is a technical equivalence Anthropic's help-centre text does not state
  in those terms; our own research note records it as "an imperceptible watermark directly into the
  text itself". `[DEPENDS ON RV-1]` for both the rollout wording and the SynthID attribution.
- **Exact replacement, cautious reading:**
  > Anthropic has committed to watermarking Claude models launched on or after 2 August 2026 from
  > launch, and says models released before that date are being transitioned over the following
  > months. It has not published a model-by-model rollout status, so nothing here can tell you
  > whether a given piece of Claude text carries a mark.
- **Severity: must fix before next deploy.** It sits two sentences from "The SynthID detection
  mathematics … also runs here as the watermark scan", and the juxtaposition invites the reader to
  think our scan bears on Claude.

### 1.3 Checker: "production verification of Claude output is impossible for anyone"

- **Where:** live checker, same paragraph.
  `.../checker.astro:20`
- **Current wording:** "production verification of Claude output is impossible for anyone without
  Anthropic's private key"
- **Why it is unsafe:** an unqualified absolute that will age badly within weeks. Anthropic has
  announced a detection API; when it ships, "impossible for anyone" is false and we will have said
  it on the highest-traffic page. The defensible claim is about today's public availability, not
  about possibility.
- **Exact replacement:**
  > no public verifier for Anthropic's production watermark exists today, so that is reported
  > honestly as not assessed rather than guessed
- **Severity: must fix before next deploy.**

### 1.4 Lab and research note: "Anthropic's 14 August 2026 announcement"

- **Where:** live <https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/>
  §01, and live <https://opace.agency/research/claude-synthid-text-watermark/> first paragraph.
  `.../src/pages/tools/ai/content-verification-integrity/claude-watermark-readiness-lab.astro:16`
  and
  `.../src/pages/research/claude-synthid-text-watermark.astro:11`
- **Current wording:** "Anthropic's 14 August 2026 announcement describes watermarking for future
  supported Claude models and a detector planned for its API."
- **Why it is wrong:** two errors pointing in opposite directions. The date, 14 August, contradicts
  the 2 August date used everywhere else in the programme — one of them is wrong and both are on
  live pages. And "for future supported Claude models" is the *under*-claim: it implies no current
  Claude model is watermarked, when Anthropic's position is that models launched on or after the
  commitment date are watermarked from launch. This is the mirror image of §1.2 and belongs on the
  same change list. `[DEPENDS ON RV-1]` for the date.
- **Exact replacement, cautious reading:**
  > Anthropic's announcement commits to watermarking Claude models launched on or after 2 August
  > 2026 from launch, with models released before that date transitioning over the following
  > months, and no model-by-model rollout status published. Anthropic has announced, but not
  > released, a public watermark detection API. There is therefore currently no authoritative
  > public method for verifying Anthropic's production text watermark.
- **Severity: must fix before next deploy.**

### 1.5 Lab: "This is why nobody can check for Claude's watermark"

- **Where:** live lab, wrong-key collapse caption.
  `.../src/components/tools/content-integrity/watermark-lab/WatermarkLabSection.astro:66`
- **Current wording:** "Same text, wrong key: the signal vanishes. This is why nobody can check for
  Claude's watermark without Anthropic's private key."
- **Why it is wrong:** the possessive "Claude's watermark" asserts, in passing, that arbitrary
  Claude text carries one — the coverage claim again, in a caption nobody would think to audit.
  "nobody can" is the same absolute as §1.3.
- **Exact replacement:**
  > Same text, wrong key: the signal vanishes. That is why a watermark can only be checked by
  > whoever holds the key it was written with, and why no public verifier for Anthropic's
  > production watermark exists today.
- **Severity: must fix before next deploy** (breaches the binding rule that the lab says nothing
  about Claude production watermarks).

### 1.6 Lab and research note: stale verification dates

- **Where:** live lab hero kicker "Public research boundary · Updated 26 August 2026"; status token
  `unavailable-2026-08-26`; research note kicker "Opace research · 26 August 2026" with JSON-LD
  `dateModified:"2026-08-27"`.
  `claude-watermark-readiness-lab.astro:15`,
  `claude-synthid-text-watermark.astro:7,10`
- **Why it matters:** these pages exist to state a provider status. A dated status three days stale
  is a claim that the world has not moved, and the provider situation is precisely what is moving.
- **Replacement:** re-date to the day the canonical block in §6 is re-verified, and move both to
  that block so the date is set in one place.
- **Severity: fix when touched**, but it must be done in the same change as §1.4.

### 1.7 Suite index: "The local AI Content Integrity Checker is available on this site"

- **Where:** live <https://opace.agency/tools/ai/content-verification-integrity/>, FAQ "Which tools
  are available now?".
  `.../src/data/content-integrity.ts:52`
- **Current wording:** "The local AI Content Integrity Checker is available on this site."
- **Why it is wrong:** "local" is a route claim, and the checker's default route is an EU server.
  The same page says so correctly twice (hero, and §03 "Where your text goes"), so the page
  contradicts itself. This is the "runs locally" family the guard exists to catch; the guard's
  `never-uploaded` pattern does not match this phrasing, which is why it survived.
- **Exact replacement:**
  > The AI Content Integrity Checker is available on this site.
- **Severity: must fix before next deploy.**

### 1.8 Suite index: model route described as browser-only

- **Where:** live suite index §02, "Keep methods separate" card.
  `.../src/pages/tools/ai/content-verification-integrity/index.astro:17`
- **Current wording:** "an optional beta local model can be downloaded on explicit consent with its
  measured accuracy always shown"
- **Why it is wrong:** describes only the browser route, on a page whose hero already says the model
  scores on the EU server by default. A reader who stops at this card leaves with the wrong mental
  model of where their text goes.
- **Exact replacement:**
  > the beta AI model scores on our EU server by default and can be moved into your browser on
  > explicit consent, with its measured accuracy always shown for the route that ran
- **Severity: must fix before next deploy** (privacy statement that does not name its route).

### 1.9 Live pages say nothing about text credentials

Covered in §4.1. It is a live-site finding and belongs in the deploy that fixes §1.1.

**Nothing else on the three live pages breached the binding rules.** In particular the live
answers "A result near the 0.5 no-watermark value under our demo keys says nothing about any
provider's production watermark, in either direction", "a score near 0.5 never proves a human wrote
something", "this lab does not promise to remove a Claude watermark" and the per-route privacy
paragraphs at §03 and in the paste box are correct as written and should not be touched.

---

## 2. The 2 August contradiction — complete list, both wordings

The coordinator asked for every instance of each side so one change list covers whichever reading
RV-1 confirms. This is that list. Nothing here should be edited until RV-1 reports.

### 2.1 Coverage wording (asserts Claude text is watermarked today)

| Location | Exact wording | Notes |
|---|---|---|
| `implementation/docs/WATERMARK-LAB.md:291` | "**Anthropic now watermarks Claude's text.** Models launched on or after 2 August 2026 carry a watermark, with older models to follow" | The bold lead is the flattened claim; the sentence after it is correct. `[BLOCKED — ownership unresolved]` |
| `checker.astro:20` (live) | "Anthropic has said newer Claude models carry text watermarking…" | §1.2. No date, so the date sweep misses it |
| `WatermarkLabSection.astro:66` (live) | "nobody can check for **Claude's watermark**" | §1.5. Possessive presumes coverage |
| `mockups/watermark-lab.html:652` | "This is why nobody can check for Claude's watermark without Anthropic's private key." | Mirror of the live string |
| `mockups/_source/watermark-lab.tpl.html:64` | identical | Template that regenerates the above |
| `mockups/watermark-lab-v2.html:550` | "This is why nobody can check a piece of text for Claude's…" | |
| `mockups/index.html:769` | "That is the clearest explanation of why nobody can check text from Claude." | |
| `mockups/_source/index.tpl.html:181` | identical | |
| `mockups/system.html:1399` and `_source/system.tpl.html:574` | "Anthropic keeps the key private, so nobody can check…" | Absolute, not a coverage claim; fix with §1.3's wording |
| `implementation/wordpress/opace-ai-content-integrity/readme.txt:84` | "does not claim to detect or remove **Claude's production watermark**" | Possessive again. In a *disclaimer*, so the risk is lower, but the same presupposition |
| `readme.txt:115` | "Does it remove **Claude's SynthID watermark**?" | Names the scheme *and* presumes coverage, in a heading, in a file destined for WordPress.org |
| `README.md:41` | "Clearing Copyleaks or Originality does not prove **a Claude watermark** was removed." | Indefinite article; acceptable as-is |

### 2.2 Commitment wording (correct shape, still needs the rollout caveat)

| Location | Exact wording | Notes |
|---|---|---|
| [`docs/measurements/WATERMARK-ROBUSTNESS-AND-PROVIDER-STATUS-2026-08-29.md`](../measurements/WATERMARK-ROBUSTNESS-AND-PROVIDER-STATUS-2026-08-29.md) §3.3 | "Yes. Models launched on or after **2 August 2026**; earlier models to follow during the EU AI Act transition period" | The "Yes." in the *Confirmed?* column is the flattening. Internal doc |
| `research/SYNTHID-AND-ORIGINALITY-DEEP-DIVE.md:72` | "Claude models launched on or after **2 August 2026** weave 'an imperceptible watermark directly into the text itself'" | Correct shape, correctly sourced. Use this as the source of record, not the flattened forms |
| `research/SYNTHID-AND-ORIGINALITY-DEEP-DIVE.md:150` | "Anthropic states that Claude models launched on or after 2 August 2026 embed text markings" | Correct |
| `claude-watermark-readiness-lab.astro:16`, `claude-synthid-text-watermark.astro:11` (live) | "watermarking for **future** supported Claude models" | The opposite error. §1.4 |
| `README.md:15` | "Anthropic has announced **SynthID-based** text watermarking, but its production detector API is still forthcoming." | Commitment shape is right; the SynthID attribution is the unsourced part. `[DEPENDS ON RV-1]` |

**Severity for the whole of §2: must fix before next deploy** for the five live strings; **fix when
touched** for the mockups and internal docs, except `WATERMARK-LAB.md:291`, which is
`[BLOCKED — ownership unresolved]` (proposed text in §5).

---

## 3. Percentages, denominators and superlatives

### 3.1 `DESCRIPTIONS.md` — "That model runs locally in the free Opace web checker"

- **Where:** `implementation/DESCRIPTIONS.md:38`
- **Current wording:** "That model runs locally in the free Opace web checker, measured at 90.3%
  detection and 1.34% false positives on 5,558 documents it had never seen"
- **Why it is wrong:** two breaches in one clause. "runs locally" is false for the default route,
  in the file whose own §"Why the first line is worded that way" explains that this exact mistake
  propagated to four surfaces. And the figures are the superseded pre-segmentation browser pair,
  quoted without naming the runtime.
- **Exact replacement:**
  > That model runs in the free Opace web checker: on our EU server by default, or on your device
  > if you choose. Measured through the fp32 runtime our EU server runs, on 5,558 long-form
  > documents it had never seen, it detects 877/922 (95.1%) of AI long-form writing and wrongly
  > flags 56/4,636 (1.21%) of human long-form writing.
- **Severity: must fix before next deploy** — this file is the source every listing is pasted from.

### 3.2 `DESCRIPTIONS.md` — WordPress short description contradicts the mandatory footer

- **Where:** `implementation/DESCRIPTIONS.md:22`
- **Current wording:** "Local, private, explainable. Never uploads your content."
- **Why it is unsafe:** it is true of the plugin as built and false of the product family the
  footer describes, twelve lines below a paragraph banning exactly this construction. "Never
  uploads your content" is also the literal probe string for the guard's `never-uploaded` rule; the
  guard does not read this file, only the website, so it does not fire. A future listing writer
  copying the short description into a surface that *does* have the model route reintroduces the
  original defect verbatim.
- **Exact replacement:**
  > Find hidden AI fingerprints, flag AI-style writing signals and protect your facts. Every check
  > in this plugin runs inside your WordPress admin and sends nothing.
- **Severity: must fix before next deploy.**

### 3.3 `DESCRIPTIONS.md` — "Does my content leave my site? No … no remote fallback"

- **Where:** `implementation/DESCRIPTIONS.md:47`
- **Why it needs work:** accurate for the plugin, but the answer never names the plugin as its
  scope, so it reads as a product-family claim. The rule is that a privacy statement names its
  route; it should also name its surface.
- **Exact replacement:**
  > **Does my content leave my site?** Not from this plugin. Every check it runs happens in your
  > browser's admin session, with no telemetry and no remote fallback. The Opace web checker is a
  > different surface and states its own routes.
- **Severity: fix when touched.**

### 3.4 Claims ladder currency note is now itself out of date

- **Where:** `implementation/DESCRIPTIONS.md:135`
- **Current wording:** "The browser runtime's own segmented curve over the full corpus has not been
  measured (about five hours of compute), so the browser figures remain the ones quoted publicly
  and should be read as a floor rather than as current."
- **Why it is wrong:** `thresholds.json` now publishes `browser_int8_segmented` with
  `pending_remeasurement: false` — 621/654 (95.0%) detection, 43/1,770 (2.4%) false positives on a
  2,424-document stratified sample, 1.54% reweighted. The measurement the note says is missing
  exists. Leaving the note as written keeps the superseded 90.3% / 1.34% pair blessed as "the ones
  quoted publicly", which is what §1.1 and §3.1 are downstream of.
- **Exact replacement:** replace the note with the two runtimes' current operating points, each
  labelled, taken verbatim from `thresholds.json`, and strike the instruction to keep quoting the
  browser pair.
- **Severity: must fix before next deploy.** Every other figure correction depends on this one.

### 3.5 Percentages that are fine

Checked and **not** findings, recorded so nobody re-audits them: `45.1%` / `24.8%` always appear
together with "5,558 long-form documents"; `12.69%` always appears as "33 of 260"; the per-register
tables in `thresholds.json` carry numerator and denominator throughout; the live checker's rules
paragraphs carry corpus, both rates and the demotion date. No bare superlative about human writing
was found on any surface — the engine-side guard is doing its job.

### 3.6 Absolutes to retire wherever they appear

"impossible for anyone", "nobody can", "no amount of mathematics". Each is a claim about the state
of the world rather than about our tool, and each becomes false the day a provider ships a
verifier. The safe form is always: *no public verifier exists today*. Instances: §1.3, §1.5, §2.1
rows for `system.html` / `system.tpl.html`, and
`implementation/docs/WATERMARK-LAB.md:25`
("no amount of mathematics here says anything about Claude output" — `[BLOCKED]`).
**Severity: fix when touched**, except the two live ones.

---

## 4. C2PA — reading a wrapper is not validating a credential

`C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md` §5.3 names the documents needing this correction and
records that it has not been actioned. It still has not been. All three items below are open.

### 4.1 No live copy discloses the text-credential destruction

- **Where:** live checker FAQ "Can the checker remove every invisible character?" and the file-check
  card; source
  `.../src/data/content-integrity.ts`
- **Current wording:** "No. It previews only selected, allowlisted treatments. Joiners, combining
  marks, ambiguous bidirectional controls, links, code, quotations and protected spans are not
  changed automatically."
- **Why it is unsafe:** the deployed bundle contains no text-credential guard (verified by grep of
  the hashed bundle), so on the live page the default safe-fix still strips U+FE00–U+FE0F and can
  strip the U+FEFF sentinel, destroying a C2PA text credential irrecoverably and silently. The
  answer lists what is *protected* and omits the one thing that is destroyed.
- **Exact replacement, to ship with the deploy of `c841a658`:**
  > No. It previews only selected, allowlisted treatments. Joiners, combining marks, ambiguous
  > bidirectional controls, links, code, quotations, protected spans and the characters carrying a
  > C2PA text credential are not changed automatically.
- **Severity: must fix before next deploy.**

### 4.2 `implementation/docs/CAPABILITIES.md` honest-limits section

- **Where:** `implementation/docs/CAPABILITIES.md:613`–`621`
- **Why:** §5.3 asks for it explicitly, and nothing in the file yet separates recognising a wrapper
  from validating a credential.
- **Exact text to add:**
  > **Text credentials are recognised, not validated.** The checker detects a C2PA §A.8 text
  > credential wrapper — the U+FEFF sentinel, the `C2PATXT\0` magic and the declared manifest
  > length — and holds its 257 carrier code points back from the safe-fix path. It does not parse
  > the manifest, does not check its signature and consults no trust list. Recognising a wrapper
  > is not validating a credential. `c2pa-rs`, the reference implementation, still has no text
  > support, so there is nothing further to integrate for reading one today.
- **Severity: fix when touched** (documentation, no shipped claim depends on it).

### 4.3 `implementation/docs/WATERMARK-LAB.md` §3.2

`[BLOCKED — ownership unresolved]`. Proposed text in §5.

---

## 5. Proposed text for `implementation/docs/WATERMARK-LAB.md` — `[BLOCKED — ownership unresolved]`

Do not edit that file. These are the three changes to make when ownership resolves.

**(a) Line 291, the coverage claim.** Replace:

> - **Anthropic now watermarks Claude's text.** Models launched on or after 2 August 2026 carry a
>   watermark, with older models to follow

with:

> - **Anthropic has committed to watermarking Claude's text.** Models launched on or after 2 August
>   2026 are watermarked from launch, and models released before that date are being transitioned
>   over the following months. Anthropic has not published a model-by-model rollout status, so no
>   statement can be made about whether a given piece of Claude text carries a mark.

**(b) Line 25, the absolute.** Replace "Without Anthropic's key, no amount of mathematics here says
anything about Claude output" with "Without Anthropic's key, nothing computed here says anything
about Claude output, and no public verifier for Anthropic's production watermark exists today."

**(c) §3.2, the C2PA tension.** Upgrade from a flagged tension to a resolved one, per
`C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md` §5.3: name the 257 carrier code points, name the
guard in `previewSafeFixes`, and state that the guard is in the website commit and **not yet
deployed**, so the tension is resolved in source and open in production.

Lines 296–300 of that file already say that a provider detector endpoint "would make this product a
client of Anthropic's service and would not use this lab's mathematics at all". That is the
correct framing and should be preserved verbatim; it is the sentence §6 below generalises.

---

## 6. The canonical provider-status block

One block, reused verbatim by the lab, the checker, the research note, `README.md`,
`DESCRIPTIONS.md`, the WordPress `readme.txt` and every store listing. It should live in one file
and be imported or transcluded, not retyped — `src/lib/local-signals/published-figures.ts` is the
working precedent for why that matters.

Every line below carries `[DEPENDS ON RV-1]` and is written to the cautious reading.

---

> **Provider watermark status — last verified 29 August 2026.**
> *Re-date this block every time it is republished. If this date is older than the page carrying
> it, treat the block as unverified rather than as current.*
>
> - **Google Gemini.** Google states that Gemini text output carries SynthID-Text. The detection
>   method is published as an Apache-2.0 reference implementation, but Google's production keys are
>   private and Google operates no public text verifier, so Gemini text cannot be verified here.
> - **Anthropic Claude.** Anthropic has committed to watermarking Claude models launched on or
>   after 2 August 2026 from launch, and says models released before that date are being
>   transitioned over the following months. It has not published a model-by-model rollout status,
>   so nothing can be said about whether a particular piece of Claude text carries a mark.
>   Anthropic has announced, but not released, a public watermark detection API, so there is
>   currently no authoritative public method for verifying Anthropic's production text watermark.
> - **OpenAI ChatGPT.** OpenAI has published no production text watermark and operates no public
>   text verifier, so ChatGPT text cannot be verified here.
> - **What this means here.** Our watermark scan runs the published SynthID-Text detection
>   mathematics against our own three public demo keys. It cannot verify or rule out any provider's
>   production watermark, and a score near the 0.5 no-watermark value under our demo keys says
>   nothing about any provider's production watermark, in either direction. A provider shipping a
>   detection endpoint would not change that: calling someone else's endpoint would make us their
>   client and would not exercise this mathematics at all. Only a **published key** activates what
>   we have built.

---

**Notes for whoever installs it.**

- The fourth bullet is not optional padding. Any copy implying that an Anthropic detector launch
  unlocks our lab is a finding regardless of how the rollout question resolves, and this bullet is
  the sentence that forecloses it.
- The block was run past all five `BANNED` patterns in
  `implementation/tests/battery/shipped-claims-guard.test.mjs`: no match.
- Consider adding a sixth guard rule while installing it, since none of the four highest-severity
  findings in this register would have failed the existing five:

  ```
  { id: "claude-coverage",
    pattern: /(anthropic (now )?watermarks|claude'?s (production )?(text )?watermark\b|claude (text|output) (is|are) watermarked|newer claude models carry)/i,
    why: "A commitment to watermark is not a coverage claim about existing model output.",
    fix: "Use the canonical provider-status block." }
  ```

  Its own probe strings, for the guard's self-test: `"Anthropic now watermarks Claude's text"` and
  `"Anthropic has said newer Claude models carry text watermarking"`.

  The rule was tested before proposing it, because a guard that fires on correct copy gets disabled
  and then guards nothing. It matches all four coverage strings found in this sweep
  (`WATERMARK-LAB.md:291`, `checker.astro:20`, `WatermarkLabSection.astro:66`, `readme.txt:84`) and
  none of the five correct disclaimers currently shipping: "Anthropic production watermark: no
  public verifier exists; not assessed", "Anthropic has committed to watermarking Claude models
  launched on or after 2 August 2026 from launch", "this lab does not promise to remove a Claude
  watermark", "it cannot verify or rule out Gemini or Claude watermarks", "Claude production
  verification is not available".

---

## 7. Two gaps in the guard itself

Recorded because they explain why this register is as long as it is, not as work items for the
applying session.

1. **`SKIP_DIRS` excludes `content`.** The blog lives there, including
   `content/blog/ai-content-detection-tools.md`, which discusses watermarking and detection and is
   a shipped surface reaching visitors. It is unscanned. Whether that is deliberate should be a
   recorded decision rather than an artefact.
2. **The guard reads the website only.** `implementation/DESCRIPTIONS.md` is the file every listing
   is pasted from, and it currently contains the guard's own `never-uploaded` probe string at line
   22 and a "runs locally" claim about the model at line 38. Pointing the guard at
   `DESCRIPTIONS.md`, `README.md` and `wordpress/**/readme.txt` would have caught §3.1 and §3.2 the
   day they were written.

---

## 8. Summary

| Severity | Count | Items |
|---|---|---|
| Must fix before next deploy | 11 | §1.1, §1.2, §1.3, §1.4, §1.5, §1.7, §1.8, §3.1, §3.2, §3.4, §4.1 |
| Fix when touched | 5 | §1.6, §3.3, §3.6, §4.2, §2.1 mockup rows |
| Blocked on ownership | 3 | §5(a), §5(b), §5(c) |
| Note only | 2 | §7.1, §7.2 |

Two of the eleven must-fixes (§1.1, §4.1) need a **deploy**, not an edit: the corrections already
exist in `opace-website` `main` and are not live.

**Not settled here, by instruction:** whether Anthropic's announcement is dated 2 or 14 August, and
whether the scheme is SynthID-based. RV-1 owns both. Every entry that turns on either is marked
`[DEPENDS ON RV-1]` and written to the cautious reading, so applying this register before RV-1
reports is safe — it removes claims rather than adding them.

---

# Applied by B8 — 29 August 2026

## A. Why the live site is behind `main`

Not a configuration fault, not a cache, and no code change clears it. **The Netlify account has
exhausted its build credits, and auto top-up is off.** Every build since 16:50 UTC has been
refused before it started.

Established from the Netlify API (`netlify api listSiteDeploys`, site `opace-latest`; the site
identifier is held privately):

| created (UTC) | commit | state | message |
|---|---|---|---|
| 17:01 | `173a756e` | error | Skipped due to account credit usage exceeded |
| 16:53 | `441a8fc7` | error | Skipped due to account credit usage exceeded |
| 16:50 | `f321e8da` | error | Skipped due to account credit usage exceeded |
| 16:03 | `a840a198` | **ready** | published 16:04 — still what production serves |

`listAccountsForUser` corroborates it: the account's build-credit allowance was exhausted,
automatic top-up was off, and a one-off grace top-up granted four minutes after the last successful
build had itself been spent. The exact plan, allowance and account fields are commercial detail and
are held privately rather than published here.

**This is the owner's to clear.** Topping up credits or enabling auto top-up is a billing action
and was not taken. Pushing again only queues another refusal.

**Rollback target, once builds resume:** `a840a198` (deploy `6a9302cfe0dbec000862f8cb`).

### A correction to the diagnosis in §0

§0 reported that the measured figures were partly live — `95.1`, `1.21` and `877` present in the
checker bundle — and called the deploy internally inconsistent. **They are not present.** Those
are unanchored digit runs inside 287 KB of minified JavaScript. Anchored, every one is absent:

| pattern | checker bundle | inspect | engine.CbrPRhEe |
|---|---|---|---|
| `877/922` | 0 | 0 | 0 |
| `95.1%` | 0 | 0 | 0 |
| `56/4,636` | 0 | 0 | 0 |
| `DEFAULT_ROUTE_ACCURACY` | 0 | 0 | 0 |
| `Long-form only` | 0 | 0 | 0 |

The deploy is entirely `a840a198` and entirely consistent with it. Three agents lost time to that
apparent contradiction; it was a grep artefact. Anchor a figure probe on its denominator or its
percent sign.

## B. Live state at 17:05 UTC, before any of this landed

Fetched from `https://opace.agency`, chunk names taken from the returned HTML.
`cache-status: "Netlify Edge"; hit; ttl=-52`, `etag ad983ff8…` — the edge is serving the
16:03 build, and no query string busts it because the query is not in the cache key.

| chunk | `detectC2paTextCredentials` | `C2PATXT` | `c2pa_text_credential` |
|---|---|---|---|
| `checker.astro_…C8wEZR-9.js` (286,988 B) | 0 | 0 | 0 |
| `inspect.CKWl8ZqR.js` (37,890 B) | 0 | 0 | 0 |
| `engine.CbrPRhEe.js` (1,596,408 B) | 0 | 0 | 0 |
| `engine.DWfGr2EY.js` (3,656 B) | 0 | 0 | 0 |

HTML: `about 90` ×1, `about 1.3` ×1, `Long-form only` ×0.

**So both live defects stand: the C2PA text-credential guard is not deployed, and the checker
still prints the superseded browser pair under a card describing the EU server route.**

**Live verification is OUTSTANDING, not passed and not skipped.** The probe to run when builds
resume: `CHECKER_BASE_URL=https://opace.agency npm run test:live`. A changed chunk hash is itself
the signal that the deploy landed — the local build produces `…BmBg5FTU.js`.

## C. What was changed — commit `01727429`, on `main`, **not pushed**

Held back deliberately: a push cannot build, and would only add another refused deploy to the
history. Push it when credits return so one build carries everything.

| register item | file | applied? |
|---|---|---|
| §1.2 coverage-for-commitment | `checker.astro` | yes, with the support article linked as the source of the launch scope |
| §1.3 "impossible for anyone" | `checker.astro` | yes |
| §1.5 "Claude's watermark … nobody can" | `WatermarkLabSection.astro:66` | yes |
| §1.7 "The local … Checker" | `data/content-integrity.ts:52` | yes |
| §1.8 model route described as browser-only | `index.astro:17` | yes |
| §1.4 "14 August 2026 announcement" | lab §01, research note | **withdrawn — not changed** |
| §1.6 stale verification dates | lab, research note | **not changed** (tied to §1.4) |

**§1.4 is withdrawn and the register is wrong about it.** 14 August dates the announcement;
2 August dates the commitment's scope. They do not conflict, and neither is an error. "Future
supported Claude models" is correct today, because the set of models launched after the cutoff is
empty. The proposed replacement would have introduced a bare "2 August" into copy that currently
avoids it, which is worse. The sentence is left exactly as it stands.

Worth recording for whoever next edits that page: **2 August 2026 is not Anthropic's date.**
Article 50 of the EU AI Act applies from that day, and the Act turns on whether a system was
placed on the market before or on/after it. Anthropic inherited a legal cutoff; it never chose a
rollout date. That is why the date can never be read as a deployment date.

### Figures, beyond the register

§1.1's fix needed a deploy, but two things underneath it were also wrong and are now corrected in
`public/models/local-signals-v1/thresholds.json`.

**The browser block was a stratified sample.** It published 621/654 (95.0%) and 43/1,770 (2.4%)
reweighted to 1.54%, from a 2,424-document sample. The full-corpus browser run has since finished:
**877/922 (95.1%) detected, 90/4,636 (1.94%) wrongly flagged**, with 0.980 alongside it. Both
routes now sit on the same population, which is what makes the real difference visible: detection
is identical document for document at this flag point, false positives are not. The headline was
rewritten to say that instead of quoting a 1.2-to-1.5% range built from two populations.

**Both per-register blocks were the opening-only pre-segmentation pass.** Their AI rows summed to
833/922, against the 877/922 published two fields above, and the fiction row read 16/260 (6.15%)
against the 29/260 (11.2%) in the fiction block. This matters because `registersByRate()` ranks
the weakest and strongest registers from that block and the copy prints the result: the page was
naming stories as the weakest ground when segmentation had already moved academic essays there.
Both blocks are now the segmented fp32 figures, and they sum to the corpus totals.

Computed from the unrounded document maxima in
`implementation/services/local-engine/research/corpus-reconciliation-2026-08-29/raw/lf-{ai,hu}.jsonl`
and cross-checked against `browser-fullcurve.txt`.

### 56 against 57 wrongly flagged — resolved: **56**

The register and `CORPUS-RECONCILIATION` §8.4 disagree, and §8.4 says why without settling it.
Settled from the unrounded scores:

- unrounded fp32 document maxima at 0.984: **56/4,636 = 1.208%**, and 877/922 = 95.119%. This
  matches the harness validation in §9 to the document.
- the same maxima rounded to four decimal places: **57**. One document sits at `0.983970`, which
  rounds to `0.9840` and crosses.

The server decides on the unrounded score; `segments[].probability_ai` is rounded for display
only. So 56 is the figure that describes what ships, and 57 belongs to the v3 two-threshold rule
evaluated at 4 dp. `thresholds.json` already said 56 and is unchanged on this point.

### Verification run

- `npm run test:unit` — 87 passed. `tests/unit/figures.spec.ts` was updated: it encoded the
  retired browser sample, and its "neither route prints the other's numbers" case asserted on
  detection, which is now the same figure on both runtimes and therefore asserts nothing. It now
  asserts on the false-positive rate, which is what actually belongs to the route that ran.
- `shipped-claims-guard.test.mjs` — 3 passed, including against the widened file set. No new
  wording tripped it, and nothing was softened to get past it.
- `tsc --noEmit` — no errors in any touched file. `astro build` was not run, per the Dropbox
  `rmdir` race.
- `SEGMENTATION_CONTRACT` is `segments-v2` on `main` and was not touched.
