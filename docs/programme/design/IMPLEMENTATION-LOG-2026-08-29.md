# Implementation log — checker redesign, steps 0 to 2

**Date:** 29 August 2026
**Agent:** IMP-1
**Repository:** `opace-website/astro-latest/` → `OpaceDigitalAgency/opace-latest`, branch `main`
**Scope shipped:** the plan's steps 0, 1 and 2, plus the test harness. **Step 3 was not started and the
`[data-evidence]` aside is untouched.**

---

## 1. The headline

Six commits are on `main`. **None of them is live.** Netlify has refused every build since 16:50 with
`Skipped due to account credit usage exceeded`, and `opace.agency` is still serving `a840a198`. See
§6 — this is the one thing that needs an owner decision.

The work is verified against a full local `astro build` into a directory outside Dropbox, and against
87 tests. It is not verified on the live site, because there is nothing new on the live site.

---

## 2. Commits

| Commit | What |
|---|---|
| `b0d0f9c5` | Delete eleven unreferenced stub modules |
| `f8dbe224` | Stand up the test harness, recording the engine's own output as fixtures |
| `d4a8b84a` | Close the other half of the one-character highlight defect |
| `c841a658` | *(another session)* Stop the hidden-character fix destroying C2PA text credentials |
| `c570440c` | Publish the measured figures, with their denominators and their register |
| `938edc02` | Stop shouting enum members at people (the four tones, plus the Signal Scale as data) |
| `f321e8da` | Live specs, and the C2PA guard asserted as a security property |
| `173a756e` | Make a missing measured claim fail the build, not the page |

Rollback target throughout: **`a840a198`**, which is also what is currently published.

---

## 3. Step 0 — the dead weight

Eleven files, not the ten the plan counted. Every one verified unreferenced by grepping the whole
tree — not only `src/` — for both the module name and each exported symbol, excluding `node_modules`,
`dist` and `.git`. `readTextCapture` and `anthropicWatermarkState` each matched exactly once, in their
own file.

Deleted: `PublicFixtureLab.ts`, `FindingList.ts`, `EvidenceRail.ts`, `ProtectedSpanEditor.ts`,
`TextCapture.ts`, `WatermarkState.ts`, `ReceiptExport.ts`, `PrivacyRoute.ts`,
`lib/content-integrity/fixtures.ts`, `privacy.ts`, `public-data.ts`.

Two were worse than dead. `PrivacyRoute.ts` was a second, divergent copy of `ROUTE_PRIVACY`;
`ReceiptExport.ts` duplicated the download code the controller inlines. A second copy of live code
reads as authoritative when someone finds it.

`tsc --noEmit` reports no new error on any content-integrity path. Nothing else in the repository
referenced them.

---

## 4. Step 1 — the figures

### 4.1 What was wrong, and what replaced it

`thresholds.json` published `833/922 (90.3%)` and `62/4,636 (1.34%)`, both measured under
`segments-v1`, one truncated opening pass per document, before token-bounded segmentation existed.
They describe a version of the tool that no longer runs. `78e8555c` had marked them
`pending_remeasurement` rather than laundering them, which was right at the time; the corpus
reconciliation retires them, so they are gone from the file rather than carried forward with a flag.

Every figure below was checked against `CORPUS-RECONCILIATION-2026-08-29.md` §1.1 and §5 before it
was written.

| Runtime, conditions | AI detected | Human false positives |
|---|---|---|
| fp32 EU server, whole corpus, 0.984, `segments-v2`, maximum over sections | `877/922 (95.1%)` | `56/4,636 (1.21%)` |
| int8 browser, 2,424-document stratified sample (654 AI, 1,770 human) | `621/654 (95.0%)`, 93.0 to 96.4% | `43/1,770 (2.4%)` sample, `1.54%` reweighted |
| Human fiction, worst register, shipped operating point | — | `29/260 (11.2%)` server, `28/260 (10.8%)` browser |

The browser false-positive figure prints **both** numbers. 2.4% is the rate in the sample; 1.54% is the
same 43 documents reweighted to the corpus mix. The sample carries the denominator and the reweighting
carries the correction, so printing either alone misleads in a different direction.

