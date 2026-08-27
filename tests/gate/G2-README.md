# G2 core and browser gate

This is an independent, consumer-facing gate for the frozen G2 boundary. It imports only published package entry points for behaviour checks and separately scans source/manifests for offline and lifecycle invariants. Assertions are intentionally stricter than package-local unit tests.

Run from the `ai-content-integrity` repository root:

```sh
node tests/gate/g2-core-gate.mjs
```

The gate requires Node.js, npm and Chromium via Playwright. In the Codex workspace it discovers the bundled Playwright runtime. Elsewhere, install Playwright outside the product dependency graph and set `PLAYWRIGHT_MODULE` to its `index.mjs` file. The gate starts a loopback-only disposable static server for the real-browser probe; it makes no external request.

Coverage includes:

- package-local builds, export resolution and SSR/Node/browser imports;
- no fetch, transport, telemetry, install hook or post-install side effect;
- UTF-16/code-point ranges, hashes, legitimate-script negatives, mixed-script homoglyphs and invalid surrogates;
- deterministic HTML/entity projection, malformed input and source-map monotonicity;
- protected span extraction and hard damage, duplication, addition and stale-source gates;
- deterministic patterns, bounded diff fallback/memory and immutable outputs;
- safe-fix allowlist, provenance, overlap and protected-span locks;
- JCS-stable receipts, rehashed malformed-schema attacks, rewrite content-consent consistency, tamper detection and contract-major failure;
- Worker asset resolution, progress, pre-start cancellation, disposal, real module-worker execution, hidden/aria-hidden DOM ancestors and block/BR separation in Chromium, Firefox and WebKit;
- 375×812 Chromium at 4× CPU throttling, cold/warm percentiles, Long Task observation and offline request interception;
- 10,000-word desktop and 50,000-character latency budgets, representative receipt size/hash, gzip bundle size and exact dry-pack inventories;
- the full frozen G1 contract gate and project regression suite.

Any failed assertion blocks G2. Do not suppress, skip or relax an assertion to accommodate an implementation. Correct the candidate or record an explicit integration-lead decision against the frozen brief.
