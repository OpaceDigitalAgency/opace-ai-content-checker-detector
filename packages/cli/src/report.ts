/**
 * Branded printable HTML report for a canonical checker result.
 *
 * A canonical checker result is rendered by the shared builder in
 * `src/vendor/report/checker-report-html.mjs`, synced from `shared/report/`. That builder validates
 * the contract and throws rather than rendering a partial page, so this module stays as the report
 * for the inputs it will not accept: the deterministic analysis result and the integrity receipt,
 * which `opace-ai-checker --format html` also renders.
 *
 * The report is self-contained: no script, no external stylesheet, font or image, and no request of
 * any kind. The only outbound references are the Opace product and support destinations required by
 * `CROSS-SURFACE-WEBSITE-PARITY-ACCEPTANCE.md` section 6.1.
 */

import {countPhrase, pluralise} from "./vendor/report/report-model.mjs";

export const PRODUCT_HOME = "https://opace.agency/tools/ai/content-verification-integrity/";
export const PRODUCT_SUPPORT = "https://opace.agency/get-in-touch/";

/** Mirrors `PRODUCT_MARK_SVG` in `shared/presentation/checker-result-presentation.mjs`. */
const PRODUCT_MARK = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g fill="none" stroke="#1ed3ee" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"><rect x="7" y="5" width="35" height="45" rx="5"/><rect x="12" y="12" width="8" height="8" rx="1"/><path d="M25 15h11M25 19h9"/><rect x="12" y="26" width="8" height="8" rx="1"/><path d="M25 29h11M25 33h9"/><rect x="12" y="40" width="8" height="8" rx="1"/><path d="M25 43h8M42 16h6M42 30h6M42 44h6M51 9v39"/><circle cx="51" cy="16" r="4"/><circle cx="51" cy="30" r="4"/><circle cx="51" cy="44" r="4"/></g><g fill="none" stroke="#ff9f2f" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"><rect x="31" y="38" width="27" height="20" rx="4"/><path d="m39 48 4 4 8-9"/></g></svg>';

export const LEVEL_LABELS: Record<string, string> = {
  "signal-likely-human": "Likely human",
  "signal-unclear": "Unclear",
  "signal-potentially-ai": "Potentially AI",
  "signal-likely-ai": "Likely AI",
  "signal-strongly-ai": "Strongly AI",
};

/**
 * Five bands, weakest AI reading first. Each band owns 36 degrees of the dial. Labels and colours
 * mirror `LEVEL_ORDER`, `LEVEL_LABELS` and `LEVEL_COLOURS` in `shared/report/report-model.mjs`.
 */
export const BANDS = [
  { id: "signal-likely-human", label: "Likely human", colour: "#1a7349" },
  { id: "signal-unclear", label: "Unclear", colour: "#6d7877" },
  { id: "signal-potentially-ai", label: "Potentially AI", colour: "#b06603" },
  { id: "signal-likely-ai", label: "Likely AI", colour: "#bf4705" },
  { id: "signal-strongly-ai", label: "Strongly AI", colour: "#a31f17" },
];

const METHOD_STATE_LABELS: Record<string, string> = {
  pass: "No issue found",
  attention: "Review evidence",
  fail: "Failed",
  inconclusive: "Inconclusive",
  unsupported: "Unavailable",
  not_configured: "Not configured",
  not_run: "Not run",
  error: "Error",
};

export const ROUTE_LABELS: Record<string, string> = {
  eu_server: "Opace EU server",
  loopback_engine: "Local engine on this device",
  deterministic_only: "On-device deterministic checks",
  browser_local: "In your browser",
};

export const PRIVACY_ROUTE_LABELS: Record<string, string> = {
  hub_provider: "Opace EU service",
  local_service: "Local service on this device",
  browser: "In your browser",
  none: "No processing route",
};

const READING_LABELS: Record<string, string> = {
  clean: "Clean",
  attention: "Review",
  manipulated: "Manipulation found",
  inconclusive: "Inconclusive",
  none: "No suggestions",
  some: "Some suggestions",
  many: "Many suggestions",
  not_assessed: "Not assessed",
  error: "Error",
};

