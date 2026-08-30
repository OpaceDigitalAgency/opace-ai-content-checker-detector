# The same text, scored in your browser and on our server, has to give the same answer

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/server-and-browser-parity/`

---

## The finding

The tool runs the same trained model two ways: a 34 MB quantised file downloaded into your browser,
and a full-precision file on a server in the EU. A single flag point serves both. That is a
constraint, not a convenience — a tool that contradicts itself depending on which route happened to
run is worse than one that is slightly miscalibrated on both.

The constraint holds, and it holds for a specific and measurable reason. The two runtimes disagree
substantially in the middle of the score range, where nothing is decided, and agree to four or five
decimal places at the flag points, where everything is. Within 0.01 of either flag point the median
disagreement between the browser's two execution providers is **0.000065** across 1,446 section
scores, and between the browser and the server the median document-score disagreement in the
0.97–1.01 region is **0.0002** across 1,274 documents.

The divergence away from the decision region is large and is printed here rather than left out.

---

## Provenance

Three comparisons run below, and they must never be mixed inside one table.

| | |
|---|---|
| Server | `tier3-cycle2-e5small-fp32.onnx`, **fp32**, Python `onnxruntime` 1.29.0, CPU |
| Browser | `tier3-cycle2-e5small-int8-perchannel.onnx`, **int8 per-channel**, `onnxruntime-web` 1.29.0 |
| Browser providers | WASM (`ort-wasm-simd-threaded.asyncify.wasm`) and WebGPU (`ort.webgpu.bundle.min.mjs`) |
| WebGPU hardware | Chrome for Testing 151.0.7922.34 via Playwright, **headed**, local origin with COOP/COEP; adapter reports `vendor: apple`, `architecture: metal-3` — real Metal, not the SwiftShader software fallback |
| Corpus | the 5,558-document long-form corpus of 28 August 2026: 922 AI across 13 models, 4,636 human. 21,093 sections under `segments-v3` |
| Operating point | the shipped pair, flag when the strongest section reaches **0.9855** or the second-strongest reaches **0.9763** |
| Cost | 21,093 sections through WebGPU in roughly 63 minutes of wall clock, about 5.6 sections a second |
| Sources | `docs/measurements/WEBGPU-PARITY.md` (measured 30 August 2026); `services/local-engine/research/corpus-reconciliation-2026-08-29/browser-fullcurve.txt` and `v3-recommended.txt` (29 August 2026) |

---

## The measurement rig was proved before any number from it was believed

This matters more than the result. A parity measurement that silently falls back to the runtime it
is supposed to be comparing against produces a beautiful null result and means nothing. Four checks
were run first, and the fourth is the load-bearing one.

**The input was frozen so the provider is the only variable.** Every document was segmented with
the shipped segmenter and tokenised with the shipped WordPiece tokeniser, and the resulting token
id sequences were written to a flat binary file. Both the WASM control and the WebGPU run consume
that same file. Neither segmentation nor tokenisation can contribute to any difference reported.

**The committed browser scores reproduce the published figures.** Read straight from the committed
full-corpus browser run under the shipped rule: 889/922 = 96.42% detection at 90/4,636 = 1.941%
false positives, and 877/922 at 90/4,636 under the prior single-threshold 0.984 rule. The section
count is 21,093, matching the segmentation record.

**The scoring pipeline reproduces the committed run bit-exactly.** Re-scoring the frozen tokens
through WASM under Node returns the committed per-section probabilities with **max |Δ| = 0.0 over
190 sections**. Not within tolerance. Identical.

**The same page under WASM reproduces the Node control to 5.6 × 10⁻¹⁷**, one unit in the last place
on 1 of 190 sections and bit-identical on the other 189. So when the identical page with the
provider list set to WebGPU diverges from that control by a median 4.96 × 10⁻⁵, the divergence is a
property of the execution provider and not of the measurement rig. A silent fallback is excluded
by the adapter probe and by this control, rather than assumed away by one of them.

**WebGPU is bit-deterministic run to run.** 300 documents and 1,776 sections re-scored in a fresh
browser session: **1,776 of 1,776 bit-identical**. That is what turns "sixteen documents moved" from
an anecdote into a measurement.

---

## Comparison one: the browser's two execution providers

A visitor with a capable GPU gets WebGPU; everyone else gets WASM. Different kernels, different
accumulation order, same int8 file. The shipped pair was fitted on WASM, so it was unproven for
most real visitors until this was run.

| | AI detected | human false positives |
|---|---|---|
| WASM | 889/922 = 96.42% | 90/4,636 = 1.941% |
| WebGPU | 885/922 = 95.99% | 92/4,636 = 1.984% |

Paired, document by document: **16 verdict changes in 5,558 (0.288%)**. Four AI documents lost, none
gained; seven human documents newly flagged, five cleared. McNemar exact, two-sided: AI 4 against 0,
p = 0.125; human 7 against 5, p = 0.774. Neither movement is distinguishable from no change.

The AI side is one-directional, which is worth saying plainly rather than hiding behind a p-value.
All four movements go the same way, and with four discordant pairs that is the smallest count that
could ever reach significance, and does not.

All sixteen are documents sitting on the flag point. The largest movement among them is 0.0048 and
the median is under 0.002. Not one is a document whose score changed meaningfully.

### Where the two providers actually disagree

| WASM second-highest section sits in | n | median &#124;Δ&#124; | p99 | max |
|---|---|---|---|---|
| 0.00–0.50 | 2,770 | 0.007869 | 0.079079 | 0.138380 |
| **0.50–0.90** | 1,258 | **0.017520** | 0.101838 | **0.171313** |
| 0.90–0.97 | 449 | 0.003433 | 0.022257 | 0.029436 |
| **0.97–0.99** | **802** | **0.000075** | 0.003066 | **0.007346** |
| 0.99–1.01 | 207 | 0.000017 | 0.000060 | 0.000073 |

The secondary flag point sits at 0.9763, inside the 0.97–0.99 row. Restricted to section scores
within 0.01 of either flag point, the only scores that can change anything, the picture is the same:
n = 1,446, median 0.000065, 99th percentile 0.004231, maximum 0.007346.

Quoting the pooled figure alone would overstate the risk by roughly a hundredfold, so the pooled
figure is given too: across all 21,093 section scores the median |Δ| is 0.004572 and the maximum is
0.205359.

**The brief's premise did not survive.** The concern going in was that the two providers diverge
most between 0.90 and 0.98, which is exactly where the secondary flag point sits. That is true of
WASM against fp32, which is where the observation came from. It is false of WASM against WebGPU.
Those two run the same int8 file and differ only in kernels and accumulation order, and that
difference is proportionally largest in the mid-range where the logit gap is small, not near
saturation where both providers are pinned against the same ceiling. Nine of the sixteen changed
verdicts flip on the primary parameter and eight on the secondary, one on both, which is close to
proportionate to how crowded the two points are: 137 documents sit within 0.002 of the primary
against 40 within 0.002 of the secondary. **The primary at 0.9855 is the more exposed of the two**,
the reverse of what was assumed.

---

## Comparison two: fp32 against int8, server against browser

This is the harder comparison, because two things differ at once: the runtime and the model file.
The int8 per-channel artefact is a quantisation of the fp32 parent, and quantisation is not a
neutral operation.

At the shipped pair, over the same 5,558 documents:

| | AI detected | human false positives | fiction | academic discussion |
|---|---|---|---|---|
| fp32 server | 883/922 = 95.77% | **45/4,636 = 0.971%** | 23/260 = 8.85% | 8/420 = 1.90% |
| int8 browser (WASM) | 889/922 = 96.42% | **90/4,636 = 1.941%** | 26/260 = 10.00% | 21/420 = 5.00% |

**The false-positive rates differ by a factor of two, and both are printed.** That is not a parity
failure. They are two different artefacts, and a page that published only the flattering one would
be misleading about which route the reader is actually using. The browser catches slightly more
machine writing and wrongly flags twice as many people.

Verdict disagreement between the two routes at the shipped pair is **54 of 5,558 = 0.97%**. Adding
WebGPU to the picture does not widen it at all: fp32 against WASM reads 54/5,558, and fp32 against
WebGPU reads 54/5,558. The same figure to the document.

The document-score divergence between fp32 and int8 by region is the honest part of this comparison,
and it is much larger than the provider comparison above:

| browser document score sits in | n | median &#124;Δ&#124; | p90 | max |
|---|---|---|---|---|
| 0.00–0.50 | 1,788 | 0.1003 | 0.2539 | 0.4521 |
| 0.50–0.90 | 1,604 | **0.2609** | 0.4224 | 0.7562 |
| 0.90–0.97 | 892 | 0.0710 | 0.2343 | 0.7480 |
| **0.97–1.01** | **1,274** | **0.0002** | 0.0120 | 0.1760 |

A median disagreement of 0.26 in the middle of the range is not small. It is also not decisive: no
verdict is taken there. What makes one flag point defensible across both artefacts is the last row,
and the last row alone.

That has a consequence the page must state. Below about 0.97 the two routes stop agreeing often
enough for a shared threshold to exist at all. Measured over the same corpus under the earlier
single-threshold rule, disagreement runs 48/5,558 = 0.86% at 0.984, 82 at 0.98, 171 at 0.97, 369 at
0.95 and 757 at 0.8082 — and almost every one runs the same way, with the browser flagging where
the server clears. Any argument for lowering the flag point has to answer that table first.

---

## What this does not prove

- **One GPU, one browser, one model file.** Apple Metal via Chromium on macOS. A Windows visitor on
  D3D12 or an Android visitor on Vulkan runs different kernels again. What is established is that
  the provider boundary is worth about sixteen documents in 5,558 on this hardware. The mechanism,
  that the two providers agree to five decimals wherever the logit is saturated, is the part that
  should generalise. That is a reason to expect other backends to land in the same place, not an
  assurance that they do.
- **The two routes are not shown to have equal accuracy.** This page claims corpus-scale parity
  between the browser's two providers, and agreement between browser and server inside the decision
  region. It does not claim the fp32 and int8 artefacts are equally accurate, and the false-positive
  table above shows they are not.
- **The browser has never had a detection-by-length cut.** The full-corpus browser threshold curve
  exists; the per-length-band table on which the tool's length disclosures rest is fp32 only. A
  visitor pasting an 800-word blog post into the browser route has no band figure of their own.
- **The mixed-content cost was not re-measured on WebGPU.** The 604/700 half-AI figure is fp32 and
  stays fp32.
- **The shipped pair was fitted from WASM under headless Node.** WebGPU was measured afterwards, and
  holds. It was not part of the fit.
- **The corpus is not fully held out.** Of the 922 AI documents, 268 (29.1%) appear in the cycle-2
  dataset and 168 of those in the training split; the human side is effectively clean at 11 of
  4,636. For a same-documents comparison of two runtimes this does not matter, because the same
  weights read the same tokens both times. It would matter for an absolute accuracy claim.
- **Register labels are machine-assigned.**
- **The older route-parity record must not be used.** Its entire framing is browser 0.984 against
  server 0.980, a mismatched pair corrected twice since, and only 3 of its 60 server-side scores
  came from the live container; the service returned 404 mid-run and the other 57 are local fp32.
  Its 60-document corpus is also tiny beside 5,558. Its one still-usable qualitative point is that
  all three of its disagreements lay inside the corridor between the two thresholds.

---

## Charts this page needs

All new.

**1. Divergence by score band, with the flag points marked.** This is the page's argument in one
image. Horizontal bars of median |Δ| by band on a log x axis, denominators on the bars, with
vertical markers for the primary (0.9855) and secondary (0.9763) flag points placed against the band
axis.

- WASM against WebGPU, second-highest section score: 0.00–0.50 n = 2,770 median 0.007869;
  0.50–0.90 n = 1,258 median 0.017520; 0.90–0.97 n = 449 median 0.003433; 0.97–0.99 n = 802 median
  0.000075; 0.99–1.01 n = 207 median 0.000017.
- Source: `WEBGPU-PARITY.md` §3.

**2. The same plot for fp32 against int8, drawn as a separate chart and never on the same axes.**

- 0.00–0.50 n = 1,788 median 0.1003; 0.50–0.90 n = 1,604 median 0.2609; 0.90–0.97 n = 892 median
  0.0710; 0.97–1.01 n = 1,274 median 0.0002.
- Source: `corpus-reconciliation-2026-08-29/browser-fullcurve.txt`.

**3. The two routes at the shipped pair.** Paired bars, detection and false positives, four values,
denominators on the bars, with the runtime named on each series.

- fp32 883/922 and 45/4,636; int8 WASM 889/922 and 90/4,636.
- Source: `corpus-reconciliation-2026-08-29/v3-recommended.txt`; reproduced in `WEBGPU-PARITY.md`
  §2.1 and `AGGREGATION-AND-RHYTHM.md` §6.

**4. Optional: the two routes, drawn.** A schematic of the browser path and the server path meeting
at one flag point, with the model file, precision and runtime labelled on each branch. Explanatory
only; label it as a diagram, not a measurement.

---

## Rewrite liabilities (not body copy)

- **cycle-4a** is measured and not shipped, and its int8 quantisation gate is the thing blocking it:
  a verdict-flip rate of 0.01204 against the project's own 0.01 limit. That is this page's subject
  matter. If it ships, every figure here is replaced and the "no refit needed" conclusion has to be
  re-established on the new artefact rather than carried over.
- The outstanding work named in the source is the browser int8 detection curve by length band and an
  operating point fitted on both runtimes at once. The second half of that has been done for the
  shipped model; the first has not.
- `HANDOVER.md` §13 still records that the browser's full-corpus segmented curve has never been
  measured. That line is stale: the curve exists in
  `corpus-reconciliation-2026-08-29/browser-fullcurve.txt`, measured 29 August 2026 under
  `segments-v2`. Correct it before citing that file beside this page.
