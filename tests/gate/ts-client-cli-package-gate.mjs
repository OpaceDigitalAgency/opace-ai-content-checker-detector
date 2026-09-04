#!/usr/bin/env node

import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname,join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const supplied=process.argv[2]?resolve(process.argv[2]):undefined,first=supplied??mkdtempSync(join(tmpdir(),"oaci-ts-pack-a-")),second=mkdtempSync(join(tmpdir(),"oaci-ts-pack-b-")),consumer=mkdtempSync(join(tmpdir(),"oaci-ts-consumer-"));
const run=(command,args,cwd=root,combined=false)=>{const result=spawnSync(command,args,{cwd,encoding:"utf8",timeout:120000,maxBuffer:10*1024*1024});if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);return combined?result.stdout+result.stderr:result.stdout;};
const names=["contracts","core","client","cli"].map(name=>`opacedev-ai-content-checker-${name}-0.0.0-private.tgz`);

try{
  if(!supplied)run("node",["scripts/pack-ts-client-cli-candidate.mjs",first]);run("node",["scripts/pack-ts-client-cli-candidate.mjs",second]);
  for(const name of names){const a=readFileSync(join(first,name)),b=readFileSync(join(second,name));assert.deepEqual(a,b,`${name} was not deterministic`);const listing=run("tar",["-tzf",join(first,name)]).trim().split("\n");for(const required of ["package/package.json","package/LICENSE","package/README.md"])assert.ok(listing.includes(required),`${name} missing ${required}`);const manifest=run("tar",["-xOzf",join(first,name),"package/package.json"]);assert.ok(!manifest.includes('"file:'),`${name} retained a file dependency`);assert.ok(!manifest.includes(root),`${name} retained an absolute source path`);}
  const dependencies=Object.fromEntries(["contracts","core","client","cli"].map((name,index)=>[`@opacedev/ai-content-checker-${name}`,`file:${join(first,names[index])}`]));
  writeFileSync(join(consumer,"package.json"),`${JSON.stringify({private:true,type:"module",dependencies,devDependencies:{typescript:"5.9.2"}},null,2)}\n`);
  run("npm",["install","--ignore-scripts","--no-audit","--no-fund"],consumer);run("npm",["ls","--all"],consumer);run("npm",["audit","--audit-level=high"],consumer);
  writeFileSync(join(consumer,"probe.ts"),'import {LocalClient,parseSse} from "@opacedev/ai-content-checker-client";import {inspect} from "@opacedev/ai-content-checker-core";import {runCli} from "@opacedev/ai-content-checker-cli";void (null as unknown as LocalClient);void parseSse;void inspect;void runCli;\n');
  run(join(consumer,"node_modules/.bin/tsc"),["--noEmit","--strict","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext","probe.ts"],consumer);
  run(process.execPath,["--input-type=module","-e",'const contracts=await import("@opacedev/ai-content-checker-contracts");const core=await import("@opacedev/ai-content-checker-core");const client=await import("@opacedev/ai-content-checker-client");const cli=await import("@opacedev/ai-content-checker-cli");if(contracts.SCHEMA_VERSION!=="1.0"||typeof core.inspect!=="function"||typeof client.createLocalClient!=="function"||typeof cli.runCli!=="function")throw Error("missing export")'],consumer);
  const bin=join(consumer,"node_modules/.bin/opace-ai-checker");assert.match(run(bin,["--help"],consumer,true),/Usage: opace-ai-checker/);const inspected=run(bin,["--format","json","inspect","-"],consumer);assert.equal(JSON.parse(inspected).schema_version,"1.0");
  console.log("TS client/CLI package gate: deterministic dependency-closed tarballs, npm ls, types, imports and bin passed");
}finally{if(!supplied)rmSync(first,{recursive:true,force:true});rmSync(second,{recursive:true,force:true});rmSync(consumer,{recursive:true,force:true});}
