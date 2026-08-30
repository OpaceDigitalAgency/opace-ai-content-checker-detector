# Plain language and scoring system — Opace AI Content Integrity

**Written 29 August 2026.** Design specification. No application source was changed to produce it.

Sources read: `HANDOVER.md` (29 Aug 2026, authoritative), `implementation/docs/WATERMARK-LAB.md`,
`implementation/packages/core/src/**` (read only; another session is editing it),
`opace-website/astro-latest/src/components/tools/content-integrity/**`, and
`public/models/local-signals-v1/thresholds.json`.

A designer and a developer should be able to build from this without asking the author anything.
Section 8 is the token and data-binding reference.

---

## 0. The problem this solves, and the rules it may not break

The tool is accurate and honest. It is also unreadable. A copywriter pasting a draft currently meets
`very_likely_ai`, `mixed_signals`, `carrier_payload`, `interior_homoglyph_count`, `contract_mismatch`
and `segments-v2`, plus paragraph-long disclosures written for an auditor.

The owner's direction: dead simple, layman's terms, our own scoring and brand language, visual icons.

Six rules and two tests bind every choice below. A design that breaks one is wrong however good it looks.

1. **An AI score is never proof of authorship.** Not in words, not in icons, not by implication.
2. **Three axes stay separate:** `ai_probability`, `text_integrity`, `editorial`.
   `assertAxisIndependence` in `verdict/combine.ts` throws if they contaminate each other. There is no
   blended score in this document and there must never be one in the product.
3. **The writing rules are editorial feedback.** Measured on 5,558 fresh documents they caught 45.1%
   of AI writing while flagging 24.8% of human writing. They may never read as evidence of AI.
4. **The watermark check cannot say anything about Claude, Gemini or ChatGPT.** It runs real
   SynthID-Text maths under three published Opace demo keys. Near 0.5 means "no signal under this
   key", which is also what unwatermarked AI text looks like.

Two more, from `thresholds.json` and `HANDOVER.md`:

5. **No claim without measurement.** Every percentage carries its denominator, its corpus, the flag
   point it was measured at, and the runtime it ran on. *(Tightened from `REDESIGN.md` item 5.)*
6. **A band whose floor sits above 0.5 is never called human.** Not in words, not in colour, not in an
   icon. *(`REDESIGN.md` item 1.)*

And two tests, both from `REDESIGN.md` item 1, which every candidate in this document was put through.
They are stated as tests rather than as rules because the next person needs to be able to apply them
to something this document did not anticipate. Section 1.2 works them through.

7. **The base-rate test.** Ask who is actually pasting this and what they already suspect. Never label
   a band from the share of a test corpus that landed in it.
8. **The glance test.** Assume nobody reads the paragraph. Number, words, colour and icon must all
   point the same way, or the design has failed.

---

## 1. The Signal Scale

**Name of the system: the Signal Scale.** One idea, borrowed from a thing every reader already owns.

A phone shows bars. Bars mean *how strong the signal is where you are standing*. Nobody thinks four
bars means the phone approves of them. Nobody thinks one bar means the phone is broken. And every
phone user already understands the separate state that is not a weak signal at all: **no service**.

That last distinction is the reason this metaphor was chosen over every other candidate. This tool
needs to say "we do not have enough text to say" very often, and it must not look like a failure.
A phone that says "no service" is not broken. It is honest about where it is standing.

The shape is a **three-step meter**, drawn identically everywhere, filled 3, 2, 1 or 0.

### 1.1 Axis A — AI signal

The only axis where the words "AI" and "human" may appear. Set only by the trained model.

| Level | Meter | Plain meaning (final copy) | Maps to band id | Colour role |
|---|---|---|---|---|
| **Strong signal** | ▰▰▰ | "This writing is full of the patterns our model sees in machine-written text." | `very_likely_ai` (floor = the flag point) | `--sig-3` |
| **Some signal** | ▰▰▱ | "Some of the patterns are there. Not enough for us to flag it." | `uncertain` | `--sig-2` |
| **Faint signal** | ▰▱▱ | "Barely any of the patterns are there." | `likely_human` | `--sig-1` |
| **No signal** | ▱▱▱ | "None of the patterns our model looks for showed up." | `very_likely_human` | `--sig-0` |
| **Not enough text** | ▭▭▭ dashed | "Too short to read. We are not guessing." | withheld | `--sig-none` |

Three hard rules on this axis:

- **"No signal" never means human.** The copy under it says so, every time, in one short line.
- **No level name may be derived from `share_ai`.** See §1.2.
- **The headline percentage is removed.** See §1.3. This is the largest single change in the document
  and it comes straight out of `REDESIGN.md` item 1.

**Why these names.** They describe what the meter reads, not what a person did. They contain no
number, so a recalibration cannot make them false. They survive being read aloud by a screen reader.
And "Strong signal" is a claim about our instrument, which is the only claim we are entitled to make.

**Rejected candidates for axis A, and why** — the reasoning matters more than the winner:

| Rejected | Why it is out |
|---|---|
| Very likely AI / Likely human (current) | "Likely human" is a verdict on a person from a tool that misses lightly-edited AI almost entirely. It also breaks rule 6 wherever the band floor is above 0.5. |
| Human-written / Human-verified | Claims the one thing the engine can never establish. `assertAxisIndependence` would not catch it, which makes it more dangerous, not less. |
| Fake / Caught / Busted / Guilty | Verdicts on a person. Out on rule 1 alone, and they turn a measurement tool into an accusation. |
| Authenticity score, Trust score, Originality score | All three judge the writer rather than the text. "Originality" also collides with plagiarism checking, which this tool does not do. |
| Risk score | Implies a consequence for a person, and invites a merged number across the three axes. |
| Confidence: 98% | Hard-codes calibration into a label. The threshold is under active review; this label would be wrong the day it moved. |
| Grades A–F | A school grade on somebody's writing. Also implies a pass mark, which we do not have. |
| Robot icon / human icon | A binary verdict on authorship, in the one channel a reader cannot argue with. |
| Traffic lights on axis A | Green reads as "cleared, human-written". It also carries meaning in hue alone. Both are disqualifying. |
| 0–100 AI Meter | A number in the name. Breaks portability, and invites the "87% of my article" misreading. |

### 1.2 The base-rate test — *(from `REDESIGN.md` item 1)*

**What went wrong, because the reasoning matters more than the fix.**

The live gauge read **80.8% AI-style**, in **green**, labelled **"Likely human"**. Three channels, one
screen, three different answers. A reader glancing at it concluded the opposite of what the model
found. Fixed in `opace-latest@d095551d`; band floors untouched, so every measured `share_ai` still
holds, and only the words and colours moved.

The band from 0.50 to 0.95 was called "Likely human" for a reason that looked like evidence: about 1%
of the documents landing in it were AI. That is arithmetically true of the test corpus. It was still
the wrong label, because **the corpus runs about 1 AI to 5 human, and people paste into an AI checker
precisely because they suspect AI.** The bands were calibrated against a base rate that visitors do
not bring with them. `thresholds.json` says so itself: `share_ai` "moves with that mix rather than
being a probability of AI authorship". It shipped as a label anyway.

That is a base-rate error dressed as a measurement, and it is the failure this whole scale is built to
prevent.

**The test, for anyone naming anything on this axis in future:**

> Before a name ships, answer two questions in writing.
>
> 1. **Who is pasting this, and what do they already suspect?** Someone using an AI checker suspects
>    AI. A label that resolves their suspicion for them, in either direction, is doing work the
>    evidence has not done.
> 2. **Would this name still be right on a corpus of 5 AI to 1 human?** If the answer changes with the
>    mix, the name is a description of the corpus, not of the reading. Rename it.
>
> A name derived from `share_ai` fails both. A name describing what the meter read passes both,
> because a meter reading does not move with who is holding the meter.

