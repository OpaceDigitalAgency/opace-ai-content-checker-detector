# Checker defect fixes — F3, F6, F8, F12

**Date:** 29 August 2026
**Agent:** B7
**Source of findings:** `./UX-AUDIT-LIVE-2026-08-29.md` (F3, F6, F8, F12) and `REDESIGN.md` item 3 (same defect as F6)
**Repository:** `opace-website/astro-latest` → `OpaceDigitalAgency/opace-latest`, pushed to `main`
**Commit:** `142a40fa` on `main`, pushed 29 August 2026 16:06 BST

No file under `implementation/` was touched. `thresholds.json`, the band names and floors, and the
`90.3% / 1.34%` figures were left alone as instructed. No build was run; `tsc --noEmit` was used.


> **Superseded wording, quoted deliberately — note added 30 August 2026 on publication.**
> This is a working document from 29–30 August 2026, kept as a historical record and not rewritten.
> Where it quotes claim wording the programme has since **retracted**, the quotation is the thing
> being retracted, never a live assertion. The retracted set and its corrected replacements are in
> [`../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md`](../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md);
> check any figure against
> [`../../measurements/CORPUS-RECONCILIATION-2026-08-29.md`](../../measurements/CORPUS-RECONCILIATION-2026-08-29.md)
> before repeating it. Do not quote any passage from this file as current wording.

---

## 1. F6 — a finding rendered as the single character `"W"`

### Root cause, confirmed rather than assumed

Reproduced locally against the shipped engine before any change, using a 216-word passive-voice
passage beginning "Wetlands…":

```
total findings 4  document-level 4
  signals.adjacent_lemma_repeat | matched= "W" | span 0 1 | detail= 13/18 adjacent sentence pairs repeat a content word
  signals.low_ttr               | matched= "W" | span 0 1 | detail= Vocabulary diversity 39.1% (90 unique / 230 tokens)
  signals.passive_ratio         | matched= "W" | span 0 1 | detail= 19/19 sentences read as passive (100%)
  signals.sentence_flatline     | matched= "W" | span 0 1 | detail= Sentence lengths cluster around 12 words (CV=0.11)
```

**Wider than the audit recorded.** The audit found two affected rules; four fire on this passage.
`low-ttr` and `sentence-flatline` do it too, and any rule that calls `pushEx(…, null, null, …)` will.

The engine is correct and needs no re-vendoring. A document-level rule emits `start: null`;
`toFinding()` substitutes the `docAnchor` placeholder `[0, 1]` so the span type stays total, and
publishes `evidence.document_level = true` so a consumer can tell a placeholder from a real span.
The website read the placeholder as a real span.

### Other consumers of `start` that made the same assumption

Three, not one:

| Site | Was | Now |
|---|---|---|
| `integrity-controller.ts` rail label | `“${evidence.matched}”` → `“W”` | the rule's own `evidence.detail` statement |
| `integrity-controller.ts` rail jump button | guarded on `end_utf16 > start_utf16`, which `0 → 1` passes | guarded on `hasPassageSpan()` |
| `renderDraft` highlight layer | same guard, so a mark was painted over the first character | document-level findings excluded |
| Rule-match frequency table | counted `evidence.matched`, producing `w ×14` | document-level findings skipped |

### A fourth defect found while fixing it

The rail keyed findings `p{index}` over the **full** finding list; `renderDraft` keyed them
`p{index}` over the **filtered** list. Any finding without a usable span shifted every key after it,
so "Show in draft" jumped to the wrong highlight. This is the same failure the project's
offset-refusal rule exists to prevent, and it was live. Both now key off the position in the full
list.

### Verification

Same passage through the new predicates:

```
highlights rendered: 0
frequency table rows: []
[doc] 13/18 adjacent sentence pairs repeat a content word   jump=false
[doc] Vocabulary diversity 39.1% (90 unique / 230 tokens)    jump=false
[doc] 19/19 sentences read as passive (100%)                 jump=false
[doc] Sentence lengths cluster around 12 words (CV=0.11)     jump=false
```

Live verification is in §5.

---

## 2. F3 — the route label claimed the two routes agree

