# The checker redesign — the research behind `DESIGN-FAILURE.md`

**Rescued into the repository on 30 August 2026.** Everything here was written on 29–30 August 2026
and lived in `.agent/docs/ai-content-integrity/ui-ux/`, a directory one level *above* the
repository. That is outside every checkout, so [`../DESIGN-FAILURE.md`](../DESIGN-FAILURE.md) cited
these documents sixty-two times by paths no reader could resolve. Moving them here is the whole
point of this directory; the citations in that file now point at these copies.

The files are byte-identical to the originals except where §"Edits made on import" below says
otherwise.

## What is here

| File | What it is |
|---|---|
| [`UX-AUDIT-LIVE-2026-08-29.md`](UX-AUDIT-LIVE-2026-08-29.md) | The measured audit of the live checker and Lab, driven in a real browser. Sixteen findings, plus a keep list of what was already good |
| [`PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md`](PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md) | The Signal Scale, the plain-English explanation layer, the full microcopy set, and every rejected alternative with its reason |
| [`REFERENCE-TEARDOWN-2026-08-29.md`](REFERENCE-TEARDOWN-2026-08-29.md) | Competitor teardown — Unmark, GPTZero, ZeroGPT and others, plus three non-detectors that had already solved the same problems |
| [`REDESIGN-BUILD-NOTES-2026-08-29.md`](REDESIGN-BUILD-NOTES-2026-08-29.md) | The design tokens read out of the real Opace stylesheets, the capability ledger, and the claim-slot classes |
| [`IMPLEMENTATION-PLAN-2026-08-29.md`](IMPLEMENTATION-PLAN-2026-08-29.md) | The file-by-file plan, engine-output coverage, the invariants and the test plan |
| [`IMPLEMENTATION-LOG-2026-08-29.md`](IMPLEMENTATION-LOG-2026-08-29.md) | What was actually built, where the plan was wrong, and the probe artefacts in §17–§19 |
| [`LIVE-DESIGN-REVIEW-AND-PAGE-RESTRUCTURE-2026-08-29.md`](LIVE-DESIGN-REVIEW-AND-PAGE-RESTRUCTURE-2026-08-29.md) | The restructure measured off rendered pages, before and after |
| [`CHECKER-DEFECT-FIXES-2026-08-29.md`](CHECKER-DEFECT-FIXES-2026-08-29.md) | Four audit defects closed, with live verification |
| [`FAQ-CONTENT-PACK-2026-08-29.md`](FAQ-CONTENT-PACK-2026-08-29.md) | Final copy for the Lab and the checker FAQ, with every claim classified and every prohibition listed |
| [`PROVIDER-STATUS-PANEL-2026-08-29.md`](PROVIDER-STATUS-PANEL-2026-08-29.md) | The provider-status panel, and the `world` claim class it defines |
| [`WATERMARK-LAB-PLACEMENT-2026-08-29.md`](WATERMARK-LAB-PLACEMENT-2026-08-29.md) | Where the Lab lives, how a user drives it, and why the paste box is third |
| [`mockups/`](mockups/) | Five self-contained pages: the contents page, the checker, the naming decision record, the design system and the Lab. No build step, no network, no external asset — open one in a browser |
| [`independent-review-2026-08-30/`](independent-review-2026-08-30/) | Three independent written assessments of the live tool against four candidate compositions, preserved verbatim |

## What is deliberately not here

**The screenshot corpus.** Roughly 56 MB of captures — the numbered `[S1]`–`[S8]` audit evidence,
the competitor reference frames, a 30 MB before-and-after matrix, the owner-rejection pair and the
four candidate compositions. It is held privately. No claim depends on opening one: each is
described in prose where it is used, and the load-bearing frames carry their SHA-256 in
`../DESIGN-FAILURE.md` §13 so the exact image can be identified against the owner's copy. Importing
it would have made every clone of this repository slower for no evidential gain. This was a
decision, not an oversight.

