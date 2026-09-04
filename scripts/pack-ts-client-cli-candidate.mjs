#!/usr/bin/env node

import {cpSync,existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {basename,dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const destination=resolve(process.argv[2]??"");
if(!process.argv[2])throw new Error("Usage: node scripts/pack-ts-client-cli-candidate.mjs <destination>");
mkdirSync(destination,{recursive:true});

const version="0.0.0-private";
const packages=[
  {dir:"packages/contracts",internal:[]},
  {dir:"packages/core",internal:["@opacedev/ai-content-checker-contracts"]},
  {dir:"packages/client",internal:["@opacedev/ai-content-checker-contracts"]},
  {dir:"packages/cli",internal:["@opacedev/ai-content-checker-contracts","@opacedev/ai-content-checker-core","@opacedev/ai-content-checker-client"]},
];
const staging=mkdtempSync(join(tmpdir(),"oaci-ts-client-cli-pack-"));
const run=(command,args,cwd)=>{const result=spawnSync(command,args,{cwd,encoding:"utf8",timeout:120000,maxBuffer:10*1024*1024});if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);return result.stdout;};

try{
  for(const item of packages){
    const source=join(root,item.dir);if(!existsSync(source))throw new Error(`Missing package source: ${source}`);run("npm",["run","build"],source);
    const staged=join(staging,basename(item.dir));cpSync(source,staged,{recursive:true,filter:path=>!path.split(/[\\/]/).includes("node_modules")&&!path.endsWith(".tgz")});
    const manifestPath=join(staged,"package.json"),manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
    if(manifest.version!==version)throw new Error(`${manifest.name} has unexpected version ${manifest.version}`);
    for(const name of item.internal){if(!manifest.dependencies?.[name])throw new Error(`${manifest.name} is missing ${name}`);manifest.dependencies[name]=version;}
    const serialised=`${JSON.stringify(manifest,null,2)}\n`;if(serialised.includes('"file:'))throw new Error(`${manifest.name} retained a file dependency`);writeFileSync(manifestPath,serialised);
    process.stdout.write(run("npm",["pack","--ignore-scripts","--pack-destination",destination],staged));
  }
}finally{rmSync(staging,{recursive:true,force:true});}
