# Deploying the AI detector to Google Cloud Run — step by step

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
  --memory 2Gi --cpu 1 \
  --min-instances 0 \            # scale to zero: no traffic, no cost
  --max-instances 3 \            # bounds CPU and memory only — NOT the bill
  --concurrency 4 \
  --timeout 30s
```
`--min-instances 0` is what makes it free.

**`--max-instances` is NOT the spend cap.** It bounds concurrent CPU and memory
and nothing else. Cloud Run offers no ceiling on request count, and requests are
the largest line on the bill: a month-long flood pinning two instances costs
roughly **£519 even with every request rejected**, and about **£257** at one
instance. No combination of Cloud Run settings delivers the £50 ceiling.

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
