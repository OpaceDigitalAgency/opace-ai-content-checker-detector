# Opace AI Content Integrity for Astro

Inspect visible page text locally, review explainable content-integrity evidence and create hash-only build receipts from one Astro Dev Toolbar integration. The package is report-only: it does not claim to determine authorship, call a detector provider or change source files.

![Opace AI Content Integrity Dev Toolbar showing the Protect and rewrite view](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-content-integrity/main/docs/assets/screenshots/astro-content-integrity-protect-rewrite.png)

## What it includes

- One development-only toolbar app with Check page, Protect & rewrite, Claude readiness, Index, Receipts and Settings views.
- Explicit, user-triggered browser inspection. Nothing scans at install or initial page load.
- Deterministic, hash-only JSON and printable HTML build reports.
- Local safe-fix previews for explainable invisible Unicode. Rewrites are exported for review and never applied to source files.
- Honest unavailable states. Anthropic official text-watermark verification remains `unsupported`; the Index remains `Not configured` until approved data exists.
- Keyboard navigation, reduced-motion support, narrow-panel reflow and status text that does not depend on colour.

## Install

After the package is published, Astro can add it automatically:

```sh
npx astro add @opace/astro-content-integrity
```

For manual setup:

```sh
npm install @opace/astro-content-integrity
```

```js
import { defineConfig } from 'astro/config';
import contentIntegrity from '@opace/astro-content-integrity';

export default defineConfig({
  integrations: [contentIntegrity()],
});
```

Start `astro dev`, open Astro's Dev Toolbar and choose **Opace AI Content Integrity**. Select **Run checks** when you want to inspect the current rendered page.

## Configuration

The defaults are offline, report-only and content-free:

```js
contentIntegrity({
  toolbar: true,
  buildCheck: 'report',
  failOn: ['protected_fact_changed'],
  localService: false,
  include: ['**/*.html'],
  exclude: ['**/404.html', '**/500.html', '**/feed*.html', '**/search*.html', '**/sitemap*.html'],
  reportDirectory: 'content-integrity-report',
  maxCharacters: 50_000,
})
```

| Option | Default | Behaviour |
|---|---|---|
| `toolbar` | `true` | Registers one app during `astro dev`; no production toolbar runtime is emitted. |
| `buildCheck` | `'report'` | Writes deterministic reports and never fails the build. Other values fail closed in 0.1.0. |
| `failOn` | `['protected_fact_changed']` | Reserved deterministic hard-gate list; it does not enable build failure in 0.1.0. |
| `localService` | `false` | Must remain `false`; no service or provider client ships in this release. |
| `include` / `exclude` | safe relative globs | Limits prerendered HTML considered at build time. Absolute and traversing paths are rejected. |
| `reportDirectory` | `'content-integrity-report'` | Relative directory beneath Astro's output directory; symlink escapes are rejected. |
| `maxCharacters` | `50_000` | Upper bound for one rendered document. |

Unknown options, wrong types, unsafe paths, secret-shaped values, `buildCheck: 'fail'` and `localService: true` raise an actionable configuration error.

## Privacy and security

Page inspection runs in a module Worker in the browser. It makes no fetch, XHR, WebSocket, EventSource or beacon request. Results and source text are not placed in cookies, local storage, session storage or IndexedDB. Reloading clears the result.

The default build report contains hashes, counts, method identifiers, limitations and opaque source-relative IDs. It excludes page text, routes, filesystem paths, tokens and toolbar code. Review [SECURITY.md](SECURITY.md) before reporting a vulnerability; do not include private content or credentials in an issue.

## Compatibility

Version 0.1.0 passed Astro 5.18.2, 6.4.8 and 7.2.7 in static, server and hybrid projects. Astro 5 passed on Node 20, 22 and 24; Astro 6 and 7 passed on Node 22 and 24 and follow their upstream Node 22.12 minimum. The package peer range is `>=5.0.0 <8.0.0` and its own Node floor is 20.3.

Dynamic SSR pages without prerendered HTML are not included in the build report. Inspect them explicitly in the development toolbar.

## Accessibility

The six views use a roving tab pattern: Left/Right moves between tabs, focus stays on the selected tab, and each state has visible text. Controls have accessible names and focus indicators. Automated Chromium, Firefox and WebKit checks cover keyboard behaviour, reduced motion, 320/375 px reflow and axe. Platform assistive-technology results are recorded separately from automated checks.

## Troubleshooting

**The toolbar app is missing.** Confirm `toolbar` is not `false`, restart `astro dev`, and check that the integration is in `integrations[]`. It is intentionally absent from preview and production output.

**No route appears in the build report.** Check `include`/`exclude` and confirm the route is prerendered. Runtime-only SSR pages use the toolbar instead.

**Configuration fails after an upgrade.** Remove unknown or held options. This release deliberately rejects local-service and build-failure modes.

**The Index says “Not configured”.** This is the expected state. No benchmark ranking is bundled or implied.

## Support, evidence and licence

- Product documentation: [Opace AI Content Integrity for Astro](https://opace.agency/tools/ai/content-integrity/astro/)
- Privacy: [Opace AI Content Integrity privacy](https://opace.agency/tools/ai/content-integrity/privacy/)
- Support: [Opace AI Content Integrity support](https://opace.agency/tools/ai/content-integrity/support/)
- AI services: [Opace artificial intelligence services](https://opace.agency/services/artificial-intelligence/)
- Source and issues: [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency)
- Security policy: [SECURITY.md](SECURITY.md)
- Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- Software bill of materials: [SBOM.cdx.json](SBOM.cdx.json)

Opace-authored integration code is available under the [MIT Licence](LICENSE). A passing check applies only to the named disclosed method and does not prove human authorship or detector clearance.
