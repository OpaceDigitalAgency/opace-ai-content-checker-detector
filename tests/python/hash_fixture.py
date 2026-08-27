import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
import rfc8785

ROOT = Path(__file__).resolve().parents[2]
schemas = [json.loads(path.read_text(encoding="utf-8")) for path in (ROOT / "schemas/v1").glob("*.schema.json")]
registry = Registry().with_resources((schema["$id"], Resource.from_contents(schema)) for schema in schemas)
validators = {Path(schema["$id"]).name: Draft202012Validator(schema, registry=registry) for schema in schemas}

def protected_span_semantics(item):
    utf16_length = len(item["text"].encode("utf-16-le")) // 2
    return (
        item["end_utf16"] > item["start_utf16"]
        and item["end_codepoint"] > item["start_codepoint"]
        and item["end_utf16"] - item["start_utf16"] == utf16_length
        and item["end_codepoint"] - item["start_codepoint"] == len(item["text"])
        and item["content_hash"].startswith("sha256:")
        and len(item["content_hash"]) == 71
    )

for kind, expected in (("valid", True), ("invalid", False)):
    for path in (ROOT / f"fixtures/contracts/{kind}").glob("*.json"):
        fixture = json.loads(path.read_text(encoding="utf-8"))
        valid = validators[fixture["schema"]].is_valid(fixture["data"])
        if valid and (fixture["schema"] == "protected-span.schema.json" or fixture.get("semantic") == "protected_span_offsets"):
            valid = protected_span_semantics(fixture["data"])
        assert valid is expected, f"{path.name}: expected valid={expected}"

for path in (ROOT / "fixtures/contracts/hash").glob("*.json"):
    vector = json.loads(path.read_text(encoding="utf-8"))
    canonical = rfc8785.dumps(vector["value"])
    assert canonical.decode("utf-8") == vector["canonical"]
    assert hashlib.sha256(canonical).hexdigest() == vector["sha256"]

request = json.loads((ROOT / "fixtures/contracts/valid/analysis-request.json").read_text(encoding="utf-8"))["data"]
assert request["schema_version"] == "1.0"
assert request["contract_version"].startswith("1.")
assert set(request["privacy"]["allowed_routes"]) <= {"browser", "wordpress_local", "local_service", "hub_provider", "commercial_byok"}
span = json.loads((ROOT / "fixtures/contracts/valid/protected-span-unicode-offsets.json").read_text(encoding="utf-8"))["data"]
assert protected_span_semantics(span)
assert not protected_span_semantics({**span, "end_utf16": span["start_utf16"]})
assert not protected_span_semantics({**span, "content_hash": "sha256:bad"})
pattern = json.loads((ROOT / "fixtures/contracts/valid/pattern-finding.json").read_text(encoding="utf-8"))["data"]
assert pattern["span"]["end_utf16"] > pattern["span"]["start_utf16"]
assert pattern["span"]["end_codepoint"] > pattern["span"]["start_codepoint"]
print(f"python: {len(schemas)} schemas, all fixtures, and RFC 8785 vectors passed")