**Every level in §1.1 passes.** "Strong signal", "Some signal", "Faint signal" and "No signal" all
describe the instrument. None of them resolves the reader's suspicion, none of them contains the word
human, and none of them changes meaning if the visitor mix changes. `share_ai` is not used anywhere in
this system, in any label, on any axis.

### 1.3 The wide band, and why the headline percentage goes — *(from `REDESIGN.md` items 1 and 5)*

"Uncertain" now spans 0.50 to 0.95. It is honest and it is blunt. A document at 0.52 and one at 0.94
get the same word, and the reproduction case sits at 0.8082 in the middle of it.

**Splitting the band is the wrong fix.** The model cannot support a finer distinction there. Cutting
0.50–0.95 into two would invent precision and would need re-cutting again on the next recalibration,
which breaks portability. `REDESIGN.md` warns against exactly this.

**The right fix is to stop the number and the word from fighting.** They fight because the number is
shown as a percentage, and 80.8% reads as *large* to a human being no matter what word sits beside it.
Two separate misreadings come out of that one percentage:

- "80.8% means most of this is AI." It does not. It is how strongly one section reads.
- "80.8% is nearly certain." It is not. The flag point is 98.4%.

So: **no headline percentage.** The result is a **level name plus a marked track**.

```
   No signal        Faint         Some     Strong
  ├──────────────┼───────────┼─────────┼──────────┤
                       ▲                ⚑
                    this text       flag point
```

The track carries the position; the name carries the honest coarse judgement. A document at 0.52 and
one at 0.94 both read "Faint signal" and sit visibly apart on the track. Neither invents precision, and
the glance test passes because there is no large-looking number left to contradict.

The raw figure is never hidden. It appears in the detail line, always paired with the flag point and
the runtime that produced it:

> Model output 0.8082, against a flag point of 0.9840, on our EU server. Strongest of 2 sections.

**Track geometry, and why it is portable.** The four band floors map to fixed marks: 0, 25, 50, 75.
The flag point is always the 75 mark, whatever its value. Position within a band is linear between its
floor and the next floor. So the reproduction case at 0.8082 sits at
`25 + (0.8082 − 0.50) / (0.95 − 0.50) × 25 = 42`, well inside "Faint signal" and visibly nearer the top
of it than the bottom. If the owner lowers the flag point to 0.80, that same document lands past the
75 mark and reads "Strong signal", the marker moves right, the colour deepens and the words change,
all from one number in `thresholds.json`. No copy is edited and no icon is redrawn.

**If the owner insists on a headline number**, the sanctioned fallback is that track position itself,
labelled as what it is: **"42 out of 100 on our Signal Scale"**, with "not a percentage of your
document, and not a probability" beside it, and the raw model output still printed in the detail. It
is a monotonic display transform, it passes the glance test, and the flag point stays at 75 forever.
The preferred design remains the track with no number, because a number invites arithmetic and there
is no arithmetic here that helps a reader.

### 1.4 Axis B — Text marks

What was **done to** the text. Different vocabulary, different icon family, different colours. A reader
must never be able to confuse an axis B result with an axis A result, so nothing here says "signal".

| Level | Icon | Plain meaning (final copy) | Maps to |
|---|---|---|---|
| **Clean** | shield, plain | "Nothing is hidden in this text." | `clean` |
| **Odd marks** | shield with a dot | "Something is hidden in this text that has no everyday reason to be there." | `attention` |
| **Planted marks** | shield with a pin | "Hidden characters here are arranged in a pattern. Something wrote into this text on purpose." | `manipulated` |

Every axis B panel carries one fixed line, because this is the single most misread result in the tool:

> **Hidden characters show that a tool touched this text. They say nothing about who or what wrote it.**

And the reverse, which matters just as much:

> **A clean result is normal. Almost all published writing carries no hidden characters, and a copy,
> paste or save strips them anyway.**

### 1.5 Axis C — Writing notes

Editorial suggestions. Never a detection result. Different word again: **notes**, not signals, not marks.

| Level | Icon | Plain meaning (final copy) | Maps to |
|---|---|---|---|
| **No notes** | pencil | "Nothing here we would suggest changing." | `none` |
| **A few notes** | pencil, one dot | "A few phrases we would look at again." | `some` |
| **Lots of notes** | pencil, three dots | "Plenty of phrases we would look at again." | `many` |

Fixed line under every axis C panel:

> **These are writing suggestions. Human writers set them off all the time: about one human document
> in four (measured on 5,558 documents). They are not evidence about who wrote anything.**

**Colour rule for axis C: neutral only.** No red, no amber, no green. "Lots of notes" is not a warning
and must not be painted as one. This is the single easiest place to accidentally break rule 3, because
a red badge says "bad" faster than any sentence can say "editorial".

### 1.6 Why three different shapes, not three meters

The hard part of this brief is making three separate answers feel simple. A merged score is easy and
forbidden. Three identical meters would be worse than merging, because a reader would average them by
eye and get the merged score anyway, without anyone having written it.

So the three axes differ in **shape, word and colour**, not in position:

| | Axis A | Axis B | Axis C |
|---|---|---|---|
| Shape | bars | shield | pencil |
| Word | signal | marks | notes |
| Colour | one-hue intensity ramp | green / amber / red | neutral grey only |
| Question it answers | Does the writing look machine-made? | Did anything get hidden in the text? | Is the writing any good? |

Read those three questions aloud. They are obviously different questions, and no reader tries to add
them up. That is the whole design.

### 1.7 "Not enough text" — the state that must not look like a failure

This state fires often. On the EU route below 60 words, in the browser below 50 scored tokens, and in
the watermark scan below 40 scored positions. Detection also falls away long before those floors:
67% at 200 words, 50% at 150, 19% at 100 (400 human and 300 AI documents truncated, Python
onnxruntime at 0.98).

Design rules for it:

1. **It is a state, not a level.** It never appears as an empty meter, because an empty meter means
   "No signal". The meter is drawn as three dashed outlines with a dash through them.
2. **Grey, never red or amber.** Nothing went wrong.
3. **It tells the user what would fix it, with a number.** "Add about 90 more words and we can give
   you a reading." That turns a dead end into an instruction.
4. **It never shows a number.** Not greyed out, not small, not behind a tooltip. If a figure is
   unreliable, printing it faintly is worse than not printing it, because screenshots do not carry
   opacity.

Above the floor there is a second, softer version of the same problem, and it is **asymmetric**. Short
text loses detection but gains no false positives (0.00% at every truncation from 60 to 200 words). So
a short draft weakens a clean result and does not weaken a flag. The interface says exactly that:

> **We read 140 words. That is not much. At this length we miss about half of AI writing, so "no
> signal" here is weak news. A strong signal at this length still means something: short human writing
> was not wrongly flagged once in 400 samples.**

That line is generated, not hand-written. See §8.3.

---

## 2. Numeric portability — what happens when the threshold moves

**The threshold is contested.** A parallel session found a real 512-word published SEO article
(GPT-5.6 Sol) scoring 0.8082 and not flagged at 0.984, its opening section at 0.4993. Two corpora
disagree badly: held-out gives articles ~96% and academic 92.4%; the fresh 28 August corpus gives
articles 37.5% (467/1,244) and academic 1.1% (5/457). Prompting a model to "write like a human" costs
30 to 60 points, with grok-4.6 at 0.0% (0/86). The owner is choosing between lowering the threshold
and retraining.

So the vocabulary was designed to survive that decision without a rewrite. Element by element:

