#!/usr/bin/env node
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync, existsSync, readdirSync, statSync} from "node:fs";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, extname, join, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {gzipSync} from "node:zlib";
import canonicalize from "../../packages/core/node_modules/canonicalize/lib/canonicalize.js";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"../..");
const coreDir=join(root,"packages/core");
const browserDir=join(root,"packages/browser");
const contractsDir=join(root,"packages/contracts");
const failures=[];let passed=0;
const check=async(name,fn)=>{try{await fn();console.log(`PASS ${name}`);passed++;}catch(error){const message=error?.stack??String(error);console.error(`FAIL ${name}\n${message}`);failures.push({name,message});}};
const run=(command,args,options={})=>{const result=spawnSync(command,args,{cwd:root,encoding:"utf8",timeout:options.timeout??120000,maxBuffer:10*1024*1024,...options});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`);return result.stdout;};
const sourceFiles=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sourceFiles(join(dir,entry.name)):[join(dir,entry.name)]);
const request=(content="Specific evidence matters.",content_type="plain_text")=>({schema_version:"1.0",contract_version:"1.0.0",request_id:"req_g2gate001",created_at:"2026-08-26T12:00:00Z",source:{content,content_type,language:"en-GB"},checks:["unicode.invisible","unicode.homoglyph","style.patterns","watermark.anthropic"],privacy:{allowed_routes:["browser"],save_receipt:false,retain_content:false}});
const playwrightCandidates=[process.env.PLAYWRIGHT_MODULE,join(root,"node_modules/playwright/index.mjs")].filter(Boolean);
const playwrightModulePath=playwrightCandidates.find(existsSync);
const withStaticServer=async fn=>{const mime={".js":"text/javascript",".html":"text/html",".json":"application/json"};const server=createServer((req,res)=>{try{const route=decodeURIComponent((req.url??"/").split("?")[0]);if(route==="/"){res.writeHead(200,{"content-type":"text/html","cache-control":"no-store"});res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>G2 gate</title>');return;}const path=join(root,route.replace(/^\/+/,""));if(!path.startsWith(root)||!statSync(path).isFile())throw Error();res.writeHead(200,{"content-type":mime[extname(path)]??"application/octet-stream","cache-control":"no-store"});res.end(readFileSync(path));}catch{res.writeHead(404);res.end("not found");}});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const address=server.address();try{return await fn(`http://127.0.0.1:${address.port}`);}finally{await new Promise(resolve=>server.close(resolve));}};
const percentile=(values,p)=>{const ordered=[...values].sort((a,b)=>a-b);return ordered[Math.min(ordered.length-1,Math.ceil(p*ordered.length)-1)];};

await check("package-local builds, exports and consumer imports resolve",async()=>{
  run("npm",["run","build"],{cwd:coreDir});run("npm",["run","build"],{cwd:browserDir});
  for(const dir of [coreDir,browserDir]){const pkg=JSON.parse(readFileSync(join(dir,"package.json"),"utf8"));const target=pkg.exports["."].import;assert.ok(existsSync(join(dir,target)),`${pkg.name} export target missing: ${target}`);}
  const core=await import(`${pathToFileURL(join(coreDir,"dist/bundle.js"))}?gate=${Date.now()}`);const browser=await import(`${pathToFileURL(join(browserDir,"dist/index.js"))}?gate=${Date.now()}`);
  for(const symbol of ["inspect","extractProtectedSpans","validateCandidate","diff","previewSafeFixes","buildReceipt","verifyReceipt"])assert.equal(typeof core[symbol],"function",`missing core export ${symbol}`);
  for(const symbol of ["createInspectionWorker","projectDomVisibleText","supportsWorkerInspection"])assert.equal(typeof browser[symbol],"function",`missing browser export ${symbol}`);
});

const core=await import(`${pathToFileURL(join(coreDir,"dist/bundle.js"))}?suite=${Date.now()}`);

await check("frozen G1 contract regression stays green",()=>{run("npm",["test","--silent"]);run(process.execPath,["tests/gate/g1-contract-gate.mjs"]);});

await check("runtime is offline, side-effect free and has no install/telemetry hook",()=>{
  const banned=/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(|https?:\/\//;
  for(const dir of [coreDir,browserDir]){const pkg=JSON.parse(readFileSync(join(dir,"package.json"),"utf8"));for(const hook of ["preinstall","install","postinstall","prepare"])assert.equal(pkg.scripts?.[hook],undefined,`${pkg.name} has ${hook}`);assert.equal(pkg.sideEffects,false,`${pkg.name} must declare sideEffects false`);for(const file of sourceFiles(join(dir,"src")))assert.doesNotMatch(readFileSync(file,"utf8"),banned,`network primitive in ${file}`);}
  const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error("network_forbidden")};return core.inspect(request()).finally(()=>{globalThis.fetch=oldFetch;});
});

await check("Unicode findings have exact dual offsets and hashes",()=>{
  const text="A🧪\u200bB\u00a0C\u202eD";const findings=core.inspectUnicode(text);assert.ok(findings.length>=3);
  for(const finding of findings){const raw=text.slice(finding.span.start_utf16,finding.span.end_utf16);assert.equal(finding.matched_text_hash,core.prefixedSha256(raw));assert.equal(Array.from(text.slice(0,finding.span.start_utf16)).length,finding.span.start_codepoint);assert.equal(Array.from(text.slice(0,finding.span.end_utf16)).length,finding.span.end_codepoint);}
  assert.equal(core.inspectUnicode("العربية עברית हिन्दी 👩‍💻 café").length,0,"legitimate scripts/joiners must not be auto-fixed");
});

await check("mixed-script homoglyphs are explainable",async()=>{
  const homoglyph="Oрасе";const result=await core.inspect(request(`Brand ${homoglyph}.`),{now:()=>"2026-08-26T12:00:00Z",analysisId:()=>"analysis_g2gate01"});
  const evidence=result.methods.filter(x=>x.id==="unicode.homoglyph").flatMap(x=>x.evidence??[]);assert.ok(evidence.some(x=>JSON.stringify(x).toLowerCase().includes("homoglyph")||JSON.stringify(x).toLowerCase().includes("mixed")),"mixed Latin/Cyrillic token was not identified");
});
await check("unpaired UTF-16 surrogates fail closed before hashing",async()=>{
  await assert.rejects(()=>core.inspect(request("bad\ud800source")),/unicode|surrogate|invalid/i,"invalid UTF-16 source must be rejected before hashing");
});

await check("HTML/entity projection is deterministic, monotonic and malformed-input safe",()=>{
  const html="<p>A &amp; 🧪 &#x301; &#xZZ;</p><!--hidden--><script>bad()</script><div>Tail";
  const one=core.projectVisibleText(html,"html"),two=core.projectVisibleText(html,"html");assert.deepEqual(one,two);assert.match(one.text,/A & 🧪/);assert.match(one.text,/&#xZZ;/);assert.doesNotMatch(one.text,/hidden|bad\(\)/);
  let v=0,s=0;for(const run of one.runs){assert.ok(run.visible_end_utf16>run.visible_start_utf16);assert.ok(run.source_end_utf16>run.source_start_utf16);assert.ok(run.visible_start_utf16>=v&&run.source_start_utf16>=s,"runs must be monotonic");v=run.visible_end_utf16;s=run.source_end_utf16;}
  assert.doesNotThrow(()=>core.projectVisibleText("x &#999999999999999999999; y","html"));
});

await check("protected spans are exact and every damage mode blocks",()=>{
  const source='Opace quoted £1,250 on 26 August 2026: “fixed words” [7]. See https://opace.agency/ and `x()`.';const hash=core.prefixedSha256(source);const spans=core.extractProtectedSpans({content:source,content_hash:hash},{configured_terms:[{text:"Opace",kind:"organisation"}]});
  assert.ok(spans.length>=7);for(const span of spans){assert.equal(source.slice(span.start_utf16,span.end_utf16),span.text);assert.equal(span.content_hash,hash);assert.ok(span.end_codepoint>span.start_codepoint);}
  for(const candidate of [source.replace("Opace","Other"),source.replace("https://opace.agency/","https://evil.test/"),source.replace("[7]","[8]"),source.replace("fixed words","changed"),source+" https://opace.agency/"]){const gates=core.validateCandidate({content:source,content_hash:hash,content_type:"plain_text",language:"en-GB"},candidate,spans,{mode:"strict"});assert.ok(gates.some(x=>x.hard&&x.status==="fail"),`damage passed: ${candidate}`);}
  const stale=core.validateCandidate({content:source,content_hash:hash},source,spans,{expected_source_hash:core.prefixedSha256("old")});assert.equal(stale.find(x=>x.id==="source_version")?.status,"fail");
});

await check("patterns are deterministic, source-bound and immutable",async()=>{
  const text="In conclusion, details matter. In conclusion, evidence matters.";const options={now:()=>"2026-08-26T12:00:00Z",analysisId:()=>"analysis_g2gate02"};const a=await core.inspect(request(text),options),b=await core.inspect(request(text),options);assert.deepEqual(a,b);assert.ok(a.pattern_findings.length);for(const finding of a.pattern_findings){assert.equal(finding.matched_text_hash,core.prefixedSha256(text.slice(finding.span.start_utf16,finding.span.end_utf16)));assert.ok(Object.isFrozen(finding));}
  assert.equal((await core.inspect(request("The report records one measured result."),options)).pattern_findings.length,0);
});

await check("diff reconstructs exactly and pathological input uses bounded fallback",()=>{
  for(const [source,candidate] of [["one two three","one four three"],["🧪 a\r\nb","🧪 c\r\nb"],["x ".repeat(45000),"y ".repeat(45000)]]){const d=core.diff(source,candidate);assert.equal(d.segments.filter(x=>x.type!=="insert").map(x=>x.text).join(""),source);assert.equal(d.segments.filter(x=>x.type!=="delete").map(x=>x.text).join(""),candidate);assert.deepEqual(d,core.diff(source,candidate));if(source.length+candidate.length>80000)assert.equal(d.fallback,true);}
});

await check("diff memory remains within the frozen 4x UTF-16 budget",()=>{
  const probe=`import {diff} from ${JSON.stringify(pathToFileURL(join(coreDir,"dist/bundle.js")).href)};const a="one ".repeat(10000),b="two ".repeat(10000);global.gc();const before=process.memoryUsage().heapUsed;diff(a,b);global.gc();const delta=Math.max(0,process.memoryUsage().heapUsed-before);const budget=(a.length+b.length)*2*4;if(delta>budget)throw new Error("heap delta "+delta+" > "+budget);console.log(delta+"/"+budget);`;
  run(process.execPath,["--expose-gc","--input-type=module","-e",probe],{timeout:20000});
});

await check("safe-fix previews are immutable and respect protected spans",()=>{
  const source="A\u200b B\u00a0C";const findings=core.inspectUnicode(source);const original=structuredClone(findings);const protectedSpans=core.extractProtectedSpans({content:source,content_hash:core.prefixedSha256(source)},{user_spans:[{start_utf16:1,end_utf16:2}]});const preview=core.previewSafeFixes(source,findings,findings.map(x=>x.id),protectedSpans);assert.equal(preview.candidate,"A\u200b B C");assert.deepEqual(findings,original);assert.ok(preview.skipped.some(x=>x.reason==="protected_span"));assert.equal(preview.source_hash,core.prefixedSha256(source));assert.equal(preview.candidate_hash,core.prefixedSha256(preview.candidate));assert.ok(Object.isFrozen(preview),"preview must be immutable");
});
await check("safe fixes enforce finding provenance and overlap locks",()=>{
  const source="A\u200b B\u00a0C";const findings=core.inspectUnicode(source);
  const forged={...findings[0],id:"forged",fix:"remove",span:{start_utf16:0,end_utf16:1,start_codepoint:0,end_codepoint:1},matched_text_hash:core.prefixedSha256("wrong")};const attack=core.previewSafeFixes(source,[forged],["forged"],[]);assert.equal(attack.candidate,source,"unverified caller-supplied finding was applied");assert.ok(attack.skipped.some(x=>/invalid|stale|provenance/.test(x.reason)));
  const overlap=core.previewSafeFixes(source,[findings[0],{...findings[0],id:"overlap",span:{...findings[0].span,start_utf16:0},matched_text_hash:core.prefixedSha256(source.slice(0,findings[0].span.end_utf16))}],[findings[0].id,"overlap"],[]);assert.equal(overlap.applied_finding_ids.length,1,"overlapping edits must not both apply");
});

const receiptInput={receipt_id:"receipt_g2gate001",product_version:"0.1.0",created_at:"2026-08-26T12:00:00Z",source:{content:"Private draft 🧪",content_type:"plain_text",language:"en-GB"},policy:{id:"strict",version:"1.0.0",requested_checks:[],allowed_routes:["browser"],retain_content:false},methods:[],rewrite:null,approval:{scope:"none"},limitations:["This receipt does not prove human authorship."],contains_content:false};
await check("receipt is JCS-stable, hash-only, immutable and tamper/major closed",async()=>{
  const a=await core.buildReceipt(receiptInput),b=await core.buildReceipt({...receiptInput,policy:{allowed_routes:["browser"],requested_checks:[],retain_content:false,version:"1.0.0",id:"strict"}});assert.equal(a.integrity.payload_hash,b.integrity.payload_hash);assert.equal("content" in a.source,false);assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.source));assert.equal((await core.verifyReceipt(a)).valid,true);
  for(const mutate of [r=>r.source.word_count++,r=>r.contract_version="2.0.0",r=>r.contains_content=true]){const tampered=structuredClone(a);mutate(tampered);const result=await core.verifyReceipt(tampered);assert.equal(result.valid,false);}
  await assert.rejects(()=>core.buildReceipt({...receiptInput,contains_content:true}),/consent/);
});
await check("receipt verification validates schema after an attacker rehashes malformed content",async()=>{
  const valid=await core.buildReceipt(receiptInput);const malformed=structuredClone(valid);delete malformed.source.language;malformed.methods=[{id:"forged",category:"detector",provider_or_method:"forged",version:"1",status:"mystery",score:null,threshold:null,segments:[],evidence:[],limitations:["invalid"],started_at:receiptInput.created_at,completed_at:receiptInput.created_at,privacy_route:"browser"}];
  const payload=structuredClone(malformed);delete payload.integrity.payload_hash;delete payload.integrity.signature;malformed.integrity.payload_hash=core.prefixedSha256(canonicalize(payload));const verification=await core.verifyReceipt(malformed);assert.equal(verification.valid,false,"malformed but correctly rehashed receipt bypassed schema validation");assert.ok(verification.errors.some(x=>/schema|required|status|invalid/.test(x)),`schema error absent: ${verification.errors}`);
});
await check("receipt rewrite content obeys bidirectional retain-content rules",async()=>{
  const sourceHash=core.prefixedSha256(receiptInput.source.content),candidate="Edited draft",candidateHash=core.prefixedSha256(candidate);const rewrite={source_hash:sourceHash,candidate_hash:candidateHash,generator:{route:"browser",provider:"local",model:"deterministic",prompt_template:"none"},gates:[],selected_candidate:"candidate_1"};
  await assert.rejects(()=>core.buildReceipt({...receiptInput,contains_content:true,policy:{...receiptInput.policy,retain_content:true},rewrite}),/candidate|content|schema|required/i,"content-bearing rewrite without candidate content must fail");
  const hashOnly=await core.buildReceipt({...receiptInput,rewrite:{...rewrite,source_content:receiptInput.source.content,candidate_content:candidate}});assert.equal("source_content" in hashOnly.rewrite,false,"hash-only rewrite leaked source content");assert.equal("candidate_content" in hashOnly.rewrite,false,"hash-only rewrite leaked candidate content");
});
await check("representative receipt remains verified and below the 1 MB default budget",async()=>{
  const methods=Array.from({length:24},(_,i)=>({id:`style.rule.${i}`,category:"pattern",provider_or_method:"Opace deterministic rules",version:"1.0.0",status:i%7===0?"attention":"pass",score:null,threshold:null,segments:[],evidence:[{rule_id:`rule.${i}`,count:i}],limitations:["Editorial evidence does not prove authorship."],started_at:receiptInput.created_at,completed_at:receiptInput.created_at,privacy_route:"browser"}));const receipt=await core.buildReceipt({...receiptInput,methods});const bytes=Buffer.byteLength(JSON.stringify(receipt),"utf8");assert.ok(bytes<1_000_000,`representative receipt is ${bytes} bytes`);assert.equal((await core.verifyReceipt(receipt)).valid,true);console.log(`METRIC receipt_bytes=${bytes} payload_hash=${receipt.integrity.payload_hash}`);
});

