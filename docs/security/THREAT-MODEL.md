# Threat model — live browser checker

**Cost-control correction — 29 August 2026.** The live design now has three layers: a £50 monthly
Google-enforced spend cap scoped to `opace-ai-detector` plus `Cloud Run` (budget
`3b89c8af-bd1c-434f-8cab-3e0d14491e71`), the unchanged £10 alert-driven kill switch, and a
service/revision maximum of 1. Google warns cap enforcement is not instant and can overshoot, so
the kill switch remains the faster control. Live revision `opace-detector-00005-284` serves 100%
of traffic, and **both drills were re-proven on it on 29 August 2026**: the kill switch fired from
a Cloud Monitoring alert policy through the production notification channel, and the ten-path
zero-logging probe returned zero hits against a validated search. Older claims below that no Cloud
Run spend cap exists are superseded.

**The spend cap is invisible to the Cloud Billing Budgets API. Verify it in the console, never by
API.** `gcloud billing budgets list` and the REST `v1` and `v1beta1` endpoints all return only two
budgets and omit the spend cap entirely — not merely its cap field, the whole budget. Two sessions
read that as "no cap exists" and were wrong. Absence of evidence from one interface is not evidence
of absence, and the console and the API disagree about the same account.

Updated 29 August 2026. This began as the Phase 0 baseline and is now the threat model for a
product that is live: the browser checker was deployed on 28 August 2026 and serves a trained model
to visitors, and the hosted inference service was deployed on 29 August 2026. The controls below
still hold for the deployed surfaces. Two additions follow: the model download, and the
hosted-inference route — both now live.

Protected assets include source/candidate text, bearer tokens, WordPress nonces, provider credentials, receipts and ownership identifiers.

Trust boundaries:

- browser and WordPress UI to WordPress server;
- WordPress/server client to loopback local engine;
- Hub alone to configured providers;
- optional commercial BYOK adapters, each separately authorised.

Mandatory controls for implementation:

- loopback binding by default; authenticated non-health routes; separate run/admin scopes;
- reject credentials in URLs, redirects to new hosts, encoded/ambiguous IPs, metadata/link-local/multicast destinations and DNS rebinding;
- request/response size and time limits, bounded workers, cooperative cancellation and namespace-scoped opaque IDs;
- no source, candidate, prompt, token, filesystem path, stack trace or provider body in normal logs/errors;
- no model download on activation; explicit plan/licence/hash before install; no network pickle/deserialisation;
- browser checks make no outbound text request; every other route requires disclosed consent. This
  holds for the deployed checker today, and the hosted-inference extension below would break it;
- hard protected-content gates cannot be overridden by a favourable method score.

Remote/LAN exposure, hosted service operation, content-bearing receipt encryption and commercial adapters require separate threat-model extensions. The hosted-service extension is drafted below.


## Model download — live

The deployed checker fetches `tier3-cycle2-e5small-int8-perchannel.onnx` (34.3 MB) from the site
once, on explicit user consent, and the browser caches it. Assessment then runs entirely in the
visitor's browser, so no text is transmitted. The relevant risks are integrity of the fetched
artefact and the cost of the download to the visitor, not confidentiality of the pasted text. The
Phase 0 control "no model download on activation; explicit plan/licence/hash before install" is
satisfied for the browser route by the consent step; the artefact's base-checkpoint licence is
still not recorded anywhere in this repository and must be settled before any packaged
distribution.

## Hosted inference — DEPLOYED 29 August 2026, not yet wired to the checker

[`CLOUD-RUN-SETUP.md`](../programme/CLOUD-RUN-SETUP.md) and
[`../../services/local-engine/research/model-shrink/reference-server/SECURITY.md`](../../services/local-engine/research/model-shrink/reference-server/SECURITY.md)
describe a Google Cloud Run route that scores pasted text on a server instead of in the browser.
**It is deployed.** Re-verified on 29 August 2026 at
`https://opace-detector-877422072168.europe-west1.run.app`, revision **`opace-detector-00004-dlb`**
serving 100% of traffic, region europe-west1 (Belgium). `00004-dlb` differs from the earlier
`00003-bfq` by **image digest only**: a machine diff of the two revision specs returned exactly one
difference, and CPU, memory, concurrency, maxScale, timeout, service account and all 21 environment
variables are byte-identical. `model_build` is `e313ab00de1fffd2` on both, so the weights did not
change either — the redeploy was the `segments-v1` → `segments-v2` code change. The URL and revision
change on redeploy; `GET /v1/health` is the check to re-run rather than trusting either string.

