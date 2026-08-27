import { readFile, readdir } from "node:fs/promises"; import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname), directories = ["runners","scoring","tests"];
let checked = 0;
for (const directory of directories) for (const name of (await readdir(resolve(root, directory))).filter((item) => item.endsWith(".mjs"))) { const text = await readFile(resolve(root, directory, name), "utf8"); if (/\t| +$/m.test(text)) throw new Error(`lint_whitespace:${directory}/${name}`); if (/\beval\s*\(|new Function\s*\(/.test(text)) throw new Error(`lint_dynamic_code:${directory}/${name}`); checked++; }
console.log(`lint: ${checked} files`);