await check("SSR/Node import and worker client cancellation fail safely",async()=>{
  const browserUrl=pathToFileURL(join(browserDir,"dist/index.js")).href;run(process.execPath,["--input-type=module","-e",`delete globalThis.window;delete globalThis.document;delete globalThis.Worker;const m=await import(${JSON.stringify(browserUrl)});if(m.supportsWorkerInspection())throw Error("worker support false positive");try{m.createInspectionWorker();throw Error("worker accepted")}catch(e){if(!/worker_unsupported/.test(String(e)))throw e}`]);
  const browser=await import(`${browserUrl}?mock=${Date.now()}`);class FakeWorker{messages=[];postMessage(m){this.messages.push(m)}terminate(){this.terminated=true}};const old=globalThis.Worker;globalThis.Worker=FakeWorker;try{const client=browser.createInspectionWorker();const controller=new AbortController();controller.abort();await assert.rejects(()=>client.inspect(request(),{signal:controller.signal}),e=>e?.name==="AbortError");client.dispose();}finally{globalThis.Worker=old;}
});

await check("browser package default Worker URL resolves to a shipped asset",async()=>{
  const browser=await import(`${pathToFileURL(join(browserDir,"dist/index.js")).href}?asset=${Date.now()}`);let capturedUrl;class CaptureWorker{constructor(url){capturedUrl=url}postMessage(){}terminate(){}}const old=globalThis.Worker;globalThis.Worker=CaptureWorker;try{const client=browser.createInspectionWorker();assert.ok(capturedUrl,"browser client did not construct a Worker");assert.ok(existsSync(fileURLToPath(capturedUrl)),`default worker target is not shipped: ${capturedUrl.href}`);client.dispose();}finally{globalThis.Worker=old;}
});