Both retired fiction figures are recorded in one place as superseded: `16/260 (6.15%)` was
opening-only, `33/260 (12.69%)` was measured at 0.980 rather than at the point that ships. A test
asserts `6.15%` appears in the file exactly twice, both inside that sentence.

### 4.2 Long-form, and the register with no measurement

Every figure now carries **long-form**. `measured.registers_unmeasured` names short marketing, SEO and
social copy and says why there is no figure: every sample the programme owns for those registers sits
inside the cycle-2 training set. That absence is published as an absence, on the page, in section 03's
limits block and in the FAQ. It is not softened into a range.

### 4.3 Two claims removed rather than restated

- **"detects about 90% of AI long-form writing and wrongly flags about 1.3%"** was typed into
  `checker.astro` beneath the model checkbox, where no recalibration would ever have found it.
- **"AI text that a person has tidied is still detected in about 8 cases out of 10"** has nothing
  measured behind it. What is measured is the rewrite case: 34.8% of 1,022 documents, on a separate
  corpus, and it is now quoted with its source and its denominator. The cycle-3 report records the rate
  and the denominator but not the count, so **no count is printed** — 1,022 × 34.8% is not an integer
  and inventing one would be exactly the failure this work exists to stop.

Also corrected: copy calling 113 the number of writing-signal *rules*. 116 rules run, grouped into 113
categories. Both now come from `WRITING_SIGNAL_RULES_RUN` and `WRITING_SIGNAL_CATEGORIES`.

### 4.4 The mechanism

`src/lib/local-signals/measured-figures.ts` is the only module that reads `thresholds.json`.
`published-figures.ts` imports the same file at build time for the pages Astro renders on the server.
One file, two readers, no second copy.

Properties, each asserted rather than described:

- **Denominators travel with rates.** `figure()` refuses anything not shaped
  `"<flagged>/<total> (<rate>%)"`.
- **A missing claim fails the build.** `assertPublishedClaims()` validates the full key set at module
  load. `published-figures.ts` calls it at module scope, so the check runs inside `astro build`. The
  runtime figure layer calls it too, so a stale `thresholds.json` fetched in a browser also fails
  loudly rather than rendering a gap.
- **The failure names the key and the surface.** Proved by deleting `measured.known_gaps` and running a
  real build: it stopped, with `thresholds.json is missing "measured.known_gaps", which the AI Content
  Integrity Checker page and its FAQ publishes as a measured claim`. The key was then restored.
- **Neither route prints the other's numbers.** Both routes build their display bands through
  `bandsForRuntime()`. The lower bands quote no rate at all, because that distribution predates the
  current segmentation. An unmeasured flag point yields no figure and the band says so.
- **`bands.list[0].min === threshold`** is asserted at load. They were two fields with nothing holding
  them together.

One implementation note worth keeping: the claim paths are arrays, not dotted strings. One key is a
threshold with a decimal point in it, and splitting on dots looked for `984` inside `0` and reported
every figure missing. The tests caught it.

---

## 5. Step 2 — the vocabulary

`statusLabel` was `status.replaceAll("_", " ")`. That is how `NOT RUN`, `INCONCLUSIVE`,
`NOT CONFIGURED` and `UNSUPPORTED` reached a visitor's screen.

Eight statuses now map onto four tones: **Clean**, **Found**, **Not run**, **Unavailable**, plus
**Could not run** for an error with a reason attached. `inconclusive` becomes "Not run" — the writing
rules are not inconclusive, they are deliberately not a verdict. An unrecognised status also reads
"Not run", never a pass: that is exactly the case where counting it clean would be a lie.

The classifier keeps a fifth word. "Clean" on the AI reading would be taken as a human verdict, so it
says **Read**.

`src/lib/content-integrity/signal-scale.ts` ships the Signal Scale as data: five levels with stable
ids, names, support sentences and aria labels; the band mapping; `trackPosition()` pinning the flag
mark at 75 whatever the threshold is; and `strongestSections()`, which returns **every**
joint-strongest section rather than the first. Nothing renders it yet — that is step 3 — but the copy
and the transform have one home and the rules are tested before anything depends on them.

