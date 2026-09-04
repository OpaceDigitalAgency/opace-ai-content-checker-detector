import canonicalize from "canonicalize";
import {MEASURED_CSS, measuredPartHtml, measuredText} from "./measured.js";
import {LEVEL_LABELS, levelLabel, privacyRouteLabel, renderCheckerReport, routeLabel} from "./report.js";
import {buildCheckerReportHtml} from "./vendor/report/checker-report-html.mjs";
import {countPhrase, pluralise} from "./vendor/report/report-model.mjs";

export type OutputFormat = "text" | "json" | "jsonl" | "html";

export const PRODUCT_VERSION = "0.3.1";

const levelName = levelLabel;

const READING_NAMES: Record<string, string> = {
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

const BAND_ORDER = Object.keys(LEVEL_LABELS);
const HONESTY = "Evidence, not guarantees — no AI checker can prove who wrote a text.";
const SCORE_NOTE = "A zero-to-one pattern reading, not a percentage of the text.";

const pad = (value: unknown, width: number): string => {
  const text = String(value ?? "");
  return text.length >= width ? text : text + " ".repeat(width - text.length);
};
const padStart = (value: unknown, width: number): string => {
  const text = String(value ?? "");
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
};
const clip = (value: unknown, width: number): string => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= width ? text : `${text.slice(0, width - 1)}…`;
};
/** Wraps a paragraph under a fixed-width label so terminal output stays readable at 80 columns. */
const wrap = (label: string, text: string, indent = 21, width = 79): string => {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + word.length + 1 > width - indent) { lines.push(line); line = word; } else { line = line ? `${line} ${word}` : word; }
  }
  if (line) lines.push(line);
  if (!lines.length) lines.push("—");
  return lines.map((value, index) => (index === 0 ? pad(label, indent) : " ".repeat(indent)) + value).join("\n");
};
/** Five-cell band strip: the reading's band is filled, the rest are empty. Never a percentage bar. */
const bandStrip = (level: unknown): string => {
  const index = BAND_ORDER.indexOf(String(level));
  return BAND_ORDER.map((_, position) => (position === index ? "■" : "·")).join("");
};

/**
 * The protected-facts sentence, worded exactly as the shared report words it, so the terminal
 * summary and the printable report never disagree about singular and plural.
 */
const protectedSentence = (count: number, categories?: unknown): string => {
  const listed = Array.isArray(categories) ? categories.filter(item => typeof item === "string") : [];
  const sentence = count === 0
    ? "No protected items were identified in this draft."
    : `${countPhrase(count, "protected item")} ${pluralise(count, "was", "were")} identified and left untouched.`;
  const named = listed.length
    ? ` ${pluralise(listed.length, "Category", "Categories")}: ${listed.join(", ")}.`
    : "";
  return sentence + named;
};

function textChecks(methods: any[]): string {
  if (!methods.length) return "";
  const rows = methods.map((method: any) => {
    const limitation = Array.isArray(method.limitations) ? method.limitations.join(" ") : "";
    const head = `  ${pad(String(method.status).toUpperCase(), 12)}${pad(method.id, 26)}${clip(method.provider_or_method ?? "", 38)}`;
    return limitation ? `${head}\n${wrap("", limitation, 14)}` : head;
  });
  const caption = `${countPhrase(methods.length, "named check")} ran. ${pluralise(methods.length, "It is", "Each is")} recorded with its outcome, its version and its limits.`;
  return `\nNamed checks\n${wrap("  ", caption, 2)}\n${rows.join("\n")}\n`;
}

