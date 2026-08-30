# Provider status panel — specification and copy

**Date:** 29 August 2026
**Agent:** PSP-1
**Status:** build-ready. Copy is final text, not placeholder. Two new files only; nothing existing
was edited.

**Companion file:** `ui-ux/mockups/provider-status-panel.html` — the panel rendered on the
`watermark-lab-v2.html` stylesheet, with the claim-tag toggle and a lapsed-date state.

**Read to produce this:** `RESEARCH-CLAIM-VERIFICATION-2026-08-29.md` including its addendum (the
sole factual base — every cell below traces to a claim number in it),
`CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md` §6 (the canonical block this builds on),
`ui-ux/FAQ-CONTENT-PACK-2026-08-29.md` (register and tagging convention),
`ui-ux/PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md` (plain-language rules),
`ui-ux/mockups/system.html` and `watermark-lab-v2.html` (component vocabulary, read only),
`RESEARCH-TO-ROADMAP-DELTA-2026-08-29.md` §7 and §17 (why this item, and the binding constraint).

---

## 0. What this panel is, and the one thing it must never become

It answers the question people actually arrive with — *does Claude/Gemini/ChatGPT watermark its
text, and can anyone check?* — and it answers it about **provider posture**, never about a piece of
text. There is no column, cell, badge or colour anywhere in it that could be read as something this
tool found.

Two questions per provider, kept in separate columns because they are conflated constantly:

1. **Does the provider mark its own text output?**
2. **Can anyone outside that provider verify it on a piece of text?**

The two answers come apart in every row, and that is the finding. Gemini marks its text and nobody
outside Google can check. Anthropic has committed and shipped nothing checkable. OpenAI documents
neither. Same problem, three shapes.

### 0.1 It builds on §6 of the correction register, and changes three things

The canonical block at `CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md` §6 is the parent of this
panel and its four bullets survive intact as the four rows. Three changes, each forced by RV-1's
primary pass, which landed after that block was written:

| Change | Why |
|---|---|
| The Anthropic bullet loses "from launch" as a present-tense reading and gains the **empty-set consequence** — no Claude model has launched on or after the cutoff | RV-1 §1. Opus 5 launched 24 July 2026, Sonnet 5 on 30 June. The set of models covered by the launch commitment is currently empty |
| A new full-width note establishes **2 August 2026 as the EU AI Act Article 50 applicability date**, inherited rather than chosen | RV-1 addendum A2. This is the strongest available reason why that date can never read as a deployment date, and it was not available when §6 was written |
| Prose bullets become a **two-column grid**, because a bullet list lets the two questions blur back together | `RESEARCH-TO-ROADMAP-DELTA` §7: "two columns and never three" |

Everything else — including the fourth bullet, which the register correctly calls "not optional
padding" — is carried through.

### 0.2 Placement

Under the wrong-key demonstration on the lab page (`watermark-lab-v2.html` experiment 1), before the
paste box. The reader has just watched a signal vanish when the key changed; this panel is the
answer to the question that creates. It is not an accordion. Everything in it is visible on load.

Not on the checker. The checker's FAQ block links to it.

---

## 1. The panel copy

Final text. Word counts are the budget, not an estimate, and they were counted rather than guessed.
**Total: 447 words**, including headings, column headers and provider names. 85 of those are the
fourth row, which is the point of the panel.

### 1.1 Heading and deck

**Eyebrow** · `[PAGE]` · 2 words

> Provider status

**H2** · `[PAGE]` · 8 words

> What the three providers have published about themselves

**Deck** · `[PAGE]` · 40 words

> This reports what each provider says about its own output, and whether anyone outside that
> provider can check a piece of text. It is not a reading of your text, and nothing in it changes
> what this lab can measure.

**Verification stamp**, sits with the heading, not in the footer · `[PAGE]` + slot · 30 words

> Every cell verified against the provider's own page on **29 August 2026**. Re-date on republish.
> If this date is older than the page carrying it, treat the panel as unverified.

### 1.2 Column headers

| | Column A | Column B |
|---|---|---|
| Header · `[PAGE]` | **Marks its own text?** | **Can anyone outside verify it?** |
| Sub-line · `[PAGE]` | What the provider has published | Whether a public check exists for text |

