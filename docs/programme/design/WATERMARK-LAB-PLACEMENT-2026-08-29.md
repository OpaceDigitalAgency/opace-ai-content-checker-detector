# Where the watermark lab lives, and how a user drives it

**Date:** 29 August 2026
**Question asked:** *"I like what you've done but where do we show this and how does a user enter
their text? Is this for the checker or the readiness lab or both?"*

**Read for this:** `implementation/docs/WATERMARK-LAB.md`, `HANDOVER.md` §11–§13,
`REFERENCE-TEARDOWN-2026-08-29.md` (§4d and the pattern library),
`mockups/watermark-lab.html` (first pass), the two live pages, and
`research-watermark-tools-/Research-watermark-tools-.md` in full.

**Produced:** `mockups/watermark-lab-v2.html` and `mockups/watermark-placement-map.html`.
Nothing in `_source/` was touched and no existing mockup was edited — UI-3 owns those.

---

## 1. What each page is for

One sentence each, phrased as the question the visitor arrived holding. Both belong at the top of
their own page, and each should name the other.

**Content Integrity Checker**
> *You have a piece of text and want to know what can be established about it.* Paste it once and
> get every check we can run, each answer kept separate, with the watermark scan as one of six and
> on by default.

**Watermark Lab**
> *You want to know what a watermark check can prove, before you trust one.* Watch a real watermark
> appear under one key and disappear under another, on passages we made ourselves.

The distinction that makes both pages necessary: the checker answers **about your text**; the lab
answers **about the method**. A visitor who wants a verdict is on the wrong page at the lab, and a
visitor who wants to understand why the verdict is hedged is on the wrong page at the checker.
Neither page currently says so above the fold. Both should, in a two-card router — that is the
first change in `watermark-lab-v2.html`.

The live lab's current H1 and deck are written for a reviewer, not a visitor:

> "Claude Watermark Readiness Lab" / "Review the evidence a future public fixture would need. See
> the exact boundary between a reproducible SynthID experiment and an unverified Claude production
> claim."

That is an accurate sentence addressed to nobody who would type the query. The first-pass mockup
already fixes it, and the fix holds.

---

## 2. How a user gets their own text in

### In the checker: nothing changes

Text arrives with everything else, in the one box at the top. The watermark result is a collapsed
line in the evidence sheet — *"Watermark: no mark found — normal, and it proves nothing"* — that
expands to the three-key table. No second input, no separate button, no download prompt, and the
row carries a `needs key` capability tag so the caveat rides on the tag rather than in prose
(teardown pattern P3). The checker must never ask a visitor to think about keys. It reports, tags,
and links out.

### On the lab: yes, a paste box — third of four sections, not first

The live lab already has one, in section 02, after the sample passages and key controls. The
first-pass mockup keeps it third, behind a 1.7 MB load gate. **Both placements are right, and the
reasoning has not been written down anywhere, which is why the question keeps coming back.**

On the lab, the honest answer to nearly every paste is "no signal", because Opace published the
only three keys the page can see and nobody generates text with them. So:

- A paste box at the **top** makes a null result the page's first impression for almost every
  visitor, with no context to read it by. The page's opening move becomes an apparent failure.
- A paste box at **position three** reaches a reader who has already watched 0.6807 collapse to
  0.4987 under a different key. The same null result now lands as the lesson arriving, on their
  own text. It costs one scroll and converts the page's weakest moment into its strongest.

So the section is not headed "check your text". It is headed **"Run it on your own text, and watch
it come back empty"**, and the deck says outright that this is the experiment most people want and
the one that surprises them.

### The 0.5 outcome, which is the common case

It must read as neither a failure nor a clean bill. The lab needs three named outcomes with a fixed
vocabulary, following the teardown's P4 — an explicit non-answer with its stated cause, never a
blank panel and never a tick:

