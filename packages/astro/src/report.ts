import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect, prefixedSha256 } from '@opace/content-integrity-core';
import { decodeHTML } from 'entities';
import type { NormalisedOptions } from './options.js';
import { renderBuildReportHtml } from './build-report-html.js';

const STABLE_TIME = '2000-01-01T00:00:00.000Z';
const BODY = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/iu;
const TOKEN = /<!--[\s\S]*?-->|<[^>]*>|&(?:#x?[\da-f]+|[a-z][\da-z]+);/giu;
const BLOCKS = new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tr', 'ul']);
const EXCLUDED = new Set(['script', 'style', 'template', 'noscript']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
export function visibleHtml(html: string, maxCharacters = 50_000): string {
  const normalised = html.replace(/\r\n?/gu, '\n');
  const body = BODY.exec(normalised)?.[1] ?? normalised;
  let text = '';
  let cursor = 0;
  const stack: Array<{ tag: string; hidden: boolean; block: boolean }> = [];
  const isHidden = (): boolean => stack.at(-1)?.hidden ?? false;
  const separator = (): void => { if (text && !text.endsWith('\n')) text += '\n'; };
  for (const match of body.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (!isHidden()) text += decodeHTML(body.slice(cursor, index));
    const raw = match[0];
    if (raw.startsWith('&')) {
      if (!isHidden()) text += decodeHTML(raw);
    } else if (!raw.startsWith('<!--')) {
      const parsed = /^<\s*(\/?)\s*([a-z][\w:-]*)/iu.exec(raw);
      const closing = parsed?.[1] === '/';
      const tag = parsed?.[2]?.toLowerCase();
      if (tag && closing) {
        let position = stack.length - 1;
        while (position >= 0 && stack[position]?.tag !== tag) position -= 1;
        if (position >= 0) {
          const frame = stack[position]!;
          stack.splice(position);
          if (!frame.hidden && frame.block) separator();
        }
      } else if (tag) {
        const hiddenAttribute = /\shidden(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=[\s/>])/iu.test(raw);
        const aria = /\saria-hidden\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu.exec(raw);
        const ariaHidden = (aria?.[1] ?? aria?.[2] ?? aria?.[3]) === 'true';
        const hidden = isHidden() || EXCLUDED.has(tag) || hiddenAttribute || ariaHidden;
        const block = BLOCKS.has(tag);
        if (!hidden && (tag === 'br' || block)) separator();
        if (!VOID.has(tag) && !/\/\s*>$/u.test(raw)) stack.push({ tag, hidden, block });
      }
    }
    cursor = index + raw.length;
  }
  if (!isHidden()) text += decodeHTML(body.slice(cursor));
  text = text.replace(/\n+$/gu, '');
  if (text.length <= maxCharacters) return text;
  let end = maxCharacters;
  if (end > 0 && /[\uD800-\uDBFF]/u.test(text[end - 1] ?? '')) end -= 1;
  return text.slice(0, end);
}

async function filesBelow(root: string): Promise<string[]> {
  const found: string[] = [];
  async function visit(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path);
    }
  }
  await visit(root);
  return found.sort();
}

export interface HashOnlyRouteReport {
  route_id: string;
  source_hash: string;
  word_count: number;
  summary: Record<string, number>;
  methods: Array<{ id: string; version: string; status: string; limitations: string[] }>;
  protected_counts: Record<string, number>;
  pattern_counts: Record<string, number>;
  truncated: boolean;
}

export interface AstroIntegrityReport {
  schema_version: '1.0';
  contract_version: '1.0.0';
  package_version: '0.2.0';
  /** Build support, never the full checker. The interactive toolbar is the checker. */
  profile: 'build_scan';
  mode: 'report_only';
  privacy_route: 'browser';
  contains_content: false;
  generated_at: typeof STABLE_TIME;
  /** The three result axes, with the model axis honestly unassessed. */
  axes: {
    ai_pattern: { assessment_status: 'not_assessed'; reason: string; limitations: string[] };
    text_integrity: { method_status: 'per_route'; reason: string };
    editorial: { method_status: 'per_route'; reason: string };
  };
  routes: HashOnlyRouteReport[];
  limitations: string[];
}

const BUILD_SCAN_AXES: AstroIntegrityReport['axes'] = {
  ai_pattern: {
    assessment_status: 'not_assessed',
    reason: 'A build runs no trained model. Scoring a whole site without anyone asking would break the consent boundary, so the build scan never attempts an AI-pattern reading.',
    limitations: [
      'The character and writing findings below cannot stand in for a model reading.',
      'Open the Content Integrity panel in the Astro dev toolbar for the complete reading.',
    ],
  },
  text_integrity: { method_status: 'per_route', reason: 'Deterministic character checks ran for each route. See routes[].methods.' },
  editorial: { method_status: 'per_route', reason: 'The named writing rules ran for each route. See routes[].methods and routes[].pattern_counts.' },
};

