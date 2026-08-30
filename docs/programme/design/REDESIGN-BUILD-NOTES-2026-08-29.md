# Redesign build notes — Opace Content Integrity mockups

**Written 29 August 2026.** Agent UI-2. Mockups only. Nothing in `opace-website/` or `implementation/`
was read for edit or changed, and no build was run.

Files: `docs/programme/design/mockups/` (rescued into the repository on 30 August 2026; written
at `.agent/docs/ai-content-integrity/ui-ux/mockups/`, outside any checkout)

| File | What it is |
|---|---|
| `index.html` | Contents page, written for the owner |
| `checker.html` | The redesigned checker. Six switchable states. The main deliverable |
| `watermark-lab.html` | The lab, rebuilt around the wrong-key experiment |
| `compare.html` | Three naming schemes side by side, with a flag-point switch |
| `system.html` | The design system on one page. Build from this |

Each file is self-contained: no build step, no network, no CDN, no external font, and zero external
references of any kind. Double-click and it works.

The five pages are generated from one shared stylesheet and one shared script, inlined at assembly
time, so the token set cannot drift between pages. Those sources are kept in `mockups/_source/`.
**Edit the source and re-run `python3 _source/build.py`, not the five HTML files** — a hand edit to one
page would silently desynchronise it from the other four.

Sources read in full: `UX-AUDIT-LIVE-2026-08-29.md`, `PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md`,
`REFERENCE-TEARDOWN-2026-08-29.md`, `REDESIGN.md`, `HANDOVER.md`, and the audit screenshots.


> **Superseded wording, quoted deliberately — note added 30 August 2026 on publication.**
> This is a working document from 29–30 August 2026, kept as a historical record and not rewritten.
> Where it quotes claim wording the programme has since **retracted**, the quotation is the thing
> being retracted, never a live assertion. The retracted set and its corrected replacements are in
> [`../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md`](../CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md);
> check any figure against
> [`../../measurements/CORPUS-RECONCILIATION-2026-08-29.md`](../../measurements/CORPUS-RECONCILIATION-2026-08-29.md)
> before repeating it. Do not quote any passage from this file as current wording.

---

## 1. The numbers, before and after

Measured in the rendered page, the same way the audit measured the live site. Desktop 1440×900,
phone 375×812. **The black mockup bar at the top of each file is excluded from every figure below,
because it is not part of the product.**

| | Live today | These mockups |
|---|---|---|
| Words before the paste box, desktop | 422 | **31** |
| Words between the box and the run button | 690 | **48** |
| **Total copy before you can run it** | **1,112** | **79** |
| Words in the result, before opening anything | 1,523 | **351** |
| Height of the result block, desktop | 4,359 px (5.8 screens) | **1,389 px (1.5 screens)** |
| Scroll depth to the paste box, 375 px | 2,608 px (3.2 screens) | **352 px (0.43 screens)** |
| Scroll depth to the run button, 375 px | 5,266 px (6.5 screens) | **874 px (1.08 screens)** |
| Whole page height, 375 px, before a run | 12,768 px (15.7 screens) | **1,429 px (1.8 screens)** |
| Chips beside the headline verdict | 5, one reading `TIER3-CYCLE2-V1 · FP32` | **0** |
| Interactive targets under 24 px at 375 px | 15 | **0** |

The 351-word result figure counts the tool's own copy. It excludes the user's draft echoed back in the
section-highlight panel, and it excludes the flag-point demonstration box at the foot of `checker.html`,
which is a mockup control rather than product. The full visible text of the result region including
both is 550 words.

**One honest miss.** The run button sits at 874 px on a 812 px phone, so it is 1.08 screens down rather
than in the first screen. Getting it above the fold would mean hiding the route choice behind a
disclosure, and error prevention beats a round number: the person choosing "this device" needs to see
the 35 MB download before they press the button, not after. The paste box is well inside the first
screen at 0.43 screens, which is what actually matters for the paste-and-click user the audit
describes.

---

## 2. Which audit findings each screen fixes

### `checker.html`

| Finding | How it is fixed |
|---|---|
| **F1** 1,112 words before the button | 79. The remaining 690 words of route explanation, model notes and hidden-character prose are in four disclosures below the tool, plus a three-row "What we checked" table |
| **F2** The verdict never says why | The section list leads the result and answers "which part". A disclosure headed "Why can't you point at the exact sentences?" gives the measured answer, including the 24-feature scorecard reaching 72.1% of the model's 89.8% and the admission that the last third is unnameable |
| **F4** The band ladder over-accuses | Level names describe the instrument, never a conclusion. "Strong signal" begins exactly at the flag point, so the words can never contradict the tool's own decision |
| **F5 / REDESIGN 2** The Highlights panel | Deleted. Character findings and editing notes are separate cards with separate glyphs and separate colour families. No panel needs a disclaimer to say what it is not |
| **F6 / REDESIGN 3** The `"W"` highlight | Document-level findings are described, never anchored. A highlight shorter than one whole word is never drawn |
| **F7** 1,523-word result | 351. Everything valuable survives, behind a disclosure rather than in the reading path |
| **F8 / REDESIGN 5** Threshold hard-coded into copy | No number appears in any label anywhere. The flag point appears in exactly two places: the detail line beside the raw output, and the methods strip. Both are data |
| **F9** The browser route is four bad moments | One segmented control, 24 words total against 165, each option carrying its own route icon. The arrow leaving the laptop carries the privacy trade before any sentence loads |
| **F10** Screen reader hears 200 words on focus | The text box has a two-word label and no description. A dedicated `role="status"` element announces one sentence: level, marks, notes, sections, "results below" |
| **F11** Mobile hierarchy | Tool first, everything else in disclosures. Nothing interactive under 40 px |
| **F12** The page contradicts itself | Every figure appears once. The 60-word minimum is in the counter from the first frame, and the counter updates to "the AI check needs 60 — 24 more and we can read it" |
| **F15 / REDESIGN 6d** Watermark on every run | One collapsed line. It expands into the explanation and a link to the lab. A found mark would never be collapsed |
| **F16 / REDESIGN 6a** Section list should lead | It does. First thing in the result, above the three cards |
| **REDESIGN 6b** The wait | Named, with the document size and the usual duration: "Checking 512 words on our EU server. Usually about 3 seconds." |
| **REDESIGN 6c** Failure states | The too-short state is a full first-class result, in grey, with the number that would fix it |

### `watermark-lab.html`

