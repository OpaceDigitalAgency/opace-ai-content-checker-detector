# WebGPU against WASM on the shipped `segments-v3` parameters

Measured 30 August 2026. **Nothing in the product was changed.** No threshold, no aggregation
rule, no model file, no copy. `thresholds.json`'s `execution_provider_note` was rewritten to
record what is now measured, and nothing else was touched.

This closes the open item that note recorded: the `0.9855 / 0.9763` pair was fitted on
onnxruntime-web's **WASM** execution provider under headless Node, while a visitor with a
capable GPU gets **WebGPU** — a different provider, different kernels, different accumulation
order. The parameters were therefore unproven for most real visitors.

**Headline. The shipped pair holds for a WebGPU visitor, and one flag point still serves both
routes.** Over the whole 5,558-document corpus, scored segment by segment through WebGPU in a
real browser on real GPU hardware, **16 documents in 5,558 (0.288%) get a different verdict**
than they do on WASM: **4 AI documents in 922 lost, 0 gained, 7 human documents in 4,636 newly
flagged, 5 cleared.** Neither movement is statistically distinguishable from nothing (McNemar
exact p = 0.125 on the AI side, p = 0.774 on the human side). Corpus detection moves 889/922
(96.42%) to 885/922 (95.99%); human false positives move 90/4,636 (1.941%) to 92/4,636
(1.984%). **No refit is needed and no WebGPU-specific parameter is required.**

**The brief's premise did not survive measurement, and the correction matters.** The concern was
that the providers "diverge most between 0.90 and 0.98, which is exactly where the secondary flag
point now sits". That is true of **WASM against fp32**, which is where the observation came from.
It is **not** true of WASM against WebGPU. Those two agree most tightly in exactly that region and
disagree most in **0.50–0.90**, where nothing is decided. On second-highest section scores between
0.97 and 0.99, the median |Δ| is **0.000075** and the largest is **0.0073**. The secondary
parameter turns out to be the *better*-protected of the two, not the exposed one.

---

## 1. Provenance — what ran, on what, against what

| | |
|---|---|
| Corpus | `services/local-engine/research/longform-corpus/` — 5,558 documents, **922 AI** (13 current models), **4,636 human** (Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE 2.0) |
| WASM reference | `services/local-engine/research/corpus-reconciliation-2026-08-29/raw/browser-runtime-scores.json` — the committed full-corpus browser run, 21,093 per-segment probabilities. Reused, not re-derived |
| fp32 reference | `raw/lf-ai.jsonl`, `raw/lf-hu.jsonl` from the same directory |
| Model file | `tier3-cycle2-e5small-int8-perchannel.onnx`, the shipped int8 per-channel file, from the site's own `public/models/local-signals-v1/` |
| Runtime | onnxruntime-web **1.29.0**, `ort.webgpu.bundle.min.mjs` — the same bundle `engine.ts` imports for a visitor whose browser exposes `navigator.gpu`, with the same `ort-wasm-simd-threaded.asyncify.wasm` binary |
| Browser | Chromium (Google Chrome for Testing 151.0.7922.34) via Playwright, **headed**, served over a local origin with COOP/COEP |
| GPU | adapter reports `vendor: apple`, `architecture: metal-3` — real Metal hardware, **not** the SwiftShader software fallback |
| Segmentation | shipped `segments.ts` under `segments-v3`; **21,093 segments**, matching the committed run exactly |
| Aggregation | maximum section, with the second-highest at the lower flag point — the shipped rule |
| Cost | 21,093 segments in roughly 63 minutes of wall clock, about 5.6 segments/second |

Harness: `opace-website/astro-latest/src/lib/local-signals/verify/webgpu-prep.mts`,
`webgpu-wasm-control.mts` and the browser page driven by `drive.mjs`, beside the existing
`route-parity.mts` and `segment-scoring.mts`. Measurement only; nothing here is imported by the
site. No product code, threshold or copy was changed.