### 1.3 The three provider rows

Status labels come from a closed set of five (§2.2). Each cell is: status, one-line gloss, source,
date.

---

**Row 1 — Google Gemini**

| | Column A | Column B |
|---|---|---|
| **Status** | Published as marked | No public text verifier |
| **Gloss** | Google says Gemini's text output carries SynthID-Text, and has done since 14 May 2024. | Google's public checking covers images, video and audio. Text is not an accepted input. |
| **Source** | `deepmind.google/science/synthid/ai-generated-text/` | `deepmind.google/models/synthid/` |
| **Verified** | 29 August 2026 | 29 August 2026 |
| **Traces to** | RV-1 claim 4 (CONFIRMED, deployment) | RV-1 claim 4 (CONFIRMED-ABSENT) |

---

**Row 2 — Anthropic Claude**

| | Column A | Column B |
|---|---|---|
| **Status** | Committed, not demonstrated | Announced, not released |
| **Gloss** | Anthropic says Claude models launched on or after 2 August 2026 support marking at launch, and that it is working to add marking to models released earlier. | Anthropic says it will soon offer a watermark detection API. It has not shipped one. |
| **Second line** | No Claude model has launched on or after that date. Opus 5 launched 24 July 2026, Sonnet 5 on 30 June. Anthropic publishes no per-model status. | *(none)* |
| **Source** | `support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content` | `anthropic.com/news/claude-text-watermark` |
| **Verified** | 29 August 2026 | 29 August 2026 |
| **Traces to** | RV-1 claim 1 (narrow reading CONFIRMED; the flattened reading CONTRADICTED) | RV-1 claim 2 (CONFIRMED, future tense) |

**Citation discipline, and it has been got wrong twice already.** The "launched on or after" sentence
is on the **support article**. The detection-API sentence and the future-tense framing are on the
**news post**. RV-1 C-1 and C-2 both record the same misattribution on live surfaces. The two links
above are not interchangeable.

**Do not paraphrase Anthropic inside quotation marks.** RV-1's addendum found a sentence on
`watermark-lab.html:713` presented as a direct quotation under "in their words" that Anthropic has
never written. If this panel ever carries a quotation, it is the support article's verbatim *"support
marking at launch"*, linked to the support article.

---

**Note under Row 2, full width** · `[CLAIM: world]` · 54 words

> **About 2 August 2026.** That is the date the EU AI Act's Article 50 transparency obligations began
> to apply. Anthropic inherited it as a legal boundary rather than choosing it as a rollout date. It
> is not a date on which Claude output began carrying a mark, and no such date has been published.

Source: `digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations`, verified
29 August 2026. Traces to RV-1 addendum A2.

This note is the best sentence produced on the programme today and it is why the row can be trusted.
It converts "we are being cautious about a date" into "here is what the date is". Do not cut it for
length.

---

**Row 3 — OpenAI ChatGPT**

| | Column A | Column B |
|---|---|---|
| **Status** | Not publicly documented | No public text verifier |
| **Gloss** | OpenAI's provenance documentation covers images and audio only; no text watermark is publicly documented. | Its provenance check endpoint accepts image and audio files. Text is not an accepted input. |
| **Source** | `developers.openai.com/api/docs/guides/content-provenance` | same page |
| **Verified** | 29 August 2026 | 29 August 2026 |
| **Traces to** | RV-1 claim 7 (CONFIRMED-ABSENT, on negative evidence) | RV-1 claim 5 (CONFIRMED) |

**Two prohibitions on this row.** Column A is an argument from documented absence and its wording is
fixed by RV-1's do-not-publish list item 5 — never "OpenAI does not watermark text" as a positive
assertion. And **no OpenAI date is published**: `openai.com` returned HTTP 403 to RV-1 and the
circulating dates are secondary-sourced. The endpoint path itself is verified, but the panel has no
reason to print it, so it does not.

### 1.4 Row 4 — the row the panel exists for

Full width, spanning both columns, visually separated from the three provider rows because it is a
statement about this tool rather than about a provider.

**Label** · `[PAGE]` · 6 words

> If a provider ships a detector

**Status** · `[CLAIM: boundary]` · 8 words