| Element | If the threshold drops | If the model is retrained | If the bands are re-cut |
|---|---|---|---|
| Level names (Strong / Some / Faint / No signal) | Unchanged. More documents land in "Strong signal", which is what a lower flag point means. | Unchanged. | Unchanged, unless the band count changes — see below. |
| Icons | Unchanged. | Unchanged. | Unchanged. |
| The track | Unchanged. The flag point is pinned to the 75 mark, so the marker moves and the mark does not. | Unchanged. | Marks stay at 0/25/50/75 for four bands, 0/33/66 for three. |
| Colours | Unchanged. | Unchanged. | Unchanged. |
| The band `measured` sentence | Regenerated from `thresholds.json`. It is data, never copy. | Regenerated. | Regenerated. |
| The weakness line | Regenerated from `thresholds.json`. | Regenerated. | Unchanged in shape. |
| "Not enough text" floor | Unchanged (a length floor, not a probability). | Re-measure `length_sensitivity` and the copy follows the data. | Unchanged. |
| The word "flag point" | Unchanged. It names the boundary, never its value. | Unchanged. | Unchanged. |

**The binding mechanism: no label contains a number, and no number is typed by a human.**

- **The top level always begins at the flag point.** `bands.list[0].min` must equal `threshold`. If
  the threshold moves, that band floor moves with it. A build-time assertion should enforce this;
  today they are two separate fields that could drift apart, which is the same class of bug as the
  0.980 / 0.984 drift recorded in `HANDOVER.md` §4.4.
- **The other three floors are cut from the measured distribution**, exactly as `bands.note` already
  says. They are data.
- **Every published figure comes from `thresholds.json` at build time.** The current
  `local-signals-ui.ts` hard-codes `MEASURED` and `SERVER_MEASURED` as TypeScript string literals
  duplicating the JSON. That duplication is a live hazard: a recalibration updates the JSON and leaves
  the copy lying. Section 8.1 specifies the single source.

**If the band count changes.** Four levels is the maximum this scale carries; three works.
Dropping to three means removing **Faint signal** and widening **No signal**, because that is the
boundary carrying the least meaning to a user. Never drop "Some signal": it is the level that stops
the tool from being read as a yes/no machine.

**A discrepancy the owner should resolve before any of this is quoted.** `HANDOVER.md` §9.1 states
human fiction at 33 of 260 wrongly flagged (12.69%). `thresholds.json`
`per_register_human_false_positives.stories` states 16 of 260 (6.15%). Both cite the same 5,558
document corpus. They cannot both be right. Every worst-case string in §5 is generated from
`thresholds.json`, so the product will publish 6.15% until someone reconciles them. Flagging it here
rather than silently picking the flattering number.

---

## 3. The plain-English explanation layer

The owner's target: *"it's flagging xyz as AI generated because abc in layman's terms."*

There are hundreds of individual signals. There are **six groups**, and each group has one sentence
template that generates a good explanation for every rule in it. Templates and worked examples follow.

### 3.0 The universal template

Every explanation, on every axis, has the same four parts in the same order:

> **[What we found] [Where it is] [Why that is worth knowing] [What you can do]**

Four short sentences at most. The fourth part is dropped where there is no action, and the third is
never a disclaimer: the per-axis disclaimers live once per panel, not once per row. The current build
repeats "This is a stylistic hint, not evidence of authorship" on every one of 116 rules. Repeating a
caveat 116 times does not make it more believed. It makes it invisible.

### 3.1 Group 1 — the trained classifier (axis A)

This is the hard case, and the place where an invented explanation would do the most damage.

A neural model cannot cite a reason. It does not hold a list. But this project measured what it keys
on, and that measurement is the honest "why".

**The four things the copy is allowed to say, all measured:**

1. **AI writing does not circle back on itself.** Adjacent sentences share 2.1% of their content words
   in AI writing against 6.3% in human writing. Eight of the ten strongest signals measure this.
2. **It is causally confirmed.** Making a text repeat itself more costs 33 points. Removing every
   AI-associated word costs 0.8 points.
3. **The famous heuristic does not work.** Burstiness, the most-cited idea in the field, scores 0.521.
   A coin flip.
4. **Roughly two-thirds of the model is nameable.** A 24-feature transparent scorecard reproduces
   72.1% against the neural model's 89.8%.

**Worked example, "Why this section?" panel, final copy:**

> **Why this section?**
>
> Section 3 is the strongest, at 98.7%.
>
> The model does not work from a word list, so it cannot point at a phrase. What it mostly notices is
> repetition, or the lack of it. Human writers circle back: they reuse a word from the sentence before
> about three times as often as AI does (6.3% of content words against 2.1%).
>
> We tested that. Make a text repeat itself more like a person does, and the score drops 33 points.
> Take out every word people associate with AI, every "delve" and "robust", and the score drops 0.8.
> The vocabulary is not what gives it away.
>
> The rest we cannot name. A simple 24-part scorecard we can read gets 72.1% of the way to the model's
> 89.8%. The last third is a shape the model learned and cannot explain, and we would rather say that
> than make something up.

That final paragraph is the point. **Where the honest answer is "the model recognises a pattern it
cannot name", say so.** It costs nothing and it is the most credible sentence on the page.

**The strongest-section rule, which the current copy buries.** From `HANDOVER.md` §4.2: averaging
measured 57.8% against 93.3% on the same documents. This is a genuinely intuitive idea and deserves
the plainest sentence in the product:

> **A document that is half AI averages out to look human. So we score every section on its own and
> report the strongest one. A smoke alarm goes off for one smoky room. It does not average the house.**

That sentence sits directly under the headline number, every time. On mixed documents the difference
is stark and worth showing: a human 300-word opening followed by an AI body was caught 35.0% of the
time by reading the opening and 97.5% by reading every section (40 documents, browser runtime).

**States this group can emit:**

| State | Plain line |
|---|---|
| Scored, at or above the flag point | "Strong signal. Section 3 of 9 is the strongest." |
| Scored, below the flag point | "Some signal. Nothing here passed our flag point." |
| Below the length floor | "Too short to read. Add about 90 more words." |
| Model did not run | "We did not check this. No AI reading was made." |
| Model failed | "We could not check this. No AI reading was made, and nothing has been substituted from the writing checks." |

### 3.2 Group 2 — invisible characters (axis B)

38 carrier rules over 415 code points. Users do not need 38 sentences. They need three, because
`verdict/combine.ts` already sorts every finding into three tiers, and those tiers are exactly the
three things a person wants to know.

| Tier in code | Plain name | Template |
|---|---|---|
| `deliberate` | **Planted** | "A [name] is hidden at [place]. No normal writing or publishing tool puts one there. We checked every innocent reason it could have and none applied." |
| `supporting` | **Could be innocent** | "A [name] is hidden at [place]. That one does turn up honestly, in [reason]. On its own it means little." |
| `excluded` | **Normal typography** | "A [name] is at [place]. That is ordinary typesetting. We list it so you can see it, and it does not count towards anything." |

Plus three **payload shapes**, which are the only findings that reach "Planted marks":

| Shape | Threshold in code | Plain line |
|---|---|---|
| Run | 3 or more carriers side by side | "Five invisible characters sit next to each other with nothing visible between them. That is a message, not an accident." |
| Tag run | 2 or more tag characters outside a flag emoji | "Two invisible tag characters run together. Tag characters have no ordinary use in text. They are the classic way to hide data inside a sentence." |
| Volume | 8 or more planted carriers | "Eleven planted characters are spread through this text. One is odd. Eleven is deliberate." |

**Worked example, planted:**