### 1.1 The input was frozen so the provider is the only variable

`webgpu-prep.mts` segments every document with the shipped `segmentText` and tokenises every
segment with the shipped WordPiece tokeniser, then writes the resulting token id sequences to a
flat binary file. Both the WASM control and the WebGPU run consume **that same file**. Neither
segmentation nor tokenisation can contribute to any difference reported below; the execution
provider is the only thing that differs between the two columns.

---

## 2. The harness was proved before any new number was believed

`HANDOVER.md` §5's rule — prove the probe against a known-good target first — was applied four
ways. All four passed, and the fourth is the one that matters most, because without it a silent
fallback to WASM would have produced a beautiful and completely worthless null result.

**2.1 The committed WASM scores reproduce the published figures.** Read straight from
`browser-runtime-scores.json` under the shipped rule: **877/922 = 95.12% detection and
90/4,636 = 1.941% false positives at 0.984**, and **889/922 = 96.42% / 90/4,636 = 1.941%** at
`0.9855/0.9763`. These match `browser-fullcurve.txt` and `thresholds.json` to the digit, and the
segment count is 21,093, matching `SEGMENT-TOKEN-FIX.md` §4.

**2.2 The scoring pipeline reproduces the committed run bit-exactly.** Re-scoring the frozen
tokens through WASM under Node, with the shipped `calibratedProbability`, returns the committed
per-segment probabilities with **max |Δ| = 0.0 over 190 segments**, segment counts identical.
Not "within tolerance" — identical.

**2.3 The same page under WASM reproduces the Node control.** Loading the browser page with the
execution-provider list set to `["wasm"]` returns the Node WASM numbers to **5.6e-17**, one unit
in the last place on 1 of 190 segments and bit-identical on the other 189.

**2.4 So a WebGPU difference is a WebGPU difference.** The identical page with
`["webgpu","wasm"]` diverges from that control (median |Δ| 4.96e-05 on the same 190 segments).
Same page, same frozen input, same model file, same calibration — only the provider list differs.
The adapter probe independently confirms real Apple Metal hardware. A silent fallback is
therefore excluded by two arguments rather than assumed away by one.

**2.5 WebGPU is bit-deterministic run to run.** 300 documents / 1,776 segments were re-scored in
a fresh browser session: **1,776/1,776 bit-identical**. The verdict changes in §4 are a stable,
reproducible property of the execution provider, not resampling noise. This is the check that
turns "16 documents moved" from an anecdote into a measurement.

---

## 3. The divergence, and where it actually lives

|Δ| between WASM and WebGPU on the same document, same segment, same tokens.

| statistic | n | median | p90 | p99 | max |
|---|---|---|---|---|---|
| every section score | 21,093 | 0.004572 | 0.034512 | 0.080715 | 0.205359 |
| highest section per document | 5,558 | 0.005492 | 0.035782 | 0.082451 | 0.160243 |
| **second-highest section per document** | **5,486** | **0.006038** | **0.036525** | **0.080831** | **0.171313** |

Those totals are misleading on their own, and the breakdown is the finding:

| WASM second-highest sits in | n | median &#124;Δ&#124; | p99 | max |
|---|---|---|---|---|
| 0.00–0.50 | 2,770 | 0.007869 | 0.079079 | 0.138380 |
| **0.50–0.90** | 1,258 | **0.017520** | 0.101838 | **0.171313** |
| 0.90–0.97 | 449 | 0.003433 | 0.022257 | 0.029436 |
| **0.97–0.99** | **802** | **0.000075** | 0.003066 | **0.007346** |
| 0.99–1.01 | 207 | 0.000017 | 0.000060 | 0.000073 |

**The two providers agree to five decimal places exactly where the decision is made, and disagree
by two orders of magnitude more only where nothing is decided.** The secondary flag point sits at
0.9763, inside the 0.97–0.99 row: median disagreement **0.000075**, worst case **0.0073**.

