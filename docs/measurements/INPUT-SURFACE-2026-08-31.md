# What text actually reaches the model, path by path (2026-08-31)

Measurement and report only; no threshold or behaviour change is made here. Follow-up to
`ESCALATION-ARM-2026-08-31.md` §1, which found that the shipped pair flags 22.5% of the
structured human corpus when raw markdown is scored and that stripping the syntax un-flags
59 of 60 — owner-directed to establish which real input paths that exposure lives on.

## Verdicts up front

1. **No input path normalises anything before the model, on either route.** The tokeniser
   receives the textarea's exact contents: markdown syntax, and for `.html` uploads the raw
   tags, verbatim.
2. **The exposure is markdown syntax specifically, on two real paths**: a markdown-carrying
   paste (ChatGPT-style copy button, or a writer pasting their own markdown source) and a
   `.md` file upload. On the identical 600-doc human sample the flag rate is **0/600 = 0.0%
   as a plain-text paste, 135/600 = 22.5% as raw markdown, 1/600 = 0.2% as raw HTML** — the
   `##`/`-` characters, not markup in general, are what the model reads as AI evidence.
3. The `.html` upload path is FP-safe for humans but **gives detection away**: on the
   identical AI sample, raw HTML scores 503/600 = 83.8% against 523/600 = 87.2% stripped
   and 545/600 = 90.8% raw markdown — a 7pp giveaway to anyone who saves an AI draft as
   HTML before uploading.
4. **The `contentType` field the UI tracks never reaches the model path.** It is metadata
   for the deterministic rules core only, so a `.md`/`.html` upload is scored by the AI
   model exactly as if its syntax were prose.
5. Every published accuracy figure was measured on plain prose; production can receive
   markdown and HTML. The published figures are true of the surface they were measured on
   and silent about the other two.

## 1. Code facts, path by path

All references are to the website checkout
(`/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest`) and the
reference server
(`implementation/services/local-engine/research/model-shrink/reference-server`).

**The single text source.** Whatever is in the textarea at submit time becomes the run
snapshot: `integrity-controller.ts:852` — `const snapshot:RunSnapshot={content:input.value,
contentType,uiChecks:…,structureHtml:pastedStructure.current()}`. The model runs on
`snapshot.content` and nothing else: browser route `integrity-controller.ts:860` →
`localSignals.run(snapshot.content,…)` → `local-signals-ui.ts:455` `session.run(text,…)`;
server route `local-signals-ui.ts:440` `server.scoreOnServer(text,…)` →
`server-route.ts:393,411` → `checkOnServer` → `server-route.ts:200`
`body:JSON.stringify({text})`.

**No normalisation, browser.** `segments.ts:68`: "Nothing is normalised, lower-cased or
stripped first." The segmentation feeds the tokeniser the raw characters.

