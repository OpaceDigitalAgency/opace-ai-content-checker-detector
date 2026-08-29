/**
 * Shipped-claims guard — asserts over the WEBSITE, not the engine.
 *
 * Why this exists, and why it lives here rather than beside the other claim
 * tests: the project already has a guard that blocks bare superlatives about
 * human writing, and it works. But it asserts over the core engine's rule
 * messages, and the claims that keep escaping live in the website repository,
 * which no test reads. On 29 August 2026 that gap let five separate defects
 * ship or nearly ship:
 *
 *   1. A live FAQ answer, inside FAQPage structured data, saying the shipped
 *      threshold was the point "where no verified human text was flagged" —
 *      retracted, and contradicted three paragraphs below on the same page.
 *   2. "calibrated to stay silent on a 44-text verified-human corpus" on the
 *      checker page. A bare superlative about human writing, exactly what the
 *      engine-side guard exists to block, in a repo it does not read.
 *   3. The superseded 66.7% figure on three user-facing surfaces.
 *   4. A mandatory listing footer, "Your text is analysed locally and never
 *      uploaded", which became false the day the server route shipped.
 *   5. The server route printing int8-Python, pre-segmentation figures under a
 *      label claiming they were fp32 at the 98.4% flag point.
 *
 * Every one was found by a person reading the page. None would have failed a
 * test. That is the gap this closes.
 *
 * It scans website SOURCE rather than `dist`, because source is what a person
 * edits and is always present, whereas `dist` may be absent or mid-build. If
 * the sibling website checkout is missing the test skips rather than fails:
 * this repository must stay testable on its own.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const WEBSITE = join(HERE, "..", "..", "..", "..", "..", "opace-website", "astro-latest", "src");

/** Files whose text reaches a visitor. Research notes and fixtures are not claims. */
const SCANNED = /\.(astro|ts|tsx|md|mdx|json)$/;
// `content/` is NOT skipped: the blog ships to readers like any other page, and
// excluding it left the largest body of published prose unguarded.
const SKIP_DIRS = new Set(["node_modules", "dist", ".astro", "archive"]);

// The guard originally read only the website. That made its scope narrower than
// the belief about it — DESCRIPTIONS.md is the source every store listing is
// pasted from, so a bad claim there propagates to WordPress, Chrome and npm at
// once, and nothing was reading it. Same failure shape as a control that passes
// while the thing it describes is broken.
const REPO = join(HERE, "..", "..");
const EXTRA_FILES = [
  join(REPO, "DESCRIPTIONS.md"),
  join(REPO, "README.md"),
  join(REPO, "docs", "WATERMARK-LAB.md"),
  join(REPO, "wordpress", "opace-ai-content-integrity", "readme.txt"),
  join(REPO, "extensions", "chrome", "README.md"),
];

/**
 * Each rule states the claim, why it is banned, and where the correction lives.
 * A rule may carry `unless` — a phrase that makes the surrounding text a
 * deliberate record of the retraction rather than a fresh assertion of it, so
 * changelogs and correction notes are allowed to quote what they retract.
 */
