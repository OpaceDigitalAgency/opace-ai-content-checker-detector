# Route parity — browser (int8, ORT Web) against server (fp32, Cloud Run)

Measured 29 August 2026. Shipping blocker for making the server route the default.

**Headline: verdict agreement is 57/60 = 95.0%. All three disagreements are caused by the
two thresholds, not by the two runtimes. With both routes at 0.984, agreement is 60/60.**

---

## 1. What was measured, and through what

| | browser route | server route |
|---|---|---|
| model file | `tier3-cycle2-e5small-int8-perchannel.onnx` (34.3 MB) | `tier3-cycle2-e5small-fp32.onnx` (134 MB) |
| runtime | onnxruntime-web, WASM execution provider | Python onnxruntime 1.29.0, CPUExecutionProvider |
| tokeniser | shipped TypeScript WordPiece | HF `AutoTokenizer`, padded to 512 |
| segmentation | shipped `segments.ts` | `segments.py` (`segments-v1`) |
| aggregation | max over segments, earliest wins ties | max over segments, earliest wins ties |
| threshold | **0.984** | **0.980** |

The browser side is the real shipped runtime. No Python stand-in was used for it, because
runtime disagreement is the entire question. Harness:
`opace-website/astro-latest/src/lib/local-signals/verify/route-parity.mts` — a new
measurement-only file beside the existing `segment-scoring.mts` and `browser-corpus.mts`.
It imports the shipped `tokenizer.ts`, `engine.ts` (`calibratedProbability`) and
`segments.ts`. No product code, threshold or copy was changed.

### The server side was measured in two phases — state which, always

The live endpoint enforces 30 requests and 150 inferences per hour per network. Sixty
documents is 284 inferences and would have taken about two and a half hours of paced
requests. Instead:

- **Phase 1, anchor (live container).** Three documents — intended to be ten — were scored through the live
  Cloud Run endpoint at `https://opace-detector-877422072168.europe-west1.run.app`, honouring
  every control: required `Origin`, browser `User-Agent`, the 14-bit proof-of-work token
  exchange, the `x-opace-token` header, 20 checks per token, and a deliberate 150-second
  cadence (24 checks/hour against the 30/hour cap). Nothing was weakened, disabled or evaded.
  **The service returned 404 on every route from 11:38 onward and the anchor could not be
  completed.** See section 7.
- **Phase 2, remainder (local fp32).** The other 57 documents. The same fp32 model file, the
  same `segments.py`, and `app.py`'s own `_score` and `_score_document` functions lifted
  verbatim, run locally at the container's pinned versions (onnxruntime 1.29.0,
  transformers 4.43.3, numpy 2.5.2). All 60 were in fact scored locally, so the 3 anchor
  documents have both numbers and the comparison in section 7 is direct.

The stated, tested assumption is that **the container is numerically identical to local
fp32**. Evidence for it is in section 7. The local model file's SHA-256 prefix is
`e313ab00de1fffd2`, which is exactly the `model_build` the live `/v1/health` reports — the
same file, byte for byte.

The per-document table in section 8 marks every row with which of the two produced it.

### Corpus

60 documents, all over 700 words, from
`implementation/services/local-engine/research/longform-corpus/` — the fresh held-out
long-form corpus whose builder aborts on any collision with held-out material and which the
cycle-2 model was never trained on. No new samples were generated.

- **`ai-longform.jsonl`** — 30 documents, from the 922-document AI split. Models: Gemini 3.7
  Flash (8), Qwen3.8-max (6), Claude Sonnet 5 (5), Claude Opus 5 (3), Mistral Medium 3.5 (3),
  Kimi K3 (2), GPT-5.6-luna (2), Llama 4 Maverick (1). Source `openrouter-longform-2026-08-28`.
- **`human-longform.jsonl`** — 30 documents, from the 4,636-document human split. Sources:
  Europe PMC open access (12), GOV.UK (6), Internet Archive CC texts (3), PERSUADE 2.0 (3),
  Global Voices (2), SEC EDGAR 10-K MD&A (2), CRS (1), Mongabay (1).

Selection was deterministic and register-stratified: documents sorted by id, evenly spaced
within each register, 700 < words ≤ 4,000. 18 registers are represented. Word counts run
702 to 2,969, median 1,386. Total 284 segments.

**Caveat, recorded rather than buried:** 3 of the 30 human documents come from PERSUADE 2.0,
which `MANIFEST.md` states also appears in the cycle-2 training corpus. For a route-parity
comparison this does not matter — both routes run the same weights over the same text — but
it would matter for any accuracy claim, so it is stated here.

---

## 2. Verdict agreement — the headline