**No normalisation, server.** `app.py:1021` `text = body.text` → `_score_document` →
`segment_text` (its `segments.py:210` carries the same sentence: "normalised, lower-cased
or stripped first" — nothing is) → `app.py:890` `_score` tokenises the segment text
directly. Between receipt and scoring the server checks only length, word count, quota and
tokens — never content.

**(a) Plain-text paste.** The textarea keeps the clipboard's `text/plain` flavour only
(`paste-capture.ts:4-5`). Text copied from a rendered web page or Word arrives as bare
lines — headings and list items keep their words, lose their syntax. The model sees prose.
`contentType` stays `"plain_text"` (`integrity-controller.ts:846`).

**(b) Markdown-carrying paste.** A ChatGPT-style copy button places markdown *source* in
`text/plain`, so `##` / `-` / `**` land in the textarea as literal characters and reach
the tokeniser verbatim on **both** routes. The UI cannot tell: the input listener at
`integrity-controller.ts:846` sets `contentType="plain_text"` for every paste, and
`contentType` would not matter anyway (below).

**(c) Paste-HTML capture.** The clipboard's `text/html` flavour, when present, is held by
`pasteCapture` (`paste-capture.ts`) and used in exactly one place:
`integrity-controller.ts:634` `findDocumentTells(snapshot.content,snapshot.structureHtml)`
→ `document-tells.ts:661-662` (`structureTextFromHtml`, tells only). It affects the shape
tells' structure inference and **never the model input** — `structureHtml` is not passed
to `localSignals.run` and is never sent to the server.

**(d) File upload.** `integrity-controller.ts:850`: for `.txt`/`.md`/`.html` the file's
raw text is placed into the textarea (`input.value=captured`), and `contentType` is set to
`"markdown"` / `"html"` accordingly. Because the model path scores `snapshot.content`
regardless, a `.md` upload is scored with its markdown and an `.html` upload with its raw
tags — `<h2>`, `<p>`, attributes and all.

**(e) `contentType`.** Consumed only by the deterministic rules core:
`integrity-controller.ts:852` passes it to `inspectLocally`, which forwards it as
`source.content_type` in the frozen-contract request (`core-adapter.ts:8-11`). The
AI-model path never reads it. There is no branch anywhere that converts markdown or HTML
to text before scoring.

## 2. Measured deltas per path

All scores through the shipped fp32 harness at the shipped 0.9855/0.9763 pair,
segments-v3 (`research/escalation-arm-2026-08-31/`: `score_stripped.py`,
`score_html_sample.py`, `compare_surfaces.py`; outputs in `inputs/` and
`surface-comparison.json`).

### 2.1 The same documents, three renderings (matched 600-doc samples, seed 42)

| rendering → model | human flag rate | AI flag rate |
|---|---|---|
| raw markdown (markdown paste, `.md` upload) | **135/600 = 22.5%** | 545/600 = 90.8% |
| plain text, syntax stripped (plain-text paste) | **0/600 = 0.0%** | 523/600 = 87.2% |
| raw HTML (`.html` upload) | 1/600 = 0.2% | **503/600 = 83.8%** |

Same documents, same model, same thresholds; only the syntax around the words changes.
The markdown column reproduces the full-corpus figures (human 794/3,529 = 22.50% raw vs
5/3,529 = 0.14% stripped; AI 3,758/4,016 = 93.6% raw vs 3,549/4,016 = 88.4% stripped) and
the 60-doc controlled strip test (59/60 un-flag). HTML sits with the stripped column for
humans — so the artefact is the `##`/`-`/`**` characters, not document structure.

### 2.2 Who carries the syntax

Markdown syntax prevalence: 100% of the structured human corpus (it is banked as markdown
— which is why it exposed this) and **2,720/4,050 = 67% of the generated AI corpus**
(55% headings, 31% bullet lists, 42% bold). A ChatGPT-style copy button emits exactly
that markdown source as `text/plain`, so the generated corpus scored raw IS the
ChatGPT-copy surface: 90.8% detected on the sample (93.6% full corpus).

### 2.3 Which humans are most exposed (raw markdown, full corpus)

howto-guide 462/762 = 60.8%, business-guide 81/180 = 45.0%, developer-docs 127/650 =
19.5%, faq 50/260 = 19.2%, business-blog 21/90 = 23.3% — against journalism 10/288 =
3.5% and seo-marketing-blog 3/499 = 0.6%. Length compounds it: 12/632 = 1.9% under 300
words, 409/675 = 60.6% at 1,200+. The most exposed writers are exactly the people who
write in markdown natively (docs teams, developers, technical marketers) — the
`ESCALATION-ARM-2026-08-31.md` §1 register table applies verbatim to this path.

### 2.4 What each published figure was measured on

The published headline (883/922 and 45/4,636 server, 889/922 and 90/4,636 browser, in
`thresholds.json`) was measured on the 5,558-document corpus, which is plain prose: the
human side structure-stripped, the AI side prose registers. No published figure was
measured on markdown or HTML input. Production accepts both. The two research corpora
that do carry markdown (this human corpus, the generated corpus) are the only
measurements of that surface, and they are research artefacts, not published figures.

## 3. Recommendation

**Input normalisation is needed, and the model input is the right place — not the
thresholds, not the tells.** Specifically (decision and sequencing with the owner):

1. **Normalise the MODEL input to the plain-prose rendering** — the same strip used here:
   heading/bullet/numbered markers, bold/italic/code/link syntax removed, words and
   paragraph breaks kept; HTML tags to text likewise. Keep the raw draft for everything
   else: the rules core inspects exact characters by design, the shape tells want the
   structure (and already receive it separately via the paste-HTML capture), and the
   highlighted draft view renders the user's own text. That one change puts every paste
   and upload on the surface the published figures were measured on.
2. **Where: both ends.** In the client at snapshot time (`integrity-controller.ts:852` is
   the single choke point for both routes) — and on the server as defence in depth
   (`app.py:1021`), since the server trusts whatever `body.text` arrives.
3. **What it costs, stated plainly**: AI drafts pasted with their markdown currently score
   93.6%; normalised they score 88.4% (the syntax was doing ~5pp of the work). That
   giveaway must be weighed against the alternative, which is a ~22%-class false-positive
   exposure on markdown-writing humans — this tool's own stated worst error. The
   escalation arm priced in `ESCALATION-ARM-2026-08-31.md` (+1.39pp held out for +0.06pp)
   recovers a quarter of the giveaway from structure honestly, and only works on the
   normalised surface.
4. **Re-measurement required if shipped**: golden-text and route-parity fixtures
   (normalisation changes bytes → segment boundaries and scores on markdown-carrying
   fixtures); the WebGPU/WASM parity spot-checks on normalised texts; the `.md`/`.html`
   upload path end-to-end; and the per-sentence view's offset mapping (highlights must map
   normalised offsets back to the raw draft — this is the main engineering cost, not the
   strip itself). No published accuracy figure needs re-measuring or withdrawing: they
   were all measured on the surface normalisation creates. The paste-HTML capture and
   tells pipeline are untouched.
5. **Until then**, the honest interim is disclosure: the checker's fine print should say
   markdown syntax in a paste or `.md` upload is read by the model as AI-flavoured, and
   that structured human drafts pasted as markdown can flag at rates far above the
   published 1-2%.

## Reproduction

`research/escalation-arm-2026-08-31/`: `strip_test.py` (60-doc controlled strip),
`score_stripped.py` (full both-corpora stripped rescore), `score_html_sample.py` (600+600
HTML rendering), `compare_surfaces.py` (three-way table, `surface-comparison.json`).
Website code references from checkout at commit of 31 Aug 2026; server references from
`model-shrink/reference-server/app.py` (deployed revision `opace-detector-00027-yuq` per
`CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31.md`).
