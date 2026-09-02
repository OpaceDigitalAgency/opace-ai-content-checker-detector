from __future__ import annotations

import argparse
import asyncio
import ctypes
import json
import os
import signal
import socket
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .app import ApiProblem, AppConfig, LocalApp


def _wipe_environment_value(name: str) -> None:
    if os.name != "posix" or name not in os.environ:
        return
    library = ctypes.CDLL(None)
    if sys.platform == "darwin":
        getter = library._NSGetEnviron
        getter.restype = ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))
        environment = getter().contents
    else:
        environment = ctypes.POINTER(ctypes.c_void_p).in_dll(library, "environ")
    prefix = (name + "=").encode()
    index = 0
    while environment[index]:
        address = environment[index]
        entry = ctypes.string_at(address)
        if entry.startswith(prefix):
            ctypes.memset(address + len(prefix), 0, len(entry) - len(prefix))
            return
        index += 1
    raise RuntimeError("service_token_environment_cleanup_failed")


def take_service_tokens_from_environment() -> tuple[str, str]:
    run_token,admin_token=os.environ.get("OACI_RUN_TOKEN", ""),os.environ.get("OACI_ADMIN_TOKEN", "")
    _wipe_environment_value("OACI_RUN_TOKEN");_wipe_environment_value("OACI_ADMIN_TOKEN")
    os.environ.pop("OACI_RUN_TOKEN", None);os.environ.pop("OACI_ADMIN_TOKEN", None)
    return run_token, admin_token

MAX_BODY = 250_000


class LoopbackServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 16
    def __init__(self, *args, maximum_requests=8, **kwargs):
        self._request_slots = threading.BoundedSemaphore(maximum_requests)
        super().__init__(*args, **kwargs)
    def process_request(self, request, client_address):
        if not self._request_slots.acquire(blocking=False):
            payload=b'{"schema_version":"1.0","request_id":"req_capacity","error":{"code":"rate_limited","message":"The local request capacity was reached.","retryable":true}}'
            try: request.sendall(b"HTTP/1.1 429 Too Many Requests\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: "+str(len(payload)).encode()+b"\r\n\r\n"+payload)
            finally: self.shutdown_request(request)
            return
        super().process_request(request, client_address)
    def process_request_thread(self, request, client_address):
        try: super().process_request_thread(request, client_address)
        finally: self._request_slots.release()


def _call_asgi(app, handler: BaseHTTPRequestHandler):
    _preflight(app, handler)
    lengths = handler.headers.get_all("Content-Length") or []
    transfers = handler.headers.get_all("Transfer-Encoding") or []
    if len(lengths) > 1 or transfers:
        raise RequestRejected(400, "Ambiguous request framing is not permitted.")
    if handler.command in {"POST", "PUT", "PATCH"} and not lengths:
        raise RequestRejected(411, "Content-Length is required.")
    try:
        length = int(lengths[0]) if lengths else 0
    except ValueError as error:
        raise RequestRejected(400, "Content-Length is invalid.") from error
    if length < 0:
        raise RequestRejected(400, "Content-Length is invalid.")
    if length > MAX_BODY:
        raise RequestRejected(413, "The request exceeded 250000 bytes.")
    body = handler.rfile.read(length) if length else b""
    scope = {"type": "http", "http_version": "1.1", "method": handler.command, "scheme": "http", "path": handler.path.split("?", 1)[0], "raw_path": handler.path.encode(), "query_string": handler.path.partition("?")[2].encode(), "headers": [(key.lower().encode("latin1"), value.encode("latin1")) for key, value in handler.headers.items()], "client": handler.client_address, "server": handler.server.server_address}
    sent = []
    received = False
    async def receive():
        nonlocal received
        if received:
            return {"type": "http.disconnect"}
        received = True
        return {"type": "http.request", "body": body, "more_body": False}
    async def send(message):
        sent.append(message)
    asyncio.run(app(scope, receive, send))
    start = next(item for item in sent if item["type"] == "http.response.start")
    payload = b"".join(item.get("body", b"") for item in sent if item["type"] == "http.response.body")
    handler.send_response(start["status"])
    for key, value in start.get("headers", []):
        handler.send_header(key.decode("latin1"), value.decode("latin1"))
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)
    return start["status"]


class RequestRejected(Exception):
    def __init__(self, status: int, message: str, code: str = "invalid_request"):
        super().__init__(message)
        self.status = status
        self.code = code