await check("packed core/browser inventories are exact and contain only declared artefacts",()=>{
  for(const dir of [coreDir,browserDir,contractsDir]){const packed=JSON.parse(run("npm",["pack","--dry-run","--json"],{cwd:dir}))[0];const paths=packed.files.map(file=>file.path).sort();for(const required of ["package.json","LICENSE","README.md"])assert.ok(paths.includes(required),`${packed.name} missing ${required}`);assert.ok(paths.every(path=>path==="package.json"||path==="README.md"||path==="LICENSE"||(dir===contractsDir?(path.startsWith("src/")||path.startsWith("dist/")):path.startsWith("dist/"))),`${packed.name} packed undeclared file`);assert.ok(paths.every(path=>!path.includes(".map")&&!path.startsWith("php/")),`${packed.name} packed source map or PHP implementation`);if(dir===coreDir){assert.ok(paths.includes("dist/index.d.ts"));assert.ok(paths.includes("dist/bundle.js"));const gzipBytes=gzipSync(readFileSync(join(dir,"dist/bundle.js"))).byteLength;assert.ok(gzipBytes<=100_000,`core gzip bundle ${gzipBytes} > 100000`);console.log(`METRIC core_bundle_gzip_bytes=${gzipBytes}`);}else if(dir===browserDir){assert.ok(paths.includes("dist/index.d.ts"));assert.ok(paths.includes("dist/worker/entry.js"));}else{assert.ok(paths.includes("src/index.ts"));assert.ok(paths.includes("dist/index.js"));assert.ok(paths.includes("dist/index.d.ts"));assert.equal(paths.length,20,`contracts inventory changed: ${paths.length} files`);}console.log(`PACK_INVENTORY ${packed.name} packed_bytes=${packed.size} unpacked_bytes=${packed.unpackedSize} files=${JSON.stringify(paths)}`);}
});

