/**
 * Shipped-claims guard — asserts over every published surface, engine and website alike.
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
 * edits and is always present, whereas `dist` may be absent or mid-build.
 *
 * ── 30 August 2026, second widening ──────────────────────────────────────────
 *
 * The guard's repository scope was five hand-listed files plus one hand-listed
 * directory. Everyone believed it covered the project. It covered almost none
 * of it: nothing under `docs/` except `WATERMARK-LAB.md`, no package README
 * except the Chrome one, no engine source, no store listing, no WordPress
 * plugin text. It had been passing for days over unread ground — the same
 * failure shape as the kill switch that was tested three times from the wrong
 * entry point and was dead throughout.
 *
 * Widening it found three live claims that had never been read by any test:
 *
 *   a. `packages/core/src/verdict/combine.ts` shipped the runtime string
 *      "Carrier payloads fired on no human control in the evaluation corpora"
 *      to users of the WordPress plugin, the Chrome extension, the CLI, the
 *      browser package and the Astro package. A bare superlative about human
 *      writing with no denominator anywhere in the repository to support it.
 *      The 29 August correction fixed `en-signals-v2.ts` and never looked here.
 *   b. `packages/core/README.md` — the published npm README — printed the
 *      retracted 66.7% aggregate as a live accuracy figure, under an
 *      instruction to "publish the rate".
 *   c. Twelve retraction records and correction tables across `docs/` sat
 *      outside the marker window, so they read as fresh assertions.
 *
 * Three structural defects were closed at the same time:
 *
 *   - The whole suite skipped when the sibling website checkout was absent,
 *     including the parts that need no website at all. A silent skip reads
 *     exactly like a pass. The repository scan now never skips, and both scans
 *     assert they visited a non-zero number of files.
 *   - The repository scan reported only the FIRST match per rule per file. A
 *     file whose first hit was a marked retraction hid every live claim after
 *     it — which is exactly what was happening in
 *     `docs/programme/design/FAQ-CONTENT-PACK-2026-08-29.md`. It now reports
 *     every unmarked match.
 *   - Scope is now DIRECTORIES, recursively, not a hand-written file list.
 *     Hand-listed scopes are how this gap opened in the first place.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const WEBSITE = join(HERE, "..", "..", "..", "..", "..", "opace-website", "astro-latest", "src");
const REPO = join(HERE, "..", "..");

/**
 * Files whose text reaches a person. Research notes and fixtures are not claims.
 *
 * `.html` was added on 30 August 2026 for the imported design mockups. `.php`, `.mjs`, `.js`,
 * `.txt`, `.yaml` and `.cff` were added the same day: the WordPress plugin's user-facing strings
 * are PHP, the shipped plugin runtime is a committed `.mjs` bundle, the WordPress readme is `.txt`,
 * the public API description is `.yaml`, and `CITATION.cff` is rendered by GitHub. A file type the
 * guard cannot open is a file type claims escape through — that was true of `.html` and it was
 * true of `.mjs`, where the carrier-payload superlative was sitting in five shipped bundles.
 */
const SCANNED = /\.(astro|ts|tsx|md|mdx|json|html|txt|php|mjs|js|jsx|yaml|yml|cff)$/;
// `content/` is NOT skipped: the blog ships to readers like any other page, and
// excluding it left the largest body of published prose unguarded.
const SKIP_DIRS = new Set(["node_modules", "dist", ".astro", "archive", ".git", "artifacts", "vendor", "coverage"]);
// Machine-generated dependency manifests. Megabytes of registry metadata, no prose.
const SKIP_FILES = new Set(["package-lock.json", "composer.lock", "pnpm-lock.yaml", "yarn.lock"]);

