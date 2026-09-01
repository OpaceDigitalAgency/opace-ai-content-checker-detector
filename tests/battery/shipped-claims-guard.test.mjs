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
 * That marker window is gone. It was a ±400-character radius, and on 30 August 2026 it was found
 * doing the opposite harm as well: suppressing a LIVE false claim in `PROGRAMME-STATUS.md`
 * because an unrelated "was wrong" sat 400 characters away. A marker now has to share a passage
 * with the claim, or govern it from a heading, banner, table header or blockquote lead-in. See
 * `markerGoverns`.
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
const SITE = join(HERE, "..", "..", "..", "..", "..", "opace-website", "astro-latest");

/**
 * Website scope. `src/` is what a person edits, which is why the scan reads source rather than
 * `dist`.
 *
 * `public/` was added on 30 August 2026. It had never been read, and it is not a build directory:
 * Astro copies it to the site root byte for byte, so everything in it is served to visitors at 200
 * without passing through any component, page or test. `public/models/local-signals-v1/
 * thresholds.json` lives there — the file the checker fetches and renders into its own disclosure
 * panel — and on 30 August it was found carrying a self-contradictory published claim about which
 * operating points the registers had been broken out at. A published claim that no guard reads is
 * the exact shape of defect this file exists for, and `src/`-only scope meant the most-quoted
 * numbers on the whole site sat outside it.
 */
