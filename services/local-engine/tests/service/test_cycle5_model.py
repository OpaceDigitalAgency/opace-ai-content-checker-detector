from __future__ import annotations

import copy
import json
import math
import os
import unittest
from pathlib import Path

from opace_integrity.cycle5_features.struct_features import extract
from opace_integrity.cycle5_model import Cycle5LocalModel, InputOutsideModelBounds, MODEL_ARTEFACTS, ModelUnavailable, WordPieceTokenizer
from opace_integrity.model_pack import model_manifest
from opace_integrity.cycle5_segments import count_words

ROOT = Path(__file__).resolve().parents[4]


class Cycle5ModelTests(unittest.TestCase):
    def manifest(self):
        return json.loads(ROOT.joinpath("services/local-engine/model-manifest.example.json").read_text())

    def test_manifests_bind_every_identity_hash_and_contract(self):
        for precision in ("int8","fp32"):
            generated=model_manifest(precision)
            Cycle5LocalModel._validate_manifest(generated)
            path="services/local-engine/model-manifest.example.json" if precision=="int8" else "services/local-engine/model-manifest.fp32.example.json"
            self.assertEqual(json.loads(ROOT.joinpath(path).read_text()),generated)
        mutations = [
            ("model","sha256"), ("tokenizer","sha256"), ("contracts","input"),
            ("flag_rule","primary_margin"), ("runtime","onnxruntime"), ("feature_norm","clip"),
        ]
        for parent,key in mutations:
            value=copy.deepcopy(self.manifest());value[parent][key]="wrong"
            with self.assertRaises(ModelUnavailable,msg=f"{parent}.{key}"):
                Cycle5LocalModel._validate_manifest(value)

    def test_feature_vectors_match_all_training_goldens(self):
        fixture_dir=ROOT.joinpath("services/local-engine/research/cycle5-train/deploy-prep/fixtures")
        rows=json.loads(fixture_dir.joinpath("full-vector-golden.json").read_text())
        names=["wpp_cv","sec_within15","pps_var","body_mode_share","spp_cv","adj_overlap","cadence_rate","has_structure"]
        self.assertEqual(len(rows),10)
        for fixture,wants in rows.items():
            actual=extract(fixture_dir.joinpath(f"{fixture}.txt").read_text())
            expected=[wants[name] for name in names]
            self.assertEqual([math.isnan(item) for item in actual],[item is None for item in expected])
            for got,want in zip(actual,expected):
                if want is not None:self.assertAlmostEqual(got,want,places=9)

    def test_js_word_counter_disagrees_safely_with_python_split(self):
        text="first\u001csecond"
        self.assertEqual(len(text.split()),2)
        self.assertEqual(count_words(text),1)

    def test_sixty_word_minimum_matches_browser_contract(self):
        model=Cycle5LocalModel.__new__(Cycle5LocalModel)
        with self.assertRaisesRegex(InputOutsideModelBounds,"model_input_too_short"):
            model.score("word " * 59)
        # Sixty words pass both public bounds before inference is attempted.
        with self.assertRaises(AttributeError):
            model.score("word " * 60)

    def test_character_limit_counts_utf16_code_units(self):
        model=Cycle5LocalModel.__new__(Cycle5LocalModel)
        # Exactly 100,000 UTF-16 units passes the character bound and reaches
        # the later word bound; one more astral character is rejected first.
        with self.assertRaisesRegex(InputOutsideModelBounds,"model_input_too_short"):
            model.score("\U0001f600" * 50_000)
        with self.assertRaisesRegex(InputOutsideModelBounds,"model_input_too_many_characters"):
            model.score("\U0001f600" * 50_001)

    def test_wordpiece_ids_match_the_canonical_dependency_free_runtime(self):
        vocab=ROOT.joinpath("services/local-engine/research/model-shrink/reference-server/model/tokenizer/vocab.txt").read_text()
        tokenizer=WordPieceTokenizer(vocab)
        fixtures={
            "Plain evidence costs £10.":[5810,3350,5366,26812,1012],
            "Café déjà vu — Αθήνα ΟΛΟΣ":[7668,2139,3900,24728,1517,1155,29725,24824,16177,14608,1169,29727,29730,29733],
            "中文 evidence":[1746,1861,3350],
            "a\u0085b\u2028c\ufeffd":[1037,1038,3729],
            "x"*101:[100],
        }
        for text,ids in fixtures.items():self.assertEqual(tokenizer.pieces(text),ids)

    @unittest.skipUnless(os.environ.get("OACI_TEST_CYCLE5_MODEL_DIR"),"set OACI_TEST_CYCLE5_MODEL_DIR to a licensed local manifest/model directory")
    def test_real_pinned_model_scores_without_download(self):
        model=Cycle5LocalModel.load(os.environ["OACI_TEST_CYCLE5_MODEL_DIR"])
        result=model.score("This report explains the evidence in a clear and specific way. It records dates, costs and named sources so another reviewer can check each statement. "*10)
        self.assertTrue(result.sections)
        self.assertTrue(math.isfinite(result.raw_margin))
        self.assertTrue(0 <= result.raw_score <= 1)
        profile=MODEL_ARTEFACTS[model.manifest["model"]["precision"]]
        self.assertEqual(result.artefact_hash,"sha256:"+profile["sha256"])
        self.assertEqual(result.precision,model.manifest["model"]["precision"])


if __name__ == "__main__":
    unittest.main()