/**
 * Repository scope: whole directories, recursively.
 *
 * The previous scope was five named files. It was believed to be the project and it was five
 * files. Anything hand-listed drifts the moment somebody adds a document, and the drift is silent,
 * which is the worst property a control can have. Directories do not drift.
 *
 * What is in, and why each one is a published surface:
 *   docs/           public the moment it is pushed; `HANDOVER.md` is the first thing a new agent reads
 *   packages/       npm READMEs and the engine source that produces user-visible runtime strings
 *   wordpress/      plugin readme.txt (the wp.org listing), PHP admin copy, the shipped JS bundle
 *   extensions/     the Chrome README and the store-listing text submitted to Google
 *   submission-prep/ the field values pasted into every store and registry listing
 *   openapi/, schemas/ published API descriptions developers read
 *   repository root README, DESCRIPTIONS, CHANGELOG, SECURITY, STATUS and the rest
 *
 * What is deliberately OUT, and why — recorded here so the next person does not have to guess:
 *   services/local-engine/research/  Research working notes and measurement logs. Their job is to
 *       record superseded measurements; demanding a supersession marker beside every row of every
 *       results table would make the guard cry wolf on thousands of data points, and a guard that
 *       cries wolf gets switched off. Not a product surface: nothing here is quoted to a user
 *       except through a document that IS in scope.
 *   tests/, fixtures/, benchmark/  Fixtures carry banned strings ON PURPOSE, as probes. This file
 *       is itself in `tests/`. Scanning them would make the guard fail on its own probe strings.
 *   scripts/, licenses/  Build tooling and licence texts; no product claims.
 *   dist/, node_modules/, artifacts/  Build output and vendored code, except the WordPress plugin's
 *       committed `assets/js/` bundle, which is tracked, shipped, and therefore in scope.
 */
const REPO_DIRS = [
  join(REPO, "docs"),
  join(REPO, "packages"),
  join(REPO, "wordpress"),
  join(REPO, "extensions"),
  join(REPO, "submission-prep"),
  join(REPO, "openapi"),
  join(REPO, "schemas"),
];

/** Repository-root files. The root is scanned flat, not recursively — its subdirectories are listed above. */
function rootFiles() {
  return readdirSync(REPO)
    .filter((e) => SCANNED.test(e) && !SKIP_FILES.has(e))
    .map((e) => join(REPO, e))
    .filter((f) => statSync(f).isFile());
}

/**
 * Each rule states the claim, why it is banned, and where the correction lives.
 */
/**
 * A negative lookbehind for the nearest preceding negation in the same sentence. Two rules below
 * were written to match "only affirmative assertions" and did not: they fired on "Nothing this
 * tool produces is proof of authorship" and "No present-tense claim that Claude output is
 * watermarked today" — the exact honest sentences they exist to protect. Found on 30 August 2026
 * when the guard was pointed at `docs/programme/design/`. A guard that fires on correct copy gets
 * switched off, and then it guards nothing.
 */
const NOT_BEFORE = String.raw`(?<!\b(?:not|never|no|nothing|nobody|nor|without)\b[^.]{0,80})`;

/**
 * The retracted aggregate is a CLAIM, not a digit string. `/66\.7\s*%/` matched any quantity that
 * happened to land on two thirds — 46/69 detected at 400 words, 18/27 humaniser samples, one cell
 * of a per-model recall table. Four false alarms on correct, denominated measurements, and this
 * project has already logged "phantom 66.7 regex hits" as a search artefact once (HANDOVER, five
 * artefacts in one afternoon). So the figure must appear near something that ties it to the
 * provider-eval aggregate: its numerator, its denominator, the tier it describes, or "all AI".
 * This narrows the rule to the claim. It does not loosen it: every genuine occurrence found in the
 * repository still fires, and the honest-form probes below pin both directions.
 */
const AGGREGATE_ANCHOR = String.raw`(?:1,?152|1,?727|\brules\b|all[- ]AI)`;

