# @opacedev/ai-content-checker-cli

![Free Opace AI Content Checker, Detector and Watermark Tools](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-checker-detector/main/docs/assets/opace-ai-content-checker-detector-hero-v3.png)

Node CLI for offline Opace AI Content Checker & Detector inspection, protected-span checks, comparison and hash-only receipt operations, plus an explicit authenticated route to the Python loopback full checker.

`opace-ai-checker --format json inspect -` reads UTF-8 stdin and writes machine output without banners or progress. `--offline` asserts the zero-network path; `--quiet` suppresses text-mode output. Unsupported configuration/cache options and held commands fail explicitly rather than being silently ignored. No model is bundled in the CLI. `--local-engine` asks an already-running, explicitly configured loopback engine for the canonical full-checker result; provider calls, public watermark fixtures and content-bearing receipt storage remain unavailable.

MIT licensed.

Requires Node.js 20 or newer. The package installs the `opace-ai-checker` executable and uses the same frozen contract and deterministic core as the browser surfaces.

The command was called `opace-integrity` before 0.3.0. That name is still installed as an alias for this one release so existing scripts keep working; it will be removed in the next minor version. Use `opace-ai-checker` in anything new.

> Release state: 0.3.1 is a local candidate, not an npm release. Documentation edits require refreshed archive hashes. The registry install command applies after publication.

## Free AI content checker CLI for files and pipelines

Review UTF-8 text files or standard input from a repeatable command-line workflow. The offline command checks invisible characters, protected facts and editorial signals. For a trained AI content detector reading, explicitly connect the configured local Python engine; the npm package alone does not include a model.

Use the Node CLI for content-review scripts, receipt verification and local editorial handoffs. It returns structured results that a developer can inspect without parsing a coloured terminal display.

## New in 0.3.1

The canonical full-result report includes section scores, passages, evidence and the shared printable layout. This documentation revision clarifies the offline/model distinction, installation and privacy. The model and operating point are unchanged.

## Offline text checker or local AI detector?

| Task | Route | Result |
| --- | --- | --- |
| Inspect characters and writing suggestions | Default offline command | Deterministic findings; AI pattern not assessed |
| Review AI writing patterns | Explicit `--local-engine` with a configured model | Full section-based model result |
| Keep a machine-readable check record | JSON/JSONL output | Structured evidence suitable for your workflow |
| Share the full reading | HTML report | Printable report containing scored passages |

A hash-only receipt omits draft text; a full HTML report contains it. Keep report files within your intended audience. Neither route performs web-wide plagiarism matching or identifies which chatbot wrote a passage.

## Command-line AI checker questions

**Does npm download a model automatically?** No. Follow the explicit Python model setup below.

**Is the local AI content detector free?** The code is MIT licensed, with no paid provider key. You supply local compute and storage.

**Can I use this as a CI authorship gate?** A model can flag human writing or miss AI text. Preserve inconclusive and unavailable states and route the evidence to a person; a passing check cannot establish authorship.

**Which command should a script use?** Use `opace-ai-checker`. The older `opace-integrity` alias is temporary. Node and Python expose the same command name, so use separate environments or `python -m opace_integrity` when both are installed.

## Install

```sh
npm install --global @opacedev/ai-content-checker-cli
```

## Commands

```sh
opace-ai-checker inspect article.txt
opace-ai-checker inspect - --format json < article.txt
OACI_RUN_TOKEN='your-runtime-token' opace-ai-checker inspect article.txt --local-engine --format json
OACI_RUN_TOKEN='your-runtime-token' opace-ai-checker inspect article.txt --local-engine --format html > report.html
opace-ai-checker protect extract article.txt --format json
opace-ai-checker receipt verify receipt.json --format json
```

Use JSON or JSONL mode for automation. Local-engine mode accepts only an explicit `http://127.0.0.1` origin, refuses redirects and validates both the checker-result schema and semantic invariants before printing. HTML is the branded printable report: five-band dial gauge, level and plain-English meaning, the strongest section, every section with its score, level, passage and evidence, the three independent readings, every named check, the route, model, privacy and input-limit record, the counts and hashes, the limitations and the complete machine record. It is self-contained, prints to A4 and loads no script, stylesheet, font or image. Text mode is the same information as a terminal summary: reading and score, strongest section, an aligned section table, the three readings, named checks, route and privacy facts and the limitations. The score is a zero-to-one pattern reading; neither output ever presents it as a percentage. Standard output contains only the requested result; diagnostics go to standard error. Hash-only receipts exclude the input text. The CLI never converts an unsupported or unavailable check into a passing result.

