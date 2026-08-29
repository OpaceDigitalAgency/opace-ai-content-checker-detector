# Security and cost model — Opace detector endpoint

Scope: the public inference endpoint at
`https://opace-detector-877422072168.europe-west1.run.app`, its Cloud Run
configuration, and the Firestore counter behind it.

The owner's requirement, in his words: theoretical worst case must not exceed
£50/month, and one abuser must not ruin it for everyone. This document says
which controls deliver that, shows the arithmetic, and — more usefully — says
plainly which risks are still open.

**The short version.** The global daily cap keeps expected cost at £0. No
combination of Cloud Run settings delivers a £50 ceiling, because Cloud Run
puts no ceiling on the request charge; a sustained flood of *rejected*
requests is theoretically unbounded. The £50 requirement is therefore met by
the automatic kill switch (§6.3), and anyone who thinks the app-level limits
alone deliver it has misread the billing model.

---

## 1. Threat model

Ordered by how likely each is, not by how alarming it sounds.

| # | Actor | What they do | What it costs us |
|---|---|---|---|
| T1 | An enthusiastic visitor | Pastes forty drafts in an afternoon | Pennies. Not a threat, but it should not consume the day's allowance |
| T2 | A curious developer | Finds the endpoint in devtools, writes a `curl` loop | Free-tier erosion; trivially blocked |
| T3 | A competitor or scraper | Uses the endpoint as free classification-as-a-service from a server | Sustained, high-volume, high-value-per-request abuse |
| T4 | A single vandal | Rotates IPv6 /64s from a cheap VPS to defeat per-IP limits | Exhausts the daily allowance; denies the server route to everyone |
| T5 | A determined attacker | Sustained flood specifically to generate a bill | Unbounded request charge; the reason §6.3 exists |
| T6 | Accidental self-inflicted | A loop in the site's own JavaScript, or a monitoring check | Indistinguishable from T2 at the endpoint; caught by the same limits |
| T7 | Data exposure | Submitted text ends up in a log, a trace, or a bug report | The `retained: nothing` claim becomes false — a reputational and UK GDPR problem, not a cost one |

What is explicitly **not** in scope: model extraction (the model is published;
anyone can download it), and the correctness of the classifier itself.

---

## 2. Controls, in the order a request meets them

Each is cheap relative to the one after it. A request that fails an early gate
never reaches the model.

| Order | Control | Setting | Stops |
|---|---|---|---|
| 1 | Body size, on `Content-Length` | > 220,000 bytes → 413 | T1, T6 |
| 2 | Origin, enforced server-side | must equal `https://opace.agency` → 403 | T2, T3 |
| 3 | User-Agent | absent, or a known tool, or not `Mozilla/…` → 403 | T2 |
| 4 | Signed token, proof-of-work backed | missing/forged/expired/spent → 401 | T2, T3 |
| 5 | Per-network request rate | 5/min, 30/hour, 100/day → 429 + `Retry-After` | T1, T3 |
| 6 | Character cap | > 50,000 → 413 | T1 |
| 7 | Word cap | > 4,000 → 413, with the local-model offer | T1, T3 |
| 8 | Per-network **inference** rate | 20/min, 150/hour, 500/day → 429 | T3 |
| 9 | **Global daily cap** | 12,000 inferences/day service-wide → 429 | T3, T4, T5 |
| 10 | Cloud Run max-instances | 2 | bounds CPU and memory spend — **it does not bound the request charge, and nothing in Cloud Run does** (§6.2) |
| 11 | **Automatic kill switch** | monitoring alert or budget alert → Pub/Sub → Cloud Function. Built and fired successfully 29 August 2026, after two failed attempts (§6.3.2) | T5 — and it is the only thing that does |

CORS is *not* on this list as a control. CORS is enforced by browsers, not by
servers; a script ignores it entirely. Control 2 is a server-side check of the
same header, and that one is real — as real as a forgeable header can be, which
is not very (§7.5).

---

## 3. Why the global cap is denominated in inferences

