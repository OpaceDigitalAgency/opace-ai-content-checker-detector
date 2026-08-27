from __future__ import annotations

import json
from importlib.resources import files
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

SCHEMA_VERSION = "1.0"
CONTRACT_VERSION = "1.0.0"

_schemas = [json.loads(path.read_text(encoding="utf-8")) for path in files("opace_integrity").joinpath("contracts/schemas").iterdir() if path.name.endswith(".schema.json")]
_registry = Registry().with_resources((schema["$id"], Resource.from_contents(schema)) for schema in _schemas)
VALIDATORS = {schema["$id"].rsplit("/", 1)[-1]: Draft202012Validator(schema, registry=_registry, format_checker=FormatChecker()) for schema in _schemas}


class ContractError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def validate(name: str, value: Any) -> None:
    errors = sorted(VALIDATORS[name].iter_errors(value), key=lambda error: list(error.absolute_path))
    if errors:
        path = ".".join(str(item) for item in errors[0].absolute_path) or "$"
        raise ContractError("invalid_request", f"Contract validation failed at {path}.")
    if isinstance(value, dict):
        schema_version = value.get("schema_version")
        contract_version = value.get("contract_version")
        if schema_version is not None and schema_version != SCHEMA_VERSION:
            raise ContractError("unsupported_schema", "Only schema version 1.0 is supported.")
        if contract_version is not None and not str(contract_version).startswith("1."):
            raise ContractError("contract_incompatible", "Only contract major version 1 is supported.")


def safe_validation_errors(name: str, value: Any) -> list[dict[str, str]]:
    return [{"code": "invalid_request", "path": ".".join(str(item) for item in error.absolute_path) or "$"} for error in sorted(VALIDATORS[name].iter_errors(value), key=lambda error: list(error.absolute_path))]
