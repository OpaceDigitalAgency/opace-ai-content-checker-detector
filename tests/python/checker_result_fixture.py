from __future__ import annotations

import json
from pathlib import Path

from opace_integrity.contracts import ContractError, validate


ROOT = Path(__file__).resolve().parents[2]


valid = json.loads((ROOT / "fixtures/contracts/valid/checker-result.json").read_text(encoding="utf-8"))
validate(valid["schema"], valid["data"])

invalid = json.loads((ROOT / "fixtures/contracts/invalid/checker-result-share-content.json").read_text(encoding="utf-8"))
try:
    validate(invalid["schema"], invalid["data"])
except ContractError:
    pass
else:
    raise AssertionError("content-bearing share fixture must fail the Python schema copy")

print("python checker result contract: valid/invalid fixtures passed")