> **A zero-width space is hidden after "quarterly" in paragraph 2.**
>
> It is a real character with no width, so it never shows on screen. No word processor, CMS or export
> tool puts one into prose on its own. We checked the reasons one could be there honestly, such as
> emoji and Arabic or Indic joining, and none of them fit here.
>
> This tells you a tool wrote into the text after somebody typed it. It does not tell you who, and it
> says nothing about whether a person or a machine wrote the words.
>
> *Remove it* — we will show you the change before anything is altered.

**Worked example, could be innocent:**

> **A byte-order mark sits at the very start of the text.**
>
> That is a file-encoding leftover. Saving a file in the wrong editor produces one routinely. On its
> own it means nothing at all; it only matters if other things turn up too.
>
> *Remove it* — harmless either way.

**Worked example, normal typography:**

> **A non-breaking space sits between "£4" and "million".**
>
> That is normal typesetting. It stops a number from splitting across two lines. We list it so you can
> see everything we saw. It counts towards nothing.

### 3.3 Group 3 — lookalike letters (axis B)

60 Cyrillic and Greek characters that look like Latin ones, only checked inside tokens that already
mix scripts. `combine.ts` splits them in two, and the split is easy to explain:

| Case | Plain name | Line |
|---|---|---|
| Interior: Latin letters on both sides | **Swapped letter** | "The 'a' in 'management' is not an 'a'. It is a Cyrillic 'а' that looks identical. Real multilingual writing does not put one in the middle of an English word." |
| Edge: at a token boundary | **Ordinary mixed script** | "There is a Greek 'α' next to a hyphen in 'α-hydroxylation'. That is how scientific writing is meant to look. It counts towards nothing." |

**Worked example:**

> **Three letters in this text are not the letters they look like.**
>
> "management" (paragraph 1), "product" (paragraph 4) and "process" (paragraph 4) each contain a
> Cyrillic letter sitting between two English ones. On screen they are identical. To a search engine,
> a spell checker or a plagiarism checker they are different words.
>
> Text passes through a tool that swaps letters like this when someone is trying to make copied text
> look new. It does not tell you who did it, and it is not an AI signal.
>
> *We never change these for you.* Swapping them back could break a name or a foreign word, so check
> the spelling yourself.

### 3.4 Group 4 — writing notes (axis C)

116 rules. You do not need 116 sentences. Eight families, each with a plain family name a copywriter
already understands, plus the rule's own suggestion line.

| Family | Rules it covers (ids from `en-signals-*-data.ts`) | Plain family line |
|---|---|---|
| **Stock words** | `tier1`, `tier2`, `tier3`, `buzzword-phrase`, `tier3-phrase`, `tier3-phrase-cluster` | "Words that turn up in a lot of generic writing." |
| **Stock phrases** | `transition`, `template-phrase`, `generic-conclusion`, `formulaic-opener`, `speculative-opener`, `not-just-contrast`, `social-cta-closer`, `rhetorical-question`, `false-concession`, `lets-construction` | "Ready-made sentence shapes. They fit anywhere, which is the problem." |
| **Chat leftovers** | `chatbot`, `sycophantic`, `reasoning-artifact`, `cutoff-disclaimer`, `acknowledgment-loop` | "Bits of a chat window that made it into the finished piece." |
| **Leftover machinery** | `ai-placeholder`, `ai-citation-markup`, `ai-utm-source`, `reasoning-leak`, `placeholder-token`, `pua-character`, `math-alphanumeric`, `arrow-decoration`, `escaped-markup-literal` | "Something that should have been cleaned up before publishing." |
| **Empty claims** | `vague-attribution`, `significance-inflation`, `novelty-inflation`, `hollow-intensifier`, `hedge-stack`, `future-narrative`, `real-actual-inflation`, `confidence-calibration`, `parenthetical-hedge` | "Sentences that sound like they say something and do not." |
| **Same-shaped rhythm** | `sentence-flatline`, `uniformity`, `uniform-sections`, `uniform-list-items`, `punct-distribution`, `cross-para-burstiness`, `fnword-trigram-entropy`, `low-ttr`, `sentence-length-spectral-flatness`, `conditional-compression`, `lexical-register-distance` | "Every sentence or section is about the same size. Real writing wanders." |
| **Formatting habits** | `markdown-bold`, `markdown-heading`, `heading-inflation`, `emoji-decoration`, `title-case-header`, `hashtag-stuff`, `bullet-np-list`, `bold-label-bullets`, `em-dash-density`, `smart-punct-signature` | "Layout habits, not writing. Easy to fix, easy to ignore." |
| **Punchline habit** | `punchline-fragment-density`, `mic-drop-paragraph`, `contrast-density`, `staccato-fragments`, `tricolon-density`, `rhetorical-procedural-ratio` | "Paragraphs built to land on a quotable last line, over and over." |

**Worked example, one row:**

> **Stock phrases · 4 found**
>
> "In today's fast-paced landscape" opens paragraph 1. It could open an article about anything, which
> means it tells your reader nothing.
>
> *Open with a fact instead.*

**Worked example, the panel header:**

> **Writing notes · 12 found across 5 kinds**
>
> These are suggestions about the writing. Human writers set them off all the time: about one human
> document in four (measured on 5,558 documents). They tell you nothing about who wrote anything.

**A decision worth recording.** The "leftover machinery" family — an unfilled `[INSERT NAME]`
placeholder, leaked chatbot citation markup, a `utm_source` an AI tool appends to links — *feels* like
proof. In the evaluation it fired on 0 of 169 human documents. It is still editorial and stays on axis
C, because rule 2 is architectural, not a judgement call about any one rule. The copy handles it by
being specific rather than by escalating:

> **Leftover machinery · 1 found**
>
> `[INSERT CLIENT NAME]` is still in paragraph 6.
>
> *Fill it in or delete it before this goes out.*

That sentence is more useful to the user than any verdict would have been, and it does not break the
rule. This is generally true: **naming the concrete thing beats grading it.**

### 3.5 Group 5 — the watermark scan (axis B, provenance)

Real SynthID-Text maths, three published Opace demo keys, GPT-2 tokeniser, in the browser. A verdict
is withheld below 40 scored positions and a signal is only reported below one-sided p < 0.001.

The honest framing, in one line, and it must lead rather than follow:

> **This checks for one specific maker's mark, using keys we published ourselves. It cannot tell you
> anything about Claude, Gemini or ChatGPT. Those companies keep their keys private.**

| Outcome | Plain line |
|---|---|
| `detected` | "This text carries a watermark under our demo key `opace-demo-alpha`. Something that watermarks its output produced these words at some point. It does not tell you who published them or how much a person changed afterwards." |
| `not_detected` | "No mark found. That is the normal answer, and it proves nothing: text with no watermark and text from a model that does not watermark look exactly the same here." |
| Below 40 positions | "Too short to check. We need about 40 scored positions and this has 22." |
| `not_supported` | "This check does not run on this kind of file." |

**The wrong-key demonstration.** The most compelling result in the whole project, and the thing that
stops people believing a watermark checker can catch Claude. Give it a panel of its own:

> **Watch the same text lose its watermark**
>
> This passage really is watermarked. Under the key it was made with, it scores **0.6807**. Under a
> different key, the same maths on the same words scores **0.4987**, which is a coin flip.
>
> Nothing changed but the key. That is not a bug. It is the whole design: a watermark is only visible
> to whoever holds the key. Which is why nobody without Anthropic's key can tell you anything about
> text from Claude.

### 3.6 Group 6 — Content Credentials (axis B, provenance)

C2PA, for images and PDFs, parsed locally.

| Outcome | Plain line |
|---|---|
| Valid | "This file carries Content Credentials and the signature checks out. Signed by [signer], made with [tool]." |
| Present, with problems | "This file carries Content Credentials but they do not fully check out. The problems are listed below." |
| None found | "No Content Credentials. Most files on the web have none, so this tells you nothing about how the file was made." |
| Unsupported type | "We do not read credentials from this kind of file yet." |
| Parse error | "We could not read this file. Nothing has been counted as a pass." |