The endpoint now scores the whole document, not its opening: a 4,000-word
article is twelve forward passes. A cap of "5,000 checks a day" therefore
authorises anywhere between 5,000 and 60,000 forward passes, a twelvefold
range, while the free tier that the cap exists to protect is denominated in
vCPU-seconds. Capping requests would be capping the wrong thing — and the
number chosen would be right for short pastes and twelve times too generous
for long ones.

So the counter counts inferences, the per-client limiter charges each request
its segment count, and a request is priced before it is sold
(`segments.segment_count`, which counts words without slicing strings).

`MAX_WORDS = 4,000` is what makes the price bounded: it caps a single request
at 12 inferences. Without it, the 50,000-character limit alone would admit a
25,000-word document of one-letter words — 74 inferences in one request.

Anything longer than 4,000 words is refused with a 413 that offers the
in-browser route, which reads documents of any length. The expensive documents
go where the compute is free, which is the right place for them.

---

## 4. Choosing 12,000 inferences a day

Working backwards from the free tier rather than picking a round number.

- Free tier: **180,000 vCPU-seconds/month**, 360,000 GiB-seconds, 2M requests.
- vCPU-seconds bind first: at 1 GiB and 1 vCPU, the memory allowance is twice
  as generous in the same units.
- 180,000 ÷ 30.44 days = **5,914 vCPU-seconds available per day**.
- Budget **0.30 vCPU-seconds per inference**. Measured inference is ~215 ms
  (`SERVER-INFERENCE-PLAN.md` §3.1); 0.30 s is deliberately pessimistic. The
  700–900 ms round trip observed from the UK is mostly network, which is not
  billed as CPU.
- Budget a further **0.10 vCPU-seconds per request** for TLS, parsing, the
  gates, and the Firestore round trip when one falls due.

Worst-case mix is every request being a single segment, which maximises
per-request overhead for a given inference count:

```
12,000 inferences/day × 30.44          =   365,280 inferences/month
365,280 × 0.30 s                       =   109,584 vCPU-s
365,280 requests × 0.10 s              =    36,528 vCPU-s
                                          ─────────
                                           146,112 vCPU-s   (free tier 180,000)
```

**18.8% headroom** against a deliberately pessimistic per-inference cost. In
GiB-seconds the same 146,112 sits against an allowance of 360,000, and 365,280
requests sit against 2,000,000. Every line is inside the free tier.

In practice 12,000 inferences is roughly 6,000–8,000 checks a day at a
realistic mix of short and long documents — comfortably more than the site
will see, and in the same range as the 5,000 checks a day the original brief
suggested. The difference is that this number cannot be quietly multiplied by
twelve by someone pasting long articles.

**What the naive version would have cost.** Had the cap been 5,000 *requests*
a day, its worst case is 60,000 inferences a day:

```
1,826,400 inferences × 0.30 s          =   547,920 vCPU-s
152,200 requests × 0.10 s              =    15,220 vCPU-s
                                          ─────────
                                           563,140 vCPU-s
CPU:    (563,140 − 180,000) × $0.000024 =  $9.20
Memory: (563,140 − 360,000) × $0.0000025 = $0.51
                                          ─────────
                                           $9.71 ≈ £7.65/month
```

Not ruinous, but ten times the intended figure and the end of the "£0" claim —
from one word in the unit.

---

## 5. Where the counter lives, and what it costs

**Firestore in Native mode**, one document per UTC day in `detector_quota`.

Chosen over the alternatives for one property: `Increment` is applied
server-side and atomically, so two Cloud Run instances updating the counter in
the same millisecond cannot lose each other's writes. There is no
read-modify-write, so no transaction, no retry loop, and no contention limit.

- *Datastore mode* has the same free tier but no equivalent atomic increment
  outside a transaction, which means a read and a write and a retry loop per
  update — more code and more failure modes for no benefit.
- *A Cloud Storage object with a generation precondition* works, but caps at
  roughly one write per second per object, and it fails hardest precisely when
  the counter matters most: under load. It also needs the retry loop.
- *Redis (Memorystore)* is the textbook answer and costs about £25/month
  standing, which is half the entire budget for a counter.

