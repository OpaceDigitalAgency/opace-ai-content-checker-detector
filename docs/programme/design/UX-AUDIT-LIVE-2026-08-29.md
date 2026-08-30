# Live UX audit — AI Content Integrity Checker and Claude Watermark Readiness Lab

**Date:** 29 August 2026, 15:20–16:05 BST
**Auditor:** A1 (live UX audit), read-only on production
**Pages:**
- https://opace.agency/tools/ai/content-verification-integrity/checker/
- https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/
- https://opace.agency/tools/ai/content-verification-integrity/ (suite index)

**Method:** real Chromium driven over CDP, tab foregrounded throughout so `requestAnimationFrame`
fired. Seven complete runs on the checker (server route ×3, browser route ×3, one blocked run),
one full session on the Lab including the wrong-key experiment, one file upload, one empty-input
attempt, one 22-word attempt. Measurements taken in the page, not inferred from source. Source
read for root-cause work only. No build was run.

**Screenshots:** `./screenshots/` — referenced as [S1]…[S8].

> **The site changed during the audit.** The checker's JS bundle moved from
> `checker.astro_…BMU3YIV9.js` to `checker.astro_…BmBg5FTU.js` between 15:37 and 15:47, and the
> band labels in `thresholds.json` changed twice inside the same hour. Everything below is
> labelled with which bundle it was measured on. [S5] documents a state that is no longer live and
> is kept only as the "before" half of a comparison.


> **Superseded wording, quoted deliberately — note added 30 August 2026 on publication.**
> This is a working document from 29–30 August 2026, kept as a historical record and not rewritten.
> Where it quotes claim wording the programme has since **retracted**, the quotation is the thing
> being retracted, never a live assertion. The retracted set and its corrected replacements are in
> [`../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md`](../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md);
> check any figure against
> [`../../measurements/CORPUS-RECONCILIATION-2026-08-29.md`](../../measurements/CORPUS-RECONCILIATION-2026-08-29.md)
> before repeating it. Do not quote any passage from this file as current wording.

---

## 1. The measured facts

### 1.1 Time to first useful result — the owner's loudest complaint

Checker, desktop 1440×900, fresh load, EU server route (the default):

| | |
|---|---|
| Words on screen before the paste box | **422** |
| Words between the paste box and the Inspect draft button | **690** |
| Total copy inside the tool before you can run it | **1,112 words** |
| Scroll depth to the paste box | 1,602 px — **1.8 screens** |
| Scroll depth to the Inspect draft button | 3,079 px — **3.4 screens** |
| Interactions needed to get an answer | 2 (click box, paste, click button) |
| Wall clock, server route, 433 words | **5.8 s** |
| Wall clock, server route, 64-word file upload | 7.6 s |
| Wall clock, browser route, model already cached | 1.8–2.2 s |
| Wall clock, browser route, cold cache | **77 s download + 2.2 s = 79 s** |
| Full page height | 7,971 px (8.9 screens) |

Same measurements at 375 px:

| | |
|---|---|
| Scroll depth to the paste box | 2,608 px — **3.2 screens** |
| Scroll depth to the Inspect draft button | 5,266 px — **6.5 screens** |
| Full page height | 12,768 px — **15.7 screens** |

The interaction count is good. The reading cost is not. A user who paste-and-clicks without
reading gets an answer in under six seconds; a user who reads what the page puts in front of them
reads 1,112 words first. The page is built for the second user and the second user does not exist.

The two longest single paragraphs on the page, before any result:

- 168 words — "What the writing-signal rules actually catch, measured…"
- 164 words — "This checker inspects the same class of hidden Unicode carriers…" (this one sits
  directly above the tool, between the H2 and the input card)

### 1.2 The result

Server route, 433-word AI passage, one run:

| | |
|---|---|
| Words in the result panel | **1,523** |
| Height of the result panel | **4,359 px — 5.8 screens** |
| Page height after the run | 11,808 px |
| Chips beside the headline verdict | 5, one of which reads `TIER3-CYCLE2-V1 · FP32` |
| Words before the first plain-English "why" (writing suggestions) | ~1,050, at 5,847 px |

### 1.3 Density of numbers and negation

Checker `<main>`, before any run: **1,545 words**, **45 distinct numeric figures**, **46
negations** ("not", "never", "cannot", "no", "nothing", "without", "unavailable", "unsupported",
"not assessed") — **2.98 negations per 100 words**.

Figures the page asks a visitor to hold: 20 MB, 50 characters, 50,000 characters, 60 words,
200 words, 340 words, 415 code points, 512 tokens, 4,000 words, 34.5 MB, 14–26 MB, 1.7 MB,
98.4%, 90%, 1.3%, 90.6%, 1.38%, 5,558, 835/922, 64/4,636, 45.1%, 24.8%, 66.7%, 1,896, 1,727,
169, 44, 116 rules, 113 categories, 3 demo keys, 95.3%, 53.3%, 16.0%, 0.0%, 6–12%.

That list is an inventory of what the page displayed on 29 August 2026, not an endorsement of any
figure in it. Several are **superseded** — 66.7% in particular, which is **retracted** and must not
be quoted: it is an artefact of a corpus that was 76% encyclopaedic and question-and-answer text.
The replacements are in `../../measurements/CORPUS-RECONCILIATION-2026-08-29.md`.

### 1.4 Tap targets, contrast, reflow

At 375 px, 15 interactive targets fall below the 24×24 CSS px floor of WCAG 2.2 SC 2.5.8:

