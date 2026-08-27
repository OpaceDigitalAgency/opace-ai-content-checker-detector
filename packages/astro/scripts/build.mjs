import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
execFileSync(process.execPath, [new URL('../node_modules/typescript/bin/tsc', import.meta.url).pathname, '-p', new URL('../tsconfig.json', import.meta.url).pathname], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname, new URL('../src/toolbar.ts', import.meta.url).pathname, '--bundle', '--format=esm', '--platform=browser', '--target=es2022', `--outfile=${new URL('../dist/toolbar.js', import.meta.url).pathname}`, '--legal-comments=none', '--log-level=warning'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [new URL('../node_modules/esbuild/bin/esbuild', import.meta.url).pathname, new URL('../src/worker.ts', import.meta.url).pathname, '--bundle', '--format=esm', '--platform=browser', '--target=es2022', `--outfile=${new URL('../dist/worker.js', import.meta.url).pathname}`, '--legal-comments=none', '--log-level=warning'], { cwd: root, stdio: 'inherit' });