| Finding | How it is fixed |
|---|---|
| **F14** The lab buries its best asset | The wrong-key experiment is the hero. The best sentence in the suite is the H1. No download gate, no fixture ids, nothing above it |
| **F14** 695 words before the box exists | The 1.7 MB module loads behind "Try it with your own text", two thirds down |
| **F14** `wm-alpha-200-01 · Watermarked · 200 tokens · key alpha` | "Watermarked, short" / "Watermarked, long" / "Not watermarked" / "Watermarked, then edited" |
| **F14** "Passage, coloured by per-token g-value" | "Which words carry the watermark" |
| **F14** Six unexplained metric tiles | Behind "Show the numbers", with a plain gloss on every row |
| **Keep list 4** The "NOT AVAILABLE" hero badge | Kept, reworded: "Can we check text from Claude? Not today, and not by anyone else either", dated |

### `compare.html`

Answers the naming conflict by showing it rather than arguing it. Same document, same model output,
three schemes, each graded on seven tests including the two that the live ladder fails. The flag-point
switch at the top is the fastest way to see which naming survives the owner's pending decision.

### `system.html`

The build reference. Five axis A states, six axis B and C states, six check icons plus two route icons
at 32 px and at the 16 px they ship at, both contrast tables computed in the page, the full microcopy
set including six error strings, and a greyscale button that strips colour out to prove no state
depends on it.

---

## 3. Patterns used, and where each came from

All from `REFERENCE-TEARDOWN-2026-08-29.md` unless stated.

| Pattern | Source | Where it is used |
|---|---|---|
| **P2** Score printed against its threshold | Unmark, `Score / threshold` column | The detail line: `Model output 0.8082 · flag point 0.9840 · our EU server`. Also on every section row |
| **P5** Caption the number by what it is not | Originality.ai's SynthID demo, "cumulative evidence — not a probability" | Under both readings in the lab: "how strongly the mark reads — not a percentage, and not a probability" |
| **P6** The instrument first, the explanation after | Originality.ai's SynthID article | Both tool pages. The lab opens on the experiment |
| **P7** A marker on a banded bar | PageSpeed Insights Core Web Vitals | The track. Four segments, the marker at the measured position, the flag point drawn upright |
| **P8** Provenance attached to the result | PageSpeed Insights' six-item grey strip | The methods strip under axis A. Corpus, flag point, denominator and runtime, in one sentence, in grey, beside the number rather than in a warning box |
| **P9** Independent scores, never averaged | PageSpeed Insights reports five and computes no composite | Three cards, three shapes, three vocabularies. No fourth number anywhere |
| **P10** Categories that carry no valence | WAVE's Structural Elements and ARIA counts | "Facts we will not touch" is specified as a neutral panel beside the rewrite tools rather than inside the results |
| **P11** A named "a human must decide" outcome | WAVE Alerts, and WebAIM's "Only a human can determine true accessibility" | The Faint signal card: "Faint is not clear… Read it yourself before you decide anything" |
| **P12** One card per category with its own denominator | Hemingway, "1 of 13 sentences" | Every count carries its denominator: "12 phrases across 5 kinds", "16 of 260", "835 of 922" |
| **P13** Refuse below a floor, and say so before the paste | GPTZero's refusal, corrected by Turnitin's disclosure | The counter reads "0 words · needs 60 · best over 300" from the first frame |
| **P3** A capability tag carries the caveat | Unmark's `local` / `needs key` tags | The tier tags on findings and on the lab's sample list |
| **P4** Explicit non-answer states with a stated reason | Unmark's catalogue of ~14 causes | Six error strings on `system.html`, each saying what happened, that nothing was guessed, and offering the way out as a button |
| **P15** Acknowledge the zero state | Hemingway, "0 weakeners. Nice work." | The Clean shield copy: "A clean result is normal…" |
| **Beat Unmark's badge contrast** | Every Unmark status badge fails AA (4.14, 2.86, 2.56:1) | Nothing here is under 4.5:1 as text or 3:1 as a graphic, and nothing is set below 13 px. Stated on `system.html` with Unmark's figures beside it |

Anti-patterns from teardown §6 that were refused outright: no declarative verdict sentence; no
rewrite or humanise control anywhere near a result; no exportable "proof"; no guidance addressed to
educators; no sentence painted as "the AI one"; no accuracy figure without its denominator; no caveat
in a footer accordion; no interstitial between the button and the result; no input limit revealed
after the paste; no upsell shaped like a finding; no verdict computed on text too short to support it;
no composite score.

---

## 4. Contrast ratios

Computed, not estimated. `system.html` recomputes them in the page at load, so they cannot drift from
the tokens. WCAG 2.2 wants 4.5:1 for body text, 3:1 for large text, 3:1 for non-text graphics.

**Light.** Page `#FFFFFF`, card `#F5F6F8`, inset `#ECEEF2`.

| Token | Hex | vs page | vs card | vs inset | Verdict |
|---|---|---|---|---|---|
| `--ink` | `#14181F` | 17.79:1 | 16.46:1 | 15.32:1 | text |
| `--ink-muted` / `--note` | `#4A5260` | 7.87:1 | 7.28:1 | 6.78:1 | text |
| `--sig-3` | `#4338CA` | 7.90:1 | 7.31:1 | 6.80:1 | text |
| `--sig-2` | `#6366F1` | 4.47:1 | 4.13:1 | 3.85:1 | **graphic only** — labels use `--sig-3` |
| `--sig-0` / `--sig-none` | `#52525B` | 7.73:1 | 7.15:1 | 6.65:1 | text |
| `--mark-clean` | `#15803D` | 5.02:1 | 4.64:1 | 4.32:1 | text on page and card, not on inset |
| `--mark-odd` | `#92400E` | 7.09:1 | 6.56:1 | 6.10:1 | text |
| `--mark-planted` | `#B91C1C` | 6.47:1 | 5.98:1 | 5.57:1 | text |
| `--brand` (buttons) | `#C2410C` | white on it 5.18:1 | | | text |
| `--focus` | `#0B7285` | 5.59:1 | 5.17:1 | | ring |
| `--line` | `#D4D7DE` | 1.44:1 | | | decorative only |

**Dark.** Page `#0E1116`, card `#171B22`, inset `#1F242D`.

| Token | Hex | vs page | vs card | vs inset |
|---|---|---|---|---|
| `--ink` | `#E7EAF0` | 15.69:1 | 14.33:1 | 12.92:1 |
| `--ink-muted` / `--note` | `#A3ABBA` | 8.19:1 | 7.47:1 | 6.74:1 |
| `--sig-3` | `#A5B4FC` | 9.49:1 | 8.66:1 | 7.81:1 |
| `--sig-2` | `#818CF8` | 6.34:1 | 5.79:1 | 5.22:1 |
| `--sig-0` | `#9CA3AF` | 7.45:1 | 6.80:1 | 6.13:1 |
| `--mark-clean` | `#4ADE80` | 10.85:1 | 9.91:1 | 8.94:1 |
| `--mark-odd` | `#FBBF24` | 11.33:1 | 10.34:1 | 9.33:1 |
| `--mark-planted` | `#F87171` | 6.84:1 | 6.24:1 | 5.63:1 |
| `--brand` | `#FB923C` | 8.36:1, near-black text on it 8.36:1 | | |
| `--focus` | `#22D3EE` | 10.46:1 | 9.55:1 | |
| `--line` | `#2B313B` | 1.45:1 | | decorative only |