**Four documents from the same `.agent/` tree**, which are internal rather than evidential and were
not published: the Cloud Run safety re-verification (a map of how the live service is defended), the
cost-ceiling options review (billing-account identifiers and spending), the DPIA working paper
(unreviewed legal working for a solicitor — the public-facing outcome is
`docs/legal/LAWFUL-BASIS-AND-TRANSPARENCY.md`), and the owner decision sheet. Every document that
cited one of them now says it is held privately instead of offering a link that cannot resolve.

**`mockups/_source/`** and the four later mockups — `watermark-lab-v2`, `watermark-placement-map`,
`faq-preview` and `provider-status-panel`. They are not cited from `DESIGN-FAILURE.md` and two of
them still carry claim wording the programme has since retracted. Held for the owner to decide on
separately.

## Edits made on import

Three, all mechanical, all recorded here rather than made quietly:

1. **`REDESIGN-BUILD-NOTES-2026-08-29.md`** — three references to the mockups' old `.agent/` path
   now name this directory, so the reproduction command in §8 works from a checkout.
2. **`REFERENCE-TEARDOWN-2026-08-29.md`** — the screenshot path in the header now says the captures
   are held privately, rather than pointing at a directory that is not in the repository.
3. **`independent-review-2026-08-30/README.md`** — a note added saying the image files it lists are
   held privately. Its SHA-256 block is untouched, and remains the integrity record for them.

Nothing else was altered. In particular no finding, figure, denominator or judgement was changed.

## Superseded-wording notes added on 30 August 2026

A sweep after the import checked every published file here against the six retracted claims encoded in
[`../../../tests/battery/shipped-claims-guard.test.mjs`](../../../tests/battery/shipped-claims-guard.test.mjs).
Nothing was rewritten: these are historical artefacts, and rewriting one would produce a document that
never existed. What was added is a dated note saying the wording was retracted and what replaced it.

| File | Passage | Note added |
|---|---|---|
| `CHECKER-DEFECT-FIXES-2026-08-29.md` §2 | The retracted route label, "Slower to start, and the same evidence at the end" | Head note, plus a line marking the quotation as the wording being corrected |
| `FAQ-CONTENT-PACK-2026-08-29.md` C11 and §4.2 | "Anthropic now watermarks Claude's text", quoted as a prohibition | Head note, plus a line marking both quotations as retracted |
| `REDESIGN-BUILD-NOTES-2026-08-29.md` §S8 | Prohibitions recorded in the negative | Head note only; the sentences themselves are correct as written |
| `UX-AUDIT-LIVE-2026-08-29.md` §1.3 and §12 | The superseded **66.7%** figure, in an inventory of what the live page displayed; the retracted "same evidence at the end" label | Head note, plus a paragraph saying the inventory records what was on the page rather than endorsing it, and an inline marker on the route label |
| `mockups/*.html` (all five) | — | A visible dated superseded banner at the head of each page |
| `mockups/index.html` | "nobody can check text from Claude", which presupposes coverage Anthropic has not claimed | Inline retraction note beside the sentence, with the corrected wording |

The two claims in `mockups/index.html` and `mockups/watermark-lab.html` that the correction register
§2.1 lists — "nobody can check for Claude's watermark without Anthropic's private key" — had already
been corrected in the copies published here; only the `index.html` contents blurb still carried the
presupposition, and it now carries the note above.

**The guard was not reading any of this.** Before 30 August it scanned the website checkout and five
named files in this repository; it read no `.html` at all and nothing under `docs/programme/`. It now
scans this directory, mockups included. That is why the class could recur once and cannot again.

## One thing to read before quoting any of it

These are working documents from two days of a redesign that the owner then rejected — that
rejection is the subject of `../DESIGN-FAILURE.md`, and it is the point of keeping them. They
record a direction, several corrections to that direction, and a number of claims that were later
retracted and are quoted here only as the thing being retracted. Where a figure appears, check it
against [`../../measurements/CORPUS-RECONCILIATION-2026-08-29.md`](../../measurements/CORPUS-RECONCILIATION-2026-08-29.md)
before repeating it: the corpus measurement landed mid-way through this work and several numbers in
the earlier files are superseded by it, which the later files say themselves.
