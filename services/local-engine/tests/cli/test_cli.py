import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class CliTests(unittest.TestCase):
    def run_cli(self, args, value=""):
        return subprocess.run([sys.executable,"-m","opace_integrity",*args],input=value,text=True,capture_output=True,env={**os.environ,"NO_COLOR":"1"})
    def test_stdin_json_html_and_receipt_roundtrip(self):
        text="Oрасе paid £10. In conclusion, email a@b.co"
        result=self.run_cli(["--format","json","inspect","-"],text);self.assertEqual(result.returncode,0,result.stderr);value=json.loads(result.stdout);self.assertEqual(value["schema_version"],"1.0");self.assertEqual(value["methods"][-1]["status"],"unsupported")
        html=self.run_cli(["--format","html","inspect","-"],"<script>bad()</script>Safe");self.assertEqual(html.returncode,0);self.assertNotIn("<script",html.stdout);self.assertNotIn("http://",html.stdout)
        with tempfile.TemporaryDirectory() as directory:
            receipt=Path(directory)/"receipt.json";redacted=Path(directory)/"redacted.json"
            created=self.run_cli(["--format","json","inspect","-","--receipt",str(receipt)],text);self.assertEqual(created.returncode,0,created.stderr);self.assertEqual(stat.S_IMODE(receipt.stat().st_mode),0o600)
            changed=self.run_cli(["--format","json","receipt","redact",str(receipt),"--output",str(redacted)]);self.assertEqual(changed.returncode,0,changed.stderr)
            checked=self.run_cli(["--format","json","receipt","verify",str(redacted)]);self.assertEqual(checked.returncode,0,checked.stderr);self.assertTrue(json.loads(checked.stdout)["valid"])
    def test_exit_codes_and_no_traceback(self):
        version=self.run_cli(["--version"]);self.assertEqual(version.returncode,0);self.assertEqual(version.stdout,"0.3.0\n")
        result=self.run_cli(["receipt","verify","missing.json"]);self.assertEqual(result.returncode,2);self.assertNotIn("Traceback",result.stderr)

    def test_model_profiles_are_explicit_offline_and_unbundled(self):
        result=self.run_cli(["--format","json","model","list"]);self.assertEqual(result.returncode,0,result.stderr)
        value=json.loads(result.stdout);self.assertEqual(value["recommended"],"int8");self.assertEqual(value["network"],"disabled")
        self.assertEqual(value["profiles"]["int8"]["bytes"],34301767);self.assertFalse(value["profiles"]["int8"]["bundled"])
        self.assertEqual(value["profiles"]["fp32"]["bytes"],133766349);self.assertFalse(value["profiles"]["fp32"]["bundled"])
        plan=self.run_cli(["--format","json","model","plan"]);self.assertEqual(plan.returncode,0,plan.stderr);plan_value=json.loads(plan.stdout)
        self.assertEqual(plan_value["download_bytes"],34533275);self.assertEqual(plan_value["download_label"],"34.5 MB");self.assertIn("only after both consent",plan_value["network"])
        with tempfile.TemporaryDirectory() as directory:
            denied=self.run_cli(["--format","json","model","install","--output",str(Path(directory)/"model")])
            self.assertEqual(denied.returncode,5);self.assertEqual(json.loads(denied.stdout)["download_label"],"34.5 MB");self.assertIn("consent_required",denied.stderr)

    @unittest.skipUnless(os.environ.get("OACI_TEST_CYCLE5_MODEL_DIR"),"set OACI_TEST_CYCLE5_MODEL_DIR to a verified model pack")
    def test_direct_model_inspection_renders_complete_html(self):
        text="This report records named evidence, dates and costs so another reviewer can examine the claim. "*16
        result=self.run_cli(["--format","html","inspect","-","--model-dir",os.environ["OACI_TEST_CYCLE5_MODEL_DIR"]],text)
        self.assertEqual(result.returncode,0,result.stderr)
        for marker in ("Opace AI Content Checker & Detector","Three independent readings","How each part of the draft scored","Why it reads this way","Protected details, file origin and watermarks","Every check that ran, and what it cannot tell you","Complete machine record","Evidence, not guarantees","not a percentage of the text"):
            self.assertIn(marker,result.stdout)

    def test_protect_compare_bounds_quiet_and_held_commands(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"source.txt";candidate=Path(directory)/"candidate.txt";locks=Path(directory)/"locks.json";large=Path(directory)/"large.txt"
            source.write_text("Price £10.",encoding="utf-8");candidate.write_text("Price changed.",encoding="utf-8");large.write_text("x"*250001,encoding="utf-8")
            extracted=self.run_cli(["--format","json","protect","extract",str(source),"--output",str(locks)]);self.assertEqual(extracted.returncode,0,extracted.stderr);self.assertTrue(json.loads(locks.read_text())["protected_spans"])
            validated=self.run_cli(["--format","json","protect","validate",str(source),str(candidate),"--locks",str(locks),"--fail-on-gate"]);self.assertEqual(validated.returncode,4,validated.stderr)
            compared=self.run_cli(["--format","json","compare",str(source),str(candidate),"--fail-on-gate"]);self.assertEqual(compared.returncode,4,compared.stderr);self.assertEqual(json.loads(compared.stdout)["candidates"][0]["diff"]["candidate_hash"],"sha256:4b75a85c8cb6d61058368c2a972581a7f23abe001233eb55bf3b9e58c51de8ef")
            self.assertEqual(self.run_cli(["inspect",str(large)]).returncode,2)
            quiet=self.run_cli(["--quiet","inspect",str(source)]);self.assertEqual(quiet.returncode,0);self.assertEqual(quiet.stdout,"")
        for args in (["improve"],["watermark","lab"],["benchmark"]):self.assertEqual(self.run_cli(args).returncode,3,args)
        self.assertEqual(self.run_cli(["serve"]).returncode,2)
        self.assertEqual(self.run_cli(["--config","x","inspect","-"]).returncode,2)
        self.assertEqual(self.run_cli(["--cache-dir","x","inspect","-"]).returncode,2)
        self.assertEqual(self.run_cli(["--offline","serve"]).returncode,2)

    def test_receipt_render_rejects_tampering(self):
        with tempfile.TemporaryDirectory() as directory:
            receipt=Path(directory)/"receipt.json";created=self.run_cli(["inspect","-","--receipt",str(receipt)],"Evidence");self.assertEqual(created.returncode,0,created.stderr)
            value=json.loads(receipt.read_text());value["source"]["content_hash"]="sha256:"+"f"*64;receipt.write_text(json.dumps(value))
            rendered=self.run_cli(["receipt","render",str(receipt)]);self.assertEqual(rendered.returncode,2);self.assertEqual(rendered.stdout,"");self.assertNotIn("Traceback",rendered.stderr)

    def test_readme_quick_start_commands_are_valid(self):
        readme=(Path(__file__).parents[2]/"README.md").read_text(encoding="utf-8")
        self.assertIn("opace-ai-checker protect extract article.txt",readme)
        self.assertIn("opace-ai-checker receipt verify receipt.json",readme)
        with tempfile.TemporaryDirectory() as directory:
            article=Path(directory)/"article.txt";locks=Path(directory)/"locks.json";receipt=Path(directory)/"receipt.json"
            article.write_text("Opace evidence costs £10.",encoding="utf-8")
            self.assertEqual(self.run_cli(["protect","extract",str(article),"--output",str(locks)]).returncode,0)
            self.assertEqual(self.run_cli(["inspect",str(article),"--receipt",str(receipt)]).returncode,0)
            self.assertEqual(self.run_cli(["receipt","verify",str(receipt)]).returncode,0)


if __name__ == "__main__": unittest.main()
