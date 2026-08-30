# DESIGN-FAILURE.md

**Written 29 August 2026 for an incoming agent or agency with no prior context and no way to
ask questions.** Everything needed to pick this up is here or linked from here. Where something
is unverified, it says so.

The short version: a UI/UX redesign of two public tools was researched thoroughly, designed
well, and implemented badly. The owner's four original complaints were measured and targeted,
but the delivered experience still fails the brief. **This is not primarily a CSS failure.** The
CSS contrast defect makes one screenshot look visibly broken, but the owner's rejection is of
the whole experience: it is still cluttered, busy, over-explained, badly prioritised, difficult to
scan, unintuitive to operate, visually unbalanced and too technical for its intended audience.

This document records what he asked for, the evidence and references he supplied, what was
proposed, what he approved, what changed, why it changed, what shipped, what regressed, what the
final screenshots prove and what a replacement provider must do differently. A repair that only
changes the dark-panel colours has misunderstood the task.

---

## 1. The product, in one paragraph

Opace AI Content Integrity is a free AI-content checker at
<https://opace.agency/tools/ai/content-verification-integrity/checker/>, with a sibling page,
the Claude Watermark Readiness Lab, at
<https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/>.

A visitor pastes text and gets **three separate answers that are never combined**: how much the
writing matches machine-written patterns, whether it contains hidden or lookalike characters,
and which phrases are editorially weak. Plus a watermark scan under published demo keys, and a
C2PA Content Credentials read on uploaded files.

Site: Astro, deployed on Netlify from `OpaceDigitalAgency/opace-latest`, pushing to `main`
deploys. Local checkout:
`/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/`.

Engine: a shared TypeScript package consumed as a vendored tarball. Programme root (not version
controlled, 13 GB): `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/`.

**Read `HANDOVER.md` in the programme root before touching anything.** It is the authoritative
account of the product and its constraints.

---

## 2. What the owner actually asked for

His words, verbatim, at the start of the task:

> "I am not impressed with the opace ui/ux at all for these... mine in particular are too busy,
> too much text above the tool, too much happening lower down, language that the average users,
> SEO or copywriter cant understand. We shouldnt give them jargon or tech langauge - they have
> the readme docs for that if they want. Our tools should be dead simple so even a student at
> school could use and understand e.g. it's flagging xyz as AI gnerated becuase abc in laymans
> termss. Better yet we can invent our own simple but catchy scoring and brad language and
> visual icons to clearly show what's happening. Use all of your installed ui/ux/design skills
> to make this a masterpiece, powerful but simple, better than any other tool, super intuitive,
> easy to understand, etc."

Later, and binding:

> "All of this is great but it must look good and like the current Opace 'look and feel' not
> something separate."

And, twice during the task, he asked for "the simplest dummy explanation". That is the register
he wants for user-facing copy.

**His four complaints, which are the acceptance criteria:**

1. Too busy.
2. Too much text above the tool.
3. Too much happening lower down.
4. Language the average user, SEO or copywriter cannot understand.

### 2.1 What those four complaints mean in practice

Do not reduce these to word counts. The measurements are evidence, not the definition of success.
The owner is describing the total first impression and the effort needed to use and understand the
tool.

| Owner concern | Full meaning | What would count as failure again |
|---|---|---|
| **Too busy** | Too many boxes, borders, colours, headings, badges, choices, cards, disclosures and competing visual levels. The eye does not know where to start or what matters. | Fewer words inside substantially the same dense arrangement; replacing old cards with a different collection of cards; preserving every detail in the main reading path. |
| **Too much text above the tool** | A visitor should reach the paste box and primary action immediately, without reading a product brief, methodology, privacy essay or model explanation first. | The paste box appears earlier but the route explanation, cautions, controls and disclosures still turn the input into a form to study. |
| **Too much happening lower down** | The result and supporting page should not become a second documentation site. The useful answer must lead; caveats, methods, receipts and secondary actions must recede. | A long results rail, a repeated copy of the draft, a grid of method cards, multiple disclosures, repeated accuracy text, detached actions and another dense explanatory band. |
| **Language is too technical** | A school student, copywriter or SEO should understand what happened, what it means and what to do next without knowing model, corpus, runtime, token, threshold, provenance or watermark terminology. | Technical terms remain visible because they are accurate; statistics replace an explanation; a disclosure title itself requires explanation. |
| **Looks and feels wrong** | It must feel like a polished Opace tool while also being calmer and simpler than the old page. Opace styling is not a licence to reuse every shared marketing component or alternate large light/dark bands regardless of the tool journey. | Brand colours and components are present but spacing, density, balance, typography, hierarchy or fixed marketing chrome make the tool feel improvised or obstructed. |
| **Unintuitive** | The next action and the meaning of the result should be obvious without instructions. Choices should appear only when needed, related information should stay together, and the page should not make the user decode its architecture. | Empty panels explain future panels; route controls read like policy; nested scrolling hides context; the result duplicates the input; cards describe internal methods rather than user outcomes. |

**Binding interpretation added after the final owner review on 30 August 2026:** fixing contrast is
necessary but nowhere near sufficient. The page must be reconsidered as a complete interaction and
information hierarchy. The owner's words were: **"The whole thing is still cluttered, busy and
unintuitive."**

**Reference material he supplied**, as screenshots: his own two pages before any change; an
Originality.ai article page (a wall of dense prose with a tool buried in it, which he disliked);
and **Unmark** (<https://github.com/ivanusto/unmark-web>), which he liked most — a one-line
title, a single reassurance strip, three plain tabs, two side-by-side panes, two buttons, and
nothing above the tool.

**His final verdict on what shipped**, which is why this document exists:

> "Honestly, I am really disappointed with this task and first impressions. My page layouts are
> the same. It's long and hard to follow. Css/styles all off. Essentially it looks worse than
> before to me now and none of my initial issues/requests seem to have been addressed."

He then clarified that his concerns were **"way more than the CSS failure"**. That clarification is
binding on any future review: §6.1 is one defect, not the scope of the redesign.

---

## 3. What was measured before designing anything

An audit drove the live tool as a first-time user, seven full runs in a real browser, and
measured the complaints rather than accepting them. Full document:
[`.agent/docs/ai-content-integrity/ui-ux/UX-AUDIT-LIVE-2026-08-29.md`](.agent/docs/ai-content-integrity/ui-ux/UX-AUDIT-LIVE-2026-08-29.md)

| Finding | Measurement |
|---|---|
| Words between landing and the run button | **1,112** (422 before the paste box) |
| Run button position, 375 px | **6.5 screens** down |
| Result block | **1,523 words** |
| Times the verdict explained itself | **0** |
| Route choice copy | 165 words |
| Textarea description | 190 words |
| Radio button names | 101 words |
| Mobile toggles under 24 px | 15 |
| Same panel contradicting itself | "113 rules" vs "116 rules"; "50 characters" vs "60 words" |

Two further findings that mattered more than the layout:

- **The two scoring routes disagreed by 33 points on the page's own sample** (browser 0.9183,
  server 0.5866) while the label told users both gave "the same evidence at the end".
- **A finding rendered as the single character `"W"`**, with its "show in draft" jump pointing at
  an unrelated character.

---

## 4. What was designed

Four research documents, all in `.agent/docs/ai-content-integrity/ui-ux/`:

| Document | What it establishes |
|---|---|
| [`UX-AUDIT-LIVE-2026-08-29.md`](.agent/docs/ai-content-integrity/ui-ux/UX-AUDIT-LIVE-2026-08-29.md) | The measured audit above, plus a **keep list** of what was already good |
| [`PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md`](.agent/docs/ai-content-integrity/ui-ux/PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md) | ~11,700 words. The **Signal Scale**, the plain-English explanation layer, the icon language, the full microcopy set, and the rejected alternatives with reasons |
| [`REFERENCE-TEARDOWN-2026-08-29.md`](.agent/docs/ai-content-integrity/ui-ux/REFERENCE-TEARDOWN-2026-08-29.md) | Competitor teardown — Unmark, Originality.ai, GPTZero, ZeroGPT, Scribbr, plus non-detectors that solved the same problems (PageSpeed Insights, WAVE, Hemingway) |
| [`REDESIGN-BUILD-NOTES-2026-08-29.md`](.agent/docs/ai-content-integrity/ui-ux/REDESIGN-BUILD-NOTES-2026-08-29.md) | The design tokens extracted from the real Opace CSS, and the capability ledger |

### 4.1 The Signal Scale — the owner chose this

Four levels plus a state, borrowed from phone signal bars: **Strong signal / Some signal /
Faint signal / No signal**, plus **Not enough text**. The owner picked it by looking at three
schemes side by side and said it "communicates to me best".

Why it was chosen over the alternatives, all of which are documented with their failure modes:

- **No label contains a number**, so a threshold change costs no copy rewrite.
- Its top level **begins at the flag point**, so its words can never contradict the tool's own
  decision. Both other schemes failed this in opposite directions.
- The "no service" state solves "not enough text" through the metaphor itself.

### 4.2 The rule that shapes everything

**The three axes must stay separate.** AI probability, text integrity and editorial are
published side by side and never combined. There is a runtime assertion, `assertAxisIndependence`,
that throws if they contaminate each other. A hidden character proves *manipulation*, not AI
*origin*.

The design problem is therefore "make three separate answers feel like one simple answer",
which is harder than it sounds and is why a single blended score keeps getting proposed and
must keep being rejected.

### 4.3 The mockups

Nine self-contained HTML files, no build step, no network. Open them directly.

