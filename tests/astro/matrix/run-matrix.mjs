import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

const packageTarball = resolve(process.argv[2]);
const packageRoot = resolve(dirname(packageTarball), '../..');
const cells = [
  { astro: '5.18.2', adapter: '9.5.5' },
  { astro: '6.4.8', adapter: '10.1.4' },
  { astro: '7.2.7', adapter: '11.1.4' },
];
const modes = ['static', 'server', 'hybrid'];

async function treeHash(root) {
  const files = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'evidence'].includes(entry.name)) continue;
      if (entry.name === 'ASTRO-25-EVIDENCE.md') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await visit(root);
  const hash = createHash('sha256');
  for (const path of files.sort()) hash.update(path.slice(root.length)).update('\0').update(await readFile(path)).update('\0');
  return hash.digest('hex');
}

function run(command, args, cwd, timeout = 120_000) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_UPDATE_NOTIFIER: '1' } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}\n${result.stdout}\n${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
}

async function waitFor(url, process) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null && process.exitCode !== 0) throw new Error(`server exited ${process.exitCode}`);
    try { const response = await fetch(url); if (response.ok) return response.text(); } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`server timeout: ${url}`);
}

async function serveAndProbe(cwd, command, args, port) {
  const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', ASTRO_DEV_BACKGROUND: '0', ASTRO_PREVIEW_BACKGROUND: '0', NO_UPDATE_NOTIFIER: '1', HOST: '127.0.0.1', PORT: String(port) } });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  try {
    const html = await waitFor(`http://127.0.0.1:${port}/`, child).catch((error) => { throw new Error(`${error.message}\n${output}`); });
    if (!html.includes('Opace matrix fixture')) throw new Error('fixture marker missing');
    return html;
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await new Promise((resolveWait) => child.once('exit', resolveWait));
    }
    const daemonPid = /\(pid (\d+)\)/u.exec(output)?.[1];
    if (daemonPid) {
      try { process.kill(Number(daemonPid), 'SIGTERM'); } catch {}
    }
  }
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const selected = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolvePort(selected));
    });
  });
}

