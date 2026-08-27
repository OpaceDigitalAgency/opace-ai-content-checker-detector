#!/usr/bin/env node
import { aggregateRun, freezeManifest, inspectRelease, reproduceBundle, runBenchmark, validateAny } from "./commands.mjs";

const args = process.argv.slice(2), command = args.shift();
if (command === "--help" || command === "-h" || command === "help") {
  process.stdout.write("Usage: oaci-benchmark <validate|freeze|run|aggregate|reproduce|inspect-release> [options]\n");
  process.exit(0);
}
const value = (flag) => { const index = args.indexOf(flag); if (index < 0 || !args[index + 1]) throw new Error(`missing_${flag.slice(2)}`); return args[index + 1]; };
try {
  let result;
  if (command === "validate") result = await validateAny(args[0]);
  else if (command === "freeze") result = await freezeManifest(args[0], value("--output"));
  else if (command === "run") result = await runBenchmark(args[0], value("--output"), { offline: args.includes("--offline") });
  else if (command === "aggregate") result = await aggregateRun(args[0], value("--output"));
  else if (command === "reproduce") result = await reproduceBundle(args[0]);
  else if (command === "inspect-release") result = await inspectRelease(args[0]);
  else throw new Error("usage: validate|freeze|run|aggregate|reproduce|inspect-release");
  process.stdout.write(`${JSON.stringify({ ok: true, command, result: summarise(result) })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ ok: false, command, error: error.message })}\n`);
  process.exitCode = 1;
}
function summarise(value) { if (Array.isArray(value)) return { count: value.length }; if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["documents","methods","corpus_manifest","method_manifest","environment_manifest","pre_registration"].includes(key)).slice(0, 20)); return value; }