---

## 6. Deployment — blocked, and not by anything in this branch

Pushed `f321e8da` to `main` at 17:51. The page did not change. Netlify's own deploy list:

```
16:53  441a8fc7  error  Skipped due to account credit usage exceeded
16:50  f321e8da  error  Skipped due to account credit usage exceeded
16:03  a840a198  ready
```

`published_deploy` is still `a840a198`, and the live bundle is
`checker.astro_astro_type_script_index_0_lang.C8wEZR-9.js` against the `BWmql-vm` this branch builds.
**The Netlify account is out of build credits.** Every push to `main` from every session since 16:50 is
sitting unbuilt, including the C2PA credential fix. Nothing in this branch caused it and nothing in
this branch can clear it — it needs the account topping up.

**Live verification is therefore outstanding, not passed.** The exact probe to run once builds resume:

```
CHECKER_BASE_URL=https://opace.agency npm run test:live
```

Three of those specs fail against the currently published page and pass against this branch's build,
which is what makes them worth running.

---

## 7. What the harness covers

`playwright.config.ts`, `tests/`, and `npm test` / `test:unit` / `test:live` / `test:record`. The
repository had no tests of any kind before this: no runner, no config, no spec file.

**87 unit tests**, no browser, no network. Fixtures are recorded from the real engine
(`@opace/content-integrity-core` runs in Node) rather than hand-written, so a fixture that changes is
either a deliberate engine change or a regression, and the diff says which.

| Spec | Covers |
|---|---|
| `finding-spans.spec.ts` | The `"W"` defect, both halves. Placeholder spans and single-code-point anchors. That every highlightable finding points at the text it claims to have matched — the property the `p{index}` keying bug violated, which outlives the panel that exposed it |
| `axes.spec.ts` | Three axes never collapsed into one, over every fixture. Axis A holds no reading and no number when no model ran. No authorship vocabulary anywhere in axis B or axis C. The watermark reading names no provider |
| `figures.spec.ts` | Every figure above, against `thresholds.json` itself. Retired figures absent. Unmeasured flag point yields nothing. Deleting a figure ends the run loudly. Long-form tagging. The claim contract, its build-time trigger and its named-surface failure |
| `vocabulary.spec.ts` | The four tones. No raw enum member on screen. Nothing not-run counted as a pass. No digit in any label. No authorship vocabulary in any level. The flag mark at 75 at every threshold. The strongest section, with joint winners named |
| `c2pa-credentials.spec.ts` | The spec's own encoding, both carrier ranges. Detection, including a truncated wrapper. **The security property:** a forged selection requesting every finding id still cannot strip a credential, because its spans reach the engine as protected spans. The unguarded case is asserted too, so nobody removes the guard believing the engine refuses those edits on its own |

**Live specs** at four viewports — 1440, 768, 375, and 640×512 for 1440 at 200% zoom. Every one proves
the page was actually fetched: `netlify.toml` serves the checker with `max-age=300` and
`stale-while-revalidate=600`, a cached read reports `transferSize` 0, and that failure has produced two
false results in this project.

They cover: the refreshed figures present and the retired ones absent, in the page and behind the FAQ
disclosures; no shouted enum member; the weakness disclosures surviving; no threshold literal in the
copy; a clean console; empty, short, under-the-word-floor and over-the-ceiling input; the wetlands
passage rendering no one-character highlight and offering no jump; every "Show in draft" landing on
the text its finding claims; editing after a run clearing the result rather than leaving stale
offsets; keyboard-only operation to the run button; the result region's live politeness and the
progress bar's label; no horizontal page scroll; and a target-size count locked in so it cannot grow.

Run against production **before** this branch merged, the suite failed exactly five and passed
nineteen. The five are the figure refresh, the tone vocabulary and the one-character highlight — all
true of the published page and false of this branch. A probe that cannot fail is not a probe, and that
run is the evidence these ones work.

---

## 8. Where the plan was wrong

