#!/usr/bin/env bash
# Build and deploy the hardened detector to Cloud Run.
#
# This script does not deploy on its own initiative: run it deliberately. It is
# idempotent — every step either creates a resource or confirms it exists.
#
#   ./deploy.sh                 build and deploy
#   ./deploy.sh --dry-run       print every command without running one
#
# Prerequisites, once per machine:
#   gcloud auth login
#   gcloud config set project opace-ai-detector
#
# Read SECURITY.md before changing any limit below. The numbers are not
# arbitrary: they are what keeps the worst case inside the free tier.
set -euo pipefail

PROJECT="${PROJECT:-opace-ai-detector}"
REGION="${REGION:-europe-west1}"          # Belgium: EU adequacy, no transfer paperwork
SERVICE="${SERVICE:-opace-detector}"
REPO="${REPO:-opace}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/detector"
SITE_ORIGIN="${SITE_ORIGIN:-https://opace.agency}"
SECRET_NAME="${SECRET_NAME:-detector-token-secret}"

# --- the limits. Each one is justified in SECURITY.md; change them together. --
GLOBAL_DAILY_INFERENCES="${GLOBAL_DAILY_INFERENCES:-12000}"
MAX_WORDS="${MAX_WORDS:-8000}"
MAX_CHARS="${MAX_CHARS:-100000}"
REQ_PER_MINUTE="${REQ_PER_MINUTE:-5}"
REQ_PER_HOUR="${REQ_PER_HOUR:-30}"
REQ_PER_DAY="${REQ_PER_DAY:-100}"
INF_PER_MINUTE="${INF_PER_MINUTE:-20}"
INF_PER_HOUR="${INF_PER_HOUR:-150}"
INF_PER_DAY="${INF_PER_DAY:-500}"
POW_BITS="${POW_BITS:-14}"
# 1, not 2. This is the deployed value and it must stay the default, because it
# is the only hard ceiling on concurrent CPU and memory spend and it feeds the
# budget chain directly: MAX_INSTANCES is passed BOTH as --max-instances and as
# an env var the global pacing arithmetic reads, so raising it raises the worst
# case in two places at once. The budget alert is not theoretical — it fired at
# its 0.9 threshold on 29 August 2026 and the kill switch closed the detector
# for 24 seconds. A default of 2 silently doubles the ceiling for anyone who
# runs this script unmodified, and the symptom would not be a failed deploy but
# an outage later, which is the worst way to discover it. Raise it only
# together with the budget and the figures in SECURITY.md §6.
MAX_INSTANCES="${MAX_INSTANCES:-1}"
CONCURRENCY="${CONCURRENCY:-3}"

DRY=""
[[ "${1:-}" == "--dry-run" ]] && DRY="echo [dry-run]"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
run() { $DRY "$@"; }

# --- 0. Sanity ---------------------------------------------------------------
say "Checking the build context"
for f in app.py segments.py Dockerfile requirements.txt; do
  [[ -f "$f" ]] || { echo "missing $f — run this from reference-server/"; exit 1; }
done
[[ -f model/tier3-cycle2-e5small-fp32.onnx ]] || {
  echo "model/tier3-cycle2-e5small-fp32.onnx is absent."
  echo "Copy it from ../../models/ and the tokenizer from"
  echo "../../cycle2-train/cycle2-checkpoint/ before building."; exit 1; }

say "Running the segmentation parity tests"
# If these fail, the server scores documents differently from the browser and
# must not be deployed. This is the one gate that blocks the build.
# Since segments-v2 the rule is expressed in measured WordPiece tokens, so the
# tests load the real tokeniser: `transformers` must be importable here, not
# only inside the container. PYTHON overrides the interpreter if the local
# default lacks it (e.g. PYTHON=./.venv/bin/python ./deploy.sh).
run "${PYTHON:-python3}" test_segments.py
# The md-strip-v1 input-normalisation contract must also hold, for the same
# reason: if the two ends strip differently, the same paste scores differently
# per route.
run "${PYTHON:-python3}" test_normalise.py

# --- 1. APIs -----------------------------------------------------------------
say "Enabling APIs (no-op if already enabled)"
run gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT"

