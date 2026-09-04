import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readFileSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {runCli} from "../dist/main.js";
import {render} from "../dist/output.js";
import canonicalize from "canonicalize";
const cli=new URL("../dist/main.js",import.meta.url);const run=(args,input="")=>spawnSync(process.execPath,[cli.pathname,...args],{input,encoding:"utf8",env:{...process.env,NO_COLOR:"1"}});

test("stdin and file inspection have equivalent stable output and clean JSON stdout",()=>{const dir=mkdtempSync(join(tmpdir(),"oaci-cli-")),file=join(dir,"input.txt"),text="Evidence\u200b costs £1,250.";writeFileSync(file,text);const a=run(["inspect","-","--checks","unicode,homoglyph,patterns,protected","--locale","en-GB","--format","json"],text),b=run(["inspect",file,"--format","json"]);assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);const aa=JSON.parse(a.stdout),bb=JSON.parse(b.stdout);for(const value of [aa,bb]){delete value.started_at;delete value.completed_at;for(const method of value.methods){delete method.started_at;delete method.completed_at;}}bb.methods=bb.methods.filter(method=>method.id!=="watermark.anthropic");bb.summary.unsupported=0;bb.combined_verdict.text_integrity.watermark=aa.combined_verdict.text_integrity.watermark;assert.deepEqual(aa,bb);assert.equal(a.stderr,"");assert.equal(run(["inspect","-","--fail-on","attention"],text).status,4);});