1. **The `"W"` defect was only half fixed.** The plan says document-level findings are the ones that
   emit `start:null`, and that any rule calling `pushEx(…, null, null, …)` produces the placeholder.
   True, but incomplete. Five rules in `en-signals-v3` — `staccato-fragments`, `bold-label-bullets`,
   `emoji-decoration`, `directive-colon-bullets`, `quote-inconsistency` — count something across the
   whole draft and then anchor the count at one code unit: `pushEx("staccato-fragments", …,
   para.start, para.start + 1, …)`. The core sets no `document_level` flag on those, because the offset
   is a real position. `hasPassageSpan` therefore returned true and they rendered as a one-character
   mark with a "Show in draft" control pointing at a character with nothing to do with the finding. On
   a paragraph beginning "Wetlands", it was the same lone `"W"`. Fixed by making the rule about width:
   more than one code point, or it is listed rather than marked.

2. **The plan's own `doc-level` fixture description does not match the engine.** The plan expects four
   document-level findings on the wetlands passage, naming `low_ttr` and `sentence_flatline`. On the
   shipped engine the recorded passage produces `signals.passive_ratio` (flagged) and
   `signals.staccato_fragments` (the anchor case above). The count is not the point; the class is, and
   both are covered.

3. **Eleven dead files, not ten.** §2.4 says "ten files" and then lists eleven.

4. **`@playwright/test` was not installed.** The plan says Playwright 1.60 is already a devDependency
   and unused. `playwright` was; `@playwright/test` — which is what `playwright test` and
   `playwright.config.ts` need — was not. Added as a devDependency, one package, no other lockfile
   movement.

5. **Deploys are not "landing inside 90 seconds".** They are not landing at all. §8's deploy mechanics
   assume a working pipeline.

Not wrong, but worth recording: the plan's two corrections to the brief both held. The single-source
refactor had landed and was extended rather than worked around, and `inspect()` does compute
`combined_verdict` with `assertAxisIndependence` inside it on every run — the axes specs read those
existing outputs rather than deriving anything.

---

## 9. Untouched, deliberately

- `SEGMENTATION_CONTRACT` and the segmentation contract check. The `segments-v3` change in flight is
  server-first and belongs to another session. `git diff origin/main..HEAD -- src/lib/local-signals/segments.ts`
  is empty.
- The `[data-evidence]` aside and `render()`. That is step 3 and it depends on UI-3's mockup rebuild.
- Nothing in the codebase hard-codes "highest section only" in a way that would break when two sections
  jointly cause a flag. `bandFor` sorts by floor and takes the first band cleared, and
  `strongestSections()` returns every joint winner. Nothing to flag.
- The withdrawn phrasing "Anthropic has watermarked Claude's text since 2 August 2026" appears nowhere
  in `src/`, `tests/` or `public/`. The page's existing sentence — "Anthropic has said newer Claude
  models carry text watermarking of the same family as Google DeepMind's SynthID-Text" — is no
  stronger than the sourced version and was left alone.

---

# Step 3 — the result-block rewrite

**Agent:** IMP-2. **Deployed and verified live.** Bundle
`checker…C8wEZR-9.js` → `BvpWOD2R.js` (01727429) → `ChJZ5x81.js` (324320e0) →
`BO0CJq9T.js` (b9671b18). Netlify deploy `6a931a74`, `state: ready`, published
17:45:34Z.

## 10. Commits

| Commit | What |
|---|---|
| `324320e0` | The result-block rewrite. `[data-evidence]` aside deleted, `render()` rewritten, twelve new modules, 35 component tests |
| `b9671b18` | Stop telling people a check did not run when it did |
| `aebd7744` | A check that cannot apply prints no location |

Not staged, by explicit path, on every commit: `thresholds.json`,
`segments.ts`, `engine.ts`, `server-route.ts`, `measured-figures.ts`,
`types.ts`, `published-figures.ts` — all mid-edit in another session's
`segments-v3` work, which was in flight for the whole of this step.

## 11. The parity audit