await check("real Chromium DOM, browser bundle and module Worker complete/cancel",async()=>{
  const modulePath=playwrightModulePath;assert.ok(modulePath,"Playwright is required for the real-browser G2 gate (install dependencies or set PLAYWRIGHT_MODULE)");const {chromium}=await import(pathToFileURL(modulePath).href);
  const mime={".js":"text/javascript",".html":"text/html",".json":"application/json"};const server=createServer((req,res)=>{try{const route=decodeURIComponent((req.url??"/").split("?")[0]);if(route==="/"){res.writeHead(200,{"content-type":"text/html","cache-control":"no-store"});res.end("<!doctype html><title>G2 gate</title>");return;}const path=join(root,route.replace(/^\/+/,""));if(!path.startsWith(root)||!statSync(path).isFile())throw Error();res.writeHead(200,{"content-type":mime[extname(path)]??"application/octet-stream","cache-control":"no-store"});res.end(readFileSync(path));}catch{res.writeHead(404);res.end("not found");}});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const address=server.address();const base=`http://127.0.0.1:${address.port}`;let browser;
  try{browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto(base);const result=await page.evaluate(async({url,workerUrl,req})=>{const mod=await import(url);const host=document.createElement("div");host.innerHTML='<p>Shown &amp; clear</p><div hidden><span>Hidden ancestor</span></div><div aria-hidden="true"><span>Aria ancestor</span></div><script>bad()</script><p>Second<br>Line</p>';document.body.append(host);const projection=mod.projectDomVisibleText(host);const client=mod.createInspectionWorker({workerUrl:new URL(workerUrl)});const phases=[];const analysed=await Promise.race([client.inspect(req,{onProgress:p=>phases.push(p)}),new Promise((_,reject)=>setTimeout(()=>reject(Error("worker_timeout")),8000))]);const controller=new AbortController();const cancelled=client.inspect({...req,request_id:"req_g2cancel",source:{...req.source,content:"word ".repeat(30000)}},{signal:controller.signal});controller.abort();let cancelName="";try{await cancelled}catch(e){cancelName=e.name}client.dispose();return {projection,phases,analysed,cancelName};},{url:`${base}/packages/browser/dist/index.js`,workerUrl:`${base}/packages/browser/dist/worker/entry.js`,req:request("Browser evidence.")});assert.equal(result.projection.text.includes("Hidden ancestor"),false,"hidden ancestor content leaked");assert.equal(result.projection.text.includes("Aria ancestor"),false,"aria-hidden ancestor content leaked");assert.equal(result.projection.text.includes("bad()"),false);assert.match(result.projection.text,/Shown & clear\s+Second\s+Line/,"block/BR separation was not preserved");assert.deepEqual(result.phases,["validating","mapping_text","unicode_checks","protected_spans","writing_patterns","complete"]);assert.equal(result.analysed.contract_version,"1.0.0");assert.equal(result.cancelName,"AbortError");}
  finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});