Fixed note for the panel:

> Content Credentials are a record the file carries about how it was edited. We read it here on your
> device. We do not check the certificate against a trust list in this release, so treat a valid
> signature as "the file has not been altered since it was signed", not as "we know who signed it".

### 3.7 The "Highlights in your draft" panel — *(from `REDESIGN.md` items 2 and 3)*

**Owner's words: "what is that section meant to be showing me, I cant understand any of it?"**

The panel is headed as AI-style evidence and mostly contains things that are explicitly not evidence.
On the reproduction case it showed one writing suggestion and four protected facts. Three unrelated
concepts share one surface: AI evidence, editing advice, and rewrite anchors. It needs two disclaimers
to explain what it is not, which is the tell. **A panel that has to tell you twice what it is not is
the wrong panel.**

**The constraint that decides the restructure.** The project's own measurement says only **35.9% of
sentences push their document towards "machine"** (2,174 deletions across 57 documents). So a
highlight cannot mean "this sentence is the AI bit". Two sentences in three would be highlighted
wrongly, and a reader will read a highlight as an accusation every time.

**Therefore: delete the panel. Nothing replaces it as a single surface.** Its three contents go to
three places that already exist and already have honest names.

| Was in the panel | Goes to | Named |
|---|---|---|
| Writing suggestions | Axis C, Writing notes | "Writing notes" |
| Protected facts | Its own small panel beside the rewrite tools, not in the results at all | "Facts we will not touch" |
| Anything implying "the AI sentences" | Nowhere | — |

**Section highlighting stays, and it is the only highlighting on axis A.** Selecting a section in the
list highlights that passage. A section is a real unit the model actually scored, so highlighting one
makes a true claim. Individual sentences are not, so they are never highlighted on axis A.

**Copy for the protected-facts panel**, which is not a detection result and should never have sat
next to one:

> **Facts we will not touch**
>
> If you ask us to rewrite this text, these stay exactly as they are: 4 numbers, 2 names, 1 quote.
>
> Nothing here is a finding. It is a list of things we will protect.

**A rendering rule, from item 3.** One finding rendered its matched text as `"W"`, the first character
of the document. A one-letter highlight reads as broken whether the cause is a bad span or a bad
anchor.

> **A highlight shorter than one whole word is never drawn.** If a finding's span resolves to fewer
> characters than the word it sits inside, widen it to the word boundary. If it still resolves to a
> single character, drop the highlight and show the finding as a text-only row without a location.

Fallback copy for that case:

> We found this one but cannot point at it in your draft. The finding still counts.

That item is recorded as not yet reproduced outside the browser, with two undistinguished causes. The
rule above is correct under both, which is why it is stated as a display rule rather than waiting on
the diagnosis.

---

## 4. Icon and colour language

Every icon works at 16 px, in light and dark, and is distinguishable **without hue**. Colour is always
redundant: fill count and glyph shape carry the meaning on their own. Test by taking a greyscale
screenshot; if any two states become identical, the design has failed.

### 4.1 The check icons — one per named check

Drawn on a 16 px grid, 1.5 px strokes, square caps, no fills below 2 px.

| Check | Icon | What the shape says |
|---|---|---|
| Trained classifier | Three vertical bars, ascending | Strength of a reading. Matches the level meter. |
| Invisible characters | A dotted-outline square with nothing inside | Something is there and you cannot see it. |
| Lookalike letters | Two overlapping letter forms, `A` over `А`, offset 1 px | Two things that look like one thing. |
| Writing notes | A pencil at 45° | Editorial. Deliberately the friendliest glyph in the set. |
| Watermark scan | A waveform inside a rounded rectangle | A signal buried in a container. |
| Content Credentials | A rosette with a tick | A seal on a document. |

### 4.2 The level icons — axis A

The same three-bar meter, four fill states plus one withheld state.

| State | Drawing | Non-hue cue |
|---|---|---|
| Strong signal | 3 solid bars | 3 filled |
| Some signal | 2 solid, 1 outline | 2 filled |
| Faint signal | 1 solid, 2 outline | 1 filled |
| No signal | 3 outline | 0 filled |
| Not enough text | 3 dashed outline, horizontal dash across | dashes, unique in the set |

**The track**, drawn beside the meter and never instead of it. A 4 px rail, four tick marks at 0/25/50/75, a filled triangle for this text's position, and a flag glyph at the 75 mark. The rail is `--line` at 3:1 or better against the surface; the marker is the level's own colour so it agrees with the bars. Colour-blind readers get position and shape and need no hue at all. At 16 px the track is dropped and the meter alone is shown.

### 4.3 The level icons — axes B and C

| State | Drawing |
|---|---|
| Clean | Shield outline, empty |
| Odd marks | Shield outline, one solid dot centred |
| Planted marks | Shield outline, a pin through it |
| No notes | Pencil, no dots |
| A few notes | Pencil with one dot above the tip |
| Lots of notes | Pencil with three dots above the tip |

### 4.4 Route icons

| Route | Icon | Meaning it carries |
|---|---|---|
| This device | A laptop outline with a closed padlock inside | Nothing left. |
| Our EU server | A laptop outline with an arrow leaving it into a labelled box | Something left, and here is where it went. |

The arrow is the whole message. A reader who sees an arrow leaving their laptop understands the
privacy trade in one glance, before any sentence loads. Do not use a flag: the region is
`europe-west1, Belgium` and a flag would invite people to read a legal claim into a picture.

### 4.5 Colour roles and measured contrast

Two decisions drive the palette.

**Axis A uses a single hue at increasing intensity, not a red-amber-green ramp.** A ramp from good to
bad tells the reader that a strong signal is *bad* and no signal is *good*, which is a verdict on a
person and breaks rule 1. A single hue that gets stronger says "more", which is what a meter means.
It also makes axis A almost entirely colour-blind-safe on its own.

**Green is reserved for axis B "Clean", and never appears on axis A.** Green on "No signal" would read
as "cleared, human-written". That is the exact claim the engine cannot make.

Values below are measured, not estimated. Ratios computed against the page background and against the
card surface. WCAG 2.2 wants 4.5:1 for body text, 3:1 for large text, and 3:1 for icons and other
non-text graphics (1.4.11).

**Light theme.** Background `#FFFFFF`, card surface `#F5F6F8`, hairline `#D4D7DE`.

| Token | Hex | vs `#FFFFFF` | vs `#F5F6F8` | Use |
|---|---|---|---|---|
| `--ink` | `#14181F` | 17.79:1 | 16.46:1 | body text |
| `--ink-muted` | `#4A5260` | 7.87:1 | 7.28:1 | secondary text |
| `--sig-3` | `#4338CA` | 7.90:1 | 7.31:1 | Strong signal bars and label |
| `--sig-2` | `#6366F1` | 4.47:1 | 4.13:1 | Some signal bars (graphic use only; pair the label with `--sig-3`) |
| `--sig-1` | `#6366F1` at 55% over surface | ≥3:1 as a graphic | — | Faint signal bars |
| `--sig-0` / `--sig-none` | `#52525B` | 7.73:1 | 7.15:1 | No signal, Not enough text |
| `--mark-clean` | `#15803D` | 5.02:1 | 4.64:1 | Clean shield |
| `--mark-odd` | `#92400E` | 7.09:1 | 6.56:1 | Odd marks |
| `--mark-planted` | `#B91C1C` | 6.47:1 | 5.98:1 | Planted marks |
| `--note` | `#4A5260` | 7.87:1 | 7.28:1 | all axis C states |

