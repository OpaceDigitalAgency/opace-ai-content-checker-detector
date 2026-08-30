# Reference teardown — free text-judgement tools

**Agent A3, 29 August 2026.** Evidence base for the redesign of the Opace AI Content Integrity
tools. No code was changed. All measurements are my own unless attributed.

Screenshots: the `screenshots/reference/` set, held privately and not in this repository — see
`docs/programme/DESIGN-FAILURE.md` §13. Each is described where it is used below.

Sections marked **[REDESIGN.md]** exist because of an item in
`/ai-watermark-and-content-authenticity/REDESIGN.md`, owned by the bug-fixing session. They
answer a specific problem that file raises rather than cataloguing a pattern in the abstract.

---

## 0. What was examined, and how

| Tool | Why it is here | Method |
|---|---|---|
| **Unmark** (`ivanusto.github.io/unmark-web/`) | Owner's closest-to-right reference | Rendered, driven, plus MIT source read |
| **Originality.ai SynthID article** | Owner's second reference; authority content with an instrument in it | Documentary (delegated) |
| **GPTZero** | Category leader; sets user expectations | Rendered, driven to the point of refusal |
| **ZeroGPT** | The floor of the field | Rendered, driven, false positive reproduced |
| **Hemingway Editor** | The canonical paste-text-get-a-judgement tool outside detection | Rendered, driven |
| **PageSpeed Insights** | Reports five independent scores and refuses to merge them | Rendered |
| **WAVE / WebAIM** | Has an explicit "a human must decide" category | Rendered, plus WebAIM docs |
| Copyleaks, QuillBot, Scribbr, Grammarly, Originality.ai, Turnitin | Documentary only | Delegated; several block automated fetching |

**Picks justified.** Unmark and the Originality article were assigned. GPTZero and ZeroGPT bracket
the detector field top and bottom. The other three are not detectors on purpose: Hemingway,
PageSpeed Insights and WAVE have each been solving "give a lay reader a technical judgement they
must interpret" for a decade or more, and two of them have already solved the exact structural
problem in REDESIGN.md item 2. A comparison drawn only from detectors would have inherited the
category's bad habits.

**Not done.** I did not sign up for anything, enter credentials, pay, or accept terms. I declined
non-essential cookies on GPTZero. I stopped at ZeroGPT's and GPTZero's paywalled or CAPTCHA-gated
surfaces and recorded them as findings. Copyleaks, QuillBot and Scribbr return HTTP 403 to
automated fetching, so their entries are search-snippet-derived and flagged as such.

---

## 1. Time to first result

Measured at 1440 × 900 unless stated. "Words above input" counts only visible text preceding the
input in document order.

| Tool | Input top (px from doc top) | Visible words above | Scroll needed at 1440 | On a phone |
|---|---|---|---|---|
| ZeroGPT | 185 | ~20 | None | Not measured |
| GPTZero | 245 | 104 (incl. cookie banner) | None | Not measured |
| Hemingway | 0 (page *is* the editor, pre-filled) | 0 | None | Not measured |
| **Unmark** | **440** | **74** | None | **~812 px — 0.94 screens of scrolling before you can type** |
| PageSpeed Insights | 130 | ~8 | None | Not measured |
| Originality SynthID article | Tool at 0% depth, above the first H2 | ~40 (H1 + deck + byline) | None | Not measured |

**The one number that matters.** Nobody in this field buries the input. All six put it in the
first screen. Time-to-input is not where anyone is losing, and it is not where Opace can win.

**Unmark's mobile failure is real and specific.** At a phone viewport the header logo collides
with a subtitle that wraps to seven lines, the language select and three icon buttons sit in a
row that overflows, the three tab labels stack to three lines each, and "Inspector" is clipped at
the right edge. The four option checkboxes go from one row to four. Input starts at 812 px.
See `unmark-03-mobile-above-fold.png`. The tool the owner rates highest has had no phone design
pass at all.

---

## 2. How the verdict is expressed

| Tool | Exact label | Scale | Visual form | Number shown |
|---|---|---|---|---|
| **Unmark** | `DETECTED` / `CLEAN` / `UNCERTAIN` / `NOT TESTED` / `UNAVAILABLE` / `N/A` / `ERROR` | Per detector, seven states | Text badge in a real `<table>` row, plus `Score / threshold` column | Yes — score **and** threshold, e.g. `0 / 0.650` |
| **ZeroGPT** | "Your Text is AI/GPT Generated" | 0–100% | Green→amber→red arc gauge | Yes — `75% AI GPT*` |
| **GPTZero** | Prose: "written entirely by a human" / "…by an AI" / "…by a mix", with bands "uncertain" / "moderately confident" / "highly confident" | 0–100% + band | Not observed (CAPTCHA-gated, see §6) | Yes |
| **Hemingway** | `Grade 8` + a one-word gloss `Good.` | US reading grade | Large coloured number, plus per-category cards | Yes |
| **PageSpeed Insights** | Five separate scores; `Core Web Vitals Assessment: Passed` | 0–100 ×4, plus pass/fail | Five rings + per-metric distribution bars with a position marker | Yes |
| **WAVE** | Six category counts; `AIM Score: 6.1 out of 10` | Counts, not a score, except the AIM roll-up | Icon + count per category, evidence pinned into the rendered page | Counts |
| **Originality SynthID demo** | `✓ Pattern detected in this simulation` / `• No pattern detected in this simulation`, staged through `No text yet` → `One token proves nothing` → `Evidence accumulating` | 0–8 cumulative evidence | `role="progressbar"`, colour change at ≥5 | Yes, captioned **"cumulative evidence — not a probability"** |

Screenshots: `unmark-02-inspector-fullpage.png`, `zerogpt-02-verdict-human-text.png`,
`hemingway-01-desktop.png`, `psi-01-field-vs-lab.png`, `wave-01-summary-categories.png`.

