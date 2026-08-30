# HANDOVER — Opace AI Content Verification, Integrity & Watermark Checker

**Cost-control correction — 29 August 2026.** Cloud Run now has enforced spend-cap budgets.
The live detector has a separate £50 monthly spend cap scoped to project `opace-ai-detector` and
service `Cloud Run` (budget `3b89c8af-bd1c-434f-8cab-3e0d14491e71`, status `Configured`). The
existing £10 alert budget still feeds the fast kill switch. Service and revision maximums are 1;
revision `opace-detector-00005-284` serves 100% of traffic. Older “no Cloud Run setting bounds
the bill” wording below is superseded. Enforcement is not instant and can overshoot, so neither
the kill switch nor browser fallback is redundant.

**Written 29 August 2026.** Read this before doing anything. Then read `OBJECTIVE.md` (binding
acceptance criteria) and `BRIEF.md` (original intent). This file exists so you do not repeat
work, re-derive findings, or reintroduce bugs that have already been fixed once.

Everything here was measured, not assumed. Where a figure is unverified it says so.

---

## 1. What this is

A free, open-source AI content detection and integrity tool. Not one detector but several
named checks that stay separate and never merge into a single authorship verdict:

| Check | What it does | Where it runs |
|---|---|---|
| Trained classifier | AI probability from a fine-tuned e5-small | EU server (default) or browser |
| Invisible characters | 38 carrier rules, 415 code points | Browser only |
| Homoglyphs | 60 Cyrillic/Greek lookalikes, mixed-script gated | Browser only |
| Writing signals | 116 named rules — **editorial suggestions, never detection** | Browser only |
| Watermark scan | Real SynthID-Text maths, public demo keys | Browser only |
| C2PA provenance | Content Credentials for images and PDFs | Browser only |

**The binding rule:** an AI score is never presented as proof of authorship. Three axes
(`ai_probability`, `text_integrity`, `editorial`) publish side by side and `assertAxisIndependence`
throws if they contaminate each other. A hidden character proves text *manipulation*, not AI
*origin*. Do not collapse these.

---

## 2. Where everything lives

| | |
|---|---|
| Code repo (public) | https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker |
| Local path | `…/other-plugins/ai-watermark-and-content-authenticity/implementation/` |
| Tags | `v0.1.0`, `v0.1.1` (token-bounded segments), `v0.1.2` (attribution + weaknesses) |
| Website repo | `OpaceDigitalAgency/opace-latest`, branch `main`, deploys via Netlify on push |
| Website local path | `…/opace-website/astro-latest/` |
| Live checker | https://opace.agency/tools/ai/content-verification-integrity/checker/ |
| Inference server | `https://opace-detector-877422072168.europe-west1.run.app` |
| GCP project | `opace-ai-detector`, region `europe-west1` (EU adequacy) |

**The programme root** (`ai-watermark-and-content-authenticity/`) is **not** version controlled
and is 13 GB. Only `implementation/` is a git repo. The other 12 GB is training corpora,
checkpoints, and six cloned third-party research repos with their own `.git` directories.
Programme docs are mirrored into `implementation/docs/programme/`.

---

## 3. Current status

**Live and working.** Verified end to end on 29 August 2026: a 459-word AI sample scored 98.7%,
two sections, on the EU server, in 4.4 seconds.

- Both routes run segmentation contract **`segments-v3`** and flag points **0.9855 / 0.9763**.
- Server: fp32, revision serving 100% of traffic, scale to zero.
- Browser: int8 per-channel, 34.3 MB on explicit consent.
- Cost controls live and tested. Kill switch fires in under 10 seconds.

**Not yet published:** WordPress plugin, Chrome extension, npm packages, PyPI. Built and tested,
no store listings exist.

---

## 4. The findings that matter

### 4.1 The register confound — the central discovery

The original classifier was trained on **chat replies** while users paste **articles**. The same
model scored one text 66% as a chat reply and 4% as an article. Retraining on published-register
data took AUROC from **0.53 to 0.97**, detection to 90%+, and human marketing copy wrongly
flagged from 42.7% down to 1.4%. Academic went from 0% to 79–93%.

If detection ever collapses inexplicably, check the register of the training data first.

### 4.2 Take the MAXIMUM segment score, never the mean

Documents are cut into sections and scored individually. Averaging measured **57.8%** against
**93.3%** on the same documents. A half-AI document averages out to look human. This is why
paid tools report 0% on a whole document then flag the same text pasted in blocks.

The server enforces `aggregation: "max"` and the browser refuses to render anything else.