Enumerated **from the running deployed page**, not from `checker.astro`'s
markup. That distinction is the point: a markup diff cannot see the states that
only exist at runtime, and it is why the first rebuild lost seven things with
nothing failing.

The live enumeration drove: every control inside `[data-integrity-checker]`,
the four input-boundary error strings, the browser-route consent gate, a real
run, and the server's `automation_blocked` refusal of a scripted client
(observed as an HTTP 403 in the console, which is the documented behaviour of
`server-route.ts:249`).

### Input

| Capability | Live | Redesign |
|---|---|---|
| Paste | textarea, live counter | **present** |
| File upload | `[data-file]`, hidden behind a tab | **present**, accept list byte-identical |
| `accept` list | `.txt,.md,.html,.jpg,.jpeg,.png,.webp,.pdf` + 7 MIME forms | **present**, verified against the built HTML |
| Four examples + "no example" | `human / raw-ai / mixed / unicode` | **present** |
| Three-way tablist | `[role=tab]` × 3 | **present** — the always-visible treatment is step 4/5, not this step |
| Drop target | absent | **not in this step** — mockup-only so far |

### Controls

| Capability | Live | Redesign |
|---|---|---|
| Route choice (server / browser) | radio pair | **present** |
| Model consent gate | `[data-local-consent]`, hidden until browser route | **present**, unchanged |
| Model download, size stated | "Download the model to this browser (34.5 MB, one-off)" | **present** |
| Download progress element | `[data-local-progress]` | **present** |
| Six check toggles | `unicode.invisible / unicode.homoglyph / style.patterns / protected / local.signals / watermark.known_keys` | **present** — removing them is a recorded step-5 decision, not done here |
| Run / Cancel | `[data-run]`, `[data-cancel]` | **present** |
| "Analyse first 50,000 characters" | `[data-first-limit]`, over-length only | **present** — the refuse-truncation ruling is step 5 |
| "Read CLI and methods guidance" | link inside `[data-limit-actions]`, over-length only | **present** |
| Unicode fix checkboxes | `[data-fix-finding]`, inside the rail | **present**, relocated into the hidden-characters card |
| "Held back" credential label | rendered by JS, **not in `checker.astro` at all** | **present**, plus a build-time predicate |
| Credential-removal confirm | created by JS, **not in the markup** | **present**, unchanged |
| Preview / Apply Unicode fixes | `[data-preview-fixes]`, `[data-apply-fixes]` | **present**, relabelled |
| JSON receipt | `[data-receipt]` | **present** |
| Print | `[data-print]` | **present** |
| "Protect these facts (planned)" | disabled button | **removed, recorded.** Shipped UI for an unbuilt feature |
| Methodology / Readiness Lab links | two links in the actions row | **present** |
| `<noscript>` fallback | present | **present**, untouched |
| "Show in draft" jumps | `.integrity-finding-jump` × 4 on a real run | **removed, recorded.** Replaced by section selection; the property they violated is now asserted generally |

### States

| State | Live | Redesign |
|---|---|---|
| Empty submit | "Paste a draft, upload a file, or load one of the examples first." + focus | **present** |
| Under 50 characters | exact-checks-only message | **present** |
| Over 50,000 characters | "Nothing has been truncated", run disabled, limit actions shown | **present** |
| Under 60 words, server route | counter states the floor | **present** |
| Running | phase label, progress bar, `prefers-reduced-motion` | **present** |
| `too_long` (413) / `contract_mismatch` / `rate_limited` / `automation_blocked` / `token_failed` / `unreachable` / `server_error` / `bad_response` / `engine` | nine coded strings in `noAssessmentReason`, plus `buildRouteFallback` | **present**, routed into the axis A withheld state; `automation_blocked` observed firing live |
| `inconclusive` (too short to score) | withheld | **present**, no meter fill, no track, no number |
| `NOT RUN` / `INCONCLUSIVE` shouted | fixed in step 2 | **absent**, asserted live |
| Result: image file | provenance leads | **not in this step** — needs the file-card input work |

### Outputs

