from __future__ import annotations

import hmac
import hashlib
import json
import re
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Any

from .contracts import CONTRACT_VERSION, SCHEMA_VERSION, ContractError, validate
from .checker_result import compose_checker_result
from .cycle5_model import Cycle5LocalModel, InputOutsideModelBounds, ModelUnavailable
from .deterministic import capabilities, inspect
from .jobs import JobStore
from .receipts import verify_receipt

MAX_BODY = 250_000
JOB_RE = re.compile(r"^/v1/jobs/([A-Za-z0-9._:-]{8,80})(/events|/payload)?$")
MODEL_RE = re.compile(r"^/v1/admin/models/([A-Za-z0-9._-]+)$")


@dataclass(frozen=True)
class AppConfig:
    run_token: str
    admin_token: str
    port: int = 8741
    allowed_origins: tuple[str, ...] = ()
    model_directory: str | None = None


class ApiProblem(Exception):
    def __init__(self, status: int, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.status, self.code, self.retryable = status, code, retryable


class LocalApp:
    def __init__(self, config: AppConfig, jobs: JobStore | None = None, model=None):
        if len(config.run_token) < 16 or len(config.admin_token) < 16 or hmac.compare_digest(config.run_token, config.admin_token):
            raise ValueError("distinct_tokens_of_at_least_16_characters_required")
        self.config = AppConfig(run_token="", admin_token="", port=config.port, allowed_origins=config.allowed_origins, model_directory=config.model_directory)
        self._token_salt = secrets.token_bytes(32)
        self._run_token_hash = hmac.digest(self._token_salt, config.run_token.encode(), "sha256")
        self._admin_token_hash = hmac.digest(self._token_salt, config.admin_token.encode(), "sha256")
        self._auth_lock = threading.Lock()
        self._auth_failures: dict[str, list[float]] = {}
        self.jobs = jobs or JobStore()
        self.model = model if model is not None else Cycle5LocalModel.load(config.model_directory) if config.model_directory else None

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return
        request_id = "req_" + secrets.token_hex(8)
        try:
            status, headers, body = await self._dispatch(scope, receive, request_id)
        except ContractError as error:
            status, headers, body = self._error(422, error.code, str(error), request_id)
        except ApiProblem as error:
            status, headers, body = self._error(error.status, error.code, str(error), request_id, error.retryable)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            status, headers, body = self._error(400, "invalid_request", "The request was invalid.", request_id)
        except Exception:
            status, headers, body = self._error(500, "internal_error", "The local service could not complete the request.", request_id)
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})

    async def _dispatch(self, scope, receive, request_id: str):
        method, path = scope["method"].upper(), scope.get("path", "")
        header_pairs = [(key.decode("latin1").lower(), value.decode("latin1")) for key, value in scope.get("headers", [])]
        for protected in ("host", "origin", "authorization", "content-length", "accept"):
            if sum(key == protected for key, _value in header_pairs) > 1:
                raise ApiProblem(400, "invalid_request", f"Duplicate {protected} headers are not permitted.")
        headers = dict(header_pairs)
        if headers.get("host") not in {f"127.0.0.1:{self.config.port}", f"localhost:{self.config.port}"}:
            raise ApiProblem(403, "permission_denied", "The Host header is not permitted.")
        origin = headers.get("origin")
        if origin is not None and origin not in self.config.allowed_origins:
            raise ApiProblem(403, "permission_denied", "The Origin header is not permitted.")
        if path == "/health" and method == "GET":
            return self._json(200, {"status": "ok"})
        admin = path.startswith("/v1/admin/")
        client=scope.get("client") or ("local",0);self._authorise(headers.get("authorization"), self._admin_token_hash if admin else self._run_token_hash, str(client[0]))
        if method in {"POST", "PUT", "PATCH"} and headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json" and path not in {"/v1/admin/models/plan", "/v1/admin/models/install"}:
            raise ApiProblem(415, "invalid_request", "Content-Type application/json is required.")
        if method == "GET" and path == "/v1/capabilities":
            value = capabilities()
            value["checker_result"] = {
                "state": "available" if self.model is not None else "not_configured",
                "profile": "full_checker",
                "route": "loopback_engine",
                "model": "tier3-cycle5-v1" if self.model is not None else None,
                "precision": self.model.manifest["model"]["precision"] if self.model is not None else None,
            }
            return self._json(200, value)
        if method == "POST" and path == "/v1/analyses":
            request = await self._json_body(receive)
            validate("analysis-request.schema.json", request)
            if "local_service" not in request["privacy"]["allowed_routes"]:
                raise ApiProblem(403, "route_not_allowed", "The local_service route was not allowed.")
            result = inspect(request)
            validate("analysis-result.schema.json", result)
            return self._json(200, result)
        if method == "POST" and path == "/v1/checker-results":
            accept = headers.get("accept", "application/json")
            if accept not in {"application/json", "application/vnd.opace.checker-result+json;version=1", "*/*"}:
                raise ApiProblem(406, "invalid_request", "Accept a version-1 Opace checker result or application/json.")
            if self.model is None:
                raise ApiProblem(503, "method_not_configured", "No verified Cycle-5 model directory was configured.")
            request = await self._json_body(receive)
            validate("analysis-request.schema.json", request)
            if "local_service" not in request["privacy"]["allowed_routes"]:
                raise ApiProblem(403, "route_not_allowed", "The local_service route was not allowed.")
            if request["source"]["content_type"] == "html":
                raise ApiProblem(422, "invalid_request", "The Cycle-5 raw-input contract accepts plain text or Markdown, not HTML source.")
            try:
                scored = self.model.score(request["source"]["content"])
                result = compose_checker_result(request, scored)
            except InputOutsideModelBounds as error:
                status = 413 if "too_many" in str(error) else 422
                raise ApiProblem(status, "invalid_request", str(error)) from error
            except ModelUnavailable as error:
                raise ApiProblem(503, "method_not_configured", str(error)) from error
            response_type = "application/vnd.opace.checker-result+json;version=1" if accept.startswith("application/vnd.opace.checker-result+json") else "application/json"
            return self._json(200, result, response_type)
        if method == "POST" and path == "/v1/rewrite-jobs":
            request = await self._json_body(receive)
            validate("rewrite-request.schema.json", request)
            if "local_service" not in request["allowed_routes"]:
                raise ApiProblem(403, "route_not_allowed", "The local_service route was not allowed.")
            key = headers.get("idempotency-key", "")
            if not re.fullmatch(r"[A-Za-z0-9._:-]{8,128}", key):
                raise ApiProblem(400, "invalid_request", "A valid Idempotency-Key is required.")
            try:
                job, _created = self.jobs.create(request, key)
            except ValueError:
                raise ApiProblem(409, "invalid_request", "The idempotency key was already used for different input.")
            except RuntimeError:
                raise ApiProblem(429, "rate_limited", "The bounded job capacity was reached.", True)
            return self._json(202, job)
        match = JOB_RE.fullmatch(path)
        if match:
            job_id, suffix = match.groups()
            if method == "GET" and suffix is None:
                job = self.jobs.get(job_id)
                if not job:
                    raise ApiProblem(404, "object_not_found", "The job was not found.")
                return self._json(200, job)
            if method == "DELETE" and suffix is None:
                if not self.jobs.cancel(job_id):
                    raise ApiProblem(404, "object_not_found", "The job was not found.")
                return self._json(202, {"status": "cancelled", "request_id": request_id})
            if method == "DELETE" and suffix == "/payload":
                if not self.jobs.delete_payload(job_id):
                    raise ApiProblem(404, "object_not_found", "The job was not found.")
                return self._json(200, {"status": "deleted", "request_id": request_id})
            if method == "GET" and suffix == "/events":
                events = self.jobs.event_data(job_id)
                if events is None:
                    raise ApiProblem(404, "object_not_found", "The job was not found.")
                content = "".join("data: " + json.dumps(event, separators=(",", ":")) + "\n\n" for event in events).encode()
                return 200, [(b"content-type", b"text/event-stream"), (b"cache-control", b"no-store")], content
        if method == "POST" and path == "/v1/receipts/validate":
            receipt = await self._json_body(receive)
            errors = verify_receipt(receipt)
            return self._json(200, {"valid": not errors, "schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "errors": errors})
        if method == "POST" and path in {"/v1/admin/models/plan", "/v1/admin/models/install"}:
            raise ApiProblem(501, "method_not_configured", "No model is approved or configured.")
        if method == "DELETE" and MODEL_RE.fullmatch(path):
            raise ApiProblem(501, "method_not_configured", "No model is approved or configured.")
        allowed_paths = {"/health", "/v1/capabilities", "/v1/analyses", "/v1/checker-results", "/v1/rewrite-jobs", "/v1/receipts/validate", "/v1/admin/models/plan", "/v1/admin/models/install"}
        if path in allowed_paths or JOB_RE.fullmatch(path) or MODEL_RE.fullmatch(path):
            raise ApiProblem(405, "invalid_request", "The HTTP method is not allowed.")
        raise ApiProblem(404, "object_not_found", "The route was not found.")

    def _authorise(self, value: str | None, expected: bytes, client_key: str = "local") -> None:
        supplied = value[7:] if value and value.startswith("Bearer ") else ""
        supplied_hash = hmac.digest(self._token_salt, supplied.encode(), "sha256")
        if not supplied or not hmac.compare_digest(supplied_hash, expected):
            now=time.monotonic()
            with self._auth_lock:
                attempts=[item for item in self._auth_failures.get(client_key,[]) if now-item<10]
                attempts.append(now);self._auth_failures[client_key]=attempts
            if len(attempts)>=5:raise ApiProblem(429,"rate_limited","Authentication failures are temporarily rate limited.",True)
            raise ApiProblem(401, "permission_denied", "A valid bearer token is required.")
        with self._auth_lock:self._auth_failures.pop(client_key,None)

    async def _json_body(self, receive) -> Any:
        chunks, size = [], 0
        while True:
            message = await receive()
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > MAX_BODY:
                raise ApiProblem(413, "request_too_large", "The request exceeded 250000 bytes.")
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        def reject_pairs(pairs):
            value = {}
            for key, item in pairs:
                if key in value:
                    raise ValueError("duplicate_json_key")
                value[key] = item
            return value
        return json.loads(b"".join(chunks).decode("utf-8", errors="strict"), object_pairs_hook=reject_pairs)

    def _json(self, status: int, value: Any, media_type: str = "application/json"):
        return status, [(b"content-type", media_type.encode("ascii")), (b"cache-control", b"no-store"), (b"x-content-type-options", b"nosniff")], json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")

    def _error(self, status: int, code: str, message: str, request_id: str, retryable: bool = False):
        return self._json(status, {"schema_version": SCHEMA_VERSION, "request_id": request_id, "error": {"code": code, "message": message, "retryable": retryable}})