# --- 2. Firestore, which holds the global daily cap --------------------------
say "Ensuring the Firestore database exists"
# Native mode, not Datastore mode: Native gives a server-side atomic Increment,
# so two instances updating the counter at once cannot lose each other's
# writes, with no transaction and no retry loop. Same region as the service, so
# the counter update adds a millisecond rather than a round trip to another
# continent. See SECURITY.md §5 for the cost.
if ! gcloud firestore databases describe --database='(default)' \
     --project "$PROJECT" >/dev/null 2>&1; then
  run gcloud firestore databases create \
    --location="$REGION" --type=firestore-native --project "$PROJECT"
else
  echo "already present"
fi

# --- 3. The token signing secret ---------------------------------------------
say "Ensuring the token signing secret exists"
# Must be identical on every instance, or a token minted by one fails on the
# next and every visitor sees an authentication error on their second check.
if ! gcloud secrets describe "$SECRET_NAME" --project "$PROJECT" >/dev/null 2>&1; then
  run bash -c "openssl rand -base64 48 | tr -d '\n' | \
    gcloud secrets create '$SECRET_NAME' --data-file=- --project '$PROJECT'"
else
  echo "already present (rotating it invalidates live tokens for up to 15 minutes)"
fi

RUNTIME_SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)' \
  2>/dev/null || echo PROJECT_NUMBER)-compute@developer.gserviceaccount.com"

say "Granting the runtime service account what it needs"
run gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" --project "$PROJECT"
# datastore.user is the role that covers Firestore reads and writes; there is
# no narrower one that permits Increment.
run gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user" --condition=None

# --- 4. Artifact Registry ----------------------------------------------------
say "Ensuring the container repository exists"
if ! gcloud artifacts repositories describe "$REPO" --location "$REGION" \
     --project "$PROJECT" >/dev/null 2>&1; then
  run gcloud artifacts repositories create "$REPO" \
    --repository-format=docker --location "$REGION" \
    --description="Opace detector images" --project "$PROJECT"
else
  echo "already present"
fi

# --- 5. Build ----------------------------------------------------------------
say "Building the image"
TAG="$(date -u +%Y%m%d-%H%M%S)"
run gcloud builds submit --tag "${IMAGE}:${TAG}" --project "$PROJECT"

# --- 6. Deploy ---------------------------------------------------------------
say "Deploying"
# --max-instances is the only hard ceiling the platform itself offers on
# CPU and memory spend. It does NOT bound the request charge; nothing in
# Cloud Run does. That is what the monitoring kill switch in
# disable-service.sh exists for. SECURITY.md §6 has the arithmetic.
#
# --timeout 60s, up from 30s: an 8,000-word document is about twenty forward
# passes, roughly 5 s of inference, and three of them may be in flight at once
# on a single vCPU — ~16 s worst case, which still leaves margin for a cold
# start inside 60 s.
run gcloud run deploy "$SERVICE" \
  --image "${IMAGE}:${TAG}" \
  --region "$REGION" \
  --project "$PROJECT" \
  --allow-unauthenticated \
  --memory 1Gi --cpu 1 \
  --min-instances 0 \
  --max-instances "$MAX_INSTANCES" \
  --concurrency "$CONCURRENCY" \
  --timeout 60s \
  --cpu-throttling \
  --no-cpu-boost \
  --execution-environment gen2 \
  --ingress all \
  --set-secrets "TOKEN_SECRET=${SECRET_NAME}:latest" \
  --set-env-vars "^;^ALLOWED_ORIGINS=${SITE_ORIGIN};\
QUOTA_BACKEND=firestore;\
QUOTA_PROJECT=${PROJECT};\
GLOBAL_DAILY_INFERENCES=${GLOBAL_DAILY_INFERENCES};\
MAX_INSTANCES=${MAX_INSTANCES};\
MAX_WORDS=${MAX_WORDS};\
MAX_CHARS=${MAX_CHARS};\
REQ_PER_MINUTE=${REQ_PER_MINUTE};\
REQ_PER_HOUR=${REQ_PER_HOUR};\
REQ_PER_DAY=${REQ_PER_DAY};\
INF_PER_MINUTE=${INF_PER_MINUTE};\
INF_PER_HOUR=${INF_PER_HOUR};\
INF_PER_DAY=${INF_PER_DAY};\
POW_BITS=${POW_BITS};\
REQUIRE_ORIGIN=1;\
REQUIRE_BROWSER_UA=1;\
REQUIRE_TOKEN=1;\
TRUST_PROXY_HEADER=x-forwarded-for;\
PROXY_IP_POSITION=last;\
ORT_THREADS=2"