`checker.astro`, browser-route radio, carried wording since **retracted** — quoted here only as the
thing that was corrected, and it must not be quoted as live copy:

> Slower to start, and the same evidence at the end.

Measured on the page's own Mixed sample the two routes returned 0.9183 and 0.5866. The claim is
false and is now:

> Slower to start. Both routes run the same checks and flag at the same point, but a score in the
> middle of the range can differ between them by a lot.

Checked against `implementation/docs/measurements/ROUTE-PARITY.md` §4 before writing:

| browser probability region | n | median \|Δp\| | max \|Δp\| |
|---|---|---|---|
| 0.97 – 1.00 (decision region) | 34 | 0.0002 | 0.0063 |
| 0.50 – 0.90 | 12 | 0.1767 | 0.4162 |

The underlying divergence was not touched: it is a measurement question and another agent owns it.

---

## 3. F8 — the threshold in the flag-point chip

**The chip was already correct and this is worth recording rather than claiming a fix.** It is built
from `localRecord.tier3.threshold` — the value the server returns with every response on the EU
route, and the value read from `thresholds.json` on the browser route. `grep -rn "98\.4" src/`
returns nothing. Moving the threshold changes the chip with no code edit today.

What *was* baked in was two `0.984` literals in the model disclosure paragraph in
`local-signals-ui.ts`, which the file's own header comment claimed did not exist ("Neither number is
written down here"). Both are gone:

- "…at the 0.984 flag point" → "…at the flag point that route reports with every result"
- "…both flag at 0.984" → "…both flag at the same point, which every result prints beside the score"

The header comment is now true.

**Not fixed, deliberately.** `SERVER_MEASURED` in `local-signals-ui.ts` still hard-codes the
detection figures measured at 0.984, while `FP32_SEGMENTED` in `server-route.ts` keys the same
figures by threshold — the correct design. Reconciling them belongs with the `thresholds.json`
single-source refactor another session owns, and the numbers involved are on the do-not-touch list.

---

## 4. F12 — the panel contradicting itself

### "116 named rules" against "113 named rules"

**116 is correct.** The shipped engine sets `WRITING_SIGNAL_RULES_RUN = 116` and reports it per run
as `rules_run` in the style method's scope note. The row printed that value; the framing paragraph
carried a hard-coded 113.

One home now. `render()` computes `rulesRun` once from the run's own scope note, and both the
"Writing suggestions" row and the framing paragraph read that variable. The literal `113` is gone
from the controller. `WRITING_SIGNAL_RULES_RUN` in `src/lib/content-integrity/state.ts` is the sole
fallback for a run with no scope note.

The `113` that remains elsewhere on the site is a different figure: the count of rules **as measured**
in the August evaluation ("the 113 writing-signal rules reached … 45.1%"). Rewriting it to 116 would
misstate the measurement, so it stands.

### "50 characters" against "60 words"

Both are correct, for different checks, and neither said which. 50 characters
(`CHECKER_MIN_PATTERN_CHARS`) is the floor for the writing rules; 60 words (`SERVER_MIN_WORDS`) is
the EU server's refusal point. The intro line now renders both from the constants that enforce them:

> Exact checks can run below {CHECKER_MIN_PATTERN_CHARS} characters, where writing-pattern judgement
> is suppressed; the AI model needs at least {SERVER_MIN_WORDS} words on the EU server route.

The audit called the 60-word minimum the costly one, because it cost a full round trip to discover.
The word counter now says so before the run, and only when the server route is selected:

> 22 words — the AI model needs 60 on the EU server route

---

## 5. Live verification

All of it measured on the deployed site, in a real browser, after the deploy landed. Nothing below
is inferred from source.

---

## 6. Commit

`142a40fa` — *Checker: stop rendering whole-document findings as a one-character highlight*.
Pushed to `main` at `16e47ba8..142a40fa`, which deployed. Explicit paths only. Three of the four files carried uncommitted work from other agents; that work
was left in their working trees and excluded from this commit by staging a HEAD-based blob with only
these changes applied.

Files:

- `src/lib/content-integrity/state.ts`
- `src/components/tools/content-integrity/integrity-controller.ts`
- `src/components/tools/content-integrity/local-signals/local-signals-ui.ts`
- `src/pages/tools/ai/content-verification-integrity/checker.astro`