| Target | Size |
|---|---|
| Breadcrumb links (HOME, TOOLS, AI, …) | 11 px tall; "AI" is **11×11** |
| Five check-toggle labels (Invisible Unicode, Lookalike characters, Writing suggestions, Protected content, Watermark scan) | 259×**19** |
| "Named signals model (beta)" label | 235×19 |
| Inline links in body copy (Readiness Lab, methodology) | 17–20 px tall |

**Colour contrast passes everywhere measured.** Sixteen text/background pairs sampled on live
rendered results, lowest ratio **6.89:1** ("FACTS TO PRESERVE, NOT AI EVIDENCE" heading at
11.2 px on `rgb(234,241,245)`). Band chips: 9.02:1. Verdict label: 13.7:1. Focus ring
(`#0B7285`, 3 px, 4 px offset) measures 5.59:1 on the cream card and 3.17:1 on the dark results
panel — both clear the 3:1 non-text floor.

Two type sizes are below 12 px and should be raised regardless of contrast: the `ZWSP` legend
chip at **9.2 px** and the legend titles at **11.2 px**.

**Reflow is clean.** At 640×512 (equivalent to 1440 px at 200% zoom) `scrollWidth` is 625 against
a 640 viewport — no horizontal scrolling. At 375 px, `body.scrollWidth` is exactly 375. Six
`prefers-reduced-motion` blocks exist in the stylesheets. Console is clean across all runs.

### 1.5 Site chrome competing with the tool

At a 900 px viewport, a 98 px sticky header, an 86 px sticky "5.0 ON CLUTCH / 0121 468 0600 /
FREE PROPOSAL" bar and a 44 px back-to-top button occupy roughly 20% of the vertical space
permanently, and the CTA bar sits on top of the tool card. Visible in [S2], [S3], [S4], [S6].

---

## 2. Jargon inventory

Every term a competent SEO or copywriter would not confidently define, with where it appears and
whether the page explains it at the point of use.

| Term | Where | Explained in place? | Does the user need it to act? |
|---|---|---|---|
| `TIER3-CYCLE2-V1 · FP32` | Chip beside the headline verdict | No | No |
| fp32 / int8 / per-channel quantisation | Result copy, "Where the model runs" | No | No |
| 512-token window | Input panel, result, section note (5×) | "cut to fit" only; token never defined | No |
| tokeniser / GPT-2 tokens / token ids | Watermark result, Lab | No | No |
| segments-v2 (contract) | "What was sent, and where" table | "A disagreement is refused, not rounded over" | No |
| segmentation / sections cut to near-equal length | Result, several places | Partly | Helpful, not essential |
| flag point | Chip: "AT OR ABOVE THE 98.4% FLAG POINT" | No | Yes — must be reworded, not removed |
| operating point | Result long-form copy | No | No |
| threshold | Result, FAQ | No | No |
| false positive / human false positives | Result, section 03 | "wrongly flags" appears once | Yes — must be reworded |
| held-out / fresh corpus / never seen | Result, section 03 | No | No |
| AUROC | thresholds.json only, not on screen | n/a | No |
| calibrated probability | Result | No | No |
| mean g / weighted mean g | Lab metric tiles, checker watermark row | "the no-watermark value" once | No |
| g-value / per-token g-value | Lab H3 heading | Long paragraph after the heading | No |
| z-score | Lab metric tile | No | No |
| p-value | Lab metric tile, checker watermark table | No | No |
| tournament sampling / six tournament layers | Lab | No | No |
| scored positions / KEY · DEPTH | Lab metric tiles | No | No |
| homoglyph / mixed-script lookalikes | Check names, result rows | "lookalike characters" is the friendly name; "mixed-script" is not glossed | Partly |
| ZWSP | Highlight legend chip | No | No |
| zero-width, tag, variation-selector characters | Intro paragraph | No | No |
| code points | "415 code points" | No | No |
| exact offsets | Section 02 | No | No |
| C2PA / provenance / Content Credentials | "Supported provenance" row, FAQ | "provenance verdict" used without defining provenance | Partly |
| ONNX runtime | Browser-route consent panel | No | No |
| WASM execution provider | thresholds.json; not on screen | n/a | No |
| classifier / trained classifier | Input panel, result | Partly | No |
| register (as in "register effect") | Section 03 | No | No |
| corroboration / corroboration-weight | Finding messages | No | No |
| adjacent-lemma-repeat, passive-ratio (rule ids) | Finding cards | Message is plain; the id is not shown, but the *name* never is either | No |
| stylometric / burstiness | Not on screen (research docs only) | n/a | No |
| axis independence / three axes | Not named on screen; enforced in code | n/a | No |
| INCONCLUSIVE / NOT RUN / ATTENTION / PASS | Six status badges per run | No | Yes — three of the four are unclear |
| receipt / JSON receipt / hash-only receipts | Action buttons, index | No | No |
| fixture / fixture manifest / fixture commit | Lab, throughout | No | No |
| `wm-alpha-200-01 · Watermarked · 200 tokens · key alpha` | Lab sample dropdown, 24 options | No | Yes — this is the only way to pick a sample |
| SUBMISSION CANDIDATE 1.0.4 / PUBLICATION CANDIDATE 0.1.0 | Suite index card badges | No | No |
| e5-small / base model | Not on screen | n/a | No |
| `fp32 build e313ab00de1f` | Result transport table | No | No |

**Count: 41 terms.** Of those, **four** are genuinely load-bearing for a non-expert — flag point,
false positive, provenance, and the status badge vocabulary — and all four are currently expressed
in the wrong register. The other 37 are visible to every visitor and needed by none of them.

