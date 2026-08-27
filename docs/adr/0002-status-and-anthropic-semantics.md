# ADR 0002: Named method states and Anthropic placeholder

Status: accepted for Phase 0 candidate  
Date: 2026-08-26

The canonical method statuses are exactly `pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run` and `error`. No consumer may coerce an unavailable/error state to pass.

The reserved method ID is `watermark.anthropic`. Until an official supported detector is authorised and its semantics are tested, it returns `unsupported`, availability `not_available`, and no score/threshold. Public SynthID, style rules and local detectors remain separately named methods.