function patternRegex(pattern: string): RegExp {
  const anyDepth = pattern.startsWith('**/');
  const source = anyDepth ? pattern.slice(3) : pattern;
  let expression = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (character === '*' && source[index + 1] === '*') { expression += '.*'; index += 1; }
    else if (character === '*') expression += '[^/]*';
    else expression += character.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
  }
  return new RegExp(`^${anyDepth ? '(?:.*/)?' : ''}${expression}$`, 'u');
}

export function shouldInclude(path: string, options: Pick<NormalisedOptions, 'include' | 'exclude'>): boolean {
  const normalised = path.replaceAll('\\', '/').replace(/^\.\//u, '');
  return options.include.some((pattern) => patternRegex(pattern).test(normalised)) && !options.exclude.some((pattern) => patternRegex(pattern).test(normalised));
}

export async function analyseHtml(html: string, opaqueRoute: string, maxCharacters = 50_000): Promise<HashOnlyRouteReport> {
  const completeText = visibleHtml(html, Number.MAX_SAFE_INTEGER);
  const content = visibleHtml(html, maxCharacters);
  const routeId = `route_${createHash('sha256').update(opaqueRoute).digest('hex').slice(0, 16)}`;
  const result = await inspect({ schema_version: '1.0', contract_version: '1.0.0', request_id: `req_${routeId.slice(6)}`, created_at: STABLE_TIME, source: { content, content_type: 'plain_text', language: 'en-GB' }, checks: ['unicode.invisible', 'style.patterns', 'watermark.anthropic'], privacy: { allowed_routes: ['browser'], save_receipt: false, retain_content: false } }, { now: () => STABLE_TIME, analysisId: () => `analysis_${routeId.slice(6)}` });
  const protectedCounts: Record<string, number> = {};
  const patternCounts: Record<string, number> = {};
  for (const item of result.protected_spans) protectedCounts[item.kind] = (protectedCounts[item.kind] ?? 0) + 1;
  for (const item of result.pattern_findings) patternCounts[item.rule_id] = (patternCounts[item.rule_id] ?? 0) + 1;
  const { pass, attention, fail, inconclusive, unsupported, not_configured, not_run, error } = result.summary;
  return { route_id: routeId, source_hash: prefixedSha256(content), word_count: result.source.word_count, summary: { pass, attention, fail, inconclusive, unsupported, not_configured, not_run, error }, methods: result.methods.map(({ id, version, status, limitations }) => ({ id, version, status, limitations })), protected_counts: protectedCounts, pattern_counts: patternCounts, truncated: completeText.length > content.length };
}

export async function writeBuildReport(outputUrl: URL, options: NormalisedOptions): Promise<{ json: string; html: string; hash: string }> {
  if (outputUrl.protocol !== 'file:') throw new Error('Only file output is supported.');
  const output = await realpath(fileURLToPath(outputUrl));
  const reportDir = resolve(output, options.reportDirectory);
  if (reportDir !== output && !reportDir.startsWith(`${output}${sep}`)) throw new Error('Report path escaped the Astro build output.');
  let cursor = output;
  for (const segment of relative(output, reportDir).split(sep).filter(Boolean)) {
    cursor = join(cursor, segment);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Report path contains a symbolic link and was refused.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }
  const reports = [];
  for (const file of await filesBelow(output)) {
    if (file.includes(`${join(output, options.reportDirectory)}`)) continue;
    const route = relative(output, file);
    if (!shouldInclude(route, options)) continue;
    reports.push(await analyseHtml(await readFile(file, 'utf8'), route, options.maxCharacters));
  }
  const report: AstroIntegrityReport = { schema_version: '1.0', contract_version: '1.0.0', package_version: '0.2.0', profile: 'build_scan', mode: 'report_only', privacy_route: 'browser', contains_content: false, generated_at: STABLE_TIME, axes: BUILD_SCAN_AXES, routes: reports, limitations: ['These checks cannot show who wrote anything.', "Anthropic's own watermark verifier is not something we can call, so it stays unsupported.", 'No provider, model or local service was contacted during the build.'] };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  await mkdir(reportDir, { recursive: true });
  const jsonPath = join(reportDir, 'report.json');
  const htmlPath = join(reportDir, 'index.html');
  const html = renderBuildReportHtml(report);
  await writeFile(jsonPath, json, { encoding: 'utf8', flag: 'w' });
  await writeFile(htmlPath, html, { encoding: 'utf8', flag: 'w' });
  return { json: pathToFileURL(jsonPath).href, html: pathToFileURL(htmlPath).href, hash: `sha256:${createHash('sha256').update(json).digest('hex')}` };
}