def _preflight(app: LocalApp, handler: BaseHTTPRequestHandler):
    for protected in ("Host","Origin","Authorization","Content-Length"):
        if len(handler.headers.get_all(protected) or []) > 1: raise RequestRejected(400,f"Duplicate {protected.lower()} headers are not permitted.")
    if handler.headers.get("Host") not in {f"127.0.0.1:{app.config.port}",f"localhost:{app.config.port}"}: raise RequestRejected(403,"The Host header is not permitted.","permission_denied")
    origin=handler.headers.get("Origin")
    if origin is not None and origin not in app.config.allowed_origins: raise RequestRejected(403,"The Origin header is not permitted.","permission_denied")
    path=handler.path.split("?",1)[0]
    if path=="/health" and handler.command=="GET": return
    expected=app._admin_token_hash if path.startswith("/v1/admin/") else app._run_token_hash
    try: app._authorise(handler.headers.get("Authorization"),expected,str(handler.client_address[0]))
    except ApiProblem as error: raise RequestRejected(error.status,str(error),error.code) from error


def make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        def setup(self):
            super().setup();self.connection.settimeout(2.0)
        def _run(self):
            self.close_connection = True
            try:
                status = _call_asgi(app, self)
            except RequestRejected as error:
                status = error.status
                payload = json.dumps({"schema_version":"1.0","request_id":"req_server_error","error":{"code":"request_too_large" if status == 413 else error.code,"message":str(error),"retryable":status==429}}, separators=(",", ":")).encode()
                self.send_response(status);self.send_header("Content-Type", "application/json");self.send_header("Content-Length", str(len(payload)));self.end_headers();self.wfile.write(payload)
            except (TimeoutError,socket.timeout):
                status=408
                payload=b'{"schema_version":"1.0","request_id":"req_server_error","error":{"code":"invalid_request","message":"The request body was not received before the timeout.","retryable":false}}'
                self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(payload)));self.end_headers();self.wfile.write(payload)
            except Exception:
                status = 500
                payload = b'{"schema_version":"1.0","request_id":"req_server_error","error":{"code":"internal_error","message":"The local service could not complete the request.","retryable":false}}'
                self.send_response(status);self.send_header("Content-Type", "application/json");self.send_header("Content-Length", str(len(payload)));self.end_headers();self.wfile.write(payload)
            print(json.dumps({"event": "request", "method": self.command, "route": _route_template(self.path.split("?", 1)[0]), "status": status}, separators=(",", ":")), file=sys.stderr, flush=True)
        do_GET = do_POST = do_DELETE = do_PUT = do_PATCH = _run
        def log_message(self, _format, *_args):
            return
    return Handler


def _route_template(path: str) -> str:
    if path in {"/health","/v1/capabilities","/v1/analyses","/v1/checker-results","/v1/rewrite-jobs","/v1/receipts/validate","/v1/admin/models/plan","/v1/admin/models/install"}: return path
    if path.startswith("/v1/jobs/"):
        return "/v1/jobs/{id}/events" if path.endswith("/events") else "/v1/jobs/{id}/payload" if path.endswith("/payload") else "/v1/jobs/{id}"
    if path.startswith("/v1/admin/models/"): return "/v1/admin/models/{id}"
    return "unknown"


def serve(host: str, port: int, run_token: str, admin_token: str, model_directory: str | None = None):
    if host != "127.0.0.1":
        raise ValueError("loopback_bind_required")
    if not (1 <= port <= 65535):
        raise ValueError("invalid_port")
    app = LocalApp(AppConfig(run_token=run_token, admin_token=admin_token, port=port, model_directory=model_directory))
    run_token = admin_token = ""
    server = LoopbackServer((host, port), make_handler(app))
    def request_shutdown(*_args):
        threading.Thread(target=server.shutdown,daemon=True,name="oaci-shutdown").start()
    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, request_shutdown)
    try:
        server.serve_forever(poll_interval=0.1)
    finally:
        app.jobs.shutdown()
        server.server_close()


def main(argv=None):
    parser = argparse.ArgumentParser(prog="opace-integrity serve")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8741)
    parser.add_argument("--model-dir", help="Absolute directory containing manifest.json and the pinned Cycle-5 files; without it the full-checker route fails closed")
    args = parser.parse_args(argv)
    run_token, admin_token = take_service_tokens_from_environment()
    if not run_token or not admin_token:
        parser.error("OACI_RUN_TOKEN and OACI_ADMIN_TOKEN are required")
    serve(args.host, args.port, run_token, admin_token, args.model_dir)
