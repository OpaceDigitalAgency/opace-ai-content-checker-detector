# REDESIGN — display, UI and UX issues

**Owned by the bug-fixing session. Read-only for the UI/UX agents** — fold these into your
findings and label anything sourced here, so the owner can tell which came from bug-fixing and
which from your own audit. Where an item contradicts what you measure on the live site, report
both readings rather than picking one.

Every item says where it was observed and what triggers it, so you can reproduce rather than
take it on trust. Items marked **VERDICT PRESENTATION** are the ones the scoring-language work
needs most.

Live page: https://opace.agency/tools/ai/content-verification-integrity/checker/

**Reproduction case used throughout:** a 512-word published SEO article written entirely by
GPT-5.6 Sol, scoring `probability_ai` 0.8082 on the server route (section 1 = 0.4993,
section 2 = 0.8082, threshold 0.984). Saved at
`/private/tmp/…/scratchpad/user-doc.txt` in the bug-fixing session; ask for it if you need the
exact text. Any AI-written article landing between 0.50 and 0.95 reproduces the same states.

**Environment trap:** `requestAnimationFrame` never fires in a hidden browser tab, so a run
driven from a background tab appears to hang for ever with no error. Foreground the tab or shim
rAF. This cost an hour and produced a false "the live site is broken" alarm.

---

## 1. FIXED — verdict language and colour contradicted the number

**VERDICT PRESENTATION.** Recorded because the replacement scoring language must not
reintroduce it, and because the reasoning matters more than the fix.

The gauge read **80.8% AI-style** in **green**, labelled **"Likely human"**. Number, words and
colour disagreed simultaneously. A reader glancing at the screen concluded the opposite of what
the model found.

The band from 0.50 to 0.95 was named "Likely human" because only 1% of documents landing in it
were AI. That is arithmetically true of the test corpus and wrong as a label: **the corpus is
roughly 1 AI to 5 human, and people paste into an AI checker precisely because they suspect AI.**
The base rate the bands were calibrated on is not the base rate visitors bring. `thresholds.json`
even says `share_ai` "moves with that mix rather than being a probability" — and it shipped as a
label anyway.

Fixed in `opace-latest@d095551d`. Floors unchanged, so every measured `share_ai` still holds:

| Floor | Was | Now |
|---|---|---|
| 0.984 | Very likely AI | Very likely AI *(unchanged)* |
| 0.95 | Uncertain | Uncertain — leaning AI |
| 0.50 | **Likely human** | **Uncertain** |
| 0 | Very likely human | No AI signal found |

Green is now reserved for scores below 0.5.

**Constraints for the replacement language:**
- No band above 0.5 may be called human, in words, colour or icon.
- Band names must survive a threshold change without a rewrite — the 0.984 flag point is
  provisional pending an owner decision.
- A single glance must not be able to produce the wrong conclusion. Assume nobody reads the
  paragraph.
- "Uncertain" now covers 0.50–0.95, which is a very wide band doing a lot of work. It is honest
  but blunt, and is the most obvious candidate for your redesign.

---

## 2. OPEN — the "Highlights in your draft" panel is not understandable

**Owner's words: "what is that section meant to be showing me, I cant understand any of it?"**

Observed on the checker results page after any run. The panel is headed as AI-style evidence but
mostly contains things that are explicitly *not* evidence, and it needs two separate disclaimers
to explain what it is not. On the reproduction case it showed:

- **"1 writing suggestion"** — an editing note (adjacent sentences reusing a content word),
  rendered with the matched text `"W"`. See item 3.
- **"4 protected facts"** — quotes, numbers, names the tool would lock during a rewrite.
  Unrelated to AI detection.

Three unrelated concepts share one surface: AI evidence, editing advice, and rewrite anchors.
The copy carries the burden of separating them and fails. A panel that needs to tell you twice
what it is not is the wrong panel.

Deliberately **not** fixed here: this is a restructure, not a bug, and it is yours.

Worth knowing while you design it: the project's own measurement says only **35.9% of sentences
push their document towards "machine"** (2,174 deletions across 57 documents). That is the
measured reason the tool must never highlight "the AI sentences" — the highlights genuinely
cannot mean what a reader will assume they mean. Whatever replaces this panel has to survive
that constraint.

---

## 3. OPEN — a finding renders as a single character, `"W"`

Observed in the same panel: the `adjacent-lemma-repeat` observation displayed its matched text
as `"W"` — the first character of the document. A one-letter highlight reads as broken.

**Not yet reproduced outside the browser.** I tried to reproduce it against the vendored core in
`opace-website/astro-latest/node_modules/@opace/content-integrity-core` and could not, which
surfaced a second question worth checking (item 4). Two possibilities, undistinguished:

1. A span bug in the rule — the finding's `span` is `{start: 0, end: 1}` rather than the repeated
   word. This would be a core defect and needs re-vendoring to fix.
2. A rendering bug — the span is correct but the highlight anchor renders only its first
   character.

Whoever picks this up: score the reproduction case in the browser, read the finding's actual
`span` from the run record, and compare against the source text. That distinguishes the two in
one step. Regardless of cause, a highlight shorter than a word should not render.

---

## 4. CLOSED — false alarm, no engine drift

I reported that the vendored core might be behind source because it appeared not to export
`computeEditorialSignals`. **That was wrong, and the mistake is worth recording because it is an
easy one to repeat.**

The package declares `exports["."].import = "./dist/bundle.js"`. I had been reading
`dist/index.js`, which is present, is not the runtime entry, and does export a smaller set.
Importing the package properly gives **21 exports including `computeEditorialSignals`**, verified
directly:

