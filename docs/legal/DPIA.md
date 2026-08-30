# Data Protection Impact Assessment — AI Content Verification, Integrity & Watermark Checker

**Status: DRAFT. Not signed off. Not legal advice.**

**Version 0.1 — 29 August 2026**

---

## About this document

This is a working DPIA written by the engineering team, not by a solicitor. Nobody involved in
writing it is legally qualified. It is structured against the ICO's published DPIA guidance so that
a solicitor or a data protection adviser can review it efficiently, disagree with it, and correct
it. Treat every conclusion in it as provisional until that review has happened.

Two things follow from that. Publishing the tool's privacy copy on the strength of this document
alone would be a mistake. And the sections marked **unverified** are not throat-clearing: they mark
places where the honest answer is that nobody has checked, and a plausible number was deliberately
not invented to fill the gap.

The assessment covers the **server-side inference route** of the checker at
`https://opace.agency/tools/ai/content-verification-integrity/checker/`, which became the default
route on 29 August 2026. It also covers the in-browser route, the site analytics that load on the
same page, and the abuse controls in front of the inference service.

### Sources used

ICO guidance, fetched and read on 29 August 2026:

- [Data Protection Impact Assessments (DPIAs)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/) — contents and framing.
- [When do we need to do a DPIA?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/) — Article 35(3) triggers, the WP29 nine criteria, the ICO's Article 35(4) list, and the definitions of "innovative technologies", "significantly affect", "invisible processing", "vulnerable individual" and "large scale".
- [How do we do a DPIA?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/how-do-we-do-a-dpia/) — the seven steps this document follows, and what Step 2, Step 4, Step 5, Step 6 and Step 7 must each record.
- [How do we apply legitimate interests in practice?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/) — the three-part test, used in the companion notice.
- [A brief guide to international transfers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-transfers-a-guide/) — the three-step restricted-transfer test.