Two deliberate departures from the scoring specification's palette table, both improvements:

1. **`--sig-2` in dark was raised** from the specification's implied value to `#818CF8`, which reaches
   6.34:1 against the page. The specification does not name a dark `--sig-2`.
2. **Opace orange is darkened for action.** `#FF6A13`, the live brand orange, carries white text at
   **2.87:1** and fails AA at every size. `#C2410C` carries white at 5.18:1. The brand is still
   recognisably itself; the button is legible. In dark, `#FB923C` with near-black text.

Hairlines are decorative and never the only boundary of a control. Buttons, the text box and the route
options carry an `--ink-muted` border; cards are separated by a surface change instead.

**Other accessibility checks run:** no horizontal scrolling at 375 px on any of the five pages
(`body.scrollWidth` is exactly 375); no horizontal scrolling at 640×512, which is 1440 at 200% zoom;
wide tables scroll inside their own container rather than the page; nothing interactive measures under
24 px at 375 px, against 15 such targets on the live tool; visible 3 px focus ring at 4 px offset on
every control; `prefers-reduced-motion` honoured; every state carries a text label and survives the
greyscale test on `system.html`.

---

## 5. Colour direction, and why it is not the live cream

The live tool puts cream cards and a dark results panel behind an orange brand. Three warm surfaces
plus an indigo signal ramp is one hue too many, and the signal meter has to be the only saturated
thing on screen or it stops reading as an instrument. So the tool surfaces are the neutral pair the
scoring specification measured its ratios against — `#FFFFFF` and `#F5F6F8` — and Opace enters through
the black header bar and the action colour only. That also keeps every published contrast ratio true;
changing the surface would have invalidated the whole table.

Everything measured is set in a monospace face and everything written by a person is not. That is the
one structural device on these pages, and it encodes something true: a figure in mono came out of a
run or a corpus, and a sentence in the text face is a claim somebody made. It is also why no headline
is a number — the largest thing on any result is a name, and the mono figures sit quietly in a detail
line beneath it.

---

## 6. The naming recommendation

Three schemes exist and `compare.html` presents all three without deciding. My recommendation, with
the reasoning, is on that page and repeated here.

**Build the Signal Scale.** It is the only scheme that separates a document at 0.52 from one at 0.94
without inventing a band boundary the model cannot support, and the only one whose words stay true
when the flag point moves. Its top level begins exactly at the flag point, so the words can never
contradict the tool's own decision — which is the failure both earlier schemes have, in opposite
directions.

**The honest case against it:** four unfamiliar words, the most expensive of the three to build, and
"Faint signal" on a document that really was AI-written will look weak to anyone who already knows the
answer. That last one is not a naming flaw. It is the model's recall showing through honest words
instead of being hidden behind confident ones.

**If the budget is small,** ship "Flagged / Not flagged" plus the section bars. It fixes the glance
failure, survives the threshold move, and the Signal Scale can be added on top later without
contradicting anything shipped.

**Do not keep the live ladder.** It fails two of its own three constraints, and at 0.587 it prints
"Leaning AI" two lines above its own measured string saying 15 of the 1,541 documents in that band
were AI.

---

## 7. What I deliberately did not solve

- **The two fiction false-positive figures.** `HANDOVER.md` §9.1 says 33 of 260 (12.69%);
  `thresholds.json` says 16 of 260 (6.15%). Both cite the same 5,558-document corpus. Every string in
  these mockups uses the thresholds file, so they publish 6.15%. Flagged on `system.html` rather than
  quietly resolved in favour of the flattering number. **Somebody has to reconcile these before either
  is quoted to a client.**
- **F3, the 33-point route disagreement.** The two routes gave 0.9183 and 0.5866 on the same document.
  That is a product decision, not a layout one: either stop describing the routes as giving the same
  answer, or stop showing a number outside the decision region. The mockups never claim the routes
  agree, and never print a route comparison, but they do not solve it. It needs the owner.
- **F13, the suite index.** Six of eight cards do nothing and are badged with internal release
  vocabulary. Out of scope for these five files, and a twenty-minute fix on its own.
- **The C2PA / Content Credentials path.** Copy is specified on `system.html`; no screen was built.
  The audit did not exercise it either.
- **The upload and example-loading tabs.** The live tool has three input tabs. These mockups show
  paste only, plus a "Load an example" button. Adding an upload tab is a known pattern and would have
  cost first-screen height that the redesign is trying to buy back.
- **Real per-section scores for a nine-section document.** None are measured anywhere in the
  repository. Rather than invent them, the checker uses the reproduction case throughout: a real
  512-word document with two real section readings, 0.4993 and 0.8082. The "clearly flagged" state is
  that same document under the proposed 0.80 flag point, which is why it doubles as the portability
  demonstration.
- **Motion.** There is one animation, on the running-state progress bar, and it stops under
  `prefers-reduced-motion`. The meter does not animate its fill. A result that grows into place invites
  the reader to watch a number climb, and there is no number to climb.
- **A screen reader was not run.** Announcements were written and wired; the experience is inferred
  from the markup, exactly as the live audit had to infer it.
- **The `"W"` rendering bug itself.** The audit diagnosed it to
  `integrity-controller.ts:327` ignoring `evidence.document_level`. The display rule is stated here and
  the mockups obey it, but the fix is a website change and this session does not touch the website.

---

## 8. Reproducing the measurements

Serve the folder and read the figures out of the page. Nothing here needs a build.

```
cd docs/programme/design/mockups
python3 -m http.server 8791
```

Word counts were taken with a tree walker that skips `.sr` text, skips the contents of any closed
`<details>`, and skips anything with `display: none` — so a disclosure counts as its summary line only,
which is what a reader actually meets. Depths are `getBoundingClientRect().top + scrollY` minus the
height of the mockup bar. Contrast is the WCAG 2.x relative-luminance formula, implemented in
`system.html` and cross-checked against an independent script.

---
---

# Second pass — 29 August 2026

**Agent UI-3.** Mockups only. Nothing in `opace-website/` or `implementation/` was read for edit or
changed, no build was run against either, and no model was executed.

