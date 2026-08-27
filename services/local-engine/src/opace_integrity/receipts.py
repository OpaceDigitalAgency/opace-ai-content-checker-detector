from __future__ import annotations

import hashlib
from copy import deepcopy
from typing import Any

import rfc8785

from .contracts import safe_validation_errors


def verify_receipt(receipt: Any) -> list[dict[str, str]]:
    errors = safe_validation_errors("integrity-receipt.schema.json", receipt)
    if errors or not isinstance(receipt, dict):
        return errors or [{"code": "invalid_request", "path": "$"}]
    unsigned = deepcopy(receipt)
    integrity = unsigned.get("integrity", {})
    supplied = integrity.pop("payload_hash", None)
    integrity.pop("signature", None)
    try:
        expected = "sha256:" + hashlib.sha256(rfc8785.dumps(unsigned)).hexdigest()
    except (TypeError, ValueError):
        return [{"code": "invalid_request", "path": "$"}]
    if supplied != expected:
        errors.append({"code": "invalid_request", "path": "integrity.payload_hash"})
    return errors
