# ADR 0003: Service and WordPress identities

Status: accepted for Phase 0 candidate  
Date: 2026-08-26

- Local service origin: `http://127.0.0.1:8741`; loopback only in v1.
- REST namespace: `oaci/v1`.
- Admin location: `admin.php?page=oaci-lab`.
- PHP facade: `Opace\ContentIntegrity\Integration\PublicApi::instance()` after `plugins_loaded`.
- Readiness event: `do_action('oaci_ready', PublicApi::instance())`.

Hub and AI-Scribe integrations are future lanes and cannot begin until their accepted heads and clean worktrees are owner recorded.