> It would not change what this lab does

**Body** · `[CLAIM: boundary]` · 71 words

> Calling a provider's detection endpoint would make us their client. Their mathematics, their
> answer, your text leaving this machine — and none of it exercising the detection built here. Only
> a **published key** does that: a key with its configuration, its tokeniser and its threshold, so
> anyone can re-derive the reading offline from the receipt. Until a provider publishes one, this
> lab reads its own three demo keys and nothing else.

**Predicate**, for the `[CLAIM: boundary]` half:

```
true while: no provider has published a watermark key, configuration, tokeniser and threshold
            sufficient to run detection locally
           AND the lab's adapter surface exposes no verdict adapter
```

The predicate is checkable in code, which is why this row is `boundary` and the three above it are
not. If either condition ever goes false, this row is wrong and the build should say so before a
reader does.

### 1.5 The standing line under the panel

`[CLAIM: boundary]` · 49 words. Two sentences, deliberately, because a single balanced sentence gets
half-read.

> None of this is a statement about your text. This lab cannot tell you whether a particular piece
> of Gemini, Claude or ChatGPT writing carries a mark, and a reading near 0.5 under our demo keys
> does not mean a person wrote it — or that a machine did.

---

## 2. Classification — and why this panel is mostly `[CLAIM: world]`

### 2.1 The third constructor, stated plainly

The FAQ pack's scheme has `[CLAIM: measured]` and `[CLAIM: boundary]`. Neither fits most of this
panel, and forcing the fit is how a panel like this goes quietly wrong.

| Constructor | What it asserts | What guards it | Renders through |
|---|---|---|---|
| `[CLAIM: measured]` | a figure we produced | its denominator, corpus, threshold and runtime | `MEASURED` accessor |
| `[CLAIM: boundary]` | what our check can and cannot establish | a **predicate over our own code**, checkable at build | `methodClaim()` |
| `[CLAIM: world]` | a fact about somebody else's system | **nothing we own.** Only a dated re-check | `worldClaim()` — **new, does not exist yet** |

**`[CLAIM: world]` is named in `FAQ-CONTENT-PACK-2026-08-29.md` §0.2 and defined here.** No accessor
exists: it is not in `measured-figures.ts` and not in `system.html`'s claim-slot toggle. This panel
is where the treatment gets established, so it is defined rather than inherited.

The distinction that matters: a `boundary` claim is false only if *we* change, we control that, and a
predicate over our shipping configuration can catch it. A `world` claim is false the moment
*Anthropic* changes, and nothing on our side moves to tell us. **No predicate of ours can ever guard
a world claim, and reaching for one is a false comfort** — our key set staying demo-only says nothing
about whether Anthropic has published theirs. A date and a review interval are the only available
guard, which is why every world cell carries both, and why §3 is a third of this specification.

**Do not add a predicate to a world claim.** If a future pass finds one that appears to work, it is
guarding a fact about us that happens to correlate with a fact about them, and it will keep passing
after the correlation breaks. That is worse than no guard, because it looks guarded.

**Nine of the twelve claim-bearing lines in this panel are `world` claims.** That ratio is the panel
itself: it is a report on other people's systems, and it is the most perishable content either page
carries.

### 2.1a The inherited mistag, corrected here

`methodClaim('providers.status')` is tagged `[CLAIM: boundary]` in three places in the FAQ pack — §1,
§3 and the appendix at line 599 — and is really a world claim. The pack flagged it rather than
rewriting settled copy, and pointed the correction here.

**Corrected treatment, for this panel and for the FAQ pack's next pass:** every provider cell is
`[CLAIM: world]`, rendered through `worldClaim()`, carrying a `verifiedAt` and a review interval, and
guarded by neither a predicate nor a denominator. `methodClaim()` keeps only the two things that are
genuinely about us — row 4 and the standing line. When the FAQ pack's three occurrences are retagged,
they should also stop being three occurrences: correction register §6 and the pack's own line 1149
both say a provider fact appearing three times is three things that can drift apart. They import this
panel's slots.

### 2.2 The closed status vocabulary

Five labels, and no sixth without a decision recorded here. A free-text status field is how "Yes"
appeared in the `WATERMARK-ROBUSTNESS` table and became the coverage claim RV-1 C-2 had to correct.

