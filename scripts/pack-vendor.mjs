#!/usr/bin/env node
// Permanent vendor pack script. Builds the vendorable packages, temporarily
// rewrites monorepo `file:../` dependency specs to the referenced package's own
// version, npm-packs each tarball to the destination, then restores the
// original package.json files even on error. Guards against the 27 Aug 2026
// Netlify lockfile failure (see ../v0.2-BUILD-LOG.md §5): a packed tarball must
// never ship a `file:` spec.

import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const destination=process.argv[2]?resolve(process.argv[2]):"";
if(!destination)throw new Error("Usage: node scripts/pack-vendor.mjs <destination>");
mkdirSync(destination,{recursive:true});

const packages=["packages/contracts","packages/core","packages/browser","packages/watermark-lab"];
const dependencyFields=["dependencies","devDependencies","optionalDependencies","peerDependencies"];

function run(command,args,cwd){
  const result=spawnSync(command,args,{cwd,encoding:"utf8"});
  if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed in ${cwd}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function versionOfFileSpec(spec,packageDir){
  const target=resolve(packageDir,spec.slice("file:".length));
  const manifestPath=join(target,"package.json");
  if(!existsSync(manifestPath))throw new Error(`Cannot resolve ${spec} from ${packageDir}: missing ${manifestPath}`);
  const version=JSON.parse(readFileSync(manifestPath,"utf8")).version;
  if(!version)throw new Error(`No version in ${manifestPath}`);
  return version;
}

// Build everything first, with the original manifests untouched.
for(const dir of packages){
  const source=join(root,dir);
  if(!existsSync(source))throw new Error(`Missing package source: ${source}`);
  run("npm",["run","build"],source);
}

// Rewrite file: specs in place, pack, and always restore the originals.
const originals=new Map();
try{
  for(const dir of packages){
    const source=join(root,dir);
    const manifestPath=join(source,"package.json");
    const originalText=readFileSync(manifestPath,"utf8");
    const manifest=JSON.parse(originalText);
    let rewritten=false;
    for(const field of dependencyFields){
      for(const [name,spec] of Object.entries(manifest[field]??{})){
        if(typeof spec==="string"&&spec.startsWith("file:")){
          manifest[field][name]=versionOfFileSpec(spec,source);
          rewritten=true;
        }
      }
    }
    if(rewritten){
      originals.set(manifestPath,originalText);
      writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
    }
    const output=run("npm",["pack","--ignore-scripts","--pack-destination",destination],source);
    const tarball=output.trim().split("\n").pop();
    if(!tarball)throw new Error(`npm pack produced no tarball name for ${dir}`);
    verifyTarball(join(destination,tarball));
    process.stdout.write(`${tarball}\n`);
  }
}finally{
  for(const [manifestPath,originalText] of originals){
    writeFileSync(manifestPath,originalText);
  }
}

function verifyTarball(tarballPath){
  const inspect=mkdtempSync(join(tmpdir(),"oaci-pack-vendor-verify-"));
  try{
    run("tar",["-xzf",tarballPath,"-C",inspect,"package/package.json"],root);
    const packed=readFileSync(join(inspect,"package","package.json"),"utf8");
    if(packed.includes("file:"))throw new Error(`FATAL: ${tarballPath} still contains a file: dependency spec. Refusing to vendor it.`);
  }finally{
    rmSync(inspect,{recursive:true,force:true});
  }
}
