import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = 'docs/RESEARCH-INDEX.md';
const coreResearch = new Set([
  'MODEL_AND_DATA_PROVENANCE.md',
  'docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md',
  'docs/CAPABILITIES.md',
  'docs/EVIDENCE-INDEX.md',
  'docs/MEASURED-FINDINGS.md',
  'docs/PER-MODEL-DETECTION.md',
  'docs/TEST-EVIDENCE.md',
  'docs/WATERMARK-LAB.md',
]);

const trackedMarkdown = execFileSync('git', ['ls-files', '*.md'], {
  cwd: root,
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .sort();

function stripCode(markdown) {
  return markdown
    .replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

function markdownTargets(path) {
  const markdown = stripCode(readFileSync(resolve(root, path), 'utf8'));
  const targets = [];
  const pattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(pattern)) {
    let target = match[1].trim();
    if (target.startsWith('<')) {
      target = target.slice(1, target.indexOf('>'));
    } else {
      target = target.split(/\s+["']/u, 1)[0];
    }
    if (!target || /^(?:#|https?:|mailto:|tel:)/iu.test(target)) continue;
    target = target.split('#', 1)[0].split('?', 1)[0];
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      // A literal percent sign is valid in prose even if it is not URL-encoded.
    }
    targets.push(target);
  }
  return targets;
}

function repositoryPath(source, target) {
  const absolute = resolve(root, dirname(source), target);
  const rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`)) return null;
  return rel.split(sep).join('/');
}

function isResearchSource(path) {
  return (
    coreResearch.has(path) ||
    path.startsWith('docs/measurements/') ||
    path.startsWith('docs/research-drafts/') ||
    path.startsWith('services/local-engine/research/') ||
    (path.startsWith('research/') && path !== 'research/README.md')
  );
}

const broken = [];
let relativeLinksChecked = 0;
for (const source of trackedMarkdown) {
  for (const target of markdownTargets(source)) {
    relativeLinksChecked += 1;
    const path = repositoryPath(source, target);
    if (!path) {
      broken.push(`${source} -> ${target} (outside repository)`);
      continue;
    }
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) broken.push(`${source} -> ${target} (missing)`);
  }
}

const indexTargets = new Set(
  markdownTargets(indexPath)
    .map((target) => repositoryPath(indexPath, target))
    .filter(Boolean),
);
const researchSources = trackedMarkdown.filter(isResearchSource);
const missingFromIndex = researchSources.filter((path) => !indexTargets.has(path));

const requiredHubs = [
  'README.md',
  'docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md',
  'docs/EVIDENCE-INDEX.md',
  'research/README.md',
  'services/local-engine/research/README.md',
];
const hubsWithoutIndex = requiredHubs.filter(
  (hub) =>
    !markdownTargets(hub)
      .map((target) => repositoryPath(hub, target))
      .includes(indexPath),
);

const failures = [
  ...broken.map((item) => `Broken relative link: ${item}`),
  ...missingFromIndex.map((path) => `Research source missing from index: ${path}`),
  ...hubsWithoutIndex.map((path) => `Discovery hub does not link the research index: ${path}`),
];

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Research index coverage: ${researchSources.length}/${researchSources.length}`);
  console.log(`Relative Markdown links: ${relativeLinksChecked} checked, 0 broken`);
  console.log(`Discovery hubs: ${requiredHubs.length}/${requiredHubs.length} link the index`);
}