| Output | Live | Redesign |
|---|---|---|
| Six named checks | badge list | **present** as seven cards (the seventh is Content Credentials, marked not-applicable for text) |
| Per-section scores and boundaries | `buildSegmentBreakdown` | **present**, promoted to the document strip |
| Watermark rows per key | table on every run | **present**, behind "Show the numbers"; a detected signal never collapses |
| C2PA results | `provenance-panel.ts` | **present**, unchanged |
| Protected-fact anchors | highlighted in the draft | **present** as a count by kind; offsets still in the receipt |
| Editorial notes | rail groups | **present** on the axis C card and a list behind it |
| Receipt fields | `buildReceipt` | **present**, unchanged, `contains_content:false` |
| `combined_verdict.text_integrity` | computed, **read nowhere** | **now rendered** — axis B, all three evidence tiers |
| `combined_verdict.editorial` | computed, **read nowhere** | **now rendered** — axis C |
| `character_evidence.excluded[]` | nowhere | **now rendered** (plan defect 3) |
| `method.score_scale` / `native_outcome` / `segments[]` | nowhere | **now rendered** in each card's disclosure (plan defect 2) |
| `combined_verdict.confidence` | nowhere | **deliberately not rendered** (plan defect 4), asserted absent |
| `Tier2Result` | nowhere | **still nowhere** (plan defect 1) — the type and the branch survive; the withheld card is not built |

### The third column — defects found

Eight, of which **five were not on the mockup rebuild's list of seven** and
would not have been visible to a markup diff:

1. **"Read CLI and methods guidance"** — a second link, reachable only in the
   over-length state. Preserved.
2. **The credential-removal confirmation checkbox** — created in JavaScript and
   absent from `checker.astro` entirely. Preserved.
3. **The "Held back" label** — likewise JS-only. Preserved, and now carries a
   build-time predicate.
4. **`[data-limit-actions]` as a state**, not a control — the whole
   over-length affordance. Preserved.
5. **Nine coded server-route failure strings**, none of which appear in the
   markup. Preserved.
6. **`"Not run · this device · 4 recorded"`** — introduced by this rewrite and
   caught by running it against production. Fixed in `b9671b18`.
7. **`"Not for this input · did not run"`** — same class. Fixed in `aebd7744`.
8. **Tier 2 still has no surface.** Carried forward as the one open defect.

Two removals are deliberate and recorded: the disabled "Protect these facts
(planned)" button, and the per-finding "Show in draft" jumps.

## 12. The claim inventory

Counted across the checker's own surfaces.

| Class | Distinct | Renders | Notes |
|---|---|---|---|
| **measured** | 37 | ~54 | Every one keyed in `REQUIRED_CLAIM_KEYS`, validated at module load, and **zero measured figures are typed as literals anywhere in checker source** — verified by grepping every rendering file for the `n/m (p%)` shape and finding none |
| **boundary** | 14 | ~19 | Route privacy, the credential guard, the scored-position floor, the pass-total rule, `contains_content:false`, the six "what it can say" lines |
| **world** | 6 | ~8 | The Anthropic launch-scope commitment, "no public verifier exists", the private-keys sentence, the C2PA 2.3 §A.8 wrapper claim, the SynthID-Text mathematics attribution, the avoid-ai-writing attribution |

**57 distinct, ~81 renders.** So the checker is not the surface where the
export boundary breaks — it is comparable to the lab's 21/35 once its larger
measured block is accounted for. But **the world class is not the largest here,
and that prediction was wrong**: the checker's results panel is overwhelmingly
*measured*, because almost everything it says is about its own corpus. The
world claims are concentrated in the two static paragraphs above and below the
tool, not in the results.

`worldClaim()` and the provider status panel are **not built**. Handed back
rather than traded against parity, as instructed.

## 13. Where the plan was wrong, again

1. **`buildLocalSignalsRow` could not simply be replaced.** It carried
   `noAssessmentReason` *and* the route-fallback offer, and the fallback is the
   only recovery path from six of the nine error codes. It is now called
   directly from `render()` rather than inherited from the row.