**Since 2026-08-29 the flag RULE reads two sections, though the reported number is still the
maximum.** A document is flagged when its strongest section reaches 0.9855, or its second-highest
reaches 0.9763 — minimum evidence. It was fitted on both runtimes at once, not on fp32 alone: the
fp32-only pair 0.9845/0.9765 takes browser false positives from 90/4,636 to 106/4,636 and was
approved as "detection at matched false positives", which is true on fp32 and false in the
browser. Nothing is averaged, and averaging still catches 11/700 of half-AI documents against the
maximum's 612/700. See §9 item 4a for what the change costs.

### 4.3 Word counts are not token counts

Segments were bounded at 340 *words* on the assumption that always fits the model's 512-token
window. On dense prose — academic, technical, long words — it does not. **1,348 of 23,318
segments (5.78%) overflowed, affecting 684 of 5,558 documents (12.31%)**, worst case losing
2,894 tokens from one segment. Silent data loss, in the exact place segmentation existed to
prevent it.

Now bounded by *measured* tokens: **0 of 21,093** over the limit. Both implementations agree on
**5,558/5,558** documents.

### 4.4 The two runtimes barely disagree; the thresholds did

fp32 server and int8 browser differ by a median of **0.0002** in the decision region. But the
thresholds had drifted to 0.980 and 0.984 independently — a gap **larger** than the runtime
disagreement it was meant to absorb. Three documents in 60 got different verdicts depending on
route, including a genuine human academic paper the server flagged and the browser cleared.

Both now share 0.984. **The durable finding is that both routes must share one threshold, not
that the number is 0.984** — it was derived against the current pipeline and must be re-derived
if segmentation changes again.

### 4.5 What the signals actually measure

AI under-repeats itself: **2.1%** content-word overlap between adjacent sentences versus human
**6.3%**. Eight of the top ten signals measure this. Causally confirmed: making text repeat more
costs 33 points; removing all AI vocabulary costs **0.8 points**. Burstiness, the most-cited
heuristic in the field, scores **0.521 — a coin flip**.

A 24-feature transparent scorecard reaches 72.1% against the neural model's 89.8%, so roughly
62% of its behaviour is reconstructible from named features.

---

### 4.6 Length is the dominant weakness, and it is measured

On 816 generated short-form documents, matched topics, model balanced, three prompt styles:

| length | detected |
|---|---|
| 100 words | **22.6%** (44/195) |
| 300 words | 85.0% (175/206) |
| 400 words | 81.2% (169/208) |
| 600 words | **93.7%** (194/207) |

A 71-point gap. **Prompt style is not the weakness**: "write like a human" scored 72.2% against a
plain 75.4% and a house brief's 66.4%, intervals overlapping. Model made no difference (sol
72.3%, luna 70.4%).

Human short-form false positives on 4,368 passages from 9 sources: **0.55%** [0.37, 0.82], worst
register fiction at 3.25%. **The human side is not the constraint at any length.**

### 4.7 Keyword repetition is a cliff, not a slope

Type-token ratio — how much a document repeats its own vocabulary — is the axis the model's
dominant signal keys on (AI under-repeats; humans repeat). Binned by achieved TTR at 400w/600w:

| TTR | detected |
|---|---|
| 0.55 and above | 86–88% |
| 0.50–0.55 | **79.5%** |
| 0.46–0.50 | 57.6% |
| below 0.46 | **16–20%** |

Flat until ~0.55, then it collapses. **Routine keyword-optimised copy is fine** — a realistic
"moderate" condition scored 69.9% against a 71.3% baseline, not significant. The collapse needs
TTR below ~0.46, which took repeating a phrase 17–25 times and left 19% of generations unusable.

**But long commercial copy drifts there on its own**: the baseline 600-word median is 0.568, just
above the knee. The owner's missed article sits at 0.51, on the shoulder — pooled 400w+600w at
his level gives 103/136 (75.7%) against a matched baseline of 363/415 (87.5%), p=0.001.

**Commercial consequence, and it belongs in the listings:** the tool degrades on exactly the copy
its commercial users produce, once that copy is long and keyword-focused enough. This will be a
field-wide weakness rather than ours alone, because it follows from the signal everyone relies on.

### 4.8 Paraphrase defeats the watermark completely

40 rewrites of 12 watermarked passages, two named local paraphrasers: mean g from a baseline
median of 0.6722 to **0.5088** against a null of 0.500. **Zero of 40 detected** under the lab's
own rule. Not shortening — a length-preserving control leaves detection at 36/36. Not meaning
destruction — similarity median 0.979 against an unrelated floor of 0.747, blind grader found
0 of 24 destroyed, and the arm producing *better* paraphrases destroyed *more* signal.

