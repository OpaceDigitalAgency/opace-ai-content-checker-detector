# Deploying the AI detector to Google Cloud Run — step by step

**Superseding live update — 29 August 2026.** A £50 monthly enforced spend cap is configured for
project `opace-ai-detector` and service `Cloud Run` (budget
`3b89c8af-bd1c-434f-8cab-3e0d14491e71`, status `Configured`). The £10 kill-switch budget remains.
Service and revision maximums are 1 on `opace-detector-00005-284`, which serves 100% of traffic
and passed `/v1/health`. Older “no spend cap exists” and revision references below are historical.
**Both the kill-switch and zero-body-logging drills were re-run on `00005-284` on 29 August 2026
and both passed**; the kill switch was fired from a temporary Cloud Monitoring alert policy through
the production notification channel, not by hand-publishing to the topic.

> ### Verifying the spend cap: use the console, never the API
>
> `gcloud billing budgets list` and the Budgets REST API (`v1` and `v1beta1`) **do not return the
> spend-cap budget at all** — not a missing field, the whole budget is absent. Queried against
> billing account `01F02F-6F4D5B-0B8D7C` on 29 August 2026, all three return only the £20
> account-wide alert and the £10 detector budget. Two sessions read that as "no spend cap exists"
> and both were wrong.
>
> **Check the Cloud Billing console → Budgets & alerts and read the "Spend cap status" column.**
> The cap shows `Configured`; the two alert-only budgets show `Not applicable`.
>
> Same spirit as the log-exclusion rule, opposite mechanism: there, an empty query only counts as
> proof once fresh traffic has been generated; here, an empty listing is not proof at all, because
> the interface cannot see the thing being asked about.

**What this gives you:** visitors paste text and get a result immediately, with no 34 MB
download. Expected cost at your traffic: **£0/month** (inside Google's free tier up to
roughly 10,000 checks a day). Optional £9/month later if cold starts become noticeable.

**What you do:** the parts needing your Google account and card details (steps 1–3).
**What I do:** everything else, once you tell me step 3 is done.

## Setup status — 29 August 2026

- Google account: `david.opace@gmail.com`
- Project name and Project ID: `opace-ai-detector`
- Project number: `877422072168`
- Billing: linked to the existing `OPACE` billing account; no new payment details were entered
- Cloud Run Admin API (`run.googleapis.com`): enabled and verified
- Artifact Registry API (`artifactregistry.googleapis.com`): enabled and verified

**Deployed and verified on 29 August 2026.** All steps below are complete. The running service
was checked on that date: `https://opace-detector-877422072168.europe-west1.run.app`, revision
`opace-detector-00003-bfq` at 100% of traffic, `GET /v1/health` returning
`{"ok":true,"model":"tier3-cycle2","precision":"fp32","model_build":"e313ab00de1fffd2","threads":2,"segmentation_contract":"segments-v1"}`.
The kill switch was fired and round-tripped (health 200 → 404 after `disable-service.sh`, back to
200 after `enable-service.sh`).

The URL and revision identifier change on redeploy, so treat both as dated observations rather
than fixed identifiers; `GET /v1/health` is the check to re-run. The steps below are kept as the
reproducible record of how the service was stood up.

---

## Before you start

You need: a Google account, a payment card (for identity verification — you will not be
charged inside the free tier), and about 20 minutes.

A note on the card: Google requires one to prevent abuse, but Cloud Run's free tier is
genuinely free, not a trial. At 10,000 checks a day you would use about two thirds of it.
In step 6 we set a hard instance cap so a traffic spike cannot produce a surprise bill.

---

## Step 1 — Create the project

1. Go to https://console.cloud.google.com and sign in.
2. Accept the terms if prompted.
3. Click the project dropdown at the top, then **New Project**.
4. Name it `opace-ai-detector`. Leave the organisation as-is.
5. Click **Create**, then select the project once it appears.

**Write down the Project ID** shown on the dashboard — it may differ from the name, for
example `opace-ai-detector-451203`. I need this exact string.

## Step 2 — Enable billing

1. Left menu → **Billing**.
2. **Link a billing account** → **Create billing account** if you have none.
3. Enter your details and card. You may see a small temporary authorisation that is
   refunded.
4. Confirm the project shows a linked billing account.

Nothing is charged yet. Cloud Run bills only beyond the free tier, and step 6 caps it.

## Step 3 — Enable the two services we need

1. Left menu → **APIs & Services** → **Enable APIs and services**.
2. Search **Cloud Run Admin API** → **Enable**.
3. Search **Artifact Registry API** → **Enable**.

**Then tell me the Project ID and that step 3 is done.** I take over from here.

---

## Steps 4–8 — what I do (recorded so you can audit or repeat it)

### Step 4 — Install and authenticate the CLI
```
brew install --cask google-cloud-sdk        # if not already present
gcloud auth login                            # opens your browser, you approve once
gcloud config set project YOUR_PROJECT_ID
```
The browser approval is the one moment you may need to click.

### Step 5 — Build and push the container
The service is already written and tested at
`implementation/services/local-engine/research/model-shrink/reference-server/`
(FastAPI, the fp32 model baked into the image, non-root user, access logging off).