const WEBSITE_DIRS = [join(SITE, "src"), join(SITE, "public")];
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
 *   docs/           public the moment it is pushed. `docs/programme/` moved out to the private
 *       programme-private repository on 1 September 2026 (repository hygiene split) because it
 *       held internal task boards, handovers and audit registers rather than public product
 *       claims; what remains under docs/ is architecture, capability, evidence, legal and
 *       measurement material.
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
        String.raw`|confirms? (human|AI) authorship` +
        String.raw`|(?:this is |the )?only check[^.]{0,100}gives? an authorship reading`,
      "i",
    ),
    why: "The project's first rule: no score is proof of authorship.",
    fix: "Name the check, its version and its limits.",
    probe: "This is the only check in the product that gives an authorship reading.",
    honest: [
      "Nothing this tool produces is proof of authorship, and no combination of the three answers adds up to one.",
      "A score is never proof of authorship.",
      "Only the trained model sets the AI-pattern reading; no check establishes authorship.",
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
      // Was "…the only flag point the registers have been broken out at" until 30 August 2026,
      // when Table 3 of DETECTION-BY-LENGTH-AND-MODEL.md broke them out at the shipped pair too.
      // A counter-probe has to stay a sentence the project would actually publish, or it stops
      // being a test of the honest form and becomes a fossil of a retracted one.
      "Measured at the retired 0.984 single-threshold rule, under segments-v2.",
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
 * ── 30 August 2026, the marker window ────────────────────────────────────────
 *
 * A marker used to suppress a match if it appeared anywhere in the +/-400 characters around it.
 * That window could not tell "this figure is withdrawn" from "something else nearby was wrong",
 * and on this file's own evidence it was already hiding a live claim:
 * `docs/programme/PROGRAMME-STATUS.md:37` asserted the withdrawn 67% / 50% / 19% length figures
 * as fact, and the guard matched it and then dropped it, because the phrase "was wrong" sat about
 * 400 characters away on line 35 — in a paragraph about edited AI, an entirely unrelated matter.
 * The claim had never been registered in UNCORRECTED, because it never surfaced as a failure. An
 * unrelated retraction elsewhere in a file was silencing a live false claim, which is the exact
 * defect this file's own header had predicted and then sat above.
 *
 * Shrinking the window to a smaller number would have been the wrong fix. It trades false
 * negatives for false positives, and four rules above already record having been narrowed for
 * firing on the honest disclaimers they existed to protect. A guard that cries wolf gets switched
 * off, and then it guards nothing.
 *
 * So the marker is tied to the matched text instead of to a radius, and it governs in exactly
 * three shapes, each of which a person writing a retraction actually produces:
 *
 *   1. THE SAME SENTENCE. "The figures published until 30 August 2026 as 67% at 200 words are
 *      withdrawn" carries its own marker. This is the form every rule's `fix` text prescribes,
 *      and the form the website's `model-store.ts` was corrected into.
 *   2. THE GOVERNING HEADING, or a standalone bold banner above the passage — "## Superseded
 *      figures", "**CORRECTION, 30 August 2026 — ...**". A heading is a deliberate structural
 *      marker, not incidental prose that happens to be nearby, which is the whole difference.
 *   3. THE TABLE HEADER ROW, for a figure inside a correction table, where the retraction is
 *      stated once at the top of the table rather than in all forty rows.
 *
 * Distance no longer matters in either direction: a marker in the same sentence counts however
 * long the sentence is, and a marker one line away in a different sentence does not count at all.
 */
/**
 * A heading: Markdown, or an HTML/Astro one. The HTML form matters because half the scanned
 * surface is `.astro` and `.html`, where the retraction banner over a passage is an `<h2>` and
 * never a `#` — which is how `detection-and-document-length.astro` read as a live claim under an
 * `<h2>` reading "The corpus is not fully held out, and by how much".
 */
const HEADING_LINE = /^\s{0,3}#{1,6}\s|<h[1-6][\s>]/i;
const TABLE_ROW_LINE = /^\s{0,3}\|/;
/**
 * A line that STARTS a list item. It bounds a passage: two consecutive bullets are two records,
 * not one paragraph, so a marker in the bullet above must not reach the claim in the bullet
 * below. Continuation lines of a wrapped item are indented and do not match, so a wrapped item
 * stays whole.
 *
 * `*` is deliberately NOT a bullet character here. Every list in this project is written with
 * `-`, whereas ` * ` at the start of a line is a JSDoc continuation in every `.ts` and `.mjs`
 * file scanned — including this one. Treating it as a bullet cut block comments into one-line
 * passages, which split `measured-figures.ts` and `model-store.ts` away from the retractions
 * written directly beneath them and reported both as live claims.
 */
const LIST_ITEM_LINE = /^\s{0,3}(?:[-+]\s|\d+[.)]\s)/;
/**
 * A blockquote line. This project retracts copy by QUOTING it — "Replace this retracted wording:"
 * followed by a blank line and then the old sentence in a blockquote — so the marker is never
 * inside the quote. It cannot be: the quote is a verbatim copy of the wording being removed.
 * The lead-in line directly above the quote is what governs it, and `governingBanners` adds it.
 */
const BLOCKQUOTE_LINE = /^\s{0,3}>/;
/** The `|---|---|` rule under a Markdown table's header row. */
const TABLE_RULE_LINE = /^\s{0,3}\|[\s:|-]+\|?\s*$/;
/**
 * A line that is entirely bold, i.e. a banner: `**CORRECTION, 30 August 2026 - ...**`.
 *
 * Written with string operations rather than as one regex on purpose. The regex form of this
 * — `/^\s{0,3}(?:\*\*|__)[\s\S]*(?:\*\*|__)[\s.,;:!?)-]*$/` — backtracks catastrophically on
 * the long unclosed-bold lines this repository is full of, and it took the whole suite from
 * about a second to not finishing at all.
 */
const BANNER_TAIL = /[\s.,;:!?)\u2014-]+$/;
function isBannerLine(line) {
  const trimmed = line.trim();
  if (trimmed.length < 5) return false;
  if (!trimmed.startsWith("**") && !trimmed.startsWith("__")) return false;
  const body = trimmed.replace(BANNER_TAIL, "");
  return body.endsWith("**") || body.endsWith("__");
}

function lineBounds(text, index) {
  const start = text.lastIndexOf("\n", index) + 1;
  const found = text.indexOf("\n", index);
  return [start, found === -1 ? text.length : found];
}

