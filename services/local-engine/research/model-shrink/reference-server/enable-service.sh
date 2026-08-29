#!/usr/bin/env bash
# Undo disable-service.sh. Two commands, in the reverse order.
#
#   ./enable-service.sh                 re-enable
#   ./enable-service.sh --dry-run       show what it would do
#
# Do not run this until you know why the service was disabled. If it was a
# flood, re-enabling into the same flood produces the same bill. The safe
# sequence is: read the logs, tighten whatever let it through (the per-client
# limits and GLOBAL_DAILY_INFERENCES are env vars, so they can be changed
# without a rebuild), then re-enable.
#
# To reopen with a tighter cap in the same breath:
#   gcloud run services update opace-detector --region europe-west1 \
#     --update-env-vars GLOBAL_DAILY_INFERENCES=3000,INF_PER_DAY=200
#   ./enable-service.sh
set -euo pipefail

PROJECT="${PROJECT:-opace-ai-detector}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-opace-detector}"

DRY=""
[[ "${1:-}" == "--dry-run" ]] && DRY="echo [dry-run]"
run() { $DRY "$@"; }

echo "Re-enabling ${SERVICE} in ${REGION} (${PROJECT})"

run gcloud run services update "$SERVICE" \
  --region "$REGION" --project "$PROJECT" \
  --ingress all --quiet

run gcloud run services add-iam-policy-binding "$SERVICE" \
  --region "$REGION" --project "$PROJECT" \
  --member="allUsers" --role="roles/run.invoker" --quiet

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" \
  --project "$PROJECT" --format='value(status.url)' 2>/dev/null || echo UNKNOWN)"

echo
echo "Enabled: $URL"
echo "Confirm it is actually serving before walking away:"
echo "  curl -s ${URL}/v1/health"
echo "  curl -s ${URL}/v1/status | python3 -m json.tool"
echo
echo "The global daily counter is NOT reset by this. If the flood consumed"
echo "today's allowance, real visitors get the in-browser offer until 00:00"
echo "UTC. To clear it deliberately:"
echo "  gcloud firestore documents delete \\"
echo "    'projects/${PROJECT}/databases/(default)/documents/detector_quota/day-\$(date -u +%F)'"