**57/60 = 95.0%.**

| | agreement | browser flagged | server flagged |
|---|---|---|---|
| AI (n=30) | 28/30 = 93.3% | 28 | 30 |
| human (n=30) | 29/30 = 96.7% | 0 | 1 |
| **all (n=60)** | **57/60 = 95.0%** | 28 | 31 |

Every disagreement runs the same direction: the server flags, the browser does not. The
server is the more aggressive route at its shipped threshold.

---

## 3. Every disagreement, individually

All three, in full. They are the finding.

### 3.1 `meta-2026-longform-f2386bfbef` — AI, academic essay, 1,198 words, Llama 4 Maverick

| route | probability | threshold | distance | verdict |
|---|---|---|---|---|
| browser | 0.9820 | 0.984 | **−0.0020** | not flagged |
| server | 0.9807 | 0.980 | **+0.0007** | flagged |

Δp = −0.0013. Per-segment browser `[0.9716, 0.9795, 0.9820, 0.0821]`, server
`[0.9680, 0.9782, 0.9807, 0.0473]`.

Reading: the two routes agree on this document to within 0.0013 — they read it almost
identically. The document sits in the 0.0040-wide corridor between the two thresholds, so
the identical reading produces opposite verdicts. This is a threshold artefact, not a runtime
disagreement. Note also that the server's *lower* score is the one that flags.

### 3.2 `qwen-2026-longform-7d26187184` — AI, academic essay, 1,484 words, Qwen3.8-max

| route | probability | threshold | distance | verdict |
|---|---|---|---|---|
| browser | 0.9829 | 0.984 | **−0.0011** | not flagged |
| server | 0.9832 | 0.980 | **+0.0032** | flagged |

Δp = +0.0003 — the two runtimes are three ten-thousandths apart. Per-segment browser
`[0.9677, 0.9668, 0.9800, 0.9829, 0.8417]`, server `[0.9511, 0.9626, 0.9819, 0.9832, 0.8964]`.
Both routes pick segment 3 as strongest. They read this document the same way and disagree
purely because they are asked different questions.

### 3.3 `human-longform-81018e62af85` — human, academic literature review, 1,919 words

| route | probability | threshold | distance | verdict |
|---|---|---|---|---|
| browser | 0.9822 | 0.984 | **−0.0018** | not flagged |
| server | 0.9800 | 0.980 | **+0.0000** | flagged |

Δp = −0.0022. Per-segment browser `[0.8965, 0.9694, 0.9421, 0.9799, 0.9822, 0.6799]`, server
`[0.7683, 0.9579, 0.9099, 0.9750, 0.9800, 0.4470]`.

The most uncomfortable of the three: a genuine human academic literature review that the
server route calls AI and the browser route does not. It lands on the server threshold to
four decimal places — 0.9800 against 0.980. A single ten-thousandth lower and both routes
would have agreed. Academic prose is already the register carrying the highest human
false-positive rate, so this is the case most likely to be met in the wild.

**Common to all three: every one lies inside the 0.980–0.984 corridor between the two
thresholds. There are no others.** Four of the 60 documents land in that corridor on either
route; three of the four disagree, and the fourth (`human-longform-0175f896e59d`, browser
0.9804, server 0.9741) agrees only because the server scored it below 0.980.

---

## 4. Distribution of Δp

Δp = server probability − browser probability, at document level (the max-aggregated score).

| | median \|Δp\| | mean \|Δp\| | p90 | p95 | max |
|---|---|---|---|---|---|
| all 60 documents | **0.0017** | 0.0577 | 0.2386 | 0.3951 | 0.4162 |
| AI (n=30) | 0.0002 | 0.0003 | 0.0007 | — | 0.0013 |
| human (n=30) | 0.0572 | 0.1152 | 0.3951 | — | 0.4162 |
| all 284 segments | 0.0022 | 0.0619 | 0.2329 | 0.2900 | 0.4321 |

Signed: median −0.0017, mean −0.0575; the server scores lower on 34 of 60. int8
quantisation systematically *inflates* low probabilities relative to fp32.

### This does not match the previously recorded 0.113 — and should not

The 0.113 median in `thresholds.json` `runtime_note` compares **int8-web against
int8-Python**: the same quantised file under two runtimes, where Python's extended int8
fusions at `ORT_ENABLE_ALL` diverge from the web build's kernels. **This measurement is
int8-web against fp32-Python** — a different comparison, because the server does not run the
quantised file at all. The two figures are not in conflict and neither supersedes the other.
The 0.113 figure should not be quoted as applying to the browser-versus-server question.

### Where the disagreement actually lives