Demo keys, depth 6, 400-token passages. Says nothing about production watermarks and does not
contradict the ~800-token recovery claim in the literature.

## 5. Bugs already found and fixed — do not reintroduce

| Bug | Lesson |
|---|---|
| Two agents implemented segmentation incompatibly — client fanned out one request per section against a 5-requests/minute limit | A long article would have rate-limited its own author. **One document, one request.** |
| Kill switch fired on **routine** budget messages | Cloud Billing publishes on every update carrying current spend, even £0.02. It took the service down repeatedly. The function must inspect `alertThresholdExceeded` / `forecastThresholdExceeded` and incident `state`. |
| Kill switch crashed silently — POSTed to `:getIamPolicy` | Cloud Run v2 wants GET. It threw on an HTML error page and the service stayed up for 200 observed seconds with no signal. |
| Kill switch 403 | `roles/editor` does not include `run.services.setIamPolicy`. Needs `roles/run.admin`, scoped to the service. |
| Three shipped messages made false claims about human writing | Measured on 169 unrepresentative documents. Against 4,144 real ones: "controls peaked at 2 categories" actually reaches 9; "human max 4" is 11; "fired on no human control" fires on 4. Regression tests now block any bare superlative about human writing. |
| Repo URL 404'd from 15 files | Including `CITATION.cff` and every npm README. |
| Vendored tarballs packed with `file:../` specs | Created dangling `link: true` lockfile entries and broke Netlify twice. Use `npm run pack:vendor`. |
| `npm install` silently restored a stale vendored package | The lockfile's integrity hash still matched the old tarball. Remove the four `@opace/*` lock entries first. |

**An untested control is not a control.** The kill switch failed twice, once silently, before it
worked. `SECURITY.md` §7.1 predicted exactly this before it was built. Re-fire it after every
redeploy and IAM change, and re-run the zero-logging marker probe for the same reason: both
depend on deploy-time configuration a future deploy can drop with nothing failing.

---

**Five search artefacts in one afternoon, across three sessions.** A probe that cannot
distinguish success from failure returns whichever answer the searcher expected:

- phantom `66.7` regex hits, and unanchored digit runs that produced a false "half-deployed build"
- `detectC2paTextCredentials` returning zero in a **minified** bundle — as do `previewSafeFixes`
  and `inspectUnicode`, which are certainly present
- `C2PATXT` returning zero because it exists only in a **source comment**; the real magic is the
  numeric literal
- `segments-v2` counted ×6 in a chunk, triggering a **production incident call** — both strings
  legitimately coexist, because v2 appears in comments and inside the drift guard's own error
  text while v3 is the live constant

**The rule: prove the probe against a known-good target before trusting it. And when a string
search is ambiguous, run the behaviour instead.** A single end-to-end run of the live checker
settled in four seconds what a grep could not settle at all, and would have prevented a rollback
of a working production service.

## 6. Environment gotchas that will waste your time

- **Python tests need a specific venv.** `test_segments.py` imports `transformers`, absent from
  system Python. Use
  `services/local-engine/research/current-models/.venv/bin/python3`.
  `deploy.sh` correctly refuses to build if these fail — that guard is working, not broken.
- **`requestAnimationFrame` never fires in a hidden tab.** Driving the checker from a background
  browser tab makes runs appear to hang forever with no error. This cost an hour and produced a
  false "the live site is broken" alarm. The code now races a 100 ms timeout, but if you are
  automating the UI, foreground the tab or shim rAF.
- **Concurrent `astro build` runs corrupt `dist/`.** Check for another build first.
- **`astro build` fails in place under Dropbox** — a post-build `rmdir` race, after all 697 pages
  generate. `✓ Completed` appears *before* the error. Build to a directory outside Dropbox. Not
  a code fault; Netlify is unaffected.
- **Never weaken a production abuse control to make testing convenient.** Work locally against
  the same model files when you need volume.

---

## 7. Calling the inference server

```
GET  /v1/challenge                     → {challenge, difficulty_bits: 14}
     solve: sha256(`${challenge}:${nonce}`) with 14 leading zero bits
POST /v1/token   {challenge, nonce}    → {token, max_checks: 20}
POST /v1/check   header x-opace-token  → {probability_ai, segments[], …}
```

**The header is `x-opace-token`, not `Authorization: Bearer`.** A browser-like `User-Agent` and
`Origin: https://opace.agency` are both required; scripted clients are refused with
`automation_detected`.