This route crosses a trust boundary the browser-only product did not have: candidate text leaves
the visitor's browser. The following controls were **verified against the running service** on
29 August 2026, so they are measurements rather than intentions:

| Control | Verified behaviour |
|---|---|
| Origin enforcement, server-side and not merely CORS | A request from an unlisted origin is refused HTTP 403 `origin_not_allowed` |
| Automation refusal | A scripted client is refused `automation_detected` |
| Token requirement | A browser user-agent with no token is refused `token_required`; `GET /v1/status` reports `token_required: true` |
| Proof of work | A 14-bit challenge from `/v1/challenge`, exchanged at `/v1/token`, yields a token accepted in the `x-opace-token` header — **that header, not `Authorization: Bearer`** |
| Request-size ceiling | `/v1/status` reports `max_chars` 50,000, `max_words` 4,000 and `max_inferences_per_request` **99**. The 99 is `ceil(MAX_CHARS / SEGMENT_TOKEN_BUDGET)` = `ceil(50,000 / 510)`, so it derives from `MAX_CHARS`, not from `MAX_WORDS`. Earlier revisions of this document said 12; that figure was wrong. `MAX_WORDS` 4,000 caps a real `/v1/check` at roughly 12–16 segments, so 99 is a published worst case rather than a reachable one — but it is the number the service publishes to callers. Read live on revision `opace-detector-00004-dlb`, 29 August 2026 |
| Spend ceiling denominated in real cost | `service_daily_cap` 12,000 **inferences**, not requests. One four-segment request moved the remaining allowance 12,000 → 11,996, so an expensive document is charged as an expensive document |
| Per-connection limits | 5/30/100 requests and 20/150/500 inferences per minute/hour/day |
| Zero retention on the wire | Every scored response carries `processed: "server"` and `retained: "nothing"`; every refusal carries `processed: "none"` and `retained: "nothing"` |
| Kill switch | Fired deliberately and round-tripped four ways on 29 August 2026: by hand (`disable-service.sh` → first non-200 at **2.63 s** → `enable-service.sh` → 200 at 1.44 s); by a synthetic message on the Pub/Sub topic (**4.77 s** including a Cloud Function cold start); and, after the topic IAM fix, from a live Cloud Monitoring alert policy through the production notification channel. IAM policy diffed byte-identical to baseline after every restore, and no new revision was created |
| Score parity with the browser route | A 1,200-word document returned 4 segments of 340/340/340/180 words with `aggregation: "max"` and `truncated: false`, matching the published golden case exactly, so the two routes cannot silently disagree about the same document |

Per-IP limiting uses a peppered BLAKE2b hash of the client network, with a 16-byte pepper generated
at process start and never persisted, because a plain hash of an IP address can be reversed by
enumeration. **No pepper value is recorded in this document or anywhere in the repository.** IPv6 is
bucketed to /64 and the client address is read from the *last* `X-Forwarded-For` entry, since Cloud
Run appends the address it observed and only that entry cannot be spoofed.

Hosting region europe-west1 keeps the data inside EU adequacy cover and avoids international-transfer
paperwork.

### Cost control — three separate layers, and they are not the same control

**Correction, 29 August 2026.** This section previously said that no combination of Cloud Run
settings bounds the bill, and quoted **£519/month** at two instances. Both statements were wrong.

Requests are billed only when they reach a container, and requests beyond
`instances × concurrency` are refused by Cloud Run's front end without starting one. So
**max-instances does bound every billed line**, requests included, at roughly
`(instances × concurrency) ÷ mean service time`. The £519 figure rested on an unmeasured
"network-limited 500 requests/second", omitted egress entirely, and converted from USD when the
billing account is denominated in **GBP**, so Google's GBP SKU prices apply rather than an FX
conversion. The defensible number is the compute-and-memory floor: **about £51/month at maxScale 1**,
which is what the service now runs, and **£106 at maxScale 2**. Google reserves the right to
overshoot the instance limit during sudden spikes, so read that as a strong bound, not a guarantee.

Three layers protect the account, and they must be named separately rather than collapsed into a
"£50 ceiling":

