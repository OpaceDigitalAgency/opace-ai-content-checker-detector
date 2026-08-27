import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const tarball = resolve(process.argv[2]);
const cells = [
  { astro: '5.18.2', nodes: ['20.19.5', '22.20.0', '24.2.0'] },
  { astro: '6.4.8', nodes: ['22.20.0', '24.2.0'] },
  { astro: '7.2.7', nodes: ['22.20.0', '24.2.0'] },
];
const results = [];
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_UPDATE_NOTIFIER: '1' } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
}
for (const cell of cells) {
  const root = await mkdtemp(join(tmpdir(), `oaci-astro-node-${cell.astro}-`));
  try {
    await mkdir(join(root, 'src', 'pages'), { recursive: true });
    await writeFile(join(root, 'package.json'), `${JSON.stringify({ private: true, type: 'module', dependencies: { astro: cell.astro, '@astrojs/check': '0.9.6', typescript: '5.9.2', '@opace/astro-content-integrity': `file:${tarball}` } }, null, 2)}\n`);
    await writeFile(join(root, 'astro.config.mjs'), "import integrity from '@opace/astro-content-integrity'; export default { integrations: [integrity()] };\n");
    await writeFile(join(root, 'src', 'pages', 'index.astro'), '<html lang="en-GB"><body><main><h1>Node matrix evidence</h1></main></body></html>\n');
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], root);
    const astroPackage = JSON.parse(await readFile(join(root, 'node_modules', 'astro', 'package.json'), 'utf8'));
    const astroBin = join(root, 'node_modules', 'astro', astroPackage.bin.astro);
    const lockHash = createHash('sha256').update(await readFile(join(root, 'package-lock.json'))).digest('hex');
    for (const node of cell.nodes) {
      run('npx', ['-y', `node@${node}`, astroBin, 'check'], root);
      run('npx', ['-y', `node@${node}`, astroBin, 'build'], root);
      results.push({ astro: cell.astro, node, static_check: 'pass', static_build: 'pass', fixture_lock_hash: lockHash });
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}
const destination = resolve(dirname(new URL(import.meta.url).pathname), 'node-results.json');
await writeFile(destination, `${JSON.stringify({ generated_at: new Date().toISOString(), cells: results }, null, 2)}\n`);
console.log(`ASTRO Node matrix: ${results.length}/7 compatible static cells passed.`);
