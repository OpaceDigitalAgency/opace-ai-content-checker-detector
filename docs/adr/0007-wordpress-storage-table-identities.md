# ADR 0007: Canonical WordPress storage table identities

Status: accepted for the local v1 candidate; effective only after G2  
Decision: DEC-23  
Accepted by: integration owner, 2026-08-26  
Date: 2026-08-26

## Context

The planning set names two incompatible WordPress table layouts.

- Specification 04 §12.1, the higher-authority cross-surface architecture under Specification 08 §3, says to use `$wpdb->prefix` and defines the exact initial tables `opace_ci_jobs` and `opace_ci_receipts`. Jobs carry opaque ID, owner/caller, state/route, hashes, bounded payload/result references, error and lifecycle fields. Receipts carry opaque/job/owner/caller identity, hashes, content flag, canonical receipt JSON and lifecycle fields.
- Specification 01 §11.1, the WordPress surface specification, sketches `oaci_sessions`, `oaci_candidates` and `oaci_receipts`, with source/candidate content stored directly in session/candidate rows.
- Both require prefixed, per-site storage, additive/idempotent migrations, safe retention and no full receipt content by default.

Specification 08 §3 places Specification 04 before the surface specification and requires a DEC-00 ADR rather than a convenient local choice. Specification 08 assigns one writer to WP-20 migrations, storage and `PublicApi`.

