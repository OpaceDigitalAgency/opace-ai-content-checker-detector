/**
 * One deterministic build, two runtimes.
 *
 * The Node side (`index`, `options`, `report`, `share`, `receipt`) and the
 * browser side (`toolbar`) are both bundled by esbuild, so the shared result
 * presentation, the shared stylesheet, the logo and the two font subsets are
 * inlined rather than fetched or resolved at run time from a directory that is
 * not published. tsc emits the declarations only.
 *
 * The inspection worker is bundled first and inlined into the toolbar as text,
 * then started from a blob URL. Serving it as a separate file made the host's
 * dev server responsible for it, and Vite's `server.fs.allow` list refuses a
 * path outside the consumer's own project — which is exactly where an installed
 * dependency lives, so the worker never started. Inlining removes the host from
 * that path entirely and keeps the toolbar working offline.
 */
import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const from = (path) => fileURLToPath(new URL(path, import.meta.url));

await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });

execFileSync(process.execPath, [from('../node_modules/typescript/bin/tsc'), '-p', from('../tsconfig.build.json')], { cwd: root, stdio: 'inherit' });

const shared = { bundle: true, format: 'esm', target: 'es2022', legalComments: 'none', logLevel: 'warning' };

// The Node entries. Bare specifiers stay external: they are bundleDependencies,
// installed beside the package, and must not be duplicated into the output.
await build({
  ...shared,
  platform: 'node',
  packages: 'external',
  entryPoints: [from('../src/index.ts'), from('../src/options.ts'), from('../src/report.ts'), from('../src/share.ts'), from('../src/receipt.ts')],
  outdir: from('../dist'),
  splitting: true,
  chunkNames: 'shared-[hash]',
  allowOverwrite: true,
});

const worker = await build({ ...shared, platform: 'browser', entryPoints: [from('../src/worker.ts')], write: false });
const workerSource = worker.outputFiles[0].text;

/** Resolves the toolbar's `opace:worker` import to the bundled worker source. */
const inlineWorker = {
  name: 'opace-inline-worker',
  setup(instance) {
    instance.onResolve({ filter: /^opace:worker$/ }, () => ({ path: 'opace:worker', namespace: 'opace-worker' }));
    instance.onLoad({ filter: /.*/, namespace: 'opace-worker' }, () => ({ contents: workerSource, loader: 'text' }));
  },
};

await build({
  ...shared,
  platform: 'browser',
  entryPoints: [from('../src/toolbar.ts')],
  outfile: from('../dist/toolbar.js'),
  loader: { '.png': 'dataurl', '.woff2': 'dataurl' },
  plugins: [inlineWorker],
});