Restricted to scores within 0.01 of either flag point — the only scores that can change anything —
the picture is the same: n = 1,446, **median 0.000065, p99 0.004231, max 0.007346**.

The scoped band the brief specified (documents whose WASM document score is 0.50–0.99, 3,463 of
them here) is dominated by documents nowhere near a flag point, which is why its aggregate reads
worse than the decision region it contains: median 0.004540 on the highest section and 0.008212 on
the second-highest. Reporting that number without the band breakdown would overstate the risk by
roughly a hundredfold.

### 3.1 Why the brief expected the opposite, and why both statements are true

`thresholds.json`'s `runtime_note` and `v3-analysis.txt` §5 record second-highest divergence of
median 0.0872 overall, with 0.0749 in the 0.90–0.97 band and 0.0002 above 0.97. That is
**WASM against fp32** — a different model file (int8 per-channel against fp32) as well as a
different runtime. The "diverge most between 0.90 and 0.98" observation is a true statement about
that pair and it does not transfer to this one. WASM and WebGPU run the **same int8 file**; they
differ only in kernels and accumulation order, and that difference is proportionally largest in
the mid-range where the logit gap is small, not near saturation where both providers are pinned
against the same ceiling.

---

## 4. The decision-relevant number

Verdicts under the shipped rule — flag when the highest section reaches 0.9855 **or** the
second-highest reaches 0.9763 — computed on both providers over all 5,558 documents.

| | AI detected | human false positives |
|---|---|---|
| WASM (committed) | 889/922 = 96.42% | 90/4,636 = 1.941% |
| **WebGPU** | **885/922 = 95.99%** | **92/4,636 = 1.984%** |

Paired, document by document:

| | count | denominator |
|---|---|---|
| **total verdict changes** | **16** | **5,558 = 0.288%** |
| AI documents lost (flagged on WASM, cleared on WebGPU) | 4 | 922 = 0.43% |
| AI documents gained (cleared on WASM, flagged on WebGPU) | 0 | 922 |
| human documents newly flagged on WebGPU | 7 | 4,636 = 0.15% |
| human documents cleared on WebGPU that WASM flagged | 5 | 4,636 = 0.11% |

**Neither side is statistically distinguishable from no change.** McNemar exact, two-sided:
AI 4 against 0, **p = 0.125**; human 7 against 5, **p = 0.774**. The AI side is one-directional,
which is worth saying plainly rather than hiding behind the p-value — all four movements go the
same way, and with 4 discordant pairs that is simply the smallest count that could ever reach
significance and does not.

All sixteen are documents sitting on the flag point. The largest movement among them is 0.0048 and
the median is under 0.002; not one is a document whose score changed meaningfully, only documents
whose score was already within a hair of a boundary. By register: longform-journalism 5, story 4,
white-paper 3, academic-discussion 2, research-summary 1, company-update 1.

**Nine of the sixteen flip on the primary parameter and eight on the secondary** (one document
flips on both). That is close to proportionate to how crowded the two points are: 137 documents sit
within 0.002 of the primary against 40 within 0.002 of the secondary. **The primary at 0.9855 is
the more exposed parameter of the two**, which is the reverse of what the open item assumed.

### 4.1 Per-register, at the shipped pair

| human register | WASM | WebGPU |
|---|---|---|
| story (fiction) | 26/260 = 10.00% | 27/260 = 10.38% |
| academic-discussion | 21/420 = 5.00% | 23/420 = 5.48% |
| academic-conclusion | 9/360 = 2.50% | 9/360 = 2.50% |
| white-paper | 12/840 = 1.43% | 13/840 = 1.55% |
| academic-introduction | 6/420 = 1.43% | 6/420 = 1.43% |
| research-summary | 1/189 = 0.53% | 2/189 = 1.06% |
| longform-journalism | 8/840 = 0.95% | 6/840 = 0.71% |
| company-update | 5/662 = 0.76% | 4/662 = 0.60% |
| academic-lit-review | 2/225 = 0.89% | 2/225 = 0.89% |
| student-essay | 0/420 = 0.00% | 0/420 = 0.00% |

