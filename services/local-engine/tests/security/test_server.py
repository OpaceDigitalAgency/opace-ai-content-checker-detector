import http.client
import contextlib
import io
import json
import socket
import threading
import time
import unittest
from unittest.mock import patch

from opace_integrity.app import AppConfig, LocalApp
from opace_integrity.server import LoopbackServer, make_handler
from opace_integrity.server import serve

RUN="run-token-1234567890";ADMIN="admin-token-1234567890"


class ServerSecurityTests(unittest.TestCase):
    def setUp(self):
        provisional=LoopbackServer(("127.0.0.1",0),make_handler(lambda *_:None));self.port=provisional.server_address[1];provisional.server_close()
        self.server=LoopbackServer(("127.0.0.1",self.port),make_handler(LocalApp(AppConfig(RUN,ADMIN,port=self.port))))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
    def tearDown(self): self.server.shutdown();self.server.server_close();self.thread.join(2)
    def raw(self, value):
        connection=socket.create_connection(("127.0.0.1",self.port),timeout=2);connection.sendall(value);response=connection.recv(4096);connection.close();return int(response.split(b" ",2)[1])
    def test_request_framing_fails_closed_before_read(self):
        base=f"POST /v1/analyses HTTP/1.1\r\nHost: 127.0.0.1:{self.port}\r\nAuthorization: Bearer {RUN}\r\n".encode()
        self.assertEqual(self.raw(base+b"Content-Length: 250001\r\n\r\n"),413)
        self.assertEqual(self.raw(base+b"\r\n"),411)
        self.assertEqual(self.raw(base+b"Content-Length: -1\r\n\r\n"),400)
        self.assertEqual(self.raw(base+b"Content-Length: 0\r\nContent-Length: 0\r\n\r\n"),400)
        self.assertEqual(self.raw(base+b"Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n"),400)
    def test_exact_boundary_is_read_then_contract_rejected(self):
        body=b" "*250000
        connection=http.client.HTTPConnection("127.0.0.1",self.port,timeout=3)
        connection.request("POST","/v1/analyses",body=body,headers={"Authorization":"Bearer "+RUN,"Content-Type":"application/json"})
        self.assertEqual(connection.getresponse().status,400);connection.close()

    def test_host_origin_and_auth_reject_before_advertised_body_read(self):
        cases=(
            f"POST /v1/analyses HTTP/1.1\r\nHost: evil.example\r\nAuthorization: Bearer {RUN}\r\nContent-Length: 250000\r\n\r\n",
            f"POST /v1/analyses HTTP/1.1\r\nHost: 127.0.0.1:{self.port}\r\nOrigin: https://evil.example\r\nAuthorization: Bearer {RUN}\r\nContent-Length: 250000\r\n\r\n",
            f"POST /v1/analyses HTTP/1.1\r\nHost: 127.0.0.1:{self.port}\r\nAuthorization: Bearer wrong-token-value\r\nContent-Length: 250000\r\n\r\n",
        )
        for raw in cases:
            started=time.monotonic();status=self.raw(raw.encode());self.assertIn(status,{401,403});self.assertLess(time.monotonic()-started,1.0)

    def test_slow_body_times_out_and_concurrency_is_bounded(self):
        provisional=LoopbackServer(("127.0.0.1",0),make_handler(lambda *_:None));port=provisional.server_address[1];provisional.server_close()
        server=LoopbackServer(("127.0.0.1",port),make_handler(LocalApp(AppConfig(RUN,ADMIN,port=port))),maximum_requests=1)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        first=socket.create_connection(("127.0.0.1",port),timeout=4)
        try:
            first.sendall(f"POST /v1/analyses HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {RUN}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{{".encode())
            time.sleep(0.1)
            second=socket.create_connection(("127.0.0.1",port),timeout=2);second.sendall(f"GET /health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n".encode());response=second.recv(4096);second.close()
            self.assertEqual(int(response.split(b" ",2)[1]),429)
            started=time.monotonic();response=first.recv(4096);self.assertEqual(int(response.split(b" ",2)[1]),408);self.assertLess(time.monotonic()-started,3.0)
        finally:
            first.close();server.shutdown();server.server_close();thread.join(2)

    def test_bind_policy_rejects_every_non_exact_loopback_before_socket_creation(self):
        with patch("opace_integrity.server.LoopbackServer") as server_class:
            for host in ("0.0.0.0","::","localhost","127.0.0.2","192.168.1.10",""):
                with self.assertRaisesRegex(ValueError,"loopback_bind_required"):serve(host,8741,RUN,ADMIN)
            server_class.assert_not_called()

    def test_request_logs_use_safe_route_templates_without_content_tokens_or_query(self):
        marker="PRIVATE-SOURCE-MARKER-9274";query="PRIVATE-QUERY-MARKER-1558"
        body={"schema_version":"1.0","contract_version":"1.0.0","request_id":"req_logtest1","created_at":"2026-08-26T10:00:00Z","source":{"content":marker,"content_type":"plain_text","language":"en-GB"},"checks":[],"privacy":{"allowed_routes":["local_service"],"save_receipt":False,"retain_content":False}}
        captured=io.StringIO()
        with contextlib.redirect_stderr(captured):
            connection=http.client.HTTPConnection("127.0.0.1",self.port,timeout=3);connection.request("POST","/v1/analyses?debug="+query,body=json.dumps(body),headers={"Authorization":"Bearer "+RUN,"Content-Type":"application/json"});response=connection.getresponse();response.read();connection.close();self.assertEqual(response.status,200)
        value=captured.getvalue();self.assertIn('"route":"/v1/analyses"',value)
        for secret in (marker,query,RUN,ADMIN,"Authorization","Bearer"):self.assertNotIn(secret,value)


if __name__ == "__main__": unittest.main()