# --- 7. Stop Cloud Run logging the requests themselves -----------------------
say "Excluding this service's request log from Cloud Logging"
# Cloud Run's request log records method, URL, status, latency, user agent and
# the full client IP. It never contains a request body — and this service never
# puts text in a URL, so there is nothing to leak through it. What the exclusion
# does is stop the IP addresses being retained: it keeps those entries out of the
# _Default bucket, where they would otherwise sit for 30 days. It does not
# scrub, hash or redact anything, and it does not touch entries already written.
#
# Two things this got wrong before and must not get wrong again:
#   - The filter deliberately does NOT pin service_name. Pinning it to the
#     detector left the killswitch function's own request entries, with their
#     own client IPs, being retained. Every Cloud Run service in this project
#     is meant to be covered.
#   - --add-exclusion fails when the exclusion already exists, so a re-run left
#     whatever filter was there before. Update first, add only if absent, so a
#     re-deploy converges on the filter below instead of silently keeping an
#     older one.
#
# An exclusion takes a few minutes to reach the ingestion path. Entries written
# in that window are kept. Do not read the gap as a failure, and do not read the
# exclusion's existence as proof: only an empty read AFTER fresh traffic proves
# it, which is what step 6 below checks.
EXCLUSION_FILTER="resource.type=cloud_run_revision AND logName:requests"
if ! gcloud logging sinks describe _Default --project "$PROJECT" >/dev/null 2>&1; then
  echo "no _Default sink; skipping"
else
  if gcloud logging sinks describe _Default --project "$PROJECT" \
       --format='value(exclusions.name)' 2>/dev/null | grep -qw detector-requests; then
    run gcloud logging sinks update _Default \
      --update-exclusion="name=detector-requests,\
description=No per-request records for any Cloud Run service in this project (removes client IP addresses),\
filter=${EXCLUSION_FILTER}" \
      --project "$PROJECT"
  else
    run gcloud logging sinks update _Default \
      --add-exclusion="name=detector-requests,\
description=No per-request records for any Cloud Run service in this project (removes client IP addresses),\
filter=${EXCLUSION_FILTER}" \
      --project "$PROJECT"
  fi
fi

# --- 8. Verify ---------------------------------------------------------------
say "Verifying"
URL="$(gcloud run services describe "$SERVICE" --region "$REGION" \
  --project "$PROJECT" --format='value(status.url)' 2>/dev/null || echo UNKNOWN)"
echo "Service URL: $URL"
cat <<VERIFY

