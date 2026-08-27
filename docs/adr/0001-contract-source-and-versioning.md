# ADR 0001: JSON Schema is the contract source

Status: accepted for Phase 0 candidate  
Date: 2026-08-26

## Decision

Draft 2020-12 JSON Schemas under `schemas/v1/` are the only wire-format source of truth. Every envelope carries `schema_version: 1.0` and a compatible `contract_version: 1.x.y`. TypeScript, PHP and Python declarations are generated or reviewed mappings and must pass the same fixtures.

## Consequences

Unknown additive fields may be ignored only where the relevant schema allows them. A breaking field, status meaning or operation requires a new contract/schema major. Method versions remain independent and old receipts are immutable.

