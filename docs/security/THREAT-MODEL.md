# Threat model — live browser checker

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

[`CLOUD-RUN-SETUP.md`](../../../CLOUD-RUN-SETUP.md) and
[`../../services/local-engine/research/model-shrink/reference-server/SECURITY.md`](../../services/local-engine/research/model-shrink/reference-server/SECURITY.md)
describe a Google Cloud Run route that scores pasted text on a server instead of in the browser.
**It is deployed.** Verified on 29 August 2026 at
`https://opace-detector-877422072168.europe-west1.run.app`, revision `opace-detector-00003-bfq`
serving 100% of traffic, region europe-west1 (Belgium). The URL and revision change on redeploy;
`GET /v1/health` is the check to re-run rather than trusting either string.

This route crosses a trust boundary the browser-only product did not have: candidate text leaves
the visitor's browser. The following controls were **verified against the running service** on
29 August 2026, so they are measurements rather than intentions:

| Control | Verified behaviour |
|---|---|
| Origin enforcement, server-side and not merely CORS | A request from an unlisted origin is refused HTTP 403 `origin_not_allowed` |
| Automation refusal | A scripted client is refused `automation_detected` |
| Token requirement | A browser user-agent with no token is refused `token_required`; `GET /v1/status` reports `token_required: true` |
| Proof of work | A 14-bit challenge from `/v1/challenge`, exchanged at `/v1/token`, yields a token accepted in the `x-opace-token` header — **that header, not `Authorization: Bearer`** |
| Request-size ceiling | `/v1/status` reports `max_chars` 50,000, `max_words` 4,000 and `max_inferences_per_request` 12 |
| Spend ceiling denominated in real cost | `service_daily_cap` 12,000 **inferences**, not requests. One four-segment request moved the remaining allowance 12,000 → 11,996, so an expensive document is charged as an expensive document |
| Per-connection limits | 5/30/100 requests and 20/150/500 inferences per minute/hour/day |
| Zero retention on the wire | Every scored response carries `processed: "server"` and `retained: "nothing"`; every refusal carries `processed: "none"` and `retained: "nothing"` |
| Kill switch | Fired deliberately and round-tripped: health 200 → 404 after `disable-service.sh`, back to 200 after `enable-service.sh` |
| Score parity with the browser route | A 1,200-word document returned 4 segments of 340/340/340/180 words with `aggregation: "max"` and `truncated: false`, matching the published golden case exactly, so the two routes cannot silently disagree about the same document |

Per-IP limiting uses a peppered BLAKE2b hash of the client network, with a 16-byte pepper generated
at process start and never persisted, because a plain hash of an IP address can be reversed by
enumeration. **No pepper value is recorded in this document or anywhere in the repository.** IPv6 is
bucketed to /64 and the client address is read from the *last* `X-Forwarded-For` entry, since Cloud
Run appends the address it observed and only that entry cannot be spoofed.

Hosting region europe-west1 keeps the data inside EU adequacy cover and avoids international-transfer
paperwork.

### Cost control — the ceiling is a kill switch, not a setting

**No combination of Cloud Run settings delivers the owner's £50 ceiling.** `--max-instances`
bounds concurrent CPU and memory; it does not bound the request count, and requests are the
largest line on the bill. A month-long flood pinning two instances costs roughly **£519 even
with every request rejected**, and about **£257** at one instance. Any statement that instance
limits cap the bill is wrong; three documents in this repository said so and were corrected on
29 August 2026.

Built, wired and verified on 29 August 2026:

| Component | Identity | State |
|---|---|---|
| Pub/Sub topic | `detector-killswitch` | created |
| Cloud Function | `detector-killswitch` — gen2, python312, europe-west1, max-instances 1 | ACTIVE |
| Fast trigger | Cloud Monitoring "Detector: request flood": `run.googleapis.com/request_count` above 10 req/s (600/min) sustained 5 min, ALIGN_RATE 60s, REDUCE_SUM | enabled |
| Slow backstop | Billing budget `ce028788-6be2-45b7-9605-9461b534684a`, thresholds 20/50/90/100% of actual and 90% of forecast | publishing to the same topic |

On any message the function revokes the `allUsers` invoker binding and sets ingress to
internal-only. It **deletes nothing**, so `enable-service.sh` restores service. Normal peak
traffic is a couple of requests a minute, so the fast trigger carries roughly a hundredfold
margin.