| File | What it shows |
|---|---|
| [`mockups/checker.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/checker.html) | **The main deliverable.** Six clickable states: empty, pasted, running, middle result, flagged result, too short |
| [`mockups/watermark-lab.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/watermark-lab.html) | The lab, built around the wrong-key experiment |
| [`mockups/compare.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/compare.html) | The three naming schemes on one screen with a flag-point switch |
| [`mockups/system.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/system.html) | The design system: tokens, icons at 16 px, contrast tables computed in the page, the three claim classes |
| [`mockups/index.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/index.html) | Contents and the before/after numbers |
| `mockups/watermark-lab-v2.html`, `watermark-placement-map.html`, `faq-preview.html`, `provider-status-panel.html` | Later additions covering lab placement, FAQ and provider status |

**The mockups are generated.** Sources are in `mockups/_source/`; after any edit run
`python3 _source/build.py` or the five main files desynchronise.

**Mockup targets, measured in the rendered page:**

| | Live before | Mockup |
|---|---|---|
| Words before the run button | 1,112 | **86** |
| Result block | 1,523 words | **503** |
| Run button, 375 px | 6.5 screens | **1.18** |
| Tap targets under 24 px | 15 | **0** |

---

## 5. What shipped, in order

All on `OpaceDigitalAgency/opace-latest`, `main`. Newest first.

| Commit | Change | Why it was made | Outcome relevant to this handover |
|---|---|---|---|
| `3169a6d6` | **Page restructure:** shortened hero and input copy, reduced lower bands and moved detail into disclosures. | The result rewrite had left the surrounding page essentially unchanged; the owner reported that the redesign still looked terrible. | Counts improved materially, but the delivered hierarchy and result composition remained unaccepted. |
| `df4a7417`, `5e05e8f7` | Guarded a missing optional field that blanked the whole result panel; removed hard-coded measured figures from its test. | A valid run could appear to produce no result, and the test would become stale when calibration moved. | Functional failure closed; did not improve the rejected composition. |
| `e1a2a339` | Added the two-threshold aggregation rule. | Align the detector's decision rule with the measured operating point. | A scoring change during the redesign period, not a visual answer to the owner's complaints. |
| `aebd7744`, `b9671b18` | Suppressed a location where a check cannot apply and stopped saying a check had not run when it had. | Result copy was contradicting runtime facts. | Improved truthfulness; added no simplification by itself. |
| `324320e0` | **Rewrote the result block** using the new `ci-*` Signal Scale, axis and check-card components. | Replace the 1,523-word result and confusing mixed-evidence panel while keeping three axes separate. | Created the current card-heavy result, tall right rail and dark-context contrast defect shown in §6.0. |
| `01727429` | Corrected Anthropic wording and gave the browser route its own corpus figures. | Provider claims and runtime measurements must not be conflated. | Accuracy improved; technical disclosure remained visible and contributed to density. |
| `173a756e` | Made missing measured claims fail the build instead of rendering blank. | Prevent another empty or misleading result after calibration/data changes. | Necessary guardrail, visually neutral. |
| `938edc02` | Added the approved tone vocabulary and Signal Scale names. | Replace threshold-bound and contradictory labels with owner-selected plain language. | Naming direction implemented, but surrounded by too much interface. |
| `c570440c`, `78e8555c` | Centralised published figures with denominators and runtime-specific lookup. | Stop contradictory accuracy numbers and prevent one runtime's measurement being quoted for another. | Correctness improved; the quantity and placement of visible statistics still needed editorial restraint. |
| `c841a658` | Prevented the hidden-character safe fix from destroying C2PA text credentials. | Simplification and automated fixes must not corrupt provenance data. | Critical functional regression closed. |
| `d4a8b84a`, `142a40fa` | Fixed both causes of the one-character `"W"` finding/highlight. | A meaningless one-letter result looked broken and pointed to the wrong place. | Defect closed; illustrates why real runtime states must be inspected visually. |
| `b0d0f9c5` | Deleted eleven unreferenced stub modules. | Remove dead implementation scaffolding before the component rewrite. | Code clean-up only; not a user-visible simplification. |
| `16e47ba8`, `c66cbc5b` | Removed retracted accuracy claims from live copy and JSON-LD. | The claims were unsupported or superseded and could not remain public. | Trust/correctness repair; not a layout change. |
| `d095551d`, `a55d616f` | Stopped a high AI-style score being labelled and coloured as human. | Number, words and colour had communicated opposite conclusions. | Severe verdict-presentation defect closed before the Signal Scale work. |

### 5.1 The task history and why each phase happened

The commit table records code changes; this table records the design history. A new provider needs
both, because the failure came from the gap between the approved direction and the delivered page.

| Phase | Input or decision | Proposed or completed action | Why | Outcome |
|---|---|---|---|---|
| Original rejection of the existing tools | Too busy; too much text above; too much below; language unsuitable for ordinary users; should be simple enough for a school student. | Audit the live checker and Lab before redesigning. | Turn subjective frustration into observable problems without weakening the owner's intent. | Seven live runs measured 1,112 words before the button, 1,523 result words and a 6.5-screen mobile path. |
| Reference review | Original Opace screenshots, Originality.ai as a negative example, Unmark as the preferred simple interaction. | Extract patterns from Unmark and compare detector and non-detector tools. | Avoid inventing a generic dashboard and identify why the preferred reference felt effortless. | The proposed direction became one-line framing, immediate input, one primary action and progressive disclosure. |
| Plain-language system | Invent simple Opace scoring language and visual icons without falsely claiming authorship. | Compare three naming schemes and build the Signal Scale. | Preserve three independent product axes while making the first answer understandable. | Owner selected Strong / Some / Faint / No signal. Mockups carried the chosen language. |
| Opace visual alignment | Must use current Opace look and feel, not appear as a separate product. | Extract actual Opace tokens and rebuild the mockup around them. | Keep brand continuity while simplifying the tool. | The mockup was approved as direction; the later live implementation reused Opace components but did not reproduce the mockup's calm hierarchy. |
| Implementation preparation | Existing claims, thresholds and capabilities were inconsistent. | Centralise measured figures, correct verdict language and protect engine invariants before restructuring. | A visual redesign could not safely ship on contradictory or hard-coded data. | Necessary correctness work landed, but it delayed and then overshadowed the visible redesign the owner was waiting for. |
| Result-block rewrite | Replace the dense result with the new `ci-*` component family. | Build Signal Scale, section summary, separate axes and method cards. | Make three answers coherent without merging them. | Functionally richer and shorter, but still card-heavy; introduced the dark-context contrast defect and the tall right-rail layout visible in the final screenshot. |
| Capability recovery | File upload, examples, protected-content check, cancel, fix preview, receipt/print and no-script support had disappeared. | Restore every removed capability and create a capability ledger. | The redesign must simplify presentation without deleting useful behaviour. | Features were restored, but the recovery reinforced the need for an explicit inventory before further structural work. |
| Late page restructure | Owner reported the page still looked terrible and unchanged. | Cut the hero and surrounding copy, remove a duplicate band and move detail behind disclosures. | Address the page-level complaints that the result rewrite had not touched. | Word counts and page height improved, but the live layout still diverged materially from the approved mockup. |
| Final owner review | “Layouts are the same”, “long and hard to follow”, “CSS/styles all off”, “looks worse”, and later “the whole thing is still cluttered, busy and unintuitive”. | Stop treating numeric improvement or the CSS defect as acceptance. Preserve the screenshots and write this failure record. | The final authority is the owner's experience of the rendered page. | Current state is **rejected**, not “redesign completed with a few defects”. |

The detailed implementation rationale remains in
[`IMPLEMENTATION-LOG`](.agent/docs/ai-content-integrity/ui-ux/IMPLEMENTATION-LOG-2026-08-29.md),
but any orchestration notes inside linked evidence are historical metadata, not part of this handover
and not instructions for the next provider.

### 5.2 Measured outcome after the late restructure

**Measured after `3169a6d6`:**

| | Before | After |
|---|---|---|
| Visible words before the run button | 1,084 | 274 |
| Words before the paste box | 386 | 140 |
| Whole-page visible copy | 1,665 | 630 |
| Run button, 375 px | 7.5 screens | 2.46 |
| Page height, 1440 / 375 | 7,567 / 12,349 px | 5,578 / 6,930 px |
| Containers visible at once in the tool card | 11 | 4 |
| Jargon terms in the reading path | 14 | 1 |

Those numbers are real and reproducible. **The owner still says it looks worse.** Section 6
explains why both can be true.

---

## 6. What went wrong

### 6.0 The final owner-rejection screenshots — the whole failure in two frames

These are the owner's screenshots of the delivered page, supplied with the rejection on 30 August
2026. They are copied into the project so this account does not depend on files remaining on one
desktop.

#### Empty state, 910 × 1,222

![Delivered empty state showing a large input form, explanatory result placeholder and a dense technical band below](.agent/docs/ai-content-integrity/ui-ux/screenshots/owner-rejection-2026-08-30/01-empty-state-910x1222.png)

Source SHA-256:
`449cfb982fbdefd6e06c884e372cc3cbeeaf5d076c6cf356dba72549c2b6fd7f`.

What this frame proves:

- The first useful action is still surrounded by instructions, route policy, a privacy caution,
  two disclosures and explanatory text. It reads as a configuration form, not a dead-simple tool.
- The empty result panel spends prominent space explaining its future structure instead of either
  staying quiet or helping the user take the next action.
- The route choice still asks an ordinary user to compare server location, retention, speed,
  privacy and a 34.5 MB browser model before pressing the only important button.
- The next dark band immediately returns to technical disclosure: `fp32 runtime`, corpus fractions,
  long-form qualifications and public demo keys. Accurate information is not the same as usable
  information; it belongs behind a plainly named optional explanation.
- The page alternates from a large pale form to a large dark method band before the user has seen a
  result. The visual rhythm belongs to a marketing page, not a focused utility.
- The page is cleaner than the original by word count, but still not intuitive on first inspection.

#### Result state, 756 × 1,804

![Delivered result state showing a very tall dark results rail, large empty left column, low-contrast cards and overlapping fixed proposal bar](.agent/docs/ai-content-integrity/ui-ux/screenshots/owner-rejection-2026-08-30/02-result-state-756x1804.png)

Source SHA-256:
`b71981ee84ab7986c4e3b8386ec03b3402bc7c9a8a3534abd8d96fba6fd6b30e`.

What this frame proves:

- The result becomes an extremely tall, narrow dark rail on the right while most of the left side is
  empty. This is a major balance and reading-order failure, not a colour bug.
- The user must read a headline card, a section graph, another copy of the full draft, separate
  Hidden Characters and Writing Notes cards, seven method/status cards, a Maker's Mark card, a
  detached protected-facts card, four detached actions and then another explanatory band.
- The pasted draft is repeated in a second scrollable box. The page therefore asks the user to
  navigate the page scroll plus nested text scrolling while the related result sits elsewhere.
- Method coverage is presented as a grid of internal checks. It is visually prominent even when
  most checks found nothing, so absence of findings creates more interface rather than less.
- The important answer is not allowed to dominate. It competes with badges, a scale, section
  annotations, model details, cards, status pills and multiple explanation levels.
- Several headings and supporting lines are almost invisible because of the defect in §6.1. Small
  type and cramped card layouts make the remaining legible text tiring to scan.
- “Facts we will not touch” and the receipt/print/methodology/lab actions are detached far below the
  result they belong to, across the empty left column. Their placement does not explain their
  relationship to the verdict.
- The floating proposal bar covers the lower disclosure copy at this width. The problem is not
  limited to its previously recorded collision with the paste box at 375 px.
- The final page still looks long, cluttered and hard to follow even if every pale heading is made
  darker. A palette repair would leave the dominant structural failure untouched.

### 6.1 The CSS defect — one reason it looks broken, not the whole failure

**Confirmed by inspection, and it is the highest-priority accessibility repair. It is not the
highest-level redesign decision and must not be mistaken for the owner's whole complaint.**

The result-block rewrite (`324320e0`) introduced new components using `ci-*` class names. Their
stylesheet is
[`src/styles/content-integrity-signal-scale.css`](../../opace-website/astro-latest/src/styles/content-integrity-signal-scale.css),
imported by `IntegrityToolShell.astro:8`, and it does ship — the rules are present in the live
page's inline style block.

**But every `--ci-*` custom property is defined in exactly one place — `.integrity-results` —
and the palette is light-surface only:**

```
--ci-sig-3:#00456f;  --ci-sig-2:#0068b3;  --ci-sig-1:#2b76ad;  --ci-sig-0:#5c6360;
--ci-clean:#185c3b;      --ci-clean-bg:#d9f2e5;
--ci-odd:#70400e;        --ci-odd-bg:#f8e5c7;
--ci-planted:#702d28;    --ci-planted-bg:#f6dcd9;
--ci-note:#505758;   --ci-line:#d9d0c5;   --ci-inset:#e9e2d8;
```

Dark navy, dark green and dark brown inks on pale mint, pale amber and pale pink grounds.

**There is no dark-context override anywhere in that file.** Searching it for `dark`,
`prefers-color-scheme`, `[data-theme]` or any dark container class returns nothing.

The result panel renders inside a **dark section**. So the new components paint a light palette
onto a dark ground: card titles, "Hidden characters", "Writing notes", "Maker's mark" and the
six check-card headings all render at or near zero contrast. **This is exactly what the owner
photographed** — badges legible, everything around them invisible.

**The fix**: define the `--ci-*` set for the dark context as well, scoped to whatever wrapper the
results panel sits inside, and check every pairing for contrast. Do not "fix" it by moving the
result panel onto a light ground without checking the rest of the page — the site alternates
light and dark by section as a house pattern.

Passing contrast would only make the existing clutter readable. It would not make the layout
simple, balanced, intuitive or accepted.

### 6.2 The page was not restructured until the very end, and only once

The mockups restructured the whole page. The implementation plan
([`IMPLEMENTATION-PLAN-2026-08-29.md`](.agent/docs/ai-content-integrity/ui-ux/IMPLEMENTATION-PLAN-2026-08-29.md))
split the work into steps 0–3, where step 3 was "rewrite the result block" and was called the
point of no return.

**Step 3 was implemented as the result block only.** Everything around it — hero, the 200-word
method paragraph, the sections below, the FAQ, two CTA blocks — shipped untouched for several
hours, during which the work was reported as progressing. The page restructure (`3169a6d6`)
happened only after the owner said it looked terrible.

The lesson: *"the result panel is rewritten"* was treated as *"the redesign shipped"*. They are
not the same thing, and one screenshot would have shown that immediately.

#### 6.2.1 The late restructure still did not reach the approved interaction model

The final restructure improved counts, but it remained a compromise around the existing page and
shared site chrome rather than a faithful implementation of the approved mockup. The owner did not
approve the compromise merely because it reduced words.

The remaining structural differences that matter are:

- The mockup put the paste-and-run journey first and treated explanation as progressive disclosure.
  The live page still presents route policy, cautions and configuration before the action.
- The mockup designed the result as one compact answer. The live page creates a tall dashboard-like
  rail with a repeated draft, multiple answer cards and a method-status grid.
- The mockup used whitespace to focus attention. The live result creates accidental whitespace: a
  largely empty left column caused by unequal two-column content heights.
- The mockup collapsed secondary evidence. The live result gives “nothing found” states nearly the
  same visual weight as the actual AI reading.
- The mockup kept related content together. The live page separates protected facts and result
  actions from the result by hundreds of pixels and a column boundary.
- The shared hero and marketing chrome were treated as immovable. That preserved Opace components
  at the cost of the owner's explicit requirement that the tool itself be immediate and simple.

The acceptance test is not “better than the old page”. It is “does this now feel dead simple,
obvious and calm to the owner and intended users?” The delivered page did not pass that test.

### 6.3 Verification was done by text search, not by looking

**Six separate false conclusions came from string searches during this task.** They are worth
listing because an incoming agent will hit the same traps in the same codebase:

1. A regex for `66.7` matched 54 phantom hits in minified JS, because `.` matches any character.
2. Unanchored searches for `95.1` and `877` matched coincidental digit runs, producing a
   confident report that the site was half-deployed when it was not.
3. `detectC2paTextCredentials` returned zero from a bundle that certainly contained it —
   **source identifiers are mangled by minification and are useless as deploy probes**. The
   same search returns zero for `previewSafeFixes` and `inspectUnicode`, which is how to prove
   the probe is invalid.
4. `C2PATXT` exists only inside a source *comment*; the real marker is the numeric literal
   `0x4332504154585400`.
5. Counting `segments-v2` against `segments-v3` in a bundle produced a **false production
   incident report**, because both strings legitimately coexist — one as the live constant, the
   other inside the text of the error that fires when they mismatch.
6. Sending `cache-control: no-cache` as an extra header **breaks the detector's token exchange**,
   so the page honestly reports it could not get a token and the tester concludes there is an
   outage.

**The rule that catches all six: prove the probe against a known-good target before trusting a
negative, and when a string search is ambiguous, run the behaviour instead.** Markers that
survive minification are string literals and numeric code points, not identifiers.

**And the rule this document exists to record: none of that tells you whether a page looks
good. Only looking does.**

### 6.4 Seven features were silently deleted, then restored

The first rebuild worked from the audit's *critique*, so anything the critique did not mention
had nothing flagging its removal. Deleted and later restored:

file upload (with its full accept list), three of four named examples, **the protected-content
check**, cancel, the Unicode fix preview, the JSON receipt and print, the `<noscript>` fallback.

The owner caught the first one himself. **The largest near-miss was not on that list**: the
implementation plan said the evidence rail's contents split three ways. They split four — the
`[data-fix-finding]` checkboxes are the only route into `previewSafeFixes`, so deleting the rail
as written would have deleted the safe-fix feature entirely.

**The lesson, recorded in the build notes as §S9: a keep list is not an inventory.** Enumerate
what the tool *can do*, from the running page, and check the redesign against that. A markup
diff cannot see runtime-only states — the model download gate, the rate-limit path,
`automation_blocked`, the 413.

### 6.5 Known and unfixed at the final review

- **The phone still costs 2.46 screens to the run button** against the mockup's 1.08. All of that
  gap is the shared Opace hero, which was trimmed rather than replaced because it is used
  site-wide.
- **The page does not respond to `prefers-color-scheme`.** Light and dark render identically;
  the site alternates by section instead. Recorded, not changed.
- **The floating "Free Proposal" bar sits on top of the paste box at 375 px.** It is a shared
  site-wide component. The 756 px owner screenshot also shows it covering disclosure text much
  lower on the page, so the defect is broader than the original mobile observation.
- **The evidence card's eyebrow labels are stale.** "SOURCE" now sits above "Three separate
  answers"; "SIGNALS" above "Never added up". The content was rewritten, the labels were not.
  "EVIDENCE SUMMARY" is still old language.
- **The 413 `too_long` branch is unproven** by scripted probe, because `automation_blocked` is
  evaluated first. Recorded as unproven rather than claimed.

That list was too narrow because it described implementation leftovers, not the owner's final
experience. The following are also known and unfixed from the screenshots:

- **The result layout is grossly unbalanced at intermediate width.** A very tall right rail sits
  beside an almost empty left column.
- **The result remains too long and too fragmented.** It is split across a headline card, graph,
  repeated draft, two axis cards, seven check cards, watermark card, protected-facts card and action
  row before the next content band.
- **Nested scrolling remains.** The original input and the repeated result copy each use their own
  scroll area inside a long scrolling page.
- **Empty and negative states are over-designed.** Checks that found nothing still generate a grid
  of cards, labels, badges and explanations.
- **Typography is too small and dense in the cards and lower disclosure band**, independently of
  the colour contrast defect.
- **Technical terms and validation statistics remain in the ordinary reading path**, particularly
  below the tool.
- **The relationship between AI signal, hidden characters, writing notes, method coverage,
  protected facts and watermark status is still not obvious at a glance.** Keeping the axes
  technically separate does not require presenting every implementation concept simultaneously.

### 6.6 The Opace look-and-feel question was closed without owner acceptance

The owner's instruction was that the redesign must look like current Opace, not a separate
product. The live-design report concluded that it already read as Opace because it reused the nav,
dark hero, cream band, orange button and closing components. That conclusion is incomplete and is
not owner acceptance.

Brand components alone do not settle look and feel. The owner explicitly reported that the
“CSS/styles [are] all off” and that the result looks worse. The final screenshots support concerns
about spacing, balance, density, typography, card hierarchy, dark/light transitions and fixed
marketing chrome. A replacement provider must compare the tool with accepted Opace pages and the
approved mockups visually, then ask whether it feels intentional as a whole. Counting reused
components is not a substitute.

### 6.7 Plain language was treated as vocabulary replacement rather than comprehension

The jargon count improved, but comprehension is still weak. A phrase can contain no specialist
word and still be hard to understand because the reader does not know why it is present or what to
do with it.

Examples from the delivered screenshots:

- “Three separate answers, and the place each one ran. A check that did not run is shown, and never
  counted as a pass.” is policy-shaped copy in an empty state, not useful guidance.
- The server/browser choice asks the user to understand hosting, retention, download size and
  performance before they have asked for advanced privacy control.
- “How good the AI check is” immediately introduces a corpus, fp32 runtime, two fractions and a
  long-form scope caveat.
- “The watermark check is narrow” leads into public demo keys and unavailable provider verifiers.
- “Six checks, and where each one ran” centres internal method coverage rather than the visitor's
  question: what did you find in my draft?

The owner asked for the simplest dummy explanation. The correct test is whether a non-technical
reader can explain the result back in one sentence and identify the next action. It is not whether
each individual sentence is technically defensible.

### 6.8 The interaction is still unintuitive

The interface makes the user understand its architecture before it gives them value:

1. Choose an input mode.
2. Read and compare two execution routes.
3. Interpret a privacy caution.
4. Decide whether to open two further control disclosures.
5. Run the draft.
6. Decode three answer types plus a method-status grid.
7. Scroll a repeated copy of the draft to understand section placement.
8. Find protected facts and actions outside the result rail.
9. Continue into reliability and watermark disclosures.

That is the opposite of the reference direction the owner preferred: paste, run, understand. The
advanced detail can still exist, but it should not define the default journey.

---

## 7. Constraints that must not be broken

These are product rules, not preferences. A design that violates one is wrong however good it
looks. All are enforced somewhere in code or tests.

1. **An AI score is never presented as proof of authorship.** Not in words, not in an icon, not
   by implication.
2. **The three axes stay separate.** `assertAxisIndependence` throws on contamination. Never
   merge them into one score.
3. **The writing signals are editorial feedback, never detection.** Measured at 45.1% detection
   with 24.8% false positives — worse than the model on both axes at once.
4. **The watermark check says nothing about Claude, Gemini or ChatGPT.** It runs real
   SynthID-Text mathematics under three *published Opace demo keys*. A score near 0.5 means
   "no signal under this key", which is also what unwatermarked AI text looks like.
5. **The verdict is the strongest section, not the average.** Averaging measured 57.8% against
   93.3% on the same documents.
6. **No number is hard-coded into any label.** Every figure renders through
   `src/lib/local-signals/measured-figures.ts`, which **fails the build** if a key is missing.
7. **Every figure carries its denominator and the runtime it was measured on**, and is tagged
   **long-form** — short marketing, SEO and social copy has no independent measurement, because
   every sample of those registers sits inside the training set.
8. **Weakness disclosures survive any redesign.** The worst case is published, not averaged away.

Current shipped figures, for reference: **883/922 (95.8%)** of AI long-form detected,
**45/4,636 (0.97%)** of human long-form wrongly flagged, on the fp32 EU server route. Human
fiction is the worst register. Do not quote a single headline rate — detection is identical
across the two routes while false positives differ, so any single number is wrong for one route.

---

## 8. Environment traps

- **`astro build` fails in place under Dropbox** on a post-build `rmdir` race, *after* all 697
  pages generate. `✓ Completed` prints before the error. Build to a directory outside Dropbox.
  Concurrent builds corrupt `dist/`.
- **`requestAnimationFrame` never fires in a hidden tab**, so an automated run appears to hang
  forever with no error. Foreground the tab.
- **The detector refuses scripted clients** with `automation_detected`; it needs a browser-like
  `User-Agent` and `Origin: https://opace.agency`.
- **A browser check can silently read a cached pre-deploy page.** Check `transferSize`.
- **Netlify builds fail silently when account credits are exhausted** — four pushes queued
  failures over an hour with nothing reporting it. Check the deploy state, not the push.
- Tests: 186 pass — 103 unit, 38 component, 45 live at four viewports. Run them.

---

## 9. What to do next, in order

1. **Do not begin from “fix the CSS”. Begin from the rejected interaction and information
   hierarchy in §2.1 and §6.0.** Reopen the approved `mockups/checker.html` beside both owner
   screenshots and decide the minimum default journey before touching components.
2. **Produce one revised static composition for the empty and result states** at 1440, 910/768 and
   375 before changing production code. It must explicitly solve the tall right rail, empty left
   column, repeated draft, method-card grid, detached facts/actions, route-choice burden, technical
   lower band and fixed-bar collisions.
3. **Get owner acceptance of those rendered compositions.** Word counts, automated checks and
   adherence to Opace tokens are supporting evidence; none substitutes for acceptance of the
   first impression.
4. **Then fix the dark-context CSS (§6.1) as a blocking accessibility repair**, whether or not the
   current result composition survives. Every foreground/background pair needs a measured contrast
   result in its real rendering context.
5. **Implement one state at a time**, beginning with empty → pasted → running → ordinary result,
   and screenshot both pages at 1440, 768 and exactly 375 before and after each material change.
   Before/after images from the last pass are in
   `.agent/docs/ai-content-integrity/ui-ux/screenshots/live-review/` — `before-checker-d1440-light-band02.png`
   is the worst frame of the original.
6. **Re-run the capability ledger from the running page** after each structural change. Preserve
   behaviour without presenting every capability at equal visual weight.
7. **Test all meaningful states**, not only the ordinary successful result: file upload, examples,
   too short, too long, rate limited, server unavailable, automation blocked, browser-model consent
   and download, planted characters, protected content, watermark signal, C2PA receipt, cancel,
   print and JSON receipt.
8. **Fix the stale eyebrow labels and every open item in §6.5**, then run the complete regression
   baseline.
9. **Acceptance requires visual proof and owner approval**, not merely passing tests or improved
   counts.

---

## 10. Everything else, linked

Programme root: `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/`

**Read first:** [`HANDOVER.md`](HANDOVER.md) — the authoritative product account.
[`REDESIGN.md`](REDESIGN.md) — the defect record carrying the reasoning behind the band-label fix.

**Design and implementation**, all in `.agent/docs/ai-content-integrity/ui-ux/`:
[`UX-AUDIT-LIVE`](.agent/docs/ai-content-integrity/ui-ux/UX-AUDIT-LIVE-2026-08-29.md) ·
[`PLAIN-LANGUAGE-AND-SCORING-SYSTEM`](.agent/docs/ai-content-integrity/ui-ux/PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md) ·
[`REFERENCE-TEARDOWN`](.agent/docs/ai-content-integrity/ui-ux/REFERENCE-TEARDOWN-2026-08-29.md) ·
[`REDESIGN-BUILD-NOTES`](.agent/docs/ai-content-integrity/ui-ux/REDESIGN-BUILD-NOTES-2026-08-29.md) ·
[`IMPLEMENTATION-PLAN`](.agent/docs/ai-content-integrity/ui-ux/IMPLEMENTATION-PLAN-2026-08-29.md) ·
[`IMPLEMENTATION-LOG`](.agent/docs/ai-content-integrity/ui-ux/IMPLEMENTATION-LOG-2026-08-29.md)
(§17–19 hold the probe artefacts) ·
[`LIVE-DESIGN-REVIEW-AND-PAGE-RESTRUCTURE`](.agent/docs/ai-content-integrity/ui-ux/LIVE-DESIGN-REVIEW-AND-PAGE-RESTRUCTURE-2026-08-29.md) ·
[`CHECKER-DEFECT-FIXES`](.agent/docs/ai-content-integrity/ui-ux/CHECKER-DEFECT-FIXES-2026-08-29.md) ·
[`FAQ-CONTENT-PACK`](.agent/docs/ai-content-integrity/ui-ux/FAQ-CONTENT-PACK-2026-08-29.md) ·
[`PROVIDER-STATUS-PANEL`](.agent/docs/ai-content-integrity/ui-ux/PROVIDER-STATUS-PANEL-2026-08-29.md) ·
[`WATERMARK-LAB-PLACEMENT`](.agent/docs/ai-content-integrity/ui-ux/WATERMARK-LAB-PLACEMENT-2026-08-29.md)

**Supporting evidence**, in `.agent/docs/ai-content-integrity/`:
[`CORPUS-RECONCILIATION`](.agent/docs/ai-content-integrity/CORPUS-RECONCILIATION-2026-08-29.md)
(where the shipped figures come from) ·
[`C2PA-TEXT-CREDENTIAL-CONFLICT`](../measurements/C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md)
(now in the repository, at `docs/measurements/`) ·
[`CLAIM-WORDING-CORRECTION-REGISTER`](.agent/docs/ai-content-integrity/CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md) ·
[`PARAPHRASE-RESILIENCE-MEASUREMENT`](.agent/docs/ai-content-integrity/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md) ·
[`DEFERRED-DECISIONS-FOR-OWNER`](.agent/docs/ai-content-integrity/DEFERRED-DECISIONS-FOR-OWNER-2026-08-29.md)

**Source files that matter most:**

- `opace-website/astro-latest/src/styles/content-integrity-signal-scale.css` — **the defect in §6.1**
- `opace-website/astro-latest/src/pages/tools/ai/content-verification-integrity/checker.astro`
- `opace-website/astro-latest/src/components/tools/content-integrity/` — the `ci-*` modules
- `opace-website/astro-latest/src/lib/local-signals/measured-figures.ts` — every published figure
- `opace-website/astro-latest/public/models/local-signals-v1/thresholds.json` — calibration

---

## 11. The honest summary

The research was good and is reusable. The design was good, the owner approved it, and the
mockups are further ahead than what is on the site. The measurements after the restructure are
genuine improvements, but they do **not** mean the four complaints were resolved. Fewer words and
containers can still produce a cluttered, busy and unintuitive page when hierarchy, composition,
grouping and the default interaction remain wrong.

**But the work was reported as progressing for hours on the strength of text searches and
measured word counts, while the page it was describing was visually broken and structurally
unchanged.** The owner found both by opening it.

The final screenshots then showed a broader failure: a configuration-heavy empty state; a tall,
narrow and visually broken results rail; a huge unused column; repeated and nested content;
prominent “nothing found” method cards; detached facts and actions; dense technical disclosures;
and marketing chrome obscuring the page. Correcting the `--ci-*` palette would make that interface
legible, but would not make it good.

The work needed three disciplines it did not receive:

1. **Treat the owner's first impression as an acceptance criterion**, not an opinion to be
   outweighed by improved metrics.
2. **Compare the rendered implementation with the approved mockups at every meaningful state and
   viewport**, rather than validating structure through strings and counts.
3. **Judge the whole journey — hierarchy, balance, comprehension and next action — not isolated
   components.**

The current redesign is rejected. It should be handed over as a useful body of research, copy,
tests and prototypes attached to an unaccepted implementation, not as an almost-finished redesign
with one CSS defect.

---

## 12. Requirement-to-outcome traceability

This is the minimum checklist a new provider should use to avoid inheriting optimistic descriptions
from earlier reports.

| Original requirement or concern | Proposed answer | What actually shipped | Evidence | Status |
|---|---|---|---|---|
| Dead simple, even for a school student | Immediate paste/run; Signal Scale; one-sentence explanation; advanced detail behind disclosure | Shorter input card, but route policy, cautions, disclosures and technical lower-page copy remain | §6.0 empty-state screenshot | **Not accepted** |
| Too busy | Reduce visible containers and remove competing colour families | Empty state reduced from 11 containers to 4, but successful result expands into many cards, badges and states | §5.2 counts; §6.0 result screenshot | **Not resolved** |
| Too much text above the tool | Tool in first screen; 86-word mockup path | Reduced from 1,084 to 274 words; run button still 2.46 phone screens down | §4.3 and §5.2 | **Improved, not accepted** |
| Too much happening lower down | One compact result; disclosures for method; delete duplicate band | Duplicate marketing band removed, but result rail, repeated draft, method grid, facts/actions and technical disclosure remain | §6.0 result screenshot | **Not resolved** |
| Explain “flagging xyz because abc” in layman's terms | Signal level, section bars and one honest summary; never pretend individual sentences prove authorship | Section bars and simpler labels exist, but the page still foregrounds internal checks and does not deliver one immediately obvious explanation | §4.1, §4.2, §6.7 | **Partial** |
| Own simple, catchy scoring and visual language | Signal Scale and consistent icons | Signal Scale shipped | §4.1 and commit `938edc02` | **Implemented, presentation unaccepted** |
| Powerful but simple | Preserve capabilities behind progressive disclosure | Capabilities were initially deleted, then restored; many now surface as equal-weight cards or controls | §6.4 and §6.8 | **Functionally preserved, visually unresolved** |
| Current Opace look and feel | Use real Opace tokens/components without losing mockup simplicity | Opace components reused, but owner rejected CSS/styles, balance and overall feel | §6.0 and §6.6 | **Not accepted** |
| Mobile and responsive | First action near top; no obstruction; large targets | No horizontal overflow, but run button still 2.46 screens down and fixed proposal UI obscures content | §5.2, §6.0, §6.5 | **Not resolved** |
| Clear result hierarchy | AI signal first; three axes separate but coherent; method detail secondary | Three axes remain separate, but result becomes a tall narrow dashboard and method-status grid | §6.0 and §6.2.1 | **Not resolved** |
| Do not lose existing functionality | Capability ledger and state-by-state regression | Seven capabilities disappeared and were restored; runtime-only states remain a known risk | §6.4 | **Restored, must be re-proven after redesign** |
| Evidence-led quality | Rendered browser checks at desktop/tablet/mobile after each change | Searches and counts drove conclusions; owner found the visual failure by opening the page | §6.3 | **Process failed** |
| Document the complete task for an outside provider | One self-contained failure record with links to deep evidence | This revision adds the missing owner screenshots, complete concern interpretation, history, traceability and acceptance boundary | This document | **Documented; implementation still rejected** |

---

## 13. Visual evidence inventory

### 13.1 Original live-page evidence used by the audit

These files are the numbered `[S1]`–`[S8]` evidence referenced by
[`UX-AUDIT-LIVE`](.agent/docs/ai-content-integrity/ui-ux/UX-AUDIT-LIVE-2026-08-29.md):

| Evidence | File | What it records |
|---|---|---|
| S1 | [`screenshots/01-checker-desktop-fullpage.jpeg`](.agent/docs/ai-content-integrity/ui-ux/screenshots/01-checker-desktop-fullpage.jpeg) | Original whole checker and page length |
| S2 | [`screenshots/02-checker-input-card-desktop.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/02-checker-input-card-desktop.png) | Original dense input card and explanatory empty panel |
| S3 | [`screenshots/03-checker-result-top-desktop.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/03-checker-result-top-desktop.png) | Original result headline and technical density |
| S4 | [`screenshots/04-checker-highlights-legend.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/04-checker-highlights-legend.png) | Confusing mixed highlight/evidence/protected-content panel |
| S5 | [`screenshots/05-checker-918-likely-human-green.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/05-checker-918-likely-human-green.png) | Historical contradictory green “Likely human” state |
| S6 | [`screenshots/06-checker-mobile-375-input.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/06-checker-mobile-375-input.png) | Original 375 px depth, small controls and fixed marketing obstruction |
| S7 | [`screenshots/07-lab-wrong-key-stats.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/07-lab-wrong-key-stats.png) | Lab's strongest experiment buried in technical metrics |
| S8 | [`screenshots/08-checker-server-route-587-leaning-ai.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/08-checker-server-route-587-leaning-ai.png) | Corrected band wording and server/browser disagreement evidence |

### 13.2 Approved/reference direction

- [`mockups/checker.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/checker.html) — approved
  six-state checker direction.
- [`mockups/watermark-lab.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/watermark-lab.html) —
  Lab direction centred on the wrong-key experiment.
- [`mockups/system.html`](.agent/docs/ai-content-integrity/ui-ux/mockups/system.html) — tokens,
  icons, contrast and claim classes.
- [`screenshots/reference/unmark-01-desktop-viewport.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/reference/unmark-01-desktop-viewport.png)
  and [`unmark-03-mobile-above-fold.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/reference/unmark-03-mobile-above-fold.png)
  — the closest supplied interaction reference: immediate, sparse and obvious.

### 13.3 After-restructure evidence

The full before/after matrix is under
[`screenshots/live-review/`](.agent/docs/ai-content-integrity/ui-ux/screenshots/live-review/).
It contains first-paint and result captures at desktop, tablet and 375 px. These prove numeric
improvement, but not owner acceptance.

### 13.4 Final owner-rejection evidence

- [`01-empty-state-910x1222.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/owner-rejection-2026-08-30/01-empty-state-910x1222.png)
  — SHA-256 `449cfb982fbdefd6e06c884e372cc3cbeeaf5d076c6cf356dba72549c2b6fd7f`.
- [`02-result-state-756x1804.png`](.agent/docs/ai-content-integrity/ui-ux/screenshots/owner-rejection-2026-08-30/02-result-state-756x1804.png)
  — SHA-256 `b71981ee84ab7986c4e3b8386ec03b3402bc7c9a8a3534abd8d96fba6fd6b30e`.

These two images are the final authority on why the delivered redesign was rejected.

---

## 14. Definition of done for the replacement redesign

The task is not done when the CSS is fixed or the test suite passes. It is done only when all of
the following are true:

1. The owner accepts the empty, pasted, running, ordinary-result, flagged-result and failure-state
   compositions from rendered screenshots.
2. Paste and primary action are immediate; a visitor does not need to study route or method detail
   to begin.
3. The result gives one clear first answer, keeps the three axes separate and makes every secondary
   check genuinely secondary.
4. No repeated full draft, accidental empty column, tall method rail or unnecessary nested scroll
   area remains.
5. The meaning and next action can be explained by a school-age reader without specialist terms.
6. Every retained statistic, privacy detail, method receipt and weakness disclosure is reachable
   through plainly named progressive disclosure without dominating the journey.
7. The tool feels recognisably Opace through deliberate typography, spacing, colour, controls and
   tone, not merely because shared site components surround it.
8. Fixed marketing elements obscure no tool or disclosure content at any tested width.
9. All meaningful states pass contrast, keyboard, screen-reader, touch-target, overflow and focus
   checks at 1440, 768 and exactly 375 px, with additional checks at the two owner-evidence widths
   of 910 and 756 px.
10. The complete capability ledger and automated regression baseline pass after the final visual
    change.
11. The owner records acceptance. Without that, report the work as improved or awaiting review,
    never complete.

---

## 15. Interim live repair, 30 August 2026

The owner authorised a rapid live repair because the published checker looked broken. The bounded
release does not replace this failure record or claim that the redesign is accepted. It applies
the simplest structural improvements while the replacement mockup is being developed:

- compact copy-only hero rather than the 790 px hero/evidence pair;
- one full-width input and result journey, with no empty result card;
- light, readable result surface and no accidental desktop right rail;
- repeated draft hidden until a scored section is chosen;
- reliability, six-check and watermark detail behind plainly named disclosures;
- shorter route choices and one combined privacy/advanced disclosure;
- accuracy and watermark limits collapsed below the always-visible no-authorship warning;
- repeated promotional bands and the floating proposal bar removed from this tool journey.
- the scale marker retained, while vague `Some signal` wording is replaced by clear pattern-match levels;
- an always-visible compact summary shows the six default checks without exposing six switches in the main flow;
- `Maker's mark` is replaced by `Known watermark check`, with its limit stated in plain English and raw data behind a disclosure;
- the original draft opens only after a section is selected, then tints every independently scored section and outlines the selected one.

Local rendered verification passed at 1440, 768 and exactly 375 px, including empty and completed
states, keyboard flow, overflow and minimum target checks. Website code commit `2a5e7076` is live.
A fresh production run returned two scored sections, showed the new pattern-match language, tinted
both passages, outlined the selected passage and produced no browser errors or horizontal overflow;
the exact 375 px production checks passed 6/6. The detector logic, thresholds, named methods,
privacy routes, evidence records and receipts were not changed. Owner retest is still required, so
every status in §12 remains owner-rejected or awaiting review until the owner explicitly changes it.

---

## 16. Independent mockup comparison and reconciled direction, 30 August 2026

After the interim repair went live, the owner supplied three comparable live captures, four new
candidate compositions and three independent written assessments. The evidence is preserved
verbatim under
[`independent-review-2026-08-30/`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/README.md)
so a later provider does not have to reconstruct this decision from chat history or files in a
Downloads folder.

### 16.1 What the new live captures establish

The interim repair is a real functional and legibility improvement over the broken owner-rejection
frame: the tall right rail and accidental empty column are gone, the result is readable, secondary
detail is collapsed by default, the proposal obstruction is removed and the original draft appears
only when a scored section is selected. It is still not the replacement redesign.

The side-by-side live captures show that the later v0.2 refinement is mostly wording and disclosure
work applied to the same composition. The default six-check summary adds another visible row before
the action. When `What was checked?` is opened, the result still expands into a method-card grid and
a negative watermark card. The important workbench remains a narrow strip inside a very wide page;
type is small; the answer, section graphic, method details and actions compete; and a negative result
still produces a large amount of interface. The v0.2 expanded capture is 7,582 px tall against 7,531
px for the comparable v0.1 expanded capture. The increase is small, but it proves that changing the
labels did not solve the page-length complaint.

### 16.2 The four candidate compositions

#### Mockup 4 — best immediate public-checker foundation

[`content-detector-mockup4.png`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/content-detector-mockup4.png)
creates the clearest desktop relationship: `Your draft` beside `Your result`. The primary
pattern-match answer dominates, the marker gives its position on a named scale, and scored sections
are visible in the original text rather than in a second copy. Text integrity and writing notes stay
separate and secondary. Its lower evidence rows give science a home without placing it in the first
reading path.

Retain that architecture, but do not copy it unchanged. Remove the raw `0.9912` from the default
view, avoid presenting a scale with more precision than the model supports, eliminate any duplicate
section-location control, prove mobile and failure states, and translate the generic SaaS header and
blue palette into the accepted Opace site language.

#### Mockup 1 — best restraint and responsive blueprint

[`content-detector-mockup1.png`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/content-detector-mockup1.png)
is the strongest evidence that the journey can remain simple at desktop, 756 px and 375 px. It has
one answer, two concise secondary outcomes, plainly named disclosures and an obvious next action.
Its weakness is authority: the visible experience under-represents provenance, watermark research,
the six checks and the measured science, and `Some AI signal` is weaker than the later pattern-match
vocabulary. Reuse its state change, mobile behaviour and ruthless editing, not its thin evidence
layer or exact visual treatment.

#### Mockup 2 — strongest expanded editorial evidence, but too repetitive by default

[`content-detector-mockup2.png`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/content-detector-mockup2.png)
has excellent result hierarchy, a useful proportional section map and the clearest complete
analysed-document view. It also names the six credibility areas well. Its separate `Your draft —
analysed` block repeats content already present above and recreates the long-page problem. Treat the
expanded analysed document as an optional advanced/editorial view, or annotate the original as in
mockup 4; do not put a second full draft in the default result.

#### Mockup 3 — not wrong; it describes the larger product

[`content-detector-mockup3.png`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/content-detector-mockup3.png)
was created from independent competitive research rather than from the existing implementation. That
independence is valuable. It found opportunities the incremental redesigns were unlikely to invent:
text, URL, whole-site and media workflows; Summary/Evidence/Technical tabs; a recommended action;
review status; history and export; audit trails; source/citation checks; and the correct separation
of provenance, watermark, synthetic-media and metadata findings. Its website-scan summary is the
strongest agency/SEO-oriented concept in the set.

It ranks lower only when the scoring question is `what should replace the public free checker now?`.
The persistent application sidebar, four starting modes, history, reports and review workflows make
the visitor perceive an enterprise platform before completing the simple paste task. Several shown
capabilities do not exist in the current public checker and cannot be implied by a redesign. It also
lacks proven mobile states and its generic navy application shell would feel separate from the Opace
site if copied literally.

For the question `what could Opace AI Content Integrity become?`, mockup 3 is arguably the strongest
strategic concept. Use its information architecture now — especially Summary/Evidence/Technical,
`what this means / does not mean`, and the recommended action — while reserving the sidebar,
history, site scanning, media workspace and review workflow for a future authenticated product once
those capabilities genuinely exist. The public checker should be the simple entry point into that
larger system, not a miniature dashboard pretending the whole system already exists.

### 16.3 What the three independent assessments agree on

The raw assessments are
[`assessment-1.txt`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/assessment-1.txt),
[`assessment-2.txt`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/assessment-2.txt)
and
[`assessment-3.txt`](.agent/docs/ai-content-integrity/ui-ux/independent-review-2026-08-30/assessment-3.txt).

| Reviewer | Live score | Mockup order | Important qualification |
|---|---:|---|---|
| Assessment 1 | 7.7/10 | 4, 2, 3, 1, live | Mockup 3 is the future logged-in product; mockup 4 is the free checker. |
| Assessment 2 | 7.8/10 | 4, 2, live, 1, 3 | Mockup 3 is polished but too much platform for this particular page. |
| Assessment 3 | 7.0/10 | 4, 2, 3, 1, live | Mockup 3 scores about 9.3/10 as the complete product vision. |
| Reconciled owner-brief review | 3.8/10 | 4, 1, 2, 3, live | Scores the rendered interaction against the rejected brief, not the underlying engineering or market average. |

The diagnoses are much closer than the numbers suggest. All four reviews say the live tool is too
narrow, dense, small-typed and difficult to interpret; that its result is disconnected from the
source passage; that raw detector output competes with the answer; and that the six-check expansion
is useful but visually busy. All favour mockup 4's linked draft/result interaction. All identify
mockup 1's restraint and responsive work, mockup 2's analysed-document depth and mockup 3's platform
vision as useful contributions.

### 16.4 Why the independent reviews score the live version much higher

The difference is primarily the scoring object, not a disagreement about the defects:

1. **They blend product substance with interface quality.** The live tool deserves substantial
   credit for real checks, conservative claims, route-specific privacy, receipts, measured figures,
   research and Opace integration. Those make the product credible; they do not make the default
   interaction simple.
2. **They use a market-relative scale.** A functioning, branded detector with genuine science can
   look like a 7/10 product beside weak commercial detectors. The owner's acceptance criterion is
   not `better than an average detector`; it is `dead simple, powerful, intuitive and masterpiece
   quality`.
3. **They anchor on an earlier 8.0 or 8.2 score.** Each says the live page was initially scored too
   generously, but the revisions remain close to that anchor. The side-by-side evidence changes the
   written diagnosis more than it changes the number.
4. **A finished live page receives completion credit.** Working interactions, real branding and a
   footer make it feel more credible than a static composition. Production completeness is a
   separate gate from visual acceptance.
5. **They treat the science already being present as evidence-UX success.** This review separates
   `the evidence exists` from `the evidence is introduced at the right depth`. The live page has the
   strongest substance and weak communication of that substance.

On an engineering-and-substance scale the live tool is around 7.5–8.5/10. On the design brief the
rendered experience remains around 3.8/10. Combining those two unlike questions produces the
7.0–7.8 scores in the independent reviews. For replacement-design acceptance, §14 remains the
binding scale.

### 16.5 Credibility without clutter: the required evidence architecture

The owner explicitly requires enough science, research and measured evidence for a general visitor
or advanced reviewer to trust the tool. This does not reverse the simplicity requirement. It means
the page needs progressive depth rather than either extreme: hiding all substance, or dumping the
whole methodology into the result.

The useful lesson from Originality.ai's
[`SynthID-Text Interactive Tool`](https://originality.ai/blog/synthid-watermarking-tool) is separation:
the interactive tool comes first, followed by a ten-second explanation, key limitations, the deep
technical guide and formal references. Opace should preserve that order but replace the long text
dump with a visual, navigable evidence layer.

**Layer 1 — Answer, above the fold**

- pattern-match level and one plain sentence explaining it;
- the scale marker and a compact section map;
- linked shading of whole model-scored sections in the original draft;
- separate text-integrity and writing-note outcomes;
- one recommended next action;
- one short no-authorship boundary.

No threshold, raw probability, runtime name, corpus paragraph, method-card grid or watermark table
belongs in this layer.

**Layer 2 — Evidence for this run**

- `Why did I get this result?` — section scores, the deciding rule and raw values on request;
- `What was checked?` — one compact list/table of all checks, where they ran and what they found;
- `Watermarks, provenance and hidden text` — keep distinct evidence types distinct;
- `What this result can and cannot prove` — a plain two-column boundary;
- privacy/transport record and downloadable receipt;
- `Technical details` for exact versions and reproducibility.

Tabs or accordions are appropriate. Tooltips are for short definitions only; a material limitation
must not exist solely in a tooltip, which is easy to miss and difficult on touch and assistive
technology.

**Layer 3 — Research and validation, below the tool**

- a three-step visual of how the model splits, reads and combines sections;
- a validation snapshot with denominators, corpus, route/runtime and long-form scope attached;
- AI detected and human wrongly flagged shown together, never as one decontextualised headline rate;
- the worst measured register and the unmeasured short-copy gap, visibly rather than in small print;
- a comparison of what AI patterns, hidden characters, Content Credentials and demo-key watermarks
  can and cannot establish;
- privacy architecture for the EU and on-device routes;
- research lineage and references, model/version record, change log and downloadable methodology.

This layer should use diagrams, paired bars, compact tables and a clear research index. It must not
be another uninterrupted article. General users can stop after Layer 1; advanced users can audit
the result in Layer 2 and the product in Layer 3.

### 16.6 Reconciled design direction

The next composition should combine, not choose blindly:

- the **live site's Opace identity** and real product substance;
- **mockup 4's** desktop workbench, linked source/result relationship and pattern scale;
- **mockup 1's** empty/result state change, mobile layout and editorial restraint;
- **mockup 2's** section map and optional expanded analysed-document view;
- **mockup 3's** Summary/Evidence/Technical architecture, recommended action and future platform
  roadmap;
- the three-layer credibility structure in §16.5.

The signature interaction is: **answer → where it appears → why → scientific evidence**. Selecting
a section on the scale or in the result must identify the same whole scored section in the original
draft. It must never pretend the model scored an individual sentence when it scored a section.

Non-negotiable edits before this becomes an implementation target:

- no raw probability in the default answer and no `percentage AI` language;
- no duplicate full draft in the default result;
- no six equal-weight method cards for an ordinary clean run;
- no generic application sidebar on the public checker;
- no route or check configuration required before the first run;
- no important limit hidden only in a tooltip;
- no unbuilt URL, site, media or audit capability implied by the public interface;
- every measured figure keeps its denominator, corpus, operating point, runtime and scope;
- every meaningful state is composed at 1440, 768 and exactly 375 px before production code changes.

### 16.7 Next decision gate

Do not make another live structural change from these screenshots alone. Produce a revised static
composition containing:

1. empty, pasted, running, ordinary result, flagged result and failure states;
2. the linked source/result interaction from mockup 4;
3. the exact 375 px solution demonstrated in the spirit of mockup 1;
4. the run-evidence controls and below-fold science layer in §16.5;
5. a separate future-product map showing which mockup 3 capabilities belong later and which are
   already real.

Owner acceptance of those rendered compositions is required before implementation. Automated tests,
brand-token reuse and the fact that a design agent produced the mockup remain supporting evidence,
not acceptance.

## 17. Full-width workbench implementation and corrected release gate — 30 August 2026

The owner subsequently authorised implementation and live deployment, explicitly asking for a
full-width tool aligned with the Opace header, specialist visual judgement, cross-reference to all
mockups and comments, and visual verification before any completion claim. That instruction
supersedes §16.7's hold on implementation. It does **not** supersede the owner-acceptance gate or
turn a local build into a 9.5/10 result.

### 17.1 Implemented direction

The website branch `feature/content-integrity-workbench-redesign` now implements the reconciled
direction from §16.6:

- the checker uses the Opace header's 1,400px inner width rather than the rejected 1,040px strip;
- empty/pasted state is one full-width input, while a completed desktop run becomes a linked
  source/result workbench and tablet/mobile show the answer first;
- the EU/on-device choice and six check switches no longer obstruct the first run;
- the result leads with one pattern-match label, marker and proportional section map, followed by
  separate text-integrity and writing-note outcomes;
- the original text is divided into the exact whole sections the model scored. Section-map and
  source selections are linked and keyboard-operable; sentence-level scoring is never implied;
- long source text is collapsed behind `Show full draft`, including on 375px, instead of expanding
  for thousands of pixels or creating another nested scroll region;
- raw probability, thresholds, runtime and reproduction data remain behind `Why this result?`;
- the six methods are one compact disclosure, with not-run/unsupported methods visible and never
  counted as passes;
- a visual science layer below the tool explains the three-step model flow, shows AI detection and
  human false positives together, publishes the weakest register and unmeasured short-copy gap, and
  separates AI-pattern, hidden-text, Content Credential and demo-watermark evidence;
- the paired validation bars read the source-of-record measurements. The 0.97% human false-positive
  bar is drawn at 0.97%, not enlarged for appearance;
- mockup 3's unbuilt URL/site/media/history/audit product features remain a future roadmap and are
  not implied by the public checker.

The durable website implementation record is
[`CONTENT-INTEGRITY-WORKBENCH-REDESIGN-2026-08-30.md`](../../opace-website/astro-latest/.agent/docs/opace/CONTENT-INTEGRITY-WORKBENCH-REDESIGN-2026-08-30.md).

### 17.2 Independent review defects found and corrected

Two independent review passes were run against the implementation and rendered local screenshots.
They found release blockers that source tests alone had not exposed:

1. A long draft whose EU request was refused was headed `Not enough text to read`, then given a
   reassuring `No urgent action` recommendation even though the AI classifier had not run.
   Failure, too-short and switched-off states are now distinct; no AI recommendation appears unless
   a real score exists.
2. The desktop result and source both had their own scroll containers, recreating the nested-scroll
   problem in the original rejection. The result now uses normal page flow and long source text uses
   an explicit expand/collapse action.
3. Result focus could land beneath the fixed Opace header. Focus now uses `preventScroll`, followed by
   one header-offset scroll target.
4. The default 375px result expanded the entire long draft. A 600–1,000-word source is now bounded to
   a readable preview with `Show full draft`; a scored-section selection expands only when required.
5. The failure fallback repeated the same explanation in several paragraphs. It now says the EU
   check did not run, offers one on-device recovery button and places the diagnostic reason behind
   `Why did this happen?`.
6. Mobile control sizes missed the written gate: the editor was 230px, the route action 38px and edit
   action 42px. They are now at least 240px/44px.

### 17.3 Verified local state and remaining honest gap

Local verification after those corrections reports:

- unit 103/103;
- component 39/39;
- live responsive 46/46 across desktop, tablet, 375×812 and 200% reflow;
- 697-page production build complete;
- 1,360px checker width at 1,440px, no page overflow, mobile long-draft collapse and truthful
  validation-bar width asserted directly.

Local captures are preserved in the website evidence record and prove the empty and server-refusal
states. Website commit `b0bb1cc1` was then deployed through `main` and verified on the production
origin. The mixed sample produced a real `Faint pattern match` across two sections; the raw-AI sample
produced a real `Strong pattern match` across two sections. Both were captured at 1,440, 910, 768,
756 and a fresh 375px load, with no console errors or horizontal overflow. Selecting section 0 in
the strip activated source section 0, and selecting source section 1 activated strip section 1.
The production regression then passed 50/50 across desktop, tablet, 375×812 and 200% reflow.

This closes the technical, deployment and scored-visual gates. It does not grant the owner-acceptance
gate. Calling the redesign 9.5/10 before the owner reviews the comparable captures would repeat the
central process failure documented in this file.

## 18. Close-detail review: the workbench was improved, but not yet premium

After the full-width release, the owner supplied two close crops rather than accepting the distant
full-page captures. They exposed defects that the earlier whole-page review had understated:

- the EU-route failure still presented several versions of the same explanation, mixed internal
  browser/server language into the customer answer and gave a large technical warning more visual
  weight than the recovery action;
- the pre-run route, privacy disclosure and authorship reminder appeared as separate thin rows with
  inconsistent padding and weak alignment;
- ordinary result rows still exposed raw engine prose and the grammatically broken phrase
  `1 phrases across 1 kinds`;
- the open settings state expanded to about 2,376px on a 375px screen because method and privacy
  explanations were printed as an article inside the form.

This confirms an important acceptance lesson: a full-page screenshot can make cramped typography,
weak micro-hierarchy and repetitive copy look insignificant. Premium-tool acceptance must include
close crops of every compact, expanded, failure and recovery state.

### 18.1 Corrected component direction

The next website branch changes the affected components as a system:

1. The EU route and six-check summary become one designed privacy surface with a proper icon,
   storage statement and `Review settings` action.
2. Settings show route choices and check switches first. Privacy and method explanations are nested
   disclosures, reducing the mobile open state to about 830px without removing information.
3. A failed AI check says only that the draft was not scored, then offers one on-device action.
   The service reason is available under `Technical details` and never leads the answer.
4. `Text integrity` replaces the narrower `Hidden characters` label. Raw character detail is closed
   by default.
5. Writing notes use correct singular/plural language, a neutral status, one short explanation and
   a direct review action. Their evidence boundary is available on demand.
6. The detached pre-run authorship disclaimer is removed. That limit remains where it is useful:
   beside the result and in the evidence layer.

Local verification reports unit 103/103, component 40/40, responsive 50/50 across desktop, tablet,
375x812 and 200% reflow, a 697-page production build and no horizontal overflow. Close visual
evidence is stored in the website record under
`.agent/docs/opace/evidence/content-integrity-premium-polish-2026-08-30/`. Deployment and owner
acceptance remain separate gates until recorded below.

### 18.2 Second close review: padding did not fix the hierarchy

The owner then reviewed the replacement captures and correctly reported that the composition still
felt crammed and busy. This was not a request for more padding around the same controls. The causes
were structural:

- the expanded settings surface still contained too many equally weighted horizontal rules,
  headings, badges and disclosures;
- six checks still read as six independent controls rather than one optional configuration;
- desktop spacing had been increased locally, while mobile still became a roughly 1,001px settings
  form;
- the failure result still contained a result heading, service status, recovery card, technical
  disclosure, two finding rows and another method disclosure with insufficient hierarchy between
  them;
- the previous distant full-page evidence again made these close-detail defects look smaller than
  they were.

The corrective direction is reduction, not decoration. The second pass therefore removes run-time
pills and the empty AI-pattern furniture from a withheld result; changes the recovery card to one
flat action band; removes redundant clean-state technical detail; shortens writing-note copy to
`1 note`; and turns the six check choices into one low-chrome divider list with short, lay labels.
Desktop uses three columns and mobile two, reducing the measured 375px open-settings state from
about 1,001px to 765px without hiding route, privacy or method controls. The desktop state is 608px
high and neither viewport overflows horizontally.

This correction passed unit 103/103, component 40/40, local responsive 50/50 and the 697-page
production build. Website commit `b01a1e0f` was fast-forwarded to `main`, verified in fresh
production HTML and then passed the production responsive suite 50/50. A fresh headless run received
the intended automation refusal and rendered the simplified recovery state. The deployed scored UI
was separately exercised at 1,440px and 375px with the real controller and a deterministic,
contract-valid response fixture; it rendered `Strong pattern match` with no overflow. That proves
the presentation path, not detector accuracy; the prior real scored production runs remain the
accuracy smoke evidence. Close captures are stored under
`.agent/docs/opace/evidence/content-integrity-breathing-room-2026-08-30/` in the website repository.
The implementation is live but remains a candidate until the owner accepts the visual result. A
green suite proves behaviour; it does not make the spacing premium by declaration.

## 19. Seven close-detail failures: the composition was still the old tool

The owner rejected the deployed candidate again after supplying seven production crops. Their point was not that another 8px of padding was missing. The same diagnostic composition remained beneath the new styling, and several defects should have blocked release:

- the checker breadcrumb was white while the Tools system is dark;
- disclosure plus/minus marks disappeared against their circles;
- the desktop result remained sticky and physically covered the facts/export action row;
- the primary result repeated one judgement across headline, scale, a second threshold diagram, `strongest of N sections`, a warning and a quiet recommendation;
- settings title, count and action fell into unrelated rows;
- `Review settings` opened the disclosure but could not close it;
- close crops still looked thin, misaligned and mechanically assembled despite distant full-page captures appearing cleaner.

This proves the central failure one more time: spacing changes cannot rescue the wrong information architecture. Acceptance must inspect the close, interactive states in addition to a full-page image.

### 19.1 Corrected direction and implementation

The feature branch `feature/content-integrity-composition-correction` applies the mockups as a composition brief:

1. Mockup 4 supplies the desktop workbench: analysed source and answer share a top edge and remain in normal flow. The lower evidence/actions row follows the taller panel and cannot be overlaid.
2. Mockup 1 supplies restraint and mobile order: answer first, source second, technical depth later.
3. Mockup 2 supplies one proportional section ribbon. The previous dashed mini-chart is removed.
4. Mockup 3 supplies progressive depth only: summary first, evidence and technical detail on demand.

The first reading path is now one named answer, one sentence, a marker on four labelled bands (`No clear`, `Light`, `Moderate`, `Strong`), one linked section ribbon, one authorship limit and two compact secondary outcomes. Raw probabilities and thresholds remain under `Why this result?`. The default quiet recommendation and `strongest of N sections` sentence are removed. A recommendation is shown only after a real flagged AI-pattern result.

The standard dark breadcrumb is restored. `Review settings` is a real two-way toggle with `aria-expanded` and synchronised labels. Disclosure controls use a high-contrast icon. Whole scored sections remain linked both ways between ribbon and draft; no sentence is falsely presented as independently scored.

### 19.2 Evidence and gate

A real on-device run of the shipped model rendered a `Moderate pattern match` at 1,440 and 375px. Normal-flow layout was also measured at 910 and 756px. There was no horizontal overflow and the result did not intersect the following evidence/actions row. Empty, settings, withheld, scored and mobile captures are stored at `opace-website/astro-latest/.agent/docs/opace/content-integrity-composition-correction/`.

Local verification: unit 103/103, component 40/40, responsive 50/50, 697-page build with 14,070 image references optimised, `git diff --check` clean and repository check passed.

### 19.3 Production state

Website commit `62865eeb` was pushed to `feature/content-integrity-composition-correction`, fast-forwarded to `main` and verified as the exact `origin/main` commit. Fresh production HTML returned the new `Checks and privacy` / `6 on` controls, proving the composition was live rather than merely queued. The production responsive suite passed 50/50 across desktop, tablet, 375×812 and 200% reflow.

Deployment is complete. None of this grants the owner-acceptance gate or a 9.5/10 score; those remain open until the owner reviews the live empty, scored, failure, expanded-settings and mobile states.

---

## 20. The verdict still refuses to say what it found — owner review, 30 August 2026

Nineteen sections of this document are about layout, hierarchy and polish. This one is not.
The composition work landed and the page reads better. **The words in the verdict are still
wrong**, and no amount of further layout work fixes them.

### 20.1 The owner's words, verbatim

> "My concern is that I've tested it many times and I'm sick of the constant fluffy answers
> like image 2 — this kind of answer/description means little to me and nothing to the average
> user. I want to see something like **'Likely human'** or **'Likely human but AI edited'** or
> **'Likely AI but human edited'**. Every single test I've done so far has reported fluffy
> language that isnt helpful or understandable."

And on the AI-drafted eCommerce article, which scored 0.9892 and rendered *Strong pattern match*:

> "images 3 and 4 are still rubbish as far as I'm concerned. The **'strong pattern match'** and
> visual result doesnt convey what this means e.g. **'Likely AI'**. Why this result is jibberish
> to the average user. **Checks included** basically reveals only one signal flagged the content
> and doesnt explain how i.e. gives no refferencable reasons or examples."

### 20.2 The two live tests behind those comments

| Draft | Score | Rendered | Correct? |
|---|---|---|---|
| Human-written, AI-assisted white paper (SEO 2.0) | **0.3427** | "No clear pattern match" | score right, label evasive |
| AI-drafted eCommerce cost article | **0.9892** | "Strong pattern match" | score right, label evasive |

**Both scores are correct.** This is not a detection failure. The model did its job and the
interface declined to report it.

### 20.3 Why "pattern match" is the wrong register

"Pattern match" is the honest internal description of what the classifier measures, and that is
precisely why it fails as a verdict. It describes the *mechanism* to a reader who asked about
the *conclusion*. To a customer it does not read as careful; it reads as a tool that will not
commit — and a tool that will not commit is one they stop using.

The Signal Scale was chosen (§4.1) to avoid overclaiming. It over-corrected. The failure mode it
was protecting against — a false authorship verdict — is not avoided by refusing to state a
direction the score already carries.

### 20.4 What can and cannot be said, and this is the binding constraint

**Supportable today:**

- **"Likely AI"** and **"Likely human"**. The score carries direction; the bands already encode
  it; saying it asserts nothing the measurement does not support. **Ship this.**

**NOT supportable today:**

- **"Likely human but AI edited"** and **"Likely AI but human edited"**.

Those require separating *edited* AI from *pure* AI. The tool detects AI rewrites of a human
original at **30–35%** (`HANDOVER.md` §9 item 3) — the weakest measured case in the project.
A four-way label would assert a distinction the model cannot make.

**This is the same defect as the green "Likely human" gauge on an 80.8% document** (REDESIGN §1),
and it would be *harder* to catch, because the wording sounds careful rather than obviously
wrong. A confident-sounding wrong label is worse than a vague right one.

**What would make it honest:** the paired-transformation corpus built 30 August —
`services/local-engine/research/cycle4-humaniser-pairs/`, 600 sources and 1,702 variants across
light copy-edit, medium paraphrase and heavy rewrite, with a whole rewriting family and a whole
register held out. It is exactly the training data the four-way verdict needs. **No model has
been trained on it yet.**

**So: design the two-way verdict now, with the four-way as a declared future state.** Do not
ship the edited variants until a model is trained and measured on that corpus, and until the
rewrite-detection figure is materially better than 30–35%.

### 20.5 "Why this result?" is written for an engineer

Shipped text, verbatim:

> "No section reached 0.9855 on its own, and no two reached 0.9763 together."

with `model output 0.3427, flag points 0.9855 and 0.9763, on our EU server` beneath it.

Accurate and useless. The reader does not know what a section is, has no intuition for 0.9855,
and cannot act on either number. It restates the arithmetic of the decision instead of giving
the evidence for it.

**The evidence already exists in the interface.** The section bars are scored, tinted and
clickable, and selecting one highlights the passage. That is the answer to "why". The prose
should point at the strongest passage — quote it — rather than describe the threshold test.
The raw numbers belong in an evidence drawer for people who want them, not in the explanation.

### 20.6 "Checks included in this run" lists outcomes without evidence

Seven checks render as badges: Found, Clean, Clean, No verdict, No verdict, No verdict, Not for
this input. **Five of seven say nothing happened**, so the panel reads as mostly empty, and the
one that fired explains itself as "a trained classifier reads the whole draft in consecutive
sections and reports the strongest".

The owner is right that this gives "no referenceable reasons or examples".

**The constraint that shaped it, which must survive any redesign:** the project measured that
only **35.9% of sentences push their document towards "machine"** (2,174 deletions across 57
documents, `SYNTHETIC-CADENCE.md`). **The tool must therefore never highlight "the AI
sentences"** — sentence-level highlights cannot mean what a reader would assume they mean.

**Section-level is the honest granularity, and it is already computed.** The panel should lead
with the strongest section's actual text, not with a badge. That gives a referenceable reason
without claiming more than the measurement supports.

Also worth deciding: whether checks that cannot apply to pasted text (Content Credentials, and
the watermark scan on ordinary prose) belong in the same list as checks that ran. Five empty
rows crowd out the one that matters.

### 20.7 What this section is asking for

1. **Two-way verdict in plain words** — "Likely AI" / "Likely human" — replacing the pattern-match
   register. Supportable now.
2. **"Why this result?" rewritten to quote the strongest passage**, with thresholds moved to an
   evidence drawer.
3. **The checks panel led by evidence**, not badges; section-level, never sentence-level.
4. **The four-way verdict designed for but not shipped**, pending a model trained on the paired
   corpus.

Items 1–3 are copy and composition and can ship without any model change. Item 4 is gated on
measurement and must not be shipped on design confidence alone.