| Layer | What it is | How fast |
|---|---|---|
| **maxScale 1** | A platform bound. Excess requests are refused before they cost anything | Immediate, structural |
| **£50 spend cap** | A Google-enforced *pause* of Cloud Run in this project, budget `3b89c8af-bd1c-434f-8cab-3e0d14491e71` | Acts on **recorded** spend, usually within 24 h; not instant, and overages are billed as normal |
| **£10 kill switch** | Reactive: a Cloud Monitoring alert on request rate, plus the £10 budget, driving a Cloud Function that revokes public access and closes ingress | Delivery leg measured at **44–88 s** on 29 August 2026; the detection leg is a 5-minute condition plus metric ingestion |

The spend cap and the kill switch are **different controls with different signals**. The cap works
from cost telemetry and leaves the service returning 5xx until a human lifts it; the kill switch
works from a request-rate signal and degrades the tool to the in-browser route. Neither makes the
other redundant, and calling either one "the £50 ceiling" is what led the owner to believe he was
capped when he was not.

Built, wired and verified on 29 August 2026:

| Component | Identity | State |
|---|---|---|
| Pub/Sub topic | `detector-killswitch` | created |
| Cloud Function | `detector-killswitch` — gen2, python312, europe-west1, max-instances 1 | ACTIVE |
| Fast trigger | Cloud Monitoring "Detector: request flood" (policy `9871316000257749222`): `run.googleapis.com/request_count` above 10 req/s (600/min) sustained 5 min, ALIGN_RATE 60s, REDUCE_SUM, notification channel `2980189998710127038` (type `pubsub`) | enabled — and **able to publish since 29 August 2026, not before** |
| Slow backstop | Billing budget `ce028788-6be2-45b7-9605-9461b534684a`, thresholds 20/50/90/100% of actual and 90% of forecast | publishing to the same topic |
| Topic publish rights | `billing-budget-alert@system.gserviceaccount.com` **and** `service-877422072168@gcp-sa-monitoring-notification.iam.gserviceaccount.com`, both `roles/pubsub.publisher` | the second was added 29 August 2026 at 14:44Z; see below |

On any message that passes its two ignore-guards the function revokes the `allUsers` invoker
binding and sets ingress to internal-only. It **deletes nothing**, so `enable-service.sh` restores
service. Normal peak traffic is a couple of requests a minute, so the fast trigger carries roughly
a hundredfold margin.

**Which of those two actions is the fast one is the opposite of what the scripts used to say, and
the comments have been corrected.** Measured 29 August 2026 by removing the `allUsers` binding with
ingress deliberately left open: the endpoint kept serving unauthenticated requests for **83.68
seconds** before the first 403. Closing ingress is what acts in seconds — first non-200 at 2.63 s
running `disable-service.sh` by hand, and 4.77 s when the Cloud Function did the same two things
from a cold start. Both steps are load-bearing: ingress buys the seconds, the IAM revocation is the
durable state that survives an ingress change made from elsewhere. The old comments in
`disable-service.sh` and `killswitch-fn/main.py` called the IAM revocation "the one that matters"
and "immediate", which would have justified deleting the ingress step and silently losing about 84
seconds of flood exposure.

**It failed twice before it worked, and that is the point.** First attempt: the function POSTed
to `:getIamPolicy`, which Cloud Run v2 serves only on GET; it received an HTML error page, threw
`JSONDecodeError`, and **failed silently** — the service stayed up for the full 200 seconds under
observation. Second attempt: `403 Forbidden` on `:setIamPolicy`, because the function's service
account held `roles/editor`, which does not include `run.services.setIamPolicy`; fixed with
`roles/run.admin` scoped to the service rather than project-wide. Third attempt passed: publish to
the topic, health 404 within 10 seconds, then restored to 200. A manual round trip
(`disable-service.sh` → 404 → `enable-service.sh` → 200) also passed.

**Then it failed a third way, and that one was invisible for longer.** Found on 29 August 2026:
the `detector-killswitch` topic granted `roles/pubsub.publisher` to the billing agent **and to
nobody else**. The Cloud Monitoring notification service agent held only
`roles/monitoring.notificationServiceAgent`, and that role does not include
`pubsub.topics.publish` — the role was dumped in full to confirm it. So the request-flood alert
would have opened an incident on a real flood and the notification would have failed to deliver.
The kill switch's only working input was the £10 billing budget, which publishes hours behind
actual spend. The flood case is exactly the case the flood arithmetic is about, so for that
case there was effectively no fast ceiling at all.

