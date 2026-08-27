import { readFile } from "node:fs/promises"; import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname), lock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));
const allowed = new Set(["MIT", "Apache-2.0", "BSD-3-Clause"]), failures = [];
for (const [path, pkg] of Object.entries(lock.packages)) if (path && pkg.license && !allowed.has(pkg.license)) failures.push(`${path}:${pkg.license}`);
if (failures.length) throw new Error(`licence_not_allowed:${failures.join(",")}`);
console.log(`licence scan: ${Object.keys(lock.packages).length - 1} locked package entries, permissive list MIT/Apache-2.0/BSD-3-Clause; runtime transitive proposal recorded`);