The owner reviewed the first pass and gave four instructions: build everything on the Signal Scale and
drop the other two naming schemes; build the checker; keep `system.html`; and, overriding everything,
**"it must look good and like the current Opace look and feel, not something separate."** He also said
the results were still too text-heavy — *"surely we can display more visually than lots of text comments
hidden inside expand sections?"*

Three things changed. The token set was thrown away and rebuilt from the live site. Four blocks of prose
became graphics. Every accuracy figure was replaced, because a corpus measurement landed after the first
pass was built and three of the published numbers were wrong.

Everything else survives: the refusals, the denominators, the three separate axes, no number in any
level name.

---

## S1. The real Opace tokens, and where each one came from

The first pass built its own neutral palette and said so. That was reasonable for a concept and it was
the main thing to fix. Every value below was read out of the live stylesheets in
`opace-website/astro-latest/src/styles/`, then cross-checked against the live checker page and the
audit screenshots. None was matched by eye.

| Token | Value | Read from |
|---|---|---|
| Display face | `Outfit`, 700–760, tracking −0.04em to −0.05em | `tokens.css` `--font-display` |
| Body face | `Plus Jakarta Sans`, 400–800 | `tokens.css` `--font-body` |
| Data face | `SFMono-Regular, Consolas` | `tools.css` `.tools-eyebrow` |
| Brand orange | `#fb700a` | `tokens.css` `--color-primary` |
| Orange hover | `#e56400` | `tokens.css` `--color-primary-hover` |
| Opace blue | `#0068b3` — the file's own comment calls it the trust colour | `tokens.css` `--color-secondary` |
| Paper ground | `#f2ede6` | `content-integrity-tools.css` `--integrity-paper` |
| Cream panel | `#f4efe8`, border `#d9d0c5`, rule `#bdb4a9` | `.integrity-panel` |
| Dark hero | `#0d0f10` with a radial violet wash and a 48 px grid, masked out at 84% | `.tools-hero`, `::before`, `::after` |
| Dark band | `#111516` | `.integrity-band` |
| Dark results | `#15191a`, card `#1a1e1f`, inset `#202526`, hairline `#3b4142` | `.integrity-results`, `.integrity-product-grid`, `.integrity-result-list` |
| Ink | `#171a1b`, headings `#0f1115`, muted `#505758` | `content-integrity-tools.css`, `tokens.css` |
| Status colours | pass `#185c3b` on `#d9f2e5`, attention `#70400e` on `#f8e5c7`, unsupported `#702d28` on `#f6dcd9` | `.integrity-status` |
| Panel radius | 22 px; inner 14 px | `.integrity-panel`, `.integrity-evidence` |
| Panel shadow | `0 24px 55px rgb(21 24 25 / 10%)` | `.integrity-panel` |
| Buttons | pill, `min-height: 50px`, `font-weight: 800`, `font-size: .84rem`, `translateY(-2px)` on hover | `.tools-button` |
| Field borders | 2 px `#9aa09f`, radius 10–14 px | `.integrity-panel textarea` |
| Focus ring | 3 px `#0b7285`, 4 px offset | `content-integrity-tools.css` `:focus-visible` |
| Eyebrow | `750 .69rem` mono, `letter-spacing: .13em`, uppercase, `#8b3f0b` on light and `#ffab78` on dark | `.tools-eyebrow` and its per-section overrides |
| Hero kicker | `900 .63rem`, `letter-spacing: .2em`, orange, with a pulsing 6 px dot | `.tools-hero-kicker` |
| Section numbering | `01 / INSPECT YOUR DRAFT` | `checker.astro` line 18, `index.astro` lines 16–19 |
| Split heading | heading left, standfirst right, `align-items: end` | `.tools-heading--split` |
| FAQ pattern | heading left, disclosures right, `+` / `−` markers in `#a5481d` | `.integrity-faq__grid` |
| Numbered steps | `::before { content: "0" counter(steps) }` in `#9a4a14` | `.integrity-steps` |
| Gradient emphasis word | `linear-gradient(135deg, #ffab78, #fb700a 58%, #ff8f3b)` clipped to the text | `.tools-hero h1 em` |

**Shell width.** The live `.tools-shell` is 1400 px with 48 px gutters. The mockups use 1240 px with the
same gutter clamp, because a paste box at 1400 is wider than anyone wants to type into. That is the one
layout value that was changed rather than copied, and it is the only one.

**One addition, derived rather than invented.** Axis A needs a hue that is not the action orange — a
signal meter painted in the brand colour reads as approval, which is the one thing the engine must never
say. It uses Opace Blue at three steps: `#00456f`, `#0068b3`, `#2b76ad` on light, and `#8ecbf5`,
`#5aaee6`, `#3d8dc4` on dark. All three light steps and all three dark steps are on `system.html` with
their measured ratios against every ground.

**Fonts.** These files fetch nothing, so Outfit and Plus Jakarta Sans render only where the machine
already has them. The stacks are the site's own, so the built page will match exactly; the mockup falls
back to the system sans on a machine without them.

**Two type sizes are below 13 px, and both are verbatim Opace:** the eyebrow at `.69rem` (11.04 px) and
the hero kicker at `.63rem` (10.08 px). Everything else on every page is at least 13.12 px, checked in
the rendered page. The first pass's "nothing below 13 px" rule was kept everywhere the house style did
not contradict it, and the two exceptions are section labels whose content is repeated verbatim in the
heading beside them.

---

## S2. The orange, resolved

The first pass found Opace orange failing AA and substituted `#C2410C`. **That was the wrong fix, and it
tested a pairing the live site does not use.**

`tools.css` ships `.tools-button--primary { color: #111415; background: #fb700a }` — near-black on
orange, not white on orange. Measured:

| Pairing | Ratio | Verdict |
|---|---|---|
| White on `#fb700a` | **2.83:1** | fails at every size — this is what the first pass measured |
| `#111415` on `#fb700a` | **6.54:1** | **passes AA at every size** — this is what Opace already ships |

So no substitute is needed. The brand orange is kept unchanged, and the fix is the text colour on it.
Where small orange *text* is required, the site's own darker steps are used — they are already in
`content-integrity-tools.css`.

| Value | Used for | Measured |
|---|---|---|
| `#fb700a` | Primary button fill, hero kicker and its dot, mockup bar rule, the H1 gradient, panel hover borders. **Always with `#111415` on it.** | 6.54:1 with `#111415` |
| `#8b3f0b` | Eyebrow labels and links on paper and white. Small text. | 6.41:1 on paper, 7.46:1 on white |
| `#a5481d` | Disclosure `+` / `−` markers, step numbers, link hover. | 5.09:1 on paper, 5.92:1 on white |
| `#ffab78` | Eyebrows, links and the gradient's light stop on any dark surface. | 9.93:1 on the dark band, 10.38:1 on the hero |