```
gcloud builds submit --tag europe-west1-docker.pkg.dev/PROJECT/opace/detector
```
Region **europe-west1** (Belgium) is chosen for UK GDPR: EU hosting is adequacy-covered,
so no international transfer paperwork is needed.

### Step 6 — Deploy with a spend ceiling
```
gcloud run deploy opace-detector \
  --image europe-west1-docker.pkg.dev/PROJECT/opace/detector \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi --cpu 1 \
  --min-instances 0 \            # scale to zero: no traffic, no cost
  --max-instances 1 \            # bounds CPU, memory AND the request charge
  --concurrency 3 \
  --timeout 60s
```
`--min-instances 0` is what makes it free.

These are the settings **actually in force** on `opace-detector-00005-284`, read back from
`gcloud run services describe` on 29 August 2026. All four differed from what this block used to
say (2Gi, max-instances 3, concurrency 4, timeout 30s), and every one of those was looser than
reality.

**Correction, 29 August 2026 — `--max-instances` DOES bound the bill.** This block previously said
it bounds CPU and memory "and nothing else", that Cloud Run offers no ceiling on request count, and
that a flood costs roughly **£519**. All three were wrong. Requests are billed only once they reach
a container, and requests beyond `instances × concurrency` are queued then refused with a 429 at
Cloud Run's front end without starting one — so they cost nothing on any line. The bound is
`(instances × concurrency) ÷ mean service time`.

The defensible figure is the compute-and-memory floor: **about £51/month at `--max-instances 1`**,
which is in force, and £106 at 2. The £519 rested on an unmeasured 500 requests/second, omitted
egress, and converted from USD when the billing account bills in **GBP**, so Google's GBP SKU
prices apply. Google warns it may exceed the instance maximum during sudden spikes, so treat £51 as
a strong bound rather than a guarantee.

**Three controls, and they are not interchangeable.** `--max-instances` is the structural bound;
the **£50 spend cap** is a Google-enforced pause acting on recorded spend, usually within 24 hours;
the **kill switch** is the fast reactive one, with a delivery leg measured at 44–88 s across three
fires. Do not call any one of them "the £50 ceiling".

**What a tripped spend cap leaves behind.** New usage of the service is blocked, in-flight requests
complete and are billed, the service returns **5xx**, enforcement is not instant and overages are
billed as normal, and the block is lifted **only** when a human edits the budget and selects "Lift
spend cap" — after which services "might take up to one hour to fully resume". So an attacker who
drives £50 of recorded spend takes the server route offline for the rest of the calendar month
until someone lifts it by hand, where the kill switch restores in seconds. Acceptable at this
budget given the unlimited in-browser fallback, but it is a trade and not pure upside.

The ceiling is delivered by the **kill switch**, built and tested on 29 August
2026: a Cloud Monitoring alert and a billing-budget alert both publish to the
Pub/Sub topic `detector-killswitch`, and the `detector-killswitch` Cloud
Function revokes public invoker access and closes ingress. Verified end to end —
publish to the topic, health returns 404 within 10 seconds, `enable-service.sh`
restores it. The arithmetic and the two failed test attempts are in
`implementation/services/local-engine/research/model-shrink/reference-server/SECURITY.md`
§6.2 and §6.3.

### Step 7 — Lock it to your site
CORS restricted to `https://opace.agency`, request size capped, and per-IP rate limiting
using peppered in-memory hashing (a plain hash of an IP address can be reversed by
enumeration, so it is peppered).

### Step 8 — Point the checker at it
The site calls the endpoint by default; the existing local-download option remains for
anyone who prefers nothing to leave their browser. If the endpoint is unreachable the
tool offers the local route rather than failing, and if neither runs it says plainly that
no AI assessment was made.

---

## The honest trade-off, which must be published

Today the checker says your text never leaves your browser. With hosted inference that
stops being true by default, and the claim must be changed everywhere it appears —
including future plugin and extension listings.

What actually happens: only the text needed for scoring is transmitted, over HTTPS, and
it is not stored or logged. Because the model reads a bounded window per segment, data
minimisation is a property of the architecture rather than a promise.

For UK GDPR the lawful basis is legitimate interests, not consent — the ICO warns against
consent gates that offer no real choice. Two things need doing before launch:
1. A DPIA is advisable (three ICO indicators combine here).
2. Audit the whole stack for incidental logging of request bodies. The zero-retention
   claim is only worth making if it has been verified end to end.

Draft privacy wording is in
`services/local-engine/research/model-shrink/SERVER-INFERENCE-PLAN.md`.

---

## If you would rather not use Google

- **Netlify Functions** — free at your traffic and you are already there, but two
  undocumented limits sit in the path: whether the ONNX native binaries run on their
  Lambda architecture, and the bundle ceiling with a 34 MB model inside. Only a test
  deploy settles it. Worth 30 minutes since failure costs nothing.
- **Hetzner CX23** — about £4.70/month flat, no free tier, no surprises, more setup.
- **Do nothing** — keep the browser download. It works today and costs nothing, but most
  visitors will not complete a 34 MB download.