Writes are batched: each instance accumulates a local delta and flushes it
every 25 inferences or 15 seconds. The cost of batching is a bounded overshoot
of `MAX_INSTANCES × (QUOTA_FLUSH_EVERY + MAX_SEGMENTS_PER_REQUEST)` =
2 × (25 + 12) = **74 inferences** past the cap. Against 12,000, that is 0.6%.

A refusal never writes. That is deliberate: under a flood, writing on every
rejection would exhaust the daily Firestore write quota in minutes and the cap
would fail open.

**Cost:** ~365,280 inferences ÷ 25 ≈ 14,600 writes and 14,600 reads *per
month*. The free tier is 20,000 writes and 50,000 reads **per day**. The
counter uses about 2% of one day's free write allowance per month. Storage is
one small document per day, a few kilobytes a year. **£0.**

**If Firestore is unreachable**, the instance falls back to its own share of
the cap (`12,000 ÷ MAX_INSTANCES` = 6,000). Two instances therefore still
approximate the ceiling. This is a degraded control, not an absent one — see
§7.7 for what it does not cover.

---

## 6. Platform cost guards

### 6.1 The deployed settings

```
--memory 1Gi --cpu 1 --min-instances 0 --max-instances 2
--concurrency 3 --timeout 60s --cpu-throttling --no-cpu-boost
```

`--min-instances 0` is what makes idle free. `--max-instances 2` is the only
hard ceiling the platform offers on CPU and memory. `--timeout 60s` is up from
30 s because a 4,000-word document is ~2.6 s of inference and three can be in
flight on one vCPU.

### 6.2 The uncomfortable arithmetic

Prices used: europe-west1 tier 1, request-based billing — CPU $0.000024/vCPU-s,
memory $0.0000025/GiB-s, requests $0.40/million; free tier as above; £1 ≈ $1.27.
**Re-verify these before relying on them**; they were correct as published and
Google changes them.

If a flood pins both instances for a full calendar month and every request is
rejected at the first gate:

```
instance-seconds  2 × 730.5 h × 3600           = 5,259,600
CPU     (5,259,600 − 180,000) × $0.000024      =   $121.91
Memory  (5,259,600 − 360,000) × $0.0000025     =    $12.25
Requests — rejections are ~2 ms, so six concurrent slots can absorb
thousands per second. At a network-limited 500/s: 1.31 billion/month
        (1,314 − 2) million × $0.40/million     =   $524.80
                                                  ─────────
                                                    $658.96  ≈ £519/month
```

Halving to `--max-instances 1` gives roughly £257. **No Cloud Run setting
delivers £50**, because nothing in Cloud Run caps the request count, and the
request charge is the largest line. Any claim that max-instances alone bounds
the bill is wrong.

### 6.3 What actually delivers £50: the kill switch

**BUILT, WIRED AND TESTED — 29 August 2026.** This section was a plan until
that date. What follows is what exists and what was measured against it.
Re-test after any redeploy, any IAM change and any change to the alert policy:
§7.1 explains why, and §6.3.2 is what happened when that advice was ignored.

Two triggers, one action.

#### 6.3.0 What is deployed

| Resource | Identity | State, verified 29 August 2026 |
|---|---|---|
| Pub/Sub topic | `detector-killswitch` | created |
| Cloud Function | `detector-killswitch`, gen2, python312, europe-west1, `--max-instances 1` | **ACTIVE** |
| Fast trigger | Cloud Monitoring policy "Detector: request flood", one notification channel | **enabled** |
| Slow trigger | Billing budget `ce028788-6be2-45b7-9605-9461b534684a` | publishing to the same topic |

On any message the function revokes the `allUsers` invoker binding and sets
ingress to internal-only. **It deletes nothing**, so `enable-service.sh`
restores service without a rebuild or a redeploy.

The fast trigger fires on `run.googleapis.com/request_count` above **10
requests per second (600/minute) sustained for 5 minutes**, `ALIGN_RATE`
aligned at 60s, `REDUCE_SUM`. Normal peak on this service is a couple of
requests a minute, so the margin is roughly a hundredfold.