| Outcome | When | What it says |
|---|---|---|
| **No signal under these keys** | almost always | "Your text carries no mark from any of our three demo keys. Almost nothing on the internet does, because we published those keys ourselves and nobody generates with them." Then, separately: "This does not say a person wrote it. It does not say a machine wrote it." |
| **Too short to score** | under ~40 scored positions | "We scored 22 words. The maths needs about 40 before it can tell a mark from noise, so we are not giving you a reading at all rather than giving you a weak one." A refusal, disclosed before the paste (P13). |
| **Signal found — demo key 1** | text made on this page | "That is the only thing this result means: it was made here, or by someone using our published key." |

Three supports carry the honesty without a disclaimer paragraph:

1. **The no-mark value is printed beside every reading** (P2). `0.496` next to `0.500` is
   self-explaining, and a threshold change cannot make the copy wrong.
2. **A `not a verdict` tag on the outcome heading**, so the caveat is read before the result.
3. **A route out.** Beside the "no signal" outcome: *"Wanted a verdict on your text? The checker
   runs five other checks that do give one."* This handoff does not exist today in either
   direction from the lab, and it is the single missing link in the pair.

---

## 3. Merge, split, or change the relationship?

**Stay split. Sharpen the boundary. Proceed with the spin-out, with one addition to the plan.**

Merging fails on the input question alone. A merged page would have one paste box, and that box
would have to serve both "tell me about my text" and "show me why you cannot tell me about my text".
The first wants a verdict at the top; the second needs the demonstration first or its verdict is
meaningless. One box cannot be both without one of them being badly served.

What should change is the **relationship**, in three ways:

1. **Name each page by its entry question, on the page, above the fold.** Two router cards. Cheap,
   and it resolves the owner's question permanently for visitors as well as for the team.
2. **Add the missing Lab → Checker handoff.** Checker → Lab exists. The reverse does not, so a
   visitor who landed on the lab wanting their text checked has nowhere to go.
3. **Keep the checker's watermark row a result, never an instrument.** Everything key-shaped lives
   on the lab.

### On HANDOVER §12's decided-but-not-done spin-out

The decision survives this analysis intact. The rationale is right: a `packages/` subfolder is
invisible to anyone searching "SynthID detector", and watermarking becomes materially more
important the moment a provider ships a public verification path. Building the standalone UI around
the wrong-key experiment rather than a pass/fail badge is also right, and it is what both mockups
do.

**Two things §12 does not record, and both matter:**

**a) The spin-out creates a second home for the same UI.** After it, the lab page exists twice —
`opace.agency/…/claude-watermark-readiness-lab/` and the standalone repo's GitHub Pages demo. Two
hand-maintained copies of a page whose entire value is a precise honesty claim will drift, and the
failure mode is one of them still asserting something the other has retracted. Build the lab page
**once and deploy it to both**, or accept the drift knowingly. The checker's watermark row shares
only the npm package, not the UI, so it is unaffected.

**b) Generation is the gate, not an enhancement.** §13 lists porting tournament sampling as
"decided but not done". Detection alone makes the standalone repo a viewer for canned fixtures.
Generate → inspect under the right key → switch the key → edit → inspect again is what makes it
something a person operates rather than reads. It should block publication of the spin-out rather
than follow it.

---

## 4. What the research document changes

`Research-watermark-tools-.md` is a ChatGPT transcript with the owner in it, dated 29 August 2026.
**Provenance first, because it governs how much of this is usable:** its assertions are
LLM-generated with citations attached, not independently verified by anyone on this workstream.
Under the §14 rule about publishing the runtime a figure came from, nothing below should reach a
public surface until it has been checked at source. Where I use its figures on the mockup, they are
labelled on the page as third-party and unverified.

With that said, it is the most useful document I read for this question, and it changes four things.

### It answers the owner's question directly, and better than the current design

It proposes the lab as **four experiments** — how it works / the secret-key experiment / watermark
your own text / try to break it — with an explicit "Try Claude text" affordance whose *failure* is
the feature:

> "That apparent 'failure' is actually one of your strongest educational features."

That is the same conclusion §2 above reaches from the placement argument, arrived at
independently. `watermark-lab-v2.html` adopts the four-experiment structure wholesale, because it
gives the paste box a place in a narrative instead of leaving it as an appendix to a demo.

### It extends the honest-limits list in a way that undercuts the current resilience table

`WATERMARK-LAB.md` records truncation and token substitution, where the mark weakens but survives,
and lists paraphrase as unmeasured. The research supplies published third-party figures for a
comparable research setup:

- matched-key detection ~71% / 68% TPR at 200 tokens at 1% FPR, falling to ~38% at 100 tokens
- a change of sampling settings alone dropped one run from ~71% to ~34%
- **paraphrase dropped matched-key detection from ~70% to 4–5%**

If the last figure is even directionally right here, the current robustness table shows only the
damage the mark survives and omits the one that kills it. **A table of survivable damage
over-reassures.** The mockup therefore prints the unmeasured rows as empty rows with "No" in a
Measured column, and says so in the copy. Not measuring it is defensible; showing four survivable
cases and silently omitting the fatal one is not.

**This is the most consequential thing in the document and it should go into `WATERMARK-LAB.md`'s
limits section regardless of anything else here.**

### It contains the owner drawing the lab/checker boundary himself, which is the cleanest statement of it anywhere

The transcript has him correcting the analyst for conflating the lab with the parent product, and
the resulting table is an explicit in/out list: generation **yes**, resilience testing **yes**, KGW
and Gumbel **maybe**, and image detection, C2PA, Unicode cleaning and the AI-writing classifier all
**no** — those belong to the checker. That table is reproduced in
`watermark-placement-map.html`. It settles question 1 with more authority than anything in the repo.

### It confirms the lab's actual differentiator, which is not sophistication

Unmark's statistical inspector needs a Python sidecar, an ~8 GB model and detector bundles. Opace's
runs from a 1.7 MB browser download with no server. The research is explicit that this is the
advantage. **Consequence for the design:** the load gate in the first-pass mockup is written as a
warning ("Before you do:…"). It should be written as the boast it is — the maths runs in your
browser, nothing you paste is ever sent anywhere — with the "our keys only" caveat kept but
demoted to the methods strip. That is the change made in the v2 mockup's methods block.

### One thing that is out of scope here but should not be lost

The research argues the largest opportunity is **image and media provenance** — it claims OpenAI now
ships a public verification tool and API covering C2PA and SynthID for images and audio, and that
C2PA has a governed trust list that would let the checker upgrade from "credentials found" to
"credentials found, signature valid, issuer trusted". Both are checker roadmap items, not lab items,
and both are **unverified claims from an LLM transcript**. If they hold they are more valuable than
anything on this page. Someone should verify them at source; that is a separate task.

### What it does not contradict

The wrong-key headline, the private-key framing, the refusal to say anything about Claude, Gemini or
ChatGPT, and the decision to spin the lab out. All four are independently reinforced.

---

## 5. Deliverables

| File | What it is |
|---|---|
| `mockups/watermark-lab-v2.html` | The lab page as four experiments, with the router at the top, the paste box third, and the three named outcomes switchable from the mockup bar. |
| `mockups/watermark-placement-map.html` | Not a page design — a map of what each surface owns, where a user types on each, the two handoffs, the one-source-two-deployments requirement, and the in/out table. |

Both reuse the first-pass stylesheet unchanged so they open alongside `watermark-lab.html` for
comparison. New filenames only; `_source/` untouched.

## 6. What I did not do

- Did not verify the research document's third-party figures at source. They are labelled unverified
  wherever used.
- Did not measure paraphrase resilience. The recommendation is to publish the gap, not to fill it here.
- Did not touch the live pages, the existing mockups, or `_source/`.
