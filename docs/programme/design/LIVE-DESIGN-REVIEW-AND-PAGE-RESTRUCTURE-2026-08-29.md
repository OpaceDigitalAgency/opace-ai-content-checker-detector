# Live design review, and the page restructure that followed

**Agent:** UI-5. **29 August 2026.** Site commit `3169a6d6`, deployed and verified live.

Screenshots: `screenshots/live-review/`. Everything below was read off rendered
pages in a real browser at 1440, 768 and 375, light and dark. Nothing here was
concluded from markup or a string search.

---

## 1. What was actually shipped, and what was not

The result-block rewrite (step 3, `324320e0`) landed and is good. The page
around it never changed. Measured on the live page before this work:

| Section | Desktop height |
|---|---|
| Hero | 790 px |
| Inspect your draft | 5,496 px |
| What an AI detector cannot prove | 1,284 px |
| Use it in WordPress or locally | 603 px |
| FAQ | 1,014 px |
| Two closing blocks | 1,544 px |
| **Whole page** | **7,567 px** |

---

## 2. The owner's four complaints, quantified

### 2.1 Too much text above the tool

Counted as visible words in `<main>` preceding the run button, with closed
disclosures and `[hidden]` subtrees excluded.

| | Before | After | Mockup target |
|---|---|---|---|
| Words before the run button | 1,084 | **274** | 79 |
| Words before the paste box | 386 | **140** | 31 |
| Whole-page visible copy | 1,665 | **630** | 1,073 |
| Paste box, 375 px | 2,708 px (3.3 screens) | **1,006 px (1.24)** | 0.43 |
| Run button, 375 px | 6,100 px (7.5 screens) | **1,998 px (2.46)** | 1.08 |
| Whole page, 375 px | 12,349 px | **6,930 px** | — |
| Whole page, 1440 px | 7,567 px | **5,578 px** | — |

The two remaining gaps to the mockup are both the shared Opace hero, which the
mockups do not have: 582 px on a phone before the tool section starts, plus the
breadcrumb. The evidence card now stands down under 700 px, which is what took
the phone figure from 2,603 px to 1,998 px.

### 2.2 Too much happening lower down

Four bands, of which one was pure duplication.

- **"What an AI detector cannot prove"** — three paragraphs, 1,284 px. Two of
  the three were method essays. **Kept as a band, cut to the callout, the
  figures and the watermark boundary; the rest is one disclosure.** 1,284 px →
  679 px.
- **"Use it in WordPress or locally"** — 603 px saying what `OpaceProductLinks`
  says 500 px later. **Deleted.** Its one load-bearing sentence, that nothing is
  downloadable until it clears approval, moved into the closing.
- **FAQ** — already disclosures, already carrying `FAQPage` schema. **Kept
  whole.**
- **Two closing blocks** — `OpaceProductLinks` carries the three real links.
  **Both kept**, the closing's copy shortened.

### 2.3 Busy

Counted as distinct bordered or filled containers visible at once inside the
tool card, desktop, before a run: **before 11, after 4.**

The worst of it was six levels of nesting in one card: panel → "Checks in this
release" fieldset → green "Named signals model (beta)" box → "Where the model
runs" fieldset → two white radio cards → a yellow caution box, with a dashed
"FILE CHECK" box and a blue "Watermark scan" box beside them. Four colour
families — green, blue, yellow, dashed beige — competed inside one cream card,
none of them meaning anything a reader could name.

Now: the panel, two radio cards, one caution, two disclosure rows. The green,
blue and dashed families are gone. The route cards are the only thing with a
border inside the panel, which is correct, because the route choice is the only
decision a person has to make before pressing the button.

### 2.4 Language

Every term below appeared in the reading path above or immediately below the
tool, and none is one a competent SEO or copywriter could reliably define.

| Term | Where it was | What happened |
|---|---|---|
| "text hygiene" | hero lead | deleted |
| "protected facts" | hero lead | "protected content", and out of the hero |
| "six named method states" | hero evidence card | "three separate answers" |
| "evidence summary" | hero evidence card | unchanged (shared component, 6 pages) |
| "hidden Unicode carriers", "415 code points", "zero-width, tag, variation-selector" | the 200-word paragraph above the box | that paragraph left the reading path; the plain version says "invisible characters" |
| "lookalike / homoglyph" | check labels | "Lookalike characters", kept, now behind a disclosure |
| "model-attributed artefact forensics" | above the box | rewritten out |
| "punchline density", "contrast habits", "chat-export formatting" | above the box | behind a disclosure |
| "provenance" | file-check box | "a maker's mark" |
| "C2PA 2.3 §A.8" | file-check box | kept verbatim, behind a disclosure, because it is a precise claim |
| "512-token window", "fp32 runtime", "segmented", "flag point" | between box and button | behind disclosures, or in the result where they are data |
| "register" | limits band | "short marketing, SEO and social copy" |
| "not assessed" | watermark note | "not checked rather than guessing at it" |
| "SynthID-Text detection mathematics" | above the box | "the published SynthID-Text maths", behind a disclosure |

