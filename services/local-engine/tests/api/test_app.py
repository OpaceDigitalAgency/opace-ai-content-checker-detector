import asyncio
import json
import time
import unittest

from opace_integrity.app import AppConfig, LocalApp

RUN = "run-token-1234567890"
ADMIN = "admin-token-1234567890"


def request(app, method, path, body=None, token=RUN, extra_headers=()):
    raw = json.dumps(body, separators=(",", ":")).encode() if body is not None else b""
    headers = [(b"host", f"127.0.0.1:{app.config.port}".encode()), *extra_headers]
    if token is not None: headers.append((b"authorization", ("Bearer " + token).encode()))
    if body is not None: headers.extend([(b"content-type", b"application/json"), (b"content-length", str(len(raw)).encode())])
    sent = []
    async def receive(): return {"type":"http.request", "body":raw, "more_body":False}
    async def send(message): sent.append(message)
    asyncio.run(app({"type":"http", "method":method, "path":path, "headers":headers}, receive, send))
    status = sent[0]["status"]
    payload = b"".join(item.get("body", b"") for item in sent[1:])
    return status, dict(sent[0]["headers"]), json.loads(payload) if payload and dict(sent[0]["headers"]).get(b"content-type") == b"application/json" else payload


def analysis():
    return {"schema_version":"1.0","contract_version":"1.0.0","request_id":"req_test001","created_at":"2026-08-26T10:00:00Z","source":{"content":"Oрасе paid £10 on 2026-08-26. In conclusion, email a@b.co","content_type":"plain_text","language":"en-GB"},"checks":["unicode.homoglyph","style.patterns","watermark.anthropic"],"privacy":{"allowed_routes":["local_service"],"save_receipt":False,"retain_content":False}}


class AppTests(unittest.TestCase):
    def setUp(self): self.app = LocalApp(AppConfig(RUN, ADMIN, port=8741))

    def test_health_auth_scope_origin_host_and_duplicate_headers(self):
        self.assertEqual(request(self.app,"GET","/health",token=None)[0],200)
        self.assertEqual(request(self.app,"GET","/v1/capabilities",token=None)[0],401)
        self.assertEqual(request(self.app,"GET","/v1/capabilities",token=ADMIN)[0],401)
        self.assertEqual(request(self.app,"POST","/v1/admin/models/plan",token=RUN)[0],401)
        self.assertEqual(request(self.app,"POST","/v1/admin/models/plan",token=ADMIN)[0],501)
        self.assertEqual(request(self.app,"GET","/v1/capabilities",extra_headers=((b"origin",b"https://evil.example"),))[0],403)
        self.assertEqual(request(self.app,"GET","/v1/capabilities",extra_headers=((b"host",b"169.254.169.254"),))[0],400)
        self.assertEqual(request(self.app,"GET","/v1/capabilities",extra_headers=((b"authorization",b"Bearer duplicate"),))[0],400)

    def test_repeated_auth_failures_are_bounded_and_success_resets(self):
        app=LocalApp(AppConfig(RUN,ADMIN,port=8741));statuses=[request(app,"GET","/v1/capabilities",token="wrong-token-value")[0] for _ in range(5)]
        self.assertEqual(statuses,[401,401,401,401,429]);self.assertEqual(request(app,"GET","/v1/capabilities",token=RUN)[0],200);self.assertEqual(request(app,"GET","/v1/capabilities",token="wrong-token-value")[0],401)

    def test_analysis_contract_and_duplicate_json(self):
        status, _headers, result = request(self.app,"POST","/v1/analyses",analysis())
        self.assertEqual(status,200)
        self.assertEqual(result["methods"][-1]["status"],"unsupported")
        self.assertTrue(result["protected_spans"])
        self.assertEqual(request(self.app,"POST","/v1/analyses",{**analysis(),"privacy":{**analysis()["privacy"],"allowed_routes":["browser"]}})[0],403)
        raw = b'{"schema_version":"1.0","schema_version":"1.0"}'
        headers=((b"content-type",b"application/json"),(b"content-length",str(len(raw)).encode()))
        sent=[]
        async def receive(): return {"type":"http.request","body":raw,"more_body":False}
        async def send(message): sent.append(message)
        asyncio.run(self.app({"type":"http","method":"POST","path":"/v1/analyses","headers":[(b"host",b"127.0.0.1:8741"),(b"authorization",("Bearer "+RUN).encode()),*headers]},receive,send))
        self.assertEqual(sent[0]["status"],400)

    def test_anthropic_capability_and_result_identities_and_unknown_check(self):
        capabilities_result=request(self.app,"GET","/v1/capabilities")[2]
        anthropic=next(item for item in capabilities_result["methods"] if item["id"]=="watermark.anthropic")
        self.assertEqual((anthropic["version"],anthropic["state"],anthropic["reason"]),("adapter-placeholder/1","unsupported","official_detector_unavailable"))
        body={**analysis(),"checks":["watermark.anthropic","detector.future"]}
        status,_headers,result=request(self.app,"POST","/v1/analyses",body);self.assertEqual(status,200)
        official,unknown=result["methods"]
        self.assertEqual((official["version"],official["status"],official["availability"],official["native_outcome"]),("unavailable-2026-08-26","unsupported","not_available","not_available"))
        self.assertEqual((unknown["id"],unknown["status"]),("detector.future","unsupported"))

    def test_all_route_templates_and_idempotency(self):
        self.assertEqual(request(self.app,"GET","/v1/capabilities")[0],200)
        rewrite={**analysis(),"protected_spans":[],"candidate_count":1,"allowed_routes":["local_service"],"gate_policy":"strict"};rewrite.pop("privacy")
        headers=((b"idempotency-key",b"idem-test001"),)
        first=request(self.app,"POST","/v1/rewrite-jobs",rewrite,extra_headers=headers);self.assertEqual(first[0],202);job_id=first[2]["job_id"]
        self.assertEqual(request(self.app,"POST","/v1/rewrite-jobs",rewrite,extra_headers=headers)[2]["job_id"],job_id)
        mismatch={**rewrite,"candidate_count":2};self.assertEqual(request(self.app,"POST","/v1/rewrite-jobs",mismatch,extra_headers=headers)[0],409)
        self.assertEqual(request(self.app,"GET",f"/v1/jobs/{job_id}")[0],200)
        self.assertEqual(request(self.app,"GET",f"/v1/jobs/{job_id}/events")[0],200)
        self.assertEqual(request(self.app,"DELETE",f"/v1/jobs/{job_id}")[0],202)
        self.assertEqual(request(self.app,"DELETE",f"/v1/jobs/{job_id}/payload")[0],200)
        self.assertEqual(request(self.app,"POST","/v1/receipts/validate",{})[2]["valid"],False)
        self.assertEqual(request(self.app,"POST","/v1/admin/models/install",token=ADMIN)[0],501)
        self.assertEqual(request(self.app,"DELETE","/v1/admin/models/model-1",token=ADMIN)[0],501)


if __name__ == "__main__": unittest.main()
