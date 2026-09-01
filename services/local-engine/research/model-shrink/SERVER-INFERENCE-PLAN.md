# Server-side inference — design, costs and default experience

**Date:** 29 August 2026 · **Author:** model-shrink workstream (redirected)
**Supersedes:** the download-shrinking brief, closed in
[`MODEL-SHRINK-REPORT.md`](MODEL-SHRINK-REPORT.md)
**Reference implementation:** [`reference-server/`](reference-server/)
**Measurements:** [`results/`](results/) · **Scripts:** [`scripts/`](scripts/)

---

## 1. The recommendation in one paragraph

Run the deployed cycle-2 model as a hosted endpoint that the checker calls by default,
with no prompt and no download. Host it as a scale-to-zero container on **Google Cloud
Run in `europe-west1` (Belgium)**, which costs **nothing** at every traffic level in the
brief because 10,000 checks a day consumes about two-thirds of the monthly free tier,
plus **about £9 a month** if a warm instance is kept to remove cold starts. Serve the
**fp32** file rather than the int8 one: it is 25% faster on CPU, and it sidesteps the
onnxruntime-web quantisation divergence entirely, because there is no web runtime any
more. Keep the existing consent-gated local download as a clearly labelled alternative,
and fall back to offering it when the endpoint is unreachable. Send only the text the
model actually reads — the first 512 tokens — so the amount leaving the browser is
minimised by design rather than by promise.

**The trade-off, stated plainly and not buried:** the text now leaves the visitor's
device. "Your text never leaves your browser" stops being true the moment this ships,
and every place that sentence appears must change on the same deploy. What replaces it
is a weaker but still strong claim — the text is sent over TLS, held in memory for
roughly a third of a second, never written to disk, never logged, never used for
training, and discarded when the response is returned. That claim is only worth making
if it is verified rather than asserted; §9.1 is the audit that makes it true.

---

## 2. What is actually being hosted

| | |
|---|---|
| Model | `tier3-cycle2-e5small-fp32.onnx`, 133.75 MB, e5-small, 33.4M parameters |
| Task | one forward pass, two logits, sequence classification |
| Input | first **512 tokens** of the submitted text — roughly the first 380-400 words |
| Operating point | probability 0.98, temperature 0.8324, from `tier3-cycle2-config.json` |
| Accuracy at that point | 88-90% of AI long-form detected at ~1.2% human false positives, on 922 AI / 4,636 held-out human documents |

The 512-token limit is not a detail — it is the single most useful fact in this
document, and §6.2 builds a privacy feature out of it.

## 3. What was measured, first-hand

Nobody publishes numbers for this workload, so they were measured. Apple Silicon,
onnxruntime 1.29, CPU execution provider. A cloud x86 vCPU is typically 1.5-2.5×
slower per core; the planning figures in §5 apply that multiplier.

### 3.1 Per-request latency, 512-token input, real 400-700 word documents

Interleaved measurement, 60 warm iterations per configuration
([`results/latency-bench-2.json`](results/latency-bench-2.json)):

| variant | threads | p50 | p95 |
|---|---|---|---|
| int8 per-channel, 34.3 MB | 1 | 182.9 ms | 254.6 ms |
| int8 per-channel, 34.3 MB | 2 | 131.7 ms | 235.3 ms |
| **fp32, 133.8 MB** | 1 | **165.0 ms** | 242.4 ms |
| **fp32, 133.8 MB** | 2 | **97.7 ms** | 188.3 ms |

fp32 is about 25% faster than per-channel int8 at every thread count. Dynamic
per-channel int8 pays quantise/dequantise around each MatMul and misses the optimised
fp32 GEMM path; at 33M parameters nothing is memory-bandwidth bound, so the smaller
weights win nothing back. **Quantisation on this model buys download size and costs
speed.** On a server there is no download, so there is no reason to carry it.

### 3.2 Cold start, from a fresh OS process

Interpreter start → imports → tokenizer → ORT session → first inference returned, median
of five runs ([`results/coldstart-bench.json`](results/coldstart-bench.json)):

| | fp32 (133.8 MB) | int8 (34.3 MB) |
|---|---|---|
| Python + library imports | 0.957 s | 0.926 s |
| tokenizer load | 0.012 s | 0.006 s |
| **ONNX session creation** | **0.235 s** | 0.207 s |
| first inference | 0.060 s | 0.068 s |
| **total** | **1.27 s** | 1.20 s |

The hosting research could find no vendor figure for loading a 133 MB ONNX model at
boot, and warned that estimates in that area were guesswork. They were: **the model is
not the cold-start problem.** Loading 133.75 MB into an ORT session takes 235 ms, and
the 99 MB size difference between fp32 and int8 is worth 28 ms. The dominant term is
importing `transformers` and `numpy`, which costs nearly a second regardless.

Budget for a Cloud Run cold start: 1.27 s × ~2 for a slower vCPU, plus container and
runtime start, so **3-4 seconds worst case**, against Cloudflare's published 1-3 s
figure for its own containers. Warm requests are unaffected.

### 3.3 fp32 versus int8 accuracy — a five-document difference

Both scored on the full fresh long-form corpus, thresholds set per variant to realise
matched false-positive rates on the same 4,636 humans
([`results/01-baseline.json`](results/01-baseline.json)):