The slow backstop is the **£10** budget, not the £50 one sketched below, with
thresholds at 20%, 50%, 90% and 100% of actual spend plus 90% of forecast. It
therefore trips far earlier than the £50 requirement — the first alert lands
around £2 of actual spend. That is deliberate: the budget is a backstop for
what the rate alert cannot see, and an early backstop is strictly better.

**Primary — fast, Cloud Monitoring (minutes).** Alert on
`run.googleapis.com/request_count` for this service exceeding **600 requests
per minute for 5 minutes**, aligned per minute. Normal peak is a couple of
requests a minute; 600 is a hundredfold margin and still 3,000× below what a
flood produces. Route it to a Pub/Sub topic, and a Cloud Function on that topic
runs `disable-service.sh`.

```sh
gcloud pubsub topics create detector-killswitch
gcloud alpha monitoring policies create \
  --notification-channels "$PUBSUB_CHANNEL" \
  --display-name "Detector: request flood" \
  --condition-display-name "request_count > 600/min for 5m" \
  --condition-filter 'metric.type="run.googleapis.com/request_count"
     AND resource.type="cloud_run_revision"
     AND resource.labels.service_name="opace-detector"' \
  --condition-threshold-value 600 \
  --condition-threshold-duration 300s \
  --condition-aggregations 'alignmentPeriod=60s,perSeriesAligner=ALIGN_RATE'
```

Detection to action is about 6–8 minutes worst case. Cost accrued in 8 minutes
at 500 requests/second: 240,000 requests ($0.10) plus 960 instance-seconds
($0.026). **About £0.10 per incident.** A hundred separate incidents in a month
would cost £10.

**Backstop — Cloud Billing budget (hours).** A £50 budget with alerts at 20%,
50%, 90% and 100% of both actual and forecast spend, published to the same
Pub/Sub topic:

```sh
gcloud billing budgets create \
  --billing-account "$BILLING_ACCOUNT" \
  --display-name "Opace detector £50 ceiling" \
  --budget-amount 50GBP \
  --threshold-rule percent=0.2 \
  --threshold-rule percent=0.5 \
  --threshold-rule percent=0.9 \
  --threshold-rule percent=1.0 \
  --threshold-rule percent=0.9,basis=forecasted-spend \
  --filter-projects projects/opace-ai-detector \
  --all-updates-rule-pubsub-topic projects/opace-ai-detector/topics/detector-killswitch
```

Budget data updates several times a day, so this can lag by hours — at the
£519/month rate that is £0.70 an hour, and the 20% alert fires around £10.
It is a backstop for anything the request-rate alert does not see (a slow
resource leak, a pricing change), not the primary control.

#### 6.3.1 Manual round trip — passed

`/v1/health` 200 → `./disable-service.sh` → **404** → `./enable-service.sh` →
**200**.

#### 6.3.2 Automatic trigger — two silent failures before it worked

This is the part worth reading. The kill switch was documented, deployed and
plausible, and it failed twice in ways that nothing short of firing it would
have shown.

| Attempt | Result | Cause |
|---|---|---|
| 1 | **Failed silently.** Service stayed up for the full 200 seconds under observation | The function called `:getIamPolicy` with a POST. Cloud Run v2 wants a **GET**. It received an HTML error page, threw `JSONDecodeError`, and died. Nothing in the service's own behaviour indicated anything was wrong |
| 2 | **Failed.** `403 Forbidden` on `:setIamPolicy` | The function's service account held `roles/editor`, which does **not** include `run.services.setIamPolicy`. Fixed by granting `roles/run.admin` **scoped to the service**, not project-wide |
| 3 | **Passed.** Publish to the topic → health **404 within 10 seconds** → restored to 200 | — |

Two independent faults, neither visible from outside, in a control that had
already been written up as working. Had this been recorded as functional on the
strength of a successful deployment, the entire £50 ceiling would have rested
on a function that raised an exception every single time it was called. The
arithmetic in §6.2 — £519/month at two instances, £257 at one, even with every
request rejected — is what would have applied instead.

§7.1 already said "an untested kill switch is not a control" before any of this
was built. It was right, and it is the reason this section reports failures
rather than only the passing run.