await check("Firefox and WebKit import the bundle and map DOM identically",async()=>{
  assert.ok(playwrightModulePath,"Playwright is required for cross-engine G2 (set PLAYWRIGHT_MODULE)");const {firefox,webkit}=await import(pathToFileURL(playwrightModulePath).href);await withStaticServer(async base=>{for(const [name,type] of [["firefox",firefox],["webkit",webkit]]){let browser;try{browser=await type.launch({headless:true});const page=await browser.newPage();await page.goto(base);const projection=await page.evaluate(async url=>{const mod=await import(url);const host=document.createElement("div");host.innerHTML='<p>Shown &amp; clear</p><div hidden><span>Hidden</span></div><div aria-hidden="true"><span>Aria</span></div><p>Second<br>Line</p>';document.body.append(host);return mod.projectDomVisibleText(host);},`${base}/packages/browser/dist/index.js`);assert.equal(projection.text.includes("Hidden"),false);assert.equal(projection.text.includes("Aria"),false);assert.match(projection.text,/Shown & clear\s+Second\s+Line/);console.log(`BROWSER_ENGINE ${name} version=${await browser.version()}`);}catch(error){throw new Error(`${name}_binary_or_runtime_unavailable: ${error?.message??error}`);}finally{if(browser)await browser.close();}}});
});