The single worst offender is the **status badge vocabulary**, because it appears six times on
every run: `PASS`, `INCONCLUSIVE`, `NOT RUN`, `ATTENTION`. "Inconclusive" is applied to the
writing suggestions row, which is not inconclusive — it is deliberately not a verdict at all.
"Attention" is applied both to a flagged model result and, on the static section 02 cards, to
checks that have not run and cannot be flagged.

---

## 3. Findings, ranked by what they cost a first-time user

Each finding is labelled **[AUDIT]** (found here) or **[REDESIGN.md]** (raised by the bug-fixing
session and reproduced here).

---

### F1 — 1,112 words stand between landing and pressing the button **[AUDIT]**

**Evidence.** 422 words before the paste box, 690 more between the box and the Inspect draft
button, measured on a fresh load at 1440×900. The button is 3,079 px down; at 375 px it is
5,266 px down, 6.5 screens. [S1], [S2], [S6]

Inside that 690 words: a 190-word paragraph headed "Where your draft goes" directly under the
paste box; an 88-word explanation of the named signals model; a 101-word radio label; a 64-word
radio label; a 49-word watermark-scan note. Every one is true and carefully written. Collectively
they are the reason the tool reads as a document rather than a tool.

The right-hand panel makes it worse: half the screen is a black box containing an 80-word
paragraph explaining what will appear there later [S2]. The most valuable real estate on the page
is spent describing itself.

