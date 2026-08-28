// Gate test for scripts/pack-vendor.mjs: the vendored tarballs must contain no
// file: dependency specs (the 27 Aug 2026 Netlify lockfile failure, see
// ../v0.2-BUILD-LOG.md §5) and the workspace package.json files must be
// restored byte-for-byte after the run.

import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, readdirSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..","..");
const packages=["packages/contracts","packages/core","packages/browser","packages/watermark-lab"];

test("pack:vendor produces file:-free tarballs and restores originals",()=>{
  const before=new Map(packages.map(dir=>[dir,readFileSync(join(root,dir,"package.json"),"utf8")]));
  const destination=mkdtempSync(join(tmpdir(),"oaci-pack-vendor-test-"));
  try{
    const run=spawnSync("node",["scripts/pack-vendor.mjs",destination],{cwd:root,encoding:"utf8"});
    assert.equal(run.status,0,`pack-vendor.mjs failed\n${run.stdout}\n${run.stderr}`);

    const tarballs=readdirSync(destination).filter(name=>name.endsWith(".tgz"));
    assert.equal(tarballs.length,packages.length,`expected ${packages.length} tarballs, got: ${tarballs.join(", ")}`);

    for(const tarball of tarballs){
      const inspect=mkdtempSync(join(tmpdir(),"oaci-pack-vendor-inspect-"));
      try{
        const untar=spawnSync("tar",["-xzf",join(destination,tarball),"-C",inspect],{encoding:"utf8"});
        assert.equal(untar.status,0,`tar failed for ${tarball}\n${untar.stderr}`);
        const manifest=JSON.parse(readFileSync(join(inspect,"package","package.json"),"utf8"));
        for(const field of ["dependencies","devDependencies","optionalDependencies","peerDependencies"]){
          for(const [name,spec] of Object.entries(manifest[field]??{})){
            assert.ok(!String(spec).startsWith("file:"),`${tarball} ${field}.${name} is still ${spec}`);
          }
        }
        assert.ok(!readFileSync(join(inspect,"package","package.json"),"utf8").includes("file:"),`${tarball} package.json still mentions file:`);
      }finally{
        rmSync(inspect,{recursive:true,force:true});
      }
    }

    for(const dir of packages){
      assert.equal(readFileSync(join(root,dir,"package.json"),"utf8"),before.get(dir),`${dir}/package.json was not restored`);
    }
  }finally{
    rmSync(destination,{recursive:true,force:true});
  }
});