const BANNED = [
  {
    id: "no-human-flagged",
    pattern: /no verified human text was flagged|zero false positives on all \d+ human|fired on no human control|stay silent on a \d+-text verified-human corpus/i,
    why: "A bare superlative about human writing. Measured false positives are non-zero on every corpus large enough to mean anything; the last four such claims were all falsified.",
    fix: "State the measured rate with its denominator, or say nothing about human writing.",
    probe: "the threshold ships at the point where no verified human text was flagged",
    honest: [
      "formatting_cluster fires on 0 of 4,144 representative human documents.",
      "artefact-class findings fire on 4 of 4,144 humans: rare, but not absent.",
    ],
  },
  {
    id: "superseded-66-7",
    pattern: new RegExp(
      String.raw`(?<=${AGGREGATE_ANCHOR}[\s\S]{0,120})66\.7\s*%` +
        String.raw`|66\.7\s*%(?=[\s\S]{0,120}${AGGREGATE_ANCHOR})`,
      "i",
    ),
    why: "Superseded: an artefact of a corpus that was 76% encyclopaedic and question-and-answer text. HANDOVER section 9, CAPABILITIES section 7.3.",
    fix: "Use the rules-tier figure measured on the 5,558-document fresh corpus: 45.1% detected at 24.8% human false positives.",
    probe: "the rules reached 66.7% of the AI text",
    honest: [
      "| 400-word | 46/69 = 66.7% | 64/69 = 92.8% |",
      "| `anthropic/claude-opus-4.8` | pro-flagship | 75 | 32.0% | 49.3% | 66.7% | 12.0% |",
      "| Humbot | 71.7% | 18/27 (66.7%) |",
    ],
  },
  {
    id: "never-uploaded",
    // A blanket privacy claim is what goes stale. "Your text is analysed locally and never
    // uploaded" became false the day the server route shipped, because it named no route and no
    // recipient. A claim that names who it is talking about cannot be silently falsified by a new
    // route, and it is the form this rule's own `fix` prescribes — so the rule stops at the
    // boundary of the honest form rather than firing on it. The Chrome store listing's "Nothing is
    // uploaded to Opace, a model provider, an analytics service or an advertising service" is
    // correct and verifiable from the manifest: no host permissions, no fetch call, CSP 'self'.
    // Firing on it would be the fourth time a rule in this file cried wolf on copy it protects.
    pattern: /(?:never uploaded|nothing is uploaded|everything runs in your browser\b(?![^.]*except))(?![^.]{0,120}\b(?:to (?:Opace|us|our|any|a|an)|by (?:this|the) extension|on this route)\b)/i,
    why: "False since the AI model check began defaulting to the EU server. A privacy claim must name the route or the recipient it applies to.",
    fix: "State the position per route, as ROUTE_PRIVACY does.",
    probe: "Your text is analysed locally and never uploaded.",
    honest: [
      "Nothing is uploaded to Opace, a model provider, an analytics service or an advertising service.",
      "Most checks run in your browser and send nothing; the AI model check runs on our EU server by default.",
    ],
  },
  {
    id: "routes-agree",
    pattern: /the same evidence at the end|both routes (give|produce) the same/i,
    why: "The two runtimes disagree by up to 0.42 outside the decision region; measured 30.8 points apart on a real document.",
    fix: "Say the routes share a flag point, not that they produce the same score.",
    probe: "Slower to start, and the same evidence at the end.",
    honest: ["The two routes share a flag point; their scores differ, by 33 points on the page's own sample."],
  },
  {
    id: "claude-coverage",
    // Narrow deliberately. "Claude watermarks" is a NOUN phrase in every honest
    // sentence here — "cannot verify or rule out Gemini or Claude watermarks" —
    // so matching the bare pair fires on the disclaimer this rule protects.
    // That is the third time a rule in this file has cried wolf on correct copy;
    // a guard that fires on good sentences gets switched off, and then it guards
    // nothing. Only assertions of present coverage are matched.
    pattern: new RegExp(
      String.raw`(anthropic|claude)[^.]{0,60}\b(now|currently|already)\s+watermarks\b` +
        `|${NOT_BEFORE}` +
        String.raw`claude(?:'s)?\s+(?:text|output|models?)\s+(?:is|are)\s+watermarked` +
        String.raw`|watermarked\s+since\s+\d` +
        String.raw`|all\s+claude\s+(?:output|models)\s+(?:are|is)\s+watermarked`,
      "i",
    ),
    why: "Anthropic's own news post opens 'Future Claude models will generate text that contains a watermark'. The commitment covers models launched on or after 2 August 2026, and as of 29 August no Claude model has launched after that cutoff — Opus 5 on 24 July, Sonnet 5 on 30 June. So it covers zero shipping models, there is no per-model status and no public detector.",
    fix: "State it as a commitment, not coverage: whether any given piece of Claude output carries a mark today is not publicly established.",
    probe: "Anthropic now watermarks Claude's text.",
    honest: [
      "No present-tense claim that Claude output is watermarked today, on any page.",
      "We cannot verify or rule out Gemini or Claude watermarks.",
      "Anthropic has said newer Claude models will carry text watermarking.",
    ],
  },
  {
    id: "proves-authorship",
    // Deliberately narrow. The bare phrase "proof of authorship" appears in
    // almost every HONEST sentence on these pages — "never proof of
    // authorship", "no check turns a pattern prompt into proof of authorship"
    // — so matching it cries wolf on the disclaimer this rule exists to
    // protect. Only affirmative assertions are matched.
    pattern: new RegExp(
      String.raw`proves? (that )?(it|this|the text|the draft) was written by (a human|an? AI)` +
        `|${NOT_BEFORE}` +
        String.raw`is proof of (human )?authorship` +
        String.raw`|confirms? (human|AI) authorship`,
      "i",
    ),
    why: "The project's first rule: no score is proof of authorship.",
    fix: "Name the check, its version and its limits.",
    probe: "A high score proves that the text was written by an AI",
    honest: [
      "Nothing this tool produces is proof of authorship, and no combination of the three answers adds up to one.",
      "A score is never proof of authorship.",
    ],
  },
  {
    id: "retired-operating-point",
    // Narrow deliberately, in the shape AGGREGATE_ANCHOR established. The digits 0.984 and 0.980
    // are not banned: this project's measurement record is FULL of them, correctly, because a
    // retired flag point is a real historical fact and a document that says "at the retired 0.984
    // rule" is doing exactly what it should. What is banned is asserting one of them as the point
    // that ships. Matching the bare number would fire on hundreds of correct rows and the guard
    // would be switched off inside a day — which is the failure mode three rules above already
    // record having hit.
    pattern: new RegExp(
      String.raw`\bshipped\s+0\.9(?:84|80)\b` +
        String.raw`|\b0\.9(?:84|80)\s+(?:is|remains)\s+(?:the\s+)?(?:current|shipped|live)\b` +
        String.raw`|\bthe\s+(?:live|current|shipped)\s+(?:single-threshold\s+)?(?:operating point|flag point|threshold)\s*(?:of\s+|is\s+|,\s*)?0\.9(?:84|80)\b` +
        String.raw`|\b(?:ships?|shipping)\s+at\s+0\.9(?:84|80)\b` +
        String.raw`|\bshipped\s+(?:0\.857|85\.7\s*%|98\.4\s*%)\b`,
      "i",
    ),
    why:
      "0.984, 0.980 and 0.857 are RETIRED operating points. The rule that ships is the minimum-evidence pair 0.9855 primary / 0.9763 second-highest, and it is not interchangeable with any of them: 0.984 gives 877/922 and 56/4,636 on the server route where the shipped pair gives 883/922 and 45/4,636. Naming a retired point as the shipped one imports the wrong detection AND the wrong false-positive rate.",
    fix:
      "Say 'the shipped pair, 0.9855 / 0.9763'. To cite a retired point, name it as retired — 'at the retired 0.984 rule' — which this rule permits. The shipped figures are in public/models/local-signals-v1/thresholds.json under measured.headline and the by_threshold '0.9855/0.9763' rows.",
    probe: "Both per-register blocks are the fp32 EU server route at the shipped 0.984 flag point.",
    honest: [
      "Measured at the retired 0.984 single-threshold rule, which is the only flag point the registers have been broken out at.",
      "The shipped rule is the minimum-evidence pair 0.9855 primary and 0.9763 secondary.",
      "| 0.984 | 877/922 (95.1%) | 56/4,636 (1.21%) |",
    ],
  },
  {
    id: "withdrawn-length-figures",
    // 67 / 50 / 19 are banned as a LENGTH CLAIM, not as digits — 50% in particular is an ordinary
    // number that appears all over this repository ("the 50% acceptance floor"), so the pattern
    // requires the percentage to be tied to a word count in the same clause.
    pattern: new RegExp(
      String.raw`\b(?:67|67\.0|50|50\.3|19|19\.0)\s*%[^.\n]{0,60}\b(?:at|detected at)\s+(?:100|150|200)\s+words\b` +
        String.raw`|detection at 200\s*/\s*150\s*/\s*100 words` +
        String.raw`|\b67\s*%\s*/\s*50\s*%\s*/\s*19\s*%` +
        String.raw`|\b67%/50%/19%` +
        String.raw`|collapsing to 19(?:\.0)?\s*%`,
      "i",
    ),
    why:
      "Withdrawn on 30 August 2026. The 67% / 50% / 19% truncation study was scored at the retired 0.980 single threshold, kept no per-length AI denominator — its own published rows said 'denominator not recorded; flagged for re-measurement' — and was never re-measured on either shipping runtime. It also truncated long documents rather than measuring naturally short ones, which is a different question.",
    fix:
      "Use the re-measurement, which has denominators and was scored at the shipped pair: 29/172 (16.9%) at 100–199 words and 193/228 (84.6%) at 300–399. In public/models/local-signals-v1/thresholds.json under measured.length_sensitivity.",
    probe: "Short text defeats it: 67% detected at 200 words, 50% at 150, 19% at 100.",
    honest: [
      "Binned by the words a passage actually has, 29 of 172 passages of 100 to 199 words are detected, 16.9%.",
      "193 of 228 AI passages of 300 to 399 words are detected, 84.6%.",
      "The same figures plotted, with the 50% acceptance floor drawn in.",
    ],
  },
  {
    id: "retracted-corpus-independence",
    // Scoped to the TRAINED MODEL and its evaluation corpus. Two neighbouring phrases are
    // deliberately NOT matched, because they are different claims about different corpora and
    // neither has been falsified: "the engine had never seen" (the 922/1,200 corpus the
    // hand-written writing rules were measured on — those rules are not trained, so there is no
    // split to leak across), and "72 held-out rows" (the business-report AUROC sample). A rule
    // that swallows those is a rule that fires on copy nobody has shown to be wrong.
    pattern: new RegExp(
      String.raw`\bmodel had never seen\b` +
        String.raw`|hash[-\s]quarantined` +
        String.raw`|(?:evaluation )?corpor(?:a|us) (?:were|was) never trained on` +
        String.raw`|\bfully held out\b` +
        String.raw`|held out (?:against|from) every training split`,
      "i",
    ),
    why:
      "Retracted on 30 August 2026. The 5,558-document corpus was published as fully held out and hash-quarantined against every training split. That is false for the AI half: of the 922 AI documents 654 are independent of every cycle-2 split and 268 are not, 168 of them in the training split itself. The human half is effectively independent, at 11 of 4,636.",
    fix:
      "State the split: 654 of 922 AI documents independent, 268 not, 168 in training; human 11 of 4,636. The record is measured.corpus.independence_note in thresholds.json and services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt section 2.",
    probe: "Measured on 5,558 long-form documents the model had never seen.",
    honest: [
      "Of the 922 AI documents, 654 are independent of every cycle-2 split and 268 are not.",
      "The writing rules were measured on 922 machine and 1,200 human long-form documents the engine had never seen.",
      "Business reports are data-starved: 72 held-out rows, AUROC 0.69.",
    ],
  },
];

