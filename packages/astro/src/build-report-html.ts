/**
 * The printable page for the unattended build scan.
 *
 * This is deliberately NOT the checker. A build runs no model, sends nothing
 * anywhere and reads no draft on anyone's behalf, so the AI-pattern reading is
 * `not_assessed` and the page says so at the top. What it does carry is the
 * deterministic evidence: one opaque identifier per route, the content hash,
 * the word count, and every named check with its version and status.
 *
 * The styling is the shared product stylesheet, so a build scan and a toolbar
 * reading are recognisably the same product without the scan pretending to be
 * a reading.
 */
import { PRODUCT_LOGO_DATA_URI, PRODUCT_NAME, PRODUCT_TAGLINE, escapeResultHtml } from '../../../shared/presentation/checker-result-presentation.mjs';
import { CHECKER_UI_CSS } from '../../../shared/presentation/checker-ui-css.mjs';
import type { AstroIntegrityReport } from './report.js';

const e = (value: unknown): string => escapeResultHtml(value);

/** Page-level rules for the scan. Every value comes from the shared tokens. */
const PAGE_CSS = `
:root{color-scheme:light dark}
body{margin:0;background:var(--oaci-paper,#f2ede6)}
.oacit-page{max-width:1100px;margin:0 auto;padding:0 0 56px}
.oacit-page .oaci-panel{margin:22px clamp(16px,3vw,30px)}
.oacit-lede{margin:22px 0 0!important;padding:0 clamp(16px,3vw,30px)!important;font-size:var(--oaci-text-md);color:var(--oaci-ink-soft)}
.oacit-scan-note{border-left:4px solid var(--oaci-orange)}
.oacit-page .oaci-panel>p{margin:0 0 12px!important}
.oacit-page .oaci-panel>p:last-child{margin-bottom:0!important}
.oacit-page h1{margin:0!important;font:800 var(--oaci-text-2xl)/1.1 var(--oaci-font-display);letter-spacing:-.02em}
.oacit-page h2{margin:0 0 12px!important;font:700 var(--oaci-text-xl)/1.2 var(--oaci-font-display);letter-spacing:-.01em}
.oacit-page h3{margin:22px 0 8px!important;font:700 var(--oaci-text-lg)/1.25 var(--oaci-font-display)}
.oacit-table{width:100%;border-collapse:collapse;font-size:var(--oaci-text-sm)}
.oacit-table caption{margin-bottom:10px;text-align:left;color:var(--oaci-note);font-size:var(--oaci-text-sm)}
.oacit-table th,.oacit-table td{padding:9px 12px;border-bottom:1px solid var(--oaci-line);text-align:left;vertical-align:top}
.oacit-table thead th{border-bottom:2px solid var(--oaci-line-strong);font-size:var(--oaci-text-xs);letter-spacing:.07em;text-transform:uppercase;color:var(--oaci-note)}
.oacit-table tbody tr:last-child th,.oacit-table tbody tr:last-child td{border-bottom:0}
.oacit-table code{font-family:var(--oaci-font-mono);font-size:var(--oaci-text-xs);overflow-wrap:anywhere}
.oacit-table td b{font-weight:700;font-variant-numeric:tabular-nums}
.oacit-status{display:inline-block;padding:2px 9px;border-radius:999px;background:var(--oaci-ok-bg);color:var(--oaci-ok);font-size:var(--oaci-text-xs);font-weight:800}
.oacit-status[data-status=attention],.oacit-status[data-status=inconclusive]{background:var(--oaci-watch-bg);color:var(--oaci-watch)}
.oacit-status[data-status=fail],.oacit-status[data-status=error]{background:var(--oaci-bad-bg);color:var(--oaci-bad)}
.oacit-status[data-status=unsupported],.oacit-status[data-status=not_configured],.oacit-status[data-status=not_run]{background:var(--oaci-inset);color:var(--oaci-note)}
.oacit-record{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px 22px;margin:0;font-size:var(--oaci-text-sm)}
.oacit-record dt{color:var(--oaci-note);font-size:var(--oaci-text-xs);letter-spacing:.06em;text-transform:uppercase}
.oacit-record dd{margin:2px 0 0!important;font-family:var(--oaci-font-mono);overflow-wrap:anywhere}
@media print{
  body{background:#fff}
  .oaci-mast{border-bottom-width:2px}
  .oacit-page .oaci-panel{margin:14px 0;box-shadow:none;break-inside:avoid}
  .oacit-lede{margin:14px 0!important;padding:0!important}
}
`;