| variant | AUROC | detected @1.00% FP | detected @1.22% FP | detected @2.00% FP |
|---|---|---|---|---|
| int8 per-channel | 0.9915 | 88.29% (814/922) | 89.05% (821/922) | 92.73% (855/922) |
| fp32 | 0.9916 | 88.29% (814/922) | 89.59% (826/922) | 92.62% (854/922) |

Five documents out of 922 separate them. **Do not sell fp32 on accuracy** — the case for
it is that it is faster and that it removes the runtime-divergence class of bug, not that
it detects more. Per-register detection is identical to four decimal places at the 1%
operating point.

### 3.4 The bandwidth arithmetic that decides this

The cancelled plan was to auto-load the 34.3 MB model for most visitors. Compare the
two designs at 10,000 checks a day, assuming a conservative 2,000 of those come from
distinct first-time visitors who would each pull the file once:

| | auto-load local model | server-side |
|---|---|---|
| Bytes leaving the host per day | 2,000 × 34.3 MB = **68.6 GB** | 10,000 × ~15 KB ≈ **150 MB** |
| Per month | ~2.1 TB | ~4.5 GB |
| At Netlify's published $0.13/GB bandwidth rate | **~$273/month** | ~$0.60/month |

Server-side is not merely cheaper to compute. It cuts egress by roughly **99.8%**, and
the download design was the expensive one. The same arithmetic in time: 34.3 MB is about
11 seconds on a 25 Mbit/s connection and about 55 seconds on a 5 Mbit/s mobile one,
against roughly half a second for a warm server round trip from the UK to Belgium.

---

## 4. Architecture

```
browser                          edge                        inference
───────                          ────                        ─────────
paste text
  │
  ├─ tokenise-and-trim locally ──► POST /v1/check            ┌──────────────┐
  │  (first 512 tokens only)        {"text": "..."}          │ container    │
  │                                  over TLS 1.3            │ uvicorn × 2  │
  │                                      │                   │ ORT fp32     │
  │                             ┌────────▼────────┐          │ model in RAM │
  │                             │ CDN / WAF       │          └──────┬───────┘
  │                             │ · TLS terminate │                 │
  │                             │ · body size cap │  ~200-400 ms    │
  │                             │ · burst limit   │◄────────────────┘
  │                             │ · NO body log   │   {"probability_ai": …}
  │                             └────────┬────────┘
  │                                      │
  ◄──────────────────────────────────────┘
render score, band, disclosure

  └─ on failure ──► offer the local 34.3 MB model (existing consent-gated path)
```

Deterministic checks — invisible carriers, homoglyphs, watermark scan, provenance — stay
**entirely in the browser**. They are exact, cost nothing, and there is no reason to send
text anywhere for them. Only the classifier call is remote. The writing-suggestions tier
also stays local. This matters for the copy: on a page where the server is unreachable,
everything except the AI judgement still works.

The reference implementation is in [`reference-server/`](reference-server/):
`app.py` (endpoint, rate limiting, no-content-logging error handler), `Dockerfile`,
`requirements.txt`. It is a starting point that encodes the decisions below, not a
production deployment.

---

## 5. Hosting options and real costs

All vendor figures were verified against official documentation on 29 August 2026 and
are cited. Sterling conversions are approximate and should be re-checked on the day.
Traffic arithmetic marked *(calculated)* is mine, on the assumption of 1 vCPU, 1 GiB and
0.4 vCPU-seconds per request — a deliberately pessimistic reading of §3.1.

### 5.1 Google Cloud Run — recommended