Fixed with one additive binding:

```sh
gcloud pubsub topics add-iam-policy-binding detector-killswitch \
  --project opace-ai-detector --role=roles/pubsub.publisher \
  --member=serviceAccount:service-877422072168@gcp-sa-monitoring-notification.iam.gserviceaccount.com
```

`roles/pubsub.publisher` contains exactly one permission, `pubsub.topics.publish`. It grants that
identity nothing on the Cloud Run service, and the monitoring agent appears nowhere in the
service's own IAM policy.

**Why it took four months to find: every previous test entered the chain below the break.** Each
one published a synthetic message to the topic with an owner credential, which exercises
Pub/Sub → Eventarc → Function → Cloud Run API and skips alert → Pub/Sub entirely. A control tested
from halfway along its chain is not tested. The correct drill is in `deploy.sh`'s verification
block, step 8: clone the alert policy onto a cheap condition, point the clone at the **same**
notification channel, trip it, watch the endpoint go down, restore, delete the clone.

Three independent faults, none visible without firing the switch through the whole chain. Had any
of them been recorded as working on the strength of a successful deployment, the £50 ceiling would
have rested on a function that raised an exception every time it was called, or on an alert that
could not reach it.

**Re-test after any redeploy, any IAM change, any alert-policy change and any Cloud Run API
version change** — and re-test **from the alert, not from the topic**. One fault was an API shape,
one was an IAM scope on the service, and one was an IAM binding on the topic; all three are the
kind a routine redeploy or a project rebuild reintroduces, and only the last one is invisible to a
test that starts by publishing to the topic.

### Residual risks on this route — open, and recorded rather than closed

- **The request charge is unbounded by the platform.** Every mitigation is reactive. If the topic,
  the function, its IAM binding on the service, **or the publisher binding on the topic** breaks,
  the ceiling is £519/month, not £50. That last one is the fault found on 29 August 2026 and it had
  been in place since the switch was built, so treat topic IAM as a monitored surface rather than a
  set-once one.
- **Per-connection state is per-instance and in-memory; the global daily cap no longer is.**
  This changed and the previous wording here was stale. `QUOTA_BACKEND=firestore` and
  `QUOTA_PROJECT=opace-ai-detector` are in force on revision `opace-detector-00004-dlb`, and the
  global counter is a server-side Firestore `Increment` on `detector_quota/day-<UTC date>` —
  observed incrementing on 29 August 2026. So the 12,000/day spend ceiling is **shared across
  instances and survives cold starts**, which is the cap the flood arithmetic depends on.
  The per-connection request and inference limiters and the token-use counters are still
  in-process objects keyed by a pepper generated at process start (`_PEPPER =
  secrets.token_bytes(16)`). A cold start resets those counters entirely — which in a
  scale-to-zero service happens constantly. **At `maxScale: 1`, in force since revision
  `opace-detector-00005-284`, the up-to-2× per-network allowance leak is closed**, because there is
  no second process to hold a second set of counters. The underlying design is unchanged and
  deliberate: making the per-request limiters shared would mean a Firestore write per request,
  which under attack exhausts the free tier and takes the global cap down with it. The leak would
  return the moment maxScale rises above 1.
- **`MAX_INSTANCES` is still set to `2` in the container's environment while the autoscaler is
  now `1`.** Found on revision `opace-detector-00005-284`, 29 August 2026. The application uses this
  env var for two things, and both are now mis-sized in the *safe* direction. The Firestore-batching
  overshoot bound `MAX_INSTANCES × (QUOTA_FLUSH_EVERY + MAX_SEGMENTS_PER_REQUEST)` computes 248 when
  the true worst case is now 124. More materially, the Firestore-unreachable fallback share is
  `GLOBAL_DAILY_INFERENCES // MAX_INSTANCES` = **6,000, not the full 12,000** — so during a Firestore
  outage the service self-limits to half the intended daily cap. Nothing is unsafe, but the deployed
  state does not match the cost analysis, which predicted the fallback share would rise to 12,000
  once maxScale reached 1. Fix by setting `MAX_INSTANCES=1` at the next deploy; it was deliberately
  **not** changed during re-verification, because that would have created a new revision and voided
  the drills being run against this one.
- **Rotating IPv6 defeats per-network limits.** Roughly **24 distinct /64s exhaust the daily cap**.
  Anyone with a /48 has 65,536 buckets.