---

## 3. The uncertain middle **[REDESIGN.md item 1]**

REDESIGN.md item 1 asks the sharpest question in the brief: the "Uncertain" band now spans
0.50–0.95, which is far too wide, and the field is at its worst here. Six distinct answers exist
in the reference set. Four are usable.

### 3a. Show the threshold beside the score — Unmark

Unmark's statistical layer does not print a bare number. Its column is headed
`Score / threshold` and prints `0 / 0.650`. The reader sees the number, the bar it had to clear,
and the distance between them, in one glyph string. No band name is required, and the display
survives a threshold change without a copy rewrite — which is exactly REDESIGN.md item 5's
constraint that 0.984 must not be hard-coded into copy.

**Applies to Opace as:** print `0.808 / 0.984` rather than, or alongside, any band name. The
number stops being an opinion and becomes a measurement against a stated bar. A user who later
learns the bar moved can re-read their old result correctly.

### 3b. Show where the value falls inside the bands — PageSpeed Insights

Each Core Web Vitals metric shows the value (`0.9 s`), and underneath it a segmented green /
amber / red bar with a small marker at the page's actual position. Two things follow: the reader
sees how wide the band is, and sees whether they are at its edge or its middle. A score at 0.51
and a score at 0.94 both currently read as "Uncertain" on the Opace gauge and are visually
identical. On PSI's treatment they are obviously different.

**Applies to Opace as:** a horizontal band strip with the marker at 0.808, the 0.50 and 0.95
boundaries drawn, and the flag point at 0.984 drawn as a separate tick. This alone would have
prevented the item-1 bug, because a marker at 80% of the way along a bar cannot be read as green.

### 3c. Name the middle as a process state, not a probability — Originality's SynthID demo

Its evidence meter passes through `No text yet` → `One token proves nothing` →
`Evidence accumulating` → `✓ Pattern detected in this simulation`. The middle state describes
*what the tool is doing*, not how likely the user is guilty. "Evidence accumulating" cannot be
misread as an accusation or as an acquittal.

Alongside it sits the single best label in the entire reference set: the number is captioned
**"cumulative evidence — not a probability"**. It defines the number by what it is not, in five
words, adjacent to the number.

**Applies to Opace as:** the caption pattern is directly transferable and directly fixes the
`thresholds.json` problem REDESIGN.md item 1 names — the file already says `share_ai` "moves with
that mix rather than being a probability", and the label shipped anyway. Caption the gauge
`share of AI-style sections — not the probability this was written by AI`. That is a caption, not
a disclaimer, and it sits on the number rather than under the panel.

### 3d. Give the middle its own category with a stated meaning — WAVE

WAVE splits findings into **Errors** (definite) and **Alerts** (45 of them on the page I tested).
Alerts are not weak errors. They are a named category meaning *a machine cannot decide this; a
human must look*. WebAIM states the boundary in the tool's own voice:
"Only a human can determine true accessibility." (WebAIM, `wave.webaim.org/help`). It also refuses
to issue conformance badges, and states that the absence of errors does not mean the page is
accessible.

This is the most trusted free tool in its category, and it is trusted **because** of that refusal,
not despite it. It is the closest thing in the reference set to a proof that publishing your own
ceiling wins rather than loses.

**Applies to Opace as:** stop treating 0.50–0.95 as a degraded version of a verdict. Make it a
first-class named outcome with its own copy — "this needs a human", with the specific reasons the
model is unsure and what the reader should look at. A band that means "we cannot tell you" is
honest; a band that means "probably fine" when the model said 0.808 is not.

### 3e. Refuse below a floor — GPTZero (the right instinct, the wrong placement)

Pasting 137 characters and pressing Scan returns, in red: "Please enter at least 250 characters to
scan." No score is produced. GPTZero would rather refuse than answer unreliably, which is correct
and rarer than it should be. Turnitin does the equivalent: it publishes that below 20% AI content
its false-positive rate rises, marks those scores with an asterisk, and shows no highlights at all.

The failure is placement. Before you paste, the counter reads `0/10,000 characters`. Nothing
indicates a floor. You learn the rule only after typing and clicking.
See `gptzero-02-short-text-result.png`.

**Applies to Opace as:** state the usable range in the counter from the first frame —
`0 / 250–10,000 characters` — so the constraint is a property of the field, not a punishment for
trying. Opace already refuses short text; it should say so before the paste, not after.

### 3f. The one to avoid — answer anyway with full confidence

Hemingway, on the input `Hi.`, reports **`Grade 0` / `Good.`** in green. One word, no guard, a
confident positive verdict. The best editorial tool in the field has no minimum-length behaviour
at all.

ZeroGPT is worse: see §5.

### What a non-expert actually understands

Ranking the six by how little interpretation they demand:

1. **Score against a stated threshold** (`0.808 / 0.984`) — needs no vocabulary at all.
2. **Marker on a banded bar** — needs no reading.
3. **A refusal with a stated reason** — unambiguous.
4. **A process-state label** ("Evidence accumulating") — understood, but only tells you the tool
   is still working, so it suits a streaming result better than a final one.
5. **A named "a human must decide" category** — understood once the category is explained, which
   is a one-time cost.
6. **A band name** ("Uncertain", "Likely human") — the worst, because it is a single word carrying
   a whole distribution, and it is the only one of the six that can be read as its own opposite.

The recommendation follows: **1 + 2 + 3 together, with the band name demoted to a caption.** No
band name should be the largest thing on the screen.

---

## 4. Separating evidence from advice **[REDESIGN.md item 2]**

REDESIGN.md item 2: the "Highlights in your draft" panel merges AI evidence, editing advice and
rewrite anchors on one surface, needs two disclaimers, and the owner could not understand it.
Three references outside detection have solved this, and one inside it has too.