/**
 * The line above the one starting at `lineStart`, or null at the top of the file.
 *
 * Written separately because the obvious `lineBounds(text, lineStart - 1)` is wrong: `lineStart-1`
 * IS the newline that ends the previous line, and `lastIndexOf("\n", lineStart - 1)` then returns
 * that same index, so the call yields an inverted empty range. Every upward walk silently stopped
 * after one step, which made hard-wrapped paragraphs read as single lines and meant no governing
 * heading was ever found.
 */
function previousLine(text, lineStart) {
  if (lineStart <= 0) return null;
  const end = lineStart - 1;
  const start = end === 0 ? 0 : text.lastIndexOf("\n", end - 1) + 1;
  return [start, end];
}

/**
 * The passage a match sits in: one paragraph, one list item, one table row or one heading.
 *
 * This is the unit a marker has to share with the claim. It is a STRUCTURAL boundary, never a
 * radius — that distinction is the whole point of this rewrite. A blank line, a heading, a table
 * row and the start of a list item all end a passage, so a retraction in the bullet above or the
 * paragraph above cannot reach the claim below it. A hard-wrapped paragraph stays one unit,
 * because its continuation lines are neither blank nor structural, and a wrapped list item stays
 * one unit because its continuation lines are indented.
 */
function passageBounds(text, index) {
  let [start, end] = lineBounds(text, index);
  const line = text.slice(start, end);
  if (TABLE_ROW_LINE.test(line) || HEADING_LINE.test(line)) return [start, end];
  if (BLOCKQUOTE_LINE.test(line)) {
    // A quoted block is one passage, and never merges with the prose around it.
    while (end < text.length) {
      const [nextStart, nextEnd] = lineBounds(text, end + 1);
      if (!BLOCKQUOTE_LINE.test(text.slice(nextStart, nextEnd))) break;
      end = nextEnd;
    }
    for (;;) {
      const above = previousLine(text, start);
      if (!above || !BLOCKQUOTE_LINE.test(text.slice(above[0], above[1]))) break;
      start = above[0];
    }
    return [start, end];
  }
  for (;;) {
    // Reached the line that opens a list item: this is the top of the passage.
    if (LIST_ITEM_LINE.test(text.slice(start, lineBounds(text, start)[1]))) break;
    const above = previousLine(text, start);
    if (!above) break;
    const previous = text.slice(above[0], above[1]);
    if (!previous.trim() || HEADING_LINE.test(previous) || TABLE_ROW_LINE.test(previous)) break;
    start = above[0];
  }
  while (end < text.length) {
    const [nextStart, nextEnd] = lineBounds(text, end + 1);
    const next = text.slice(nextStart, nextEnd);
    if (!next.trim() || HEADING_LINE.test(next) || TABLE_ROW_LINE.test(next) || LIST_ITEM_LINE.test(next)) break;
    end = nextEnd;
  }
  return [start, end];
}

/**
 * For a match inside a blockquote, the line that introduces the quote: the nearest non-blank,
 * non-blockquote line above the quoted block. Empty for anything not in a blockquote.
 */
function blockquoteLeadIn(text, index) {
  let [start, end] = lineBounds(text, index);
  if (!BLOCKQUOTE_LINE.test(text.slice(start, end))) return "";
  for (let guard = 0; guard < 200; guard += 1) {
    const above = previousLine(text, start);
    if (!above) return "";
    const line = text.slice(above[0], above[1]);
    start = above[0];
    if (!line.trim() || BLOCKQUOTE_LINE.test(line)) continue;
    return line;
  }
  return "";
}

/**
 * The explicit banners governing a match: the nearest preceding heading, any standalone bold
 * banner between that heading and the match, the header row of an enclosing table, and the
 * lead-in line above an enclosing blockquote. Bounded by the heading, so a marker in a different
 * section never reaches.
 */
