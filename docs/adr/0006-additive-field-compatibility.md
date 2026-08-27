# ADR 0006: Reader tolerance and producer discipline

Status: accepted for Phase 0 candidate  
Date: 2026-08-26

Spec 04 §5 requires consumers on the same contract major to ignore unknown additive fields. Public wire schemas therefore allow unknown properties while continuing to require and type all v1 fields they know. The former expected-invalid unknown-field fixture is now a valid compatibility fixture.

Producers must emit only fields defined by the schema/version they claim. That is a separate strict producer lint/type-generation rule; it must not make readers reject a compatible newer-minor payload. Security-sensitive maps still validate all known security/route/status fields, and no unknown field may override or reinterpret a known field.