WordPress's current Plugin Handbook says custom table names use the site's actual `$wpdb->prefix`, and recommends `dbDelta()` plus a stored database schema version for create/update work. On Multisite, `$wpdb->prefix`/`$wpdb->get_blog_prefix( $blog_id )` includes the blog identity while `$wpdb->base_prefix` is network-wide. See [Creating Tables with Plugins](https://developer.wordpress.org/plugins/creating-tables-with-plugins/), [`wpdb`](https://developer.wordpress.org/reference/classes/wpdb/) and [`wpdb::get_blog_prefix()`](https://developer.wordpress.org/reference/classes/wpdb/get_blog_prefix/).

No WordPress product migration has been authorised and no released Opace AI Content Integrity schema exists. Prototype, manually created or future pre-release tables must nevertheless be treated as user data until proved empty and disposable.

## Proposed decision

The canonical v1 WordPress table suffixes are exactly:

```text
opace_ci_jobs
opace_ci_receipts
```

Their physical names are resolved at runtime as:

```text
$wpdb->prefix . 'opace_ci_jobs'
$wpdb->prefix . 'opace_ci_receipts'
```

For an explicitly targeted Multisite blog, the equivalent resolver is `$wpdb->get_blog_prefix( $blog_id )` plus the same suffix. Never use `$wpdb->base_prefix` for these per-site tables. Never interpolate a request-controlled prefix, table or column name.

The `opace_ci_` suffix namespace is retained because:

1. Specification 04 is the governing cross-surface architecture and calls these the exact initial tables.
2. `opace_ci_` is descriptive and less collision-prone than the shorter `oaci_` suffix when several unrelated plugins share one database.
3. `$wpdb->prefix` still honours non-default site prefixes and supplies per-blog isolation on Multisite.
4. The two-table layout keeps working payload/candidate lifecycle behind job-owned bounded references and keeps immutable canonical receipts separate.
5. REST `/sessions/...` resources and `PublicApi` session methods are service vocabulary, not database table promises. In v1 a session maps to one job `public_id`; candidate state belongs to that job's bounded result payload. Internal persistence may change in a later additive migration without changing the v1 wire API.

Do not create `oaci_sessions`, `oaci_candidates`, `oaci_receipts`, a third canonical candidate table or aliases/views in a fresh v1 install. Centralise the two suffixes in one internal table-name resolver so repositories, retention, health, uninstall and tests cannot drift.

This decision chooses table identity and ownership only. Exact columns remain governed by Specification 04 §12.1 and the frozen contracts. Payload storage/encryption and retention duration still require their existing reviews; a `payload_ref` or `result_ref` must never become a public path or an excuse to store content without consent.

## Alternatives considered

### A. Use the Specification 01 three-table `oaci_*` sketch

Rejected for v1. It conflicts with the higher-order exact table clause, uses a shorter collision namespace and makes source/candidate content rows the default shape before retention/encryption decisions close. Its useful session/candidate concepts remain domain/API concepts over the canonical job record.

### B. Rename the three-table layout to `opace_ci_sessions`, `opace_ci_candidates`, `opace_ci_receipts`

Rejected for v1. The names improve collision resistance but still invent a third initial table and replace the governing `jobs` identity without a demonstrated storage need. A separately reviewed additive candidate table can be introduced later if measured query/locking/retention requirements justify it.

### C. Create both table sets and dual-write

Rejected. Dual-write introduces split-brain, partial failure and unclear uninstall/retention ownership. It makes a planning conflict permanent and complicates source-hash/idempotency guarantees.

### D. Store everything in WordPress options, post meta or custom posts

Rejected. Unbounded job/candidate/receipt data would pollute generic stores, complicate actor/expiry indexes and risk exposing internal workflow state through unrelated APIs.

## Collision and Multisite rules

- Resolve names only from the current/explicit blog prefix plus a hard-coded suffix.
- Treat tables as per-site. Site A cannot query Site B by changing a request field; any administrative network operation must explicitly switch blog context, restore it and re-run capability checks.
- A fresh-site activation creates only that site's approved tables. Network activation/future-site provisioning remains blocked until DEC-16 is approved and tested.
- Check for an existing table before migration, but never infer ownership from a matching suffix alone. Ownership requires the plugin's schema/version marker and expected columns.
- `dbDelta()` create/update SQL is deterministic, uses the current charset/collation and is covered by an idempotency test. Destructive DDL is not part of an ordinary upgrade.

## Zero-data-loss transition rule

The following rule applies to any database containing one or more legacy/conflicting tables named with the current blog prefix plus `oaci_sessions`, `oaci_candidates` or `oaci_receipts`.

1. **Detect before write.** Inventory canonical and legacy tables, schema markers, row counts and non-content checksums/ID ranges before creating or altering anything.
2. **Empty and unowned is not assumed.** If a legacy table has rows, an unknown schema or no trustworthy ownership marker, the plugin enters a content-free `legacy_storage_detected` read-only/update-required state. It performs no new job write, rename, drop or automatic destructive conversion.
3. **Migration is additive and separately versioned.** A future approved migrator first creates the canonical tables, leaves every legacy table intact and records a resumable checkpoint outside user payloads.
4. **Copy in bounded batches.** It maps each legacy session to one canonical job/public ID, preserves actor/source ownership, exact hashes, timestamps, state and expiry, and moves candidate/session payloads only under the approved retention/encryption policy. Receipts are revalidated against the frozen schema and retain their original canonical bytes/hash; they are not silently regenerated.
5. **No dual-write.** During the bounded transition, new mutations are paused or written only after the relevant legacy rows have been checkpointed. Reads may fall back to legacy data until its canonical copy is verified, but a record has one authoritative writer.
6. **Verify before cutover.** Require row/group counts, public-ID uniqueness, ownership, receipt hash parity and sampled/full payload hash parity as appropriate. Interruption resumes from the last committed checkpoint without recopying or deleting the source.
7. **Cut over without deletion.** Mark canonical storage active only after verification. Keep legacy tables read-only and recorded. No release automatically drops them; later removal requires a backup/export or explicit owner-approved cleanup policy and a successful post-cutover observation period.
8. **Uninstall remains explicit.** Only the existing delete-data opt-in may remove positively identified plugin-owned canonical or legacy tables. Deactivation never removes either set.

Because no released legacy schema currently exists, the normal v1 path is a clean creation of the two canonical tables. The transition rule is still mandatory in tests so a pre-release/manual table cannot be overwritten or lost.

## Backwards-compatibility consequences

- No change is required to canonical JSON schemas, REST routes, session UUIDs, `PublicApi`, status semantics or receipts.
- A session remains an API/domain abstraction mapped to a job `public_id`; internal numeric IDs never cross the API boundary.
- Same-major clients cannot observe table names. Stored `oaci_db_version`, contract version and product version remain distinct.
- A newer database version causes an older plugin to fail closed into read-only/update-required mode; it never downgrades or recreates tables.
- If a later candidate table is needed, it must be additive, versioned and preserve old job/receipt reads until migration verification completes.

## Affected implementation and tests

After G2 and acceptance of this ADR, WP-20 owns the changes in `Core/Migrator.php`, `Storage/JobRepository.php`, `Storage/ReceiptRepository.php`, retention, health, uninstall and storage integration tests. WP-10 must not create tables in advance.

Required tests are:

1. non-default WordPress prefix produces only `<prefix>opace_ci_jobs` and `<prefix>opace_ci_receipts`;
2. Multisite blog prefixes isolate otherwise identical public IDs and no table uses `base_prefix` accidentally;
3. fresh create plus repeated `dbDelta()`/version check is idempotent;
4. a colliding/unowned table fails closed without DDL or writes;
5. legacy-only, canonical-only and both-sets-present detection has the declared state;
6. non-empty legacy tables are never renamed, truncated or dropped by activation/upgrade;
7. interrupted batch copy resumes without duplicates and preserves public IDs, ownership, hashes, timestamps and expiry;
8. receipt JSON and RFC 8785/SHA-256 remain byte-identical after transition;
9. candidate/session payload migration obeys content consent and retention;
10. newer DB version blocks writes and displays a content-free update requirement;
11. deactivation retains data; uninstall retain/delete choices affect only positively identified plugin-owned tables;
12. Hub, AI-Scribe, posts, revisions, users and unrelated prefix-matching tables remain untouched.

## Consequences

The v1 storage identity is deterministic, per-site and consistent with the governing architecture. WP-20 has fewer tables and a clean separation between mutable job payloads and immutable receipts. The cost is that session/candidate query patterns must be implemented through the job/result abstraction, and any later need for independently indexed candidates requires an additive ADR/migration rather than silently adopting the Specification 01 sketch.

## Decision record

On 26 August 2026 the integration owner accepted all five points below for the local v1 candidate:

1. canonical v1 suffixes are `opace_ci_jobs` and `opace_ci_receipts`;
2. physical tables use the current/per-blog `$wpdb` prefix, never `base_prefix`;
3. v1 has no separate candidate table; session/candidate REST concepts map to job-owned storage;
4. conflicting non-empty `oaci_*` tables trigger the zero-data-loss read-only transition rule and are never automatically dropped;
5. DEC-23 and the decision register mark this ADR accepted and instruct WP-10/WP-20 agents to use it after G2.

This decision is dormant until G2 is accepted. It does not by itself authorise WordPress migration or product implementation, and it does not approve a legacy-data migration. Any `oaci_*` migration remains a separately approved, zero-data-loss change.