function governingBanners(text, index) {
  const banners = [];
  let [cursor] = lineBounds(text, index);
  const [currentStart, currentEnd] = lineBounds(text, index);
  // Rows of the table the match sits in, collected top-down as the walk goes up. Only the HEADER
  // row governs — the row directly above the `|---|` rule. Any other row is a sibling record, and
  // letting a sibling's retraction cover this row would be the neighbour problem again, in a
  // table.
  const tableRows = [];
  let inTable = TABLE_ROW_LINE.test(text.slice(currentStart, currentEnd));
  if (inTable) tableRows.unshift(text.slice(currentStart, currentEnd));
  // Bounded so a match near the end of a very long file does not rescan the whole of it. The
  // search stops at the first heading anyway; this only caps the pathological case.
  for (let guard = 0; guard < 2000; guard += 1) {
    const above = previousLine(text, cursor);
    if (!above) break;
    const [start, end] = above;
    const line = text.slice(start, end);
    if (TABLE_ROW_LINE.test(line)) {
      if (inTable) tableRows.unshift(line);
    } else {
      inTable = false;
    }
    if (HEADING_LINE.test(line)) {
      banners.push(line);
      break;
    }
    if (isBannerLine(line)) banners.push(line);
    cursor = start;
  }
  if (tableRows.length > 1 && TABLE_RULE_LINE.test(tableRows[1])) banners.push(tableRows[0]);
  banners.push(blockquoteLeadIn(text, index));
  return banners.join("\n");
}

/**
 * Does a retraction marker PLAINLY refer to this match? Same sentence, or an explicit banner
 * governing the passage. Never merely "somewhere nearby".
 */