`--sig-2` at 4.47:1 clears body text and fails nothing, but it is a graphic in practice. Where the
"Some signal" words appear as text, use `--sig-3`. That keeps every text pairing above 7:1 and leaves
the lighter tone for bars only.

**Dark theme.** Background `#0E1116`, card surface `#171B22`, hairline `#2B313B`.

| Token | Hex | vs `#0E1116` | vs `#171B22` |
|---|---|---|---|
| `--ink` | `#E7EAF0` | 15.69:1 | 14.33:1 |
| `--ink-muted` | `#A3ABBA` | 8.19:1 | 7.47:1 |
| `--sig-3` | `#A5B4FC` | 9.49:1 | 8.66:1 |
| `--sig-0` / `--sig-none` | `#9CA3AF` | 7.45:1 | 6.80:1 |
| `--mark-clean` | `#4ADE80` | 10.85:1 | 9.91:1 |
| `--mark-odd` | `#FBBF24` | 11.33:1 | 10.34:1 |
| `--mark-planted` | `#F87171` | 6.84:1 | 6.24:1 |
| `--note` | `#A3ABBA` | 8.19:1 | 7.47:1 |

Hairlines at 1.44:1 and 1.45:1 are decorative only. They must never be the sole boundary of an
interactive control, which needs 3:1 under 1.4.11; give buttons and section cards a `--ink-muted`
border or a surface change instead.

### 4.6 Accessibility rules that are not negotiable

- Every level has a text label. The icon never appears alone.
- `aria-label` on the meter reads the level and the level only: "AI signal: strong". Not the number,
  which is announced separately with its own context.
- "Not enough text" is announced as "Not enough text to read", never as "no result" or "error".
- Focus order on the section list follows document order, even though sections are scored
  strongest-first internally.
- Respect `prefers-reduced-motion`: the meter fills instantly rather than animating.

---

## 5. The microcopy set

Final copy. Every string is written to be shipped, not described.

### 5.1 Empty state, before anything is pasted

> **Check any writing for AI patterns, hidden characters and lazy phrasing.**
>
> Paste your text below. Or drop in an image or PDF and we will read its Content Credentials instead.
>
> Free, no sign-up, and we keep nothing.

Placeholder inside the box:

> Paste your text here. Around 300 words or more gives the most reliable reading.

### 5.2 The route choice

Presented as two options, chosen before the run, with the honest difference in one sentence each.

> **Where should we run the AI check?**
>
> ○ **On our EU server** (recommended)
> Your text is sent to our own server in Belgium, checked in memory, and never stored or logged.
> Nothing to download. You get an answer in a couple of seconds.
>
> ○ **On this device**
> Nothing you paste leaves your browser. Needs a one-off 34.5 MB download the first time, and it runs
> slower on an older machine.
>
> Everything else — hidden characters, lookalike letters, writing notes, the watermark scan — always
> runs on your device, whichever you pick.

After a server run, the receipt panel keeps its current shape and its title:

> **What was sent, and where**

### 5.3 Waiting states

Short, specific, and never a bare spinner. The running maximum is genuinely useful, so it is shown.

| Situation | Copy |
|---|---|
| Server, in flight | "Checking the whole document on our EU server…" |
| Browser, single section | "Reading your text…" |
| Browser, multiple sections | "Reading section 3 of 9. Strongest so far: some signal." |
| Browser, already past the flag point | "Strong signal found already. Still reading, to show you where it is (4 of 9 done)." |
| Model downloading | "Downloading the model: 12.4 MB of 34.5 MB. One time only, then it stays on your device." |
| Local checks | "Checking for hidden characters…" |
| First run of the session, past 5 seconds | "Getting set up. The first check of the day takes about 20 seconds. After that it is a couple of seconds." |

Two notes from `REDESIGN.md` item 6.

**The first run can take about 20 seconds** while modules compile, with a progress line as the only
feedback. Twenty seconds of a spinner is where people leave. The line above names the wait, says it is
one-off, and says what normal looks like, so the wait becomes information rather than doubt.

**The server route shows an indeterminate state while the browser route shows a running best score.**
That asymmetry has never been examined and it is the wrong way round: the default route gives the
worse waiting experience. The server returns one response, so a running score is not available, but
the elapsed time and the document size are. Show those:

> "Checking 1,240 words on our EU server. Usually about 3 seconds."

**If you are automating this UI, foreground the tab.** `requestAnimationFrame` never fires in a hidden
tab, so a run driven from a background tab appears to hang for ever with no error. That cost an hour
and produced a false "the live site is broken" alarm.

### 5.4 The headline result

Three cards, side by side on desktop, stacked on mobile. Each carries its level, its one-line meaning
and a "why" that expands.

No card leads with a percentage. Each shows its level, the track, and the raw figure in the detail
line paired with the flag point. *(Change from `REDESIGN.md` item 1.)*

**Card A, flagged:**

> ▰▰▰ **Strong signal**
>
> This writing is full of the patterns our model sees in machine-written text.
>
> `├────┼────┼────┼──▲─┤` past the flag point
>
> Strongest of 9 sections: section 3.
>
> This is a reading of patterns, not proof of who wrote it.
>
> *Detail:* model output 0.9870, flag point 0.9840, on our EU server.

**Card A, mid-band — the reproduction case:**

> ▰▱▱ **Faint signal**
>
> Barely any of the patterns are there.
>
> `├────┼──▲─┼────┼────┤` well below the flag point
>
> Strongest of 2 sections: section 2.
>
> Faint is not clear. We miss AI writing that someone has tidied up, and a lot of AI writing lands
> here. Read it yourself before you decide anything.
>
> *Detail:* model output 0.8082, flag point 0.9840, on our EU server.

**Card A, clean:**

> ▱▱▱ **No signal**
>
> None of the patterns our model looks for showed up.
>
> `├─▲──┼────┼────┼────┤` well below the flag point
>
> That is not a human verdict. Text a person wrote and then asked AI to polish is deliberately not
> flagged, and AI rewrites of a human original get past us about two times in three.
>
> *Detail:* model output 0.0420, flag point 0.9840, on our EU server.

The "Faint signal" card is the one that matters. It is the state that produced the original defect,
and every channel on it now agrees: one bar, a marker low on the track, the muted end of the ramp, and
a sentence that tells the reader not to draw a conclusion. Nothing on that card says human, and
nothing on it looks like 80%.

**Card B:**

> 🛡 **Odd marks**
>
> Something is hidden in this text that has no everyday reason to be there. One zero-width space,
> paragraph 2.
>
> Hidden characters show that a tool touched this text. They say nothing about who or what wrote it.

**Card C:**

> ✏️ **A few notes**
>
> 12 phrases we would look at again, across 5 kinds.
>
> Human writers set these off all the time. They are not evidence about who wrote anything.

### 5.5 The weakness line

One line, generated from `thresholds.json`, printed under every axis A result. Not in a footer, not
behind a link, not in a tooltip.

> **How good is this?** On 5,558 pieces of long-form writing it had never seen, at the flag point it
> is using right now, it caught 833 of the 922 AI ones (90.3%) and wrongly flagged 62 of the 4,636
> human ones (1.34%), on this same browser. It is worst on stories: 16 of 260 human short stories were
> wrongly flagged (6.15%). If you write fiction, do not rely on this.

Corpus, flag point, denominator and runtime all present, in that one line. That is rule 5, tightened
by `REDESIGN.md` item 5: two corpora in this project currently disagree badly on detection rate
(held-out gives academic 92.4% and articles ~96%; the fresh generated corpus gives academic 1.1% and
articles 37.5%). Until they are reconciled, no detection rate goes on screen without all four.

Measured on the browser runtime for browser runs and the fp32 runtime for server runs, and the copy
says which. Never mix them.