/**
 * Phrases that mark a passage as recording a retraction rather than making a claim.
 *
 * Widened 30 August 2026. The list did not contain the word this project actually writes at the
 * top of its own correction banners: `docs/PER-MODEL-DETECTION.md:3` opens
 * "**CORRECTION, 30 August 2026 — the 5,558-document long-form corpus is not fully held out.**"
 * and `corrected` does not match `CORRECTION`. The audit had already recorded that document as
 * "already carries the correction properly and should be left alone", so the guard would have
 * fired on a correction the audit had cleared — the cry-wolf failure three rules above are
 * written to avoid. `withdrawn`, `retired` and `supersedes` are here for the same reason: they
 * are the honest forms the new rules below prescribe in their own `fix` text, and a rule must
 * stop at the boundary of the form it recommends.
 */
const RETRACTION_MARKERS =
  /superseded|supersedes|retracted|retired|withdrawn|correction|no longer|was wrong|(?:is|was)[\s*]+false|not fully held out|must not be (?:quoted|placed)|corrected|do not quote|do not write|never write|cannot verify|rule out|formerly|previously (said|read|claimed)/i;


/**
 * Uncorrected occurrences of the three rules added on 30 August 2026, as a RATCHET.
 *
 * Read this before assuming it is a suppression list, because the difference matters.
 *
 * The three new rules were switched on over the whole repository at once, and they found 66 live
 * occurrences across 33 files. Every one is a real defect. None of them could be fixed in the same
 * pass: they sit in `docs/` and in the root listing set, which the correctness audit routes to the
 * programme-docs owner and the listing owner (findings 7, 8, 9 and 10), and a second session had
 * uncommitted work in `packages/core/src/verdict/combine.ts` and the WordPress `core.mjs` bundle
 * at the time. Editing 33 files under two other owners to make this file green would have been the
 * worse mistake.
 *
 * The alternatives were all bad. Narrowing the rules until they went green would be the exact
 * thing FAILURE_EPILOGUE forbids. Excluding `docs/` would re-open the scope hole another session
 * had just spent a day closing. Leaving the suite red hands the next person a control they cannot
 * tell apart from a broken one.
 *
 * So the debt is recorded instead, and it is recorded as an EXACT count per file per rule. Adding
 * a new occurrence fails. Adding one to a file already listed fails. Fixing one also fails, until
 * the number here is decremented — which is deliberate: it means the register cannot rot into a
 * list of things that were fixed years ago, and every correction leaves a trace in this file.
 * The count only ever moves downwards, and it is a bug when it reaches nothing and is still here.
 *
 * Nothing in here is permitted to reach a NEW surface. The rules run at full strength everywhere
 * else, including every file added after today.
 *
 * Routing, from docs/programme/CORRECTNESS-AUDIT.md:
 *   docs/, README.md, STATUS.md, CHANGELOG.md, DESCRIPTIONS.md  → programme-docs / listing owner
 *   packages/core/src/verdict/combine.ts and the WordPress assets/js/core.mjs bundle
 *     -> the session holding those files
 *     open. NOTE: these two are the only entries here that are a SHIPPED RUNTIME STRING rather
 *     than a document. `combine.ts` emits the withdrawn 67/50/19 length figures to users of the
 *     WordPress plugin, the Chrome extension, the CLI, the browser package and the Astro package,
 *     and `core.mjs` is that string already compiled into the distributed plugin. They are the
 *     highest-priority rows here and the audit did not find them.
 */
