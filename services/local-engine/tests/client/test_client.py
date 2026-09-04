import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer

from opace_integrity.app import AppConfig,LocalApp
from opace_integrity.client import AdminClient,ClientError,LocalClient
from opace_integrity.server import LoopbackServer,make_handler

RUN="run-token-1234567890";ADMIN="admin-token-1234567890"


def analysis(): return {"schema_version":"1.0","contract_version":"1.0.0","request_id":"req_client001","created_at":"2026-08-26T10:00:00Z","source":{"content":"Price £10.","content_type":"plain_text","language":"en-GB"},"checks":["style.patterns"],"privacy":{"allowed_routes":["local_service"],"save_receipt":False,"retain_content":False}}


class ClientTests(unittest.TestCase):
    def setUp(self):
        provisional=LoopbackServer(("127.0.0.1",0),make_handler(lambda *_:None));self.port=provisional.server_address[1];provisional.server_close();self.server=LoopbackServer(("127.0.0.1",self.port),make_handler(LocalApp(AppConfig(RUN,ADMIN,port=self.port))));self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.client=LocalClient(RUN,f"http://127.0.0.1:{self.port}")
    def tearDown(self): self.server.shutdown();self.server.server_close();self.thread.join(2)
    def test_all_run_routes_and_runtime_validation(self):
        self.assertEqual(self.client.health(),{"status":"ok"});self.assertEqual(self.client.capabilities()["schema_version"],"1.0");self.assertEqual(self.client.capabilities()["version"],"0.3.1");self.assertIn("analysis_id",self.client.analyse(analysis()))
        rewrite={**analysis(),"protected_spans":[],"candidate_count":1,"allowed_routes":["local_service"],"gate_policy":"strict"};rewrite.pop("privacy")
        job=self.client.start_rewrite(rewrite,"idem-client001");self.assertEqual(self.client.get_job(job["job_id"])["job_id"],job["job_id"]);self.assertTrue(self.client.job_events(job["job_id"]));self.assertEqual(self.client.cancel(job["job_id"])["status"],"cancelled");self.assertEqual(self.client.delete_payload(job["job_id"])["status"],"deleted")
        with self.assertRaises(ClientError): self.client.validate_receipt({})
        admin=AdminClient(ADMIN,f"http://127.0.0.1:{self.port}")
        for call in (admin.plan_model_install,admin.install_model,lambda:admin.delete_model("model-1")):
            with self.assertRaises(ClientError) as context: call()
            self.assertEqual(context.exception.code,"method_not_configured")
    def test_request_preflight_rejects_oversize_and_bad_contract(self):
        with self.assertRaises(ClientError) as context:self.client.analyse({**analysis(),"source":{**analysis()["source"],"content":"x"*250001}})
        self.assertIn(context.exception.code,{"invalid_request","request_too_large"})
        with self.assertRaises(ClientError):self.client.analyse({**analysis(),"contract_version":"2.0.0"})
        with self.assertRaises(ClientError) as context:self.client.analyse({**analysis(),"padding":"x"*249990})
        self.assertEqual(context.exception.code,"request_too_large")


class RedirectAndHealthTests(unittest.TestCase):
    def test_invalid_bounds_and_advertised_oversize_close_without_io(self):
        for kwargs in ({"timeout":0},{"timeout":301},{"maximum_response":0},{"maximum_response":16_000_001},{"maximum_event":0},{"maximum_response":10,"maximum_event":11}):
            with self.assertRaises(ValueError):LocalClient(RUN,**kwargs)
        client=LocalClient(RUN,maximum_response=8)
        class Response:
            status=200
            def __init__(self,value):self.headers={"Content-Length":value};self.closed=False;self.read_called=False
            def read(self,_size):self.read_called=True;return b""
            def close(self):self.closed=True
        for value,code in (("9","response_too_large"),("-1","malformed_response"),("bad","malformed_response")):
            response=Response(value)
            with self.assertRaises(ClientError) as context:client._read_bounded(response,"response")
            self.assertEqual(context.exception.code,code);self.assertTrue(response.closed);self.assertFalse(response.read_called)

    def test_redirect_is_not_followed_and_health_omits_token(self):
        seen=[]
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                seen.append((self.path,self.headers.get("Authorization")))
                if self.path=="/redirect":self.send_response(302);self.send_header("Location","http://169.254.169.254/latest/meta-data/");self.send_header("Content-Length","0");self.end_headers()
                else:
                    body=b'{"status":"ok"}';self.send_response(200);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body)
            def log_message(self,*_): pass
        server=ThreadingHTTPServer(("127.0.0.1",0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            client=LocalClient(RUN,f"http://127.0.0.1:{server.server_address[1]}");self.assertEqual(client.health(),{"status":"ok"});
            with self.assertRaises(ClientError):client._request("GET","/redirect")
            self.assertEqual(seen,[("/health",None),("/redirect","Bearer "+RUN)])
        finally:server.shutdown();server.server_close();thread.join(2)

    def test_health_does_not_resolve_secret_provider(self):
        calls=[]
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                body=b'{"status":"ok"}';self.send_response(200);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body)
            def log_message(self,*_): pass
        server=ThreadingHTTPServer(("127.0.0.1",0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            client=LocalClient(lambda:calls.append("token") or RUN,f"http://127.0.0.1:{server.server_address[1]}")
            self.assertEqual(client.health(),{"status":"ok"});self.assertEqual(calls,[])
        finally:server.shutdown();server.server_close();thread.join(2)

    def test_success_error_and_sse_bodies_are_bounded(self):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path=="/large":body=b"x"*64;status=200;content_type="application/json"
                elif self.path.endswith("/events"):body=b'{"schema_version":"1.0","request_id":"req_error001","error":{"code":"object_not_found","message":"PRIVATE SOURCE MARKER","retryable":false}}';status=404;content_type="application/json"
                else:body=b"x"*64;status=500;content_type="application/json"
                self.send_response(status);self.send_header("Content-Type",content_type);self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body)
            def log_message(self,*_): pass
        server=ThreadingHTTPServer(("127.0.0.1",0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            small=LocalClient(RUN,f"http://127.0.0.1:{server.server_address[1]}",maximum_response=8)
            with self.assertRaises(ClientError) as context:small._request("GET","/large")
            self.assertEqual(context.exception.code,"response_too_large")
            with self.assertRaises(ClientError) as context:small._request("GET","/error")
            self.assertEqual(context.exception.code,"response_too_large")
            normal=LocalClient(RUN,f"http://127.0.0.1:{server.server_address[1]}")
            with self.assertRaises(ClientError) as context:normal.job_events("job_missing01")
            self.assertEqual(context.exception.code,"object_not_found");self.assertNotIn("PRIVATE SOURCE MARKER",str(context.exception))
        finally:server.shutdown();server.server_close();thread.join(2)


if __name__=="__main__":unittest.main()