2. **The rail could not be deleted whole.** §5.2 says its contents split three
   ways. It has a fourth: the `[data-fix-finding]` checkboxes, which are the
   only route into `previewSafeFixes`. Deleting the rail as written would have
   deleted the safe-fix feature — a larger loss than the file upload, and one
   the plan does not mention.

3. **`inconclusive → "Not run"` was wrong**, and step 2 shipped it. See
   `b9671b18`. The plan's §4.5 table specifies it directly.

4. **The build-time guard needs a cwd-relative path.** Astro rewrites the
   module into `.astro/pages/…`, so `import.meta.url` resolves to a directory
   that does not exist by the time the assertion runs.

5. **Source identifiers cannot be used to verify a deploy.** The bundle is
   minified. `detectC2paTextCredentials` returns zero from a bundle that
   certainly contains it. Every probe here uses string literals and numeric
   code points — `Held back`, `A.8`, `917760`, `65279` — and every numeric
   pattern is anchored (`877/922`, never `877`).

## 14. Not done

- `worldClaim()`, the twelve provider slots and the provider status panel.
- The always-visible three-way input, the drop target and the file card.
- The image-file result state.
- Removing the six check toggles and the truncation offer (step 5 decisions).
- A tier-2 withheld card.
- Contrast measurement against the shipped palette in the rendered page.

## 15. Live verification

Deploy `6a931bd9`, `state: ready`. Bundle
`checker…C8wEZR-9.js` → **`p2_PX5nw.js`**. Document `transferSize` 50,786 on a
cache-busted fetch, so the read is fresh and not the `max-age=300` copy that has
produced three false results on this project.

**184 tests: 103 unit, 36 component, 45 live at four viewports.** Every live
spec run against `https://opace.agency`, all passing.

Bundle probes, using markers that survive minification. Present: `Held back`,
`A.8`, `917760`, `65279`, `877/922`, `56/4,636`, `29/260`, `Long-form only`,
`Not measured`, `No verdict`, `MISSING:`, and `1.54%` once inside its
`supersedes` field. Absent: `AI-STYLE`, `Protect these facts`,
`Highlights in your draft`, `90.3%`, `1.34%`, `about 90`, `113 named rules`,
`NOT RUN`. A control string known to be absent returned zero, so the negatives
mean something.

`detectC2paTextCredentials` returns **zero** from a bundle that certainly
contains it. Source identifiers are mangled and are not usable as deploy probes.

## 16. For whoever picks this up

The `segments-v3` minimum-evidence work landed on top of these components while
this step was in flight, and now reads `scored.secondaryThreshold.toFixed(4)`
in `SignalCard.ts` without a guard. A `LocalSignalsRun` that lacks the field
throws inside `render()` and the whole result becomes "Inspection could not
complete". That was caught by the component fixture rather than by a user, and
it should either be guarded or the field made required in the type.

## 17. The unguarded optional read, closed

Section 16's landmine is fixed. `SignalCard.ts` read
`scored.secondaryThreshold.toFixed(4)` in three places — the flag-rule sentence
on both arms, and the reproduction detail line. A run record without the field
threw inside `render()`, and one absent number turned the whole panel into
"Inspection could not complete", which is a false statement: the reading had
succeeded.

The field is now read once, through `Number.isFinite`, and the sentences that
name the figure are swapped for sentences that do not:
`flagBySecondNoPoint`, `notFlaggedNoSecondPoint`, `detailLineNoSecondPoint` in
`microcopy.ts`. No default is substituted. The secondary flag point is a
calibrated parameter and a wrong one misdescribes the rule the verdict actually
used, so the card says the run did not record it rather than inventing one.
`thresholds.json`, the segments-v3 parameters and `SEGMENTATION_CONTRACT` are
untouched.

### The sweep

Two more of the same shape, both fixed in the same commit:

- `local-signals-ui.ts`, `flagRuleSentence`. Same field, reached through
  `percentOf` → `(undefined*100).toFixed(1)`, which does not throw but renders
  **`NaN%`** in the run-history row. A figure-shaped non-figure is worse than
  an omission, so the clause is dropped the same way.