function markerGoverns(text, index, length) {
  const [start, end] = passageBounds(text, index);
  if (RETRACTION_MARKERS.test(text.slice(start, end))) return true;
  return RETRACTION_MARKERS.test(governingBanners(text, index));
}


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
    "docs/legal/DPIA.md": 1,
    "docs/measurements/AGGREGATION-AND-RHYTHM.md": 3,
    "docs/measurements/CORPUS-RECONCILIATION-2026-08-29.md": 2,
    "docs/measurements/ROUTE-PARITY.md": 1,
    "docs/measurements/SEGMENT-TOKEN-FIX.md": 1,
    // CAPABILITIES.md and EVIDENCE-INDEX.md paid off their remaining occurrences in the
    // 1 September 2026 current-state reconciliation. PROGRAMME-STATUS.md paid one off on
    // 30 August 2026: the WordPress candidate bullet was
    // rewritten for the 1.0.7 repack and the retired operating point went with it. Its remaining
    // occurrence was paid off the same day, when the headline paragraph stopped naming 0.984 as
    // the live operating point.
    // CLAIM-WORDING-CORRECTION-REGISTER-2026-08-29.md paid one off on 30 August 2026: the marker
    // rule now reads its quoted retractions as the records they are, so the entry was never a
    // defect, only a mis-read. The register only ever moves downwards.
    // "docs/programme/CORRECTNESS-AUDIT.md": 3 was retired here on 1 September 2026, not paid off:
    // the whole docs/programme/ tree moved to the private programme-private repository (repository
    // hygiene split, see TASK-BOARD there) and is no longer part of this scan. Nothing was fixed;
    // the surface it lived on left this repository.
  },
  "retracted-corpus-independence": {
    "CHANGELOG.md": 1,
    // DESCRIPTIONS.md paid off its remaining two occurrences in the Cycle-5 copy renewal;
    // STATUS.md, CAPABILITIES.md and TEST-EVIDENCE.md paid off theirs in the 1 September 2026
    // current-state reconciliation. The register only moves downwards.
    // README.md paid off both remaining occurrences on 1 September 2026. The GitHub homepage now
    // identifies the long-form corpus as partly seen and publishes the exact overlap instead.
    "docs/research-drafts/burstiness-does-not-work.md": 1,
    // PROGRAMME-STATUS.md paid one off on 30 August 2026 in the 1.0.7 repack rewrite, and its last
    // one when the headline paragraph replaced "documents the model had never seen" with the
    // measured split. PROGRAMME-OVERVIEW.md paid its one off in the same pass, for the same
    // sentence. LAWFUL-BASIS-AND-TRANSPARENCY.md and one of CORRECTNESS-AUDIT.md's two were never
    // defects: both are retraction records that the ±400-character window mis-read and the
    // passage rule now reads correctly.
    // "docs/decisions/OWNER-DECISIONS.md": 1, "docs/programme/CORRECTNESS-AUDIT.md": 1,
    // "docs/programme/RESEARCH-PAGES-PLAN.md": 4 and the five docs/programme/design/mockups/*.html
    // rows were retired here on 1 September 2026: docs/decisions/ and docs/programme/ both moved
    // to the private programme-private repository and are no longer part of this scan.
  },
  "superseded-66-7": {
    // Not a claim: a dated UX audit inventory of every number the checker page showed a visitor
    // on 29 August 2026, as a bare comma-separated list. The rule fires because "1,727" — its
    // aggregate anchor — sits in the same list. Recorded rather than rewritten: the list measures
    // the page as it then stood, and narrowing the anchor would weaken a rule doing its job.
    // "docs/programme/design/UX-AUDIT-LIVE-2026-08-29.md": 1 was retired here on 1 September 2026:
    // docs/programme/ moved to the private programme-private repository.
  },
  "withdrawn-length-figures": {
    "CHANGELOG.md": 1,
    // DESCRIPTIONS.md paid off both occurrences on 1 September 2026 in the Cycle-5 copy renewal;
    // CAPABILITIES.md and TEST-EVIDENCE.md paid off their remaining occurrences in the same day's
    // current-state reconciliation.
    "README.md": 3,
    "docs/PER-MODEL-DETECTION.md": 1,
    "docs/measurements/SEGMENT-TOKEN-FIX.md": 1,
    // A dated design record. It quotes the string as a code literal to be deleted from
    // KNOWN_LIMITS_TEXT, inside a plan describing that work; rewriting it would falsify the record
    // of what the plan said. Revealed on 30 August 2026 when the marker window was closed.
    // One of CORRECTNESS-AUDIT.md's five came off on 30 August 2026: it is a marked retraction the
    // old window mis-read. CAPABILITIES.md and DPIA.md each dropped an occurrence the same day,
    // both of which asserted the withdrawn 67 / 50 / 19 figures as current.
    // "docs/programme/CORRECTNESS-AUDIT.md": 4, "docs/programme/HANDOVER.md": 1,
    // "docs/programme/design/IMPLEMENTATION-PLAN-2026-08-29.md": 1 and
    // "docs/programme/design/PLAIN-LANGUAGE-AND-SCORING-SYSTEM-2026-08-29.md": 1 were retired here
    // on 1 September 2026: docs/programme/ moved to the private programme-private repository.
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
 * Report every match that no retraction marker plainly governs — see `markerGoverns`.
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
        // Allow a correction note to quote the claim it is retracting — but only where the
        // marker plainly refers to THIS claim, not merely to something nearby.
        if (markerGoverns(text, match.index, match[0].length)) continue;
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

const websiteAvailable = WEBSITE_DIRS.every((d) => existsSync(d));

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
  // Every match, exactly like the repository scan above. It was first-match-only until
  // 30 August 2026, held back by a single marker gap: `lib/local-signals/model-store.ts:44`
  // repeated the retracted 66.7% aggregate 1,425 characters after the "SUPERSEDED FIGURES"
  // heading meant to cover it, outside the ±400-character marker window, so it read as a live
  // claim in isolation. That marker now sits in the same sentence as the figure, and the reason
  // for the narrower scan is gone. First-match-only was never the safe setting: it stops at the
  // first hit in a file, so one marked retraction near the top hides every live claim below it —
  // the precise failure this guard exists to catch. Do not narrow it again.
  const files = WEBSITE_DIRS.flatMap((d) => walk(d));
  assert.ok(files.length > 100, `the website scan visited ${files.length} files — that is a skip wearing a pass`);
  // Both halves of the scope, asserted separately. A count alone stays green while one whole
  // directory drops out, which is how `public/` went unread until 30 August 2026 — and `public/`
  // contributes only single figures of files, so it could never move the count above.
  const seen = files.map((f) => f.split("\\").join("/"));
  for (const half of ["/src/", "/public/"]) {
    assert.ok(seen.some((f) => f.includes(half)), `nothing under the website's ${half} was scanned`);
  }
  assert.ok(
    seen.some((f) => f.endsWith("public/models/local-signals-v1/thresholds.json")),
    "the checker's published thresholds file must be in the scanned set — it is served at 200 and " +
      "its prose is rendered into the checker's own disclosure panel",
  );
  const failures = scan(files, { allMatches: true });
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
    // docs/programme/HANDOVER.md and docs/programme/design/FAQ-CONTENT-PACK-2026-08-29.md proved
    // nested-directory coverage here until 1 September 2026, when docs/programme/ moved to the
    // private programme-private repository. These two nested docs/ files carry that job now.
    "docs/measurements/SEGMENT-TOKEN-FIX.md",
    "docs/research-drafts/why-length-dominates.md",
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

/** Where the rules fire on a body of text, as [ruleId, matchedText] pairs. For the tests below. */
function findings(text) {
  const out = [];
  for (const rule of BANNED) {
    for (const match of everyMatch(rule, text)) {
      if (markerGoverns(text, match.index, match[0].length)) continue;
      out.push([rule.id, match[0]]);
    }
  }
  return out;
}

test("a retraction may quote the claim it retracts", () => {
  // Tier 1: the marker is in the same sentence as the figure.
  assert.deepEqual(findings("The 66.7% rules figure is superseded and must not be quoted."), []);
  assert.deepEqual(
    findings(
      "The figures published until 30 August 2026 as 67% at 200 words, 50% at 150 and 19% at 100 " +
        "are withdrawn: they were scored at the retired 0.980 threshold.",
    ),
    [],
  );
  // Tier 2: a governing heading.
  assert.deepEqual(
    findings("## Superseded figures\n\nShort text defeats it: 67% detected at 200 words.\n"),
    [],
  );
  // Tier 2: a standalone bold banner.
  assert.deepEqual(
    findings("**CORRECTION, 30 August 2026.**\n\nShort text defeats it: 67% detected at 200 words.\n"),
    [],
  );
  // Tier 3: a table header row carrying the marker.
  assert.deepEqual(
    findings("| retired rule | detection |\n| --- | --- |\n| 0.980 | 67% detected at 200 words |\n"),
    [],
  );
});

test("an unrelated retraction nearby does not silence a live claim", () => {
  // This is PROGRAMME-STATUS.md as it stood on 30 August 2026, reduced to the two paragraphs that
  // mattered. The live short-text claim is its own sentence and its own paragraph; the phrase
  // "was wrong" belongs to the paragraph above it, about edited AI — a different subject
  // entirely. The old ±400-character window read that as permission and dropped the match, so
  // the claim never appeared as a failure and never reached UNCORRECTED.
  const shaped =
    "**Edited AI.** An AI draft that a person then tidies is detected 82.3% of the time. The " +
    "earlier live copy saying lightly-edited AI is \"missed almost entirely\" was wrong, " +
    "understated the tool, and was corrected in commit `ce56ac54`. It must not be restored.\n\n" +
    "**Short text.** Detection is 67% at 200 words, 50% at 150 and 19% at 100. Short human text " +
    "is not falsely flagged (0/400 at 60-200 words). Both facts are disclosed on the page.\n";

  // The old rule: a marker anywhere within ±400 characters. Kept here as a WITNESS, so the
  // regression is pinned rather than described. If this assertion ever fails, the window has
  // come back.
  const rule = BANNED.find((r) => r.id === "withdrawn-length-figures");
  const match = rule.pattern.exec(shaped);
  assert.ok(match, "the live claim must match the rule in the first place");
  const oldWindow = shaped.slice(Math.max(0, match.index - 400), match.index + 400);
  assert.ok(
    RETRACTION_MARKERS.test(oldWindow),
    "the ±400 window must be shown to have contained a marker — otherwise this test proves nothing",
  );

  // The rule that ships now: the claim is reported, because nothing retracts THIS figure.
  assert.deepEqual(findings(shaped), [["withdrawn-length-figures", "67% at 200 words"]]);
});

test("a marker in a neighbouring passage does not reach", () => {
  // The narrow half of the same requirement, and the half that decides whether this is a real
  // fix or just a smaller window. The unit is structural: a blank line, a bullet and a table row
  // each end it. A marker on the other side of one of those boundaries does not count, however
  // close it sits on the page — one line away is still a different record.

  // Neighbouring paragraph, one blank line apart.
  assert.deepEqual(
    findings("The route-parity note was wrong and has been corrected.\n\nDetection is 67% at 200 words.\n"),
    [["withdrawn-length-figures", "67% at 200 words"]],
  );
  // Neighbouring bullet: adjacent lines, no blank line at all.
  assert.deepEqual(
    findings("- The corpus figure is withdrawn.\n- Detection is 67% at 200 words.\n"),
    [["withdrawn-length-figures", "67% at 200 words"]],
  );
  // Neighbouring table row. The header governs the table; a sibling DATA row does not.
  assert.deepEqual(
    findings(
      "| case | note |\n|---|---|\n| a | the corpus figure is withdrawn |\n" +
        "| b | detection is 67% at 200 words |\n",
    ),
    [["withdrawn-length-figures", "67% at 200 words"]],
  );
  // ...but a header row that retracts the whole table does.
  assert.deepEqual(
    findings("| case | withdrawn figures, kept for reference |\n|---|---|\n| b | detection is 67% at 200 words |\n"),
    [],
  );

  // And each passes the moment the marker joins the claim's own passage.
  assert.deepEqual(findings("Detection was published as 67% at 200 words; that figure is withdrawn.\n"), []);
  assert.deepEqual(findings("- Detection is 67% at 200 words.\n  That figure is withdrawn.\n"), []);
  assert.deepEqual(findings("| b | detection is 67% at 200 words, now withdrawn |\n"), []);
});

test("a quoted retraction is governed by the line that introduces it", () => {
  // This project retracts copy by quoting it verbatim, so the marker can never be inside the
  // quote — the quote is a copy of the wording being removed. Two correction registers read as
  // live claims until the lead-in line was made to govern the block.
  assert.deepEqual(findings("Replace this retracted wording:\n\n> Detection is 67% at 200 words.\n"), []);
  // An ordinary quote with no retraction above it is still a claim.
  assert.deepEqual(
    findings("The panel reads:\n\n> Detection is 67% at 200 words.\n"),
    [["withdrawn-length-figures", "67% at 200 words"]],
  );
});

test("a JSDoc block is one passage, not a bullet per line", () => {
  // ` * ` opens a comment continuation in every .ts and .mjs file scanned, including this one.
  // Reading it as a Markdown bullet split two website modules away from the retractions written
  // directly beneath them, and reported both as live claims.
  const source = [
    "/**",
    ' * It said "documents the model had never seen" until 30 August 2026. That was',
    " * false for the AI half: 268 of the 922 AI documents appear in a cycle-2 split.",
    " */",
    "",
  ].join("\n");
  assert.deepEqual(findings(source), []);
});