**Recommendation.** Put the paste box and the run button in the first screen, together, with
nothing between them but the character count. Move every word of the 690 behind progressive
disclosure: a one-line reassurance strip with a "What happens to my text?" link (Unmark's "Your
files never leave this device" strip is the reference), a collapsed "Advanced" group for the five
check toggles, and the route choice as a two-option segmented control with six words each. The
empty results panel should say nothing at all, or one line.

---

### F2 — The verdict never says why **[AUDIT]**, related to **[REDESIGN.md item 2]**

**Evidence.** On a 433-word AI passage the screen says "Very likely AI", "99.0% PROBABILITY", and
then 1,523 words of statistics, method and caveat. Nowhere does it say what about the text read
as machine-written. [S3]

The only thing on the page that looks like an answer to "why" is the "Findings by category" list
1,050 words further down, and its own copy says: *"These are editing observations about phrasing
and structure. They say nothing about who or what wrote this draft."* Yet the legend directly
above those same highlights is headed **"AI-STYLE EVIDENCE"** [S4]. The page labels one thing two
opposite ways within 400 px.

This is the owner's complaint stated precisely. He asked for *"it's flagging xyz as AI generated
because abc in layman's terms"*. The tool currently cannot produce "because abc" for the score,
and the thing that looks like "because abc" is disclaimed.

**The constraint is real and must be respected.** REDESIGN.md records the project's own
measurement: only 35.9% of sentences push their document towards "machine" (2,174 deletions
across 57 documents). The tool genuinely cannot highlight "the AI sentences". Any redesign that
paints sentences red is lying.

**Recommendation.** Replace the missing "why" with two things the tool *can* honestly show:

1. **Where, not why.** The section-by-section list already exists and already answers "which part
   of my document reads as machine-written". Promote it from below the gauge to beside it, as a
   simple bar per section with its own plain label. This is the honest version of "because abc".
2. **A one-sentence plain summary in a fixed shape**, generated from the run, e.g. *"The model
   read this in 2 parts. Both scored high. The strongest part is the second half, from word 225
   on."* Then a single "What made it score this way?" disclosure that says, in one paragraph and
   no numbers, that the model reads sentence-to-sentence variety rather than vocabulary, and that
   nobody — including us — can point at individual sentences.

Rename the highlight legend. "AI-STYLE EVIDENCE" must not sit above findings the page then
disclaims.

---

### F3 — The two routes disagree by 33 points on the same document, while the page says they give "the same evidence" **[AUDIT]**

**Evidence.** Built-in "Mixed sample" (498 words), same session, current bundle `BmBg5FTU`:

| Route | Probability | Label shown |
|---|---|---|
| In this browser (int8) | **0.9183** | Leaning AI |
| Our EU server (fp32) | **0.5866** | Leaning AI |

A **33.2 percentage-point** gap. [S8] shows the server reading.

The route selector says of the browser option: *"Slower to start, and the same evidence at the
end."* The closing section says *"one click moves it into your browser instead"*, framing the two
as interchangeable. On this document they are not.

They happen to land in the same band, which masks the problem. 0.9183 is 0.0317 below the 0.95
boundary; a slightly different document would read "Likely AI" in the browser and "Leaning AI" on
the server, from one click.

**This is consistent with the project's own record and inconsistent with its copy.**
`thresholds.json` `runtime_note` states a median absolute difference of 0.113 on human long-form
between the web runtime and native Python. HANDOVER §4.4 states 0.0002 between fp32 and int8-web
*in the decision region*. This document is not in the decision region, and there the disagreement
is large. Both statements can be true; only one of them is on the page.

**Recommendation.** Either stop describing the routes as giving the same answer, or stop showing
a number outside the decision region. The honest version of the route note is: *"Same model, run
on your machine instead of ours. Near the flag point the two agree closely. Well below it they can
differ by a lot, so treat a mid-range number as 'not flagged' rather than as a score."* Better
still, outside the flag region show the band and the section bars and suppress the decimal
entirely — the number is precision the model does not have there.

---

### F4 — The band ladder now over-accuses **[AUDIT]**, follow-through on **[REDESIGN.md item 1]**

**REDESIGN.md item 1 asked me to verify the fix rather than re-find the bug. Both halves of that
answer matter.**

**The fix is live and it works, and it landed during this audit.** At 15:37 on bundle `BMU3YIV9`
the built-in Mixed sample scored **91.8% AI-style** and rendered **"Likely human"** with a **green**
gauge arc, a green chip and green section bars — exactly the defect item 1 describes. That is
[S5], and it is a *historical* capture, not a live defect. At 15:47 on bundle `BmBg5FTU` the same
sample read **"Leaning AI"** in **amber** [S8]. I confirmed the mechanism directly: the shipped
`BAND_COLOUR` map changed from `likely_human:"#7fb08a"` (green) to `likely_human:"#e2b03f"`
(amber), and the chip CSS from `background: rgb(35,81,58)` (green) to `rgb(93,67,26)` (amber).

**Against item 1's own constraints, on the live site now:**

| Constraint | Verdict |
|---|---|
| No band above 0.5 called human in words, colour or icon | **Passes.** 0.5+ reads "Leaning AI" in amber; green `#6fae86` is reserved for the sub-0.5 band, now "Leaning human". |
| Band names survive a threshold change without a rewrite | **Fails.** |
| A single glance must not produce the wrong conclusion | **Fails, in the opposite direction to before.** |

**The current live ladder** (from live `thresholds.json`, fetched 15:52) is a *third* label set,
different from the one in item 1's table and different again from what the same file served at
15:33:

| Floor | Item 1's table says | Live at 15:33 | **Live now** |
|---|---|---|---|
| 0.984 | Very likely AI | Very likely AI | Very likely AI |
| 0.95 | Uncertain — leaning AI | Uncertain — leaning AI | **Likely AI** |
| 0.50 | Uncertain | Uncertain | **Leaning AI** |
| 0 | No AI signal found | No AI signal found | **Leaning human** |

Three of the four names now assert AI. Two consequences:

1. **The words contradict the machinery.** A document at 0.96 reads **"Likely AI"** on screen
   while the chip immediately beside it reads **"BELOW THE 98.4% FLAG POINT"** and the check row
   is not a flag. Item 1's failure was words saying human while the number said AI. This is the
   same class of failure rotated: words say AI while the tool's own decision says not flagged.
2. **It contradicts the measured data printed underneath it.** At 58.7% the screen says "Leaning
   AI"; the band's own `measured` string, rendered two lines below, says *"1.6% of AI documents
   and 32.92% of human documents landed here; 15 of the 1,541 documents in this band were AI."*
   Under 1% of documents in this band were AI, and the label says "Leaning AI".

**Recommendation.** Stop naming bands after a conclusion. Name them after what the tool did, so
they survive both a threshold move and a base-rate argument:

| Floor | Name | Support line |
|---|---|---|
| ≥ flag point | **Flagged** | "Strong machine-writing signal. Not proof of who wrote it." |
| 0.5 – flag point | **Not flagged** | "Some machine-like patterns, below where we call it." |
| < 0.5 | **Not flagged** | "No machine-writing signal found. This is not a human verdict." |

One word decides the glance; the flag point never appears in a name; lowering the threshold moves
documents between two neutral labels instead of forcing a copy rewrite. Colour follows the same
rule: one amber for flagged, one neutral grey for everything else, and no green anywhere — green
reads as "you're fine", which the tool must never say.

---

### F5 — "Highlights in your draft" merges three unrelated things and needs two disclaimers **[REDESIGN.md item 2, reproduced]**

**Reproduced on the live site**, every run. [S4]

The panel's own copy, verbatim:

> "Two different kinds of highlight appear below, and they mean opposite things. Writing-signal
> matches are the AI-style evidence. Protected facts are the numbers, prices, dates, links and
> organisation names this tool would lock during a rewrite: they are never evidence of AI writing."

Then, 200 px later:

> "8 writing suggestions highlighted below. These are editing observations about phrasing and
> structure. They say nothing about who or what wrote this draft."

And between them, a legend headed **"AI-STYLE EVIDENCE"** containing "high / medium / low
writing-signal match" and a `ZWSP` chip, and a second legend headed **"FACTS TO PRESERVE, NOT AI
EVIDENCE"**.

So one surface carries: findings called AI-style evidence that are explicitly not authorship
evidence; hidden-character findings that *are* hard evidence of manipulation but not of AI; and
rewrite anchors for a rewrite feature that does not exist yet (the button below reads "Protect
these facts (planned)"). Two headings, two disclaimers and a legend fail to separate them because
the visual treatment does not: they are all coloured spans in the same block of text.

Layout also breaks here. The finding detail column on the right is clipped mid-sentence by the
marked-up draft column — "This is a stylistic hint, not evidence of authorship" is cut off in
[S4].

**Recommendation.** Split it into two panels with a hard visual break, and drop the third
entirely for now.

- **Panel A — "Things we found in the characters."** Hidden characters and lookalikes only. These
  are exact, checkable, and the one place where a highlight means what a reader assumes. Give them
  the draft view.
- **Panel B — "Editing notes."** A plain list, no highlighting in the draft at all, headed
  "Suggestions for your editor — these say nothing about who wrote it." No severity colours; a
  count and a list.
- **Remove the protected-fact highlights and the "Protect these facts (planned)" button** until
  the rewrite feature ships. Shipping a disabled button for an unbuilt feature costs comprehension
  and buys nothing.

---

### F6 — A finding renders as the single character "W"; root cause located **[REDESIGN.md item 3, reproduced and diagnosed]**

**Reproduced, and it is broader than item 3 records.** Pasting a 216-word passage engineered to
repeat content words across adjacent sentences produced two findings, both rendering their matched
text as **"W"** — the first character of the document, which began "Wetlands…":

- `adjacent-lemma-repeat` → `“W”`
- `passive-ratio` → `“W”`

The highlight element carries `data-keys="p0 p1"`, so two findings share one one-character anchor.
The "Rule-match frequency" table below then lists the matched phrase as **`w ×14`**.

**Item 3 asks which of two causes it is. It is the second: a rendering bug on the website, not a
span bug in the core.** The one-step test resolves it in the source:

In the vendored core (`node_modules/@opace/content-integrity-core/dist/bundle.js`), document-level
rules deliberately emit no span:

```js
pushEx("adjacent-lemma-repeat", `${repeats}/${contentSets.length - 1} adjacent sentence pairs
  repeat a content word`, null, null, { … })   // ← start and end are null, by design
```

`toFinding()` then handles that correctly and flags it:

```js
let documentLevel = false;
if (start === null || end === null || end <= start) {
  [start, end] = docAnchor(original);   // docAnchor returns [0, 1]
  documentLevel = true;
}
const matched = original.slice(start, end);   // → "W"
…
...documentLevel ? { document_level: true } : {}
```

The core is correct: it supplies a placeholder anchor **and** publishes
`evidence.document_level = true` so a consumer can tell. The website ignores that flag.
`src/components/tools/content-integrity/integrity-controller.ts:327`:

```ts
item.append(el("b", finding.evidence?.matched ? `“${finding.evidence.matched}”` : finding.rule_id));
```

and line 329's guard `finding.span.end_utf16 > finding.span.start_utf16` passes, because the
placeholder span is 0→1, so the "Show in draft" jump button and the draft highlight both render
too.

**No re-vendoring is needed.** The fix is local to the site: when `evidence.document_level` is
true, render the rule's human name instead of the quoted excerpt, suppress the "Show in draft"
button, suppress the draft highlight, and exclude the finding from the rule-match frequency table.
The finding's `evidence.detail` already contains the readable string — *"2/9 adjacent sentence
pairs repeat a content word"* — which is exactly what should be shown.

---

### F7 — The result is 1,523 words and 5.8 screens **[AUDIT]**

**Evidence.** Measured on a single 433-word server-route run: 1,523 words, 4,359 px, containing
among other things two separate 200-word paragraphs restating the same measured detection figures,
a transport table with six rows including `fp32 build e313ab00de1f` and `contract segments-v2`,
and a per-key watermark table of mean g and p-values for three demo keys that found nothing.

The user pasted 433 words and got 1,523 back.

**Recommendation.** One screen of result: verdict word, section bars, and three collapsed
disclosures — "What was checked", "What we sent and where", "How reliable is this". The transport
receipt and the method paragraphs are genuinely valuable and must survive, but as things you open,
not things you scroll past. The watermark table should not render at all when nothing was found
(see F15).

---

### F8 — The threshold is hard-coded into user-facing copy **[AUDIT]**, constrained by **[REDESIGN.md item 5]**

**Evidence.** Every run renders a chip reading **"AT OR ABOVE THE 98.4% FLAG POINT"** or **"BELOW
THE 98.4% FLAG POINT"**, built in `integrity-controller.ts` from
`` `at or above the ${(threshold*100).toFixed(1)}% flag point` ``. The figure also appears inside
three separate long paragraphs in the result and in the band `measured` strings.

REDESIGN.md item 5 records that the owner is actively weighing moving this number, and that two
corpora in the repository disagree on detection rates by a factor of thirty on some registers
(academic 92.4% vs 1.1%). The number is contested and provisional, and it is printed on screen
next to a verdict as though it were settled.

Beyond the threshold: 45 distinct figures appear in the checker's copy before a run. Several are
already inconsistent with each other (F12).

**Recommendation.** No number in a band name, a chip, or a headline. The chip becomes "Flagged" or
"Not flagged"; the threshold moves into the "How reliable is this" disclosure, sourced from
`thresholds.json` at runtime with its corpus and denominator beside it, so a threshold change is a
data change and never a copy change. Apply the same rule to detection and false-positive rates:
one place, once, with its corpus named.

---

### F9 — The browser route is four bad moments in a row **[AUDIT]**

Four separate problems at the point where the owner's privacy promise is actually delivered:

1. **The choice is 165 words.** The two radio labels are 101 and 64 words. Nothing is laid out for
   comparison — no side-by-side, no "download" vs "no download" cue, no icon. The one thing that
   actually differs (34.5 MB and about a minute, versus your text leaving the browser) is buried
   in the middle of each paragraph.
2. **Choosing it produces silence, then a second primary button.** Selecting the radio changes
   nothing visible. An 88-word consent paragraph appears further down, ending in a second button —
   "Download the model to this browser (34.5 MB, one-off)" — competing with "Inspect draft".
3. **Pressing the wrong one burns a run.** Clicking "Inspect draft" without downloading produced a
   full "Run 3 this session" evidence panel of over 1,000 words whose headline was "No AI
   assessment", explaining that the model had not been downloaded and suggesting the user switch
   *back to the server route*. It did not offer the download. Error prevention failure: that
   button should have started the download, or been disabled with the reason attached.
4. **The download is 77 seconds with no progress bar and no ETA.** Measured: 76.9 s to
   "Model ready". Feedback is a single line of text reading *"Downloading file 2 of 2
   (tier3-cycle2-e5small-int8-perchannel.onnx): 15.2 MB of 34.3 MB."* — the raw filename, no
   percentage, no bar, no time remaining. The first file's line reads *"0.2 MB of 0.1 MB"*. When
   it finishes, the stale "34.3 MB of 34.3 MB" line stays on screen beside "Model ready in this
   browser (tier3-cycle2-v1)".

**Recommendation.** Make it one control and one moment. A segmented toggle — "Fast (our EU
server)" / "Private (your device)" — with one line each: *"Your text goes to our server in
Belgium. Nothing is kept."* and *"Nothing leaves this device. One-off 35 MB download, about a
minute."* Selecting "Private" starts the download immediately with a real progress bar, a
percentage and an estimate, and the run button stays available and queues behind it. Never show
the filename. Clear the progress line on completion.

---

### F10 — What a screen reader is asked to listen to **[AUDIT]**

**Evidence, from the live accessibility tree:**

- The paste box's accessible description is the **entire 190-word "Where your draft goes"
  paragraph plus "AI-writing patterns are editorial hints, not proof of authorship"**. A screen
  reader user hears roughly 200 words of policy on focusing the text box, every time.
- The two route radios have **101-word and 64-word accessible names**. A radio group announced as
  a hundred-word paragraph is unusable.
- The results container is `aria-live="polite"` with no `aria-atomic` and wraps the whole
  **1,523-word** result. Progress messages during the run replace text inside it, and the
  finished result is a single large insertion.

**What is right and must be kept:** the gauge is `role="img"` with
`aria-label="Model probability 98.9 per cent. Very likely AI."` — exactly correct. The verdict
paragraph is `role="status"`. Tab order through the tool is 14 stops and logical. The three input
tabs use a correct roving-tabindex ARIA tab pattern.

**Recommendation.** Strip the descriptions to one short sentence each and expose the detail
through a visible, focusable "What happens to my text?" disclosure. Give the radios six-word
names. Replace the whole-panel live region with a small dedicated status element that announces
exactly the sentence a person needs: *"Finished. Flagged. 99 per cent. Two sections scored.
Results below."*

---

### F11 — Mobile puts the tool 6.5 screens down and hides it under an advert **[AUDIT]**

**Evidence.** At 375×812: paste box at 3.2 screens, run button at 6.5 screens, page 15.7 screens
tall. Five check toggles are 19 px tall. The sticky "FREE PROPOSAL" bar and the floating
back-to-top button sit on top of the tool copy [S6]. The three input tabs stack to three full-width
rows, costing another 150 px before the box.

Nothing overflows horizontally and the layout does not break — this is a hierarchy problem, not a
responsive one.

**Recommendation.** On mobile the tool must be the first thing below the H1. Everything currently
above it becomes one line plus a link. Raise the toggle rows to 44 px. Suppress the sticky CTA bar
on the two tool pages.

---

### F12 — The pages contradict themselves on numbers and rules **[AUDIT]**

Collected from live copy, all visible to one user in one session:

| Contradiction | Where |
|---|---|
| "116 named rules" vs "113 named rules" — **both inside the same result panel** | Result row: "0 phrasing and structure observations from 116 named rules"; paragraph above: "editorial feedback from 113 named rules" |
| "Exact checks can run below 50 characters" vs "our EU server needs at least 60 words" | Intro line above the tool; error message after a wasted run |
| "usually about a second" (route label) vs measured 4.8 s, 5.8 s, 7.4 s, 7.6 s | Route radio vs four live runs |
| "detects about 90% … wrongly flags about 1.3%" vs "90.6% … 1.38%" vs "90.3% … 1.34%" | Input panel vs server result vs browser result |
| "Protect these facts (planned)" rendered as an enabled-looking button | Result action row [S4] |
| Progress line stuck at "34.3 MB of 34.3 MB" beside "Model ready" | Browser route, after download |
| Result says "no comparison gate ran in this release" for Protected content, badged INCONCLUSIVE | Every run |

The 60-word minimum is the costly one: it is not stated anywhere before you run, so a short
passage costs a full round trip to discover.

**Recommendation.** One source of truth per figure, read from data at render time. State the
60-word minimum in the character counter itself ("22 words — the AI check needs 60"), and disable
the run's model check rather than discovering it server-side.

---

### F13 — The suite index offers eight tools, six of which do nothing **[AUDIT]**

**Evidence.** 859 words, eight cards. Two are usable (Checker, Lab). Six are badged `PLANNED`,
`SUBMISSION CANDIDATE 1.0.4`, `SUBMISSION CANDIDATE 0.1.0`, `SUBMISSION CANDIDATE 1.0.0`,
`PUBLICATION CANDIDATE 0.1.0`. "Submission candidate" and "publication candidate" are internal
release-process vocabulary; a version number is not a status a visitor can act on.

The index also duplicates the checker and the Lab wholesale: the same "Real SynthID mathematics;
Anthropic production keys stay private" evidence rail, the same "Need help putting content checks
to work?" block, the same closing CTA. Three pages, one set of words.

**Recommendation.** Two cards above the fold — the two things that work. Everything else under a
single "Coming soon" line with no version numbers. Delete the duplicated evidence rail and
closing block from the index; it is the parent, it should not repeat its children.

---

### F14 — The Lab buries its best asset **[AUDIT]**

**Evidence.** 790 words on the page; **695 of them before the text box exists**, because the box
only appears after a gated 1.7 MB download. The H3 above the visualisation reads **"Passage,
coloured by per-token g-value"**. The sample selector offers 24 options named
`wm-alpha-200-01 · Watermarked · 200 tokens · key alpha`. The result is six metric tiles — MEAN G,
WEIGHTED MEAN G, Z-SCORE, P-VALUE, SCORED POSITIONS, KEY · DEPTH — with no plain gloss.

And then, only after you switch to the wrong key, the page produces **the single best sentence in
the entire suite**:

> "Same text, wrong key: the signal vanishes. This is why nobody can check for Claude's watermark
> without Anthropic's private key." [S7]

That sentence is the whole page. It explains, in nineteen words a schoolchild could follow, why
the Lab exists, why nobody can verify Claude output, and why the checker reports "not assessed".
It is reachable only by a visitor who has already read 695 words, accepted a download, found a
radio group labelled with opaque key names, and chosen the option that produces a negative result.

**Recommendation.** Invert the page. Open with the wrong-key demonstration, pre-run, no download
gate: two panels side by side, same text, right key and wrong key, with that sentence as the H2.
Load the 1.7 MB module lazily behind "Try it with your own text". Rename the visualisation heading
to "Which words carry the watermark". Replace the fixture ids with human labels ("Watermarked,
short" / "Not watermarked" / "Watermarked then edited"). Move the metric tiles behind "Show the
numbers".

---

### F15 — The watermark scan runs on every check and means nothing to a normal reader **[REDESIGN.md item 6, confirmed]**

**Evidence.** Every run ends with:

> "No statistical watermark signal under any of the 3 public demo keys held by this tool (mean
> g ≈ 0.5, the no-watermark value). Provider keys (Anthropic, Google production) are private, so
> absence of signal here can never clear or accuse a text."
> `INCONCLUSIVE` … then a table of `MEAN G` / `P-VALUE` for three keys.

It will read "no signal" on every text any visitor ever pastes, because no visitor's text was
generated with an Opace demo key. It is a check whose result is known in advance.

**Recommendation.** Do not run it on pasted user text by default. Replace the row with one line —
*"Claude and Gemini watermarks: nobody outside those companies can check these yet. See how
watermarks work →"* — linking to the Lab. Keep the full scan as an opt-in for anyone testing Lab
fixtures.

---

### F16 — The section list should lead **[REDESIGN.md item 6, agreed]**

Agreed, and F2 makes it more urgent: the section bars are the only honest answer the tool has to
"which part of my document is the problem". They currently sit below the gauge, below a 90-word
statistics paragraph, below a 60-word caveat paragraph, and read as an appendix. They should sit
immediately beside the verdict word.

---

## 4. The keep list — what is genuinely good and must survive

1. **Empty input.** Clicking Inspect draft with nothing pasted gives *"Paste a draft, upload a
   file, or load one of the examples first."* and moves focus to the text box. Textbook.
2. **Short input.** *"This draft is too short for the model: our EU server needs at least 60
   words. No probability is shown."* — the number, the reason, and a clear refusal to guess. This
   is the register the whole tool should be written in.
3. **The wrong-key sentence in the Lab.** *"Same text, wrong key: the signal vanishes. This is why
   nobody can check for Claude's watermark without Anthropic's private key."* Best writing in the
   suite. Promote it.
4. **The Lab hero status.** "Claude production verification: NOT AVAILABLE" as a dated badge above
   the fold. Honest, immediate, and the opposite of hedging.
5. **The transport receipt.** "Your whole draft, 433 words, went in one request; the server
   reports processed *server* and retained *nothing*." Verifiable per run rather than a policy
   promise. Nobody else does this. Keep it, behind a disclosure.
6. **The max-not-mean argument and the section list.** Correct, defensible, and the strongest
   comprehension asset on the page once it is promoted (F16).
7. **Colour contrast.** Sixteen live pairs sampled, lowest 6.89:1. Nothing to fix.
8. **Focus and keyboard.** 3 px `#0B7285` focus ring at 4 px offset, 3.17:1 on the darkest
   background it appears on; 14 logical tab stops through the whole tool; correct roving-tabindex
   ARIA tab pattern on the three input tabs.
9. **Reflow.** No horizontal scrolling at 375 px or at 200% zoom. Six `prefers-reduced-motion`
   blocks. Clean console across seven runs.
10. **The gauge's accessible name.** `"Model probability 98.9 per cent. Very likely AI."`
11. **The "not run" discipline.** Unavailable methods stay visible and are never counted as a
    pass. This is the project's core commitment and the implementation honours it.
12. **The verdict paragraph's honesty.** *"a low figure is not a human verdict"* — exactly right,
    and it must survive every simplification below.

---

## 5. Honesty audit

The brief asks whether the deliberate honesty currently *reads* as honesty or as noise. Split
verdict.

**Reading as honesty — working:**

- **"NOT AVAILABLE" as a hero badge** on the Lab. A dated, unmissable statement that the thing
  named in the page title cannot be done. That is not hedging; that is a headline.
- **The short-passage refusal.** Declining to score rather than scoring badly, with the number and
  the reason.
- **The per-run transport receipt.** Honesty you can check rather than honesty you must believe.
- **"a low figure is not a human verdict"** in the verdict block. One sentence, load-bearing,
  right where it is needed.
- **Publishing the writing rules' false-positive rate (24.8%) and demoting them from detection to
  editing.** Very few tools would do this. It is the most credible thing on the page.

**Reading as noise — not working:**

- **2.98 negations per 100 words.** Honesty delivered at that density stops reading as candour and
  starts reading as legal cover. The signal is drowned by its own volume.
- **"What an AI detector cannot prove" as a whole page section** whose body is a 168-word
  paragraph of per-provider percentages. The heading promises a limit; the body delivers a
  statistics dump. A reader learns nothing they can use.
- **Two disclaimers on the highlights panel** (F5). A panel that must tell you twice what it is not
  is a panel that has not decided what it is. The disclaimers are honest; the panel is not honest
  *design*.
- **`INCONCLUSIVE` on the Protected content row**, reading "0 exact anchors recorded for the
  receipt; no comparison gate ran in this release". This is not honesty about a limit, it is an
  unfinished feature reported as a result.
- **"Protect these facts (planned)"** as a button. Shipping the UI for an unbuilt feature so the
  page can be transparent about the roadmap costs the user a click and an explanation.
- **The watermark scan on every run** (F15). Honest in wording, meaningless in practice, and it
  trains readers to skip the last third of every result.

**Two honesty commitments that are currently at risk:**

1. **"An AI score is never presented as proof of authorship."** The wording holds everywhere.
   But the *ladder* now says "Very likely AI / Likely AI / Leaning AI" for three of four bands
   (F4), and two of those three appear on documents the tool does not flag. The words in the small
   print say "not proof"; the words in 22 px bold say "Likely AI". At a glance, the loud half wins.
2. **"Both routes must stay honest about which one ran."** They do — every result names its route.
   But the copy also told the user the routes give "the same evidence at the end" — wording since
   **retracted**, quoted here as the thing retracted — and on the
   page's own built-in sample they differ by 33 points (F3). Naming the route is not enough if the
   page also claims the route does not matter.

Both are fixable in copy, and neither requires giving up any commitment. The redesign should treat
"honest" and "quiet" as compatible: say the true thing once, in short words, in the place it is
needed, and put the evidence one click away instead of in the reading path.

---

## 6. Reconciliation with REDESIGN.md

| REDESIGN item | Status here | Reading |
|---|---|---|
| **1** Verdict language and colour contradicted the number — *fixed* | **Verified fixed, mid-audit.** | Agreed and confirmed by two mechanisms (shipped `BAND_COLOUR` map and chip CSS). I captured the pre-fix state at 15:37 [S5] and the post-fix state at 15:47 [S8]. **But the replacement ladder breaks two of item 1's own three constraints** — see F4. Live labels are now "Very likely AI / Likely AI / Leaning AI / Leaning human", a third set, matching neither item 1's table nor what the same file served ninety minutes earlier. |
| **2** "Highlights in your draft" not understandable | **Reproduced.** | Agreed in full, plus a layout defect the item does not mention: the finding detail column is clipped mid-sentence by the draft column [S4]. Recommendation in F5. |
| **3** A finding renders as `"W"` | **Reproduced, and diagnosed.** | **It is cause 2, a rendering bug on the website, not a core span bug.** It also affects more than `adjacent-lemma-repeat`: `passive-ratio` renders `“W”` too, and the rule-match frequency table lists `w ×14`. The core deliberately emits `start: null` for document-level rules and publishes `evidence.document_level = true`; `integrity-controller.ts:327` ignores that flag. No re-vendoring needed. Full trace in F6. |
| **4** Vendored core may be behind source | **Closed by the coordinator before I reached it.** | Not investigated. Accepted as closed; no engine drift. |
| **5** The flag point may move | **Adopted as a constraint, and one live violation found.** | The threshold is hard-coded into a chip on every run via `` `${(threshold*100).toFixed(1)}% flag point` ``. Copy must not be able to see the number — F8. |
| **6a** Section bars should lead | **Agreed, and upgraded to a priority.** | F16. F2 makes them the only honest "why" the tool has. |
| **6b** The 4.4-second wait / route asymmetry | **Measured.** | Server route: 4.8–7.6 s across four runs, with an indeterminate text-only status. Browser route with a warm cache: 1.8–2.2 s. Cold cache: 77 s download, no progress bar, no ETA. The asymmetry is real and the cold-cache case is far worse than the item suggests — F9. |
| **6c** Failure states unreviewed | **Two reviewed, one new defect.** | Empty input and short input are both **good** and go on the keep list. The "browser route selected but model not downloaded" state is **bad**: it burns a run, produces a 1,000-word panel, and points the user back to the other route instead of offering the download — F9.3. |
| **6d** Watermark scan meaningless to non-technical readers | **Confirmed.** | Agreed, and it appears on every run with a known-in-advance result — F15. |

---

## 7. What I did not test

- No screen reader was actually run. Accessible names, descriptions and live-region wiring were
  read from the live accessibility tree; the announcement *experience* is inferred from that, not
  observed.
- No image or PDF was uploaded, so the C2PA provenance path was not exercised. Only a `.txt`
  upload was tested.
- Rate-limited, server-unavailable and over-4,000-word failure states were not provoked; I did not
  want to trip production abuse controls.
- No automated WCAG rule engine was run; contrast, target size and reflow were measured directly
  in the page.
- The 512-word GPT-5.6 reproduction case named in REDESIGN.md was not used — I did not have the
  text. Findings F3 and F4 use the page's own built-in "Mixed sample", which reproduces the same
  0.50–0.95 states.

---

## 8. The three changes that would do the most good

1. **Put the tool in the first screen and move all 1,112 words of preamble behind disclosure.**
   Everything else on this list is easier once the page stops being a document. (F1, F11, F13)
2. **Rebuild the verdict block: a neutral band name, section bars beside it, and one plain
   sentence saying where the evidence is — with no number in any label.** This fixes the glance
   problem in both directions, survives the threshold moving, and is the closest honest answer to
   "why is it flagging this". (F2, F4, F8, F16)
3. **Split "Highlights in your draft" into character findings and editing notes, and stop
   rendering document-level findings as highlights at all.** That removes the panel the owner
   could not understand and the `"W"` defect in the same change. (F5, F6)