const BANNED = [
  {
    id: "no-human-flagged",
    pattern: /no verified human text was flagged|zero false positives on all \d+ human|fired on no human control|stay silent on a \d+-text verified-human corpus/i,
    why: "A bare superlative about human writing. Measured false positives are non-zero on every corpus large enough to mean anything; the last three such claims were all falsified.",
    fix: "State the measured rate with its denominator, or say nothing about human writing.",
  },
  {
    id: "superseded-66-7",
    pattern: /66\.7\s*%/,
    why: "Superseded: an artefact of a corpus that was 76% encyclopaedic and question-and-answer text. HANDOVER section 9.",
    fix: "Use the rules-tier figure measured on the 5,558-document fresh corpus.",
  },
  {
    id: "never-uploaded",
    pattern: /never uploaded|nothing is uploaded|everything runs in your browser\b(?![^.]*except)/i,
    why: "False since the AI model check began defaulting to the EU server. A privacy claim must name the route it applies to.",
    fix: "State the position per route, as ROUTE_PRIVACY does.",
  },
  {
    id: "routes-agree",
    pattern: /the same evidence at the end|both routes (give|produce) the same/i,
    why: "The two runtimes disagree by up to 0.42 outside the decision region; measured 30.8 points apart on a real document.",
    fix: "Say the routes share a flag point, not that they produce the same score.",
  },
  {
    id: "claude-coverage",
    // Narrow deliberately. "Claude watermarks" is a NOUN phrase in every honest
    // sentence here — "cannot verify or rule out Gemini or Claude watermarks" —
    // so matching the bare pair fires on the disclaimer this rule protects.
    // That is the third time a rule in this file has cried wolf on correct copy;
    // a guard that fires on good sentences gets switched off, and then it guards
    // nothing. Only assertions of present coverage are matched.
    pattern: /(anthropic|claude)[^.]{0,60}\b(now|currently|already)\s+watermarks\b|claude(?:'s)?\s+(?:text|output|models?)\s+(?:is|are)\s+watermarked|watermarked\s+since\s+\d|all\s+claude\s+(?:output|models)\s+(?:are|is)\s+watermarked/i,
    why: "Anthropic's own news post opens 'Future Claude models will generate text that contains a watermark'. The commitment covers models launched on or after 2 August 2026, and as of 29 August no Claude model has launched after that cutoff — Opus 5 on 24 July, Sonnet 5 on 30 June. So it covers zero shipping models, there is no per-model status and no public detector.",
    fix: "State it as a commitment, not coverage: whether any given piece of Claude output carries a mark today is not publicly established.",
  },
  {
    id: "proves-authorship",
    // Deliberately narrow. The bare phrase "proof of authorship" appears in
    // almost every HONEST sentence on these pages — "never proof of
    // authorship", "no check turns a pattern prompt into proof of authorship"
    // — so matching it cries wolf on the disclaimer this rule exists to
    // protect. A guard that fires on correct copy gets disabled, and then it
    // guards nothing. Only affirmative assertions are matched.
    pattern: /proves? (that )?(it|this|the text|the draft) was written by (a human|an? AI)|is proof of (human )?authorship|confirms? (human|AI) authorship/i,
    why: "The project's first rule: no score is proof of authorship.",
    fix: "Name the check, its version and its limits.",
  },
];

/** Phrases that mark a passage as recording a retraction rather than making a claim. */
const RETRACTION_MARKERS = /superseded|retracted|no longer|was wrong|must not be quoted|corrected|do not quote|do not write|never write|cannot verify|rule out|formerly|previously (said|read|claimed)/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCANNED.test(entry)) out.push(full);
  }
  return out;
}

/** The line a match falls on, so a failure names somewhere a person can go. */
function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const available = existsSync(WEBSITE);

test("website source carries no banned claim", { skip: available ? false : "website checkout not present" }, () => {
  const failures = [];
  const files = [...walk(WEBSITE), ...EXTRA_FILES.filter((f) => existsSync(f))];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const rule of BANNED) {
      const match = rule.pattern.exec(text);
      if (!match) continue;
      // Allow a correction note to quote the claim it is retracting.
      const around = text.slice(Math.max(0, match.index - 400), match.index + 400);
      if (RETRACTION_MARKERS.test(around)) continue;
      failures.push(
        `${relative(REPO, file)}:${lineOf(text, match.index)} [${rule.id}]\n` +
          `    found: ${JSON.stringify(match[0])}\n` +
          `    why:   ${rule.why}\n` +
          `    fix:   ${rule.fix}`,
      );
    }
  }
  assert.deepEqual(
    failures,
    [],
    `Claims banned on shipped surfaces:\n\n${failures.join("\n\n")}\n\n` +
      "These reach visitors. Correct the claim rather than the test, unless the text is " +
      "deliberately recording a retraction — in which case say so in the surrounding sentence.",
  );
});

test("the guard can actually detect a banned claim", { skip: available ? false : "website checkout not present" }, () => {
  // A guard nobody has seen fail is not known to work. This project shipped a
  // kill switch that was tested three times from the wrong entry point and was
  // dead the whole time; the lesson generalises.
  for (const rule of BANNED) {
    const probe = {
      "no-human-flagged": "the threshold ships at the point where no verified human text was flagged",
      "superseded-66-7": "the rules reached 66.7% of the AI text",
      "never-uploaded": "Your text is analysed locally and never uploaded.",
      "routes-agree": "Slower to start, and the same evidence at the end.",
      "claude-coverage": "Anthropic now watermarks Claude's text.",
      "proves-authorship": "A high score proves that the text was written by an AI",
    }[rule.id];
    assert.ok(probe, `no probe defined for rule ${rule.id}`);
    assert.ok(rule.pattern.test(probe), `rule ${rule.id} failed to match its own probe: ${probe}`);
  }
});

test("a retraction may quote the claim it retracts", { skip: available ? false : "website checkout not present" }, () => {
  const text = "The 66.7% figure is superseded and must not be quoted.";
  const rule = BANNED.find((r) => r.id === "superseded-66-7");
  const match = rule.pattern.exec(text);
  assert.ok(match, "probe should match the banned pattern");
  const around = text.slice(Math.max(0, match.index - 400), match.index + 400);
  assert.ok(RETRACTION_MARKERS.test(around), "a sentence marked superseded must be permitted");
});