| browser probability region | n | median \|Δp\| | max \|Δp\| |
|---|---|---|---|
| 0.97 – 1.00 (the decision region) | 34 | **0.0002** | **0.0063** |
| 0.90 – 0.97 | 6 | 0.0307 | 0.1122 |
| 0.50 – 0.90 | 12 | 0.1767 | 0.4162 |
| 0.00 – 0.50 | 8 | 0.0353 | 0.2902 |

This is the crux. The runtimes disagree substantially — up to 0.42 — on ambiguous mid-range
text, and agree to four decimal places everywhere a verdict is actually decided. No verdict
in this corpus rides on the mid-range, because nothing in the mid-range is near either
threshold. Quantisation error is largest where the model is least confident, which is exactly
where it costs nothing.

---

## 5. Do disagreements cluster near the threshold?

**Yes, completely. This is the tolerable case, not the serious one.**

- Disagreements on documents where **both** routes sit more than 0.02 from their own
  threshold: **0 of 60**.
- All three disagreements sit between −0.0020 and +0.0032 of their own threshold.
- The largest Δp among the three disagreements is 0.0022.
- The largest Δp in the whole corpus is 0.4162, on `human-longform-3f01cba92404` (browser
  0.7232, server 0.3070). Both routes call it human, comfortably, and it is nowhere near
  either threshold.

There is no case in this corpus of a confident document flipping. A user cannot see "very
likely human" become "very likely AI"; the worst available flip is between "uncertain, not
flagged" and "flagged", on a document both routes scored within 0.003 of each other.

---

## 6. Do the routes agree on the strongest segment?

**51/60 = 85.0%.** The UI highlights this passage, so it matters. The nine mismatches split
into two clearly different kinds:

**Five on flagged AI documents — all ties.** In every one, the two candidate segments are
0.0000–0.0001 apart on both routes:

| document | browser pick | server pick | gap between candidates |
|---|---|---|---|
| `mistral-2026-longform-ae5dbc436e` | seg 1 (0.9899) | seg 3 (0.9901) | 0.0001 |
| `anthropic-2026-longform-09fe95b738` | seg 3 (0.9900) | seg 1 (0.9902) | 0.0000 |
| `google-2026-longform-652b1807d2` | seg 3 (0.9897) | seg 2 (0.9899) | 0.0000 |
| `anthropic-2026-longform-0ac3ef74e1` | seg 3 (0.9903) | seg 1 (0.9903) | 0.0000/0.0001 |
| `google-2026-longform-94937cc71a` | seg 6 (0.9903) | seg 0 (0.9903) | 0.0000/0.0001 |

These are saturated documents where every segment reads as AI at 0.99. The tie-break in both
implementations is "earliest index wins", and it is correctly implemented on both sides — the
segments are not tied to the precision the tie-break sees, so a 0.0001 runtime difference
reorders them. The user is shown a different but equally AI-looking passage from a document
both routes flag. Cosmetic, but a user comparing routes side by side would see the highlight
move.

**Four on unflagged human documents.** Here the candidate gaps are real (0.005–0.082), driven
by the genuine mid-range quantisation error from section 4. But all four documents are called
human by both routes, so no passage is being presented to the user as evidence of AI
authorship.

**Zero mismatches where the routes disagree on the verdict.**

---

## 7. The anchor: is the live container numerically identical to local fp32?

**The anchor holds on every document measured — but it covers 3 documents, not the 10
intended, because the live service went down mid-run.**

### What happened

The endpoint was reachable and healthy at 10:52 (`/v1/health` → 200, `model_build`
`e313ab00de1fffd2`). Three documents were scored through it between 10:57 and 11:03. At
11:04 the network's hourly request allowance was exhausted — by traffic that was not all
mine: I had made five requests against a 30/hour cap, so the endpoint's per-network limiter
is shared with other users of that connection. The client obeyed the returned `retry_after`
of 1,995 seconds rather than working around it. When it resumed at 11:38, every route
including `/v1/health` returned **HTTP 404** with Google's front-end error page. The service
had been taken down or disabled externally in the interim.

I did not attempt to redeploy or re-enable it: `deploy.sh` and `enable-service.sh` exist in
the reference-server directory, but bringing a service back up is an infrastructure change
this measurement task has no authority to make.

So the anchor rests on 3 documents and 16 segments, not 10 documents. That is stated plainly
rather than presented as the planned test.

### What the anchor shows

Byte-identity of the model first: the local file's SHA-256 prefix is `e313ab00de1fffd2`,
which is exactly the `model_build` the live `/v1/health` reported. The container and the
local run load the same file.

All 16 segments, compared at the 4-decimal precision the server reports:

| document | segments | boundaries | token counts | max \|Δ\| |
|---|---:|---|---|---:|
| `anthropic-2026-longform-2d96f91f62` | 5 | all match | all match | **0.0000** |
| `anthropic-2026-longform-084a2e7e3f` | 6 | all match | all match | **0.0000** |
| `anthropic-2026-longform-32b55f3fbd` | 5 | all match | all match | **0.0000** |

Every character offset, every word count, every token count and every probability is
identical. Not "within floating-point noise" — identical to the reported precision, across
16 independent forward passes, despite the container running linux/amd64 and the local run
running macOS arm64. The container adds nothing numerically.

### The limit of this evidence, stated honestly

The 16 anchor segments span probabilities **0.9721 to 0.9901**. None is below 0.97.

This cuts both ways. It means the anchor covers precisely the region where verdicts are
decided — which is the region this report's conclusions depend on. It also means **the
container was never compared against local fp32 on mid-range text**, which is exactly where
section 4 shows the int8/fp32 gap is largest. If the container diverged from local fp32
somewhere around p = 0.6, this anchor would not have caught it.

No verdict in this report rides on the mid-range, so the conclusions stand. But the
assumption "container ≡ local fp32" is verified in the decision region only, on three
documents, and should be re-tested across the probability range when the service is back up.
The three documents also come from one side (AI) and one provider (Anthropic); the intended
anchor set, which included two borderline human documents, a confident human at p = 0.018 and
a nine-segment document, is recorded in `anchor-ids.json` and can be run as-is later.


---

## 8. Are the thresholds correctly calibrated relative to each other?

**No. This is the actionable finding.**

0.984 and 0.980 were each fitted independently — the browser point on the browser runtime's
own distribution, the server point inherited from the Python evaluation. Nobody checked them
*against each other*. The 0.0040 gap between them is **larger than the runtime disagreement
it is meant to compensate for**, which in the decision region is a median of 0.0002 and a
maximum of 0.0063.

The result is that the thresholds, not the runtimes, are the dominant source of verdict
disagreement — and the evidence is direct:

| both routes at the same threshold | agreement |
|---|---|
| both at 0.984 | **60/60 = 100.0%** |
| both at 0.980 | 59/60 = 98.3% |
| **as shipped: browser 0.984, server 0.980** | **57/60 = 95.0%** |

A sweep of the server threshold against the browser fixed at 0.984 reaches 60/60 agreement
anywhere in **0.9833–0.9876**. The shipped 0.980 gives 57/60.

The two thresholds were each defensible alone. Together they open a 0.0040 corridor in which
the routes are *guaranteed* to contradict each other, and any document landing there
contradicts regardless of how well the runtimes agree.

### What raising the server threshold to 0.984 would cost

Measured, not estimated: all 5,558 documents of the fresh long-form corpus (922 AI, 4,636
human) scored through segmented fp32 — the server route's own pipeline.

| server threshold | AI detected | human false positives |
|---|---|---|
| 0.9800 (shipped) | 885/922 (96.0%) | 92/4,636 (**1.98%**) |
| 0.9833 | 870/922 (94.4%) | 61/4,636 (1.32%) |
| **0.9840** | **865/922 (93.8%)** | **52/4,636 (1.12%)** |
| 0.9850 | 859/922 (93.2%) | 43/4,636 (0.93%) |
| 0.9876 | 812/922 (88.1%) | 21/4,636 (0.45%) |

Moving the server from 0.980 to 0.984 costs **2.2 points of AI detection (96.0% → 93.8%,
20 documents) and removes 40 human false positives, nearly halving them (1.98% → 1.12%)**.
Every long-form register stays far above the OBJECTIVE's 50% floor:

| register | AI detected @0.980 | @0.984 |
|---|---|---|
| company updates | 100.0% | 100.0% |
| white papers | 99.0% | 98.1% |
| research summaries | 99.1% | 96.6% |
| long-form journalism | 97.8% | 94.9% |
| academic discussion | 95.6% | 93.8% |
| story | 94.7% | 92.1% |
| academic lit reviews | 93.5% | 92.5% |
| academic essays | 89.4% | 84.8% |

Human false positives fall in every register, most where it matters most — academic
introductions 2.14% → 0.24%, academic discussion 3.10% → 1.19%, academic lit reviews 1.33%
→ 0.00%.

### Recommendation (for the owner to decide; no code was changed)

**Set both routes to 0.984.** One number, not two.

The trade is 2.2 points of detection for a near-halving of false positives *and* perfect
verdict agreement on this sample. OBJECTIVE criterion 4 names false positives as the thing to
minimise and every register still clears the 50% floor with enormous margin, so the trade
runs in the direction the objective asks for. It also removes the corridor entirely: with one
threshold there is no band in which the routes are structurally guaranteed to contradict.