const statusChip = (status: string): string => `<span class="oacit-status" data-status="${e(status)}">${e(status.replaceAll('_', ' '))}</span>`;

const counts = (title: string, values: Record<string, number>): string => {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  if (!entries.length) return `<p class="oaci-note">${e(title)}: none.</p>`;
  return `<p class="oaci-note">${e(title)}: ${entries.map(([key, value]) => `${e(key)} ×${e(value)}`).join(', ')}.</p>`;
};

/** Render the complete printable build-scan page. Deterministic for a given report. */
export function renderBuildReportHtml(report: AstroIntegrityReport): string {
  const routes = report.routes.map((route) => `
      <tr>
        <th scope="row"><code>${e(route.route_id)}</code></th>
        <td><code>${e(route.source_hash)}</code></td>
        <td><b>${e(route.word_count)}</b></td>
        <td>${route.methods.map((method) => `<div><code>${e(method.id)}</code> · <code>${e(method.version)}</code> ${statusChip(method.status)}</div>`).join('')}</td>
        <td>${counts('Protected', route.protected_counts)}${counts('Writing patterns', route.pattern_counts)}${route.truncated ? '<p class="oaci-note">Only the first part of this route was scanned; the character limit was reached.</p>' : ''}</td>
      </tr>`).join('');

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(PRODUCT_NAME)} — build scan</title>
<style>${CHECKER_UI_CSS}${PAGE_CSS}</style>
</head>
<body>
<main class="oaci-result oacit-page">
  <header class="oaci-mast">
    <span class="oaci-mast__logo"><img src="${PRODUCT_LOGO_DATA_URI}" alt="" width="44" height="44"></span>
    <div>
      <p class="oaci-kicker">Deterministic build scan</p>
      <h1>${e(PRODUCT_NAME)}</h1>
      <p class="oaci-note">${e(PRODUCT_TAGLINE)} · ${e(report.routes.length)} route${report.routes.length === 1 ? '' : 's'} scanned</p>
    </div>
  </header>

  <p class="oacit-lede">This page is the unattended scan an Astro build runs over its own generated
  HTML. It is not the checker.</p>

  <section class="oaci-panel oacit-scan-note">
    <h2>What this scan is, and is not</h2>
    <p>No trained model ran, so the AI-pattern reading is <strong>not assessed</strong>. Nothing was
    sent anywhere, no page text is written to this report, and a build never fails on a finding.
    What you get here is the deterministic evidence: an opaque identifier for each route, the hash of
    the text that was read, the word count, and every named check with its version and outcome.</p>
    <p class="oaci-note">For the complete reading — the model's five-band level, section scores,
    passages, evidence and a printable report — open the Content Integrity panel in the Astro dev
    toolbar while running <code>astro dev</code>. That is the full checker; this is build support.</p>
  </section>

  <section class="oaci-panel">
    <h2>Routes</h2>
    <div class="oaci-scroll" tabindex="0" role="region" aria-label="Scanned routes">
      <table class="oacit-table">
        <caption>Route identifiers are hashes of the output path. The path itself is never written.</caption>
        <thead><tr><th scope="col">Opaque route</th><th scope="col">Content hash</th><th scope="col">Words</th><th scope="col">Named checks</th><th scope="col">Counts</th></tr></thead>
        <tbody>${routes || '<tr><td colspan="5">No generated route matched the include patterns.</td></tr>'}</tbody>
      </table>
    </div>
  </section>

  <section class="oaci-panel">
    <h2>What this cannot tell you</h2>
    <ul class="oaci-limits">${report.limitations.map((item) => `<li>${e(item)}</li>`).join('')}</ul>
  </section>

  <section class="oaci-panel">
    <h2>Run record</h2>
    <dl class="oacit-record">
      <div><dt>Mode</dt><dd>${e(report.mode)}</dd></div>
      <div><dt>Package</dt><dd>${e(report.package_version)}</dd></div>
      <div><dt>Contract</dt><dd>${e(report.contract_version)}</dd></div>
      <div><dt>Schema</dt><dd>${e(report.schema_version)}</dd></div>
      <div><dt>Route</dt><dd>${e(report.privacy_route)}</dd></div>
      <div><dt>Carries page text</dt><dd>${report.contains_content ? 'yes' : 'no'}</dd></div>
      <div><dt>Stamped</dt><dd>${e(report.generated_at)}</dd></div>
      <div><dt>AI-pattern reading</dt><dd>not_assessed</dd></div>
    </dl>
  </section>
</main>
</body>
</html>
`;
}