await check("Chromium 375x812 Worker flow, long tasks and cold/warm mobile timings",async()=>{
  assert.ok(playwrightModulePath,"Playwright is required for mobile G2 (set PLAYWRIGHT_MODULE)");const {chromium}=await import(pathToFileURL(playwrightModulePath).href);await withStaticServer(async base=>{const browser=await chromium.launch({headless:true});try{const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});const outbound=[];page.on("request",r=>outbound.push(r.url()));await page.goto(base);const result=await page.evaluate(async({url,workerUrl,req})=>{const longTasks=[];if(globalThis.PerformanceObserver&&PerformanceObserver.supportedEntryTypes?.includes("longtask")){const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(entry=>entry.duration)));observer.observe({type:"longtask",buffered:true});}const mod=await import(url);const client=mod.createInspectionWorker({workerUrl:new URL(workerUrl)});const durations=[];let last;for(let i=0;i<7;i++){const start=performance.now();last=await client.inspect({...req,request_id:`req_mobile_${i}`});durations.push(performance.now()-start);}await new Promise(resolve=>setTimeout(resolve,50));client.dispose();return {durations,longTasks,last,viewport:{width:innerWidth,height:innerHeight},longTaskSupported:PerformanceObserver.supportedEntryTypes?.includes("longtask")??false};},{url:`${base}/packages/browser/dist/index.js`,workerUrl:`${base}/packages/browser/dist/worker/entry.js`,req:request("measured evidence ".repeat(5000).trim())});assert.deepEqual(result.viewport,{width:375,height:812});assert.equal(result.last.contract_version,"1.0.0");assert.ok(outbound.every(url=>url.startsWith(base)),`external request observed: ${outbound}`);assert.equal(result.longTaskSupported,true,"Long Task API unavailable; measurable fallback required");const maxLongTask=Math.max(0,...result.longTasks);assert.ok(maxLongTask<=50,`main-thread long task ${maxLongTask.toFixed(1)}ms exceeds 50ms`);const cold=result.durations[0],warm=result.durations.slice(1),p50=percentile(warm,0.5),p95=percentile(warm,0.95);assert.ok(cold<1500,`mobile cold ${cold.toFixed(1)}ms exceeds 1500ms`);assert.ok(p95<1500,`mobile warm p95 ${p95.toFixed(1)}ms exceeds 1500ms`);console.log(`METRIC chromium_mobile_4x viewport=375x812 cold_ms=${cold.toFixed(2)} warm_p50_ms=${p50.toFixed(2)} warm_p95_ms=${p95.toFixed(2)} max_long_task_ms=${maxLongTask.toFixed(2)} iterations=7`);}finally{await browser.close();}});
});

await check("10,000-word and 50,000-character performance budgets",async()=>{
  const words="measured evidence ".repeat(5000).trim();const start=performance.now();await core.inspect(request(words),{now:()=>"2026-08-26T12:00:00Z",analysisId:()=>"analysis_g2perf01"});const elapsed=performance.now()-start;assert.ok(elapsed<500,`10,000-word inspection ${elapsed.toFixed(1)}ms exceeds 500ms`);
  const chars="a ".repeat(25000);const second=performance.now();await core.inspect(request(chars),{now:()=>"2026-08-26T12:00:00Z",analysisId:()=>"analysis_g2perf02"});const elapsed2=performance.now()-second;assert.ok(elapsed2<1500,`50,000-character inspection ${elapsed2.toFixed(1)}ms exceeds 1500ms`);
});

console.log(`\nG2 core probe: ${passed} passed; ${failures.length} failed`);if(failures.length){console.error("\nBlocking failures:");for(const failure of failures)console.error(`- ${failure.name}`);process.exitCode=1;}
