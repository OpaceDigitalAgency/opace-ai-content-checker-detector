# Changelog

**29 August 2026 cost-control correction.** Configured Google Cloud's enforced £50 monthly
Cloud Run spend cap for `opace-ai-detector` (budget
`3b89c8af-bd1c-434f-8cab-3e0d14491e71`) while preserving the £10 kill-switch budget. Reduced
service-wide and revision maximum instances to 1. Revision `opace-detector-00005-284` is ready at
100% traffic and `/v1/health` is green. Earlier entries saying no Cloud Run spend cap exists are
historical and superseded; Google warns enforcement is delayed and can overshoot, so the kill
switch remains. The new revision reopens its kill-switch and zero-body-logging proof gates.

## Unreleased

- **Measured which of the 116 named writing rules can actually fire (29 August 2026).** On 10,096 documents (5,743 AI, 4,353 human), 95 fired at least once. One — `tier3-phrase-cluster` — **cannot fire on realistic prose**: its gate needs 3 distinct phrases from an inherited crypto/web3 whitepaper list and the measured maximum is 1, with 4 of the 10 phrases matching no document anywhere. It is now recorded inactive and is not counted as a live capability. Twenty more are dormant but probe-verified reachable, each listed with a reason. A previous report had recorded `contrast-density`, `mic-drop-paragraph` and `punchline-fragment-density` as having unreachable thresholds; that was measured on chat-reply register and is **superseded** — all three fire on published prose and all three point the right way. No threshold was changed. New standing guard `tests/battery/rule-liveness-battery.test.mjs` fails the build if a rule ships in the active inventory without a measured fire, if the inactive register goes stale in either direction, or if `WRITING_SIGNAL_RULES_RUN` disagrees with the built packs.
- **Published four measured findings that had never reached a public surface** in `docs/MEASURED-FINDINGS.md`, with two new charts. The prompt-style evasion axis (detection 55.9% → 19.8% when a model is told to write like a human; `x-ai/grok-4.6` to 0 of 86) is now item 4 of the README's Honest limitations rather than buried in a research file. Register beating model choice (marketing-SEO 77.9% against academic 1.1%, same models and topics) is charted. Sentence occlusion (2,174 deletions across 57 documents; only 35.9% of sentences push their document towards "machine") is published as the reason the tool will never highlight "the AI sentences". The writing rules that fire more on humans than on AI are **named** for the first time.
- **Withdrew one figure that would not reproduce.** `token-cutoff` had been published among the backwards-pointing rules on the strength of 6 human documents out of 169. On 4,353 human and 5,743 AI documents it points the right way at a likelihood ratio of 8.0. It is not a backwards rule and that earlier figure should not be quoted.

- Prepared public repository documentation, issue forms, package metadata, SBOMs, listing fields and release runbooks without creating a remote or publishing.
- Prepared `@opace/astro-content-integrity` 0.1.0 with Astro catalogue metadata, genuine screenshots and Opace social-preview artwork.
- Prepared version-aligned 0.1.0 contracts, core, browser, client and CLI npm packages plus the Python 0.1.0 loopback distribution.
- Lifted the model and corpus holds: the cycle-2 classifier and its training corpora are built, measured and shipped. The provider and G7 holds are unchanged, as are the explicit unsupported/not-configured states.
- **Deployed the Cloud Run hosted inference service (29 August 2026).** `https://opace-detector-877422072168.europe-west1.run.app`, revision `opace-detector-00003-bfq`, europe-west1, scale to zero. Verified on the day: `/v1/health` 200 reporting model `tier3-cycle2`, fp32, build `e313ab00de1fffd2`, `segmentation_contract: segments-v1`; server-side segmentation matching the published golden table (1,200 words → 4 segments of 340/340/340/180, `aggregation: "max"`); the daily cap denominated in inferences rather than requests (12,000/day, 12,000 → 11,996 after one four-segment request); the abuse gates refusing `automation_detected`, `token_required` and `origin_not_allowed` as designed, with a 14-bit proof-of-work token accepted via the `x-opace-token` header; and the kill switch round-tripping health 200 → 404 → 200. The URL and revision change on redeploy and are dated observations, not fixed identifiers. The site-wide "text never leaves your browser" copy must be reconciled before the checker is pointed at this route.
- **Built and tested the hosted-inference cost controls (29 August 2026).** Established first that **no Cloud Run setting delivers the £50 ceiling**: `--max-instances` bounds CPU and memory, nothing caps the request count, and a month-long flood costs roughly £519 at two instances even with every request rejected. Corrected three documents that called instance limits the spend cap. Built the ceiling as a kill switch: Pub/Sub topic `detector-killswitch`; Cloud Function `detector-killswitch` (gen2, python312, europe-west1) ACTIVE, revoking the `allUsers` invoker binding and closing ingress on any message while deleting nothing; a Cloud Monitoring trigger at 10 requests/second sustained 5 minutes; and billing budget `ce028788-6be2-45b7-9605-9461b534684a` as a slow backstop. Verified end to end after two failed attempts — a POST to `:getIamPolicy` where Cloud Run v2 wants a GET, which failed silently for 200 observed seconds, then a `403` on `:setIamPolicy` from a service account holding `roles/editor` — with the third taking health to 404 within 10 seconds. Both failures are recorded rather than only the passing run.
- **Audited the zero-retention claim against the live service (29 August 2026).** A unique high-entropy marker embedded in a document body was submitted to `/v1/check` through the real gated path and confirmed scored (`probability_ai: 0.0552`, `retained: "nothing"`) rather than refused at a gate; every log entry in the project was then searched across `textPayload`, `jsonPayload`, `protoPayload` and `httpRequest.requestUrl`, returning **zero occurrences**, with only 4 log entries produced service-wide in the window. Replaces the previously proposed grep for the string `text`, which matched field names and could fail in both directions. Recorded as **narrowed rather than closed**: refusal (413, 429) and error paths run different code and remain unprobed, and the probe must be re-run with a fresh marker after any redeploy because the request-log exclusion is a deploy-time flag.