test("HTML is self-contained and held commands have unavailable exits",()=>{const html=run(["inspect","-","--format","html"],"<script>bad()</script>Safe");assert.equal(html.status,0);assert.match(html.stdout,/<!doctype html>/);assert.doesNotMatch(html.stdout,/<script|<iframe|<img|<link|@import|url\(|\ssrc=/);for(const url of html.stdout.match(/https?:\/\/[^"'\s<]+/g)??[])assert.ok(url.startsWith("https://opace.agency/"),`unexpected outbound destination ${url}`);assert.equal(run(["unknown"]).status,2);for(const args of [["serve"],["improve"],["benchmark"],["watermark","lab","list"]])assert.equal(run(args).status,3,args.join(" "));assert.equal(run(["--config","x","inspect","-"]).status,2);});

test("public runtime identity is version 0.3.1",()=>{assert.equal(run(["--version"]).stdout,"0.3.1\n");const text=run(["inspect","-"],"Evidence");assert.equal(text.status,0,text.stderr);assert.match(text.stdout,/Opace AI Content Checker & Detector 0\.3\.1/);assert.doesNotMatch(text.stdout,/private/);const dir=mkdtempSync(join(tmpdir(),"oaci-version-")),receipt=join(dir,"receipt.json");assert.equal(run(["inspect","-","--receipt",receipt],"Evidence").status,0);assert.equal(JSON.parse(readFileSync(receipt,"utf8")).product_version,"0.3.1");});

test("hash-only redaction allowlists fields, rehashes and never overwrites",()=>{const dir=mkdtempSync(join(tmpdir(),"oaci-receipt-")),receipt=join(dir,"receipt.json"),hostile=join(dir,"hostile.json"),redacted=join(dir,"redacted.json");assert.equal(run(["--offline","inspect","-","--format","json","--receipt",receipt],"Private source £20").status,0);const value=JSON.parse(readFileSync(receipt,"utf8"));value.secret="TOP-LEVEL-SECRET";value.source.secret="SOURCE-SECRET";value.methods[0].evidence=[{secret:"EVIDENCE-SECRET"}];writeFileSync(hostile,JSON.stringify(value));const redact=run(["receipt","redact",hostile,"--format","json","--output",redacted]);assert.equal(redact.status,0,redact.stderr);const raw=readFileSync(redacted,"utf8"),safe=JSON.parse(raw);assert.doesNotMatch(raw,/SECRET/);assert.equal(safe.contains_content,false);assert.equal(safe.source.content,undefined);assert.equal(safe.integrity.signature,undefined);assert.match(safe.integrity.payload_hash,/^sha256:[a-f0-9]{64}$/);assert.equal(run(["receipt","verify",redacted,"--format","json"]).status,0);assert.equal(run(["receipt","redact",receipt,"--output",redacted]).status,2);});

test("bounded input and explicit gate policy",()=>{const dir=mkdtempSync(join(tmpdir(),"oaci-bound-")),large=join(dir,"large.txt"),source=join(dir,"source.txt"),candidate=join(dir,"candidate.txt");writeFileSync(large,"x".repeat(250001));writeFileSync(source,"Price £10.");writeFileSync(candidate,"Price changed.");assert.equal(run(["inspect",large]).status,2);assert.equal(run(["inspect","-"],"x".repeat(250001)).status,2);assert.equal(run(["compare",source,candidate]).status,0);assert.equal(run(["compare",source,candidate,"--fail-on-gate"]).status,4);const locks=join(dir,"locks.json");assert.equal(run(["protect","extract",source,"--format","json","--output",locks]).status,0);assert.equal(run(["protect","validate",source,candidate,"--locks",locks,"--fail-on","gate"]).status,4);});

test("quiet text mode is silent and offline inspection never calls fetch",async()=>{let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw new Error("network_forbidden");};const stdout=[],stderr=[];try{const code=await runCli({argv:["--offline","--quiet","inspect","-"],stdin:(async function*(){yield new TextEncoder().encode("Offline evidence");})(),stdout:value=>stdout.push(value),stderr:value=>stderr.push(value),env:{NO_COLOR:"1"}});assert.equal(code,0);assert.deepEqual(stdout,[]);assert.deepEqual(stderr,[]);assert.equal(calls,0);}finally{globalThis.fetch=original;}});

test("offline inspection is explicitly not assessed",()=>{const result=run(["--offline","inspect","-","--format","json"],"Offline deterministic evidence");assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);assert.equal(value.combined_verdict.ai_probability.reading,"not_assessed");assert.equal(value.combined_verdict.ai_probability.value,null);assert.equal(value.combined_verdict.ai_probability.source,null);});

test("explicit local-engine route validates and renders the complete canonical result",async()=>{const fixture=JSON.parse(readFileSync(new URL("../../../fixtures/contracts/valid/checker-result.json",import.meta.url),"utf8")).data;fixture.route={...fixture.route,kind:"loopback_engine",location:"This device",content_transfer:"loopback",privacy_route:"local_service",consent:"explicit",retention:{source:"request_only",result:"none",statement:"Not retained."},transport:{endpoint_class:"authenticated_loopback",region:null,requests:1,words_sent:120,processed:"once",retained:"not retained"}};fixture.abuse_controls={...fixture.abuse_controls,channel_authentication:"loopback_bearer",proof_of_work:"not_applicable",per_ip_limit:"not_applicable",global_inference_limit:"not_applicable",fallback:"not_configured",kill_switch:"not_applicable"};fixture.methods.forEach(method=>method.privacy_route="local_service");const original=globalThis.fetch,calls=[],stdout=[],stderr=[];globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify(fixture),{status:200,headers:{"content-type":"application/vnd.opace.checker-result+json;version=1"}});};try{const code=await runCli({argv:["inspect","-","--local-engine","--format","html"],stdin:(async function*(){yield new TextEncoder().encode("Evidence ".repeat(120));})(),stdout:value=>stdout.push(value),stderr:value=>stderr.push(value),env:{OACI_RUN_TOKEN:"run-token-1234567890",NO_COLOR:"1"}});assert.equal(code,0,stderr.join(""));assert.equal(calls.length,1);assert.equal(calls[0].url,"http://127.0.0.1:8741/v1/checker-results");assert.equal(calls[0].init.redirect,"manual");assert.equal(calls[0].init.headers.authorization,"Bearer run-token-1234567890");assert.equal(calls[0].init.headers.accept,"application/vnd.opace.checker-result+json;version=1");const html=stdout.join("");assert.match(html,/Text integrity and provenance/);assert.match(html,/Editorial suggestions/);assert.match(html,/Inside section 2 of 2/);assert.match(html,/Run record and support/);assert.match(html,/Content Credentials and watermarks/);assert.match(html,/Why it reads this way/);assert.match(html,/Strongly AI/);assert.match(html,/The second complete passage/);assert.match(html,/raw margin 3\.6/);const json=render(fixture,"json"),jsonl=render(fixture,"jsonl");assert.deepEqual(JSON.parse(json),fixture);assert.deepEqual(JSON.parse(jsonl),fixture);assert.equal(json.endsWith("\n"),true);assert.equal(jsonl.split("\n").filter(Boolean).length,1);}finally{globalThis.fetch=original;}});

test("local-engine accepts ordinary JSON content-type parameters",async()=>{const fixture=JSON.parse(readFileSync(new URL("../../../fixtures/contracts/valid/checker-result.json",import.meta.url),"utf8")).data;fixture.route={...fixture.route,kind:"loopback_engine",location:"This device",content_transfer:"loopback",privacy_route:"local_service",consent:"explicit",retention:{source:"request_only",result:"none",statement:"Not retained."},transport:{endpoint_class:"authenticated_loopback",region:null,requests:1,words_sent:60,processed:"once",retained:"not retained"}};fixture.abuse_controls={...fixture.abuse_controls,channel_authentication:"loopback_bearer",proof_of_work:"not_applicable",per_ip_limit:"not_applicable",global_inference_limit:"not_applicable",fallback:"not_configured",kill_switch:"not_applicable"};fixture.methods.forEach(method=>method.privacy_route="local_service");const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(fixture),{status:200,headers:{"content-type":"application/json; charset=utf-8; profile=checker"}});try{const stdout=[],stderr=[];const code=await runCli({argv:["inspect","-","--local-engine","--format","json"],stdin:(async function*(){yield new TextEncoder().encode("Evidence ".repeat(60));})(),stdout:value=>stdout.push(value),stderr:value=>stderr.push(value),env:{OACI_RUN_TOKEN:"run-token-1234567890"}});assert.equal(code,0,stderr.join(""));assert.equal(JSON.parse(stdout.join("")).route.kind,"loopback_engine");}finally{globalThis.fetch=original;}});

test("local-engine mode fails closed on missing token, non-loopback origin and invalid result",async()=>{const empty=(async function*(){yield new TextEncoder().encode("Evidence ".repeat(120));})();let stdout=[],stderr=[];assert.equal(await runCli({argv:["inspect","-","--local-engine"],stdin:empty,stdout:value=>stdout.push(value),stderr:value=>stderr.push(value),env:{}}),3);stdout=[];stderr=[];assert.equal(await runCli({argv:["inspect","-","--local-engine","--engine-origin","https://example.com"],stdin:(async function*(){yield new TextEncoder().encode("Evidence ".repeat(120));})(),stdout:value=>stdout.push(value),stderr:value=>stderr.push(value),env:{OACI_RUN_TOKEN:"run-token-1234567890"}}),2);});

test("receipt render rejects tampered or unvalidated input",()=>{const dir=mkdtempSync(join(tmpdir(),"oaci-render-")),receipt=join(dir,"receipt.json");assert.equal(run(["inspect","-","--receipt",receipt],"Evidence").status,0);const value=JSON.parse(readFileSync(receipt,"utf8"));value.source.content_hash="sha256:"+"f".repeat(64);writeFileSync(receipt,JSON.stringify(value));const rendered=run(["receipt","render",receipt]);assert.equal(rendered.status,2);assert.equal(rendered.stdout,"");assert.doesNotMatch(rendered.stderr,/Evidence|Traceback/);});

test("README quick-start commands are valid",()=>{const readme=readFileSync(new URL("../README.md",import.meta.url),"utf8");assert.match(readme,/opace-ai-checker protect extract article\.txt/);assert.match(readme,/opace-ai-checker receipt verify receipt\.json/);const dir=mkdtempSync(join(tmpdir(),"oaci-readme-")),article=join(dir,"article.txt"),locks=join(dir,"locks.json"),receipt=join(dir,"receipt.json");writeFileSync(article,"Opace evidence costs £10.");assert.equal(run(["protect","extract",article,"--output",locks]).status,0);assert.equal(run(["inspect",article,"--receipt",receipt]).status,0);assert.equal(run(["receipt","verify",receipt]).status,0);});

const canonicalFixture=()=>JSON.parse(readFileSync(new URL("../../../fixtures/contracts/valid/checker-result.json",import.meta.url),"utf8")).data;
const visibleReport=html=>html.replace(/<style>[\s\S]*?<\/style>/g,"");
const textOnly=html=>visibleReport(html).replace(/<[^>]+>/g," ");

test("printable report is the shared branded report with the complete evidence baseline",()=>{const fixture=canonicalFixture(),html=render(fixture,"html"),visible=visibleReport(html),words=textOnly(html);
  assert.match(html,/^<!doctype html>\n<html lang="en-GB">/);
  assert.match(html,/<title>AI content checker report — Opace AI Content Checker &amp; Detector<\/title>/);
  assert.match(words,/Opace AI Content Checker &amp; Detector/);assert.match(words,/Evidence, not guarantees/);
  assert.match(words,/Command line 0\.3\.1/);
  assert.match(html,/<svg viewBox="0 0 300 150" role="img" aria-label="AI-pattern dial: Strongly AI, display score 0\.969/);
  for(const band of ["Likely human","Unclear","Potentially AI","Likely AI","Strongly AI"])assert.match(words,new RegExp(band));
  assert.match(words,/Score 0\.969/);assert.match(words,/not a percentage of AI-written text/);
  assert.match(words,/strongest evidence is in section 2 of 2/);
  assert.match(words,/Text integrity and provenance/);assert.match(words,/Editorial suggestions/);assert.match(words,/style\.repeated_opening/);
  for(const section of fixture.sections){assert.match(words,new RegExp(`Inside section ${section.index+1} of 2`));assert.match(words,new RegExp(section.passage.slice(0,32)));assert.match(words,new RegExp(`Score ${section.display_score.replace(".","\\.")}`));assert.match(words,new RegExp(`raw margin ${String(section.raw_margin).replace(".","\\.")}`));}
  assert.match(words,/Why it reads this way/);assert.match(words,/segments-v3, raw-v1, features-v1, margin-v1/);
  assert.match(words,/Opace EU server, europe-west1/);assert.match(words,/tier3-cycle5-v1/);assert.match(words,/fp32/);
  assert.match(words,/sha256:45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057/);
  assert.match(words,/sha256:aaaaaaaa/);assert.match(words,/sha256:bbbbbbbb/);
  assert.match(html,/max\(m1, m2 \+ 0\.34\) &gt;= 3\.570935/);
  assert.match(words,/The text was processed for this request and was not retained/);
  assert.match(words,/Organisation, Date, Link/);assert.match(words,/watermark\.opace\.public-test/);assert.match(words,/watermark\.anthropic/);
  assert.match(words,/Opace Cycle-5 AI-pattern model/);assert.match(words,/detector\.cycle5/);assert.match(words,/Review evidence/);
  assert.match(words,/What this means/);assert.match(words,/What this does not mean/);assert.match(words,/Recorded limitations/);
  assert.match(words,/it does not prove authorship/);assert.match(words,/result_cycle5_fixture_001/);
  assert.match(words,/https:\/\/opace\.agency\/tools\/ai\/content-verification-integrity\/checker\//);
  assert.doesNotMatch(words,/%/);
  assert.doesNotMatch(html,/<script|<iframe|<img|<link|@import|\ssrc=/);
  for(const url of html.match(/https?:\/\/[^"'\s<]+/g)??[])assert.ok(url.startsWith("https://opace.agency/"),`unexpected outbound destination ${url}`);
  assert.equal(visible.includes("<svg"),true);});

test("a result the shared builder cannot accept keeps the local report rather than failing",()=>{const receipt={schema_version:"1.0",contract_version:"1.0.0",product_version:"0.2.0",receipt_id:"receipt_local001",source:{content_hash:"sha256:"+"a".repeat(64),word_count:12},methods:[{id:"unicode.invisible",status:"pass",provider_or_method:"Invisible character scan",limitations:["Absence is not evidence of human authorship."]}],limitations:["This receipt does not prove human authorship."]};
  const html=render(receipt,"html"),words=textOnly(html);
  assert.match(html,/^<!doctype html><html lang="en-GB">/);
  assert.match(words,/Opace AI Content Checker &amp; Detector/);assert.match(words,/Not assessed/);
  assert.match(words,/No section was scored by a trained model in this run/);
  assert.match(words,/Invisible character scan/);
  assert.doesNotMatch(words,/%/);
  assert.doesNotMatch(html,/<script|<iframe|<img|<link|@import|\ssrc=/);});

test("terminal summary is a readable human report and machine formats stay byte-stable",()=>{const fixture=canonicalFixture(),text=render(fixture,"text");
  assert.match(text,/^Opace AI Content Checker & Detector 0\.3\.1\n/);
  assert.match(text,/Evidence, not guarantees/);
  assert.match(text,/AI-pattern reading {3}Strongly AI {2}· {2}0\.969 {2}····■/);
  assert.match(text,/not a percentage of the text/);
  assert.match(text,/Strongest section {4}Section 2 of 2/);
  assert.match(text,/\n {2}# {3}Score {3}Level {12}Words {2}Band {3}Passage\n/);
  assert.match(text,/\n {2}1 {3}0\.966 {3}Likely AI {11}58 {2}···■· {2}The first complete scored passage/);
  assert.match(text,/\n {2}2\* {2}0\.969 {3}Strongly AI {9}62 {2}····■ {2}The second complete passage/);
  assert.match(text,/Three independent readings/);assert.match(text,/ {2}Text integrity {5}Clean —/);assert.match(text,/ {2}Editorial {10}Some suggestions —/);
  assert.match(text,/Route, model and privacy/);assert.match(text,/Opace EU server, europe-west1 \(Opace EU server\)/);
  assert.match(text,/Privacy route {6}Opace EU service, consent explicit/);
  assert.match(text,/Model {14}tier3-cycle5-v1 · fp32/);
  assert.match(text,/Draft size {9}120 words · 120 characters · 2 sections/);
  assert.match(text,/Protected facts {4}3 protected items were identified and left untouched\./);
  assert.match(text,/Categories: organisation, date, link\./);
  assert.match(text,/Named checks\n {2}1 named check ran\. It is recorded with/);
  assert.match(text,/\n {2}ATTENTION {3}detector\.cycle5/);
  assert.match(text,/Limitations\n {2}• /);
  assert.doesNotMatch(text,/%/);
  const json=render(fixture,"json"),jsonl=render(fixture,"jsonl");
  assert.equal(json,jsonl);assert.equal(json.endsWith("\n"),true);assert.deepEqual(JSON.parse(json),fixture);
  assert.equal(Buffer.byteLength(json,"utf8"),Buffer.byteLength(canonicalize(fixture)+"\n","utf8"));});

/**
 * The shape of the count/verb defect Lane B reported against the Chrome report, guarded here so a
 * new count-bearing sentence in the CLI cannot reintroduce it. Same four patterns as
 * `shared/report/test/pluralisation.test.mjs`.
 */
const AGREEMENT_FAULTS=[[/\b1 [a-z]+s\b/u,"a count of one followed by a plural noun"],[/\b1 [a-z]+ were\b/u,'a count of one followed by "were"'],[/\b(?:0|[2-9]|\d\d+) [a-z]+ was\b/u,'a count other than one followed by "was"'],[/\(s\)/u,'an "(s)" escape hatch instead of a real plural']];
const assertAgrees=(value,label)=>{for(const [pattern,description] of AGREEMENT_FAULTS){const match=pattern.exec(value);assert.equal(match,null,`${label}: ${description} — "${match?.[0]}"`);}};
/** Reader-visible prose only: the stylesheet and the raw machine record are data, not sentences. */
const prose=html=>textOnly(html.replace(/<details>[\s\S]*?<\/details>/g,""));
const singularFixture=()=>{const result=canonicalFixture();result.source.word_count=1;result.source.character_count=1;result.source.section_count=1;
  result.sections=[{index:0,start_utf16:0,end_utf16:1,word_count:1,raw_score:0.9685,raw_margin:3.6,display_score:"0.969",level:"signal-strongly-ai",band_id:"very_likely_ai",passage:"Word.",evidence:[{id:"section-0-model",kind:"trained_model",summary:"This was the strongest scored section."}]}];
  result.axes.ai_pattern.strongest_section_index=0;result.provenance.protected_facts={count:1,categories:["organisation"]};result.methods=[result.methods[0]];return result;};
const zeroFixture=()=>{const result=canonicalFixture();result.provenance.protected_facts={count:0,categories:[]};return result;};
const receiptFixture=count=>({schema_version:"1.0",contract_version:"1.0.0",product_version:"0.2.0",receipt_id:"receipt_local001",
  source:{content_hash:"sha256:"+"a".repeat(64),word_count:count,character_count:count,section_count:count},
  provenance:{protected_facts:{count,categories:count===1?["organisation"]:[]}},
  methods:count===1?[{id:"unicode.invisible",status:"pass",provider_or_method:"Invisible character scan",limitations:["Absence is not evidence of human authorship."]}]:[],
  limitations:["This receipt does not prove human authorship."]});

test("every count-bearing sentence agrees with its count, at one, at many and at zero",()=>{
  const one=singularFixture(),many=canonicalFixture(),none=zeroFixture();

  const oneHtml=render(one,"html"),oneProse=prose(oneHtml);
  assert.match(oneProse,/1 protected item was identified and left untouched\./);
  assert.match(oneProse,/Category: Organisation\./);
  assert.match(oneHtml,/<dd>1 word<\/dd>/);assert.match(oneHtml,/<dd>1 section<\/dd>/);
  assert.match(oneProse,/1 named check in this run/);
  assertAgrees(oneProse,"shared report at one");

  const oneText=render(one,"text");
  assert.match(oneText,/Draft size {9}1 word · 1 character · 1 section\b/);
  assert.match(oneText,/1 protected item was identified and left untouched\./);
  assert.match(oneText,/Category: organisation\./);
  assert.match(oneText,/1 named check ran\. It is recorded with/);
  assertAgrees(oneText,"terminal summary at one");

  const manyText=render(many,"text");
  assert.match(manyText,/Draft size {9}120 words · 120 characters · 2 sections\b/);
  assert.match(manyText,/3 protected items were identified and left untouched\./);
  assert.match(manyText,/Categories: organisation, date, link\./);
  assertAgrees(manyText,"terminal summary at many");
  assertAgrees(prose(render(many,"html")),"shared report at many");

  const noneText=render(none,"text");
  assert.match(noneText,/No protected items were identified in this draft\./);
  assertAgrees(noneText,"terminal summary at zero");
  const noneProse=prose(render(none,"html"));
  assert.match(noneProse,/No categories were recorded\./);
  assertAgrees(noneProse,"shared report at zero");
});

test("the local fallback report and its summary agree with their counts too",()=>{
  const one=prose(render(receiptFixture(1),"html"));
  assert.match(one,/1 protected item was identified and left untouched\./);
  assert.match(one,/Category: organisation\./);
  assert.match(one,/Draft size\s+1 word · 1 character · 1 section\b/);
  assert.match(one,/1 named check ran in this run\. It is recorded with/);
  assertAgrees(one,"fallback report at one");

  const none=prose(render(receiptFixture(0),"html"));
  assert.match(none,/No protected items were identified in this draft\./);
  assert.match(none,/No categories were recorded\./);
  assert.match(none,/Draft size\s+0 words · 0 characters · 0 sections\b/);
  assertAgrees(none,"fallback report at zero");

  const many=prose(render(receiptFixture(4),"html"));
  assert.match(many,/4 protected items were identified and left untouched\./);
  assertAgrees(many,"fallback report at many");

  assertAgrees(render({schema_version:"1.0",candidates:[{path:"a.txt",gates:[{id:"g1",status:"fail"}]},{path:"b.txt",gates:[{id:"g1",status:"fail"},{id:"g2",status:"fail"}]}]},"text"),"candidate summary");
});

/**
 * A section whose passage is long enough for every meter to be drawn. The passage is the one
 * `shared/presentation/test/fixtures.mjs` uses for its own `long-passage` fixture, so the CLI and
 * the shared renderer are measured on the same words. Vocabulary variety needs 100 words before it
 * can be computed honestly, which is why the canonical fixture deliberately shows no meters.
 */
const longPassageFixture=()=>{const fixture=canonicalFixture();
  fixture.sections[0].passage="Ask someone what COPD stands for and you will often get a blank look. It is sitting quietly in the background of more households than most people realise. Chronic obstructive pulmonary disease is now the second most common lung condition in the country. Around one and a quarter million people live with a diagnosis today. The condition narrows the airways and makes every breath harder than it should be. Smoking remains the largest single cause, though it is far from the only one. Air quality, occupational dust and inherited factors all play a measurable part in who develops it. Diagnosis often arrives late, after years of a cough that everyone had dismissed as ordinary. Treatment started early slows the decline in lung function considerably, which is why the delay matters so much. Pulmonary rehabilitation, inhaled medicines and stopping smoking are the three things that change the outlook.";
  fixture.sections[0].word_count=160;return fixture;};

test("the printable report carries the shared hero legend as its own row",()=>{const html=render(canonicalFixture(),"html");
  assert.match(html,/<ul class="oaci-gauge-legend" aria-label="The five bands of the scale, from likely human to strongly AI">/);
  assert.match(html,/\.oaci-gauge-legend\{grid-row:2;grid-column:1\/-1;/);
  // The legend is emitted after the verdict copy, not inside the dial's own box.
  assert.ok(html.indexOf("oaci-gauge-legend\" aria-label")>html.indexOf("oaci-verdict-strongest"),"the legend must follow the verdict copy");
  assert.doesNotMatch(html,/<figcaption/);});

test("the printable report measures the signals it can read on a long passage",()=>{const html=render(longPassageFixture(),"html"),words=textOnly(html);
  assert.match(html,/<h2 id="oaci-part-measured">What the model measured<\/h2>/);
  assert.match(html,/data-oaci-measured="3"/);
  for(const signal of ["adjacent_overlap","vocabulary_variety","sentence_length_cv"])assert.match(html,new RegExp(`data-oaci-signal="${signal}"`));
  assert.match(words,/Word re-use between neighbouring sentences/);assert.match(words,/typical AI ~2\.1%/);assert.match(words,/typical human ~6\.3%/);
  assert.match(words,/Vocabulary variety across the passage/);assert.match(words,/typical AI ~0\.776/);assert.match(words,/typical human ~0\.694/);
  assert.match(words,/Sentence-length evenness/);assert.match(html,/data-oaci-signal="sentence_length_cv" data-oaci-informative="false"/);
  assert.match(words,/AUROC 0\.521 against 0\.500 for chance/);
  // The evenness meter is drawn with no reference markers, because none was measured.
  const evenness=html.slice(html.indexOf('data-oaci-signal="sentence_length_cv"'));
  assert.doesNotMatch(evenness.slice(0,evenness.indexOf("</div></div>")),/typical AI ~|typical human ~/);
  assert.match(words,/Why it reads this way/);assert.match(words,/They did not set the reading/);
  // Still one self-contained document with no request of any kind.
  assert.doesNotMatch(html,/<script|<iframe|<img|<link|@import|\ssrc=/);
  assert.equal((html.match(/<style>/g)??[]).length,1);
  for(const url of html.match(/https?:\/\/[^"'\s<]+/g)??[])assert.ok(url.startsWith("https://opace.agency/"),`unexpected outbound destination ${url}`);});

test("the terminal summary lists the measured signals per section in words",()=>{const text=render(longPassageFixture(),"text");
  assert.match(text,/\nWhat the model measured\n/);
  assert.match(text,/Section 1 of 2 — Likely AI/);
  assert.match(text,/Word re-use between neighbouring sentences: this passage [\d.]+%; typical AI\s+about 2\.1%, typical human about 6\.3% \(AUROC 0\.912\)/);
  assert.match(text,/Vocabulary variety across the passage: this passage 0\.772; typical AI\s+about 0\.776, typical human about 0\.694 \(AUROC 0\.911\)/);
  assert.match(text,/Sentence-length evenness: this passage [\d.]+; no typical-AI or\s+typical-human marker, because none was measured \(AUROC 0\.521 against\s+0\.500 for chance\)/);
  assert.match(text,/They did not set the reading/);
  // Section 2's passage is one sentence, so it is left out rather than measured badly.
  assert.doesNotMatch(text,/Section 2 of 2 — Strongly AI/);
  // Every line of the measured block stays inside 80 columns.
  const block=text.slice(text.indexOf("\nWhat the model measured\n"),text.indexOf("\nThree independent readings"));
  for(const line of block.split("\n"))assert.ok(line.length<=80,`line over 80 columns: ${line}`);});

test("a canonical result with no measurable passage shows no measured block at all",()=>{const fixture=canonicalFixture();
  const html=render(fixture,"html"),text=render(fixture,"text");
  assert.doesNotMatch(html,/What the model measured/);assert.doesNotMatch(text,/What the model measured/);
  assert.doesNotMatch(html,/oaci-measure/);});