### 4a. WAVE — six categories, and only some carry a valence

WAVE's summary is six counts, each with its own icon and colour family:

| Category | Count on the page I tested | Carries a judgement? |
|---|---|---|
| Errors | 30 | Yes — definite failure |
| Contrast Errors | 0 | Yes — split out because measured differently |
| Alerts | 45 | Partly — "a human must decide" |
| Features | 122 | Yes — positive |
| Structural Elements | 194 | **No — informational only** |
| ARIA | 639 | **No — informational only** |

The mechanism worth stealing: **Structure and ARIA are counts of things that are present, with no
valence at all.** They sit in a neutral colour, in the same list, and nobody is confused, because
their category name says what they are. WAVE needs no disclaimer explaining that 639 ARIA
attributes are not 639 problems.

Opace's "4 protected facts" is precisely a Structure-class item: a count of things present, not a
judgement. It reads as an accusation only because it shares a surface with things that are.

### 4b. Hemingway — one card per category, each with its own denominator and its own toggle

The right rail is a stack of cards, one per finding class, each in its category's colour:

- red — "1 of 13 sentences is very hard to read."
- yellow — "1 of 13 sentences is hard to read."
- blue — "2 weakeners."
- purple — "1 word with a simpler alternative."

Three details do the work:

1. **Every card states its denominator.** "1 of 13 sentences", not "1 issue". The reader learns
   the scale of the finding in the same breath as the finding.
2. **Every card has an eye icon that toggles that category's highlights in the text.** The user
   chooses which evidence layer is visible. Three concepts do not fight for one surface, because
   only the layers the user asked for are drawn.
3. **The measurement is fenced off from the advice.** `Readability / Grade 8 / Good.` sits at the
   top of the rail, then a horizontal rule, then `Words: 185`, then another rule, then the cards.
   Three rules do the separating that Opace is currently attempting with two paragraphs of copy.

Also worth noting: at zero findings the card reads "0 weakeners. **Nice work.**" — the empty state
is acknowledged rather than blank.

### 4c. PageSpeed Insights — name each section by what it gives you, and never merge the scores

Two sections, named in plain English by their epistemic status rather than by their method:

- **"Discover what your real users are experiencing"** — field data. Evidence about the world.
- **"Diagnose performance issues"** — lab data. Advice about what to change.

They are not headed "Field" and "Lab". They are headed by what the reader gets. Under the field
section runs a six-item provenance strip: *Latest 28-day period · Various mobile devices ·
Many samples (Chrome UX Report) · Full visit durations · Various network connections ·
All Chrome versions*. Provenance is attached to the result, not to a footnote.

Under the lab scores sits the entire uncertainty statement, six words:
**"Values are estimated and may vary."**

And the structural point: PSI reports **five independent scores — Performance 100, Accessibility
96, Best Practices 96, SEO 80, Agentic Browsing 2/2 — and never computes a composite.** Five
rings, five numbers, no average. Google, at Google's scale, with every commercial incentive to
produce one satisfying number, does not. That is the precedent for Opace's three independent
answers.

It goes further: the Performance score expands to show its own composition (`FCP +10, LCP +25,
TBT +30, CLS +25, SI +10`) and links a public calculator. The score's recipe is on screen.

### 4d. Unmark — layers, capability tags, and a composed Overall

Unmark's Inspector is the in-category answer and it is genuinely good. Two headed tables,
`Character layer (Unicode)` and `Statistical layer (token sampling)`, and a preamble that states
the rule directly: cleaning one layer says nothing about the others.

Each detector row carries capability tags — `local`, `remote`, `heuristic`, `needs key`,
`needs model` — so the reader can see *what kind of thing* is speaking before reading what it
said. The stylometry row carries a note that it "can never say 'detected'". A detector that
publishes its own ceiling on its own row.

The `Overall` box is not a summary. Reading the source (`js/i18n.js`, `js/app.js`), it is
**composed from one sentence per layer**, each layer having its own independent state machine:

```
overall.character.{detected|uncertain|clean}
overall.metadata.{detected|uncertain|clean}
overall.statistical.{detected|uncertain|clean|unavailable}
overall.heuristic.{clean|uncertain|not_tested|unavailable|error}
```

Layers in a `not_applicable` state emit no sentence at all. Nothing is ever merged. On my test run
it produced three sentences, of which the second is the model for absence-of-evidence:

> "Statistical watermarks were not tested here, so they cannot be ruled out."

and the third for short input:

> "Stylometry skipped: text too short."

The unavailable-detector rows each say *why* in plain language, from a catalogue of about
fourteen distinct reasons — no key, no model, no sidecar, browser blocks plain HTTP from HTTPS,
adapter not wired. `UNAVAILABLE` never appears without a cause.

### Why Unmark reads as simple despite showing a great deal

Five mechanisms, in order of contribution:

1. **One row per detector, one column per question.** The table format means adding a detector
   adds a row, not a concept. The reader learns the layout once.
2. **A fixed, small status vocabulary** — seven words total, reused everywhere.
3. **Progressive disclosure of numbers.** Evidence collapses to `▸ 3 item(s)`. The z-scores are
   there, behind a disclosure triangle, not in the reading path.
4. **Capability tags carry the caveats**, so the prose does not have to. `needs key` does the work
   that a paragraph would otherwise do.
5. **The Overall box is plain sentences with no numbers in them.** It is the only place the reader
   must actually read, and it is five sentences at most.

### Where Unmark still fails a non-technical reader

- Detector names are researcher names: `Kirchenbauer (KGW green-list)`, `Keyed-Gumbel (EXP)`,
  `SynthID-Text`, `TextSeal`. A reader cannot tell which of those matters to them.