Google Cloud documentation, fetched 29 August 2026: [Cloud Logging quotas and
limits](https://docs.cloud.google.com/logging/quotas), [Cloud Run
logging](https://docs.cloud.google.com/run/docs/logging), [LogEntry
HttpRequest](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#HttpRequest),
[Cloud Monitoring quotas](https://docs.cloud.google.com/monitoring/quotas).

The technical facts in Step 2 come from reading the deployed source and querying the live
Google Cloud project, not from the programme's own documentation. Where the two disagree, the
measurement is recorded and the document is flagged as stale.

---

## Step 1 — Identifying the need for a DPIA

### Screening outcome: a DPIA is required

Two of the ICO's Article 35(4) criteria are engaged, each in combination with a WP29 criterion,
and the ICO's rule of thumb is that a combination of two indicators calls for a DPIA.

| Indicator | Source | Engaged? |
|---|---|---|
| **Innovative technology** — "processing involving the use of innovative technologies, or the novel application of existing technologies (including AI)" | ICO Art. 35(4) list | **Yes.** A fine-tuned transformer classifier scores submitted prose. The ICO names "artificial intelligence, machine learning and deep learning" as examples. |
| **Evaluation or scoring** | WP29 nine criteria | **Yes.** The whole product is a score. It outputs a probability that a passage was machine-generated. |
| **Invisible processing** | ICO Art. 35(4) list | **Yes.** A pasted document routinely contains personal data about people who are not the user, were never told, and have no relationship with Opace. Article 14 information cannot practically be given to them. |
| **Data of a highly personal nature** | WP29 nine criteria | **Foreseeable rather than intended.** A user may paste an HR grievance, a medical letter, a safeguarding note or a legal statement. Nothing in the interface prevents it. See Step 5, Risk 3. |
| **Data concerning vulnerable data subjects** | WP29 nine criteria | **Foreseeable.** Students and employees are two obvious populations whose writing gets checked by someone with power over them. |
| **Automated decision-making with legal or similar significant effect** | WP29 / Art. 35(3)(a) | **Not by Opace, but see Risk 4.** Opace makes no decision about anyone. A teacher, editor or client acting on the score might. |

Not engaged: large-scale processing (traffic is a few requests a minute against a 12,000-inference
daily ceiling), biometrics, genetic data, criminal-offence data, tracking or geolocation, data
matching, and processing of children's data as a target group.

Article 35(3) is not automatically triggered: Opace makes no decision producing legal or similarly
significant effects, and there is no large-scale special-category processing or systematic
monitoring of a public place.

The screening conclusion is that a DPIA is required on the ICO's own list, and would be advisable
in any case.

### Who did this, and who has not

Written by the engineering team. **No DPO has advised on it.** Opace's published privacy policy
gives a postal address for a "Data Protection Officer" but names no person and gives no email
address, and it is not established whether Opace has formally appointed a DPO or is required to.
If a DPO exists, Article 35(2) requires that their advice is sought and recorded, and this document
must not be signed off until that has happened. If no DPO exists, that should be recorded as a
positive decision with reasons.

Not yet consulted: a solicitor or data protection adviser; the processor (Google Cloud) beyond its
published terms; any user or user representative.

---

## Step 2 — Describing the processing

### 2.1 What the product is

A free, open-source tool that runs several named checks over a piece of writing and publishes the
findings side by side without merging them into a single verdict. Only one of those checks is a
trained AI classifier. The others — invisible characters, homoglyphs, writing signals, SynthID
watermark scan, C2PA provenance — run entirely in the visitor's browser and transmit nothing.

The classifier can run in two places, and the visitor chooses:

- **Server route (the default).** The document is sent to an Opace-controlled container on Google
  Cloud Run in `europe-west1` (St. Ghislain, Belgium) and scored there.
- **Browser route (one click away).** A 34.5 MB model file plus a 14–26 MB runtime are downloaded
  once, cached, and the same model runs on the visitor's own device. Nothing is transmitted.

The server route became the default because the download was the single largest barrier to the tool
being used at all. That decision is recorded in `HANDOVER.md` §12. It is the decision this DPIA
exists to assess.

### 2.2 The nature of the processing — how data is collected, used and held

**What is transmitted, and how.** On the server route the browser makes three cross-origin HTTPS
requests directly to the Cloud Run service. There is no proxy: `netlify.toml` contains no redirects
and there is no serverless function in the path, so the request does not traverse Netlify or
Cloudflare (verified by reading `src/lib/local-signals/server-route.ts:64` and the absence of any
other reference to the `run.app` host anywhere in the website repository).

1. `GET /v1/challenge` — returns a signed proof-of-work challenge.
2. `POST /v1/token` — `{challenge, nonce}`; returns a short-lived token.
3. `POST /v1/check` — the request that carries the document.

The `/v1/check` body is exactly `{"text": <the entire draft>}` and nothing else
(`server-route.ts:190`). The whole document goes in one request; the server does the segmentation.
The fetch is made with `credentials: "omit"`, `referrerPolicy: "no-referrer"` and
`cache: "no-store"`, so no cookie, no referrer and no account identifier accompanies it. Transport
is HTTPS with HTTP/2, terminated by Google Front End (confirmed from the live response headers on
29 August 2026: `server: Google Frontend`).

**Volume ceiling.** `MAX_WORDS` is 4,000 and `MAX_CHARS` is 50,000, confirmed against the live
service's `/v1/status` on 29 August 2026. A longer document is refused with HTTP 413 rather than
truncated, and the browser route, which has no length limit, is offered instead. The minimum is 60
words.

**What the server does with it.** The text is segmented into consecutive sections that each fit the
model's 512-token window, each section is scored, and the maximum is returned along with per-section
scores and character offsets. The text exists only as a local variable for the duration of the
request; `app.py` explicitly deletes it once scoring completes. The response carries
`processed: "server"` and `retained: "nothing"`.

**Who has access.** Nobody at Opace can read a submitted document at any point, because it is never
written to storage of any kind. Access to the Google Cloud project — and therefore to the logs and
counters described below — is held by the owner's Google account, `david.opace@gmail.com`. The full
list of principals with access to the project has not been enumerated for this document.
**Unverified — needs a project IAM review.**

**Retention, by category.** This is the section the current user-facing copy under-describes.

| Category | Where | Form | Retention | How established |
|---|---|---|---|---|
| The submitted document | Cloud Run container memory | Plain text | Duration of the request | Read from `app.py`; no write path exists |
| The AI score and segment rows | Returned to the browser; container memory | Numeric | Duration of the request | Same |
| **Cloud Run request log entries** | **Cloud Logging `_Default` bucket, `global` location** | **Full client IP address in `httpRequest.remoteIp`, plus user agent, request URL, method, status, latency, request size, and referer where sent** | **30 days** | **Measured. See 2.6 — this contradicts the deployment's own intent.** |
| Container `stderr` / `stdout` | Cloud Logging `_Default` bucket, `global` | Free text | 30 days | Log names `run.googleapis.com/stderr` and `/stdout` confirmed present in the project |
| Admin activity audit logs | Cloud Logging `_Required` bucket, `global` | Identity of the operator, not the visitor | **400 days, not configurable, bucket locked** | Confirmed from the live bucket listing |
| Per-network rate-limit counters | Cloud Run process memory | Peppered BLAKE2b-128 hash of the network; pepper is 16 random bytes generated at process start and never persisted | Sliding window, max 24 hours; destroyed on instance recycle, which in a scale-to-zero service is constant | Read from `app.py` lines 260–305 |
| Proof-of-work challenge state | Not held server-side | Challenge is HMAC-signed and self-verifying; it carries an HMAC pseudonym of the network inside it | None. The server holds no challenge table | Read from `app.py` `_make_challenge` / `_check_challenge` |
| Token use counters | Cloud Run process memory | Keyed on the token's random `jti`, not on any client identifier | Until token expiry (900 s) or instance recycle | Read from `app.py` `_TOKEN_USES` |
| Global daily inference counter | Firestore, `europe-west1`, collection `detector_quota`, document `day-YYYY-MM-DD` | `{count: integer, day: string}` — no identifiers of any kind | **Indefinite. No TTL policy is configured and nothing deletes old day documents.** | Read from `app.py` `GlobalQuota._push`; no TTL in `deploy.sh` |
| Cloud Monitoring request-count metric | Cloud Monitoring | Aggregate counts by response code; no client identifier | **24 months**, downsampled after 6 weeks | Google's published retention policy |
| Cloud Trace spans | Cloud Trace | Request metadata | API is enabled on the project and log entries carry `traceSampled: true`, but a Cloud Trace v1 query over the previous seven days returned no traces on 29 August 2026 | Measured; see 2.6 |

**Security measures.** Origin enforcement server-side rather than by CORS alone; browser user-agent
requirement; a 14-bit proof of work exchanged for a token good for 20 checks; per-network limits of
5/30/100 requests and 20/150/500 inferences per minute/hour/day; a service-wide 12,000-inference
daily ceiling backed by Firestore; a request-size guard at 220,000 bytes; a container running as a
non-root user with the model baked into the image; uvicorn started with `--no-access-log`; ONNX
Runtime set to `log_severity_level = 3`; a catch-all exception handler that returns a fixed body;
and a Pub/Sub-driven kill switch that revokes public access. Origin and user agent are forgeable
strings and are not counted as a security boundary.

**New or novel technology.** Yes. A fine-tuned transformer classifier producing a probability about
a person's writing is squarely within the ICO's "innovative technologies" example list.

### 2.3 The scope of the processing

**The nature of the personal data.** Opace does not ask for personal data and the interface asks
for a draft. What actually arrives is whatever the user pastes. Three distinct categories result:

1. **Personal data about the user**, where the draft is about them or written by them.
2. **Personal data about third parties**, where the draft names, describes or concerns other
   people. This is entirely ordinary: a case study, a complaint, a reference, a report, an essay
   about a named person.
3. **No personal data at all**, where the draft is a product description or a piece of technical
   prose. This is probably the largest category and it is worth saying so plainly.

Plus, on every route including the browser route, the visitor's IP address as seen by the
infrastructure serving the request.

**Special category data.** Not sought, not knowingly processed, and entirely foreseeable. A user
pasting an occupational health letter, a grievance, a safeguarding record or a personal statement
about their health is not an exotic scenario. See Step 5, Risk 3, and Step 6, Measure 5.

**Volume and frequency.** Bounded by design. A single document is at most 4,000 words. The service
performs at most 12,000 inferences a day, roughly 1,200 to 3,000 documents. Expected traffic at the
time of writing is a couple of requests a minute. This is not large-scale processing on the ICO's
criteria.

**Duration.** The processing of the document itself lasts a few seconds. The associated metadata
retention is set out in 2.2.

**Number of data subjects.** Unknown and unknowable, because Opace never learns who the people
named inside submitted documents are. Bounded above by the daily cap.

**Geography.** The site is UK-facing. The service is open to anyone who can reach it. The container
runs in Belgium.

### 2.4 The context of the processing

**Source of the data.** Volunteered by the user, in the case of their own data. Supplied by the
user about somebody else, in the case of third-party data. Observed, in the case of IP addresses.

**Relationship with the individuals.** With the user, none beyond the visit: there is no account,
no sign-in and no identity linkage of any kind. With third parties named in a document, none at
all. They do not know Opace exists.

**Control.** The user has real and immediate control over the largest question, which is whether
the text leaves their device. One radio button switches the model to run in the browser, and the
interface says so at the point of pasting rather than in a policy. That control is genuine and it
matters to the balancing test in the companion notice. Third parties named in a document have no
control whatsoever, and no way to acquire any.

**Reasonable expectations.** A visitor pasting text into a checker on a public website can
reasonably expect it to be checked. Whether they expect it to leave their machine is exactly what
the on-page copy exists to settle, and the copy currently does that job well on the checker page
itself. A person named inside somebody else's document has no expectations about Opace at all,
which is the definition of invisible processing.

**Children and vulnerable people.** The tool is not directed at children and does not knowingly
process their data. It will nonetheless be pointed at student work, and the student whose essay is
being checked may well be a child. The ICO treats employees as potentially vulnerable because of
the power imbalance with their employer; the same reasoning applies to a student and a teacher.

**Current public concern.** High, and specifically about this class of tool. AI-detector false
positives against students are a live and well-documented controversy. Anything Opace publishes
about accuracy will be read in that light, and any overstatement will be treated as one.

**Codes of practice.** The processing engages PECR for the analytics on the page, which is dealt
with as Risk 7. No sector code applies.

### 2.5 The purposes of the processing

| Operation | Purpose | Benefit |
|---|---|---|
| Scoring the submitted text | Return the requested assessment | The user gets the answer they asked for, with named limitations attached |
| Deriving a network identifier for rate limiting | Stop one client exhausting a shared free allowance | The tool stays free and available; the bill stays inside £50 |
| Proof of work and token issuance | Make scripted abuse expensive | Same |
| Global daily inference counter | Bound total spend | The service survives; the owner is not exposed to an open-ended flood bill |
| Security logging | Diagnose failures and abuse | Reliability, and the ability to investigate an incident |
| Site analytics on the tool page | Understand usage of the site | Ordinary product improvement, and see Risk 7 |

Intended outcome for individuals: a probabilistic reading, published next to the false-positive
rate that produced it, that is explicitly not a verdict on authorship. Wider benefit: the tool is
free, open source, and publishes its own weaknesses in a field where competitors do not.

### 2.6 Two measured findings that the existing documentation did not reflect

Both were established on 29 August 2026 by querying the live Google Cloud project directly, and
both were remediated the same day. They are recorded here rather than buried, with the first
finding's own misdiagnosis left in place, because how a control was wrongly declared broken matters
as much as how it was wrongly declared working.

**Finding A — the request-log exclusion had a real gap and a real fragility, but not the one first
diagnosed. Both are now closed and verified.**

`deploy.sh` step 7 adds an exclusion named `detector-requests` to the project's `_Default` log sink,
with the comment that it "removes the IP addresses". The exclusion was applied at
`2026-08-29T09:37:48Z`. Its filter read:

```
resource.type=cloud_run_revision AND resource.labels.service_name=opace-detector AND logName:requests
```

**The first reading of this was wrong and the correction is recorded in full, because the mistake
is instructive.** It concluded that the exclusion was not taking effect at all, on the strength of
89 request entries in the `_Default` bucket carrying full client IPs, 16 distinct addresses, and
entries timestamped five hours after the exclusion was applied. What that reading missed is that
the project runs **two** Cloud Run services, and the filter pins one of them. Split by service:

| Service | Entries | Window | Covered by the filter? |
|---|---|---|---|
| `opace-detector` | 74 | `08:59:34Z` – **`09:41:07Z`** | Yes |
| `detector-killswitch` | 15 | `09:43:04Z` – `14:31:49Z` | **No** |

The detector's own request logging stops at `09:41:07Z`, three minutes and nineteen seconds after
the exclusion was applied — ordinary sink propagation, not a failure. Every later entry belongs to
the killswitch function, which the filter never matched. Pooled, the two look like one service that
never stopped logging.

Absence of entries does not prove an exclusion works, because it is equally consistent with no
traffic. Two independent checks rule that out:

- The detector's container `stderr` records **seven cold starts between `10:45Z` and `14:02Z`**. A
  cold start only happens when a request arrives, so the service was being used throughout the
  period in which no request log was written for it.
- A deliberate probe on 29 August at `14:58:02Z` sent six requests across both services. A read
  bounded to that moment returned nothing; the same read with the time bound removed still returned
  the older rows, proving the query itself works and the silence is real rather than an artefact.

**Two genuine faults, both fixed on 29 August 2026:**

1. **The `service_name` pin left the second service uncovered**, so the killswitch function's
   request entries, with their own client IPs, were still being retained. The live filter is now
   `resource.type=cloud_run_revision AND logName:requests`, covering every Cloud Run service in the
   project. Applied at `2026-08-29T14:53:17Z`.
2. **`deploy.sh` used `--add-exclusion`, which fails when the exclusion already exists**, so a
   re-deploy silently preserved whatever filter was there before and could never widen or correct
   it. It now updates in place when the exclusion is present and adds it only when absent, so a
   re-deploy converges. It also carries a verification step requiring an empty read **after fresh
   traffic**, with an instruction to prove the probe by re-running it without the time bound.

**Residue.** 89 entries written before the exclusion took effect remain in the `_Default` bucket,
`global` location, until they age out on 28 September 2026. Their composition was measured without
recording any address:

| | Entries | Distinct IPs | Paths | Character |
|---|---|---|---|---|
| `opace-detector` | 74 | **1** | `/v1/check` 46, `/v1/health` 10, `/v1/challenge` 8, `/v1/token` 5, `/v1/score` 4, `/health` 1 | One development machine. Six user agents: `curl/8.7.1`, `node`, `Python-urllib/3.9` and three desktop Chrome builds |
| `detector-killswitch` | 15 | 15 | `/` | Google's own Pub/Sub push infrastructure, user agent `APIs-Google` |

**No member of the public appears in them.** The service was not publicly launched during that
window, and the one detector address is the machine the deployment and testing were run from. That
materially changes the remedy: the earlier recommendation to purge was written on the belief that
16 visitors' addresses were held. Deleting them early remains available as one irreversible
command and is recorded as an owner decision, not taken by an agent.

The verification command, so this can be re-checked rather than believed:

```sh
gcloud logging read \
  'resource.type=cloud_run_revision AND logName:requests
   AND timestamp>="<a time after fresh traffic was sent>"' \
  --project opace-ai-detector --limit 100 --format='value(timestamp)'
```

An empty result **after fresh traffic** is the only evidence that the control works. The presence
of the exclusion is not evidence, and neither is an empty result on its own — run the same query
without the timestamp line to confirm it can still return rows. This is the same failure shape as
the kill switch, which `SECURITY.md` §7.1 predicted and which then failed twice, once silently,
before it worked.

**Finding B — the "no logging on any path" claim rests on an assumption about Python that holds,
and a code path that does not behave as the comments describe.**

`SECURITY.md` §9 states that the catch-all exception handler "returns a fixed body and discards the
exception context". The handler does return a fixed body. It does not stop the exception being
logged. Starlette's `ServerErrorMiddleware` calls the installed 500 handler, sends its response, and
then re-raises unconditionally — the upstream source carries the comment "We always continue to
raise the exception. This allows servers to log the error." Uvicorn therefore logs
`Exception in ASGI application` with a traceback at ERROR severity, which passes the configured
`--log-level warning` and lands in `run.googleapis.com/stderr`, a log the `detector-requests`
exclusion does not cover and which is retained for 30 days.

Whether a submitted document could appear in such a traceback is a separate question, and the
answer is probably not: Python's default traceback formatting does not include local variables, so
the document would have to be embedded in an exception's own message by a library. No such path has
been identified. It has also not been ruled out, and no error path has been probed.

The existing zero-body-logging audit covers the successful scoring path only. A separate exercise
(agent B1) is extending it to the 413 and 429 refusal paths and to the error path. **This DPIA's
assurance on request-body retention is contingent on that work.** Until it reports, the honest
statement is "audited on the scoring path, unprobed elsewhere", and Step 7 records the residual risk
on that basis.

### 2.7 Processors and other recipients

| Party | Role | What they see | Named publicly today? |
|---|---|---|---|
| **Google Cloud** (Cloud Run, Cloud Build, Artifact Registry, Firestore, Secret Manager, Cloud Logging, Cloud Monitoring, Pub/Sub, Cloud Functions, Cloud Billing) | Processor | The document in transit and in container memory; the client IP at ingress and in the request log; aggregate counters | **The tool's own on-page copy names "Google Cloud Run, europe-west1, Belgium". The privacy policy does not.** |
| **Netlify** | Processor — website hosting | Page requests to `opace.agency`. **Not** the inference request, which does not pass through it | No |
| **Cloudflare** | Processor — DNS and edge cache in front of Netlify | Page requests to `opace.agency`. **Not** the inference request | No |
| **Google (GA4, `G-9RX6GHVD86`)** | Processor / joint arrangement | Page views and four allowlisted tool events carrying only an enum value | Yes, in the privacy policy |
| **HubSpot (portal `2752703`)** | Processor | Page views and its own tracking cookies | Yes, in the privacy policy |

Google Analytics and HubSpot load on the checker page. They are not gated by consent, and the
loading trigger includes the first `keydown` — which is to say, they load at the moment the user
starts typing or pastes into the draft field. They receive no draft text: the tool's analytics
helper is a hard allowlist of four event names and six enum values, and no free text can pass
through it (`integrity-track.ts`, three lines, verified). The problem is not leakage of the draft.
The problem is that non-essential cookies are set without consent, which is a PECR issue. See
Risk 7.

This was briefly changed on 29 August 2026 and reverted the same day on the owner's instruction.
The position above is the current and intended one, on the tool pages and site-wide.

The site has a `CookieNotice.astro` component. It is imported by nothing and never rendered, and
its own header comment says it would not have gated anything even if it were. The privacy policy
documents a `opace-cookies-acknowledged` storage key that is therefore never written. Nothing in
the shipped bundle reads either that key or the `opace-cookies-consent` key written during the
hours the gate was live, so no stored value affects whether the scripts load.

### 2.8 International transfers

The description that has been circulating in the programme's documentation — that hosting in the EU
means "no international transfer paperwork" — is too simple, and this DPIA should say so.

Applying the ICO's three-step test: the UK GDPR applies to Opace's processing; Opace initiates a
transfer of personal data to Google, which is located outside the UK; and Google is a separate legal
entity. All three steps are met, so **this is a restricted transfer**. It is not a transfer-free
arrangement.

It is, however, a restricted transfer to a destination covered by UK adequacy regulations. The
container runs in Belgium, and every EEA state has full adequacy under the UK's regulations, so the
transfer can be made on that basis without additional safeguards. Choosing `europe-west1` was the
right call; the reasoning recorded for it was just imprecise.

Two things remain open, and both are for the owner rather than for engineering:

- **Which Google entity is the contracting processor, and whether the Cloud Data Processing
  Addendum has been accepted.** Google's CDPA is incorporated by reference into the Google Cloud
  Platform terms and includes the EU Standard Contractual Clauses together with the UK
  International Data Transfer Addendum, which would cover onward transfers to Google LLC in the
  United States as a sub-processor and support access from outside the EEA. Whether that is in
  place for this specific billing account, and under which entity, is **unverified — needs owner
  confirmation.**
- **Cloud Logging's `_Default` and `_Required` buckets are in the `global` location, not the EU.**
  Confirmed from the live project. Given Finding A, that means client IP addresses are currently
  held in a global-location log bucket. This does not by itself defeat adequacy — Google is still
  the processor and the CDPA still governs — but it does mean the simple statement "everything stays
  in the EU" is not accurate as deployed.

Netlify, Cloudflare, Google Analytics and HubSpot each involve their own transfers, which are
outside this DPIA's scope but are not currently covered by the privacy policy either.

---

## Step 3 — Consultation

**Individuals: not consulted.** No user research, survey or consultation has been carried out. The
ICO expects consultation "unless there is a good reason not to", and the reason recorded here is
weak: it has simply not been done. Consulting the people most affected — the person whose essay or
document is being checked — is also structurally hard, because Opace never learns who they are.

That said, one form of consultation is cheap and available: publishing this DPIA. The ICO
describes publication as good practice. Doing so, and providing an email route for objections,
would be a reasonable substitute for a formal consultation given the scale of the processing. It is
recommended in Step 6.

**Processors: not consulted beyond published terms.** Google's obligations are taken from its
public CDPA and documentation.

**Internal stakeholders:** the engineering team wrote it. The owner has not yet reviewed it.

**Independent experts: not consulted.** No legal or DPO review has taken place. This is the single
largest procedural gap in the document and it blocks sign-off.

---

## Step 4 — Necessity and proportionality

### Does the processing achieve the purpose?

Yes, and this is measurable rather than asserted. On 5,558 long-form documents the model had never
seen, the fp32 server runtime detects 95.1% of AI long-form writing at a 1.21% false-positive rate
on human long-form writing, at the shipped threshold of 0.984. The whole document is read rather
than its opening: reading everything and taking the strongest section rather than the mean moved
detection from 57.8% to 93.3% on the same documents.

### Is there a less intrusive way?

This is the question the design already answers, and it answers it well. **The same model, at the
same threshold, runs in the visitor's browser, sends nothing, and is one click away.** The
segmentation contract is shared and enforced, so the two routes cannot silently disagree, and both
carry the same flag point.

That materially changes the proportionality analysis. Server-side processing is not necessary to
deliver the tool. It is necessary to deliver the tool *without a 34.5 MB download*, which was
measured to be the largest barrier to anyone using it at all. The transmission is therefore
convenience-driven, and the correct conclusion is not that it is unjustifiable but that it must be
a genuine, prominent, one-click choice rather than a default the user cannot see. It currently is
that. Any change that makes the browser route harder to reach would invalidate this section.

Within the server route, the data minimisation is real rather than promised:

- one request per document, not one per section, so no additional metadata is generated by
  chunking;
- no cookie, no referrer, no account, no identifier of any kind accompanies the text;
- the model reads a bounded window per segment, so minimisation is a property of the architecture;
- documents over 4,000 words are refused rather than trimmed, with the unlimited browser route
  offered instead;
- the text is never placed in a URL or query string, so it cannot leak through request logging.

Two things are not minimised as well as they could be. Nothing prevents a user pasting far more
than the check requires. And the IP-derived rate limiting, discussed below, currently produces a
retained record that the design intended to eliminate.

### Preventing function creep

The submitted text is never written to storage, so there is nothing to repurpose. No training on
user submissions takes place and none is planned; this should be stated in the published notice as
a commitment rather than left as an implementation detail, because it is the thing users of AI
tools most reasonably fear. The daily counter holds an integer with no identifiers and cannot be
repurposed into anything.

### Data quality

The relevant quality question is not the accuracy of stored records — there are none — but the
accuracy of the output, and that is dealt with as Risk 4. The measured weakness list is published
rather than buried, including human fiction at a 12.69% false-positive rate.

### Privacy information

On the checker page itself, this is done well. A "Where your draft goes" block sits next to the
paste field, the route selector states the position for each route, the runtime note is on screen
during the run rather than only after it, and a transport panel prints the words sent, the region,
and the server's own statements. That is better transparency than most commercial tools offer.

Off that page, it is not done at all. The privacy policy, last updated 9 March 2026, does not
mention the tool, does not name Google Cloud as a processor, states no retention period for
anything the tool handles, and has no international-transfer or automated-processing section. The
companion document `LAWFUL-BASIS-AND-TRANSPARENCY.md` supplies the copy to fix that.

### Individual rights

- **Right to be informed.** Article 13 is satisfied for the user by the on-page copy plus the
  notice to be published. Article 14 cannot practically be satisfied for people named inside a
  submitted document, which is the invisible-processing finding in Step 1.
- **Access, rectification, erasure, portability, restriction.** For the submitted text these are
  largely moot because nothing is retained: there is no record to disclose, correct or delete. For
  the IP addresses currently held in request logs there is a real obligation, and no process exists
  to search or delete them. See Risk 1 and Measure 1.
- **Objection.** Where legitimate interests is relied on, Article 21 gives an absolute practical
  answer here: the user can stop the processing themselves by switching route.
- **Article 22.** Not engaged for Opace, which makes no decision about anybody. It may be engaged
  for a downstream user who acts on the score, and Opace's obligation is to say clearly that the
  output is not a verdict. See Risk 4.

### Processor compliance

Google's CDPA is the mechanism. Its acceptance for this account is unverified (2.8). Netlify,
Cloudflare and HubSpot terms have not been reviewed for this document.

---

## Step 5 — Identifying and assessing risks

Likelihood and severity are graded low / medium / high, and the overall risk follows the ICO's
matrix approach. These are engineering judgements, not legal ones.

### Risk 1 — Client IP addresses retained while the product says nothing is logged — CLOSED

**Source:** Finding A, Step 2.6. Cloud Run's request log records the visitor's full IP address,
user agent and request URL for every call, including every `/v1/check`.

**Impact on individuals:** an IP address is personal data. A 30-day record linking an address to
the fact and size of a document submission at a given moment is a small but genuine disclosure of
behaviour, and a record that could be compelled or breached. The greater harm is to trust: the tool
invites the visitor to check its retention claim on each run, so a mismatch is not a technicality.

**Measures applied, 29 August 2026.** The exclusion was already suppressing the detector's request
log; it did not cover the project's second Cloud Run service, and a re-deploy could not correct it.
The filter now covers every Cloud Run service in the project, and `deploy.sh` updates the exclusion
in place rather than failing when it exists. Verified against fresh traffic with a probe proved
able to return rows when the time bound is removed.

**Residual.** 89 pre-exclusion entries age out on 28 September 2026. They contain no
member-of-the-public address: 74 carry a single development-machine IP, 15 carry Google's own
Pub/Sub infrastructure addresses. Early deletion is an owner decision.

**Likelihood after measures:** low, and detectable — the deploy script now fails the operator's own
check if it regresses. **Severity:** medium. **Overall: LOW.** The copy has been changed to match
in the same pass, so the fairness problem under Article 5(1)(a) does not survive either.

### Risk 2 — Third-party personal data inside a submitted document

**Source:** the user pastes text about somebody else. That person did not choose this, does not
know it happened, and has no relationship with Opace.

**Impact:** loss of control over personal data, and an inability to exercise any right because they
are unaware. This is the ICO's "invisible processing" category, which it treats as a risk to
interests even where the processing itself has no negative effect.

**Mitigating facts, which are strong:** the data is held for seconds, in memory, is never written
anywhere, and is never linked to an identity. The practical exposure is a few seconds of transit
and computation.

**Likelihood:** high — this will happen routinely. **Severity:** low in most cases, given the
retention position. **Overall: MEDIUM.**

### Risk 3 — Special category or otherwise highly sensitive data pasted into the box

**Source:** a health letter, an HR grievance, a safeguarding note, a legal statement, a personal
essay about illness. Nothing in the interface prevents it and nothing about the tool discourages it.

**Impact:** if such a document were exposed, the harm would be severe. Article 9 also requires a
condition for processing special category data, and none of the Article 9(2) conditions fits well:
the data is not manifestly made public, there is no explicit consent from the person concerned, and
no substantial public interest condition applies. Opace does not seek this data and cannot detect
it, but "we did not intend to receive it" is not itself an Article 9 condition.

**Mitigating facts:** no retention, no identity linkage, and a browser route that removes the
transmission entirely. The realistic exposure is transit and memory.

**Likelihood:** medium — it will happen occasionally across any real volume of users.
**Severity:** high in the tail. **Overall: MEDIUM–HIGH.** This is the risk that most needs an
explicit interface warning, which does not currently exist.

### Risk 4 — A person is harmed by a decision somebody else makes from a probabilistic score

**Source:** a teacher, editor, employer or client runs the tool over a person's writing and acts on
the number.

**Impact:** an accusation of dishonesty, a rejected commission, a failed assignment, a damaged
professional reputation. This is the harm the tool's whole category is notorious for, and the
measured figures show exactly where it bites:

- **Human fiction: 33 of 260 wrongly flagged, 12.69%.** The model was never trained on human
  fiction. A novelist should not be assessed with this tool, and the documentation says so.
- **Business reports:** AUROC 0.6935 on 72 held-out rows, against 0.93–0.99 elsewhere. Clears the
  floor and must not be quoted as settled.
- **Academic prose:** 3.81% on discussion sections, 2.78% on conclusions, 1.90% on introductions,
  0% on literature reviews and 0 of 420 on student essays.
- **Short text:** unreliable below about 200 words. Detection falls to 67% at 200 words, 50% at 150
  and 19% at 100. No false positives on 400 human samples at 60–200 words.
- **AI rewrites of a human original:** caught 30–35% of the time.

The overall false-positive rate at the shipped threshold is 1.21%. That is low, and it is still one
person in eighty-three.

**Mitigating facts, which are unusually strong for this product category:** the three axes are kept
separate and `assertAxisIndependence` throws if they contaminate each other; the headline note under
every probability says it is not proof of authorship and that a low figure is not a human verdict;
the false-positive rate is printed next to the score rather than in a footnote; and the claims
ladder forbids quoting a detection rate without its weakest-case figure.

**Likelihood:** medium. **Severity:** high for the individual affected. **Overall: HIGH.** This is
a fairness risk under Article 5(1)(a) more than a security risk, and it cannot be engineered away —
only stated honestly and repeatedly.

### Risk 5 — Request bodies reaching a log through an unaudited path

**Source:** Finding B. Refusal (413, 429) and error paths are unprobed, and Starlette re-raises
after the custom 500 handler, so tracebacks do reach `stderr`.

**Impact:** if a document fragment reached a log, it would sit in the `_Default` bucket for 30 days
and would directly falsify shipped copy.

**Likelihood:** low. Python tracebacks omit locals, no library in the path is known to embed input
in an exception message, and the scoring path has been probed clean with a high-entropy marker.
**Severity:** high if it occurred. **Overall: MEDIUM**, pending B1's extended probe, after which
this should be re-graded.

**A separate, confirmed behaviour that is not retention but should be stated rather than
discovered.** `app.py` registers a handler for `Exception` but not for `RequestValidationError`.
FastAPI's default validation handler returns `exc.errors()`, which under pydantic v2 includes the
offending `input` value, so **a fragment of the submitted body is echoed back in a 422 schema-error
response**. Re-confirmed as still present on 29 August 2026. It goes only to the sender, over the
same TLS connection that carried it, and it is not written anywhere — so it is reflection, not
storage, and it does not affect the retention position. It does qualify the broader claim that
nothing about a request is ever reflected, and it is recorded here so that claim is not made too
widely. Registering a `RequestValidationError` handler that returns the error type without the
`input` value would close it.

### Risk 6 — The zero-logging control silently regressing on a future deploy

**Source:** the request-log exclusion is a deploy-time flag. So is the rest of the logging posture.
A deploy that dropped it would falsify the privacy copy with nothing failing and no error anywhere.
Finding A was an instance of the milder form: `--add-exclusion` fails when the exclusion already
exists, so for five months a re-deploy could not have corrected or widened the filter, and would
have reported success either way.

**Measures applied, 29 August 2026.** The deploy script updates the exclusion in place instead of
failing, so a re-deploy converges on the intended filter. Its verification block now requires the
operator to send fresh traffic and observe an empty read, and to prove the probe by re-running it
without the time bound. An assumed empty result is what let this sit unnoticed.

**Likelihood after measures:** low. **Severity:** medium. **Overall: LOW-MEDIUM.** It cannot be
driven lower without an automated check, which does not exist; the control is still a human reading
a query result.

### Risk 7 — Analytics cookies set without consent on the tool page

**Source:** GA4 and HubSpot loaded on the checker page with no consent gate, triggered by the first
scroll, click, touch or keypress, or after eight seconds — so, on the keystroke that starts the
visitor working on their draft. The cookie banner component existed but was imported nowhere and
never rendered. The privacy policy asserts legitimate interests for analytics.

**Impact:** PECR regulation 6 requires consent for non-essential storage and access on a terminal
device, and legitimate interests is not an available basis for that. The privacy policy also
documents an acknowledgement key that is never written, so it describes a control that does not
exist.

**Owner decision, 29 August 2026.** A consent gate was wired to the content-integrity tool pages
on that date and reverted the same day on the owner's instruction. GA4 and HubSpot now load on
those pages exactly as they do across the rest of the site: on the first scroll, click, touch or
keypress, or after eight seconds. There is no on-page consent mechanism on any page of the site,
and no stored preference suppresses either script. The owner's recorded position is that analytics
data is essential to the business, and that a visitor who does not want it should use their
browser's own cookie and tracking controls. The tool pages carry a short note naming both scripts
and pointing at those controls; it does not offer a choice on the page, because none exists.

**Measure applied.** Informational only: the transparency note above, plus the privacy policy
corrections in `LAWFUL-BASIS-AND-TRANSPARENCY.md` §6.1. No technical control was applied.

**Residual.** Non-essential cookies are set without prior consent, on the tool pages and
site-wide. PECR regulation 6 requires consent for storage and access on a terminal device, and
legitimate interests is not an available basis for it, so this exposure stands unmitigated. It is
accepted by the owner as a business decision dated 29 August 2026. Measure 10 is closed as a
documented decision rather than as a technical control, which is one of the two outcomes that
measure allowed for.

**Likelihood:** certain, by design. **Severity:** low for the individual — the scripts receive no
draft text — medium as a compliance exposure. **Overall: MEDIUM, accepted by the owner.**

### Risk 8 — Re-identification of the rate-limiting pseudonyms

**Source:** per-network counters keyed on a peppered BLAKE2b hash.

**Assessment:** the design is good. A plain hash of an IPv4 address is enumerable in seconds; a
16-byte pepper generated at process start and never persisted is not reversible, and cannot be
correlated across restarts. **Likelihood: low. Severity: low. Overall: LOW.**

The caveat is that this careful design is currently undermined by Risk 1, where the raw address is
sitting in a log next to the same requests.

### Risk 9 — Denial of service against the shared allowance

**Source:** the global 12,000-inference daily cap is itself an attack surface. Roughly 24 rotating
/64 prefixes could exhaust it.

**Impact on individuals:** loss of access to a free service. Survivable only because every refusal
carries the local-model fallback, which has no limits and no length ceiling.

**Overall: LOW** as a data protection risk. It is a service-availability risk, recorded because the
ICO's list includes "preventing data subjects from ... using a service".

### Risk 10 — Security of the transfer itself

HTTPS with HTTP/2 to a Google-operated endpoint; no cookies or credentials; origin, user agent,
proof-of-work and token gates in front of the scoring path; a non-root container; the token secret
in Secret Manager rather than an environment literal. **Overall: LOW.**

---

## Step 6 — Measures to reduce risk

| # | Measure | Addresses | Effect | Owner | Status |
|---|---|---|---|---|---|
| 1 | **Make the request-log exclusion actually work, and prove it by reading the logs back after the change rather than by the exclusion's existence.** Re-apply with an unambiguous filter, cover the `detector-killswitch` service too, then query for entries after the change and require an empty result. | Risk 1 | Would eliminate | Engineering | **Not done — blocking** |
| 2 | **Purge the existing 30 days of request-log entries** that carry client IPs, or record a decision to let them age out and disclose the position honestly in the meantime. | Risk 1 | Reduces | Owner decision | Not done |
| 3 | **Change the shipped copy from "neither stored nor logged" to language that separates the document from the request metadata**, so the distinction is stated rather than left to be inferred. Exact wording is in `LAWFUL-BASIS-AND-TRANSPARENCY.md` §6. | Risk 1, Risk 6 | Reduces | Owner / engineering | **Not done — blocking** |
| 4 | **Publish the lawful-basis and transparency notice**, and add a tools section to the privacy policy naming Google Cloud as a processor, the region, the retention periods and the transfer position. | Risk 1, Risk 2, Risk 7 | Reduces | Owner | Drafted, not published |
| 5 | **Add a short interface warning against pasting sensitive documents on the server route**, pointing at the browser route. One sentence next to the route selector. | Risk 3 | Reduces | Engineering | **Not done** |
| 6 | **Finish the zero-body-logging audit** across the 413, 429 and unhandled-exception paths, and re-grade Risk 5 on the result. | Risk 5 | Reduces | Agent B1, in flight | In progress |
| 7 | **Correct `SECURITY.md` §9** to say that Starlette re-raises after the custom handler and that tracebacks reach `stderr`, so the documentation stops asserting something the framework does not do. | Risk 5 | Reduces | Engineering | Not done |
| 8 | **Add the exclusion check and a fresh marker probe to the post-deploy checklist**, with the same discipline as the kill switch: fire it, do not assume it. | Risk 6 | Reduces | Engineering | Partially — the checklist exists in `SECURITY.md` §10 |
| 9 | **Set a Firestore TTL on the `detector_quota` day documents**, or record a decision that indefinite retention of a bare integer is acceptable. It holds no personal data, so this is hygiene rather than compliance. | — | Hygiene | Engineering | Not done |
| 10 | **Gate GA4 and HubSpot behind consent**, or take a documented decision on the PECR position. Render the cookie notice that already exists, or remove it from the privacy policy. | Risk 7 | Reduces | Owner | **Closed as a documented decision, 29 August 2026** — not gated; see Risk 7. The privacy policy still needs the acknowledgement-key row corrected. |
| 11 | **Fix the exported receipt**, which records `allowed_routes: ["browser"]` even when the run used the EU server route. It misstates the route on the default path. | Risk 1, honesty | Reduces | Engineering | **Not done** |
| 12 | **Remove or qualify the residual browser-only absolutes** in shared code and hub copy: `PrivacyRoute.ts`, the "Nothing is stored" opener in `parentFaqs`, and the privacy hero variant. | Honesty | Reduces | Engineering | Not done |
| 13 | **Keep the browser route one click away and prominently labelled.** Treat any change that buries it as a change requiring this DPIA to be redone. | Risk 2, Risk 3, proportionality | Preserves the current position | Product | Standing constraint |
| 14 | **Keep publishing the weakness list next to the headline figure**, and keep the regression tests that block bare superlatives about human writing. | Risk 4 | Reduces | Engineering | **Already in place** |
| 15 | **Publish this DPIA**, as the ICO recommends, and provide an objection route. It is a partial substitute for the consultation that was not carried out. | Step 3 gap | Reduces | Owner | Not done |
| 16 | **Obtain legal or DPO review before sign-off**, and record the advice. | Procedural | Required | Owner | **Not done — blocking** |
| 17 | **Confirm the Google Cloud CDPA position and the contracting entity**, and record it. | Step 2.8 | Reduces | Owner | Unverified |
| 18 | **Consider disabling the Cloud Trace API** on the project. It is enabled and log entries carry `traceSampled: true`, but a seven-day query returned no traces. Disabling removes an unmonitored surface. | Hygiene | Hygiene | Engineering | Not done |

---

## Step 7 — Conclusion, residual risk and sign-off

### Residual risk after the measures above

| Risk | Before | After measures 1–18 | Residual |
|---|---|---|---|
| 1 — IP retention against a "not logged" claim | HIGH | LOW | Low, **once measure 1 is proved by measurement** |
| 2 — Third-party personal data in submissions | MEDIUM | MEDIUM | **Medium. Not eliminable.** |
| 3 — Special category data pasted in | MEDIUM–HIGH | MEDIUM | **Medium. Not eliminable.** |
| 4 — Harm from a downstream decision | HIGH | MEDIUM | **Medium. Not eliminable.** |
| 5 — Body reaching a log on an unaudited path | MEDIUM | LOW | Low, contingent on B1 |
| 6 — Silent regression of the logging posture | MEDIUM | LOW | Low |
| 7 — Analytics without consent | MEDIUM | LOW | **Medium. Accepted by the owner, 29 August 2026; not mitigated.** |
| 8 — Re-identification of rate-limit keys | LOW | LOW | Low |
| 9 — Denial of service on the shared cap | LOW | LOW | Low |
| 10 — Transfer security | LOW | LOW | Low |

### The honest conclusion

This is not a DPIA that concludes everything is fine.

**Three residual risks cannot be engineered away, and they should be accepted deliberately or not
at all.**

Risks 2 and 3 are inherent in a free-text box on a public website. Anyone can paste anything, and
some of it will concern other people and some of it will be sensitive. The mitigations are real:
nothing is retained, nothing is linked to an identity, the exposure is seconds of transit and
memory, and a one-click route removes the transmission entirely. They reduce the risk. They do not
remove it. The reason this comes out at medium rather than high is the retention position, which
means the measure at #1 is not a tidy-up but a load-bearing part of the assessment. If IP addresses
continue to be retained alongside submissions, Risks 2 and 3 should be re-graded upwards.

Risk 4 is the one that deserves the most attention, and it is not a security risk at all. The tool
produces a probabilistic assessment of a person's writing, and somebody else may act on it. One
human long-form document in eighty-three is wrongly flagged at the shipped threshold; one human
fiction manuscript in eight. Opace makes no decision, so Article 22 is not engaged, and the fairness
principle in Article 5(1)(a) is. The mitigation is entirely a matter of how honestly the output is
presented, and the current presentation is good — separate axes, the false-positive rate next to
the score, a published weakness list, tests that block bare superlatives. It should be treated as a
control that can regress, not as a solved problem.

**Do we need to consult the ICO?** On the assessment above, no. Prior consultation under Article
36 is required where a high residual risk remains after mitigation, and the residual risks here come
out at medium once the measures are taken. That conclusion depends on measures 1, 3, 4, 5 and 16
actually being done. **If the tool continues to tell visitors their drafts are "neither stored nor
logged" while client IP addresses are retained for 30 days, that judgement does not hold**, because
the risk then includes a published claim that is not true. This is a point for the legal reviewer
to test rather than to accept.

### What blocks sign-off

Cleared on 29 August 2026:

1. ~~Measure 1 — the request-log exclusion must be made to work and **proved by reading the logs
   back**~~. The exclusion was already suppressing the detector's request log; the gap was the
   second Cloud Run service, and the fragility was a deploy script that could not update an
   existing exclusion. Both closed, and proved against fresh traffic with a probe shown able to
   return rows when the time bound is removed.
2. ~~Measure 3 — the "neither stored nor logged" copy must change~~. Changed and deployed on the
   website. **Still outstanding for two files owned by another workstream:**
   `implementation/DESCRIPTIONS.md:7` — the mandatory footer that propagates to every listing — and
   `implementation/README.md:311`. Neither may be published in its current form.
3. ~~Measure 5 — the sensitive-document warning~~. Added next to the route selector on the checker
   page.
4. ~~Measure 10 — a decision on the analytics consent position~~. Decided on 29 August 2026: not
   gated, on the tool pages or site-wide. Recorded at Risk 7 as an owner decision. The privacy
   policy row for `opace-cookies-acknowledged` still describes a control that is not rendered and
   should be corrected.

Still blocking:

5. Measure 16 — legal or DPO review. Nothing here has been seen by a solicitor.
6. B1's extended logging probe, which Risk 5 is contingent on.
7. The privacy policy itself. The drafted replacement sections exist in
   `LAWFUL-BASIS-AND-TRANSPARENCY.md` §6.1 and are **not published**; the owner publishes them.
8. The owner decisions in §8 of that document: retention period, naming Google Cloud publicly, DPO
   details, the pre-exclusion log residue, review date and sign-off.

### Sign-off

| | |
|---|---|
| **Prepared by** | Engineering, 29 August 2026 |
| **DPO advice sought** | **No. Whether a DPO is appointed is unverified.** |
| **Legal review** | **None.** |
| **Reviewed by** | *not yet* |
| **Approved by** | *not yet* |
| **Date of approval** | *not yet* |
| **Residual risk accepted** | *not yet* |
| **ICO consultation required** | Assessed as no, conditional on the blocking measures above |
| **Review date** | **Owner decision. Recommendation: 12 months, or immediately on any of the triggers below.** |

### Triggers that require this DPIA to be redone rather than reviewed

- The browser route stops being a one-click alternative, or the server route stops being
  optional.
- Any retention of submitted text is introduced, for any purpose, including model improvement.
- Any account, sign-in or identity linkage is added.
- The processing region changes, or a non-EEA processor enters the path.
- The tool starts making or recommending a decision about a person rather than reporting a
  probability.
- The threshold, the model or the segmentation contract changes in a way that materially moves the
  measured false-positive rates.
- Uploaded files begin to be processed anywhere other than in the browser.