---

## 7. Verification output

### The page

`GET https://opace.agency/tools/ai/content-verification-integrity/checker/` — **HTTP 200**.

| String | Before deploy | After deploy |
|---|---|---|
| `same evidence at the end` | 1 | **0** |
| `can differ between them by a lot` | 0 | **1** |
| `needs at least 60 words on the EU server route` | 0 | **1** |

Deploy landed inside 90 seconds of the push.

### The bundle

`GET /_astro/checker.astro_astro_type_script_index_0_lang.B7TKfBPj.js` — 283,999 bytes.

- `113 named rules` — **0 occurrences**. Both rule-count strings now interpolate the same variable:
  `` `…feedback from ${e} named rules…` `` and `` `…observations from ${F} named rules…` ``.
- `0.984` — **1 occurrence**, and it is the threshold-keyed `FP32_SEGMENTED` map
  (`{"0.980":{…},"0.984":{…}}`), which is the correct design: a detection figure keyed to the flag
  point it was measured at. No `0.984` remains in any copy string.
- `document_level` — 2 occurrences (the two new predicates).

### F6, run live on the deployed checker

Tab foregrounded. The 230-word passive-voice passage pasted, EU server route, one run.

```json
{
  "items": [
    {"label": "Vocabulary diversity 39.1% (90 unique / 230 tokens)", "docLevel": true, "jump": false},
    {"label": "Sentence lengths cluster around 12 words (CV=0.11)",  "docLevel": true, "jump": false},
    {"label": "13/18 adjacent sentence pairs repeat a content word", "docLevel": true, "jump": false},
    {"label": "19/19 sentences read as passive (100%)",              "docLevel": true, "jump": false}
  ],
  "quotedW": false,
  "marks": [],
  "phrasePanelHidden": true,
  "phraseText": ""
}
```

Four findings that rendered as `“W”` before, all now carrying their own statement. No `“W”` in the
rail, no `[data-keys]` marks painted into the draft, no "Show in draft" button on any of them, and
the rule-match frequency table — which listed `w ×14` — does not render at all.

### F12, same run

```
framing paragraph : "…editorial feedback from 116 named rules…"
Writing suggestions: "4 phrasing and structure observations from 116 named rules…"
```

One value, one source, no contradiction. Character counter with a short draft:

```
"24 words — the AI model needs 60 on the EU server route"
```

### F3 and F8, same run

```
route label : "…Slower to start. Both routes run the same checks and flag at the same point,
               but a score in the middle of the range can differ between them by a lot."
chips       : ["9.3% probability", "below the 98.4% flag point", "scored on our EU server",
               "tier3-cycle2-v1 · fp32"]
disclosure  : contains "0.984" → false
              flag-point phrase → "flag point that route reports with every result"
```

The chip prints 98.4% because the server returned 0.984 on that run, not because a string says so.

---

## 8. From the audit's list, not fixed

Everything in F3, F6, F8 and F12 is closed except:

- **The route divergence itself** (F3). Out of scope by instruction; another agent owns it.
- **`SERVER_MEASURED`** (F8). Still a hard-coded pair of figures measured at 0.984, sitting beside a
  correctly threshold-keyed equivalent in `server-route.ts`. Belongs with the `thresholds.json`
  single-source refactor another session owns.
- **The audit's wider F8 recommendation** — "no number in a band name, a chip, or a headline" — is a
  redesign decision, not a defect, and the band names are owned elsewhere.
- **The remaining F12 rows**: the "usually about a second" route claim against measured 4.8–7.6 s,
  the enabled-looking "Protect these facts (planned)" button, the stale download progress line, and
  the `INCONCLUSIVE` Protected content row. None were assigned here, and three of them are
  structural rather than copy.
- **`checkerFaqs` in `src/data/content-integrity.ts`** still says "Below 50 characters" as a literal.
  It is a third home for the figure and should read `CHECKER_MIN_PATTERN_CHARS`, but the array is
  `as const` and another agent had uncommitted edits in that file; changing the string to a template
  literal there is a typing change on a contested file for no user-visible gain today.