export function escapeHtml(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

export const levelLabel = (id: unknown): string => LEVEL_LABELS[String(id)] ?? String(id);
const bandIndex = (level: unknown): number => Math.max(0, BANDS.findIndex(band => band.id === String(level)));
const bandColour = (level: unknown): string => BANDS[bandIndex(level)]!.colour;
export const routeLabel = (kind: unknown): string => ROUTE_LABELS[String(kind)] ?? String(kind ?? "not recorded").replace(/_/g, " ");
export const privacyRouteLabel = (route: unknown): string => PRIVACY_ROUTE_LABELS[String(route)] ?? String(route ?? "not recorded").replace(/_/g, " ");
const plainText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;
const words = (value: unknown): string => (Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-GB") : String(value ?? "—"));
/**
 * The protected-facts sentence and the categories sentence, worded exactly as the shared report
 * words them, so the fallback report and the shared report agree on singular and plural.
 */
const protectedSentences = (count: number, categories: unknown): string => {
  const listed = Array.isArray(categories) ? categories.filter(item => typeof item === "string") : [];
  const sentence = count === 0
    ? "No protected items were identified in this draft."
    : `${countPhrase(count, "protected item")} ${pluralise(count, "was", "were")} identified and left untouched.`;
  return listed.length
    ? `${sentence} ${pluralise(listed.length, "Category", "Categories")}: ${listed.join(", ")}.`
    : `${sentence} No categories were recorded.`;
};

const coordinates = (cx: number, cy: number, radius: number, degrees: number): [string, string] => {
  const radians = (degrees * Math.PI) / 180;
  return [(cx + radius * Math.cos(radians)).toFixed(2), (cy - radius * Math.sin(radians)).toFixed(2)];
};
const point = (cx: number, cy: number, radius: number, degrees: number): string => coordinates(cx, cy, radius, degrees).join(" ");

/** Semicircular five-band dial with a needle at the band centre. Drawn, not measured, from the level. */
function dialSvg(level: unknown, assessed: boolean): string {
  const cx = 160, cy = 158, outer = 132, inner = 86;
  const arcs = BANDS.map((band, index) => {
    const from = 180 - index * 36, to = from - 36;
    const d = `M${point(cx, cy, outer, from)}A${outer} ${outer} 0 0 1 ${point(cx, cy, outer, to)}L${point(cx, cy, inner, to)}A${inner} ${inner} 0 0 0 ${point(cx, cy, inner, from)}Z`;
    const current = assessed && band.id === String(level);
    return `<path d="${d}" fill="${band.colour}" fill-opacity="${current ? "1" : "0.26"}"></path>`;
  }).join("");
  const [tipX, tipY] = coordinates(cx, cy, 116, 180 - (bandIndex(level) * 36 + 18));
  const needle = assessed
    ? `<line x1="${cx}" y1="${cy}" x2="${tipX}" y2="${tipY}" stroke="#0f1115" stroke-width="4" stroke-linecap="round"></line><circle cx="${cx}" cy="${cy}" r="9" fill="#0f1115"></circle><circle cx="${cx}" cy="${cy}" r="3.5" fill="#ffffff"></circle>`
    : `<circle cx="${cx}" cy="${cy}" r="9" fill="#7b8794"></circle>`;
  return `<svg class="oaci-dial" viewBox="0 0 320 172" role="img" aria-label="${escapeHtml(assessed ? `Five-band AI-pattern dial reading ${levelLabel(level)}` : "Five-band AI-pattern dial, not assessed")}">${arcs}${needle}</svg>`;
}

function bandLegend(level: unknown, assessed: boolean): string {
  return `<ul class="oaci-bands">${BANDS.map(band => {
    const current = assessed && band.id === String(level);
    return `<li${current ? ' aria-current="true"' : ""} style="--band:${band.colour}">${escapeHtml(band.label)}</li>`;
  }).join("")}</ul>`;
}

function axisCard(id: string, label: string, value: string, reason: string, limitations: unknown[]): string {
  const notes = (limitations ?? []).filter(item => typeof item === "string").slice(0, 2);
  return `<article class="oaci-axis" data-axis="${escapeHtml(id)}"><p class="oaci-kicker">${escapeHtml(label)}</p><h3>${escapeHtml(value)}</h3><p>${escapeHtml(reason)}</p>${notes.length ? `<ul>${notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}</article>`;
}

function findingNames(items: any[] | undefined): string {
  if (!items?.length) return "<p class=\"oaci-quiet\">No finding was recorded.</p>";
  const sentence = `${countPhrase(items.length, "finding")} ${pluralise(items.length, "was", "were")} recorded.`;
  return `<p class="oaci-quiet">${escapeHtml(sentence)}</p><ul class="oaci-tags">${items.map(item => `<li>${escapeHtml(item.rule_id ?? item.kind ?? item.category ?? item.id ?? "Recorded finding")}</li>`).join("")}</ul>`;
}

/** Five discrete band cells; only the section's own band is filled, so the strip cannot read as a percentage. */
function bandCells(level: unknown): string {
  return BANDS.map(band => `<i${band.id === String(level) ? ` data-on="true" style="--band:${band.colour}"` : ""}></i>`).join("");
}

function sectionBars(sections: any[], strongest: unknown): string {
  if (!sections.length) return "";
  return `<ol class="oaci-bars">${sections.map(section => `<li${section.index === strongest ? ' data-strongest="true"' : ""}><span class="oaci-bar-name">Section ${section.index + 1}</span><span class="oaci-bar-track">${bandCells(section.level)}</span><span class="oaci-bar-score">${escapeHtml(section.display_score)}</span><span class="oaci-bar-level">${escapeHtml(levelLabel(section.level))}</span></li>`).join("")}</ol><p class="oaci-quiet">Each strip marks which of the five bands the section falls in. It is not a percentage of the text.</p>`;
}

function sectionCards(sections: any[], strongest: unknown): string {
  if (!sections.length) return '<p class="oaci-quiet">No section was scored by a trained model in this run.</p>';
  return sections.map(section => {
    const evidence = (section.evidence ?? []).map((item: any) =>
      `<li><strong>${escapeHtml(plainText(item.summary, "Recorded evidence"))}</strong>${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}${item.basis ? `<small>${escapeHtml(item.basis)}</small>` : ""}</li>`,
    ).join("");
    const passage = section.passage
      ? `<blockquote>${escapeHtml(section.passage)}</blockquote>`
      : `<p class="oaci-quiet">Content-free locator recorded: UTF-16 ${escapeHtml(section.start_utf16)}–${escapeHtml(section.end_utf16)}.</p>`;
    return `<article class="oaci-section" style="--band:${bandColour(section.level)}"${section.index === strongest ? ' data-strongest="true"' : ""}>
      <header><div><p class="oaci-kicker">Section ${section.index + 1} · ${escapeHtml(countPhrase(section.word_count, "word", undefined, "word count not recorded"))}</p><h3>${escapeHtml(levelLabel(section.level))}</h3></div><b>${escapeHtml(section.display_score)}</b></header>
      ${passage}
      <h4>Why it reads this way</h4>${evidence ? `<ul class="oaci-evidence">${evidence}</ul>` : '<p class="oaci-quiet">No section evidence was supplied.</p>'}
      <p class="oaci-meta">Raw margin ${escapeHtml(Number.isFinite(section.raw_margin) ? Number(section.raw_margin).toFixed(2) : section.raw_margin)} · UTF-16 ${escapeHtml(section.start_utf16)}–${escapeHtml(section.end_utf16)}${section.index === strongest ? " · strongest passage in this draft" : ""}</p>
    </article>`;
  }).join("");
}

function methodRows(methods: any[]): string {
  if (!methods.length) return '<p class="oaci-quiet">No named check was recorded.</p>';
  const caption = `${countPhrase(methods.length, "named check")} ran in this run. ${pluralise(methods.length, "It is", "Each is")} recorded with its outcome, its version and its limits.`;
  return `<p class="oaci-quiet">${escapeHtml(caption)}</p><ul class="oaci-checks">${methods.map((method: any) => {
    const status = METHOD_STATE_LABELS[String(method.status)] ?? String(method.status).replace(/_/g, " ");
    const limitation = Array.isArray(method.limitations) ? method.limitations.join(" ") : "";
    return `<li><div><strong>${escapeHtml(plainText(method.provider_or_method, String(method.id)))}</strong><span>${escapeHtml(method.id)}${method.version ? ` · ${escapeHtml(method.version)}` : ""}${method.privacy_route ? ` · ${escapeHtml(String(method.privacy_route).replace(/_/g, " "))} route` : ""}</span></div><b data-status="${escapeHtml(method.status)}">${escapeHtml(status)}</b>${limitation ? `<p>${escapeHtml(limitation)}</p>` : ""}</li>`;
  }).join("")}</ul>`;
}

function factRows(pairs: Array<[string, string]>): string {
  return `<dl class="oaci-facts">${pairs.map(([term, description]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(description)}</dd></div>`).join("")}</dl>`;
}

const REPORT_CSS = `:root{color-scheme:light;--ink:#0f1115;--muted:#4d5761;--soft:#6b7480;--line:#ddd5c9;--paper:#f2ede6;--card:#fff;--orange:#fb700a;--blue:#0068b3}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 "Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
main{max-width:63rem;margin:0 auto;padding:1.5rem 1rem 3rem}
h1,h2,h3,h4{line-height:1.15;margin:0}
h2{font:700 1.35rem/1.15 Georgia,"Times New Roman",serif}
h3{font:700 1.1rem/1.15 Georgia,"Times New Roman",serif}
h4{font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:var(--soft);margin:.9rem 0 .35rem}
p{margin:.5rem 0}
.oaci-kicker{margin:0 0 .25rem;color:var(--soft);font-size:.68rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.oaci-quiet{color:var(--soft);font-size:.85rem}
.oaci-meta{color:var(--soft);font-size:.78rem;overflow-wrap:anywhere}
.oaci-panel{background:var(--card);border:1px solid var(--line);border-radius:.9rem;padding:1.15rem;margin:1rem 0}
.oaci-mast{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start;background:var(--ink);color:#fff;border-radius:.9rem;border-bottom:5px solid var(--orange);padding:1.25rem;margin-top:.5rem}
.oaci-mast svg{display:block;width:52px;height:52px}
.oaci-mast h1{font:700 1.6rem/1.1 Georgia,"Times New Roman",serif}
.oaci-mast .oaci-kicker{color:#ffad7b}
.oaci-mast p{margin:.35rem 0 0;color:#cdd3d9;font-size:.9rem}
.oaci-mast>div:last-child{margin-left:auto;text-align:right;font-size:.8rem;color:#cdd3d9}
.oaci-verdict{display:grid;grid-template-columns:minmax(0,20rem) minmax(0,1fr);gap:1.5rem;align-items:center}
.oaci-dial{display:block;width:100%;max-width:20rem;height:auto;margin:0 auto}
.oaci-bands{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.25rem;margin:.25rem 0 0;padding:0;list-style:none}
.oaci-bands li{border-top:5px solid var(--band);padding:.35rem .15rem;font-size:.62rem;font-weight:700;text-align:center;color:var(--soft);overflow-wrap:anywhere}
.oaci-bands li[aria-current=true]{color:var(--ink);background:#00000008}
.oaci-level{display:inline-block;padding:.2rem .6rem;border-radius:999px;background:var(--band,#0f1115);color:#fff;font-size:.78rem;font-weight:800;letter-spacing:.02em}
.oaci-score{font:700 3rem/1 Georgia,"Times New Roman",serif;margin:.5rem 0 .2rem}
.oaci-lede{font-size:1.02rem}
.oaci-axes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.85rem}
.oaci-axis{background:var(--card);border:1px solid var(--line);border-top:4px solid var(--blue);border-radius:.7rem;padding:.9rem;min-width:0}
.oaci-axis[data-axis=integrity]{border-top-color:var(--orange)}
.oaci-axis[data-axis=editorial]{border-top-color:#1a7349}
.oaci-axis h3{margin:.15rem 0 .35rem}
.oaci-axis p{font-size:.86rem;color:var(--muted)}
.oaci-axis ul{margin:.4rem 0 0;padding-left:1rem;color:var(--soft);font-size:.76rem}
.oaci-bars{margin:.5rem 0;padding:0;list-style:none}
.oaci-bars li{display:grid;grid-template-columns:6.5rem minmax(0,1fr) 3.2rem 7.5rem;gap:.6rem;align-items:center;padding:.35rem 0;font-size:.82rem}
.oaci-bars li[data-strongest=true] .oaci-bar-name{font-weight:800}
.oaci-bar-track{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.2rem;min-width:0}
.oaci-bar-track i{height:.7rem;border-radius:.2rem;background:#e6ded2}
.oaci-bar-track i[data-on=true]{background:var(--band)}
.oaci-bar-score{font:700 1rem/1 Georgia,"Times New Roman",serif;text-align:right}
.oaci-bar-level{color:var(--muted);font-size:.78rem}
.oaci-section{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--band);border-radius:.7rem;padding:1rem;margin:.75rem 0}
.oaci-section header{display:flex;gap:1rem;align-items:baseline;justify-content:space-between}
.oaci-section header b{font:700 1.7rem/1 Georgia,"Times New Roman",serif;color:var(--band)}
.oaci-section[data-strongest=true]{box-shadow:inset 0 0 0 1px var(--ink)}
blockquote{margin:.7rem 0;padding:.65rem .85rem;border-left:3px solid var(--line);background:var(--paper);font:italic 1rem/1.55 Georgia,"Times New Roman",serif;overflow-wrap:anywhere}
.oaci-evidence{margin:0;padding:0;list-style:none}
.oaci-evidence li{padding:.3rem 0;font-size:.85rem;color:var(--muted)}
.oaci-evidence strong{display:block;color:var(--ink)}
.oaci-evidence span,.oaci-evidence small{display:block;color:var(--soft)}
.oaci-evidence small{font-size:.75rem;overflow-wrap:anywhere}
.oaci-checks{margin:0;padding:0;list-style:none}
.oaci-checks li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.2rem .8rem;padding:.65rem 0;border-top:1px solid var(--line)}
.oaci-checks li:first-child{border-top:0}
.oaci-checks span{display:block;color:var(--soft);font-size:.74rem;overflow-wrap:anywhere}
.oaci-checks b{font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;text-align:right;color:#8a3a10}
.oaci-checks b[data-status=pass]{color:#1a7349}
.oaci-checks p{grid-column:1/-1;margin:.15rem 0 0;color:var(--muted);font-size:.8rem}
.oaci-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.7rem;margin:.5rem 0 0}
.oaci-facts dt{color:var(--soft);font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.oaci-facts dd{margin:.15rem 0 0;font-size:.87rem;overflow-wrap:anywhere}
.oaci-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin:.4rem 0 0;padding:0;list-style:none}
.oaci-tags li{border:1px solid var(--line);border-radius:999px;padding:.15rem .55rem;font-size:.75rem;background:var(--paper);overflow-wrap:anywhere}
.oaci-list{margin:.4rem 0 0;padding-left:1.1rem;color:var(--muted);font-size:.88rem}
.oaci-list li{margin-top:.25rem}
details{background:var(--card);border:1px solid var(--line);border-radius:.9rem;padding:.9rem 1.15rem;margin:1rem 0}
summary{font-weight:800;cursor:pointer}
pre{margin:.75rem 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted)}
footer{margin-top:1.5rem;color:var(--soft);font-size:.8rem}
a{color:#0a5d8f}
@media (max-width:60rem){.oaci-axes{grid-template-columns:1fr}.oaci-verdict{grid-template-columns:1fr}}
@media (max-width:34rem){main{padding:1rem .75rem 2rem}.oaci-mast>div:last-child{margin-left:0;text-align:left}.oaci-bars li{grid-template-columns:minmax(0,1fr) 3.2rem;grid-template-areas:"name score" "track track" "level level";row-gap:.15rem}.oaci-bar-name{grid-area:name}.oaci-bar-score{grid-area:score}.oaci-bar-track{grid-area:track}.oaci-bar-level{grid-area:level}.oaci-bands li{font-size:.55rem}.oaci-score{font-size:2.4rem}}
@media print{body{background:#fff}main{max-width:none;padding:0}.oaci-panel,.oaci-section,.oaci-axis,details{break-inside:avoid;box-shadow:none}details{display:block}details>summary{list-style:none}}
@page{size:A4;margin:14mm}`;

/** Builds the complete printable report. Accepts a canonical checker result or a deterministic result. */
export function renderCheckerReport(value: any, productVersion: string): string {
  const ai = value.axes?.ai_pattern;
  const legacyReading = value.combined_verdict?.ai_probability?.reading;
  const assessed = ai?.assessment_status === "assessed" && Boolean(ai.level);
  const sections: any[] = Array.isArray(value.sections) ? value.sections : [];
  const methods: any[] = Array.isArray(value.methods) ? value.methods : [];
  const route = value.route ?? {};
  const model = route.model ?? {};
  const source = value.source ?? {};
  const controls = value.abuse_controls ?? {};
  const provenance = value.provenance ?? {};
  const strongest = ai?.strongest_section_index;
  const integrity = value.axes?.text_integrity ?? {
    reading: value.combined_verdict?.text_integrity?.status,
    reason: value.combined_verdict?.text_integrity?.reason,
    findings: value.combined_verdict?.text_integrity?.findings,
    limitations: [],
  };
  const editorial = value.axes?.editorial ?? {
    reading: value.combined_verdict?.editorial?.suggestion_level,
    reason: value.combined_verdict?.editorial?.reason,
    findings: (value.combined_verdict?.editorial?.categories_hit ?? []).map((category: string) => ({ category })),
    limitations: [],
  };

  const verdictLabel = assessed ? levelLabel(ai.level) : "Not assessed";
  const verdictMeaning = assessed
    ? plainText(ai.reason, "The trained model returned this band for the strongest scored section.")
    : legacyReading === "not_assessed" || !ai
      ? "No trained model ran on this text, so there is no AI-pattern reading. Character and writing checks cannot supply one."
      : plainText(ai.reason, "No AI-pattern reading is available for this run.");
  // Worded as `strongestSentence` in `shared/report/report-model.mjs`. The count is followed by a
  // comma rather than a verb, so a one-section draft cannot read as "1 of 1 is".
  const strongestSection = sections.find((section: any) => section.index === strongest);
  const strongestLine = strongestSection
    ? `The strongest evidence is in section ${sections.indexOf(strongestSection) + 1} of ${sections.length}, which scored ${strongestSection.display_score} and sits in the ${levelLabel(strongestSection.level)} band.`
    : "No model-scored passage was recorded in this run.";

  const generated = plainText(value.generated_at ?? value.completed_at, "not recorded");
  const limitations: string[] = Array.isArray(value.limitations) ? value.limitations : [];

  const routeFacts: Array<[string, string]> = [
    ["Where it ran", plainText(route.location, "Not recorded")],
    ["Route", routeLabel(route.kind)],
    ["Privacy route", privacyRouteLabel(route.privacy_route)],
    ["Consent", plainText(route.consent, "not recorded").replace(/_/g, " ")],
    ["What happens to the text", plainText(route.retention?.statement, "No retention statement was recorded.")],
    ["Model", model.identity ? `${model.identity} · ${plainText(model.precision, "precision not recorded")}` : "No trained model ran"],
    ["Model file hash", plainText(model.artefact_hash, "not applicable")],
    ["Decision rule", plainText(model.flag_rule?.expression, "not applicable")],
    ["Draft hash", plainText(source.content_hash, "not recorded")],
    ["Normalised hash", plainText(source.normalised_hash, "not recorded")],
    ["Draft size", `${countPhrase(source.word_count, "word", undefined, "Word count not recorded")} · ${countPhrase(source.character_count, "character", undefined, "character count not recorded")} · ${countPhrase(source.section_count ?? sections.length, "section", undefined, "section count not recorded")}`],
    ["Accepted input", controls.max_words
      ? `60–${words(controls.max_words)} ${pluralise(controls.max_words, "word")} and up to ${words(controls.max_characters)} UTF-16 ${pluralise(controls.max_characters, "character")}; request body up to ${countPhrase(controls.max_request_bytes, "byte", undefined, "an unrecorded size")}. Longer input is refused, never shortened.`
      : "Input limits were not recorded for this route."],
  ];

  const watermarks: any[] = Array.isArray(provenance.watermarks) ? provenance.watermarks : [];

  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Opace AI Content Checker &amp; Detector evidence report</title><style>${REPORT_CSS}</style></head><body><main>
<header class="oaci-mast">${PRODUCT_MARK}<div><p class="oaci-kicker">Opace AI Content Checker &amp; Detector</p><h1>Evidence report</h1><p>Evidence, not guarantees. No AI checker can prove who wrote a text; this is a pattern reading.</p></div><div><p>Report created<br>${escapeHtml(generated)}</p><p>Command line ${escapeHtml(productVersion)}</p></div></header>

<section class="oaci-panel oaci-verdict" aria-label="Overall AI-pattern reading">
  <div>${dialSvg(ai?.level, assessed)}${bandLegend(ai?.level, assessed)}</div>
  <div>
    <p class="oaci-kicker">Your result</p>
    <span class="oaci-level" style="--band:${assessed ? bandColour(ai.level) : "#4d5761"}">${escapeHtml(verdictLabel)}</span>
    <p class="oaci-score">${escapeHtml(assessed ? ai.display_score : "—")}</p>
    <p class="oaci-quiet">A zero-to-one pattern reading. It is not a percentage of the text written by AI.</p>
    <p class="oaci-lede">${escapeHtml(verdictMeaning)}</p>
    <p><strong>Strongest section:</strong> ${escapeHtml(strongestLine)}</p>
  </div>
</section>

<section class="oaci-panel" aria-label="Three independent readings">
  <p class="oaci-kicker">Three independent readings</p><h2>Each reading answers a different question</h2>
  <div class="oaci-axes">
    ${axisCard("ai", "AI-pattern reading", verdictLabel, verdictMeaning, ai?.limitations ?? [])}
    ${axisCard("integrity", "Text integrity", READING_LABELS[String(integrity.reading)] ?? "Not assessed", plainText(integrity.reason, "No text-integrity reading was recorded."), integrity.limitations ?? [])}
    ${axisCard("editorial", "Editorial signals", READING_LABELS[String(editorial.reading)] ?? "Not assessed", plainText(editorial.reason, "No editorial reading was recorded."), editorial.limitations ?? [])}
  </div>
  <h4>Text-integrity findings</h4>${findingNames(integrity.findings)}
  <h4>Editorial findings</h4>${findingNames(editorial.findings)}
</section>

<section class="oaci-panel" aria-label="Scored sections">
  <p class="oaci-kicker">Section evidence</p><h2>How each part of the draft scored</h2>
  ${sectionBars(sections, strongest)}
  ${sectionCards(sections, strongest)}
</section>

<section class="oaci-panel" aria-label="Route, model and privacy">
  <p class="oaci-kicker">Run record</p><h2>Where this ran, on what, and what was kept</h2>
  ${factRows(routeFacts)}
</section>

<section class="oaci-panel" aria-label="Protected facts, provenance and watermarks">
  <p class="oaci-kicker">Facts and provenance</p><h2>Protected details, file origin and watermarks</h2>
  ${factRows([
    ["Protected facts held", protectedSentences(Number(provenance.protected_facts?.count ?? 0), provenance.protected_facts?.categories)],
    ["C2PA text wrapper", plainText(provenance.c2pa_text?.status, "not checked").replace(/_/g, " ")],
    ["C2PA files inspected", countPhrase(Array.isArray(provenance.c2pa_files) ? provenance.c2pa_files.length : 0, "file")],
    ["Safe fixes", provenance.safe_fixes ? "Previewed first and applied only after explicit approval." : "No safe-fix record was supplied."],
  ])}
  <h4>Watermark checks</h4>
  ${watermarks.length
    ? `<ul class="oaci-list">${watermarks.map((item: any) => `<li><strong>${escapeHtml(item.method_id)}</strong> — ${escapeHtml(String(item.outcome).replace(/_/g, " "))} (${escapeHtml(String(item.method_status).replace(/_/g, " "))})${Array.isArray(item.limitations) && item.limitations.length ? ` ${escapeHtml(item.limitations.join(" "))}` : ""}</li>`).join("")}</ul>`
    : '<p class="oaci-quiet">No watermark method was recorded for this run.</p>'}
</section>

<section class="oaci-panel" aria-label="Named checks">
  <p class="oaci-kicker">Named checks</p><h2>Every check that ran, and what it cannot tell you</h2>
  ${methodRows(methods)}
</section>

<section class="oaci-panel" aria-label="Correct use and limitations">
  <p class="oaci-kicker">Correct use</p><h2>How to read this report</h2>
  <p>Treat the reading as evidence to review, not a decision. Read the strongest section yourself before acting on it, and never use one result on its own to accuse a person of anything.</p>
  ${limitations.length ? `<ul class="oaci-list">${limitations.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="oaci-quiet">No limitations were recorded with this result.</p>'}
</section>

<details><summary>Complete machine record</summary><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></details>

<footer><p>Result ${escapeHtml(plainText(value.result_id ?? value.analysis_id, "not recorded"))} · contract ${escapeHtml(plainText(value.contract_version, "not recorded"))} · profile ${escapeHtml(plainText(value.profile, "deterministic"))}</p><p><a href="${PRODUCT_HOME}">Opace AI Content Checker &amp; Detector</a> · <a href="${PRODUCT_SUPPORT}">Contact Opace</a></p></footer>
</main></body></html>
`;
}