`system.html` §02 shows both pairings side by side as real pills, recomputes all four ratios in the page
at load, and states where each variant is used. **No orange was restyled and no new orange was
introduced.** `#C2410C` appears nowhere.

---

## S3. Four blocks of prose, replaced by graphics

The owner's substantive complaint. The test applied throughout: a competent SEO or copywriter who reads
nothing still gets the right answer.

### S3.1 The section list → **the document strip**

**Was:** a list of rows, each with a small meter and a mono reading, plus a 43-word paragraph explaining
why the strongest section rather than the average.

**Now:** the signature element of the whole redesign, and the first thing in the result. The document is
drawn as blocks laid left to right. **Block width is that section's share of the words. Block height is
that section's reading. One dashed flag line runs across all of them.** The y-axis is the Signal Scale
itself — four equal bands labelled No signal / Faint / Some / Strong — so the flag point is always the
same mark on the picture whatever its value, and a threshold move slides the bars under a line that does
not move.

The tallest block is outlined and is the verdict. A reader who reads nothing sees which part of their
document carries the signal, how far it is from the line, and that one part is worse than the rest.

Each block is a real `<button>` with `aria-pressed` and its own screen-reader sentence — *"Section 2 of
2, 263 words, reads 0.8082, faint signal, the strongest section. Show it in my text."* — and clicking it
highlights that section in the draft echo below. It is not a picture with a caption.

Only two sections are drawn on `checker.html`, because only two real section readings exist anywhere in
this repository (0.4993 and 0.8082, the reproduction case). `system.html` carries a nine-section version
**explicitly labelled "Shape only · not measured"**, so a developer can see the layout hold as the count
grows without anyone mistaking invented readings for data.

### S3.2 "How good is this?" → **the accuracy plate**

**Was:** an 85-word run-on sentence of statistics in a grey box, with the fiction worst case tacked on
the end.

**Now:** a plate that reads like a lab methods line. Three columns on one surface:

- **Detection** as a proportion bar — `877 found` filled, `45 missed` as a hatched remainder, with
  `877 / 922` printed beside the percentage.
- **False positives** as a **100-cell unit grid**. One cell is one document in a hundred, so
  `56 / 4,636 = 1.21%` reads as "about one square in a hundred" with no arithmetic.
- **The worst case, human fiction, on the identical grid at the same scale** — eleven cells against one.
  The nine-fold difference is visible in a glance and is not averaged into the headline anywhere.

The corpus line sits in the header in mono: `5,558 long-form documents · 922 AI, 13 models · 4,636 human
· never seen in training`. Two tags close it: `LONG-FORM ONLY` and `NOT MEASURED` for short web copy.

The teardown's finding is that **no competitor publishes a false-positive rate with a denominator
anywhere a visitor can see it.** In the first pass that advantage read as a wall of numbers. It now reads
as competence, because it is drawn.

### S3.3 "What we checked" → **the check strip**

**Was:** a five-row table of sentences, behind a disclosure. A reader met a seven-word summary line.

**Now:** six cards, always visible. Each carries an icon, a **one-word state** and a tag saying **where
it ran** — `this device` or `our EU server`. The sentence is behind a 3-word `What it says` disclosure
inside the card, not a tooltip: it is keyboard-operable and it is never needed to get the right answer.

States are `Read`, `Clean`, `Found`, `Not run` and `Unavailable`. **`Not run` and `Unavailable` are
first-class**, drawn with hollow dots rather than filled ones, because "did not run" is a frequent and
honest outcome for this product and must never look like a pass. Unmark's per-detector rows with
capability tags are the reference; unlike Unmark's, every badge here passes AA.

### S3.4 The watermark → **one sentence and a rail**

**Was:** three paragraphs behind a disclosure, to say "no mark found, and that proves nothing."

**Now:** a strip with one heading, one sentence, and the reading drawn as a dot against the `0.5 — no
mark` coin-flip tick, which is exactly where it lands. A link opens the wrong-key collapse in the lab as
the proof. The three paragraphs became 16 words and a picture.

---

## S4. The corrected figures

**Read from `CORPUS-RECONCILIATION-2026-08-29.md` §1.1, §5 and §6.1–6.2 directly, not from the brief.**
Three of the first pass's published numbers were wrong. They are held in one object,
`FIGURES` in `_source/shared.js`, so no page can drift from another.

| Figure | First pass showed | Now | Why it changed |
|---|---|---|---|
| AI long-form detected, server route | `835 / 922 = 90.6%` | **`877 / 922 = 95.1%`** | The old figure is opening-only and pre-segmentation. §8.2 retires it. |
| Human long-form wrongly flagged, server | `64 / 4,636 = 1.38%` | **`56 / 4,636 = 1.21%`** | Same reason. |
| Human fiction wrongly flagged | `16 / 260 = 6.15%` | **`29 / 260 = 11.2%`** | 6.15% predates segmentation, which nearly doubles it. 12.69% is the fp32 figure at 0.980, not the shipped point. §5. |
| Browser route | not published | **`621 / 654 = 95.0%` [93.0–96.4], `1.54%` wrongly flagged, corpus-reweighted from `43 / 1,770`; fiction `28 / 260 = 10.8%`** | First segmented browser measurement this project has had. §6.2. |
| Length effect | "below 200 words we miss roughly half" | **`620 / 654 = 94.8%` full, `552 / 654 = 84.4%` cut to 512 words** | The old claim had no denominator. §4.2. The 19%-at-100-words figure is omitted because §1.1 records its denominator as unrecorded. |
| Short marketing, SEO and social copy | not mentioned | **No figure at all, said plainly** | Every sample the programme owns sits inside the training set. §1.1, §3. |

The first pass's "short human writing was not wrongly flagged once in 400 samples" is **dropped** — it is
not supported anywhere in the reconciliation.

**Every published figure now carries the word "long-form"**, in the stat caption, the plate header and
the closing tags. The unmeasured-register admission is on the plate, not in a footnote.

The threshold appears in exactly two places, both as data rather than as a label: the detail line beside
the strip (`flag point 0.9840`) and the mockup control that moves it. No level name contains a digit.

---

## S5. Measured against the first pass

Same method as before: a tree walker that skips `.sr` text, skips the contents of any closed `<details>`,
and skips anything not displayed; depths are `getBoundingClientRect().top + scrollY` minus the height of
the mockup bar, which is excluded from every figure because it is not part of the product. Rendered in
headless Chrome at 375×812 and 1440×900.