function textCheckerResult(value: any, version: string): string {
  const ai = value.axes?.ai_pattern ?? {};
  const assessed = ai.assessment_status === "assessed" && Boolean(ai.level);
  const sections: any[] = Array.isArray(value.sections) ? value.sections : [];
  const integrity = value.axes?.text_integrity ?? {};
  const editorial = value.axes?.editorial ?? {};
  const route = value.route ?? {};
  const model = route.model ?? {};
  const source = value.source ?? {};
  const controls = value.abuse_controls ?? {};
  const strongest = ai.strongest_section_index;

  const head = [
    `Opace AI Content Checker & Detector ${version}`,
    HONESTY,
    "",
    `${pad("AI-pattern reading", 21)}${assessed ? `${levelName(ai.level)}  ·  ${ai.display_score}  ${bandStrip(ai.level)}` : "Not assessed"}`,
    `${pad("", 21)}${SCORE_NOTE}`,
    wrap("Why", ai.reason ?? "No AI-pattern reading was recorded for this run."),
    `${pad("Strongest section", 21)}${Number.isInteger(strongest) ? `Section ${strongest + 1} of ${sections.length}` : "None recorded"}`,
  ].join("\n");

  const sectionTable = sections.length
    ? `\nSections\n  ${pad("#", 4)}${pad("Score", 8)}${pad("Level", 16)}${padStart("Words", 6)}  ${pad("Band", 7)}Passage\n${sections.map((section: any) => {
        const marker = section.index === strongest ? "*" : " ";
        return `  ${pad(`${section.index + 1}${marker}`, 4)}${pad(section.display_score, 8)}${pad(levelName(section.level), 16)}${padStart(section.word_count ?? "—", 6)}  ${pad(bandStrip(section.level), 7)}${clip(section.passage ?? `UTF-16 ${section.start_utf16}–${section.end_utf16}`, 34)}`;
      }).join("\n")}\n  * strongest section\n`
    : "\nSections\n  No section was scored by a trained model in this run.\n";

  const readings = [
    "",
    "Three independent readings",
    wrap("  AI pattern", assessed ? `${levelName(ai.level)} — ${ai.reason ?? ""}` : "Not assessed — no trained model ran on this text."),
    wrap("  Text integrity", `${READING_NAMES[String(integrity.reading)] ?? "Not assessed"} — ${integrity.reason ?? ""}`),
    wrap("  Editorial", `${READING_NAMES[String(editorial.reading)] ?? "Not assessed"} — ${editorial.reason ?? ""}`),
  ].join("\n");

  const run = [
    "",
    "Route, model and privacy",
    `${pad("  Where it ran", 21)}${route.location ?? "not recorded"} (${routeLabel(route.kind)})`,
    `${pad("  Privacy route", 21)}${privacyRouteLabel(route.privacy_route)}, consent ${String(route.consent ?? "not recorded").replace(/_/g, " ")}`,
    wrap("  Your text", route.retention?.statement ?? "No retention statement was recorded."),
    `${pad("  Model", 21)}${model.identity ? `${model.identity} · ${model.precision ?? "precision not recorded"}` : "no trained model"}`,
    `${pad("  Model file hash", 21)}${model.artefact_hash ?? "not applicable"}`,
    `${pad("  Draft hash", 21)}${source.content_hash ?? "not recorded"}`,
    `${pad("  Draft size", 21)}${countPhrase(source.word_count, "word", undefined, "word count not recorded")} · ${countPhrase(source.character_count, "character", undefined, "character count not recorded")} · ${countPhrase(source.section_count ?? sections.length, "section", undefined, "section count not recorded")}`,
    `${pad("  Accepted input", 21)}${controls.max_words ? `60–${controls.max_words} ${pluralise(controls.max_words, "word")}, up to ${controls.max_characters} UTF-16 ${pluralise(controls.max_characters, "character")}; refused, never shortened` : "not recorded"}`,
    wrap("  Protected facts", protectedSentence(value.provenance?.protected_facts?.count ?? 0, value.provenance?.protected_facts?.categories)),
    `${pad("  Result", 21)}${value.result_id ?? "not recorded"} · ${value.generated_at ?? "date not recorded"}`,
  ].join("\n");

  const limitations = Array.isArray(value.limitations) && value.limitations.length
    ? `\nLimitations\n${value.limitations.map((item: string) => wrap("  • ", item, 4)).join("\n")}\n`
    : "";

  return `${head}\n${sectionTable}${measuredText(value, wrap)}${readings}\n${run}\n${textChecks(Array.isArray(value.methods) ? value.methods : [])}${limitations}`;
}