- **Origin and User-Agent are forgeable strings** and are not counted as a security boundary.
- **The global cap is itself a denial-of-service vector.** One attacker can exhaust the day's
  allowance for everyone. It is survivable only because the in-browser route exists, has no limits
  and reads documents of any length — which is why every refusal carries the local-model fallback.
- **Zero body logging — now audited on ten code paths, not one.** Re-run on 29 August 2026
  against revision `opace-detector-00004-dlb`. Ten unique high-entropy markers were embedded in ten
  request bodies and sent through ten distinct paths: a normal score through the full gated flow, a
  413 `too_long` at 4,101 words, a 413 `too_large` from the body-size middleware at 242,036 bytes, a
  429 `rate_limited` reached by making real requests rather than by relaxing the limiter, two
  malformed bodies (invalid JSON and a wrong-typed field), a 422 `too_short` at 11 words, and the
  three gate refusals (403 `origin_not_allowed`, 403 `automation_detected`, 401 `token_required`).

  **Probe validity was established before the result was believed**, because a zero-hit search and a
  broken search look identical. A canary entry containing a marker of the same shape was written with
  `gcloud logging write` and the same read query found it. The query is a full dump of every entry in
  the window, serialised to JSON and substring-searched, so it covers `textPayload`, `jsonPayload`,
  `protoPayload`, `httpRequest.requestUrl` and every other field without having to name them; the
  `_Required` audit bucket was read separately.

  ```sh
  gcloud logging read 'timestamp>="2026-08-29T14:33:00Z"' \
    --project opace-ai-detector --limit 5000 --format=json
  ```

  **Zero hits on all ten markers.** The only entry the project produced in the window was the canary.
  Ten requests spanning a successful score, two 413s, a 429, three 4xx validation refusals and three
  gate refusals generated **no log entries at all**. The earlier narrowing — audited on the scoring
  path only — is closed for those nine additional paths. An unhandled 5xx exception is still not
  probed, because none was provoked.

  **Re-run it after any redeploy**, with fresh markers: the request-log exclusion is a deploy-time
  flag, and a deploy that dropped it would silently falsify shipped privacy copy with nothing
  failing. This matters because the live copy tells visitors their drafts are "neither stored nor
  logged" and invites them to check it on each run.

- **FastAPI validation errors echo the submitted value back to the caller.** Found by the probe
  above, and it is reflection rather than retention, but it is recorded because it is the one place
  where submitted content leaves the service in a response that is not a scoring result. A body of
  `{"text": {"nested": "<marker>"}}` returned
  `{"detail":[{"type":"string_type","loc":["body","text"],…,"input":{"nested":"<marker>"}}]}`. It
  reaches only the party who sent the data, and nothing is stored or logged, so the "neither stored
  nor logged" copy still holds. It bypasses `_blocked()`, which is the helper the zero-retention
  contract is built on, so the response carries no `processed`/`retained` fields at all, and pydantic
  decides how much to echo. A `RequestValidationError` handler that drops `input` would close it.
  The invalid-JSON case echoed `"input": {}` and leaked nothing.

### Still open on this route, and blocking

- **The site-wide copy claiming that text never leaves the visitor's browser has not been changed.**
  It is still accurate today only because the checker is not yet pointed at this service. Pointing
  the checker at the hosted route while that claim stands would be a false statement to users, and
  that copy must change everywhere it appears — the site, the plugin and the extension listings —
  before the switch is made. This is the single blocking item.
- **UK GDPR lawful basis: legitimate interests, not consent.** A consent gate that offers no real
  choice is what the ICO warns against. Not yet recorded in a published notice.
- **A DPIA is advisable** here because three ICO indicators combine. Not yet done.
- **Zero request-body logging is audited on ten paths, including every refusal and error path the
  service can be made to take from outside** (measured 29 August 2026 against
  `opace-detector-00004-dlb`; see the residual-risk section above). No longer blocking. It still must
  be re-run with fresh markers after any redeploy, and an unhandled 5xx remains unprobed.
- **Numerical parity between the server and browser runtimes is not established.** Structural
  segmentation parity is proven by the golden cases; the two runtimes are known to disagree by a
  median 0.113 on this quantised model, and the server runs fp32 while the browser runs int8. Until
  that is reconciled, the same document can score differently depending on which route ran.

Remote/LAN exposure, content-bearing receipt encryption and commercial adapters continue to require
their own separate threat-model extensions.