Send the **whole document in one request** — the server segments internally and returns
`segments[]` plus the maximum as `probability_ai`.

**Limits are counted in inferences, not requests.** A 3,000-word document is nine inferences.
Global 12,000/day; per-network 5/30/100 requests and 20/150/500 inferences; `MAX_WORDS` 4,000
(over that returns 413 — do not truncate, offer the browser route, which has no length limit).

---

## 8. Cost controls

**A £50 spend cap EXISTS and is Configured.** Budget "Opace AI detector £50 Cloud Run spend
cap", monthly, scoped to project `opace-ai-detector` and its Cloud Run service, £0.00 of £50.00
used, alerts at 50/80/100%, **Spend cap status: Configured**. A spend cap *pauses the service*
when the cap is exceeded, which is a Google-enforced stop rather than a reactive one.

**It is invisible to the API, and that is the trap.** `gcloud billing budgets list`, the REST v1
endpoint and the REST v1beta1 endpoint were all queried on 29 August 2026 and **all three return
only two budgets** — the £20 account-wide alert and the £10 detector budget. Two sessions
independently concluded from this that no spend cap existed, and one of them (this one) wrote
that conclusion into this file and told the owner not to tick the box. **The owner produced a
console screenshot and was right.**

**So: verify a spend cap in the Cloud Billing console, never by API.** Absence from the API is
not evidence of absence. This is the day's fifth verification failure and the only one where the
checking tool, not the control, was at fault — the opposite shape to the other four, and worth
remembering for exactly that reason.

Residual caveat, from Google's own console text: costs are usually recorded within 24 hours, so
even a spend cap acts on recorded spend rather than instantly.

**Correction, 29 August 2026.** An earlier version of this section said "no Cloud Run setting
bounds the bill" and quoted **£519/month** at two instances. Both were wrong, and the error was
mine. Requests are billed only when they reach a container; requests beyond
`instances × concurrency` are refused by Cloud Run's front end without starting one. So
**max-instances does bound every billed line**, at roughly
`(instances × concurrency) ÷ mean service time`. The £519 figure rested on an unmeasured
"network-limited 500 requests/second", it omitted egress, and it converted from USD when the
billing account is denominated in GBP and Google's GBP SKU prices apply.

**The real bound is the compute-and-memory floor: about £51/month at maxScale 1**, which is what
the service now runs, and £106 at maxScale 2. That is a genuine platform-enforced ceiling rather
than a reactive one, and it is a better position than the earlier arithmetic suggested. Full
working in `.agent/docs/ai-content-integrity/COST-CEILING-OPTIONS-2026-08-29.md`.

**What actually protects the account**, in order of speed:

1. **maxScale 1** — a platform bound. Excess requests are refused before they cost anything.
2. **The kill switch** — a Pub/Sub topic `detector-killswitch` fed by a Cloud Monitoring alert
   (600 requests/minute sustained 5 minutes) and the £10 budget, driving a Cloud Function that
   revokes public access and closes ingress. Nothing is deleted; `enable-service.sh` restores it.
   Visitors are offered the in-browser model, so the tool degrades rather than breaks.
3. **The £10 budget** — the slow backstop, trips around £2 of actual spend, lags by hours.

**Do not call this a "£50 ceiling".** That shorthand is how the owner came to believe he was
capped. The kill switch is **reactive, with a detection lag**: it acts after spend begins, not
instead of it. Say "kill switch with a lag" and give the maxScale bound separately.

**Timing, split because only one half is measured, and quoted as a range because it varies.**
Delivery from a real Monitoring alert to the endpoint refusing is **measured at 44–88 seconds
across three fires**, two of them on revision `00005-284`. Do not quote a single figure: the
spread is Google's own, and it decomposes to prove it. The kill-switch function logs when it
acts, so each fire splits into upstream (Monitoring log-match evaluation, incident open,
notification delivery, Pub/Sub, Eventarc), the function itself (2.4 s on a cold start, warm
otherwise), and propagation (sub-second). **The entire variance sits upstream of the function.**
The detector service is not in that path, so its instance count cannot influence it — which is
how a suspected maxScale regression was ruled out on mechanism rather than on numbers.

A full drill takes the service down for 5–9 seconds; total unavailability across an entire
re-verification pass was about 14 seconds.

Detection — how long the alert takes to open on a real flood — is **still an estimate**, because
nobody has run 600 requests/minute for five minutes against the live endpoint. The old
"6–8 minutes" conflated the measured and estimated legs and read as though both were measured.

