from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any, Callable
from urllib.parse import urlsplit

from .contracts import ContractError, validate

MAX_REQUEST=250_000


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ClientError(RuntimeError):
    def __init__(self, code: str, message: str, status: int | None = None):
        super().__init__(message)
        self.code, self.status = code, status


class LocalClient:
    def __init__(self, token: str | Callable[[], str], origin: str = "http://127.0.0.1:8741", timeout: float = 10, maximum_response: int = 1_000_000, maximum_event: int | None = None):
        parsed = urlsplit(origin)
        if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.username or parsed.password or parsed.path not in {"", "/"} or parsed.query or parsed.fragment or not (1 <= (parsed.port or 80) <= 65535) or not re.fullmatch(r"http://127\.0\.0\.1(?::\d{1,5})?/?", origin):
            raise ValueError("local_origin_not_allowed")
        if not token:
            raise ValueError("run_token_required")
        if not isinstance(timeout,(int,float)) or isinstance(timeout,bool) or not 0 < timeout <= 300:
            raise ValueError("invalid_timeout")
        if not isinstance(maximum_response,int) or isinstance(maximum_response,bool) or not 1 <= maximum_response <= 16_000_000:
            raise ValueError("invalid_maximum_response")
        maximum_event=min(65_536,maximum_response) if maximum_event is None else maximum_event
        if not isinstance(maximum_event,int) or isinstance(maximum_event,bool) or not 1 <= maximum_event <= maximum_response:
            raise ValueError("invalid_maximum_event")
        self.origin, self._token_provider, self.timeout, self.maximum_response, self.maximum_event = origin.rstrip("/"), token if callable(token) else lambda: token, timeout, maximum_response, maximum_event
        self._opener=urllib.request.build_opener(_NoRedirect)

    def _token(self) -> str:
        value = self._token_provider()
        if not isinstance(value, str) or not value:
            raise ClientError("permission_denied", "A bearer token is required.")
        return value

    def _read_bounded(self, response, label: str) -> bytes:
        try:
            advertised = response.headers.get("Content-Length")
            if advertised is not None:
                try: advertised_value=int(advertised)
                except ValueError as error: raise ClientError("malformed_response", "The local service returned an invalid Content-Length.", getattr(response, "status", None)) from error
                if advertised_value<0:raise ClientError("malformed_response", "The local service returned an invalid Content-Length.", getattr(response, "status", None))
                if advertised_value > self.maximum_response:raise ClientError("response_too_large", f"The local {label} exceeded the configured limit.", getattr(response, "status", None))
            raw = response.read(self.maximum_response + 1)
        finally:
            response.close()
        if len(raw) > self.maximum_response:
            raise ClientError("response_too_large", f"The local {label} exceeded the configured limit.", getattr(response, "status", None))
        return raw

    def _request(self, method: str, path: str, body: Any = None, headers: dict[str, str] | None = None, include_auth: bool = True):
        request_headers = {"Accept": "application/json"}
        if include_auth: request_headers["Authorization"]="Bearer "+self._token()
        payload = None
        if body is not None:
            payload = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode()
            if len(payload)>MAX_REQUEST: raise ClientError("request_too_large","The request exceeded 250000 bytes.")
            request_headers["Content-Type"] = "application/json"
        request_headers.update(headers or {})
        request = urllib.request.Request(self.origin + path, data=payload, headers=request_headers, method=method)
        try:
            response = self._opener.open(request, timeout=self.timeout)
            if response.headers.get_content_type()!="application/json":
                response.close()
                raise ClientError("malformed_response","The local service returned an invalid media type.",response.status)
            raw = self._read_bounded(response, "response")
        except urllib.error.HTTPError as error:
            if 300<=error.code<400:
                error.close()
                raise ClientError("engine_unreachable","Redirects are not permitted.",error.code)
            if error.headers.get_content_type()!="application/json":
                error.close()
                raise ClientError("internal_error", "The local service returned an invalid error.", error.code)
            raw = self._read_bounded(error, "error response")
            try:
                problem = json.loads(raw)
                code = problem["error"]["code"]
                if code not in ERROR_CODES:
                    raise KeyError("unknown_error_code")
                raise ClientError(code, "The local service rejected the request.", error.code)
            except (KeyError, json.JSONDecodeError):
                raise ClientError("internal_error", "The local service returned an invalid error.", error.code)
        except (urllib.error.URLError, TimeoutError) as error:
            raise ClientError("engine_unreachable", "The local service could not be reached.") from error
        try:
            return json.loads(raw)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ClientError("malformed_response", "The local service returned invalid JSON.") from error

    def health(self):
        value=self._request("GET","/health",include_auth=False)
        if value!={"status":"ok"}: raise ClientError("malformed_response","The local service returned an invalid health response.")
        return value
    def capabilities(self):
        value=self._request("GET","/v1/capabilities");_validated("capabilities.schema.json",value);return value
    def analyse(self, body):
        _validated("analysis-request.schema.json",body,True);value=self._request("POST","/v1/analyses",body);_validated("analysis-result.schema.json" if "analysis_id" in value else "job.schema.json",value);return value
    def start_rewrite(self, body, idempotency_key):
        _validated("rewrite-request.schema.json",body,True)
        if not re.fullmatch(r"[A-Za-z0-9._:-]{8,128}",idempotency_key): raise ClientError("invalid_request","A valid idempotency key is required.")
        value=self._request("POST","/v1/rewrite-jobs",body,{"Idempotency-Key":idempotency_key});_validated("job.schema.json",value);return value
    def get_job(self, job_id):
        value=self._request("GET","/v1/jobs/"+_identifier(job_id));_validated("job.schema.json",value);return value
    def job_events(self,job_id):
        path="/v1/jobs/"+_identifier(job_id)+"/events";request=urllib.request.Request(self.origin+path,headers={"Accept":"text/event-stream","Authorization":"Bearer "+self._token()},method="GET")
        try: response=self._opener.open(request,timeout=self.timeout)
        except urllib.error.HTTPError as error:
            if 300<=error.code<400:
                error.close()
                raise ClientError("engine_unreachable","Redirects are not permitted.",error.code)
            if error.headers.get_content_type()!="application/json":
                error.close()
                raise ClientError("internal_error","The local event stream failed.",error.code)
            raw=self._read_bounded(error,"event-stream error response")
            try:
                problem=json.loads(raw);code=problem["error"]["code"]
                if code not in ERROR_CODES: raise KeyError("unknown_error_code")
            except (UnicodeDecodeError,json.JSONDecodeError,KeyError):
                code="internal_error"
            raise ClientError(code,"The local event stream failed.",error.code)
        if response.headers.get_content_type()!="text/event-stream": response.close();raise ClientError("malformed_response","The local service returned an invalid event stream.")
        raw=self._read_bounded(response,"event stream")
        events=[]
        try:
            for block in raw.split(b"\n\n"):
                if len(block)>self.maximum_event: raise ClientError("response_too_large","The local event exceeded the configured limit.")
                data=b"\n".join(line[5:].strip() for line in block.splitlines() if line.startswith(b"data:"))
                if data:
                    value=json.loads(data.decode("utf-8",errors="strict"))
                    if not isinstance(value,dict): raise ValueError("invalid_event")
                    events.append(value)
        except (UnicodeDecodeError,json.JSONDecodeError,ValueError) as error:
            raise ClientError("malformed_response","The local service returned an invalid event stream.") from error
        return events
    def cancel(self, job_id): return _ack(self._request("DELETE", "/v1/jobs/" + _identifier(job_id)))
    def delete_payload(self, job_id): return _ack(self._request("DELETE", "/v1/jobs/" + _identifier(job_id) + "/payload"))
    def validate_receipt(self, body):
        _validated("integrity-receipt.schema.json",body,True);value=self._request("POST","/v1/receipts/validate",body)
        if not isinstance(value,dict) or not isinstance(value.get("valid"),bool) or value.get("schema_version")!="1.0" or not str(value.get("contract_version","")).startswith("1.") or not isinstance(value.get("errors"),list): raise ClientError("malformed_response","The local service returned an invalid validation response.")
        return value