```
node --input-type=module -e "import * as m from '@opace/content-integrity-core'; ..."
  exports: 21   computeEditorialSignals present: true
```

So the cross-surface battery has no gap, and findings about which rules fire on the live site can
be trusted. **When checking what a package really ships, resolve its `exports` map rather than
grepping the file that looks like the entry point.**

One genuine observation survives from the investigation: the site's adapter
(`src/lib/content-integrity/core-adapter.ts`) imports only `inspect`, `previewSafeFixes` and
`buildReceipt`. Everything else reaches the page through `inspect`. That is a real statement
about how thin the site's use of the engine is, and may be worth a look — but it is not drift.

---

## 5. OPEN — the flag point may move

Not a UI defect, but it constrains everything you design.

The reproduction case scores 0.8082 and is not flagged, because the flag point is 0.984 — set
high deliberately to hold false positives near 1%, at the owner's explicit request. The owner is
weighing lowering it (catches this document, wrongly accuses more human writing) against
retraining (slower, fixes the cause).

**Do not hard-code 0.984, or any band boundary, into copy or layout.** Assume the number moves.

Related and unresolved: the project has two corpora giving contradictory detection rates
(held-out: academic 92.4%, articles ~96%; fresh generated corpus: academic 1.1%, articles 37.5%).
Until reconciled, do not put a headline detection rate on screen without its corpus, threshold
and denominator beside it.

---

## 6. Suggestions, not defects

Lower confidence, offered as input rather than findings.

- **Section bars.** The section list is the strongest thing on the page — it shows *where* the
  evidence is and makes the max-not-mean argument visible. It currently sits below the gauge and
  reads as secondary. Consider whether it should lead.
- **The 4.4-second wait.** A first run compiles modules and can take ~20 seconds, with a progress
  line as the only feedback. The browser route already shows a running best score as sections
  complete; the server route now returns in one request and shows an indeterminate state instead.
  That asymmetry is unexamined.
- **Failure states.** Rate-limited, too long, server unavailable and too short all render, all
  offer the in-browser route, and none has been reviewed for tone or clarity by anyone. They are
  the states most likely to be a visitor's first impression if something is wrong.
- **The watermark scan result** ("no signal under any of the 3 public demo keys") is honest but
  almost certainly meaningless to a non-technical reader, and it appears on every single run.

---

## 7. OPEN — the verdict language still refuses to say what it found

**VERDICT PRESENTATION. Owner's words, 30 August, after many live tests:** *"I'm sick of the
constant fluffy answers… this kind of answer/description means little to me and nothing to the
average user."* And: *"'Strong pattern match' and visual result doesn't convey what this means
e.g. 'Likely AI'. Why this result is jibberish to the average user."*

Two live examples he tested:

- A human-written, AI-assisted white paper scored **0.3427** and rendered **"No clear pattern
  match"**.
- An AI-drafted eCommerce article scored **0.9892** and rendered **"Strong pattern match"**.

Both scores are correct. Both labels avoid saying what the reader came for. "Pattern match" is
the honest internal description of what the model measures, and it is the wrong register for a
verdict — it reads as evasion rather than precision.

**What he asked for**, and it is the right instinct: *"Likely human"*, *"Likely human but AI
edited"*, *"Likely AI but human edited"*.

**What we can honestly support today:**

- **"Likely AI" / "Likely human"** — yes. The score supports a directional verdict and the band
  structure already encodes it. Say it.
- **"...but AI edited" / "...but human edited"** — **NO, not yet, and this is the important
  constraint.** That label requires separating edited-AI from pure-AI, and the tool detects AI
  rewrites of a human original at **30–35%** (HANDOVER §9 item 3). Shipping that label would
  assert a distinction the measurement cannot make — the same class of defect as the green
  "Likely human" gauge on an 80.8% document, and it would be harder to spot because the wording
  sounds careful.

The paired-transformation corpus built 30 August (`cycle4-humaniser-pairs/`, 1,702 variants) is
exactly the training data that would make the four-way verdict honest. **Until a model is
trained and measured on it, the two-way verdict is the ceiling.** Design for the two-way now,
with room for the four-way later.

### 7a. "Why this result?" is written for an engineer

Live text: *"No section reached 0.9855 on its own, and no two reached 0.9763 together."*

Accurate, and meaningless to a customer. The reader does not know what a section is, has no
intuition for 0.9855, and cannot act on either. The same panel prints `model output 0.3427,
flag points 0.9855 and 0.9763, on our EU server` — which belongs in an evidence drawer, not in
the explanation.

What a reader needs: **which passages carried it, and what about them.** The section bars
already exist and already highlight the passage — that is the answer, and the prose should point
at it rather than restating arithmetic.

### 7b. "Checks included in this run" lists outcomes without evidence

Owner: *"basically reveals only one signal flagged the content and doesn't explain how i.e.
gives no referenceable reasons or examples."*

Seven checks render as badges — Found, Clean, No verdict, Not for this input — and the one that
fired explains itself only as "a trained classifier reads the whole draft in consecutive
sections and reports the strongest".

**The hard constraint on fixing this**, and it is why the panel is thin rather than lazy: the
project measured that only **35.9% of sentences push their document towards "machine"** (2,174
deletions across 57 documents). So the tool must never highlight "the AI sentences" — the
highlights cannot mean what a reader would assume. **Section-level evidence is the honest
granularity**, and it already exists. The panel should lead with the strongest section's text
rather than with a badge.

Note also that five of the seven rows say "No verdict" or "Not for this input" on a normal text
paste, which makes the panel read as mostly empty. Consider whether checks that cannot apply to
pasted text belong in the same list at all.