const before = await treeHash(packageRoot);
const results = [];
for (const cell of cells) {
  for (const mode of modes) {
    const root = await mkdtemp(join(tmpdir(), `oaci-astro-${cell.astro}-${mode}-`));
    await mkdir(join(root, 'src', 'pages'), { recursive: true });
    const dependencies = { astro: cell.astro, '@astrojs/check': '0.9.6', typescript: '5.9.2', '@opace/astro-content-integrity': `file:${packageTarball}` };
    if (mode !== 'static') dependencies['@astrojs/node'] = cell.adapter;
    await writeFile(join(root, 'package.json'), `${JSON.stringify({ private: true, type: 'module', scripts: { dev: 'astro dev', build: 'astro build', preview: 'astro preview', check: 'astro check' }, dependencies }, null, 2)}\n`);
    const hybrid = mode === 'hybrid';
    const server = mode !== 'static';
    await writeFile(join(root, 'astro.config.mjs'), `${server ? "import node from '@astrojs/node';\n" : ''}import integrity from '@opace/astro-content-integrity';\nexport default { output: '${server ? 'server' : 'static'}', ${server ? "adapter: node({ mode: 'standalone' })," : ''} integrations: [integrity({ include: ['parity/index.html'] })] };\n`);
    const parityMarkup = `<html lang="en-GB"><head><title>Matrix</title></head><body><main><h1>Opace matrix fixture</h1><span hidden>excluded hidden text</span><i aria-hidden="true">excluded aria text</i><p>Evidence &amp; facts for £1,250 on 26 August 2026.</p><script>document.documentElement.dataset.fixture = 'privateSourceMarker';</script></main></body></html>`;
    await writeFile(join(root, 'src', 'pages', 'index.astro'), `---\n${server ? 'export const prerender = false;' : ''}\n---\n${parityMarkup}\n`);
    await writeFile(join(root, 'src', 'pages', 'parity.astro'), `---\n${server ? 'export const prerender = true;' : ''}\n---\n${parityMarkup}\n`);
    if (hybrid) await writeFile(join(root, 'src', 'pages', 'hybrid-static.astro'), `---\nexport const prerender = true;\n---\n<html lang="en-GB"><body><main><h1>Hybrid static sentinel</h1></main></body></html>\n`);
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], root);
    const astroPackage = JSON.parse(await readFile(join(root, 'node_modules', 'astro', 'package.json'), 'utf8'));
    const astroBin = join(root, 'node_modules', 'astro', astroPackage.bin.astro);
    run('npm', ['run', 'check'], root);
    run('npm', ['run', 'build'], root);
    const outputFiles = [];
    async function list(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await list(path); else outputFiles.push(path); } }
    await list(join(root, 'dist'));
    const runtimeFiles = outputFiles.filter((path) => /\.(?:js|mjs|css)$/u.test(path));
    const runtimeBytes = Buffer.concat(await Promise.all(runtimeFiles.sort().map((path) => readFile(path))));
    if (runtimeBytes.includes(Buffer.from('opace-content-integrity')) || runtimeBytes.includes(Buffer.from('Local evidence workbench')) || runtimeBytes.includes(Buffer.from('worker_disposed'))) throw new Error(`production toolbar isolation failed for ${cell.astro}/${mode}`);
    const reportPath = outputFiles.find((path) => path.endsWith('content-integrity-report/report.json'));
    if (!reportPath) throw new Error(`report missing for ${cell.astro}/${mode}`);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    if (report.contains_content !== false || report.mode !== 'report_only') throw new Error('report privacy mode mismatch');
    if (report.routes.length !== 1) throw new Error(`parity report expected one route, received ${report.routes.length}`);
    if ((await readFile(reportPath, 'utf8')).includes('privateSourceMarker')) throw new Error('report leaked excluded source');
    const previewPort = await freePort();
    const previewHtml = mode === 'static'
      ? await serveAndProbe(root, process.execPath, [astroBin, 'preview', '--host', '127.0.0.1', '--port', String(previewPort)], previewPort)
      : await serveAndProbe(root, process.execPath, [join(root, 'dist', 'server', 'entry.mjs')], previewPort);
    const analyser = await import(pathToFileURL(join(root, 'node_modules', '@opace', 'astro-content-integrity', 'dist', 'report.js')).href);
    const runtimeRoute = await analyser.analyseHtml(previewHtml, 'parity/index.html');
    if (JSON.stringify(runtimeRoute) !== JSON.stringify(report.routes[0])) throw new Error(`SSR/browser-visible projection parity failed for ${cell.astro}/${mode}`);
    const devPort = await freePort();
    await serveAndProbe(root, process.execPath, [astroBin, 'dev', '--host', '127.0.0.1', '--port', String(devPort)], devPort);
    results.push({ astro: cell.astro, node: process.version, mode, check: 'pass', build: 'pass', preview: 'pass', dev: 'pass', projection_parity: 'pass', parity_source_hash: runtimeRoute.source_hash, report_routes: report.routes.length, report_hash: createHash('sha256').update(await readFile(reportPath)).digest('hex'), fixture_lock_hash: createHash('sha256').update(await readFile(join(root, 'package-lock.json'))).digest('hex') });
    await rm(root, { recursive: true, force: true });
  }
}
const after = await treeHash(packageRoot);
if (before !== after) throw new Error(`source tree changed: ${before} -> ${after}`);
if (new Set(results.map((cell) => cell.report_hash)).size !== 1 || new Set(results.map((cell) => cell.parity_source_hash)).size !== 1) throw new Error('static/SSR/hybrid report parity hashes differ');
const destination = resolve(dirname(new URL(import.meta.url).pathname), 'results.json');
await writeFile(destination, `${JSON.stringify({ generated_at: new Date().toISOString(), package: basename(packageTarball), package_source_before: before, package_source_after: after, cells: results }, null, 2)}\n`);
console.log(`ASTRO matrix: ${results.length}/${cells.length * modes.length} cells passed; source ${before}`);