class AdminClient(LocalClient):
    def plan_model_install(self): return self._request("POST", "/v1/admin/models/plan")
    def install_model(self): return _ack(self._request("POST", "/v1/admin/models/install"))
    def delete_model(self, model_id): return _ack(self._request("DELETE", "/v1/admin/models/" + _model_id(model_id)))


def _identifier(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9._:-]{8,80}", value): raise ValueError("invalid_resource_id")
    return value


def _model_id(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9._-]+", value): raise ValueError("invalid_model_id")
    return value


def _validated(name,value,request=False):
    try: validate(name,value)
    except ContractError as error: raise ClientError(error.code if request else "malformed_response",str(error)) from error


def _ack(value):
    if not isinstance(value,dict) or value.get("status") not in {"accepted","cancelled","deleted","installed"} or not isinstance(value.get("request_id"),str): raise ClientError("malformed_response","The local service returned an invalid acknowledgement.")
    return value


ERROR_CODES = {"invalid_request","request_too_large","unsupported_schema","contract_incompatible","permission_denied","object_not_found","route_not_allowed","consent_required","method_unsupported","method_not_configured","engine_unreachable","engine_auth_failed","model_unavailable","provider_not_configured","provider_error","rate_limited","job_timeout","job_cancelled","candidate_invalid","fidelity_failed","receipt_save_failed","retention_delete_failed","internal_error"}