- "Layer A" is internal vocabulary and it is in the primary tab label, `Text (Layer A)`.
- The threshold column shows `0 / 0.650` with no unit and no explanation of direction.
- The one-line intro contains "statistical (token-sampling) watermarks" before the reader has been
  given any reason to care.
- **No `<h1>` on the page at all**, and three unlabelled form inputs.

### The composite recommendation for the Highlights panel

Do not fix the panel's copy. Replace the panel with three named surfaces, following WAVE's
categories, Hemingway's cards and PSI's section naming:

| Surface | Named by what it gives you | Valence | Denominator | Toggle |
|---|---|---|---|---|
| **Where the model saw AI-style writing** | Evidence about the text | Amber, evidence-coloured | "n of N sections" | On/off |
| **Suggestions for your draft** | Advice about the text | Neutral, advice-coloured | "n of N sentences" | On/off |
| **Facts this tool would not change** | Inventory, no judgement | Grey, no valence | "n items" | On/off |

Each with its own count, its own colour, its own eye toggle. No disclaimers needed, because a
category headed "Facts this tool would not change" is not making a claim that needs qualifying.

One constraint from REDESIGN.md item 2 that this respects: only 35.9% of sentences push their
document towards "machine", so sentence-level highlighting cannot mean what readers assume.
Hemingway's denominator format handles it — "3 of 14 sections lean AI-style" is honest in a way
that highlighting three sentences in red is not. WAVE's model handles it too: pin evidence to
*sections*, which the section-bar list already does well (REDESIGN.md item 6 rightly says that
list is the strongest thing on the page).

---

## 5. Honesty, and where the field overclaims

### The measured false positive

I pasted 789 characters of Darwin's *On the Origin of Species* (1859, published 164 years before
any LLM, unambiguously human) into ZeroGPT. It returned:

> **"Your Text is AI/GPT Generated"** — 75% AI GPT*, gauge in amber-red, the entire passage
> highlighted yellow.

Screenshot: `zerogpt-02-verdict-human-text.png`. This is my own reproducible measurement, not a
citation.

Directly beneath the verdict, in order: a **"Humanize Text / Make Your Text Human With
Undetectable AI"** button; the hedge "Highlighted text is suspected to be most likely generated by
AI*" in small grey type, with the asterisk unresolved anywhere I could find; **"Export to PDF"**;
and **"Instructions for Educators and Evaluators"**. On one screen ZeroGPT falsely accuses a dead
naturalist, sells him a tool to evade the accusation, offers a PDF he can present as proof, and
tells his teacher how to act on it.

ZeroGPT publishes no methodology, no benchmark and no false-positive rate. It is the only tool in
this set with no honesty disclaimer of any kind, and it markets its PDF output as
"proof of AI-Free plagiarism".

### The depth ratio — GPTZero

GPTZero is genuinely more honest than most of its field, and its honesty is in the wrong place.
Measured on its homepage at 1440 × 900:

| Element | Distance from top | Screens down |
|---|---|---|
| Input textarea | 245 px | 0.27 |
| **"99% / Accuracy"** | **444 px** | **0.49** |
| "No AI detector is 100% accurate… Results should not be used to punish" | **6,397 px** | **7.11** |

A **14× depth ratio** between the reassurance and the caveat, and the caveat is inside a collapsed
FAQ accordion at 89% of page depth. It is also self-contradicted higher up the same page by a
testimonial from a University of Toronto assistant professor describing confronting students on
the strength of GPTZero output, which sits several screens above the line saying not to.

To GPTZero's credit, the FAQ does publish a real third-party number with a denominator — RAID:
95.7% of AI texts detected at 1% of human texts wrongly flagged — and states the ESL problem and
a 1% ESL false-positive target. That is more than any competitor except Turnitin. It is buried.

### Who publishes what

Compiled from the delegated documentary pass; entries marked *snippet* could not be fetched
directly because the vendor blocks automated requests.

| Vendor | Accuracy claimed | False-positive rate published | Where |
|---|---|---|---|
| GPTZero | 99%; 96.5% mixed | ~1% (RAID); 1.1% ESL | FAQ accordion, page foot |
| Copyleaks | 99.1% → "over 99%" | 0.2%, later 0.03% *snippet* | Product page |
| QuillBot | none found | none | — |
| **ZeroGPT** | "more than 98%" | **none** | — |
| Scribbr | **84% premium / 68–78% free — its own low figure** | none | Tool page |
| Grammarly | "99%… #1 on RAID" | none | — |
| Originality.ai | 99% Lite; 97.8% multilingual | 0.5% Lite, 1.5% Turbo | Blog post only |
| Turnitin | — | **<1% document-level at ≥20% AI; ~4% sentence-level** | Public docs |

The vendors' own numbers refute each other. GPTZero's published benchmark measures Copyleaks at
5.26% and Originality at 4.79%, against their own claims of 0.03% and 0.5% — a discrepancy of up
to 175×. Pangram measured GPTZero at 2.01% against its claimed 1%. Not one of these is an
independent benchmark; every figure is a vendor testing rivals.

### The evidence a competitor will not cite

- **Liang et al. (2023),** *Patterns* (Cell Press), DOI 10.1016/j.patter.2023.100779. Seven
  detectors, 91 human-written TOEFL essays by non-native speakers and 88 US eighth-grade essays.
  Mean false-positive rate on the TOEFL set: **61.22%**. 18 of 91 flagged as AI by all seven
  detectors; 89 of 91 flagged by at least one. Near-perfect accuracy on the native-speaker set.
  Prompting an LLM to enrich the same human essays' vocabulary dropped the FPR to **11.77%** — the
  detectors were scoring vocabulary range, not authorship.
- **Weber-Wulff et al. (2023),** *IJEI* 19:26. Fourteen tools, 54 test cases each. The abstract's
  conclusion is that the tools are "neither accurate nor reliable".