| Label | Means | Used at |
|---|---|---|
| **Published as marked** | The provider states its text output carries a mark | Gemini A |
| **Committed, not demonstrated** | The provider has committed; no output is shown to be covered | Claude A |
| **Not publicly documented** | No published statement either way; documented absence | OpenAI A |
| **Announced, not released** | A verifier is promised; nothing is callable | Claude B |
| **No public text verifier** | No verifier for text exists, whatever exists for other media | Gemini B, OpenAI B |

Two labels that are **prohibited**: any bare **Yes**/**No**, and anything reading as a verdict on a
piece of text (**Detected**, **Clean**, **Verified**, **Passed**).

### 2.3 Every sentence, classified

`W` = `[CLAIM: world]`, `B` = `[CLAIM: boundary]`, `P` = `[PAGE]`. Every `W` slot carries
`reviewDays: 30`; see §3.1.

| # | Sentence | Tag | Slot | Guard |
|---|---|---|---|---|
| 1 | "What the three providers have published about themselves" | `P` | — | position |
| 2 | Deck, "This reports what each provider says…" | `P` | — | position |
| 3 | Verification stamp, "Every cell verified… 29 August 2026" | `P` + date | `providerStatus().verifiedAt` **new** | build date arithmetic |
| 4 | Column headers and sub-lines | `P` | — | position |
| 5 | Gemini A: "Google says Gemini's text output carries SynthID-Text, and has done since 14 May 2024." | `W` | `worldClaim('gemini.marksText')` **new** | monthly review |
| 6 | Gemini B: "Google's public checking covers images, video and audio. Text is not an accepted input." | `W` | `worldClaim('gemini.publicVerifier')` **new** | monthly review |
| 7 | Claude A: "Anthropic says Claude models launched on or after 2 August 2026 support marking at launch…" | `W` | `worldClaim('claude.commitment')` **new** | monthly review |
| 8 | Claude A second line: "No Claude model has launched on or after that date. Opus 5 launched 24 July 2026, Sonnet 5 on 30 June." | `W` | `worldClaim('claude.launchSet')` **new** | **monthly review, and the fastest-moving line on the site** |
| 9 | Claude A second line, cont.: "Anthropic publishes no per-model status." | `W` | `worldClaim('claude.perModelStatus')` **new** | monthly review |
| 10 | Claude B: "Anthropic says it will soon offer a watermark detection API. It has not shipped one." | `W` | `worldClaim('claude.detectorApi')` **new** | monthly review |
| 11 | The 2 August note, all three sentences | `W` | `worldClaim('euAiAct.article50')` **new** | monthly review |
| 12 | OpenAI A: "OpenAI's provenance documentation covers images and audio only; no text watermark is publicly documented." | `W` | `worldClaim('openai.marksText')` **new** | monthly review |
| 13 | OpenAI B: "Its provenance check endpoint accepts image and audio files. Text is not an accepted input." | `W` | `worldClaim('openai.publicVerifier')` **new** | monthly review |
| 14 | Row 4 status: "It would not change what this lab does" | `B` | `methodClaim('adapters.endpointIsNotOurs')` **new** | predicate, §1.4 |
| 15 | Row 4 body, all four sentences | `B` | `methodClaim('adapters.publishedKeyOnly')` **new** | predicate, §1.4 |
| 16 | Standing line, both sentences | `B` | `methodClaim('providers.noVerdictOnYourText')` **new** | predicate: the lab exposes no provider-keyed route |

Nine `world`, three `boundary`, three `page`, one dated stamp. Twelve new slots, none of which
exists among the 59 counted by `system.html`.

**No `[CLAIM: measured]` anywhere in this panel, and that is deliberate.** It carries no rate, no
score and no threshold, so it needs no denominator and cannot acquire one by accident. The
paraphrase figure that RV-1's do-not-publish list bars in any form has no way into this panel
because there is no numeric slot for it to enter through.

---

## 3. The staleness plan

This panel ages faster than anything else on the site. Anthropic's detector API is announced in
future tense with no date; it could ship in a week. A panel that silently ages is worse than no
panel, because a dated claim that has stopped being true is a claim the reader has been given a
reason to trust.

### 3.1 The interval, and who owns the re-date

**Monthly, every cell, and immediately on any provider announcement.** Adopted from the FAQ
workstream. Next review: **28 September 2026**.

**The interval lives in the claim, not in a process document.** Each `worldClaim()` carries its own
`verifiedAt` and `reviewDays: 30`, so the panel computes its own freshness at build time. A review
schedule kept anywhere else is a schedule someone eventually stops reading.

A per-cell hierarchy — thirty days for Claude, ninety for the quieter providers — was drafted and
rejected. It makes the panel's freshness ambiguous, since a reader sees one panel with one stamp, and
it invites an argument about which provider is quiet enough to be checked less often. Anthropic's
detector could ship any week, and the re-check for all four sources is twenty minutes (§3.4). One
interval, no exceptions.

The announcement trigger is not a substitute for the calendar. It fires when we happen to notice
something; the calendar fires whether or not anyone noticed.

**Owner:** whoever owns `measured-figures.ts` and its sibling accessors in the package. The re-date
is a **code change with a diff and a reviewer**, never a CMS edit and never a date typed into a
template. The panel is imported by the lab page, the checker FAQ and the standalone repo page; a
date edited on one surface and not the others is the failure this arrangement exists to prevent —
exactly the reasoning in correction register §6 for putting the block in one file.

### 3.2 What the page does when the review date lapses

Three options were on the table: keep the cell and print the age in small text, degrade the cell, or
refuse to render it.

**Chosen: degrade the cell.** On lapse, the status label is replaced and the gloss is re-attributed
to the date it was true.

| | Fresh | Lapsed |
|---|---|---|
| Status | **Announced, not released** | **Not re-checked** |
| Gloss | Anthropic says it will soon offer a watermark detection API. It has not shipped one. | On 29 August 2026, Anthropic said it would soon offer a watermark detection API and had not shipped one. This has not been re-checked in N days and may have changed. |
| Panel stamp | Every cell verified against the provider's own page on 29 August 2026. | **Overdue for re-check.** Last verified 29 August 2026, N days ago. Read every cell below as what was true on that date, not as what is true now. |

The stamp moves above the columns and takes the `--mark-odd` warning treatment. It is read before any
cell, because the reader has to know the panel may be stale before they learn what it says.

**Why not the other two.** Printing the age in small print beneath an unchanged status is the failure
mode being designed against: it keeps asserting a present-tense status while the disclaimer goes
unread, which converts "we do not know" into "we checked". Refusing to render is worse in a different
way — the panel is itself a disclosure, and a reader who arrives asking whether anyone can verify
Claude text and finds an empty space has been told nothing, while the tool has quietly stopped saying
the most useful honest thing it says. Degrading keeps the evidence, keeps it attributed to its date,
and removes only the present-tense assertion, which is the only part that has actually expired.

**Backstop.** At review date + 30 days the build **fails** with
`[[STALE: providerStatus.claude.detectorApi]]`, the same visible-failure-token mechanism as
`[[MISSING: …]]`. The degraded state is honest for a few weeks; it is not a place to live.

All of it is date arithmetic at build time against each slot's `verifiedAt` and `reviewDays`. No
editorial judgement, no cron, nothing a person can forget to do.

### 3.3 The four events that change a cell, and exactly which cells

Written now so the person handling the change is not deciding wording under pressure. Each is a
`world` fact turning over; each requires re-reading the provider's page, not editing from a news
report.

**Event 1 — Anthropic releases the detection API.** The most likely, and the one to be ready for.

- `claude.detectorApi` (Claude column B) changes from **Announced, not released**. It does **not**
  become a positive verification status for this lab.
- New status required, and it is a sixth label admitted only for this event: **Provider-only
  verifier**, glossed *"Anthropic offers a detection API. It answers about Claude text, from
  Anthropic, on text sent to Anthropic."*
- **Row 4 does not change and must not be softened.** Its predicate is untouched by an endpoint
  release: an endpoint is still not a published key. This is the moment the fourth row was written
  for, and the moment it will be most tempting to reword.
- `claude.commitment` and `claude.launchSet` are unaffected. A detector proves nothing about which
  models carry a mark.

**Event 2 — a Claude model launches on or after 2 August 2026.**

- `claude.launchSet` (row 2 second line) is falsified outright and must be rewritten the same day.
  The empty set stops being empty.
- `claude.commitment` status may move from **Committed, not demonstrated** — but only if Anthropic
  publishes per-model status. A launch alone does not license a coverage claim about output, which
  is the whole of RV-1 §1.
- Re-check `claude.perModelStatus` at the same time; the support article says it will be updated.

**Event 3 — Google opens SynthID Detector to text.**

- `gemini.publicVerifier` (Gemini column B) changes from **No public text verifier**. Check whether
  it is genuinely public or still gated to journalists and media professionals; a gated portal is
  still not a public verifier and keeps the current status with a revised gloss.
- Row 4 unaffected, for the same reason as event 1.

**Event 4 — OpenAI adds text to the provenance endpoint, or documents a text watermark.**

- `openai.publicVerifier`, and `openai.marksText` if a watermark is documented. Column A's documented
  absence would become a positive published fact, which is a simpler and safer sentence than the one
  it replaces.
- Publish no OpenAI date until `openai.com` can actually be read; the 403 that blocked RV-1 has not
  been retried.

**A fifth thing that is not an event.** Circulating claims that Claude output "is watermarked from"
some date. RV-1's addendum A4 predicts one will attach to 2 December 2026 and that it will be wrong
in our favour, which makes it more dangerous. A compliance deadline is not evidence of deployment.
**2 December 2026 does not appear in this panel**: it rests on a provisional agreement not verified
against the Official Journal, and RV-1 says verify before publishing on any Opace surface.

### 3.4 The re-check procedure

For whoever picks this up on 28 September. Roughly twenty minutes.

1. Fetch each source URL in §1.3. Record the HTTP status. A 403 or a redirect is a finding, not a
   reason to keep the old date.
2. Read the sentence the cell is derived from, in full, on the page. Not a cached summary, not a
   news report, not a previous agent's note.
3. If unchanged: update `verifiedAt` only. The gloss is not retyped.
4. If changed: rewrite the gloss against §2.2's closed vocabulary, cite the page the sentence is
   actually on, and record the change in this file's §4 log.
5. Check `anthropic.com/news` for model launches since the last review — that is the only way
   `claude.launchSet` can be checked, and it is a check nothing else on the site performs.
6. Rebuild. The stamp re-dates itself from the slots; it is not typed.

---

## 4. Change log

| Date | Change | By |
|---|---|---|
| 29 August 2026 | Panel specified; all cells verified against primary sources | PSP-1 |

---

## 5. Notes for whoever builds it

- **The two columns are the design.** Any layout collapsing them into one status per provider has
  reintroduced the conflation the panel exists to remove. On narrow screens the columns stack, and
  each keeps its header inline so the question stays attached to its answer.
- **No status colour.** Every status renders in `--ink` on `--surface`, distinguished by shape and
  position, not hue. A provider marking its text is not good news and a provider not marking it is
  not bad news, and the moment a status goes green or red the panel has issued a verdict.
  `--mark-odd` appears in one place only: the "due for re-check" state, where it is about our
  freshness rather than about a provider.
- **Row 4 is styled apart from rows 1 to 3**, because it is about this tool. Same panel, different
  surface, its own label. If it reads as a fourth provider the styling has failed.
- **The coverage-claim guard has already landed and this panel passes it.** The rule proposed at
  correction register §6 now exists at
  `implementation/tests/battery/shipped-claims-guard.test.mjs:100`, in a stronger form than the one
  proposed — it also catches "watermarked since \<date\>". Both new files were run against all six
  `BANNED` patterns in that file: no match. That rule is what stops a future edit turning "committed,
  not demonstrated" back into a coverage claim, so any reworded status must be re-run against it.
- **Point the guard at this panel's source file** once the slots exist. Correction register §7.2
  notes the guard reads the website only; a claim block imported by three surfaces should be scanned
  where it lives.
- **`worldClaim()` needs a home in `system.html`'s claim-slot toggle** with its own outline colour,
  distinct from `claim--unsourced`. A world claim is not unsourced. It is sourced to somebody we do
  not control, which is a different problem and deserves a different colour.
