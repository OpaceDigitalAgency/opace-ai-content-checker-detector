"""Cloud Function on the detector-killswitch Pub/Sub topic.

Two things publish to that topic: the Cloud Monitoring alert on request rate
(fast, minutes) and the Cloud Billing budget (slow, hours). Either one means
the same thing — take the detector off the internet now, ask questions later.

It does exactly what disable-service.sh does, via the API rather than gcloud,
because a Cloud Function has no gcloud binary. Nothing is deleted: the service,
its revision and its URL all survive, so enable-service.sh puts it straight
back. Visitors are not stranded — the website falls back to the in-browser
model, which is the whole point of having built one.

Deliberately not idempotent-checked: re-disabling an already-disabled service
is harmless, and a guard would be one more thing to get wrong under load.
"""
import base64
import json
import os

import google.auth
from google.auth.transport.requests import AuthorizedSession

PROJECT = os.environ.get("PROJECT", "opace-ai-detector")
REGION = os.environ.get("REGION", "europe-west1")
SERVICE = os.environ.get("SERVICE", "opace-detector")

_BASE = f"https://run.googleapis.com/v2/projects/{PROJECT}/locations/{REGION}/services/{SERVICE}"


def _session():
    creds, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    return AuthorizedSession(creds)


def _revoke_public_access(session):
    """Remove allUsers/run.invoker. The durable half, and the SLOW one.

    Measured 29 August 2026 with ingress deliberately left open: the endpoint
    kept serving unauthenticated requests for 83.68 seconds after this binding
    was removed. _close_ingress below is what takes effect in seconds. Both
    run; neither is redundant.
    """
    # v2 getIamPolicy is a GET; setIamPolicy is a POST. Posting to the former
    # returns an HTML error page, and .json() then dies on "<" — which is
    # exactly how this failed the first time it was tested for real.
    resp = session.get(f"{_BASE}:getIamPolicy")
    resp.raise_for_status()
    policy = resp.json()
    bindings = [
        b
        for b in policy.get("bindings", [])
        if not (b.get("role") == "roles/run.invoker" and "allUsers" in b.get("members", []))
    ]
    if bindings == policy.get("bindings", []):
        return "public access was already revoked"
    policy["bindings"] = bindings
    session.post(f"{_BASE}:setIamPolicy", json={"policy": policy}).raise_for_status()
    return "revoked allUsers invoker binding"


def _close_ingress(session):
    """The fast half. This is what actually stops a flood.

    Measured 29 August 2026: 4.77 seconds from Pub/Sub publish to the first
    non-200, including a cold start of this function. It also stops an IAM
    binding restored from elsewhere from silently reopening the service.
    """
    session.patch(
        f"{_BASE}?updateMask=ingress",
        json={"ingress": "INGRESS_TRAFFIC_INTERNAL_ONLY"},
    ).raise_for_status()
    return "ingress closed to internal-only"


def _should_fire(payload: dict) -> tuple[bool, str]:
    """Decide whether this message is an actual emergency.

    This function exists because the naive version — treat every message as a
    kill order — took the service down in production within an hour of being
    wired up. Two message sources publish to this topic and BOTH send routine
    traffic that means nothing is wrong:

      * Cloud Billing budgets publish on EVERY update, several times a day,
        carrying the current spend even when it is zero. Only a message with
        `alertThresholdExceeded` or `forecastThresholdExceeded` set is a real
        breach; a bare cost report is routine.
      * Cloud Monitoring sends an incident when it OPENS and again when it
        CLOSES. A closed incident means the flood is over, which is the
        opposite of a reason to shut the door.

    Anything unrecognised fires, deliberately: an unparseable message on a
    channel whose only job is emergencies is more likely to be a malformed
    alarm than routine chatter, and the cost of a false shutdown (visitors get
    the in-browser model) is far below the cost of a missed one.
    """
    if "budgetDisplayName" in payload:
        exceeded = payload.get("alertThresholdExceeded")
        forecast = payload.get("forecastThresholdExceeded")
        if exceeded is None and forecast is None:
            cost = payload.get("costAmount")
            budget = payload.get("budgetAmount")
            return False, f"routine budget report, no threshold breached (cost {cost} of {budget})"
        which = "actual" if exceeded is not None else "forecast"
        return True, f"budget {which} threshold {exceeded or forecast} breached on {payload['budgetDisplayName']}"

    incident = payload.get("incident")
    if isinstance(incident, dict):
        state = incident.get("state")
        if state and state != "open":
            return False, f"monitoring incident is {state}, not open"
        return True, incident.get("condition_name") or "monitoring incident opened"

    return True, "unrecognised message on the killswitch topic, firing to be safe"


def kill(event, context):  # noqa: ARG001 - signature fixed by the runtime
    try:
        payload = json.loads(base64.b64decode(event["data"]).decode())
    except Exception:
        payload = {}

    fire, reason = _should_fire(payload)
    if not fire:
        print(json.dumps({"severity": "INFO", "action": "ignored", "reason": reason}))
        return "ignored"

    session = _session()
    actions = [_revoke_public_access(session), _close_ingress(session)]
    print(json.dumps({"severity": "CRITICAL", "trigger": reason, "actions": actions}))
    return "disabled"
