#!/usr/bin/env bash
# THE KILL SWITCH. Makes the detector unreachable from the internet in one
# call, without deleting anything.
#
#   ./disable-service.sh                 disable now
#   ./disable-service.sh --dry-run       show what it would do
#   ./enable-service.sh                  put it back
#
# Why this and not something else:
#   * Deleting the service throws away the revision and the URL. Recovery then
#     means a rebuild, and under pressure that is when mistakes happen.
#   * --max-instances 0 is not a thing in Cloud Run; 0 means "platform
#     default", which is the opposite of what is wanted.
#   * Removing the allUsers invoker binding takes effect within seconds, costs
#     nothing, and is exactly reversible. Setting ingress to internal-only is
#     belt and braces in case an IAM binding is restored from elsewhere.
#
# After this runs the endpoint returns 403 to everyone. The website's checker
# treats that as "server unavailable" and offers the in-browser model, which is
# the whole point of the fallback contract: the tool degrades, it does not
# break. Nobody loses the ability to check their text.
#
# This script is safe to run from a Cloud Function triggered by a budget alert
# or a Cloud Monitoring alert. It needs roles/run.admin on the service.
set -euo pipefail

PROJECT="${PROJECT:-opace-ai-detector}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-opace-detector}"

DRY=""
[[ "${1:-}" == "--dry-run" ]] && DRY="echo [dry-run]"
run() { $DRY "$@"; }

echo "Disabling ${SERVICE} in ${REGION} (${PROJECT})"

# 1. Revoke public access. This is the one that matters and it is immediate.
run gcloud run services remove-iam-policy-binding "$SERVICE" \
  --region "$REGION" --project "$PROJECT" \
  --member="allUsers" --role="roles/run.invoker" \
  --quiet || echo "binding already absent"

# 2. Close ingress as well, so a restored IAM binding does not silently
#    reopen it. Traffic from outside the VPC is refused at the front door,
#    before an instance is started, so it cannot cost anything.
run gcloud run services update "$SERVICE" \
  --region "$REGION" --project "$PROJECT" \
  --ingress internal --quiet

echo
echo "Disabled. The service is unreachable and cannot accrue cost."
echo "The website will now offer visitors the in-browser model instead."
echo "Re-enable with: ./enable-service.sh"
echo
echo "Before re-enabling, find out what happened:"
echo "  gcloud logging read 'resource.type=cloud_run_revision AND" \
     "resource.labels.service_name=${SERVICE} AND severity>=WARNING'" \
     "--limit 50 --project ${PROJECT}"
echo "  gcloud monitoring dashboards list --project ${PROJECT}"