| | Live today | First pass | **Second pass** |
|---|---|---|---|
| Words before the run button | 1,112 | 79 | **78** ✔ |
| Screens to the run button, 375 px | 6.5 | 1.08 | **1.06** ✔ |
| Scroll depth to the paste box, 375 px | 2,608 px | 352 px | **381 px** |
| Whole page height before a run, 375 px | 12,768 px (15.7 screens) | 1,429 px (1.8) | **1,530 px (1.88)** |
| Words in the result, before opening anything | 1,523 | 351 | **422** ✘ |
| Result block height, desktop | 4,359 px | 1,389 px | **2,952 px** |
| Whole-page copy with every disclosure opened | ~2,635 | not recorded | **1,073** |
| Interactive targets under 24 px at 375 px | 15 | 0 | **0** ✔ |
| Horizontal scroll at 375 px | — | none | **none, all five pages** |
| Horizontal scroll at 640×512 (1440 at 200%) | — | none | **none, all five pages** |

**Two figures moved the wrong way, both on purpose, and both are the same trade.**

The result is 422 visible words against 351, and the result block is 2,952 px against 1,389 px, because
the check strip and the accuracy plate are now on the screen as graphics instead of behind disclosures.
**74 of those 422 words were hidden in the first pass.** Counting the same scope it is **348 against
351** — the copy did not grow, it came out of the drawers, which is what the owner asked for. The height
follows the same trade and is still 32% shorter than live.

The page height at 375 px went from 1,429 px to 1,530 px, which buys the dark Opace hero and the example
graphic beside the paste box. 1.88 screens against 15.7 live.

**Other checks run:** no overflow at 375 px, 640×512 or 1440 px on any page; nothing interactive under
24×24 except one inline link inside a running sentence on `system.html`, which WCAG 2.2 SC 2.5.8 exempts;
a visible 3 px focus ring at 4 px offset on every control; `prefers-reduced-motion` honoured, and the
only animations are the hero kicker dot and the running-state bar; a `role="status"` element announces
one sentence naming the level, the marks, the notes and the section count; every state carries a text
label and survives the greyscale button on `system.html`; heading order is clean on all five pages;
`lang="en-GB"` throughout. No console errors on any page. **A screen reader was not run** — the
announcements are written and wired, and the experience is inferred from the markup, exactly as the live
audit had to infer it.

---

## S6. What each file is now

| File | What changed |
|---|---|
| `index.html` | Rewritten. Opens on what changed, then the corrected figures with the plate itself, then the before-and-after table including the two numbers that went the wrong way, then the four screens. |
| `checker.html` | Rebuilt. Dark Opace hero, cream tool panel with an example of the result graphic beside it, and a result that opens on the document strip. Six states, unchanged. |
| `system.html` | Rebuilt on the real tokens. New §01 says where every token came from and names the file. New §02 settles the orange with both pills drawn and four ratios computed in the page. New §05 documents the three evidence graphics, including the nine-section strip labelled as unmeasured. |
| `watermark-lab.html` | Retokenised. Structure unchanged — the wrong-key experiment is still the hero. |
| `compare.html` | Retokenised and **reframed as a decision record**, not an open question: "Why the Signal Scale won". The other two schemes now appear nowhere else in the set. |

The five files are still generated from one stylesheet and one script, inlined at assembly time.
**Edit `_source/` and run `python3 _source/build.py`.** A hand edit to one of the five HTML files would
silently desynchronise it from the other four.

---

## S7. Still not solved

- **Real per-section readings for a document with more than two sections.** None exist in this
  repository. The nine-section strip on `system.html` is labelled "Shape only · not measured" rather
  than quietly invented.
- **F3, the 33-point route disagreement.** `CORPUS-RECONCILIATION` §6.2 now measures it properly —
  0.62% of documents disagree at the shipped flag point, 11.14% at 0.8082 — but the mockups still never
  print a route comparison, and it remains an owner decision.
- **The C2PA path.** Copy is specified and the check now has a visible `Not run` card. No screen was
  built.
- **Upload and example-loading tabs.** Paste only, plus "Load an example".
- **The `"W"` rendering bug.** Diagnosed to `integrity-controller.ts:327`. The display rule is stated
  and obeyed; the fix is a website change and this session does not touch the website.
- **A screen reader was not run.**

---

## S8. Claim slots — added after the rebuild, on the coordinator's decision

**Decision:** sentences that make a measurable claim are exported from the shared engine and
`@opace/watermark-lab`, never authored in the page. One value living in two places produced five
separate defects in a day, and the guard that catches drifted claims reads the *website* source — so a
second copy anywhere else escapes the only control there is. A drifted threshold fails loudly; a drifted
claim quietly becomes false.

The mockups now treat every such sentence as a **slot**, marked in the markup and filled at render time
from a stand-in that mirrors `src/lib/local-signals/measured-figures.ts` accessor by accessor. **The ids
are the real accessor paths**, so the three sessions fitting copy to this structure can wire them without
inventing names.

**Press "Show claim slots" in the black bar** on `checker.html`, `system.html`, `watermark-lab.html` or
`index.html`. Every slot outlines with its id: blue where a source exists, red where one does not.

| Page | Slots | Of which unsourced |
|---|---|---|
| `checker.html` | 24 | 6 |
| `system.html` | 17 | 6 |
| `index.html` | 11 | 0 |
| `watermark-lab.html` | 7 | 0 |

**The boundary held.** Only claim sentences come from the package. Headings, framing, the plain-English
explanation of *why* something reads the way it does, the empty and waiting states, the section list and
strip legend, the level names themselves, and every error string stay in the page. `system.html` §09
prints both lists, and the table of **five sentences that did both jobs and how each was split** — the
assertion into the slot, the explanation left in the page. No claim was written into a page because a
slot was awkward.

**One thing flagged rather than decided.** The six `What it says` lines on the check cards assert what a
check can and cannot establish, so by the rule they are claims — but **no exported source for them
exists**. They render as `methodClaim('unicode')` and friends, outline red under the toggle, and are
called out on `system.html` §09 for the owner to place. The method registry looks like the home, since
each check already carries a version string and a status.

### S8.1 The figures moved again, and the mockups follow the document

`CORPUS-RECONCILIATION-2026-08-29.md` was revised while this pass was building. **The browser row is now
a full-corpus measurement, and the mockups use it.** Re-verified against the file rather than against
any brief.

| | Was, earlier today | Now published |
|---|---|---|
| Browser AI detected | `621 / 654 = 95.0%` [93.0–96.4], stratified sample | **`877 / 922 = 95.1%`, whole corpus — identical to the server, document for document** |
| Browser human wrongly flagged | `1.54%`, reweighted from `43 / 1,770` | **`90 / 4,636 = 1.94%`, measured** |
| Browser fiction | `28 / 260 = 10.8%` | unchanged |