The hero lead is now one sentence a school student can read: *"Paste your
writing and get three separate answers: how much it reads like AI, whether it
hides any invisible characters, and which phrases sound tired. We never add them
up into one score."*

---

## 3. Does it read as Opace?

Yes, and it did before. This is the one place the earlier work was not at
fault. The dark hero with the orange accent word, the OPACE nav, the evidence
card, the cream tool band, the `tools-button--primary` pill and the closing
block are the same components the rest of the tools directory uses, and they
render correctly at all three widths. The divergence from the mockups is that
the mockups extracted the tokens into a standalone page; the live page uses the
components directly, which is better.

**One honest finding on theme.** The page does not respond to
`prefers-color-scheme` at all: the light and dark captures are pixel-identical
apart from the scrollbar. Its light and dark alternation is by section, which
is the house pattern across opace.agency. That is a site-wide decision, not a
checker defect, and it is recorded here rather than changed.

---

## 4. What moved, and what deliberately did not

**Behind disclosures, not deleted:** the 200-word method paragraph; the 150-word
privacy essay the paste box used to announce on focus; both 90-word route
paragraphs; the six check toggles and their notes; the file-check and watermark
notes; the corpus line; the register scope; the writing-rules measurement.

**Kept in the reading path, deliberately:**

- The route choice and its privacy trade, stated before the run. Hiding it
  would be shorter and would break the standing rule that the interface says
  the truthful answer for the route about to run.
- "No result proves human authorship… never counted as a pass."
- The shipped figures with their denominators, tagged long-form, and the
  register nothing has measured.
- "No public verifier exists" for the production watermarks.

**Deleted for good:** the `01 /`–`05 /` section numbering, the duplicate routes
band, and the nested box families.

---

## 5. The lab

Finding **F14** in the live UX audit: the lab buries its best asset. The
experiment now leads the page; the dated status block sits under it, where it
answers the question the experiment raises. The hero lead says what the page
does rather than describing a boundary: *"Watch a watermark check pass with the
right key and fail with the wrong one… It cannot check anything Claude wrote,
and nor can anyone else outside Anthropic."* The boundary panel is unchanged
and still visible; it is the honesty of the page and does not belong behind a
click.

Not done on the lab: the fixture ids, the six unexplained metric tiles and the
"per-token g-value" caption are still as they were. They are inside
`WatermarkLabSection` and its controller, and rewording them is a separate
bounded change.

---

## 6. The ledger, re-run from the running page

Enumerated from `https://opace.agency`, after the deploy, not from markup.
**29 of 29 present.**

Input: paste box and live counter, file upload, the `accept` list byte-identical,
four examples plus "no example", the three-way tablist. Controls: route radio
pair, six check toggles (`unicode.invisible`, `unicode.homoglyph`,
`style.patterns`, `protected`, `local.signals`, `watermark.known_keys`), run and
cancel, the consent gate with its download button, progress element and the
34.5 MB figure on the button, receipt, print, preview and apply fixes, the
methodology and Readiness Lab links, the `<noscript>` fallback. Removed and
still removed: "Protect these facts (planned)".

Runtime states, exercised rather than read:

| State | Result |
|---|---|
| Empty submit | refuses politely, focus returns |
| Under the character floor | exact checks run, writing rules suppressed and said so |
| Over 50,000 characters | run disabled, "Nothing has been truncated", limit actions shown |
| "Analyse first 50,000" + CLI guidance link | both reachable, over-length only |
| Under 60 words, server route | the floor is stated before the run |
| Browser route selected | the model download gate opens |
| Scripted client, server route | **HTTP 403**, `automation_blocked`, a coded state rather than a guess |
| Over 4,000 words, server route | refused, not trimmed |

**One thing a scripted probe cannot separate.** The 413 `too_long` path returns
403 to an automated client, because `automation_blocked` is evaluated before
length. The refusal is correct either way and the copy is correct either way,
but this probe cannot prove which branch produced it. Recorded as unproven
rather than claimed.

---

## 7. Verification

186 tests pass: 103 unit, 38 component, 45 live at four viewports, the live ones
against production after the deploy. `tsc --noEmit` adds no error in any
content-integrity file. `astro build` was not run: the post-build `rmdir` race
inside Dropbox stands.

Five live behaviour tests unchecked `[data-local-toggle]` directly. The toggles
are now behind "Choose which checks run", so `disableAiCheck()` in
`tests/live/support.ts` opens the disclosure, unchecks, and closes it again —
which is the path a person takes, and closing it again stops the layout shift
being reported as an unstable element.

Untouched, by explicit path on the commit: `SEGMENTATION_CONTRACT`,
`thresholds.json`, the `segments-v3` parameters, `measured-figures.ts`,
`published-figures.ts`. No figure is typed as a literal in any label.
