import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname), out = resolve(root, "reports/build");
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
const cli = await readFile(resolve(root, "runners/cli.mjs")); await writeFile(resolve(out, "cli.mjs"), cli); await chmod(resolve(out, "cli.mjs"), 0o755);
await writeFile(resolve(out, "BUILD.txt"), "BENCH-10 deterministic private candidate\n");
console.log("build: 2 deterministic files");