The reconciliation records the correction itself: the 1.54% was a reweighted estimate and the measured
value is 1.94%. **The browser route is the more false-positive-prone of the two, by about 0.7 points at
the shipped flag point**, and `system.html` §05 now says so beside the both-routes table rather than
letting a reader assume the routes cost the same. Server figures are unchanged.

### S8.2 The Claude watermarking copy, corrected twice

The wording narrowed twice during this session. **What the mockups publish is the final version**, on
`watermark-lab.html` beside the status badge:

> Anthropic has committed that Claude models launched on or after 2 August 2026 will support text marking
> at launch, and says it is working to add marking to models released before that date. As of 29 August
> 2026 no Claude model has launched after that cutoff, Anthropic publishes no per-model status, and there
> is no public detector. **Whether any given piece of Claude output carries a mark today is not publicly
> established.**

Cited to the support article, `https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content`,
read 29 August 2026. The short surface — the check card on `system.html` — carries the last sentence
alone, which is where the whole point lives.

**Nothing in this build ever contained** "Anthropic has watermarked Claude's text since 2 August 2026",
or any present-tense claim that Claude output is marked today.

**Three prohibitions observed:**

- **The paraphrase figure (roughly 70% falling to 4–5%) appears nowhere.** Single author, no replication,
  no denominator, no runtime.
- **No present-tense claim that Claude output is watermarked today**, on any page.
- **"OpenAI does not watermark text" is not asserted.** The lab now reads "No provider has published a
  key, and none documents a public detector" — a documented absence rather than a positive claim about
  somebody else's product.

**What the lab does say about paraphrase**, because the finding is real even though the number is not
usable: a new **§03 Robustness** section prints two columns side by side — *Measured here* (the wrong-key
collapse, the position floor) and *Not measured here* (paraphrasing, translation, a determined strip
attempt), each carrying a red `not measured` tag. Paraphrasing is named as the attack most likely to
defeat the technique at the lengths people actually paste, with the admission that no measurement of our
own exists and that somebody else's figure will not be quoted for it. **An unmeasured attack is drawn as
unmeasured, never left out** — an absent row reads as an absent problem.

**And the two futures are kept apart**, on the lab and in the check card: a published key activates the
mathematics already built here and Opace verifies it in the browser; a provider detection endpoint makes
Opace a client of Anthropic's service and does not use the lab's mathematics at all. **Only a published
key activates what has been built.**

### S8.3 One thing in this folder is not mine

`watermark-lab-v2.html` and `watermark-placement-map.html` were written into
the mockups directory by another session at 17:06 and were not touched here.
**`watermark-lab-v2.html` currently contains both prohibited strings** — the "Anthropic, Google and
OpenAI keep their keys private" assertion and a paraphrase figure. Whoever owns that file needs the same
correction.

---

## S9. Feature loss found and closed — file upload, and five others

**The owner spotted it: "why has upload and examples vanish and only plain text allowed now?"** He was
right about upload. I checked rather than agreeing: the example loader was present the whole time
(`#samplebtn`, "Load an example"), but it offered **one** example where the live tool offers **four**, so
it was a reduction rather than a deletion.

**Upload was a genuine deletion, and it was the expensive kind.** The C2PA provenance check runs only on
uploaded images and PDFs — pasted text is never given a provenance verdict. A checker with no file input
cannot run provenance at all, so the redesign was carrying a status card that would read `Not run`
forever with no way for a visitor to change it. **It would have shipped a dead check**, and removed the
only route for Markdown, HTML, JPEG, PNG, WebP and PDF.

I then enumerated every control on the live checker rather than fixing only what was reported. **Five
more losses** turned up.

### S9.1 The ledger — every live capability, and where it went

| Live capability | Disposition |
|---|---|
| Paste text | Kept, primary |
| **Upload a file** | **Was deleted. Restored.** Accept list preserved character for character. |
| **Load an example** — four named drafts | **Was reduced to one. Restored to four.** |
| Invisible Unicode check | Kept — check strip |
| Lookalike characters check | Kept — check strip |
| Writing suggestions check | Kept — check strip, axis C |
| **Protected content check** | **Was deleted. Restored** as its own card with a lock glyph. |
| Named signals model + route radios | Kept |
| Watermark scan | Kept — check strip and the watermark strip |
| File check (provenance stub) | Kept, and now reachable, which it was not |
| **Cancel inspection** | **Was deleted. Restored** as "Stop this check" in the running state. |
| **Unicode fix preview — before/after + apply** | **Was deleted. Restored** as its own before/after panel. |
| **Download JSON receipt** | **Was deleted. Restored.** |
| **Print / save evidence summary** | **Was deleted. Restored.** |
| **`<noscript>` fallback** | **Was deleted. Restored.** |
| Per-check on/off checkboxes (6) | **Deliberately not restored** — see below |
| "Analyse first 50,000 characters" | **Deliberately not restored** — see below |
| "Protect these facts (planned)" disabled button | Not restored; it is a disabled stub for unbuilt work |
| Highlights in your draft panel | Deliberately deleted, recorded in §S3.1 and §10 of `system.html` |
| Sentence-level highlighting | Deliberately deleted, recorded |
| Open methodology / Review Claude readiness links | Kept |

**Two deliberate omissions, with reasons, so they are not the next thing to go missing quietly.**

- **The six per-check toggles.** The live tool lets a visitor switch individual checks off. Those toggle
  rows are five of the fifteen sub-24 px tap targets the audit found at 375 px, and the redesign reports
  every check with its own state anyway, so switching one off buys nothing a reader cannot get by not
  reading that card. **If the owner wants them back, they belong in a disclosure below the tool, not in
  the first screen.**
- **"Analyse first 50,000 characters".** The redesign refuses truncation on principle — a reading of the
  first two-thirds is not a reading of your document — and says so in the over-length error string. That
  is a change of behaviour, not an oversight.

### S9.2 How the three ways in are designed

**Not tabs.** The live tool uses a three-tab tablist with a 15-word legend explaining it; Unmark uses
tabs too. Both hide two affordances behind a click, which is exactly how the file input went missing
without anyone noticing. **All three are visible at once instead:**

- **Paste** — the box, unchanged, still the primary affordance and still in the first screen.
- **A file** — an `Open a file` button in the box's footer, and the box itself is a drop target with a
  visible cue on drag. A gesture with no visible affordance does not exist for most people, so the button
  carries it and the drop is the shortcut.
- **An example** — a `Load an example` menu of the four live drafts, each with a one-line note saying
  what it demonstrates. The Unicode carrier sample is the only way a visitor ever watches the
  hidden-character check fire, which is why restoring one example was not enough.