- Request-based billing: **$0.000024/vCPU-s**, **$0.0000025/GiB-s**, **$0.40 per million
  requests**. Monthly free tier: **180,000 vCPU-s, 360,000 GiB-s, 2M requests**
  ([cloud.google.com/run/pricing](https://cloud.google.com/run/pricing)).
- No limit on container image size; 60-minute max request timeout; 4-minute container
  startup timeout; up to 32 GiB and 8 vCPU per instance.

*(calculated)* monthly consumption:

| checks/day | requests/month | vCPU-s | GiB-s | inside free tier? | cost |
|---|---|---|---|---|---|
| 100 | 3,000 | 1,200 | 1,200 | yes, 0.7% of it | **£0** |
| 1,000 | 30,000 | 12,000 | 12,000 | yes, 6.7% of it | **£0** |
| 10,000 | 300,000 | 120,000 | 120,000 | yes, 67% of it | **£0** |

Even 10,000 checks a day sits inside the free allowance with a third to spare. The cost
question is therefore not compute, it is whether you pay to avoid cold starts. Keeping
one warm instance (`min-instances=1`, 1 vCPU, 1 GiB) is **$11.61/month ≈ £9**, which
matches Google's own published worked example for exactly that configuration.

**Region:** `europe-west1` (Belgium), `europe-west4` (Netherlands) and `europe-north1`
(Finland) are Tier 1. `europe-west2` (London) is Tier 2 and priced higher — the Tier 2
rates were not verified, so if UK residency is wanted for its own sake, price it before
committing. EU hosting is covered by UK adequacy regulations (§9.4), so Belgium is the
cheap and legally simple answer, and adds perhaps 10-20 ms of round trip from the UK.

**Cold starts** are the one weakness: 3-4 seconds by the §3.2 arithmetic. At 10,000
checks a day (about seven a minute during working hours) an instance stays warm most of
the day anyway. At 100 a day nearly every check is a cold start. That inverts the usual
intuition — **the warm instance is worth more at low traffic than at high**, and £9 a
month for it is the cleanest purchase in this document.

### 5.2 Hetzner Cloud VPS — the flat-cost alternative

**CX23**, 2 vCPU / 4 GB / 40 GB NVMe, **€5.49/month excluding VAT ≈ £4.70**, at the
rates effective 15 June 2026
([docs.hetzner.com price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)).
20 TB of traffic included. Locations: Falkenstein and Nuremberg (Germany), Helsinki
(Finland) — **no UK data centre**, but EU adequacy covers it.

Two vCPUs at ~250 ms per request handle roughly 8 requests per second, which is about
**690,000 checks a day** — seventy times the top scenario in the brief. No cold starts,
ever. The costs are the ones a VPS always carries: you patch it, you monitor it, you are
the one paged when it stops. Two caveats from the research: the cost-optimised CX line
currently shows as unavailable to order, and the IPv4 surcharge was not verified.

**Fly.io** is the equivalent with less operational burden: `shared-cpu-1x` with 1 GB is
**$5.92/month ≈ £4.60** in Amsterdam, stopped machines are not billed for CPU or RAM, and
a stopped machine restarts in "well under a second" before your own model load.

### 5.3 Cloudflare — Workers ruled out, Containers viable

**Workers cannot host this.** The isolate memory limit is **128 MB** on every plan,
against a 133.75 MB model before the runtime and activations, and it is not raisable.
Compounding it: WASM modules count toward the 10 MB compressed script limit and
`WebAssembly.instantiate()` will not compile fetched bytes, so streaming the model from
R2 does not rescue it either. KV cannot even store the file — its value limit is 25 MiB
([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)).

**Workers AI cannot run this model.** It serves the Cloudflare catalogue; custom models
are a sales-gated arrangement with no published terms. A 2023 product called
Constellation did accept arbitrary ONNX uploads and no longer appears in the
documentation; its status is unverified and nothing should be planned against it.

**Cloudflare Containers** works and has been generally available since 13 April 2026.
$0.000020/vCPU-s and $0.0000025/GiB-s on top of the $5/month Workers Paid base, with
375 vCPU-minutes and 25 GiB-hours included; published cold start **1-3 seconds**
([containers/pricing](https://developers.cloudflare.com/containers/pricing/)). It is a
reasonable second choice, priced slightly above Cloud Run's free tier and below a VPS,
with the practical advantage that Cloudflare would already be terminating TLS.

### 5.4 Netlify Functions — possible, but the wrong shape

60-second synchronous timeout and 1-4 GB memory are ample. Two problems. First, the
deploy bundle must carry `onnxruntime-node`'s native Linux binaries plus the model under
a bundle ceiling that **Netlify does not document** — forum evidence points at the AWS
Lambda 250 MB unzipped limit, and whether the native addon works at all on Netlify's
Lambda architecture is likewise undocumented. Both would have to be settled by deploying
and finding out. Second, at 10,000 checks a day the credit arithmetic *(calculated:
~208 compute + 60 request credits)* lands at roughly **268 of the 300 free monthly
credits** before deploys and bandwidth, so the free plan breaks and Personal ($9) or Pro
($20) is needed. Cold-start duration is also unpublished, and cold-start time is billed.

Convenience is the only argument for it — the site is already on Netlify. That is not
enough to accept two undocumented limits in the critical path.

### 5.5 Render and Railway

**Render:** cheapest always-on is $7/month for under 1 CPU and 512 MB, which is
uncomfortably tight for a 133 MB model plus ONNX Runtime's arena allocation; the honest
tier is **$25/month** for 1 CPU and 2 GB. **Railway:** Hobby is $5/month including $5 of
usage at $10/GB-RAM-month and $20/vCPU-month. Both are more expensive than Cloud Run
free or a Hetzner box for no capability the workload needs.

### 5.6 Summary

| option | 100/day | 1,000/day | 10,000/day | cold start | verdict |
|---|---|---|---|---|---|
| **Cloud Run, scale to zero** | £0 | £0 | £0 | 3-4 s *(calculated)* | **recommended** |
| **Cloud Run + 1 warm instance** | £9 | £9 | £9 | none | **recommended if latency must be predictable** |
| Hetzner CX23 | £4.70 | £4.70 | £4.70 | none | good, if you want to run a box |
| Fly.io shared-cpu-1x 1 GB | £4.60 | £4.60 | £4.60 | <1 s + model load | good |
| Cloudflare Containers | ~£4 + usage | ~£4 + usage | ~£4 + usage | 1-3 s (published) | viable second choice |
| Netlify Functions | £0 | £0 | £7-16 | unpublished | two undocumented limits in the path |
| Cloudflare Workers / Workers AI | — | — | — | — | **impossible** (128 MB isolate; catalogue only) |
| Render / Railway | £5-20 | £5-20 | £5-20 | varies | more money, no more capability |

**Start on Cloud Run scale-to-zero at £0. Add the warm instance for £9 the moment cold
starts are visible in the interface.** If the operational dependency on Google is
unwelcome, Hetzner CX23 at £4.70 is the flat-fee equivalent and will not surprise you.

---

## 6. The API

### 6.1 Contract

`POST /v1/check`, JSON in, JSON out, TLS only.

```jsonc
// request
{ "text": "…", "full_word_count": 1840 }

// 200
{ "model": "tier3-cycle2", "model_build": "a1b2…", "precision": "fp32",
  "probability_ai": 0.9912, "margin": 5.83, "flagged": true, "threshold": 0.98,
  "word_count": 1840, "tokens_scored": 512, "truncated": true,
  "inference_ms": 214.7, "processed": "server", "retained": "nothing" }

// 422 too short   { "error": "too_short", … }
// 413 too large   { "error": "too_large", … }
// 429 rate limit  { "error": "rate_limited", … }  + Retry-After
// 503 unavailable { "error": "unavailable", … }   → client offers the local model
```

The response shape is deliberately the same as the browser runtime's, so the front end
has one result type and one rendering path regardless of where the inference happened.
`processed` is the only field that differs, and the interface shows it (§8.4).

### 6.2 Send only what the model reads — data minimisation that is real

**The model scores the first 512 tokens and nothing else.** Sending a 4,000-word
document transmits roughly ten times more text than influences the answer.

So the client should tokenise locally with the e5-small vocabulary it already ships for
the local path, trim to 512 tokens, and send only that — with the full word count as a
separate integer so the interface can still say "scored the first 400 words of 1,840".

This is worth doing for three reasons, in ascending order of importance: it cuts the
request to a few kilobytes; it makes the truncation visible to the user instead of
silent; and under UK GDPR Article 5(1)(c) it turns data minimisation from a policy claim
into an architectural fact. "We only ever receive the first 400 words, because that is
all the model can read" is a materially stronger statement than "we don't keep what you
send", and unlike the second one it cannot be undermined by a misconfigured log.

*Verify before building:* this assumes the shipped browser runtime scores a single
512-token window with no chunking or aggregation. The evidence says it does — windowed
scoring was tested on this model and collapsed detection from 86.4% to 1.8%, so it was
rejected — but confirm it against the deployed front-end code rather than this document.
If the client-side tokeniser cannot be made to match the server's exactly, send the first
~4,000 characters instead and let the server tokenise; the privacy gain survives, the
exactness of the word-count message does not.

---

## 7. Abuse protection and behaviour under load

A free, unauthenticated endpoint that runs a model is a free compute endpoint. Assume it
will be scripted against.

### 7.1 Limits

| control | value | why |
|---|---|---|
| Body size cap, at the edge | **256 KB** | rejected before reaching the app; a 512-token payload is a few KB, so this is already generous |
| Text length cap, in the app | 120,000 characters | belt and braces if the edge cap is bypassed |
| Minimum length | 60 words | below this the model has nothing to work with; 422, never a guess |
| Per-IP burst | **20 per minute** | a person checking documents by hand never approaches this |
| Per-IP daily | **300 per day** | generous for a teacher marking a class set; ruinous for a scraper |
| Global concurrency | 2 per vCPU | ORT already uses 2 threads per request; more concurrency thrashes |
| Request timeout | 10 s | inference is 0.2-0.4 s; anything near 10 s is pathological |
| CORS | the tool's origin only | not security, but it stops casual embedding |

### 7.2 How the counters work

Counters are keyed on a **keyed hash of the client IP with a secret pepper generated at
process start and never persisted**. This gives the abuse control what it needs — the
ability to tell one client from another within the window — while making the keys
useless as a record afterwards, and unlinkable across restarts. Do not use a plain
SHA-256 of an IP: the IPv4 space is small enough to enumerate exhaustively, so an
unsalted hash is a reversible identifier, not a protection. The ICO's position is that
pseudonymised data remains personal data either way (§9.3), so the design goal is to
minimise how long and how usefully it exists, not to argue it out of scope.

Counters live in memory with TTL expiry and are never written to disk. On more than one
instance, move them to Redis with the same TTLs and the same peppering — and note that
Cloud Run's per-instance memory makes in-process counters leaky across instances, which
is an argument for the single warm instance or for accepting that the limit is per
instance rather than global.

### 7.3 Under load

- **Rate-limited:** 429 with `Retry-After`, and copy that points at the local model,
  which has no limit. A blocked scraper gets a wall; a blocked human gets a route.
- **Saturated:** Cloud Run queues then scales out, and the free tier absorbs a great deal
  before cost appears. **Corrected 29 August 2026:** this plan then said `max-instances`
  bounds only concurrent CPU and memory and that a month-long flood costs about £519 at
  two instances. Both are wrong. Requests are billed only when they reach a container,
  and requests beyond `instances × concurrency` are refused by Cloud Run's front end
  without starting one, so **`max-instances` bounds every billed line**. £519 was a point
  estimate on an unmeasured 500 requests/second — the same document's own 2 ms refusal
  assumption gives £2,868 — it omitted egress of about £46 at its stated volume, and it
  converted from USD on a **GBP-denominated** billing account. The compute floor is
  **£51/month at maxScale 1**, which the service now runs, and £106 at maxScale 2. See
  `reference-server/SECURITY.md` §6.2.
- **Beyond that:** 503, and the client offers the local model. **The tool must never
  invent an assessment because the server was busy.**
- **Deliberate abuse:** three separate controls answer this, and the shorthand "£50
  ceiling" that once collapsed them into one is what produced a false belief that the
  bill was capped.
  1. **maxScale 1** — a platform-enforced bound, giving the £51/month compute floor.
  2. **The £50 Cloud Run spend cap** — budget `[budget id redacted from the public record]`,
     status `Configured`, scoped to project `opace-ai-detector` plus `Cloud Run`. It is
     real and it genuinely pauses the service. Two caveats belong with it: it acts on
     **recorded** spend, which Google says is usually within 24 hours, so it is not
     real-time; and it is in **Preview** with nobody having seen it fire, so its
     enforcement behaviour rests on Google's documentation rather than on observation.
     **Verify a spend cap in the Cloud Billing console, never by API.** The whole budget
     is invisible to the Budgets API — `gcloud billing budgets list`, REST `v1` and REST
     `v1beta1` all return only the other two budgets, and two agents ran correct, complete
     queries and reached a confident false negative.
  3. **The kill switch** — reactive, not a cap: a Cloud Monitoring alert at 10
     requests/second sustained 5 minutes, plus a billing-budget alert, both publishing to
     a Pub/Sub topic that triggers a Cloud Function revoking public access. Delivery
     measured at **44–88 seconds across three fires**, two on the current revision. Quote
     the range, not a single figure; the variance sits in Google's own alert evaluation
     and notification delivery, above the Cloud Function, and this project does not
     control it.

  **The availability trade-off, stated rather than implied.** The spend cap pauses until a
  human lifts it, then takes up to an hour to resume, and the service returns 5xx
  meanwhile. An attacker who drives £50 of recorded spend therefore takes the server route
  offline for the rest of the calendar month, where the kill switch restores in seconds.
  That is acceptable given the unlimited in-browser fallback, but it is a trade rather
  than pure upside. There is still no scenario in this design where an attacker extracts
  anything valuable, because nothing is stored; the only asset at risk is money.

### 7.4 Model theft

The model file is not served any more, which incidentally ends the situation where
anyone could download 34.3 MB of trained weights from the CDN. Distilling it back out
through 300 queries a day would take a very long time. This is a side benefit, not a
reason to do it, and it should not appear in customer-facing copy.

---

## 8. Default interface behaviour

**The principle stands, with a new mechanism: a visitor who does nothing gets the working
detector.** Previously that meant auto-loading a download. Now it means the check simply
works, because the model is not on their device at all.

### 8.1 First visit, default path

No prompt, no toggle, no download, no `IntersectionObserver`, no connection sniffing,
no `saveData` branch. The visitor pastes text, presses the button, and the result appears
in roughly the time any form submission takes. Every branch the shrink brief was going to
need — desktop versus mobile, good connectivity versus poor — disappears, because a
15 KB request is affordable on any connection that can load the page.

What remains is a **disclosure, shown before the first check, not after it**. Placed
directly beneath the paste box, always visible, not behind a link and not in a modal:

> **Where this runs.** The AI check is done on our server. Your text is sent over an
> encrypted connection, held in memory for about a third of a second, and discarded. It
> is never saved, never logged and never used to train anything. Only the first 400 words
> are sent, because that is all the model reads.
> [Run everything in my browser instead](#local) — a one-off 34 MB download, then nothing
> leaves your device.

That is a statement of fact positioned where it is read, not a consent gate. §9.2 sets
out why consent would be the wrong instrument here.

### 8.2 While it is running

Warm requests finish in a few hundred milliseconds, so a progress bar would flash and
annoy. Use a disabled button with a spinner and no text change. If nothing has come back
after **1.5 seconds** — which in practice means a cold start — replace it with:

> Waking the checker up. This takes a few seconds the first time today.

Do not show a percentage. There is nothing to measure and a fake one is a lie about the
one thing this tool sells.

### 8.3 The local option

A clearly labelled control, not a hidden preference:

> **Run it in my browser instead**
> Downloads the detector once (34 MB) and does everything on your device. Nothing is sent
> anywhere, including the text. Slower to start; identical result.
> [ Use in-browser processing ]

Choosing it uses the existing consent-gated download, which already works and does not
change. Remember the choice in `localStorage` and honour it on return without asking
again. State the size before the download starts, every time.

Genuinely worth saying: the two paths give the same answer. This is not a cut-down
version and a full version; it is the same weights in two places.

### 8.4 Labelling the result

Every result carries a small, permanent line saying where it was computed — "Checked on
our server" or "Checked in your browser". Not a badge, not a tooltip. Anyone who has to
justify a decision made with this tool needs to be able to say where the text went, and
should not have to remember which mode they were in.

### 8.5 When the server fails or is declined

Three cases, one rule.

| case | what the tool says |
|---|---|
| Endpoint unreachable / 503 / timeout | "The AI check could not run — our checker is not responding. You can run it in your browser instead (34 MB download), or try again shortly." |
| Rate-limited (429) | "You have run a lot of checks from this connection. Try again in a few minutes, or switch to in-browser processing, which has no limit." |
| Local download declined or failed | "No AI check was run." |

**The rule: if the model did not run, the tool says no AI assessment was made, and shows
no number.** No estimate from the writing rules, no "based on the signals we could see",
no score with a caveat. The rules tier detects one human document in four as AI (24.8%
false positives against the model's 1.22%) and was demoted for exactly that reason. Using
it as a fallback would resurrect the failure the last three cycles were spent removing.

What the page still shows when the AI check has not run, clearly separated and clearly
labelled as not being an AI judgement:

- Deterministic forensics — invisible characters, homoglyphs, watermark scan, provenance
  metadata. These are exact and ran locally.
- Writing suggestions — the demoted rules tier, presented as editorial feedback about the
  prose, never as evidence of authorship.
- One line, unmissable: **"No AI assessment was made."**

### 8.6 What to remove from the interface on the same deploy

- "Your text never leaves your browser", and every variant of it, wherever it appears —
  page copy, meta description, Open Graph description, structured data, screenshots,
  the WordPress plugin listing, the Chrome extension listing.
- The consent modal as the *default* route to a working detector. It stays as the route
  to the *local* one.
- Any copy implying the model is optional or an extra. It is the tool.

---

## 9. Privacy and legal — UK GDPR

Researched against ICO guidance and legislation.gov.uk on 29 August 2026. Several ICO
pages carry a banner that they are under review following the Data (Use and Access) Act
2025, so re-check before publishing anything client-facing. This is a summary of what the
sources say, not legal advice; §9.8 lists what genuinely needs a solicitor.

### 9.1 The audit that has to happen before launch

Transient in-memory processing **is** processing under UK GDPR Article 4(2) — storage is
one item in a non-exhaustive list, not a precondition. Receiving the text is collection,
running it through the model is use.

The practical risk is not the design; it is that "we retain nothing" quietly becomes
untrue. It leaks in through reverse-proxy access logs that capture POST bodies, stack
traces containing request payloads, APM and error-reporting agents such as Sentry or
Datadog, CDN or WAF request buffering, crash dumps, and swap. **Verifying the absence of
body logging across the entire stack is the single highest-value compliance action here**,
and it must be re-verified whenever the stack changes.

Concretely, before launch:

- [ ] Uvicorn access logging **off** (`--no-access-log`); the reference `Dockerfile` does this.
- [ ] A custom exception handler that discards the request — the framework default prints
      the body into the traceback. `reference-server/app.py` implements this.
- [ ] ORT log severity raised so the runtime cannot print anything about its inputs.
- [ ] No APM or error-reporting agent installed. If one is ever added, body capture off.
- [ ] Cloud Run request logging confirmed to record method, path, status and latency only.
- [ ] The CDN/WAF confirmed not to buffer or mirror request bodies.
- [ ] Swap disabled or encrypted on any VPS deployment.
- [ ] A written record of all of the above, dated — Article 5(2) requires you to
      *demonstrate* the design, not assert it.

### 9.2 Lawful basis: legitimate interests, not consent

**Article 6(1)(f).** The ICO is explicit that consent is inappropriate where it is a
precondition of accessing the service, because that is "a false choice and only the
illusion of control". The tool cannot function without receiving the text, so a consent
gate would be precisely that. It would also be worse for the user: a modal that must be
clicked through to use the tool trains people to click through modals.

DUAA 2025 inserted a "recognised legitimate interest" at Article 6(1)(ea), but its Annex 1
list covers public-task disclosures, security, emergencies, crime and safeguarding. It
does not cover this, so the ordinary three-part test applies and **a legitimate interests
assessment must be documented before processing starts**. The ICO publishes a template.
A defensible LIA for this case runs roughly:

> **Purpose:** Opace has a legitimate interest in operating a free AI-text-detection tool
> that demonstrates its technical capability, and users have a legitimate interest in an
> accurate classification of text they control; there is a wider public interest in
> accessible tooling for assessing AI-generated content in education and publishing.
> **Necessity:** classification requires the model to see the text; no hash, excerpt or
> summary permits it; the processing is targeted (only the first 512 tokens the user
> chooses to submit, only for the duration of the request), and a fully local alternative
> is offered to anyone who prefers it. **Balance:** the text is supplied deliberately for
> the sole purpose of being classified, is used for nothing else, is never written to
> disk, never used for training, never disclosed onward, and is discarded when the
> response is returned; there is no profiling, no accumulation and no linkage to an
> identity. The residual risk is that a submitter pastes text containing a third party's
> personal data — a pupil's essay — mitigated by the zero-retention architecture,
> transport encryption, a just-in-time notice telling submitters they are responsible for
> third-party content, and the fact that the third party leaves no record behind. On that
> basis the rights and freedoms of data subjects, including children, are not overridden.

### 9.3 IP addresses and the rate limiter

IP addresses are personal data; Recital 30 lists them first among online identifiers.
Hashing is pseudonymisation and the ICO answers the question directly — pseudonymised
data is still personal data. Truncation to a /24 is stronger but still contextual, and a
/24 on a school network can still single someone out. So the design assumes UK GDPR
applies to the counters and minimises accordingly (§7.2): peppered keyed hash, pepper
generated at process start and never persisted, in-memory only, TTL expiry.

Retention: the ICO specifies no period and says it must follow from business need.
Defensible here:

| data | retention |
|---|---|
| Rate-limit counters | the window only — 60 s and 24 h, in memory, TTL-expired |
| Operational logs (timestamp, status, latency, no identifier, no content) | 7-30 days |
| Aggregate metrics (counts, percentiles) | indefinite; genuinely aggregated, outside scope |
| **Submitted text** | **none. Never written.** |

For an external benchmark: DeepL publishes a 14-day cap on free-tier IP addresses. **No
ICO guidance specific to IP-based rate limiting was found** — treat that as unverified —
but UK GDPR names network and information security as a legitimate interest, which is the
natural basis for abuse prevention on a free public endpoint.

### 9.4 International transfers

The ICO's test: UK GDPR applies, you initiate the transfer, and the recipient is a
separate legal entity. Your cloud host is a separate legal entity, so hosting in a US
region is a restricted transfer regardless of who wrote the code.

| endpoint region | position |
|---|---|
| UK | no restricted transfer; simplest, but Cloud Run's London region is Tier 2 priced |
| **EU/EEA** | restricted transfer, **covered by UK adequacy regulations** — no IDTA, no transfer risk assessment |
| US | adequacy only where the recipient is certified under the UK Extension to the EU-US Data Privacy Framework; otherwise IDTA or the Addendum **plus** a transfer risk assessment |

**Host in the EU.** `europe-west1` removes the IDTA, the TRA, the ongoing
DPF-certification monitoring and a paragraph of the privacy notice, for a cost of perhaps
20 ms of round trip. Pin the region explicitly and confirm the provider's support and
telemetry paths do not route data out of it.

### 9.5 Who is the controller

Opace decides the purpose, the basis, what is collected, what is disclosed and the
retention — unilaterally, in its own terms. The teacher gives no instructions and cannot
vary anything. So **both parties are independent controllers for their own purposes, and
Opace is not a processor.**

- **No Article 28 processing agreement is needed or appropriate.** Offering one would
  misdescribe the relationship and imply Opace acts on instructions it does not receive.
- **State the position in the terms:** Opace acts as an independent controller and the
  user is responsible for having a lawful basis for any third-party personal data they
  submit.
- **Expect to be asked anyway.** A school DPO will request a DPA reflexively. The right
  answer is a short written statement of the controller analysis plus the privacy notice,
  not a signature to make the request go away.
- **The trap to watch:** add accounts, saved history, or a "for schools" tier with an
  institutional agreement, and the analysis genuinely can flip to processor. The current
  anonymous design is what keeps you out of it.

### 9.6 Privacy notice — what it must contain

Article 13 checklist, tailored:

**Required:** controller identity and contact; purpose and legal basis; **the specific
legitimate interests pursued**, named not merely cited; recipients or categories —
name the hosting provider category and state that no third-party AI API is called;
transfers, adequacy and safeguards (omit if UK-hosted); **retention or the criteria for
it**; rights of access, rectification, erasure, restriction, **objection** and
portability; **the right to complain to the controller under s164A DPA 2018** — new,
DUAA-inserted, and routinely missing from notices written before 2025; the right to
complain to the ICO; that provision is voluntary with no consequence beyond not getting a
result; and the automated-decision-making line under the current **Articles 22A-22D**
regime, not the repealed Article 22.

**Legitimately omitted:** DPO details (Article 37 is very unlikely to be triggered);
right to withdraw consent (no consent is relied on — including it would mislead);
representative details (UK-established controller); transfer clause if UK-hosted.

**Article 14 and the pupil.** The pupil whose essay is pasted is a data subject whose data
you did not obtain from them. Article 14(5)(b) disapplies the duty where notification is
impossible or disproportionate: you retain nothing that could identify them and have no
means of contact, so it is impossible in the literal sense. **Write that reasoning down.**
This is exactly the "invisible processing" pattern the ICO treats as a DPIA indicator.

Presentation: the ICO recommends just-in-time notices. The line under the paste box in
§8.1, linking to the full notice, is the pattern it endorses and the cheapest thing that
makes this defensible.

### 9.7 Wording — draft copy

**Under the paste box (just-in-time), verbatim:** see §8.1.

**Privacy notice clause, verbatim:**

> **Text you submit to the AI checker.** When you use the AI check, the first 512 tokens
> of your text — roughly the first 400 words — are sent to our inference server in
> Belgium over an encrypted connection (TLS). The text is held in the server's memory for
> the duration of the request, typically under half a second, passed through our
> classification model, and discarded when the score is returned.
>
> We do not write your text to disk. We do not log it. We do not keep excerpts, hashes or
> summaries of it. We do not use it to train or improve our models, and we do not send it
> to any third-party AI service. There is nothing to retain, so there is no retention
> period for it.
>
> Separately, our servers keep operational records — the time of the request, whether it
> succeeded, how long it took, and a counter used to prevent abuse. The abuse counter is
> derived from your IP address using a keyed hash whose key is regenerated whenever the
> service restarts and is never stored, so it cannot be traced back to an address
> afterwards. Operational records contain no part of your text and are deleted after 30
> days.
>
> Our lawful basis for this processing is legitimate interests (UK GDPR Article 6(1)(f)):
> our interest in operating and demonstrating the tool, and your interest in getting an
> accurate result. You can object to this processing at any time — and you can avoid it
> entirely by choosing "run it in my browser", which downloads the model to your device
> and sends us nothing at all.
>
> **If you paste someone else's writing** — a pupil's essay, a client's draft — you are
> responsible for having a lawful basis for doing so. Please do not include more personal
> information than the check needs.

Three notes on why it is worded this way. First, **scope the claim precisely**: it names
the endpoint, the region and what "not retained" excludes, so it cannot be read as a
blanket promise the operational logs quietly break. GPTZero's FAQ does this well;
ZeroGPT's does not, and its privacy policy never mentions submitted text at all while its
FAQ promises text is discarded. Second, **never write "by default"** — it implies a
non-default in which retention happens. Third, **put the claim in the privacy notice as a
binding clause**, not only in an FAQ. Because Opace genuinely retains nothing, it can make
a cleaner statement than DeepL (which trains on free-tier content), Originality.ai (opt-
out training) or Sapling (stores content outright) — that is a real marketing asset,
provided the §9.1 audit makes it true.

### 9.8 Remaining legal work

- **A DPIA — do one.** No Article 35(3) trigger fires automatically, but three of the
  ICO's Article 35(4) indicators plausibly combine: innovative technology (AI
  classification), invisible processing (the pupil, §9.6), and evaluation or scoring. The
  ICO's rule of thumb is that two indicators signal the need, and its advice is that if in
  doubt, do one. A short DPIA is less work than defending a negative screening decision to
  a school DPO.
- **Assess the Age Appropriate Design Code properly; do not assume it is out of scope.**
  It applies to services "likely to be accessed by children" — under 18, so sixth-formers
  count — and is not restricted to services aimed at children. An AI detector is plainly
  appealing to students checking their own work. If it applies, it requires a DPIA anyway.
- **PECR: not engaged by the inference.** Sending text the user typed *up* to a server is
  not storing or accessing information on their device, so Regulation 6 does not bite and
  no banner is needed for the check. Two qualifications: the ICO's storage-and-access
  guidance finalised on 29 April 2026 covers `localStorage`, fingerprinting and scripts,
  so the §8.3 preference must be strictly necessary or it does need consent — and a
  fingerprint-based rate limiter would be a materially harder story than the IP-based one,
  which is another reason for §7.2. Note the irony worth having in the DPIA: moving *off*
  the device arguably reduces PECR exposure.
- **Automated decision-making.** Article 22 was repealed and replaced by Articles 22A-22D
  on 5 February 2026, so any notice copied from a pre-2025 template cites the wrong
  provision. Exposure is low — the endpoint returns a score, and the consequential
  decision is the teacher's, with meaningful human involvement — but given the documented
  false-positive rates of AI detectors against non-native English and neurodivergent
  writing, state prominently that **the score is probabilistic, advisory, and must not be
  the sole basis for an academic-misconduct decision.** That statement does real work in
  the balancing test in §9.2, and it is the main practical protection against the harm.
- **Solicitor's sign-off** is genuinely warranted on four points: the AADC applicability
  call; the terms clause allocating responsibility for third-party personal data; the
  IDTA/TRA package *if and only if* you host in the US (avoidable — host in the EU); and
  liability wording around false positives, which is the most likely route to an actual
  complaint.

---

## 10. Migration

1. **Verify** the client scores a single 512-token window (§6.2), and audit the whole
   stack for body logging (§9.1). Neither is optional.
2. **Deploy** `reference-server/` to Cloud Run `europe-west1`, scale to zero,
   `max-instances=4`. Confirm parity against `models/tier3-golden.json` — the served
   model must reproduce the golden vectors before it answers a single real request.
3. **Write** the LIA, the DPIA and the privacy notice clause. Publish the notice before
   the endpoint is reachable from the page.
4. **Ship the copy change on the same deploy as the endpoint.** "Your text never leaves
   your browser" must not survive by a single hour. That includes the plugin and
   extension listings.
5. **Switch the default**, keeping the local path selectable, and watch the 503 rate and
   the cold-start count for a week.
6. **Buy the warm instance** if cold starts show up in the interface — £9/month.
7. **Revisit shrinking only for the extension and the plugin**, where a server call may
   genuinely be unwanted. `MODEL-SHRINK-REPORT.md` records the constraints that work
   inherits.

## 11. What is not settled

- Cloud Run Tier 2 (London) pricing was not verified; if UK residency is wanted for its
  own sake, price it first.
- The cold-start figure is 1.27 s measured locally, doubled for a slower cloud vCPU and
  padded for container start. It is arithmetic, not a measurement of Cloud Run. Measure
  it on the day.
- Netlify's bundle-size ceiling and its support for native Node addons are undocumented;
  the §5.4 assessment rests on forum evidence and is why that option is not recommended.
- Hetzner's IPv4 surcharge was not verified, and the CX line currently shows as
  unavailable to order.
- Whether the shipped front end scores one 512-token window is inferred from the cycle-3
  windowing evidence, not read from the deployed source, which is not in this repository.
- Sterling conversions throughout are approximate.