If the 2.2 points are judged too expensive, **0.9833 is the cheapest value that still reaches
60/60** on this sample (94.4% detection, 1.32% false positives). Any value in 0.9833–0.9876
works for agreement; the choice within that range is a detection-versus-false-positive
decision, not a parity one.

### A separate observation, flagged not claimed

The server route's shipped operating point, measured through its own segmented pipeline on
the fresh corpus, is **96.0% AI detection at 1.98% human false positives**. The disclosure
copy on the live page quotes 90.3% at 1.34%. Those figures were measured on the browser
runtime *before segmentation existed* (`browser-corpus.mts` scores one truncated pass over
each document, not segment by segment). They are therefore a different pipeline and not
directly comparable — but the human false-positive rate a user meets on the server route
today is about 2%, not 1.34%. Whether the published figures need restating is outside this
task's scope; it is recorded here because it was measured in passing. The equivalent
segmented browser figure was not measured: 26,000 segments through onnxruntime-web is roughly
six hours, which this task did not spend.

---

## 8b. A defect found in passing: 12.7% of segments hit the 512-token ceiling

Not a parity problem — recorded because it was measured and it matters.

`segments.py`'s own docstring explains that the tail-splitting rule exists so that no segment
can exceed the 512-token window, "which no longer fits the 512-token window: the tokeniser
would truncate it and silently drop the end of the document, which is the exact defect
segmentation exists to remove." `app.py` sets `truncated: n_tokens >= 512` and comments that
if it is ever true in production "the two routes have drifted apart."

Measured on this corpus:

| | count |
|---|---|
| segments at the 512-token ceiling | **36 of 284 (12.7%)** |
| documents containing at least one | **13 of 60 (21.7%)** |
| token-count mismatches between the routes | **0 of 284** |

The premise that 340 words always fits 512 WordPiece tokens does not hold for dense prose —
academic text with long technical terms tokenises to well over 1.5 tokens per word. Roughly
one long document in five has text silently dropped from at least one segment.

**This does not affect route parity.** Both routes truncate at the same 512-token point, on
the same segments, in the same documents, with zero token-count mismatches, so it cannot
cause the two routes to disagree — and none of the three disagreements in section 3 involves a
truncated segment. The `truncated` flag is therefore not the drift signal `app.py` treats it
as: it is firing on both routes equally, for a reason unrelated to drift.

It is a real defect in the detector's coverage — the thing segmentation was built to prevent
is still happening on a fifth of long documents — and it is worth its own investigation.
Fixing it would mean lowering `SEGMENT_WORDS` or splitting on measured token count rather than
word count, and either change moves the operating point on both routes, so it should not be
bundled with the threshold decision in section 8.

---

## 9. Verdict: is the server route safe to ship as the default?

**Yes — but change the threshold first, and the change is cheap.**

The reasoning:

1. **Structurally the two routes are identical.** Segment counts matched on 60/60 documents,
   character boundaries and token counts matched on every segment compared against the live
   container. The `segments-v1` contract holds.
2. **Numerically they agree where it counts.** In the decision region the median absolute
   difference is 0.0002 and the maximum is 0.0063. The large differences — up to 0.42 — are
   confined to mid-range text where no verdict is at stake.
3. **The 95% agreement is not a runtime defect.** All three disagreements are documents the
   two runtimes read almost identically (Δp 0.0003 to 0.0022) but the two *thresholds* judge
   differently. Set one threshold and agreement is 60/60.
4. **No confident document flips.** The damaging scenario in the brief — a user seeing "very
   likely human" become "very likely AI" — did not occur once and cannot occur at these Δp
   magnitudes.

**Shipping the server route as default at 0.980 while the browser stays at 0.984 means about
one document in twenty gets a different verdict from the two routes, and one of those in this
sample was a genuine human academic paper flagged as AI by the server and cleared by the
browser.** That is the exact self-contradiction the brief set out to prevent, and it is
avoidable for 2.2 points of detection.

Do not ship the mismatched pair. Ship a single threshold.

### What was not measured, and why

- **57 of the 60 server-side scores are local fp32, not the live container**, and the anchor
  behind that substitution is 3 documents rather than the 10 intended, because the service
  went down mid-run. Section 7 states exactly what that evidence does and does not cover.
  Every row of the table in section 10 is marked with which runtime produced it.
- **Browser-side segmented scores on the full 5,558-document corpus.** About six hours through
  onnxruntime-web. Without it, the recommendation of 0.984 for the server is supported by the
  server-side cost table and by 60/60 agreement on this sample, but the browser route's own
  segmented operating curve is not re-derived here.