Expected running cost with everything working: **~£0.02/month**, 18.8% headroom inside the free
tier.

---

## 9. Where the tool is weakest — publish this, never bury it

Ranked by likely harm. All from the 5,558-document fresh long-form corpus (922 AI, 4,636 human)
unless stated.

1. **Human fiction — 29 of 260 wrongly flagged (11.2%).** The model was never trained on human
   fiction: the corpus has 300 AI fiction samples and no matched human set. Novelists should not
   rely on this.
2. **Keyword-repetitive commercial copy.** Detection is flat at 86–88% until type-token ratio
   falls below ~0.55, then collapses: 79.5% at 0.50–0.55, 57.6% at 0.46–0.50, **16–20% below
   0.46**. Routine keyword optimisation is safe; long SEO copy drifts towards the knee on its
   own (600-word baseline median 0.568). See §4.7. **Publish this with the listings** — it is
   the weakness that lands on the tool's own commercial users.

3. **Short text** — 22.6% at 100 words against 93.7% at 600, measured on 816 documents (§4.6).
   Superseding the older 67%/50%/19% figures, which never had a denominator. *Denominator not recorded anywhere;
   needs re-measurement.* No false positives on 400 human samples at 60–200 words.
3a. **Re-binned by achieved word count, three bands read materially worse than the headline.**
   `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md`, 30 August 2026, shipped `0.9855/0.9763` on
   fp32, harness re-verified against 883/922, 45/4,636 and every published per-model cell first.
   The 100-word band is **16.9% (29/172)** when binned by the words a passage actually has rather
   than the length it was asked for — the published 22.6% grouped by target length and so included
   passages that came back longer. **600–849 words reads 88.5% (46/52)** and 850–1,199 reads
   **90.7% (175/193)** on the long-form corpus, against a 95.77% headline whose median AI document
   is 1,612 words. The headline is a long-document figure and should not be quoted for a blog post.
   Two things it also settles: the 850–1,199 human false-positive spike of **30/1,050 = 2.9%** is
   **entirely fiction** — 22 of the 30, with 8/809 = 0.99% once fiction is removed — so it is item 1
   reappearing as a length band, not a new weakness; and **no AI document in any corpus here exceeds
   3,061 words**, so above 3,500 words the project has human documents only and **no AI detection
   rate exists at any length beyond 3,061**. The server accepts up to 4,000 words, so the unmeasured
   range starts inside what it will score.
3. **AI rewrites of a human original — 30–35%.** Contrast: AI draft then human tidy, 82.3%.
4. **Academic** — discussion 3.81% (16/420), conclusions 2.78% (10/360), introductions 1.90%
   (8/420), lit reviews 0/225, student essays 0/420. Hardest AI register: academic essays 92.42%.
4a. **Mixed documents, since segments-v3 — 604/700 against 612/700.** Half-human, half-AI
   documents are the case maximum aggregation exists to catch, and the minimum-evidence rule
   catches fewer of them than the single-threshold rule it replaced: 9 lost against 1 gained on
   700 purpose-built half-AI documents, McNemar p = 0.027. **Structural, not statistical.** Every
   lost document has its strongest section between 0.9840 and 0.9855 — the gap opened by raising
   the primary flag point — and its second-highest section is the *human* half, median 0.4365. A
   second-section rule cannot rescue a half-AI document by definition of what makes it half-AI.
   Accepted deliberately, against the alternative pair that wrongly flags 16 more people in 4,636
   and takes browser academic discussion to 5.48%. **The corpus contains no mixed documents, so no
   amount of cross-validation on it can see this axis** — the pair wins 194/200 split-halves on
   fp32 and 200/200 in the browser, and both are blind here. That is a limitation of the
   validation method and applies to every future operating point fitted the same way.

5. **Business reports** — 205 human reports total, 72 held-out rows, AUROC 0.6935 against
   0.93–0.99 elsewhere. Clears the floor; must not be quoted as settled.
6. **Writing rules alone** — 45.1% detection at 24.8% false positives. Editorial feedback only.

### Superseded figures — do not quote

- **"Academic is the highest false-positive genre"** — measured at threshold 0.9110, which does
  not ship. **Fiction is clearly higher.**
- **90.3% detection / 1.34% false positives** — pre-segmentation, one truncated pass per
  document. Segmented fp32 reads 96.9% at 2.09% (0.980) and 95.1% at 1.21% (0.984).