Choosing a file **replaces the paste box with a card** naming the file, its type, its size, `read on your
device`, and which checks apply to it. The input mode is never ambiguous, and there is a `Remove` button
back to the box.

### S9.3 The file result, handled honestly

A new sixth state, **`Result: image file`**, is on the mockup bar.

The result **leads with the provenance card** instead of the document strip, because for an image that is
the check that ran: signed by, made with, created, edits recorded, plus the caveat that the signature was
not checked against a trust list, so a credential is a claim rather than a guarantee.

The other six checks say **`Not for images`** — a state of its own, in a neutral grey pill, **with no
"where it ran" tag at all**, because printing a location for a check that cannot apply reads as a
failure. Nothing on that screen looks like six things went wrong. The accuracy plate, the watermark strip
and the fix preview are hidden rather than shown empty. The screen-reader announcement says the file was
read on the device, names the provenance result, and states that the text checks do not apply.

Symmetrically, pasted text now shows **Content Credentials: `Not for text`** rather than `Not run` —
which is what the live tool's own copy says, and more honest than the first rebuild's version.

### S9.4 What it cost, measured

| | First rebuild | **With upload and the rest restored** |
|---|---|---|
| Words before the run button, 375 px | 78 | **86** |
| Screens to the run button, 375 px | 1.06 | **1.18** |
| Whole page height before a run, 375 px | 1,530 px (1.88 screens) | **1,551 px (1.91)** |
| Words in the result | 422 | **503** |
| Interactive targets under 24 px | 0 | **0** |
| Horizontal scroll, four states × three widths | none | **none, 12 of 12 clean** |

The run button moved from 1.06 to 1.18 screens, and the result gained 81 words — the fix preview, the
protected-content card and the receipt line. **That is what a deleted input mode and five deleted
controls actually cost**, and it is the honest price of not shipping a dead check. Against the live tool
the figures are still 1,112 words and 6.5 screens.

### S9.5 The lesson worth recording

The first rebuild worked from the audit's keep list. **Upload was not on it**, so nothing flagged its
removal — a keep list is not an inventory, and the difference cost a whole input mode plus five controls.
Anything rebuilt from a critique needs the critique *and* a full enumeration of what exists, diffed
deliberately. The ledger in §S9.1 is that enumeration; it should be re-run against the live page before
this is considered done.

---

## S10. The third claim class — `world`

The claim-slot toggle had two colours. It now has three, because there are three classes and they
differ by **what can catch them when they go wrong**, which is the only reason to separate them at all.

| Class | Asserts | Guarded by | Constructor | Colour |
|---|---|---|---|---|
| `measured` | a figure we produced | its denominator — the accessor throws rather than print a rate that has lost one | `MEASURED` accessors | navy `#00456f` / `#8ecbf5` |
| `boundary` | what **our** check can and cannot establish | a predicate over our own shipping configuration, checkable at build | `methodClaim()` | teal `#0a6d7e` / `#5fc9dd` |
| `world` | a fact about **somebody else's** system | nothing we own. A dated re-check only | `worldClaim()` | amber `#7a4e0c` / `#e8b45c` |

Both new colours are Opace values — teal is `--pillar-grow` darkened to `5.15:1` on paper, amber sits at
`6.17:1`. Each passes AA as text and as a badge fill, in both themes.

**`claim--unsourced` is gone.** It was a provisional red marking for the six `What it says` lines, and it
was the wrong shape: those are `boundary` claims, and the honest problem with them is that the predicate
is unwritten, not that the class is unknown. They now render teal, and the outstanding predicate is
stated in the key rather than encoded as a colour.

**A world claim is not an unsourced claim.** It is sourced to somebody we do not control, which is a
different failure mode and gets its own colour. Painting the two the same would hide the one distinction
the class exists to make.

**The date is shown in the outlined state**, not just stored: `worldClaim('claude.commitment') · verified
2026-08-29`. An out-of-date world claim is a false claim rather than a slightly old one, so the freshness
is part of the claim rather than metadata about it.

### S10.1 Degradation, documented and implemented

`system.html` §09 now carries the lapse behaviour, because a developer reading that page is the person
who will meet it. On lapse a world claim **degrades** — it does not hide and it does not freeze in the
present tense:

- Status is replaced with **Not re-checked**.
- The gloss is re-attributed to the date it was true, and gains "This has not been re-checked in N days
  and may have changed."
- The toggle badge flips to `NOT RE-CHECKED, N days` in the failure colour.
- **Backstop at review date + 30 days: the build fails** with `[[STALE: …]]`, the same visible-failure
  token as `[[MISSING: …]]`.

`worldClaim()` computes all of this from the slot's own `verifiedAt` and `reviewDays` at render time.
Tested against a simulated 47-day-old claim; both the fresh and degraded forms render correctly.

**One thing the implementation surfaced.** A mechanical present-to-past rewrite mangles proper nouns and
irregular verbs — the first attempt produced "On 13 July 2026, anthropic says it will soon offer…".
**A slot therefore carries both glosses**, the present-tense one and a hand-written past-tense one.
Where no past gloss exists the fallback is dated attribution ("As at 13 July 2026: …") — clumsier, but
never ungrammatical and never asserting the present tense. That is recorded in §09 as a requirement on
the slot rather than left as a rendering bug to rediscover.

### S10.2 Four world claims exist in these files already

The class is not documented in the abstract. The four provider sentences on `watermark-lab.html` are
world claims and are now tagged as such, so the toggle demonstrates all three colours on a real page:

`worldClaim('providers.noPublishedKey')`, `worldClaim('claude.commitment')`,
`worldClaim('claude.launchSet')`, `worldClaim('claude.markStatus')` — all verified `2026-08-29`,
30-day review.

Slot totals: **64** across the four pages — 47 measured, 13 boundary, 4 world.

| Page | measured | boundary | world |
|---|---|---|---|
| `checker.html` | 18 | 7 | 0 |
| `system.html` | 11 | 6 | 0 |
| `index.html` | 11 | 0 | 0 |
| `watermark-lab.html` | 7 | 0 | 4 |

**The provider status panel is not merged into these five files.** It belongs to another session and
stands alone. `system.html` §09 points at
`PROVIDER-STATUS-PANEL-2026-08-29.md` and `provider-status-panel.html`, records that nine of its twelve
claim-bearing lines are world claims, and states that none of its twelve slots is among the 64 here.

Re-audited after the change: no overflow and no under-24 px targets at 375, 640×512 or 1440 on any page,
across all four checker states. The only flags remaining are two inline links inside running sentences,
which WCAG 2.2 SC 2.5.8 exempts.