const UNCORRECTED = {
  "retired-operating-point": {
    "README.md": 1,
    "docs/CAPABILITIES.md": 1,
    "docs/EVIDENCE-INDEX.md": 1,
    "docs/legal/DPIA.md": 1,
    "docs/measurements/AGGREGATION-AND-RHYTHM.md": 3,
    "docs/measurements/CORPUS-RECONCILIATION-2026-08-29.md": 2,
    "docs/measurements/ROUTE-PARITY.md": 1,
    "docs/measurements/SEGMENT-TOKEN-FIX.md": 1,
    "docs/programme/CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md": 1,
    "docs/programme/CORRECTNESS-AUDIT.md": 3,
    "docs/programme/PROGRAMME-STATUS.md": 1,
  },
  "withdrawn-length-figures": {
    "CHANGELOG.md": 1,
    "DESCRIPTIONS.md": 2,
    "README.md": 3,
    "docs/CAPABILITIES.md": 2,
    "docs/PER-MODEL-DETECTION.md": 1,
    "docs/TEST-EVIDENCE.md": 1,
    "docs/measurements/SEGMENT-TOKEN-FIX.md": 1,
    "docs/programme/CORRECTNESS-AUDIT.md": 5,
    "docs/programme/HANDOVER.md": 1,
    "docs/programme/design/PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md": 1,
    "packages/core/src/verdict/combine.ts": 1,
    "wordpress/opace-ai-content-integrity/assets/js/core.mjs": 1,
  },
  "retracted-corpus-independence": {
    "CHANGELOG.md": 1,
    "DESCRIPTIONS.md": 2,
    "README.md": 2,
    "STATUS.md": 1,
    "docs/CAPABILITIES.md": 2,
    "docs/TEST-EVIDENCE.md": 1,
    "docs/decisions/OWNER-DECISIONS.md": 1,
    "docs/legal/LAWFUL-BASIS-AND-TRANSPARENCY.md": 1,
    "docs/programme/CORRECTNESS-AUDIT.md": 2,
    "docs/programme/PROGRAMME-OVERVIEW.md": 1,
    "docs/programme/PROGRAMME-STATUS.md": 1,
    "docs/programme/RESEARCH-PAGES-PLAN.md": 4,
    "docs/programme/design/mockups/checker.html": 2,
    "docs/programme/design/mockups/compare.html": 2,
    "docs/programme/design/mockups/index.html": 2,
    "docs/programme/design/mockups/system.html": 2,
    "docs/programme/design/mockups/watermark-lab.html": 2,
    "docs/research-drafts/burstiness-does-not-work.md": 1,
  },
};