Checks to run by hand, in this order:

  1. Health, which is ungated:
       curl -s ${URL}/v1/health

  2. The limits the service believes it is running:
       curl -s ${URL}/v1/status | python3 -m json.tool

  3. A scripted client must be refused (expect 403, automation_detected):
       curl -si -X POST ${URL}/v1/check -H 'content-type: application/json' \\
         -H 'origin: ${SITE_ORIGIN}' -d '{"text":"..."}' | head -1

  4. A wrong origin must be refused (expect 403, origin_not_allowed).

  5. From the site itself: challenge, solve, token, check. A 200 must carry
     segment_count, segments[] and segmentation_contract="segments-v3".
     Check that string against SEGMENTATION_CONTRACT in segments.py and in the
     site's segments.ts: the front end REFUSES to score on a mismatch, so this
     is a real gate, not a formality. Do not learn to skim past it.

  6. Confirm no request bodies anywhere in the logs. Search the payload VALUES,
     never --format=json, and always pass --freshness explicitly:

       gcloud logging read \\
         'resource.type=cloud_run_revision AND
          resource.labels.service_name=${SERVICE}' \\
         --limit 1000 --project ${PROJECT} --freshness=30d \\
         --format='value(textPayload,jsonPayload,protoPayload)' > /tmp/payloads.txt
       grep -ci 'textPayload' /tmp/payloads.txt   # expect 0
       grep -ci 'onnxruntime' /tmp/payloads.txt   # expect NON-zero

     Anything other than 0 on a real body string needs explaining before the
     retention claim stands.

     Why it is written this way. The original check piped --format=json into
     grep -ci 'text' and instructed the reader that anything but 0 needed
     explaining. It returned 215 on 31 August 2026 and had returned something
     like it every time it was ever run, because --format=json prints the
     ENVELOPE: every stdout line carries a field literally named "textPayload",
     so the pattern matched the key name on every entry and could never reach 0.
     A check that always fails teaches whoever runs it that failure here is
     noise, which is exactly backwards for the one check standing behind
     docs/legal/LAWFUL-BASIS-AND-TRANSPARENCY.md. Selecting the payload fields
     strips the envelope, so a hit is content rather than schema.

     The second grep is the probe test and is not optional: 'onnxruntime'
     appears in the container's own startup lines, so it MUST return non-zero.
     If both greps return 0 the query is broken, not the service clean.

  6b. Prove the request-log exclusion is actually in force. The exclusion
     existing proves nothing; this failed once precisely because its presence
     was taken as proof. Note the UTC time, send fresh traffic, wait two
     minutes for the exclusion to reach ingestion, then read back:

       date -u +%Y-%m-%dT%H:%M:%SZ
       for i in 1 2 3; do curl -s -o /dev/null ${URL}/v1/health; done
       sleep 120
       gcloud logging read \\
         'resource.type=cloud_run_revision AND logName:requests
          AND timestamp>="PASTE THE TIME PRINTED ABOVE"' \\
         --project ${PROJECT} --limit 100 --freshness=90d \\
         --format='value(timestamp)'

     This must print nothing. If it prints rows, client IP addresses are being
     retained for 30 days and the privacy copy on the checker page is untrue.

     PASS --freshness EXPLICITLY, as above. gcloud applies --freshness=1d by
     default, and it applies it EVEN WHEN the filter carries its own timestamp
     clause. On 31 August 2026 the bare query returned 0 rows and looked like a
     clean pass; at --freshness=30d the same query returned the 90-entry
     residue that has been there since 29 August. The default silently bounds
     the window to one day and answers in the reassuring direction.

     Prove the probe before trusting the silence. Run the same read with the
     timestamp line removed: it should return the older entries written before
     the exclusion took effect. A query that returns nothing either way is
     broken and proves nothing.

     Do not treat "the app logged nothing" as the control. On a warm container
     a health ping produces no application log line at all, so an empty read
     proves nothing on its own. The only sound control is the pre-exclusion
     residue: it proves this query DOES surface request logs when they exist.
     Evidence the traffic happened is the HTTP 200s, not a log entry.

     Expect a handful of caller IPs in cloudaudit.googleapis.com/activity after
     any deploy. Those are the OPERATOR's own gcloud calls — principalEmail is
     a human account, and --allow-unauthenticated records a SetIamPolicy there
     re-asserting the identical public-invoker binding. They are admin action
     records, not visitor records, and they do not bear on the retention claim.
     Check principalEmail before raising an alarm.

  7. The fast trigger can actually publish. This one is not optional and it is
     the check that was missing until 29 August 2026, when the alert policy was
     found unable to deliver to the topic for four months of its existence:

       gcloud pubsub topics get-iam-policy detector-killswitch \
         --project ${PROJECT}

     The Cloud Monitoring notification service agent
     service-<PROJECT_NUMBER>@gcp-sa-monitoring-notification.iam.gserviceaccount.com
     must hold roles/pubsub.publisher on the topic. The billing agent
     billing-budget-alert@system.gserviceaccount.com must hold it too. Neither
     implies the other, and roles/monitoring.notificationServiceAgent does NOT
     include pubsub.topics.publish. If the monitoring agent is missing:

       gcloud pubsub topics add-iam-policy-binding detector-killswitch \
         --project ${PROJECT} --role=roles/pubsub.publisher \
         --member=serviceAccount:service-<PROJECT_NUMBER>@gcp-sa-monitoring-notification.iam.gserviceaccount.com

  8. Fire the switch through the trigger, not from halfway along it. Publishing
     to the topic by hand proves Pub/Sub onwards and skips the hop that broke.
     Clone the alert policy onto a condition you can satisfy cheaply — a
     conditionMatchedLog on a throwaway log name, tripped with one
     'gcloud logging write' — point the clone at the SAME notification channel,
     let it fire, confirm the endpoint goes down, run ./enable-service.sh, then
     delete the clone and confirm the production policy is untouched.

Then set the budget and the fast kill switch — see SECURITY.md §6 and
disable-service.sh. The deploy is not finished until those exist.
VERIFY
