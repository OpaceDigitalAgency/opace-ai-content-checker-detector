import json
import subprocess
import unittest
from pathlib import Path

from opace_integrity.contracts import validate
from opace_integrity.deterministic import content_diff, extract_protected_spans, inspect, sha256, validate_candidate

ROOT=Path(__file__).resolve().parents[4]
CORE=(ROOT/"packages/core/dist/bundle.js").as_uri()


def stable(value):
    copy=json.loads(json.dumps(value));copy.pop("started_at",None);copy.pop("completed_at",None)
    for method in copy["methods"]:
        method.pop("started_at",None);method.pop("completed_at",None);method.pop("privacy_route",None)
    return {key:copy[key] for key in ("schema_version","contract_version","request_id","analysis_id","source","protected_spans","pattern_findings","methods","summary","limitations")}


class ParityTests(unittest.TestCase):
    def test_public_core_stable_fields_match_python_for_supported_fixture(self):
        for content,content_type in [("Oрасе paid £10 on 2026-08-26. In conclusion, email a@b.co","plain_text"),("<p>In conclusion, email a@b.co</p><script>hidden</script>","html"),("**In conclusion**, see [Opace](https://opace.example)","markdown")]:
            request={"schema_version":"1.0","contract_version":"1.0.0","request_id":"req_parity001","created_at":"2026-08-26T10:00:00Z","source":{"content":content,"content_type":content_type,"language":"en-GB"},"checks":["unicode.homoglyph","style.patterns","watermark.anthropic"],"privacy":{"allowed_routes":["local_service"],"save_receipt":False,"retain_content":False}}
            python=inspect(request,clock=lambda:"2026-08-26T10:00:00Z");validate("analysis-result.schema.json",python)
            script=f'import {{inspect}} from {json.dumps(CORE)};const r={json.dumps(request)};process.stdout.write(JSON.stringify(await inspect(r,{{now:()=>"2026-08-26T10:00:00Z"}})));'
            node=json.loads(subprocess.check_output(["node","--input-type=module","-e",script],text=True))
            self.assertEqual(stable(python),stable(node))

    def test_diff_and_gate_parity_for_boundaries_unicode_and_fallback(self):
        cases=[("", ""),("Price £10.","Price changed."),("start","new start"),("end old","end"),("Emoji 😀 here","Emoji ✨ here"),("a "*41000,"b "*41000)]
        for source,candidate in cases:
            python_diff=content_diff(source,candidate);spans=extract_protected_spans(source,sha256(source));python_gates=validate_candidate(source,candidate,spans)
            script=f'import {{diff,extractProtectedSpans,prefixedSha256,validateCandidate}} from {json.dumps(CORE)};const s={json.dumps(source)},c={json.dumps(candidate)};const p=extractProtectedSpans({{content:s,content_hash:prefixedSha256(s)}});process.stdout.write(JSON.stringify({{diff:diff(s,c),gates:validateCandidate({{content:s,content_hash:prefixedSha256(s)}},c,p,{{mode:"strict"}})}}));'
            node=json.loads(subprocess.check_output(["node","--input-type=module","-e",script],text=True))
            self.assertEqual(python_diff,node["diff"])
            self.assertEqual(python_gates,node["gates"])


if __name__ == "__main__": unittest.main()
