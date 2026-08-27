#!/usr/bin/env node

import {cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {basename, dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const destination=resolve(process.argv[2]??"");
if(!process.argv[2])throw new Error("Usage: node scripts/pack-local-candidate.mjs <destination>");
mkdirSync(destination,{recursive:true});

const packages=[
  {dir:"packages/contracts",internal:[],build:true},
  {dir:"packages/core",internal:["@opace/content-integrity-contracts"],build:true},
  {dir:"packages/browser",internal:["@opace/content-integrity-contracts","@opace/content-integrity-core"],build:true},
];
const staging=mkdtempSync(join(tmpdir(),"oaci-local-pack-"));

try{
  for(const item of packages){
    const source=join(root,item.dir);
    if(!existsSync(source))throw new Error(`Missing package source: ${source}`);
    if(item.build){
      const built=spawnSync("npm",["run","build"],{cwd:source,encoding:"utf8"});
      if(built.status!==0)throw new Error(`Build failed for ${item.dir}\n${built.stdout}\n${built.stderr}`);
    }
    const staged=join(staging,basename(item.dir));
    cpSync(source,staged,{recursive:true,filter:path=>!path.includes(`${join("", "node_modules")}`)&&!path.endsWith(".tgz")});
    const manifestPath=join(staged,"package.json");
    const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
    for(const name of item.internal){
      if(!manifest.dependencies?.[name])throw new Error(`${manifest.name} is missing ${name}`);
      manifest.dependencies[name]="0.0.0-private";
    }
    writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
    const packed=spawnSync("npm",["pack","--ignore-scripts","--pack-destination",destination],{cwd:staged,encoding:"utf8"});
    if(packed.status!==0)throw new Error(`npm pack failed for ${manifest.name}\n${packed.stdout}\n${packed.stderr}`);
    process.stdout.write(packed.stdout);
  }
}finally{
  rmSync(staging,{recursive:true,force:true});
}