/** Split failures into the ones the register accounts for and the ones it does not. */
function applyRegister(failures) {
  const budget = {};
  for (const [id, files] of Object.entries(UNCORRECTED)) budget[id] = { ...files };
  const unregistered = [];
  for (const f of failures) {
    const [, file, id] = /^(.*?):\d+ \[([^\]]+)\]/.exec(f) ?? [];
    const key = file?.split("\\").join("/");
    if (key && budget[id]?.[key] > 0) {
      budget[id][key] -= 1;
      continue;
    }
    unregistered.push(f);
  }
  const overStated = [];
  for (const [id, files] of Object.entries(budget)) {
    for (const [file, left] of Object.entries(files)) {
      if (left > 0) overStated.push(`${id} ${file}: ${left} fewer than recorded`);
    }
  }
  return { unregistered, overStated };
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue;
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

/** A rule's pattern with the global flag, so every occurrence is reported, not just the first. */
function everyMatch(rule, text) {
  return text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g"));
}

/**
 * Report every match whose own ±400-character window carries no retraction marker.
 *
 * `allMatches` false keeps the older first-match-only behaviour. It is used for the website
 * checkout and nowhere else — see the website test for why.
 */
function scan(files, { allMatches }) {
  const failures = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const rule of BANNED) {
      const matches = allMatches ? [...everyMatch(rule, text)] : [rule.pattern.exec(text)].filter(Boolean);
      for (const match of matches) {
        // Allow a correction note to quote the claim it is retracting.
        const around = text.slice(Math.max(0, match.index - 400), match.index + 400);
        if (RETRACTION_MARKERS.test(around)) continue;
        failures.push(
          `${relative(REPO, file)}:${lineOf(text, match.index)} [${rule.id}]\n` +
            `    found: ${JSON.stringify(match[0])}\n` +
            `    why:   ${rule.why}\n` +
            `    fix:   ${rule.fix}`,
        );
        if (!allMatches) break;
      }
    }
  }
  return failures;
}

