# ADR 0005: Unsupported Anthropic method fields

Status: accepted and source specification reconciled  
Date: 2026-08-26

Spec 01 §10.2 shows `version`, `started_at` and `completed_at` as null for the unsupported Anthropic row. The higher-authority canonical Spec 04 §§6.5 and 10.3 says version, timestamps and route are always present and supplies non-null placeholder values. The schema and TypeScript declaration follow Spec 04: `version: "unavailable-2026-08-26"`, identical start/completion timestamps, `status: "unsupported"`, no score/threshold.

Spec 01 and its validation log were reconciled on 26 August 2026 so future WordPress implementers do not reproduce the lower-level null example.
