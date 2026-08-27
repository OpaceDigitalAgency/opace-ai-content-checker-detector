# Owner decisions still open

These do not block the local Phase 0 skeleton unless stated, but they block the affected implementation or release gate.

| Decision | Current recommendation | Blocks |
|---|---|---|
| Final public repository and registry names | Verify `OpaceDigitalAgency` access and name availability read-only before creation | Public repository/packages |
| Final canonical URLs | Re-verify active Astro source and live route conventions | Web implementation/release |
| Local installation | Docker plus documented Python virtual environment; native installers later | Local distribution |
| Benchmark corpus/data terms and DOI/archive | Legal/owner approval before freezing public corpus | Index/claims |
| Receipt retention and content-bearing storage | Hash-only default; approve duration and reviewed encryption before full content | WordPress/local persistence |
| First semantic model and detector | Choose after licence, model-card, CPU and measured false-positive review | Local methods/claims |
| Remote/LAN pairing | Keep out of v1 | Any non-loopback service |
| Multisite network activation | Per-site first | WordPress network support |
| AI-Scribe future branch | Record frozen verified accepted head, then approve fresh worktree | SCRIBE-00/20 |
| AI Hub future branch | Record frozen verified accepted head, then approve fresh worktree | HUB-20 |

Current read-only observations supplied by the orchestration lead on 26 August 2026 are compatibility evidence only: Hub working source is clean `main` aligned with `origin/main` and reports 1.0.14; AI-Scribe reports 3.2.36 on `codex/dependency-installer-3.2.32`, ahead by two commits with untracked `.wp-env.override.json`. Neither is an accepted release base. Do not edit either checkout.