- **66.7% at "zero false positives"** — artefact of a corpus 76% encyclopaedic and Q&A text.
- **Median Δp 0.113 between runtimes** — that was int8-web vs int8-**Python**. The server is
  **fp32**; the correct decision-region figure is 0.0002.

---

## 10. What we actually built on

Genuinely used and extended: **[Pangram Labs](https://arxiv.org/abs/2402.14873)** hard-negative
mining (the largest single debt — it took published-prose AUROC from 0.530 to 0.970),
**[synthid-text](https://github.com/google-deepmind/synthid-text)** (detection maths ported to
TypeScript), **[avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing)**,
**[watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover)** (carrier tables,
and the project that inspired this work), GPT-2 tokeniser, DivEye, GLTR, and twelve corpora.

**Cloned but never used:** `fast-detect-gpt`, `binoculars`, `sira`, `bira`, `ai-detector-bench`,
`humanizerbench`. Verified by word-boundary search across every shipped package: zero hits.
Fast-DetectGPT's curvature statistic and GLTR's rank buckets *were* reimplemented from their
papers as **evaluation baselines** in `services/local-engine/research/signal-science/baselines.py`
— that is measurement, not derivation. Do not claim the project builds on them.

Base model `intfloat/e5-small` is **MIT**, confirmed from the model card 29 August 2026. This
cleared a blocker that three documents had recorded as outstanding before public release.

---

## 11. The bigger picture — one engine, six surfaces

This was never only a web checker. The strategy is **one compiled engine, many shells**, so that
identical input produces identical findings everywhere and there are no parallel analysis
implementations to drift apart. `@opace/content-integrity-core` (TypeScript, MIT) is compiled
once and bundled into every surface; PHP and Python act as orchestration only. A cross-surface
test battery proves the installed engine on the website is byte-identical to source on findings,
methods, signals and versions.

### The four re-vendored surfaces, 30 August 2026

The Chrome extension, WordPress plugin, Astro integration and CLI each carried a frozen engine
packed on 26 August; the first three were byte-identical. Those copies predated the C2PA
credential guard, the six repaired span anchors **and the whole `en-signals` rule set**. All four
are rebuilt from the current core. Current hashes: WordPress 1.0.6 ZIP
`66df5f24…aa1d003a`, Chrome 1.0.0 ZIP `27272820…ebe9e9d2`, Astro 0.1.0 tarball
`0fd6716e…15b86d7a`, npm five-package manifest `ae143295…aa373f5f17`, vendor pack in
`dist/g3-revendor-2026-08-30`, CLI/client set in `dist/ts-client-cli-2026-08-30`.

**Bringing the current engine and leaving detection unchanged are not both possible here.** On
4,144 human documents the frozen copies fired 2 rules and 570 findings; the current engine fires
73 and 8,346. No rule present in both changed its per-document fire count — nothing was lost — but
the four surfaces now report editorial writing signals their audited builds did not. Listing copy
and the WordPress rules audit both need redoing before submission.

### Release state — everything is built and tested, almost nothing is published

| Surface | Version | Built | Tested | Published |
|---|---|---|---|---|
| Web checker | live | ✅ | ✅ | ✅ **live** |
| Cloud Run inference | live | ✅ | ✅ | ✅ **live** |
| GitHub repository | v0.1.2 | ✅ | ✅ | ✅ **public** |
| WordPress plugin | 1.0.6 | ✅ | ⚠️ re-vendored 30 Aug; gates open | ❌ not on wordpress.org |
| Chrome extension | 1.0.0 | ✅ | ✅ | ❌ not on the Web Store |
| npm packages ×7 | 0.1.0 / 0.0.0-private | ✅ | ✅ | ❌ not on npm |
| PyPI `opace-content-integrity` | 0.1.0 | ✅ | ✅ | ❌ not on PyPI |
| Astro integration | 0.1.0 | ✅ | ✅ | ❌ not in the catalogue |

`docs/RELEASE-STATE.md` is the authoritative row-by-row register with test counts, SHA-256
hashes of the exact candidate artefacts, and the gate each one is waiting on. Read it before
publishing anything — the frozen artefacts have recorded hashes and must not be silently
rebuilt.

### What each surface still needs

**WordPress plugin (`wordpress/opace-ai-content-integrity/`, v1.0.6).** An exact ZIP exists with
a recorded hash. 1.0.6 rebuilds `assets/js/core.mjs` from the current core (30 August 2026), so the
independent package and rules audit that 1.0.4 passed does not carry over — and the rules audit in
particular must be redone, because the rebuilt engine carries 71 writing-signal rules the audited
build did not have. **The PHP/JS parity break is resolved as a declared subset (30 August 2026), and is no longer
the top blocker.** `includes/Analysis/` is 507 lines of PHP serving the editor sidebars' REST
route and the receipt `SessionService` writes, while the Lab runs the browser engine. It exists
because PHP cannot execute the compiled engine and those routes answer on the server — not
because it is vestigial. Measured: on 1,200 human-corpus documents the PHP reproduces the
engine's `en-gb:2026.08.1` pack exactly (0 mismatches) while the engine reports 2,156 findings
to the PHP's 104; on Unicode it is a coverage gap, 16 code points against 38 carrier rules and
three private-use ranges, with 12 of 15 probed carriers — the `U+E00xx` tag block included —
caught by the engine and missed entirely by PHP. The subset now declares
`wp-php-subset:2026.08.1`, its method names and limitations say it is a subset and point at the
Lab, and the sidebars read "quick check", report running 3 of 116 writing rules, and say a nil
result is not a clean result. `cross-runtime-parity.test.mjs` changed purpose — it asserts the
declared subset rather than equality, and says so in the file — and passes 16 of 16. **The §11
end state is still open and is a product decision:** routing the sidebars through the compiled
engine in the browser and deleting the 507 lines. Remaining: a
wordpress.org submission (SVN, not git), the `.wordpress-org/` banner and icon assets are already
committed, and `readme.txt` now carries the credits and the weakness list. WordPress.org readme
does not render SVG, so charts must be linked rather than embedded. Per the owner's standing
rule, **always add cache busting and increment the version** on any plugin change.

**Chrome extension (`extensions/chrome/`, v1.0.0).** An exact 15-file Web Store ZIP with a
recorded hash, a passing validator, and a full listing bundle under
`extensions/submission/chrome-web-store/` — screenshots, promo tiles, privacy practices and a
moderation checklist. Remaining: the Web Store submission itself and the developer-account steps.
The single-purpose justification and data-use disclosures are already drafted.

**npm packages.** `@opace/astro-content-integrity` and `@opace/watermark-lab` are at 0.1.0; the
other five are `0.0.0-private` with `"private": true`. Publishing means removing that flag and
setting real versions — do not do it accidentally. The website consumes these as vendored
tarballs from `vendor/content-integrity/`, so publishing to npm changes how the site installs
them and needs coordinating.

**PyPI and Astro catalogue.** Candidates prepared and audited; submission not started.

### Publication order that avoids rework

1. Finish the README and evidence charts (in flight) — every other listing links back to it.
2. Publish the npm packages, because the Astro integration and CLI depend on them.
3. Submit the Chrome extension (longest review queue, so start it early).
4. Submit the WordPress plugin.
5. PyPI and the Astro catalogue last.

Store listings must carry the weakness list, not just the headline figures. `DESCRIPTIONS.md` is
the canonical source for listing copy and its claims ladder now **forbids quoting a detection
rate without its weakest-case figure**. Use it rather than writing fresh copy per surface.

---

## 12. Decisions taken, and why

Recorded so they are not silently reversed.

**Server-side inference is the default, browser is one click away.** The owner's position was
"I don't want to download, I just want it to work", and the download was the single biggest
barrier to the tool being used. The browser route remains, unchanged, for anyone who wants
nothing to leave their machine. Both routes must stay honest about which one ran.

**Both routes share one threshold.** See §4.4. A tool that contradicts itself depending on which
route happened to run is worse than one slightly miscalibrated.

**The public repository excludes third-party clones, corpora and checkpoints.** The programme
directory is 13 GB; the repository is ~125 MB. Cloned research repos are other people's work
with their own licences and are credited rather than redistributed. Corpora are excluded partly
for size and partly because much of the human corpus came from sources that do not permit
republication. The **one model the tool actually ships** (33 MB int8) is committed so a clone can
run the detector; the 128 MB fp32 server model exceeds GitHub's file limit and is a release asset.

**Repository named `opace-ai-content-verification-integrity-checker`.** Renamed 29 August 2026
from `opace-ai-content-integrity` for search visibility. 57 URLs across 56 files were updated.
GitHub redirects the old slug, but do not rely on that in new material. **npm package names were
deliberately not renamed.**

**`strategy/` and `market-snapshots/` are deliberately unpublished.** The first is Opace's
commercial roadmap and backlink plan; publishing it hands competitors the plan. The second
contains competitor plugin ZIPs, and redistributing those binaries is a licensing problem.
This was a deliberate exclusion, not an oversight.

**The watermark lab gets its own repository.** *Decided, not yet done.* Rationale:
`watermarks-remover` earned thousands of stars as a focused, visual, single-purpose tool, and it
is what inspired this project. Ours is invisible as a `packages/` subfolder to anyone searching
for SynthID, and watermarking becomes materially more important once Anthropic ships it.

The split is clean because the dependency runs **one way only**: the lab has no runtime
dependencies, makes no network calls, and the trained classifier never calls it. The main repo
would consume it as a normal npm dependency, pinned to a version. Cost: two releases instead of
one when the maths changes — rare, realistically only when a provider publishes a key.

The watermark check **stays built into the checker**, on by default, exactly as now. Moving the
package does not change the product; the checker just installs it from npm instead of finding it
in a subfolder. `docs/WATERMARK-LAB.md` was written to serve as that repository's README
unchanged.

Build the standalone UI around the **wrong-key experiment** — a watermarked passage collapsing
from 0.6807 to 0.4987 under a different key — rather than a pass/fail badge. It is the most
compelling result in the project and it is what stops people believing a watermark checker can
catch Claude.

---

### 9.1 The cost of the minimum-evidence rule, taken knowingly

Shipping `0.9855/0.9763` **weakens mixed-content detection**: 604/700 half-AI documents caught
against plain maximum's 612/700 — 9 lost, 1 gained, McNemar p = 0.027. Structural, not
statistical: raising the primary opens a gap that half-AI documents fall into, and they cannot
be rescued by a second-section rule because their second section is the human half.

It was taken to hold browser false positives flat at 90/4,636 rather than let them rise to 106,
which the alternative pair required, and which would have taken browser academic discussion
from 3.81% to 5.48%. **Never describe this rule as free.** Both routes gain the two-section
improvement, 81.08% → 91.89%.

**200 split-halves won 194/200 and 200/200 and could not see this** — the corpus contains no
mixed documents, so no amount of corpus cross-validation can measure that axis. A limitation of
the validation method, not of the pair.

---

## 13. Outstanding work

**In flight when this was written:** an agent building SVG charts of the measured results and
restructuring the README so evidence and attribution are near the top rather than at line 332.
The repository has 31 committed images and not one is a chart of a result.

**Decided but not done:**

- Spin out the watermark lab (see §12).
- **Port the watermark generation path** (tournament sampling). Only detection is ported, so a
  user cannot yet watermark their own text and then detect it — which is much of what made the
  inspiring project compelling.
- Publish the five remaining surfaces (see §11).

**Known gaps, honestly recorded:**

- The browser's own full-corpus segmented curve has never been measured (~5 hours of compute).
  `thresholds.json`'s `measured` block still carries v1-derived browser figures.
- Zero body logging is audited on the **scoring path only**. Refusal (413, 429) and error paths
  run different code and are unprobed.
- Per-IP and token state are per-instance, so real limits are up to 2× nominal. Roughly 24
  rotating /64s could exhaust the daily cap.
- The global cap is itself a denial-of-service vector, survivable only because the in-browser
  route has no limits. This is why every refusal must carry the local-model fallback.
- DPIA and published lawful-basis notice outstanding.
- No adversarial robustness measured for the watermark lab: paraphrase, translation round-trips,
  targeted removal.
- Short-text detection figures have no recorded denominator.

**Deferred with the owner's knowledge:** teacher mode, GPTZero head-to-head (~£40, his call).

---

## 14. Working rules that were hard-won

- **Publish the runtime a figure came from.** Python and browser numbers are not
  interchangeable; a figure measured in one must not be quoted for the other.
- **State denominators.** A percentage without one has caused three separate false claims here.
- **A bad number found now beats a good number found after launch.** The owner has consistently
  chosen the less flattering accurate figure. Do not soften findings to make the tool look better.
- **Verify before claiming.** Two claims in this project were retracted because they were
  inherited from another document rather than checked: the 22–33% stripped-detection figure (real
  answer 5.3–11.5%) and "Copyleaks runs at ~9% false positives" (only Originality was measured at
  9.24%, by a rival; Copyleaks claims ~0.2%).
- **Refuse rather than round over.** The front end refuses to score when the server's segmentation
  contract, boundaries or character offsets disagree with its own. Those offsets drive passage
  highlighting, so a silent mismatch would point a reader at the wrong paragraph — a trust bug no
  aggregate metric would catch.
- **Coordinate the two deploys.** Bumping `SEGMENTATION_CONTRACT` on one side makes the other
  refuse every response. Deploy the server first, then the site immediately after; roll back in
  reverse.