### 5.6 The two sentences that prevent the two worst misreadings

Both appear under the headline number. Neither is optional.

> **A document that is half AI averages out to look human. So we score every section on its own and
> report the strongest one. A smoke alarm goes off for one smoky room. It does not average the house.**

> **The marker shows how strongly the strongest section reads. It is not how much of your document is
> AI, and it is not a percentage of anything. The flag point is the mark it has to pass.**

### 5.7 Not enough text

> ▭▭▭ **Not enough text**
>
> We read 42 words. We need at least 60 to give you a reading, and about 300 for a good one.
>
> Add about 20 more words and we will check it. We would rather say nothing than guess.

Longer-but-still-short variant, above the floor:

> We read 140 words. That is not much. At this length we miss about half of AI writing, so "no signal"
> here is weak news. A strong signal at this length still counts: short human writing was not wrongly
> flagged once in 400 samples.

Watermark variant:

> **Too short to check.** The watermark maths needs about 40 scored positions and this has 22.

### 5.8 Errors

Every error string does three things: says what happened in plain words, says that nothing was
guessed, and offers the way forward as a real button.

| Code | Copy |
|---|---|
| `too_long` (over 4,000 words) | "**Too long for our server.** It takes 4,000 words at a time and this is 6,120. We have not cut it down: a reading of the first two-thirds is not a reading of your document. Run it on this device instead — no length limit there." + button **Run this on my device** |
| `rate_limited` | "**You have used up this connection's free checks for now.** Try again in about 40 seconds, or run it on this device, where there is no limit." + button |
| `unreachable` (offline or server down) | "**We could not reach our server.** Check your connection, or run the check on this device instead." + button |
| `contract_mismatch` | "**We stopped this check on purpose.** Our server split your document into different sections from the ones this page expected. When that happens the same text could score differently depending on where it ran, so we threw the number away. A wrong number is worse than none. Running it on this device avoids the problem entirely." + button |
| `automation_blocked` | "**Our server did not recognise this browser as a browser.** That check keeps scripts off the shared route. Running on this device has no such check." + button |
| `token_failed` | "**This page could not get a pass from our server.** It solves a small puzzle in the background to keep bots out, and that failed. Reloading the page usually fixes it." + button **Reload** |
| Browser engine error | "**The model would not start on this device.** Nothing was uploaded and nothing was scored. Switching to our EU server needs no download." + button |
| Model not downloaded | "**The on-device model is not here yet.** Nothing has been checked. Download it, or switch to our EU server for an answer with no download." |
| Check switched off | "**The AI check is off.** Turn it on above and we will read your text. On the EU route there is nothing to download." |
| C2PA parse failure | "**We could not read this file.** Nothing has been counted as a pass." |
| Text checks on an image | "Hidden characters, lookalike letters and writing notes only work on text. Paste some text to run them." |

**One rule across every error: never substitute.** If the model did not run, the panel says no AI
reading was made. It never quietly promotes a writing-notes score into the empty space. The current
build already gets this right and the copy above keeps it.

### 5.9 Section list — and it should lead

**Promote it above the level cards.** *(From `REDESIGN.md` item 6.)* The section list is the strongest
thing on the page. It shows *where* the evidence is, it makes the max-not-mean argument visible
instead of asserted, and it is the one part of the results a reader can check against their own draft.
It currently sits below the gauge and reads as secondary.

It is also the honest replacement for sentence-level highlighting (§3.7): a section is a unit the
model actually scored, so pointing at one makes a true claim.

> **Section by section**
>
> We scored 9 sections and report the strongest. Tap one to highlight it in your text.
>
> Section 3 · words 681–1,020 · ▰▰▰ · strongest
> Section 1 · words 1–340 · ▰▱▱
> Section 2 · words 341–680 · ▰▰▱

Rows are listed in document order, whatever order they were scored in, and the strongest is marked
rather than moved. A reader is matching this against their own draft.

Footer:

> Sections are cut to fit what the model can read at once, and kept about the same length, so a long
> document never ends on a short scrap. Short scraps are unreliable in both directions.

### 5.10 The watermark row, collapsed by default

*(From `REDESIGN.md` item 6.)* "No signal under any of the 3 public demo keys" appears on every single
run and means nothing to a non-technical reader. It is honest and it is noise at that frequency.

Default state, one line, collapsed:

> 〰 **Watermark: no mark found** — normal, and it proves nothing. *What is this?*

Expanded, it opens into §3.5 including the wrong-key panel. A `detected` result is never collapsed.

---

## 6. Rejected directions

This section exists so nobody re-proposes these. Each one was tried and each one broke something
specific.

**A single Integrity Score out of 100.** The obvious answer, the one every competitor ships, and the
one this architecture exists to prevent. It merges "a machine may have written this", "someone hid
characters in this" and "this phrasing is tired" into one number that means none of them.
`assertAxisIndependence` throws on it. More importantly it would let a zero-width space, which any CMS
paste handler can insert into a wholly human document, drag an authorship score upwards. That is the
category error recorded at the top of `verdict/combine.ts` and it is not coming back.

**Weighting the writing rules into the AI reading at 10%.** Tempting because some of those rules feel
damning, especially the leftover-machinery family. Measured on 5,558 fresh documents the rules caught
45.1% of AI writing while flagging 24.8% of human writing. Worse than the model on both axes at once.
Any weight above zero imports a one-in-four human false-positive rate into the one number people will
screenshot.

**Averaging the section scores for the headline.** 57.8% detection against 93.3% on the same
documents. Averaging is how a half-AI document gets reported as human, and it is why paid tools return
0% on a whole article then flag the same text pasted in blocks.

**Traffic lights on axis A.** Two independent failures. Green reads as "cleared, written by a human",
which is the one claim the engine cannot make. And red-amber-green carries its meaning in hue alone,
so a colour-blind reader gets nothing. The single-hue intensity ramp in §4.5 replaced it.

**A green tick on "No signal".** Same problem in one glyph. A tick means "passed". Nothing passed.

**Naming the model in the watermark result.** "Watermark: Claude" would be the most commercially
attractive row in the product and it is impossible. The lab holds three published Opace demo keys.
Without Anthropic's private key, no amount of correct mathematics says anything about Claude output.
The wrong-key panel in §3.5 exists to make that unmissable, and it should stay even though it makes
the feature sound weaker, because the alternative is selling people a lie.

**A confidence percentage on the verdict.** "We are 84% confident" invites the reader to multiply it
by the probability and get a third number that means nothing. `modelConfidence` in `combine.ts` grades
distance from the flag point, which is a fact about the reading, not a probability. It is expressed as
words in §1.7, not as a percentage.

**Folding "Not enough text" into "No signal".** Both would then show an empty meter and a reader would
treat a 40-word note as a cleared document. Kept as separate states with a unique dashed glyph.

**Showing a faded number when the text is too short.** Rejected because opacity does not survive a
screenshot. If a figure is unreliable, it does not get printed.

**"87% AI" as the headline badge.** Reads as "87% of this document was written by AI". It is not: it
is how strongly the strongest section scores. The sentence in §5.6 exists specifically because this
misreading is the default one.

**Merging the three panels into a tabbed interface.** Tabs hide two answers behind the third and
readers take the visible one as the verdict. Three cards, always all visible, is the point.

**Splitting 0.50–0.95 into two or three narrower levels.** *(`REDESIGN.md` item 1 names this as the
obvious redesign, and it is a trap.)* The band is wide and blunt, and cutting it would invent precision
the model cannot support. It would also need re-cutting on every recalibration, which is exactly the
portability the whole scale exists to protect. The marked track in §1.3 separates 0.52 from 0.94
visually without either problem.