**Re-test triggers.** Re-fire the switch after any redeploy, any change to the
function's IAM, any change to the alert policy or notification channel, and any
Cloud Run API version change. The first failure above was an API-shape
mismatch; the second was an IAM scope. Both are exactly the kind of thing a
routine redeploy reintroduces.

**Re-enabling** is `./enable-service.sh` — it restores the `allUsers` invoker
binding and reopens ingress, in that order, and prints the health check to run.
Read the logs first: re-enabling into an ongoing flood reproduces the bill. The
limits are all environment variables, so they can be tightened with
`gcloud run services update --update-env-vars` without a rebuild. Note that the
day's Firestore counter is not reset by re-enabling; the script prints the
command to clear it deliberately.

### 6.4 Expected monthly cost, everything working

| Line | Usage | Charge |
|---|---|---|
| Cloud Run CPU | 146,112 of 180,000 free vCPU-s | £0 |
| Cloud Run memory | 146,112 of 360,000 free GiB-s | £0 |
| Cloud Run requests | 365,280 of 2,000,000 free | £0 |
| Firestore | ~14,600 writes, ~14,600 reads/month against a *daily* free tier | £0 |
| Secret Manager | 1 secret, well inside free access ops | £0 |
| Cloud Build | a handful of builds against 2,500 free minutes | £0 |
| Artifact Registry | ~0.7 GB image against 0.5 GB free, $0.10/GB | ~£0.02 |
| **Total** | | **~£0.02/month** |

Worst case with every control working and a flood detected by the primary
alert: **£0.02 + roughly £0.10 per incident.** Worst case with the kill switch
misconfigured or removed: **£519/month.** The gap between those two numbers is
the whole argument for §6.3.

---

## 7. Residual risks — what is not closed

Stated plainly, because a control list without this section is marketing.

**7.1 The request charge is unbounded by the platform.** Cloud Run offers no
request-count ceiling. Every mitigation is reactive. If the Pub/Sub topic, the
function, or its IAM binding is broken, the ceiling is §6.2, not £50. **Test
the kill switch after deploying it, and again after any IAM change.** An
untested kill switch is not a control. This was written before the switch was
built; when it was finally fired on 29 August 2026 it failed twice, once
silently (§6.3.2). The same discipline applies to the §9.1 marker probe, for
the same reason: both depend on deploy-time configuration that a future deploy
can drop without anything failing.

**7.2 Per-client limits are per-instance and per-process.** They live in
memory. With two instances a client gets roughly twice the nominal allowance,
and a cold start resets the counters entirely — which in a scale-to-zero
service happens constantly. Not closed deliberately: a shared per-IP store
would mean a Firestore write per request, which under attack exhausts the
Firestore free tier and makes the *global* cap fail. The per-IP limits are
there to stop T1 and T3; the global cap is the backstop for everything else.
The Dockerfile runs one worker rather than two specifically so this is 2× and
not 4×.

**7.3 Rotating IPv6 defeats per-network limits.** Bucketing to /64 is correct
and stops the naive case, but anyone with a /48 has 65,536 buckets and any
cloud account has plenty. At 500 inferences per /64 per day, **24 distinct /64s
exhaust the global cap**. Per-IP limits do not stop a distributed attacker.
Nothing here does, short of paid edge protection.

**7.4 The global cap is itself a denial-of-service vector.** T4 can consume the
day's allowance for free, and every real visitor then gets the in-browser offer
until 00:00 UTC. This is a deliberate trade — availability of the *server*
route sacrificed to bound cost — and it is survivable only because the local
route exists and works. It would be unacceptable without it. If it happens
repeatedly, the answer is Turnstile (§8) or a lower cap plus a paid tier, not
raising the cap.

**7.5 Origin and User-Agent are client-controlled strings.** Both are one line
of `curl` away from being forged. They stop scripts written by people who are
not really trying, which is most of T2, and they are worth having for that. They
are not a security boundary and are not counted as one anywhere above.

**7.6 The proof of work is weak by design.** 14 bits is ~16,000 SHA-256 hashes,
under 100 ms in a browser with a synchronous implementation in a worker. A
token then covers 20 checks, so the amortised cost is ~800 hashes per check —
nothing at all to an attacker with a GPU. It converts a one-line `curl` loop
into a small program, which is exactly its purpose, and no more. Raising the
difficulty punishes visitors on old phones far more than it punishes an
attacker, so it should not be raised without a measured reason.

