from __future__ import annotations

import hmac
import json
import secrets
import threading
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from .contracts import CONTRACT_VERSION, SCHEMA_VERSION

PIPELINE_STATES = ("accepted", "validating", "protecting", "generating", "gating", "scoring", "ready_for_review")
TERMINAL_STATES = frozenset({"cancelled", "failed", "approved", "completed_without_approval", "interrupted"})
LEGAL_TRANSITIONS = {
    state: frozenset({PIPELINE_STATES[index + 1], "cancelling", "failed", "interrupted"})
    for index, state in enumerate(PIPELINE_STATES[:-1])
}
LEGAL_TRANSITIONS["ready_for_review"] = frozenset({"approved", "completed_without_approval", "cancelling", "failed", "interrupted"})
LEGAL_TRANSITIONS["cancelling"] = frozenset({"cancelled"})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class JobStore:
    def __init__(self, maximum: int = 32):
        self.maximum = maximum
        self._lock = threading.RLock()
        self._jobs: dict[str, dict[str, Any]] = {}
        self._payloads: dict[str, dict[str, Any]] = {}
        self._idempotency: dict[str, tuple[str, str]] = {}
        self._idempotency_salt = secrets.token_bytes(32)
        self._active = threading.Semaphore(1)

    def create(self, request: dict[str, Any], key: str) -> tuple[dict[str, Any], bool]:
        digest = hmac.digest(self._idempotency_salt, json.dumps(request, sort_keys=True, separators=(",", ":")).encode(), "sha256").hex()
        with self._lock:
            previous = self._idempotency.get(key)
            if previous:
                if previous[0] != digest:
                    raise ValueError("idempotency_conflict")
                return deepcopy(self._jobs[previous[1]]), False
            if len(self._jobs) >= self.maximum:
                raise RuntimeError("job_capacity_exceeded")
            job_id = "job_" + secrets.token_hex(12)
            timestamp = _now()
            job = {"schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "job_id": job_id, "request_id": request["request_id"], "state": "accepted", "transitions": [{"state": "accepted", "at": timestamp, "attempt": 1, "message": "Job accepted."}], "candidates": [], "created_at": timestamp, "updated_at": timestamp}
            self._jobs[job_id] = job
            self._payloads[job_id] = deepcopy(request)
            self._idempotency[key] = (digest, job_id)
        threading.Thread(target=self._run, args=(job_id,), daemon=True, name="oaci-job").start()
        return deepcopy(job), True

    def _transition(self, job_id: str, state: str, message: str, error: dict[str, Any] | None = None) -> bool:
        with self._lock:
            job = self._jobs[job_id]
            if state not in LEGAL_TRANSITIONS.get(job["state"], frozenset()):
                return False
            timestamp = _now()
            job["state"] = state
            job["updated_at"] = timestamp
            job["transitions"].append({"state": state, "at": timestamp, "attempt": 1, "message": message})
            if error:
                job["error"] = error
            return True

    def _run(self, job_id: str) -> None:
        with self._active:
            with self._lock:
                if self._jobs[job_id]["state"] == "cancelling":
                    self._transition(job_id, "cancelled", "Job cancelled before processing.")
                    return
            if not self._transition(job_id, "validating", "Request validated."):
                return
            if not self._transition(job_id, "protecting", "Protected span policy checked."):
                return
            self._transition(job_id, "failed", "No approved local rewrite model is configured.", {"code": "model_unavailable", "message": "No approved local rewrite model is configured.", "retryable": False})
            with self._lock:
                self._payloads.pop(job_id, None)

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            value = self._jobs.get(job_id)
            return deepcopy(value) if value else None

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            if job_id not in self._jobs:
                return False
            if self._jobs[job_id]["state"] in TERMINAL_STATES:
                return True
            self._transition(job_id, "cancelling", "Cancellation requested.")
            self._transition(job_id, "cancelled", "Job cancelled.")
            self._payloads.pop(job_id, None)
            return True

    def delete_payload(self, job_id: str) -> bool:
        with self._lock:
            if job_id not in self._jobs:
                return False
            self._payloads.pop(job_id, None)
            return True

    def event_data(self, job_id: str) -> list[dict[str, Any]] | None:
        job = self.get(job_id)
        if not job:
            return None
        return [{"job_id": job_id, **transition} for transition in job["transitions"]]

    def shutdown(self) -> None:
        with self._lock:
            for job_id, job in self._jobs.items():
                if job["state"] not in TERMINAL_STATES:
                    self._transition(job_id, "interrupted", "Service shutdown interrupted the job.")
            self._payloads.clear()