Set up the model once with the Python package before using `--local-engine`:

```sh
python -m opace_integrity --format json model plan
python -m opace_integrity model install --output /absolute/path/to/opace-cycle5-int8 --accept-download --accept-model-licence
OACI_RUN_TOKEN='generate-a-long-random-run-token' \
OACI_ADMIN_TOKEN='generate-a-different-long-admin-token' \
python -m opace_integrity serve --model-dir /absolute/path/to/opace-cycle5-int8
```

The install is not performed by npm. It is an explicit Python command that downloads the 34.5 MB
hash-pinned int8 model and vocabulary from the allowlisted Opace HTTPS asset directory. No model is
bundled in either package and no checked text is sent while installing it.

## Privacy and limits

Offline commands do not require the loopback service and keep the AI-pattern axis explicitly `not_assessed`. Service-backed commands accept only the frozen loopback origin and read their bearer token from `OACI_RUN_TOKEN`; no cloud endpoint or provider fallback exists. Do not pass confidential text on a shared command line where shell history or process inspection may expose it; prefer standard input.

The Cycle-5 route accepts 60–8,000 words and up to 100,000 browser-compatible UTF-16 code units;
the local service request body is capped at 250,000 bytes. Out-of-range input is refused, never
silently shortened. The HTML report records these limits alongside the route, privacy and model facts.

## Verify and support

```sh
npm ci
npm run typecheck
npm test
npm run pack:check
```

Model files, comparative detector claims and content-bearing storage remain outside this package boundary. Report vulnerabilities through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/SECURITY.md). Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/LICENSE).

For non-sensitive help, use [Opace AI Content Checker & Detector support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CONTRIBUTING.md) and [changelog](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CHANGELOG.md).

## Troubleshooting and links

- **Machine output contains unexpected text:** use `--format json`; normal results go to standard output and diagnostics to standard error.
- **A held option fails:** `--config`, `--cache-dir` and unavailable model commands are intentionally rejected rather than ignored.
- **Sensitive text appears in process arguments:** pipe it through standard input instead of placing it on the command line.