- `provenance-panel.ts`, `rowStateFor` and `buildDetails`. `manifestSummary` is
  optional on `ProvenanceResult` and was read through `!` plus
  `.validationStatus.some(...)`. Today `inspect.ts` always sets it beside
  `credentials_found`, so this was latent rather than live, but an assertion
  only silences the compiler. Now optional-chained, with "Not reported" for the
  counts.

Checked and found sound: `scored.segments??[]` and `tier3.band?.id` in
`SignalCard.ts` were already defensive; `record.transport` is guarded at both
call sites; `formatSignedOn` already rejects an unparseable date.

### Proof

Two component tests were written first and run against the unfixed build:
`TypeError: Cannot read properties of undefined (reading 'toFixed')`, both of
them. After the fix, **141 pass** (103 unit, 38 component). `tsc --noEmit`
reports nothing in `content-integrity` or `local-signals`; the pre-existing
errors elsewhere in the repo are unchanged.

## 18. The probe that manufactured its own symptom

Sixth search-or-probe artefact today, and the first that **fabricates** a
failure rather than hiding one.

Driving the deployed checker from Playwright with

```ts
extraHTTPHeaders: {"cache-control": "no-cache", pragma: "no-cache"}
```

breaks the detector's token exchange. The page then reports, correctly and in
its own words:

> This page could not get a check token from our EU server (the server could
> not be reached to start a check), so no AI assessment was made.

Nothing is wrong with the server. `/v1/challenge`, `/v1/token` and `/v1/check`
all return 200 from the same browser with those two headers removed. Twice this
read as a live token outage and it was neither.

Those headers are in `playwright.config.ts` for the live projects, where they
are correct: they exist because netlify.toml serves the page with
`max-age=300`, and a cached document read has already produced false passes
here. They are correct for **loading a page** and wrong for **running the
model**.

**The working alternative, for any hand-driven behavioural run:** a cold
context with no cache headers, plus `?fresh=<timestamp>` on the URL, and the
`transferSize > 0` assertion from `tests/live/support.ts` to prove the document
was really fetched. That gets a fresh read and a working token.

Two smaller ones from the same session, recorded so they are not rediscovered:

- The in-browser route (34.5 MB model plus runtime) does not finish inside ten
  minutes under headless Chromium. Use the EU route for behavioural checks.
- Headed runs need `#stickyContactBar` and the glass header removed, or
  `[data-run]` is never clickable: both intercept the pointer.

## 19. A test that held a copy of a measured figure

`checker-copy.spec.ts` asserted `877/922 (95.1%)` and `56/4,636 (1.21%)` as
literals. The segments-v3 operating point moved the shipped pair to
`883/922 (95.8%)` and `45/4,636 (0.97%)`, and the spec went red **within hours
of being written**, against a page that was correct.

Refreshing the literals would buy a week. The spec now reads
`thresholds.json` through `measuredAt`, the same accessor `published-figures.ts`
uses to build the sentence the page prints, and asserts that **the deployed page
agrees with the shipping configuration**. A recalibration now moves the file,
the page and the test together. This is the single-source rule the rest of
today's work adopted, applied to the tests: a test holding its own copy of a
figure is a second home for that figure, and it drifts the way the page drifted.

Two properties kept deliberately:

- **Denominators are asserted, not just rates.** The shape `n/N (r%)` is checked
  on the configuration values before the page is opened, so a config that
  dropped a denominator fails here and not silently.
- **The retired list cannot contradict the shipped one.** The superseded figures
  stay written out — they are history, not configuration — but the spec now also
  asserts that nothing currently shipping appears in that list. Without it, a
  recalibration landing back on a retired value would leave two assertions
  disagreeing with no way to tell which was wrong.

Proved failable, three ways, each red for its own reason: a figure the page does
not show, a rate stripped of its denominator, and a shipped figure that appears
in the retired list. **185 tests green** afterwards.

One flake seen once, `live-tablet` "one element announces the result, not the
whole region", under full four-viewport parallel load. Passes in isolation and
on a repeat of all four live projects. Recorded rather than patched: a
speculative fix to a test that has failed once is how a suite acquires
untraceable sleeps.