**Keeping the percentage gauge and only changing the words.** The shipped fix changed the words and
colours and left 80.8% on screen. That was the right emergency fix and it is not the end state: the
percentage is still the largest thing on the card, it still reads as *large*, and it still invites
"most of this is AI". Words cannot outrun a number in a glance.

**Labelling a band from `share_ai`.** How the original defect happened. Barred outright in §1.2.

**Highlighting "the AI sentences".** Only 35.9% of sentences push their document towards machine
(2,174 deletions across 57 documents). Sentence highlights cannot mean what a reader will assume they
mean, and there is no wording that fixes that. Section highlighting replaced it (§3.7).

**Naming the scale after the brand alone ("The Opace Score").** Says nothing, and a scale that means
nothing gets filled in by the reader with whatever they already believe about AI detectors. "Signal
Scale" tells them what kind of thing the number is before they read a word of explanation.

---

## 7. Where the honest answer is "we do not know"

Collected so the copy can be checked against them.

- The classifier cannot cite a reason for any one sentence. About two-thirds of its behaviour is
  reproducible from 24 named features (72.1% against 89.8%). The rest is unnameable and the copy says
  so rather than inventing a phrase-level explanation.
- The threshold is under review. A real 512-word published SEO article scored 0.8082 and was not
  flagged. No label in this system contains a number, so none of it becomes false when the number
  moves.
- Short-text detection figures have no recorded denominator in `HANDOVER.md` §13. The truncation
  ladder in `thresholds.json` does have one (400 human, 300 AI), and that is the one the copy quotes.
- Fiction is the worst case and the two sources disagree on how bad (§2). Quote `thresholds.json`.
- Business reports rest on 205 human documents and 72 held-out rows, AUROC 0.6935. Do not quote a
  business-report figure as settled.
- The watermark lab has no adversarial robustness measurement: no paraphrase, no translation
  round-trip, no targeted removal. Nothing in the copy may imply a watermark survives editing.
- Only 35.9% of sentences push their document towards machine (2,174 deletions, 57 documents), so
  nothing in the interface may point at a sentence and call it the AI part. Sections are the smallest
  unit the tool is entitled to point at.
- Content Credentials are not checked against a certificate trust list in this release, and §3.6 says
  so in the panel rather than in a footnote.

---

## 8. Build reference

### 8.1 Single source for every published figure

Today `local-signals-ui.ts` holds `MEASURED`, `SERVER_MEASURED` and `SEGMENTS_MEASURED` as TypeScript
literals that duplicate `thresholds.json`. A recalibration updates the JSON and silently leaves the
copy wrong. This is the same failure mode as the two thresholds drifting apart in `HANDOVER.md` §4.4.

Required: one module that imports `thresholds.json` and derives every string. Every figure in §5.5,
§5.6 and §5.7 is a function of that data, never a literal.

### 8.2 Token names

```
--sig-3  --sig-2  --sig-1  --sig-0  --sig-none      axis A
--mark-clean  --mark-odd  --mark-planted            axis B
--note                                              axis C
--ink  --ink-muted  --surface  --line               chrome
--track-rail  --track-mark  --track-flag        axis A track
```

Level ids, stable across recalibration, for analytics and CSS hooks:

```
axis A   signal-strong | signal-some | signal-faint | signal-none | signal-withheld
axis B   marks-clean   | marks-odd   | marks-planted
axis C   notes-none    | notes-few   | notes-many
```

Mapping from the existing band ids, which stay unchanged in `thresholds.json`:

```
very_likely_ai     → signal-strong
uncertain          → signal-some
likely_human       → signal-faint
very_likely_human  → signal-none
below_reliable_range / inconclusive → signal-withheld
```

### 8.3 The reading-weight rule

Drives the second line of §5.7. Word count is from the whole document, not the strongest section.

| Words | Line |
|---|---|
| under the route floor (60 server / 50 scored tokens browser) | "Not enough text" state, §5.7 |
| floor to 200 | "That is not much." + the asymmetry sentence |
| 200 to 300 | "That is enough for a rough reading." |
| 300 or more | no extra line |

Asymmetry is mandatory in the 60–200 band: short text loses detection and gains no false positives
(0.00% at every truncation from 60 to 200 words, 400 human samples).

### 8.4 Assertions worth adding

- `bands.list[0].min === threshold`. They are two fields today and nothing stops them drifting.
- No level label may match `/\d/`. A number in a label breaks portability.
- No axis B or axis C string may match the existing `AUTHORSHIP_VOCABULARY` regex in `combine.ts`.
  Extend that test to cover the strings in this document once they are implemented.
- The track's flag glyph renders at the 75 mark for every threshold value, tested at 0.80, 0.93 and
  0.984. If it drifts, the display transform is wrong.
- Greyscale snapshot test over the five axis A states and the three axis B states. Any two identical
  is a failure.

---

## 9. Traceability to `REDESIGN.md`

`REDESIGN.md` (owned by the bug-fixing session, read only here) landed during this work. Every
user-facing item in it is answered below.

| Item | Status there | Answered here |
|---|---|---|
| **1** — verdict language and colour contradicted the number (80.8%, green, "Likely human") | FIXED in `opace-latest@d095551d`; must not be reintroduced | §0 rules 6–8; §1.2 the base-rate test; §1.3 headline percentage removed and the marked track; §4.5 green reserved for axis B and a single-hue ramp on axis A; §5.4 the "Faint signal" card, which is the reproduction case; §6 four new rejected directions |
| **1, open part** — "Uncertain" spans 0.50–0.95, blunt and doing a lot of work | OPEN, named as the obvious redesign | §1.3. The band is not split. The track separates 0.52 from 0.94 by position; the name stays honestly coarse. Splitting is rejected in §6 with the reasoning |
| **2** — "Highlights in your draft" is not understandable | OPEN, explicitly assigned to this work | §3.7. The panel is deleted rather than reworded. Its three contents split to axis C, a separate "Facts we will not touch" panel, and nowhere. Constrained by the 35.9% measurement |
| **3** — a finding renders as a single character `"W"` | OPEN, cause undiagnosed | §3.7 display rule: a highlight shorter than one whole word is never drawn, plus fallback copy. Correct under both candidate causes |
| **4** — vendored core drift | CLOSED, false alarm | No design consequence. Recorded so nobody re-raises it |
| **5** — the flag point may move; two corpora disagree | OPEN | §0 rule 5 tightened; §1.3 track geometry with the flag point pinned to a fixed mark; §2 in full; §5.5 the weakness line now carries corpus, flag point, denominator and runtime; §8.1 single data source; §8.4 assertion that no label may contain a digit |
| **6** — section bars should lead | Suggestion | §5.9. Promoted above the level cards, with the reasoning |
| **6** — the ~20-second first run, and the server/browser waiting asymmetry | Suggestion | §5.3. Named wait, and copy for the server route's indeterminate state |
| **6** — failure states never reviewed for tone | Suggestion | §5.8. Eleven states written as final copy, each saying what happened, that nothing was guessed, and offering the way forward as a button |
| **6** — the watermark result is meaningless to a non-technical reader and appears every run | Suggestion | §5.10. Collapsed to one line by default, expanding into §3.5. A detected result is never collapsed |

**Where this document and `REDESIGN.md` differ.** They do not conflict on any measured figure. The one
place this document goes further than the shipped fix is the headline percentage: the fix changed
words and colours and left the number, which was correct for an emergency and is not sufficient for
the glance test. That difference is argued in §1.3 and §6 rather than assumed.

**Unresolved, flagged rather than decided.** The two fiction false-positive figures in §2. Both
sources cite the same 5,558-document corpus and give 12.69% and 6.15%. Every string here is generated
from `thresholds.json`, so the product will publish 6.15% until somebody reconciles them.