Academic discussion, the register `OBJECTIVE.md` names as the one to watch, moves from 5.00% to
5.48% — two documents. Fiction, the worst register, moves by one. Both are inside the noise of a
260- and 420-document denominator and neither crosses any figure the product publishes.

On the AI side only two registers move at all: story 110/114 to 107/114, longform-journalism
134/137 to 133/137. Six of the eight registers are identical document for document.

---

## 5. Both routes can still share one flag point

`HANDOVER.md` §4.4 and §12 make this the binding constraint: a tool that contradicts itself
depending on which route ran is worse than one slightly miscalibrated, so a WebGPU-specific
parameter was never an option. If WASM and WebGPU could not share one pair, that would have been
a significant finding requiring immediate escalation.

**They can, comfortably.** Verdict agreement between the two browser providers is
**5,542/5,558 = 99.71%** on the identical parameters, and agreement against the fp32 server route
is **unchanged by which browser provider runs**:

| | disagreement with fp32 server |
|---|---|
| fp32 vs WASM | 54/5,558 = 0.97% |
| **fp32 vs WebGPU** | **54/5,558 = 0.97%** |

The same figure to the document. Adding WebGPU to the picture does not widen the gap between the
two shipped routes at all, which is the property §4.4 exists to protect.

The second flag point also does the same work on both providers: it alone decides 23 AI and 37
human documents on WASM, against 20 AI and 37 human on WebGPU.

---

## 6. What this does not say

- **One GPU, one browser.** Apple Metal via Chromium on macOS. A Windows visitor on D3D12, or an
  Android visitor on Vulkan, runs different kernels again. The result here is that the *provider
  boundary* is worth about 16 documents in 5,558 on this hardware; it is not a proof about every
  GPU. The mechanism — the two providers agree to five decimals wherever the logit is saturated —
  is the part that should generalise, and it is the reason to expect other backends to land in the
  same place rather than an assurance that they do.
- **This is the int8 file only.** The fp32 server model was not run through WebGPU and never will
  be; it runs on Cloud Run.
- **Nothing here re-measures the mixed-content cost.** The 604/700 half-AI figure in
  `thresholds.json` is fp32 and stays fp32. The 700 purpose-built mixed documents were not
  re-scored on WebGPU, so §9.1's cost is unchanged and unverified on this provider.
- **The 3 PERSUADE 2.0 provenance caveats** recorded in `ROUTE-PARITY.md` §1 apply here as they do
  everywhere on this corpus. For a same-documents comparison of two execution providers it does not
  matter — the same weights read the same tokens both times — but it would matter for an absolute
  accuracy claim.
- **Register labels are machine-assigned**, as `MANIFEST.md` records. The §4.1 split inherits that.

---

## 7. Reproducing this

```
# 1. freeze the model input (segmentation + tokenisation, shipped code)
npx tsx src/lib/local-signals/verify/webgpu-prep.mts <dir>

# 2. the WASM control, under Node — must match browser-runtime-scores.json exactly
npx tsx src/lib/local-signals/verify/webgpu-wasm-control.mts <dir> 0 40

# 3. the WebGPU run, in a real browser
node <dir>/serve.mjs <dir>          # local origin with COOP/COEP
node <dir>/drive.mjs webgpu 0 5558 <dir>/webgpu.json
```

Two practical notes, both of which cost time here:

- **`requestAnimationFrame` does not fire in a hidden tab**, as `HANDOVER.md` §6 warns. The page
  above deliberately uses no rAF and the browser is launched headed with background throttling
  disabled, so the run cannot stall silently.
- **Run the WASM control first and insist on bit-exactness.** A harness that merely lands "close
  to" the committed run cannot distinguish a real provider difference of 5e-05 from its own
  arithmetic drift, and 5e-05 is the size of the effect being measured.