**7.7 Token state is per-instance.** `TOKEN_MAX_USES` is enforced in memory, so
one token is worth up to `MAX_INSTANCES × 20` checks and a cold start clears
the ledger. Same reasoning as 7.2.

**7.8 A long Firestore outage weakens the cap.** Each instance falls back to
6,000 inferences, and a fresh instance starts its own count from zero. Across
many instance lifetimes during a long outage, the effective daily total can
exceed 12,000 by an amount nobody has bounded. Rare, and the exposure is CPU
inside the free tier rather than an open-ended bill, but it is not closed.

**7.9 Global-cap overshoot of up to 74 inferences** from write batching (§5).
Quantified and accepted.

**7.10 Segmentation parity is asserted on word counts, not on scores.**
`test_segments.py` proves that both routes cut a document in the same places
(the eight golden cases from the reference implementation, contiguity,
completeness, and the UTF-16 offset behaviour). It does not prove that the same
segment produces the same probability in both runtimes, because that needs the
model in both. **Before the front end shows per-section results, score
`models/tier3-golden.json` through both routes and diff the segment
probabilities.** Until that is done, parity is verified in structure and
assumed in numbers.

**7.11 The retention claim is audited on the scoring path only.** A unique
high-entropy marker was submitted through the real gated path on 29 August 2026,
scored normally, and did not appear in any log entry in the project (§9.1). That
closes the claim for the path a successful check takes. It does **not** cover
refusal paths (413, 429) or error paths, which run different code and have not
been probed. Narrowed by measurement rather than closed, and re-run after any
redeploy — the request-log exclusion is a deploy-time flag.

**7.12 No DPIA has been done.** `SERVER-INFERENCE-PLAN.md` §9 says one is
advisable and gives the lawful-basis analysis. Unchanged by this work.

---

## 8. Cloudflare Turnstile — recommendation, not assumption

**Recommendation: do not add it now. Revisit only if the logs show repeat
abuse that the proof of work is not deterring.**

For it: free, privacy-respecting by the standards of the category, no puzzle
for most visitors, and genuinely effective against exactly the actor the
current controls handle worst — T4, the vandal rotating addresses.

Against it, and these are the deciding points:

1. **It does not touch the exposure that matters.** §6.2's £519 is a flood of
   requests rejected at the first gate. Turnstile sits behind that gate; those
   requests never reach it. It reduces T4's ability to exhaust the daily
   allowance, which costs nothing, and does nothing about T5, which costs
   money.
2. **It weakens the privacy story the whole product is built on.** Adding
   `challenges.cloudflare.com` to the page means a third party observes every
   visitor to a tool whose selling point is that it does not watch you. That is
   a real cost on a page arguing for local processing.
3. **The obvious middle path is worse than it looks.** "Turnstile for repeat
   offenders only" needs a durable notion of a repeat offender, which needs
   shared cross-instance state per client — the thing 7.2 explicitly declines
   to build because it breaks the global cap's Firestore budget.

If it is added later, the trigger should be the *global* counter, not a
per-client one: require a Turnstile token from everyone once the day's
allowance passes 70%. That needs no per-client state, protects the tail of the
day's allowance for real visitors, and leaves the first 70% of days completely
frictionless. Verify server-side with `siteverify`, treat a verification
failure as a 429 with the local-model offer, and never as a hard error.

---

## 9. Verifying "retained: nothing"

The response advertises it, so it has to be checkable by someone who does not
trust us.

**In the code.** No logging call in `app.py` or `segments.py` takes
request-derived data. There is no `logging` import. Grep for it:

```sh
grep -nE 'print\(|logging|logger|traceback|repr\(' app.py segments.py
```

The only match is the `TOKEN_SECRET` warning at start-up, which is emitted
before any request exists.

**In the framework.** Uvicorn runs with `--no-access-log --log-level warning`.
The catch-all exception handler exists precisely because Starlette's default
prints the request into the traceback; it returns a fixed body and discards the
exception context. Python tracebacks do not include local variables by default,
so the document would not appear even if a traceback escaped.

