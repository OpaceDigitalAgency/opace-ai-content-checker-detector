// Calibration workbench — build step.
//
// Inlines scorer.mjs (verbatim, minus its `export` keyword) and data.json into
// one self-contained workbench.html. No external assets, no network, no server:
// the output opens directly from the filesystem.
//
//   node build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const scorer = readFileSync(join(HERE, "scorer.mjs"), "utf8").replace(/^export (const|function)/gm, "$1");
const data = readFileSync(join(HERE, "data.json"), "utf8");
const tpl = readFileSync(join(HERE, "workbench.template.html"), "utf8");

if (!tpl.includes("/*__SCORER__*/") || !tpl.includes("/*__DATA__*/")) throw new Error("template placeholders missing");
// </script> inside embedded JSON would close the tag early.
const safe = data.replace(/<\//g, "<\\/");
const html = tpl.replace("/*__SCORER__*/", scorer).replace("/*__DATA__*/", safe);

const dst = join(HERE, "workbench.html");
writeFileSync(dst, html);
console.log(`wrote ${dst} (${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB)`);
