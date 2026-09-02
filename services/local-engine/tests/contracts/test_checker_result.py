from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from opace_integrity.checker_result import assert_checker_result_invariants, compose_checker_result, format_checker_score_texts
from opace_integrity.contracts import ContractError
from opace_integrity.cycle5_model import ARTEFACT_SHA256, ScoredDocument, ScoredSection

ROOT = Path(__file__).resolve().parents[4]


class CheckerResultTests(unittest.TestCase):
    def fixture(self):
        return json.loads(ROOT.joinpath("fixtures/contracts/valid/checker-result.json").read_text())["data"]

    def test_canonical_scored_fixture_and_margin_invariants(self):
        value = self.fixture()
        assert_checker_result_invariants(value)
        for mutate in (
            lambda result: result["axes"]["ai_pattern"].__setitem__("raw_margin", 0.1),
            lambda result: result["sections"][1].__setitem__("raw_margin", 0.1),
            lambda result: result["axes"]["ai_pattern"].__setitem__("flag_reason", "secondary"),
            lambda result: result["sections"][1].__setitem__("index", 2),
        ):
            hostile = copy.deepcopy(value)
            mutate(hostile)
            with self.assertRaises(ContractError):
                assert_checker_result_invariants(hostile)

    def test_run_wide_formatter_resolves_cross_level_collision(self):
        self.assertEqual(format_checker_score_texts([(0.9655,"signal-likely-ai"),(0.9685,"signal-strongly-ai")]),["0.966","0.969"])
        self.assertEqual(format_checker_score_texts([(0.125,"signal-unclear")]),["0.13"])

    def test_producer_preserves_astral_utf16_offsets(self):
        content = "😀 " + "evidence words " * 100
        end = len(content.encode("utf-16-le")) // 2
        request = {"schema_version":"1.0","contract_version":"1.0.0","request_id":"req_astral01","created_at":"2026-09-02T10:00:00Z","source":{"content":content,"content_type":"plain_text","language":"en-GB"},"checks":["unicode.invisible","style.patterns","watermark.anthropic"],"privacy":{"allowed_routes":["local_service"],"save_receipt":False,"retain_content":False}}
        scored = ScoredDocument((ScoredSection(0,0,end,201,content,3.6,0.9685,"very_likely_ai"),),3.6,0.9685,"very_likely_ai",0.9679444972866822,0.9561964051006938,True,"primary","sha256:"+ARTEFACT_SHA256)
        result = compose_checker_result(request,scored,"2026-09-02T10:00:00Z")
        self.assertEqual(result["source"]["character_count"],end)
        self.assertEqual(result["sections"][0]["end_utf16"],end)
        self.assertEqual(result["source"]["content_hash"],result["source"]["normalised_hash"])
        broken = ScoredDocument((ScoredSection(0,0,len(content),201,content,3.6,0.9685,"very_likely_ai"),),3.6,0.9685,"very_likely_ai",0.9679444972866822,0.9561964051006938,True,"primary","sha256:"+ARTEFACT_SHA256)
        with self.assertRaises(ContractError):
            compose_checker_result(request,broken,"2026-09-02T10:00:00Z")


if __name__ == "__main__":
    unittest.main()