**In ONNX Runtime.** `log_severity_level = 3`, so it prints nothing about
inputs.

**In Cloud Run's own logging.** The platform request log records method, URL,
status, latency, user agent and client IP — never a request body. The text is
only ever sent in a POST body and never in a URL or query string, so there is
nothing in the URL to record. `deploy.sh` adds a `_Default` sink exclusion for
this service's request log anyway, which also removes the IP addresses.

### 9.1 The end-to-end marker probe — RUN 29 August 2026, and it holds

An earlier edition of this section proposed grepping the logs for the string
`text`. That is a weak probe: it matches metadata and field names, so it can
fail in both directions. The sound probe is a unique high-entropy marker that
can only have come from the request body.

**Method, stated so it can be repeated exactly.**

1. Generate a **fresh** high-entropy marker. The 29 August 2026 run used
   `ZQXJPRIVACYPROBE1787997548VBNMK`. Generate a new one each time: re-using a
   marker means a hit could be an old record rather than a new leak.
2. Embed it in a document body and submit it to `/v1/check` on the live service
   **through the real gated path** — correct `Origin`, a browser `User-Agent`,
   and a proof-of-work token in `x-opace-token`.
3. Confirm the request was actually *scored* rather than refused. This is the
   step that makes the probe valid: a request rejected at a gate never reaches
   the code path the claim is about. The 29 August run returned
   `probability_ai: 0.0552` and `retained: "nothing"`, so it took the ordinary
   path.
4. Search **every log entry in the project**, not merely the service's, across
   `textPayload`, `jsonPayload`, `protoPayload` and `httpRequest.requestUrl`:

```sh
gcloud logging read 'timestamp>="2026-08-29T09:50:00Z"' \
  --project opace-ai-detector --limit 2000
```

**Result: zero occurrences of the marker.** The whole service produced only
4 log entries in that window, which is consistent with `deploy.sh` excluding
the request log.

**What this proves, and what it does not.** It proves the document body was not
logged **on the path that request took** — the successful scoring path. It does
**not** prove that a refusal path or an error path logs nothing: a 413, a 429
and an unhandled exception each take different code, and none of them was
probed. Re-run the same marker probe against a 413 and a 429 before the
retention claim is described as comprehensive. Until then the claim is
"audited on the scoring path", not "audited end to end", and 7.11 stays open in
that narrower form.

**Re-run this probe after any redeploy.** The Cloud Run request-log exclusion is
a deploy-time flag. A deploy that drops it would silently falsify the shipped
privacy copy with nothing failing and no error anywhere — exactly the failure
shape as the kill switch in 7.1, and it deserves the same discipline.

**What *is* retained:** a single integer per UTC day in Firestore, the count of
inferences performed. It is not associated with anything. The per-client
counters are in memory only, keyed on a BLAKE2b hash of the network with a
16-byte pepper generated at process start and never written down, so they
cannot be reversed to an address after the fact and cannot be correlated across
restarts. A plain SHA-256 of an IPv4 address is enumerable in seconds and
therefore reversible; this is not.

---

## 10. Operational checklist

Before the endpoint is advertised anywhere:

- [ ] `python3 test_segments.py` passes (`deploy.sh` blocks the build on it)
- [ ] `TOKEN_SECRET` is in Secret Manager and mounted, not defaulted
- [ ] `/v1/status` reports the limits you think you deployed
- [ ] `curl` without an Origin gets 403
- [ ] `curl` with the right Origin but no token gets 401
- [ ] A browser check from the site returns 200 with `segments[]`
- [ ] The £50 budget exists with alerts at 20/50/90/100%
- [ ] The request-rate monitoring alert exists **and has been fired once
      deliberately** to prove the Cloud Function runs `disable-service.sh`
- [ ] `./enable-service.sh` has been run once, so the recovery path is known to work
- [ ] The §9.1 marker probe returns zero hits, with a **fresh** marker, against
      the live service — and the probe request was scored rather than refused
- [ ] Golden-vector parity between the two routes (7.10)