const websiteAvailable = existsSync(WEBSITE);

const FAILURE_EPILOGUE =
  "\n\nThese reach a reader. Correct the claim rather than the test, unless the text is " +
  "deliberately recording a retraction — in which case say so in the surrounding sentence. " +
  "Never loosen a rule to get a green run.";

test("repository source carries no banned claim", () => {
  // This test does NOT skip. It needs nothing but this checkout, and the previous version skipped
  // it along with everything else whenever the sibling website was absent — so on any machine
  // without that checkout the entire control reported success while reading nothing at all.
  const files = [...REPO_DIRS.filter((d) => existsSync(d)).flatMap((d) => walk(d)), ...rootFiles()];
  assert.ok(
    files.length > 200,
    `the repository scan visited ${files.length} files. A guard that visits nothing passes for the ` +
      "same reason a broken one does. Check REPO_DIRS, SCANNED and SKIP_DIRS.",
  );
  const all = scan(files, { allMatches: true });
  const { unregistered, overStated } = applyRegister(all);
  assert.deepEqual(
    unregistered,
    [],
    `Claims banned on shipped surfaces:\n\n${unregistered.join("\n\n")}${FAILURE_EPILOGUE}`,
  );
  assert.deepEqual(
    overStated,
    [],
    "UNCORRECTED over-states the debt. Something in it has been fixed, which is good — decrement " +
      "or delete the entry so the register keeps describing the repository:\n  " +
      overStated.join("\n  "),
  );
});

test("website source carries no banned claim", { skip: websiteAvailable ? false : "website checkout not present" }, () => {
  // First-match-only, unlike the repository scan above. The website is a separate checkout this
  // repository does not own and cannot edit, so a finding here cannot be fixed from this side.
  // Reporting every match currently surfaces one real gap that must be handed over rather than
  // silently absorbed: `lib/local-signals/model-store.ts:44` repeats the retracted 66.7% aggregate
  // 1,425 characters after the "SUPERSEDED FIGURES" heading that covers it, so it falls outside
  // the marker window and reads as a live claim in isolation. Fix that marker in the website repo,
  // then delete this comment and pass allMatches: true.
  const files = walk(WEBSITE);
  assert.ok(files.length > 100, `the website scan visited ${files.length} files — that is a skip wearing a pass`);
  const failures = scan(files, { allMatches: false });
  assert.deepEqual(failures, [], `Claims banned on shipped surfaces:\n\n${failures.join("\n\n")}${FAILURE_EPILOGUE}`);
});