[Opace AI Content Checker & Detector](https://opace.agency/tools/ai/content-verification-integrity/) · [CLI and local API guide](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/) · [Privacy notice](https://opace.agency/privacy-policy/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related local engine](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/services/local-engine/README.md)

## Attribution

This engine was built on existing open-source work by deliberate choice, so the projects it
stands on are named here rather than only in a licence file.

- [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) — MIT, Conor Bronsdon and contributors. 46 of the 51 v2 writing-pattern rule categories, the stylometric methods, the weights and the classifier logic, adapted to TypeScript, plus Cyrillic and Greek lookalike map data. One upstream bug was fixed in the port.
- [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) — MIT, Guillaume Meyer. The invisible-character and space-substitute carrier tables and the explicit-carrier inspection model. Table data only; no upstream code is distributed.
- [Unicode Consortium character data](https://www.unicode.org/Public/UCD/latest/) — Unicode licence. The 415-code-point carrier inventory across 38 rules and the 60-entry confusable set.
- [antislop-sampler](https://github.com/sam-paech/antislop-sampler) — Apache-2.0, Sam Paech. Fiction phrase and over-represented name data behind the `fiction-slop-phrase` and `fiction-promptonym` rules.
- [slop-forensics](https://github.com/sam-paech/slop-forensics) — MIT, Sam Paech. Per-model observations corroborating the fiction-lane rules.
- [SLOP_Detector](https://github.com/SicariusSicariiStuff/SLOP_Detector) — Apache-2.0, SicariusSicariiStuff. The graded penalty-class weighting approach.
- [slop-gate](https://github.com/hwajongpark/slop-gate) — MIT, hwajongpark. Promotional-register and buzz-phrase pattern data.
- [anti-ai-writing](https://github.com/avectats7/anti-ai-writing) — MIT, avectats7. Buzz-phrase and weak-verb observation data.
- [anti-slop](https://github.com/kjmagnan1s/anti-slop) — MIT, kjmagnan1s. Faux-insight phrase data and the protect-list and context-profile design.
- [claude-slop-detector](https://github.com/aplaceforallmystuff/claude-slop-detector) — MIT, aplaceforallmystuff. Staccato-fragment and tripled-negation observations.
- [Wikipedia, *Signs of AI writing*](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) — CC BY-SA 4.0. Editorial guidance independently re-expressed with no verbatim excerpts, credited as the licence requires.
- [Project Gutenberg](https://www.gutenberg.org) public-domain texts, all published before 1929 — the embedded human-prose reference corpus behind the rhythm and register signals.
- [canonicalize](https://github.com/cyberphone/json-canonicalization) — Apache-2.0. RFC 8785 canonicalisation.
- Published academic findings by Liang et al. (ICML 2024), Kobak et al. (*Science Advances* 2025), Juzek & Ward (COLING 2025), Reinhart et al. (PNAS 2025), Geng & Trotta (2024) and Pew Research (2026), used as rule thresholds and lexicon facts.

Several well-known detector repositories were cloned and read during the research phase and are
credited as exactly that — read, not used. Nothing in this package derives from `fast-detect-gpt`,
`Binoculars`, `RADAR`, `DIPPER`, `ai-detector-bench`, `BIRA`, `SIRA` or `MarkLLM`.

Full records, with versions, snapshot commits and file-level destinations:
[THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md) ·
[DEPENDENCY-LEDGER.md](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/legal/DEPENDENCY-LEDGER.md).

## Where this is weakest, measured

This package ships the deterministic character forensics and editorial writing rules. It does
**not** contain the trained model that produces an AI reading. The optional `--local-engine`
route can consume a locally configured, hash-pinned Cycle-5 result; without that explicit route the
AI-pattern reading remains `not_assessed`. The model results are disclosed here so package users
can distinguish the two systems.

**The writing rules are editorial feedback, not detection.** On 922 machine and 1,200 held-out
human long-form documents, they detect 45.1% of machine writing while flagging **24.8% of human
writing** — one human document in four. `computeEditorialSignals` returns a writing score, never
an authorship reading, and must not be presented as one.

The deployed Cycle 5 model (`tier3-cycle5-v1`, margin rule
`max(m1, m2+0.34) >= 3.571`) was measured separately through both live runtimes on the full
5,558-document long-form evaluation corpus. That corpus is not wholly independent: 654/922 AI
documents are independent of every Cycle 2 split and 268 are not; 11/4,636 human documents
overlap. The separate topic-matched held-out slice is the independent evasion measurement.

| Cycle 5 measurement | result | denominator and runtime |
|---|---:|---|
| AI documents flagged | **97.8%** | 902/922, EU server fp32 |
| human documents wrongly flagged | **0.99%** | 46/4,636, EU server fp32 |
| AI documents flagged | **97.6%** | 900/922, browser int8 |
| human documents wrongly flagged | **1.57%** | 73/4,636, browser int8 |
| topic-matched held-out AI flagged | **86.9%** | 153/176, server evaluation route |
| structured human partners wrongly flagged | **0.2%** | 1/418, server evaluation route |
| human fiction wrongly flagged | **3.1% / 3.5%** | 7/227 server / 8/227 browser |
| held-out 100-word AI flagged | **76.8%** | 43/56, server evaluation route |
| heavy AI edits of human originals flagged | **28.5%** | 39/137, server evaluation view |
| academic human documents wrongly flagged | **0.8%** | 15/1,992, server evaluation view |

The 100-word cell is small, fiction remains higher-risk than the overall human set, and treating
heavy AI edits as machine-assisted is a product boundary rather than proof of authorship. Do not
use a result for an academic misconduct decision about one student.

*Historical, not current:* Cycle 2 (`tier3-cycle2-v1`, live 28 August – 1 September 2026) produced
the earlier 883/922 server, 889/922 browser, 45/4,636 server-human and 90/4,636 browser-human
figures. Its fiction and length rows are retired and must not be mixed with Cycle 5.

Complete list with sources: [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations).

## Evidence

Every accuracy figure this project publishes is measured, carries its denominator and names its
source report. The six result charts, the per-register detection and false-positive tables and the
complete weakness list are on the [repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#what-it-measures-and-where-it-fails).

- [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/EVIDENCE-INDEX.md) — every test result and research artefact, with paths
- [Test evidence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/TEST-EVIDENCE.md) — verbatim suite totals and the current-model appendix
- [Route parity](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/measurements/ROUTE-PARITY.md) — browser int8 against server fp32, all disagreements written out
- [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations) — where the tool is weakest, ranked, with denominators