- **Whether 0.984 remains the right browser point.** Out of scope. The recommendation is to
  make the server match the browser, not to re-fit the browser.
- Sample size is 60 documents. Three disagreements is a small denominator: the 95.0% figure
  carries real uncertainty, and the qualitative finding (all disagreements in the threshold
  corridor, none on confident documents) is the durable part.

---

## 10. Per-document table

Every document, both routes. `route` states which produced the server-side number.

| # | document | side | register | words | segs | browser p (int8, ORT Web) | verdict @0.984 | server p (fp32) | verdict @0.980 | Δp | agree | strongest seg (b/s) | route |
|---:|---|---|---|---:|---:|---:|---|---:|---|---:|---|---|---|
| 1 | `anthropic-2026-longform-031cc26136` | ai | story | 1709 | 6 | 0.9889 | AI | 0.9893 | AI | +0.0004 | yes | 1/1 | local fp32 |
| 2 | `anthropic-2026-longform-084a2e7e3f` | ai | academic-essay | 1772 | 6 | 0.9869 | AI | 0.9876 | AI | +0.0007 | yes | 1/1 | live container |
| 3 | `anthropic-2026-longform-09fe95b738` | ai | company-update | 1347 | 4 | 0.9900 | AI | 0.9902 | AI | +0.0002 | yes | 3/1 ✗ | local fp32 |
| 4 | `anthropic-2026-longform-0ac3ef74e1` | ai | white-paper | 1839 | 6 | 0.9903 | AI | 0.9903 | AI | +0.0000 | yes | 3/1 ✗ | local fp32 |
| 5 | `anthropic-2026-longform-2104e48b0c` | ai | research-summary | 1112 | 4 | 0.9901 | AI | 0.9902 | AI | +0.0001 | yes | 0/0 | local fp32 |
| 6 | `anthropic-2026-longform-26ae007dc9` | ai | longform-journalism | 1676 | 5 | 0.9894 | AI | 0.9898 | AI | +0.0004 | yes | 3/3 | local fp32 |
| 7 | `anthropic-2026-longform-2d96f91f62` | ai | academic-discussion | 1627 | 5 | 0.9899 | AI | 0.9901 | AI | +0.0002 | yes | 0/0 | live container |
| 8 | `anthropic-2026-longform-32b55f3fbd` | ai | academic-lit-review | 1484 | 5 | 0.9898 | AI | 0.9900 | AI | +0.0002 | yes | 3/3 | live container |
| 9 | `google-2026-longform-20bb221b7f` | ai | company-update | 1250 | 4 | 0.9903 | AI | 0.9904 | AI | +0.0001 | yes | 0/0 | local fp32 |
| 10 | `google-2026-longform-40d6989bc6` | ai | academic-essay | 2928 | 9 | 0.9901 | AI | 0.9901 | AI | +0.0000 | yes | 3/3 | local fp32 |
| 11 | `google-2026-longform-4b631a3190` | ai | academic-discussion | 1710 | 6 | 0.9902 | AI | 0.9903 | AI | +0.0001 | yes | 3/3 | local fp32 |
| 12 | `google-2026-longform-652b1807d2` | ai | academic-lit-review | 2076 | 7 | 0.9897 | AI | 0.9899 | AI | +0.0002 | yes | 3/2 ✗ | local fp32 |
| 13 | `google-2026-longform-76e1784430` | ai | research-summary | 1432 | 5 | 0.9902 | AI | 0.9902 | AI | +0.0000 | yes | 1/1 | local fp32 |
| 14 | `google-2026-longform-7c5bea11fb` | ai | longform-journalism | 2373 | 7 | 0.9897 | AI | 0.9898 | AI | +0.0001 | yes | 1/1 | local fp32 |
| 15 | `google-2026-longform-882a059874` | ai | story | 1852 | 6 | 0.9889 | AI | 0.9884 | AI | -0.0005 | yes | 1/1 | local fp32 |
| 16 | `google-2026-longform-94937cc71a` | ai | white-paper | 2627 | 8 | 0.9903 | AI | 0.9903 | AI | -0.0000 | yes | 6/0 ✗ | local fp32 |
| 17 | `meta-2026-longform-f2386bfbef` | ai | academic-essay | 1198 | 4 | 0.9820 | human | 0.9807 | AI | -0.0013 | **NO** | 2/2 | local fp32 |
| 18 | `mistral-2026-longform-983ba28cf9` | ai | longform-journalism | 1650 | 5 | 0.9899 | AI | 0.9901 | AI | +0.0002 | yes | 0/0 | local fp32 |
| 19 | `mistral-2026-longform-9e948a26e8` | ai | academic-lit-review | 1719 | 6 | 0.9895 | AI | 0.9899 | AI | +0.0004 | yes | 0/0 | local fp32 |
| 20 | `mistral-2026-longform-ae5dbc436e` | ai | academic-discussion | 1519 | 5 | 0.9899 | AI | 0.9901 | AI | +0.0002 | yes | 1/3 ✗ | local fp32 |
| 21 | `moonshot-2026-longform-16e7340968` | ai | white-paper | 1793 | 6 | 0.9903 | AI | 0.9904 | AI | +0.0001 | yes | 1/1 | local fp32 |
| 22 | `moonshot-2026-longform-54c40c4d17` | ai | story | 1987 | 6 | 0.9898 | AI | 0.9900 | AI | +0.0002 | yes | 3/3 | local fp32 |
| 23 | `openai-2026-longform-0218f80025` | ai | research-summary | 1069 | 4 | 0.9883 | AI | 0.9880 | AI | -0.0003 | yes | 1/1 | local fp32 |
| 24 | `openai-2026-longform-0e7416cf9b` | ai | company-update | 1333 | 4 | 0.9899 | AI | 0.9901 | AI | +0.0002 | yes | 0/0 | local fp32 |
| 25 | `qwen-2026-longform-7d26187184` | ai | academic-essay | 1484 | 5 | 0.9829 | human | 0.9832 | AI | +0.0003 | **NO** | 3/3 | local fp32 |
| 26 | `qwen-2026-longform-7e390fe92b` | ai | longform-journalism | 1649 | 5 | 0.9900 | AI | 0.9901 | AI | +0.0001 | yes | 0/0 | local fp32 |
| 27 | `qwen-2026-longform-96169869ea` | ai | academic-discussion | 1227 | 4 | 0.9875 | AI | 0.9882 | AI | +0.0007 | yes | 1/1 | local fp32 |
| 28 | `qwen-2026-longform-aec1a68e7a` | ai | academic-lit-review | 1503 | 5 | 0.9901 | AI | 0.9902 | AI | +0.0001 | yes | 0/0 | local fp32 |
| 29 | `qwen-2026-longform-b9986751dd` | ai | research-summary | 888 | 3 | 0.9877 | AI | 0.9884 | AI | +0.0007 | yes | 0/0 | local fp32 |
| 30 | `qwen-2026-longform-bc58e523cb` | ai | company-update | 1073 | 4 | 0.9899 | AI | 0.9901 | AI | +0.0002 | yes | 0/0 | local fp32 |
| 31 | `human-longform-000db835a9e2` | human | company-update | 1596 | 5 | 0.5851 | human | 0.3034 | human | -0.2817 | yes | 0/2 ✗ | local fp32 |
| 32 | `human-longform-002789380081` | human | academic-introduction | 1186 | 4 | 0.9681 | human | 0.9469 | human | -0.0212 | yes | 0/0 | local fp32 |
| 33 | `human-longform-003e5664a072` | human | longform-journalism | 853 | 3 | 0.6129 | human | 0.4934 | human | -0.1195 | yes | 1/1 | local fp32 |
| 34 | `human-longform-007991feb7ed` | human | student-essay | 768 | 3 | 0.0223 | human | 0.0189 | human | -0.0034 | yes | 0/1 ✗ | local fp32 |
| 35 | `human-longform-0091dc4ec49f` | human | academic-discussion | 1856 | 6 | 0.8731 | human | 0.7477 | human | -0.1254 | yes | 4/4 | local fp32 |
| 36 | `human-longform-009db4c73f8c` | human | white-paper | 1400 | 5 | 0.0509 | human | 0.0201 | human | -0.0308 | yes | 2/2 | local fp32 |
| 37 | `human-longform-00a062420b23` | human | academic-lit-review | 1220 | 4 | 0.8797 | human | 0.7921 | human | -0.0876 | yes | 3/3 | local fp32 |
| 38 | `human-longform-00c255cf781a` | human | story | 1191 | 4 | 0.6941 | human | 0.6435 | human | -0.0506 | yes | 3/3 | local fp32 |
| 39 | `human-longform-0175f896e59d` | human | academic-conclusion | 811 | 3 | 0.9804 | human | 0.9741 | human | -0.0063 | yes | 1/1 | local fp32 |
| 40 | `human-longform-017c4390f817` | human | research-summary | 2189 | 7 | 0.9669 | human | 0.9520 | human | -0.0149 | yes | 2/2 | local fp32 |
| 41 | `human-longform-39d3df92ba78` | human | research-summary | 1451 | 5 | 0.7038 | human | 0.5356 | human | -0.1682 | yes | 0/0 | local fp32 |
| 42 | `human-longform-3f01cba92404` | human | company-update | 1386 | 5 | 0.7232 | human | 0.3070 | human | -0.4162 | yes | 2/2 | local fp32 |
| 43 | `human-longform-40c6cda4444c` | human | white-paper | 846 | 3 | 0.5783 | human | 0.1637 | human | -0.4146 | yes | 1/1 | local fp32 |
| 44 | `human-longform-41b51dd6df4a` | human | academic-discussion | 861 | 3 | 0.9629 | human | 0.9454 | human | -0.0175 | yes | 1/1 | local fp32 |
| 45 | `human-longform-42acc6594e89` | human | story | 1187 | 4 | 0.9741 | human | 0.9683 | human | -0.0058 | yes | 0/0 | local fp32 |
| 46 | `human-longform-43626542d2a8` | human | academic-lit-review | 882 | 3 | 0.8746 | human | 0.7250 | human | -0.1496 | yes | 1/1 | local fp32 |
| 47 | `human-longform-4415644fa9b7` | human | academic-introduction | 897 | 3 | 0.8239 | human | 0.6386 | human | -0.1853 | yes | 0/0 | local fp32 |
| 48 | `human-longform-45ea25f1daf3` | human | longform-journalism | 1258 | 4 | 0.0253 | human | 0.0212 | human | -0.0041 | yes | 3/3 | local fp32 |
| 49 | `human-longform-46e2cb827a0c` | human | student-essay | 702 | 3 | 0.4155 | human | 0.3731 | human | -0.0424 | yes | 1/1 | local fp32 |
| 50 | `human-longform-485d410cb1c5` | human | academic-conclusion | 738 | 3 | 0.9457 | human | 0.8818 | human | -0.0639 | yes | 0/0 | local fp32 |
| 51 | `human-longform-71483738defb` | human | academic-conclusion | 764 | 3 | 0.3295 | human | 0.2114 | human | -0.1181 | yes | 2/2 | local fp32 |
| 52 | `human-longform-7cb44d0c4fdf` | human | company-update | 1378 | 5 | 0.4651 | human | 0.1749 | human | -0.2902 | yes | 0/1 ✗ | local fp32 |
| 53 | `human-longform-7e647a9a38dc` | human | white-paper | 874 | 3 | 0.5799 | human | 0.3413 | human | -0.2386 | yes | 1/1 | local fp32 |
| 54 | `human-longform-7fcc5f817fd2` | human | academic-discussion | 1525 | 5 | 0.9759 | human | 0.9700 | human | -0.0059 | yes | 2/2 | local fp32 |
| 55 | `human-longform-81018e62af85` | human | academic-lit-review | 1919 | 6 | 0.9822 | human | 0.9800 | AI | -0.0022 | **NO** | 4/4 | local fp32 |
| 56 | `human-longform-813a29142b0f` | human | research-summary | 860 | 3 | 0.9578 | human | 0.9176 | human | -0.0402 | yes | 0/0 | local fp32 |
| 57 | `human-longform-82710fe6d907` | human | story | 1169 | 4 | 0.0892 | human | 0.0494 | human | -0.0398 | yes | 2/2 | local fp32 |
| 58 | `human-longform-85918622d196` | human | longform-journalism | 1164 | 4 | 0.6735 | human | 0.2784 | human | -0.3951 | yes | 2/2 | local fp32 |
| 59 | `human-longform-89d8a1c61ce4` | human | student-essay | 982 | 3 | 0.0212 | human | 0.0176 | human | -0.0036 | yes | 0/0 | local fp32 |
| 60 | `human-longform-8b7fba854a5c` | human | academic-introduction | 2969 | 9 | 0.9106 | human | 0.7984 | human | -0.1122 | yes | 1/4 ✗ | local fp32 |

---

## 11. Reproducing this

```sh
# browser side — the real shipped runtime, ~4 minutes for 284 segments
cd opace-website/astro-latest
npx tsx src/lib/local-signals/verify/route-parity.mts selection.json browser-results.json

# server side, phase 1 — live container, paced inside the published limits
python3 server_run.py                 # ONLY_IDS=anchor-ids.json to restrict

# server side, phase 2 — local fp32, app.py's own code path, ~13 seconds
python3 local_fp32.py

# full-corpus threshold cost, 5,558 documents, ~17 minutes
python3 full_corpus.py
```

Scripts live in this session's scratchpad; `route-parity.mts` is committed beside the other
verify harnesses. Nothing in the product was modified.