**It failed twice before it worked, and that is the point.** First attempt: the function POSTed
to `:getIamPolicy`, which Cloud Run v2 serves only on GET; it received an HTML error page, threw
`JSONDecodeError`, and **failed silently** — the service stayed up for the full 200 seconds under
observation. Second attempt: `403 Forbidden` on `:setIamPolicy`, because the function's service
account held `roles/editor`, which does not include `run.services.setIamPolicy`; fixed with
`roles/run.admin` scoped to the service rather than project-wide. Third attempt passed: publish to
the topic, health 404 within 10 seconds, then restored to 200. A manual round trip
(`disable-service.sh` → 404 → `enable-service.sh` → 200) also passed.

Two independent faults, neither visible without firing the switch. Had it been recorded as working
on the strength of a successful deployment, the £50 ceiling would have rested on a function that
raised an exception every time it was called.

**Re-test after any redeploy, any IAM change, any alert-policy change and any Cloud Run API
version change.** One fault was an API shape and the other an IAM scope; both are the kind a
routine redeploy reintroduces.

### Residual risks on this route — open, and recorded rather than closed

- **The request charge is unbounded by the platform.** Every mitigation is reactive. If the topic,
  the function or its IAM binding breaks, the ceiling is £519/month, not £50.
- **Per-IP and token state are per-instance and in-memory.** With two instances a client gets
  roughly twice the nominal allowance, and a cold start resets the counters entirely — which in a
  scale-to-zero service happens constantly. Deliberate: a shared store would mean a Firestore write
  per request, which under attack exhausts the free tier and makes the *global* cap fail.
- **Rotating IPv6 defeats per-network limits.** Roughly **24 distinct /64s exhaust the daily cap**.
  Anyone with a /48 has 65,536 buckets.
- **Origin and User-Agent are forgeable strings** and are not counted as a security boundary.
- **The global cap is itself a denial-of-service vector.** One attacker can exhaust the day's
  allowance for everyone. It is survivable only because the in-browser route exists, has no limits
  and reads documents of any length — which is why every refusal carries the local-model fallback.
- **Zero body logging is audited on the scoring path, not yet on refusal or error paths.**
  Narrowed by measurement on 29 August 2026, not closed. A unique high-entropy marker was embedded
  in a document body and submitted to `/v1/check` on the live service through the real gated path
  (correct `Origin`, browser `User-Agent`, proof-of-work token). It **scored normally**
  (`probability_ai: 0.0552`, `retained: "nothing"`), which is what makes the probe valid — a request
  refused at a gate never reaches the code path the claim is about. Every log entry in the project
  was then searched for the window covering the request, across `textPayload`, `jsonPayload`,
  `protoPayload` and `httpRequest.requestUrl`:

  ```sh
  gcloud logging read 'timestamp>="2026-08-29T09:50:00Z"' \
    --project opace-ai-detector --limit 2000
  ```

  **Zero occurrences.** The whole service produced only 4 log entries in that window, consistent
  with `deploy.sh` excluding the request log.

  This proves the body was not logged **on the path that request took**. It does not prove a 413,
  a 429 or an unhandled exception logs nothing — those are different code paths and none was
  probed. Re-run the probe against a 413 and a 429 before calling the claim comprehensive.
  **Re-run it after any redeploy**, with a fresh marker: the request-log exclusion is a deploy-time
  flag, and a deploy that dropped it would silently falsify shipped privacy copy with nothing
  failing. This matters because the live copy tells visitors their drafts are "neither stored nor
  logged" and invites them to check it on each run; that copy is now backed by a measurement on the
  happy path.

### Still open on this route, and blocking

- **The site-wide copy claiming that text never leaves the visitor's browser has not been changed.**
  It is still accurate today only because the checker is not yet pointed at this service. Pointing
  the checker at the hosted route while that claim stands would be a false statement to users, and
  that copy must change everywhere it appears — the site, the plugin and the extension listings —
  before the switch is made. This is the single blocking item.
- **UK GDPR lawful basis: legitimate interests, not consent.** A consent gate that offers no real
  choice is what the ICO warns against. Not yet recorded in a published notice.
- **A DPIA is advisable** here because three ICO indicators combine. Not yet done.
- **Zero request-body logging is audited on the scoring path** (measured 29 August 2026 with a
  unique-marker probe against the live service; see the residual-risk section above). Refusal and
  error paths are not yet probed, so the claim is narrowed rather than closed, and the probe must be
  re-run with a fresh marker after any redeploy.
- **Numerical parity between the server and browser runtimes is not established.** Structural
  segmentation parity is proven by the golden cases; the two runtimes are known to disagree by a
  median 0.113 on this quantised model, and the server runs fp32 while the browser runs int8. Until
  that is reconciled, the same document can score differently depending on which route ran.

Remote/LAN exposure, content-bearing receipt encryption and commercial adapters continue to require
their own separate threat-model extensions.