function textDeterministicResult(value: any, version: string): string {
  const combined = value.combined_verdict ?? {};
  const integrity = combined.text_integrity ?? {};
  const editorial = combined.editorial ?? {};
  const source = value.source ?? {};
  const head = [
    `Opace AI Content Checker & Detector ${version}`,
    HONESTY,
    "",
    `${pad("AI-pattern reading", 21)}Not assessed — no trained model ran.`,
    wrap("", "Use --local-engine with a configured Cycle-5 local engine for an AI-pattern reading. Character and writing checks cannot supply one."),
  ].join("\n");
  const readings = [
    "",
    "Two independent readings",
    wrap("  Text integrity", `${READING_NAMES[String(integrity.status)] ?? "Not assessed"} — ${integrity.reason ?? ""}`),
    wrap("  Editorial", `${READING_NAMES[String(editorial.suggestion_level)] ?? "Not assessed"} — ${editorial.reason ?? ""}`),
  ].join("\n");
  const counts = [
    "",
    "Draft and route",
    `${pad("  Draft size", 21)}${countPhrase(source.word_count, "word", undefined, "word count not recorded")}`,
    `${pad("  Draft hash", 21)}${source.content_hash ?? "not recorded"}`,
    `${pad("  Route", 21)}on this device, deterministic checks only; nothing was sent for scoring`,
    wrap("  Protected facts", protectedSentence(Array.isArray(value.protected_spans) ? value.protected_spans.length : 0)),
  ].join("\n");
  const limitations = Array.isArray(value.limitations) && value.limitations.length
    ? `\nLimitations\n${value.limitations.map((item: string) => wrap("  • ", item, 4)).join("\n")}\n`
    : "";
  return `${head}\n${readings}\n${counts}\n${textChecks(Array.isArray(value.methods) ? value.methods : [])}${limitations}`;
}

function textOther(value: any, version: string): string {
  if (Array.isArray(value.gates)) {
    return `Opace AI Content Checker & Detector ${version}\n\nProtected-span gates\n${value.gates.map((gate: any) => `  ${pad(String(gate.status).toUpperCase(), 10)}${pad(gate.id, 28)}${gate.hard ? "hard" : "soft"}\n${wrap("", gate.summary ?? "", 12)}`).join("\n")}\n`;
  }
  if (Array.isArray(value.candidates)) {
    return `Opace AI Content Checker & Detector ${version}\n\nCandidates\n${value.candidates.map((candidate: any) => `  ${pad(clip(candidate.path, 34), 36)}${countPhrase(candidate.gates?.filter((gate: any) => gate.status !== "pass").length ?? 0, "gate")} not passed`).join("\n")}\n`;
  }
  if (Array.isArray(value.methods)) {
    return `Opace AI Content Checker & Detector ${version}\n${textChecks(value.methods)}`;
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * The shared report builder validates the canonical contract and throws rather than rendering a
 * partial page, so only a result that declares itself a checker result is handed to it. A
 * deterministic analysis result or an integrity receipt keeps the local report.
 */
const isCanonicalCheckerResult = (value: any): boolean =>
  (value?.profile === "full_checker" || value?.profile === "primitive") && Boolean(value?.axes && value?.route);

/**
 * The shared report is left exactly as its own lane renders it, and the CLI's "What the model
 * measured" part is appended after the last part it drew, with its stylesheet appended to the
 * report's own `<style>`. Both anchors occur once in the document, and both are required: a
 * missing one means the shared report's shell changed, which should stop the build rather than
 * quietly drop the block.
 */
function withMeasuredPart(document: string, value: any): string {
  const part = measuredPartHtml(value, String((document.match(/class="oaci-part-number"/g) ?? []).length + 1).padStart(2, "0"));
  if (!part) return document;
  const styleEnd = document.indexOf("</style>");
  const footer = document.indexOf('<footer class="oaci-report-footer">');
  if (styleEnd === -1 || footer === -1) {
    throw new Error("checker_report_shell_changed: the shared report no longer carries the anchors the CLI appends to");
  }
  const withCss = `${document.slice(0, styleEnd)}${MEASURED_CSS}${document.slice(styleEnd)}`;
  const at = withCss.indexOf('<footer class="oaci-report-footer">');
  return `${withCss.slice(0, at)}${part}\n    ${withCss.slice(at)}`;
}

export function render(value: any, format: OutputFormat, noColour = true): string {
  void noColour;
  if (format === "json" || format === "jsonl") {
    const encoded = canonicalize(value);
    if (encoded === undefined) throw new Error("invalid_canonical_json");
    return encoded + "\n";
  }
  if (format === "html") {
    return isCanonicalCheckerResult(value)
      ? withMeasuredPart(buildCheckerReportHtml(value, {surfaceName: `Command line ${PRODUCT_VERSION}`, logoStyle: "background"}), value)
      : renderCheckerReport(value, PRODUCT_VERSION);
  }
  if (value?.axes?.ai_pattern) return textCheckerResult(value, PRODUCT_VERSION);
  if (value?.combined_verdict) return textDeterministicResult(value, PRODUCT_VERSION);
  return textOther(value, PRODUCT_VERSION);
}