- **OpenAI's own AI Text Classifier**: launched 31 January 2023, correctly identified **26%** of
  AI-written English text while wrongly labelling human text as AI **9%** of the time, withdrawn
  20 July 2023 for "low rate of accuracy". Corroborated via Search Engine Land and TechCrunch;
  the OpenAI page 403s to automated fetching.
- **Vanderbilt University**, 16 August 2023, disabled Turnitin's AI detector. Its stated
  arithmetic: 75,000 papers submitted in 2022, at a claimed 1% FPR, "around 750 student papers
  could have been incorrectly labeled". Primary source verified.
- **University of Waterloo**, September 2025, discontinued it, reporting that the product
  "flagged human written text as 100% generated by AI". Two years after Vanderbilt.
- **Pittsburgh, Alabama and Montclair State** also verified from their own pages. A dozen other
  universities circulate in secondary listicles and could not be primary-verified; do not cite
  them.
- **JCQ** ("AI Use in Assessments", 30 April 2025) does not ban detectors but refuses to let one
  stand as sole evidence. The circulating claim that the Russell Group ruled out AI detectors is
  **not supported** by its five principles — do not repeat it.

### The honesty gap, and whether anyone occupies it

Opace publishes that human fiction is wrongly flagged 33 times in 260, that short text is
unreliable, and that an AI score never proves authorship. The question was whether anyone does
anything comparable.

**Nobody in the detector field does.** The nearest three:

- **Turnitin** publishes a *sentence-level* 4% false-positive rate and gates its own output below
  20% AI content. It is more granular than any of the seven consumer vendors. It is also a paid
  institutional product with no free tool, so no visitor ever meets it.
- **Grammarly** carries the strongest disclaimer wording — that the percentage should not be used
  as an objective source of truth, that detectors do not track authorship, and that it is
  deliberately tuned to minimise false positives because wrongly accusing a human is the worse
  error. It publishes **no** false-positive number, which makes the disclaimer unfalsifiable.
- **Scribbr** does one genuinely rare thing: it publishes its own ceiling, stating that the best
  accuracy it found was 84% premium and 68% free. A vendor publishing a number below 90% about
  its own category is close to unique. It publishes no FPR, no minimum length, no academic-
  discipline warning and no ESL warning — for a tool sold to students.

**And Originality.ai's SynthID article is more honest than Opace on one specific point.** In
section 9 it states, in its own voice, that no text watermark should be treated as proof of
authorship — and it does so with zero product links anywhere in the article body, all twelve
outbound links going to Anthropic, DeepMind, *Nature*, PMLR, OpenAI, C2PA and GitHub. The
disclaimers sit *above* the interactive tool, not beneath it. That is the calibration point: a
competitor has demonstrated that undercutting your own sales pitch is what makes the rest of the
page credible.

**Nobody publishes a false-positive count with a denominator on the surface a visitor uses.**
"33 in 260" is, as far as this survey found, unmatched in the field. The presentation problem is
solved by WAVE and PSI: WebAIM states its ceiling in the tool's own voice as a design principle
and is the most trusted tool in its category; PSI attaches provenance to the result in a six-item
grey strip that nobody finds frightening. The move is to state it **as provenance, calmly, beside
the number**, not as a warning box that reads like a legal hedge. A warning frightens. A
methods line reassures.

**One place Opace could be more honest than it is.** REDESIGN.md item 5 records two corpora giving
contradictory detection rates — academic 92.4% versus 1.1%, articles ~96% versus 37.5%. Until
reconciled, no headline detection rate should appear on screen without its corpus, threshold and
denominator beside it. PSI's provenance strip is the format.

---

## 6. Dark patterns observed

| Pattern | Tool | Evidence |
|---|---|---|
| **Humaniser upsell attached to the detection result** | ZeroGPT | "Humanize Text / Make Your Text Human With Undetectable AI" directly under the 75% verdict, `zerogpt-02-verdict-human-text.png` |
| **Detection output sold as proof** | ZeroGPT | "Export to PDF"; PDF reports marketed as "proof of AI-Free plagiarism" |
| **Actively directing teachers to act on it** | ZeroGPT | "Instructions for Educators and Evaluators", on the result panel |
| **CAPTCHA mid-flow** | GPTZero | Pressing Scan navigates you off to `app.gptzero.me` in a new tab and presents an image challenge before any result. I did not solve it. `gptzero-04-scan-redirects-to-app.png` |
| **Losing the user's page to get a result** | GPTZero | Same; the free homepage tool does not return a result in place |
| **Minimum length revealed only after the paste** | GPTZero | Counter reads `0/10,000` with no floor stated; `250` appears only on clicking Scan |
| **Upsell styled as a finding** | Hemingway | The green "Find grammar and spelling issues with Editor Plus / Upgrade" card sits third in a list of four real finding cards, in the same shape and size |
| **Upsell density on a free tool** | Hemingway | Five surfaces: top banner, "AI Tools – Try Free" button with a hand-drawn arrow, four `Plus` toolbar badges, the fake finding card, the tutorial box |
| **Time-limited discount in the tool hero** | GPTZero | "Back to school 30% off annual plans… Use code BTS26", rotating carousel beside the input |
| **Evidence gated behind an account** | Copyleaks *snippet* | Percentage free; sentence-level breakdown requires registration — you get the verdict but must sign up to interrogate it |
| **Free input used as training data** | Originality.ai *snippet* | Free-detector text may be used for training, stated in the FAQ |
| **Selling both the detector and the humaniser** | ZeroGPT, QuillBot, Grammarly, Originality.ai | Four of seven. ZeroGPT's humaniser sits as a sibling card directly under its detector, `zerogpt-01-desktop.png` |
| **Ranking a market you have a horse in** | Scribbr | Scribbr and QuillBot are both owned by Learneo; Scribbr publishes a "best AI detectors" comparison |

**Anti-patterns to refuse outright**, each with the tool that does it:

1. A declarative verdict sentence with no hedge — "Your Text is AI/GPT Generated" (ZeroGPT).
2. Any rewrite, humanise or "fix this" control attached to a detection result (ZeroGPT).
3. Exportable output framed as proof or evidence (ZeroGPT).
4. Guidance addressed to educators or evaluators on a result screen (ZeroGPT).
5. Highlighting sentences as "the AI ones" (ZeroGPT; and REDESIGN.md item 2 says Opace's own
   measurement forbids it).
6. A headline accuracy figure with no denominator (GPTZero's "99% / Accuracy"; ZeroGPT's "98%").
7. Caveats in a collapsed accordion at the foot of the page (GPTZero).
8. Any interstitial between pressing the button and seeing the result (GPTZero's CAPTCHA).
9. An input limit disclosed only after the paste (GPTZero).
10. An upsell shaped like a finding (Hemingway).
11. A verdict computed on input too short to support it (Hemingway's `Grade 0 / Good.` on "Hi.").
12. Merging independent scores into one composite — nobody good does it; PSI's refusal is the
    precedent.

---

## 7. Accessibility, at a glance

| Tool | Result announced? | Keyboard main flow | Verdict colour contrast | Notes |
|---|---|---|---|---|
| **Unmark** | **Yes** — `#inspect-results` is `aria-live="polite"`; 12 live regions total | Yes — proper `role="tab"` set with `aria-selected` and `aria-controls`; skip link present | **Every status badge fails WCAG AA** (below) | Real `<table>` elements, `header`/`main`/`footer` landmarks, `lang="en"`, i18n. **Zero `<h1>`.** 3 unlabelled inputs |
| GPTZero | Yes — `role="alert"`, `aria-live="assertive"` | Not fully assessable (CAPTCHA) | Not measured | Named landmarks, alt text present |
| ZeroGPT | Not measured | Nine icon-only buttons in the left rail with no visible labels | Not measured | Gauge is graphical; text equivalent is the "75% AI GPT*" string |
| Hemingway | Not measured | Category toggles are icon-only eye buttons | Colour is the only category signal in the text body; the cards carry the words | — |
| PageSpeed Insights | Not measured | Standard | Colour plus position marker plus number — triple-encoded | Best of the set |
| Originality demo | — | `role="tablist"`, `role="progressbar"` with `aria-valuemin/max` and `aria-label` | Badge carries a glyph (`✓` / `•`) as well as colour | — |

**Unmark's badge contrast, measured against the composited background:**

| Badge | Colour | Size / weight | Contrast | WCAG AA (4.5:1) |
|---|---|---|---|---|
| `DETECTED` | `rgb(220,38,38)` | 12px / 400 | **4.14:1** | Fail |
| `UNCERTAIN` | `rgb(217,119,6)` | 12px / 400 | **2.86:1** | Fail |
| `NOT TESTED` | `rgb(148,163,184)` | 12px / 400 | **2.56:1** | Fail |
| `UNAVAILABLE` | `rgb(148,163,184)` | 12px / 400 | **2.56:1** | Fail |
| `On this device` | `rgb(5,150,105)` | 12px / 600 | **3.33:1** | Fail |

Every verdict colour in the field's best-designed tool fails contrast at the size it ships. This
is the cheapest available win: Opace can be more accessible than its best reference by choosing
darker tints and a 14px minimum, with no design cost.

---

## 8. The pattern library — what to steal

Each entry: the pattern, its source, the screenshot, why it works, and how it applies to a checker
that must report **AI probability**, **text integrity** and **editorial** as three independent
answers without merging them or implying proof of authorship.

### P1 — One sentence per independent answer, composed, never merged
**Unmark**, `unmark-02-inspector-fullpage.png`, and `js/i18n.js` / `js/app.js`.
The `Overall` box builds itself from `overall.<layer>.<state>` keys, one sentence per layer, each
layer with its own state machine. Layers in a not-applicable state emit nothing.
**Why it works:** a merged verdict has to be a lie about at least one input. Composed sentences
scale to more layers without a rewrite, and read as plain English.
**Applies as:** three sentences, one for AI probability, one for text integrity, one for editorial,
each drawn from its own state table. Never a fourth sentence that combines them.

### P2 — Score printed against its threshold
**Unmark**, same screenshot. `Score / threshold` column, `0 / 0.650`.
**Why it works:** the reader sees the bar, not just the ball. Survives a threshold change with no
copy edit — a hard requirement from REDESIGN.md item 5.
**Applies as:** `0.808 / 0.984` on the AI answer. Both numbers, both labelled.

### P3 — A capability tag on every detector row
**Unmark.** `local` · `remote` · `heuristic` · `needs key` · `needs model`.
**Why it works:** the tag carries the caveat, so the prose does not have to. A reader knows what
kind of claim they are reading before reading it.
**Applies as:** tag the watermark scan `needs key`, the editorial rules `heuristic`, the classifier
`model`. Item 6 of REDESIGN.md notes the watermark line is meaningless to non-technical readers —
`needs key` plus one sentence is cheaper and clearer than the current phrasing.

### P4 — Explicit non-answer states, each with its reason
**Unmark.** `UNAVAILABLE`, `NOT TESTED`, `N/A`, `ERROR`, each with a plain-language cause from a
catalogue of ~14. "Statistical watermarks were not tested here, so they cannot be ruled out."
**Why it works:** absence of evidence is stated as absence of evidence. A blank row invites the
reader to fill it in with the answer they wanted.
**Applies as:** the four failure states REDESIGN.md item 6 flags as unreviewed — rate-limited, too
long, server unavailable, too short — become first-class outcomes with stated causes, not errors.

### P5 — Caption the number by what it is not
**Originality.ai's SynthID demo.** "cumulative evidence — not a probability", 22px number, caption
directly beneath.
**Why it works:** five words, adjacent to the number, kill the misreading at the point of
misreading. A disclaimer 400px away does not.
**Applies as:** `share of AI-style sections — not the probability this was written by AI`. This is
the single highest-value copy change available, and REDESIGN.md item 1 shows the project already
knew the distinction and shipped the label anyway.

### P6 — The instrument first, the explanation after
**Originality.ai's SynthID article.** The interactive tool is the first content block after the
H1 and deck, above every H2 and above the cover image, in a self-sizing iframe.
**Why it works:** it inverts the assumption that authority content must be read to be earned. A
reader who wants to *use* something pays zero cost; a reader who wants to understand scrolls.
**Applies as:** the checker page leads with the input. The 3,000 words of methodology live below
it and are indexed for search. Note the correction to the brief: this article does **not** bury
its tool.

### P7 — A marker on a banded bar, not a band name
**PageSpeed Insights**, `psi-01-field-vs-lab.png`. Value, plus a green/amber/red segmented bar with
a position marker.
**Why it works:** the reader sees band width and their distance from the edge without reading a
word. This treatment makes the item-1 bug structurally impossible — a marker four-fifths along a
bar cannot read as green.
**Applies as:** the gauge becomes a band strip with the 0.50, 0.95 and 0.984 boundaries drawn and
the marker at the measured value.

### P8 — Provenance attached to the result
**PageSpeed Insights.** A six-item grey strip under the field data: period, device range, sample
source, visit durations, network conditions, browser versions. And under the lab scores, six
words: "Values are estimated and may vary."
**Why it works:** it is a methods line, not a warning. It reassures rather than frightens, because
it reads as competence.
**Applies as:** the corpus, denominator and threshold beside the score, in a grey strip. This is
the presentation that lets "33 wrongly flagged in 260" be published without losing conversions.

### P9 — Independent scores, never averaged
**PageSpeed Insights.** Five scores, five rings, no composite, and the composition of each score
disclosed on expand with a public calculator.
**Why it works:** the strongest available precedent. Google has every incentive to produce one
number and does not.
**Applies as:** three answers, three surfaces, three numbers. If anyone asks for one number,
point at PSI.

### P10 — Categories that carry no valence
**WAVE**, `wave-01-summary-categories.png`. Structural Elements (194) and ARIA (639) are counts of
things present, in a neutral colour, needing no disclaimer.
**Why it works:** a category name that describes what the thing is removes the need to say what it
is not.
**Applies as:** "4 protected facts" becomes its own neutral-coloured surface headed
"Facts this tool would not change". The two disclaimers in REDESIGN.md item 2 disappear.

### P11 — A named "a human must decide" outcome
**WAVE.** Alerts, as a first-class category, and the stated boundary:
"Only a human can determine true accessibility." (WebAIM). WebAIM issues no conformance badges.
**Why it works:** the most trusted tool in its category is trusted *because* it publishes its
ceiling. Direct proof that the honesty position wins.
**Applies as:** the 0.50–0.95 band stops being a weak verdict and becomes a stated outcome with
its own copy and its own next step. And "an AI score never proves authorship" moves from a
disclaimer to a design principle stated in the tool's voice.

### P12 — One card per category, with its denominator and its own toggle
**Hemingway**, `hemingway-01-desktop.png`. "1 of 13 sentences is very hard to read", with an eye
icon per card toggling that layer's highlights.
**Why it works:** the denominator gives scale for free; the toggle means layers never compete for
one surface. Three horizontal rules separate measurement, count and advice.
**Applies as:** the direct replacement for the Highlights panel. "3 of 14 sections lean AI-style"
is honest in a way that red sentences are not, and satisfies the 35.9% constraint.

### P13 — Refuse below a floor, and say so before the paste
**GPTZero** (the refusal) corrected by **Turnitin** (the disclosure). GPTZero refuses under 250
characters but only reveals the floor after you click.
**Why it works:** a refusal is a stronger honesty signal than a hedged answer, and a stated range
is a property of the field rather than a punishment.
**Applies as:** `0 / 250–10,000 characters` in the counter from the first frame.

### P14 — Demonstrate the ambiguous middle before the user pastes
**GPTZero**, `gptzero-01-desktop-viewport.png`. Six example chips: ChatGPT, Claude, Human,
**AI + Human**, **Polished by AI**, **Paraphrased by AI**.
**Why it works:** it teaches the reader that the middle exists, using the tool itself, before they
have anything at stake. The best onboarding in the set, and it costs one row.
**Applies as:** sample chips including a deliberately mid-band document, so the first thing a
visitor sees the tool do is produce an uncertain result and explain it.

### P15 — Acknowledge the zero state
**Hemingway.** "0 weakeners. **Nice work.**"
**Applies as:** "No AI signal found" (already the band name below 0.5) should get an equivalent
positive acknowledgement rather than an empty panel.

---

## 9. The one best and one worst thing about each reference

| Tool | Best thing in the field | Worst thing |
|---|---|---|
| **Unmark** | Its `Overall` box is composed from one sentence per independent layer, from a state machine, and never merges them. Nothing else in the reference set does this, and it is exactly the architecture Opace needs. | Every status badge fails WCAG AA contrast, and the mobile layout has had no design pass — clipped tabs, colliding header, 0.94 screens to the input. |
| **Originality.ai SynthID article** | The caption "cumulative evidence — not a probability", and disclaimers placed above the tool rather than below it. Zero product links in 3,000 words of body copy. | The instrument is a diorama. Twelve buttons, zero inputs, four hard-coded tokens. Nothing the reader brings changes anything on screen, so a visitor searching for a detector gets a lesson. |
| **GPTZero** | The six example chips, including "AI + Human", "Polished by AI" and "Paraphrased by AI" — it teaches the ambiguous middle before you paste. And it refuses short text rather than guessing. | The 14× depth ratio: "99% Accuracy" at 444 px, "should not be used to punish" at 6,397 px inside a collapsed accordion, contradicted in between by a testimonial about confronting students. |
| **ZeroGPT** | Fastest to input in the set — 185 px, ~20 words above the field. | It called Darwin 75% AI, in a declarative sentence, then sold him a humaniser, a PDF he could present as proof, and instructions for his teacher. |
| **Hemingway** | Per-category cards carrying their own denominator and their own visibility toggle, with the measurement fenced off from the advice by horizontal rules. | `Grade 0 / Good.` on the input "Hi." — a confident positive verdict computed from one word, with no minimum-length guard anywhere. |
| **PageSpeed Insights** | Five independent scores, no composite, with a provenance strip attached to the result and the score's own recipe disclosed. The strongest precedent available for three-answers-never-merged. | Very heavy for a lay reader: five scores, dozens of audits, three grouping headers and a lab/field distinction that most visitors never grasp. Authority bought with cognitive load. |
| **WAVE** | "Only a human can determine true accessibility", stated in the tool's own voice, with a first-class Alerts category for what a machine cannot decide — and it is the most trusted tool in its category as a result. | The rendered-page overlay is dense to the point of illegibility on a complex site; 639 ARIA icons pinned into a live BBC page is not readable by anyone who is not already an expert. |

---

## 10. Where the genuine opportunity is

The field has three simultaneous weaknesses and nobody is exploiting them together.

**One — nobody handles the uncertain middle.** Every one of the seven detectors surveyed displays
a percentage. Not one displays a confidence interval. Only GPTZero displays a confidence band at
all. The best treatments of uncertainty in this entire reference set come from outside the
category — PSI's marker-on-a-band, WAVE's Alerts, and a caption on a teaching toy. A detector that
shows the score against its threshold, the marker inside its band, and a named human-decides
outcome would be alone in the market.

**Two — the honesty is real but it is in the wrong place.** GPTZero, Grammarly, Originality.ai and
Turnitin all publish serious caveats, in FAQ accordions, help centres and blog posts. Their tool
pages carry the reassurance and their footers carry the truth. Opace's numbers are stronger than
any of theirs and the whole opportunity is placement, not content. WAVE and PSI prove that a
ceiling stated calmly, beside the result, as provenance rather than as a warning, is read as
competence. The template is a six-item grey methods strip, not a warning box.

**Three — the mixed-surface problem is solved everywhere except in detection.** Hemingway, WAVE
and PageSpeed Insights each separate measurement from advice with structure — categories, counts,
denominators, toggles, rules on a page — rather than with copy. Opace is currently trying to do it
with two disclaimers. Every disclaimer on that panel is a structure the design is missing.

**The specific claim.** No free tool in this survey does all four of: (a) print the score against
its threshold, (b) name the middle as a decision the reader must make, (c) attach corpus and
denominator to the result as provenance, and (d) keep three independent answers on three
independent surfaces. Each of the four exists somewhere; none is in a detector; none are combined.
The combination is defensible, is aligned with a position the owner has already taken, and is
cheap — most of it is layout and copy, not model work.

**The cheapest wins, in order.**

1. Caption the number by what it is not (P5). One line of copy. Fixes the class of bug behind
   REDESIGN.md item 1.
2. Print score against threshold (P2). Removes the dependency on band names and satisfies item 5.
3. Marker on a banded bar (P7). Makes the item-1 failure structurally impossible.
4. Split the Highlights panel into three named, toggleable, denominatored surfaces (P10 + P12).
   Deletes both disclaimers.
5. Fix verdict-badge contrast to AA at 14px. Beats the best reference in the field for free.
6. State the input range in the counter before the paste (P13).

---

## 11. Gaps and caveats in this teardown

- **GPTZero's result screen was not observed.** Pressing Scan navigates to `app.gptzero.me` and
  presents an image CAPTCHA. I did not solve it. Its verdict vocabulary in §2 is documentary, from
  its own published copy and API documentation, not from a rendered screen.
- **Copyleaks, QuillBot and Scribbr return HTTP 403** to automated fetching; their entries are
  search-snippet-derived and marked. Copyleaks' own "AI Detector limitations" help article is
  unreachable, so whether it carries an academic-discipline warning is unverified.
- **Unmark's live UI differs from the brief's screenshots.** The Inspector columns are now
  `DETECTOR / STATUS / SCORE / THRESHOLD / EVIDENCE`, not `BEFORE / AFTER LAYER A / CHANGED?`.
  The before/after strings still exist in `js/i18n.js` and appear after a "Clean & re-inspect" run.
  An `UNCERTAIN` state has been added since those screenshots.
- **`unmark.ivanusto.dev` did not resolve** from this machine. All work was done against the
  GitHub Pages deployment at `ivanusto.github.io/unmark-web/` (repo `ivanusto/unmark-web`, MIT,
  13 stars, created 15 Aug 2026, last push 28 Aug 2026) and a shallow clone of the source.
- **Mobile was measured only for Unmark.** The Chrome window clamps to a 500 px minimum, so the
  emulated viewport reported 401 px rather than 375 px; the Unmark numbers are therefore slightly
  optimistic and the real phone figure is worse.
- **A dozen universities** circulate in secondary sources as having disabled AI detectors and could
  not be primary-verified. Only Vanderbilt, Pittsburgh, Alabama, Montclair State and Waterloo are
  confirmed from their own pages.
- **REDESIGN.md items 3 and 4 are not addressed here.** Item 3 (the single-character `"W"`
  highlight) is a defect to reproduce, not a pattern to research; item 4 is closed as a false
  alarm. Item 5's constraint (no hard-coded thresholds) is reflected in P2 and P8, and item 6's
  suggestions in P3, P4 and P15.