test("every rule fires on its own probe", () => {
  // A guard nobody has seen fail is not known to work. This project shipped a
  // kill switch that was tested three times from the wrong entry point and was
  // dead the whole time; the lesson generalises.
  for (const rule of BANNED) {
    assert.ok(rule.probe, `no probe defined for rule ${rule.id}`);
    assert.ok(rule.pattern.test(rule.probe), `rule ${rule.id} failed to match its own probe: ${rule.probe}`);
  }
});

test("no rule fires on the honest form it protects", () => {
  // The other half of the same requirement, and the half that keeps failing. A rule that only ever
  // proves it can fire is half tested: two rules here were matching the disclaimers they exist to
  // protect, a third was matching four correct denominated measurements that happened to equal
  // two thirds, and nothing caught any of it because no probe asserted the negative. Every rule
  // now carries at least one honest counter-probe, and this test fails if one does not.
  for (const rule of BANNED) {
    assert.ok(
      Array.isArray(rule.honest) && rule.honest.length > 0,
      `rule ${rule.id} has no honest counter-probe. Every rule needs one: proving a rule can fire ` +
        "says nothing about whether it fires on the copy it protects.",
    );
    for (const sentence of rule.honest) {
      assert.equal(rule.pattern.test(sentence), false, `rule ${rule.id} cried wolf on correct copy: ${sentence}`);
    }
  }
});

test("the scan actually reads the surfaces it claims to", () => {
  // Named surfaces, asserted individually. `files.length > 200` would stay green if `docs/` fell
  // out of scope entirely, which is precisely the failure this guard was found in.
  const files = [...REPO_DIRS.filter((d) => existsSync(d)).flatMap((d) => walk(d)), ...rootFiles()].map((f) =>
    relative(REPO, f),
  );
  const mustBeRead = [
    "docs/CAPABILITIES.md",
    "docs/programme/HANDOVER.md",
    "docs/programme/design/FAQ-CONTENT-PACK-2026-08-29.md",
    "packages/core/README.md",
    "packages/core/src/verdict/combine.ts",
    "wordpress/opace-ai-content-integrity/readme.txt",
    "wordpress/opace-ai-content-integrity/assets/js/core.mjs",
    // The five public npm listings. Named one by one, because "something under packages/ was
    // scanned" stayed true while four of these five were unread — the shape of the hole the
    // correctness audit found (finding 1) and the shape of the defect it found in them (finding 3).
    "packages/cli/README.md",
    "packages/browser/README.md",
    "packages/astro/README.md",
    "packages/watermark-lab/README.md",
    "extensions/chrome/README.md",
    // The text submitted to Google. Hard to retract once it is public.
    "extensions/submission/chrome-web-store/store-listing.md",
    "extensions/submission/chrome-web-store/SUBMISSION-README.md",
    "submission-prep/submission-manifest.json",
    "DESCRIPTIONS.md",
    "README.md",
  ];
  const set = new Set(files.map((f) => f.split("\\").join("/")));
  const missing = mustBeRead.filter((f) => !set.has(f));
  assert.deepEqual(missing, [], `these shipped surfaces are not in the scanned set: ${missing.join(", ")}`);
  // Directory-level cover, so a whole area cannot quietly leave scope.
  for (const prefix of ["docs/", "packages/", "wordpress/", "extensions/", "submission-prep/", "schemas/"]) {
    assert.ok(
      files.some((f) => f.startsWith(prefix)),
      `nothing under ${prefix} was scanned`,
    );
  }
  assert.ok(
    files.some((f) => f.endsWith(".html")),
    "the HTML mockups must be in the scanned set — they are public and they carry copy",
  );
  assert.ok(
    files.some((f) => f.endsWith(".php")),
    "the WordPress plugin's PHP must be in the scanned set — its strings are shown to editors",
  );
});

test("a retraction may quote the claim it retracts", () => {
  const text = "The 66.7% rules figure is superseded and must not be quoted.";
  const rule = BANNED.find((r) => r.id === "superseded-66-7");
  const match = rule.pattern.exec(text);
  assert.ok(match, "probe should match the banned pattern");
  const around = text.slice(Math.max(0, match.index - 400), match.index + 400);
  assert.ok(RETRACTION_MARKERS.test(around), "a sentence marked superseded must be permitted");
});
