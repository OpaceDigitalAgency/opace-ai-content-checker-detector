#!/usr/bin/env node

import assert from "node:assert/strict";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const first=mkdtempSync(join(tmpdir(),"oaci-pack-gate-a-"));
const second=mkdtempSync(join(tmpdir(),"oaci-pack-gate-b-"));
const consumer=mkdtempSync(join(tmpdir(),"oaci-pack-consumer-"));
const run=(command,args,cwd=root)=>{
  const result=spawnSync(command,args,{cwd,encoding:"utf8",timeout:120000,maxBuffer:10*1024*1024});
  if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};

try{
  run("node",["scripts/pack-local-candidate.mjs",first]);
  run("node",["scripts/pack-local-candidate.mjs",second]);
  const names=["contracts","core","browser"].map(name=>`opacedev-ai-content-checker-${name}-0.0.0-private.tgz`);
  for(const name of names){
    const a=readFileSync(join(first,name));
    const b=readFileSync(join(second,name));
    assert.deepEqual(a,b,`${name} was not deterministic`);
    const listing=run("tar",["-tzf",join(first,name)]).trim().split("\n");
    for(const required of ["package/package.json","package/LICENSE","package/README.md"])assert.ok(listing.includes(required),`${name} missing ${required}`);
  }
  const packageJson={private:true,type:"module",dependencies:{
    "@opacedev/ai-content-checker-contracts":`file:${join(first,names[0])}`,
    "@opacedev/ai-content-checker-core":`file:${join(first,names[1])}`,
    "@opacedev/ai-content-checker-browser":`file:${join(first,names[2])}`,
  }};
  writeFileSync(join(consumer,"package.json"),`${JSON.stringify(packageJson,null,2)}\n`);
  run("npm",["install","--ignore-scripts","--no-audit","--no-fund"],consumer);
  const probe=`const contracts=await import("@opacedev/ai-content-checker-contracts");const core=await import("@opacedev/ai-content-checker-core");const browser=await import("@opacedev/ai-content-checker-browser");if(contracts.SCHEMA_VERSION!=="1.0"||contracts.CONTRACT_VERSION!=="1.0.0"||typeof core.inspect!=="function"||typeof browser.createInspectionWorker!=="function")throw Error("missing export");`;
  run(process.execPath,["--input-type=module","-e",probe],consumer);
  console.log("Local candidate package gate: deterministic tarballs, licences, clean install and imports passed");
}finally{
  rmSync(first,{recursive:true,force:true});
  rmSync(second,{recursive:true,force:true});
  rmSync(consumer,{recursive:true,force:true});
}
