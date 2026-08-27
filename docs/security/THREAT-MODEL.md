# Phase 0 threat-model baseline

Protected assets include source/candidate text, bearer tokens, WordPress nonces, provider credentials, receipts and ownership identifiers.

Trust boundaries:

- browser and WordPress UI to WordPress server;
- WordPress/server client to loopback local engine;
- Hub alone to configured providers;
- optional commercial BYOK adapters, each separately authorised.

Mandatory controls for implementation:

- loopback binding by default; authenticated non-health routes; separate run/admin scopes;
- reject credentials in URLs, redirects to new hosts, encoded/ambiguous IPs, metadata/link-local/multicast destinations and DNS rebinding;
- request/response size and time limits, bounded workers, cooperative cancellation and namespace-scoped opaque IDs;
- no source, candidate, prompt, token, filesystem path, stack trace or provider body in normal logs/errors;
- no model download on activation; explicit plan/licence/hash before install; no network pickle/deserialisation;
- browser checks make no outbound text request; every other route requires disclosed consent;
- hard protected-content gates cannot be overridden by a favourable method score.

Remote/LAN exposure, hosted service operation, content-bearing receipt encryption and commercial adapters require separate threat-model extensions.