## Live — 2026-08-28

The browser checker went live at 21:20 under owner authorisation, site commit `bb820686`, corrected the same night by `ce56ac54`. Live at <https://opace.agency/tools/ai/content-verification-integrity/checker/>.

- Shipped the cycle-2 classifier `tier3-cycle2-e5small-int8-perchannel.onnx`, 34.3 MB, served from the site and downloaded to the visitor's browser on explicit consent. It runs through onnxruntime-web; no pasted text leaves the browser.
- Published the browser-measured operating point 0.984: **90.3% AI detection at 1.34% human false positives**, measured on the fresh 5,558-document long-form corpus the model had never seen (922 AI documents from 13 current models; 4,636 human documents from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR and PERSUADE).
- Refitted the threshold through the shipped runtime after finding that onnxruntime-web and Python onnxruntime disagree by a median 0.113 on this quantised model, because Python applies extended int8 fusions the web build does not. The Python figure on the same 5,558 documents at 0.98 was 90.6% detection (835/922) at 1.22% human false positives; shipping it would have produced 3.56% real-world false positives while the interface claimed 1.2%. Every published number is now browser-measured.
- Corrected the disclosure copy in `ce56ac54`. It had claimed that lightly-edited AI is "missed almost entirely", which was wrong and understated the tool. Measured: an AI draft that a person then tidies is detected 82.3% of the time; an AI rewrite of a human original (HAT-Bench v6–v8) 30–35%; human prose that a language model polished is deliberately not flagged, because a median 93.5% of those words are the human author's. The old wording must not be restored.
- Disclosed the short-text limit on the page: detection is 67% at 200 words, 50% at 150 and 19% at 100, and short human text is not falsely flagged (0 of 400 at 60–200 words).

## Cycle-2 model and corpora — 2026-08-28

- Trained the cycle-2 classifier on published-register prose. Base `intfloat/e5-small`, 33.36M parameters, exported to dynamic per-channel int8 ONNX at 34.3 MB. Held-out training evaluation (`cycle2-train`, 6,183 rows): AUROC 0.530 → 0.9695, detection at a 1% false-positive budget 6.7% → 76.9%, at 2% 9.1% → 81.2%.
- Built `cycle2-corpus/corpus.jsonl`: 15,514 documents, 5,655 AI and 9,859 human, published register on both sides, licence recorded per source, group-aware splits. Sources: GRADTEX, HAT-Bench, `mild-rgb/aita-human-vs-ai`, MAGA, C4 English, PERSUADE 2.0 and Opace's own OpenRouter generation run.
- Built `longform-corpus/`: 5,558 fresh held-out documents, 4,636 human and 922 AI, used for every published accuracy figure.
- Built `generated-corpus/generated.jsonl`: 4,016 usable current-model articles from 21 models across 10 providers, 3,100,043 words, $61.70 of an authorised $75 budget. Opace's to publish.
- Found and fixed a topic-level leakage defect in the upstream corpus, and declined to train on `tests/battery/human-corpus-v2.json` because its own manifest forbids training use. That corpus was held entirely in the test split.
- Measured cycle 3 and did not ship it. It improves AI-rewrites-of-human from 30% to 46–56%, but int8 quantisation costs it 5.2 points of recall so it cannot run in the browser, stories regress from 79.8% to 69.3% and journalism from 89.1% to 81.0%.

## Rules demoted to editorial suggestions — 2026-08-28

- Stopped the 113 weighted writing-signal rules (`en-signals:2026.08.6`) contributing to the AI verdict. Re-measured on the same fresh long-form corpus, they detected 45.1% of AI writing while flagging 24.8% of human writing — worse than the cycle-2 model on both axes at once. They are now presented as editorial suggestions: feedback on phrasing and structure, never evidence of authorship.
- Withdrew the `finding_breadth` escalation message, which told users that human evaluation controls peaked at 2 categories. Real humans reach 5, 6 and once 11 categories, and the claim caused 135 of 139 rules-layer false positives.
- Retained the deterministic character forensics unchanged: invisible carriers, homoglyphs, the watermark scan and provenance stay exact and near-zero false positive.

## Combined verdict 2026.08.8 — 2026-08-28

Reworked `packages/core/src/verdict/combine.ts` into three independent axes that are never merged:

- `ai_probability` — only a trained model may set it. With no model reading it is `not_assessed`, and `not_assessed` does not mean human. Character findings and writing rules can never reach it.
- `text_integrity` — `clean`, `attention` or `manipulated`. It reports what was done to the text: invisible carriers, homoglyph substitution, private-use clusters, watermark marks. It may say the text contains hidden characters. It never says the text is AI.
- `editorial` — suggestion level `none`, `some` or `many` from the 113 rules. Phrasing and structure only.

The single `classification` field and its `ai_like` escalations are removed. A hidden zero-width character proves text manipulation, not AI origin.

## 0.1.0 - 2026-08-26

- Added schema/contract 1.0 foundation, OpenAPI, cross-language fixtures, deterministic core, browser adapter and hash-only receipts.
- Added local candidate surfaces for Astro, Chrome, WordPress, Node CLI, Python loopback service and offline benchmark mechanics.
