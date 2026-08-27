import test from "node:test";import assert from "node:assert/strict";
import {extractProtectedSpans,validateCandidate,inspectUnicode,previewSafeFixes,diff,prefixedSha256} from "../../../packages/core/dist/index.js";
const source="Opace quoted £1,250 on 26 August 2026. See https://opace.agency/.";
test("protected extraction is stable and candidate damage fails hard",()=>{const spans=extractProtectedSpans({content:source,content_hash:prefixedSha256(source)},{configured_terms:[{text:"Opace",kind:"organisation"}]});assert.ok(spans.some(x=>x.kind==="organisation"));assert.ok(spans.some(x=>x.kind==="url"));assert.ok(spans.every(x=>x.end_utf16>x.start_utf16));const gates=validateCandidate({content:source,content_hash:prefixedSha256(source),content_type:"plain_text",language:"en-GB"},"Opace quoted £1,300. See https://evil.test/.",spans,{mode:"strict"});assert.ok(gates.some(x=>x.hard&&x.status==="fail"));assert.equal(gates.find(x=>x.id==="semantic_entailment").status,"not_configured");});
const auditFacts='Dr Sarah Chen of Opace Ltd reported revenue of £1.2 million on 14 March 2026, a rise of 8.5%. See https://opace.agency/report and email sarah.chen@opace.co.uk. "Quality is not negotiable," she said (Chen et al., 2025). Run `npm install @opace/core` at 09:30 GMT. The fee is $400 or 350 EUR per 10 kg.';
test("audit fact text yields name, organisation and citation alongside existing kinds",()=>{
  const spans=extractProtectedSpans({content:auditFacts,content_hash:prefixedSha256(auditFacts)});
  const byKind=kind=>spans.filter(x=>x.kind===kind).map(x=>x.text);
  assert.deepEqual(byKind("name"),["Dr Sarah Chen"]);
  assert.deepEqual(byKind("organisation"),["Opace Ltd"]);
  assert.deepEqual(byKind("citation"),["(Chen et al., 2025)"]);
  for(const kind of ["currency","number","date","url","email","quote","code","time","unit"])assert.ok(byKind(kind).length,`missing kind ${kind}`);
  for(const span of spans){assert.equal(auditFacts.slice(span.start_utf16,span.end_utf16),span.text);assert.notEqual(span.text,"Run");assert.notEqual(span.text,"The");}
  assert.ok(!spans.some(x=>x.kind==="name"&&/\b(?:Run|The|See)\b/.test(x.text)),"sentence-start capitals must not be flagged as names");
  assert.deepEqual(spans,extractProtectedSpans({content:auditFacts,content_hash:prefixedSha256(auditFacts)}),"extraction must be deterministic");
});
test("safe-fix preview never alters protected spans in the audit fact text",()=>{
  const text=auditFacts+"\u200b";
  const findings=inspectUnicode(text);assert.ok(findings.length,"expected an invisible-character finding");
  const spans=extractProtectedSpans({content:text,content_hash:prefixedSha256(text)});
  const preview=previewSafeFixes(text,findings,findings.map(x=>x.id),spans);
  assert.equal(text,auditFacts+"\u200b","source must be untouched");
  for(const span of spans)assert.equal(preview.candidate.slice(span.start_utf16,span.end_utf16),span.text,`protected span altered: ${span.kind} ${span.text}`);
});
test("safe fixes are selected, preview-only and protected-span safe",()=>{const text="A\u200b B\u00a0C";const findings=inspectUnicode(text);const protectedSpans=extractProtectedSpans({content:text,content_hash:prefixedSha256(text)},{user_spans:[{start_utf16:1,end_utf16:2}]});const preview=previewSafeFixes(text,findings,findings.map(x=>x.id),protectedSpans);assert.equal(text,"A\u200b B\u00a0C");assert.equal(preview.candidate,"A\u200b B C");assert.ok(preview.skipped.some(x=>x.reason==="protected_span"));});
test("bounded diff reconstructs source and candidate",()=>{const source="one two three",candidate="one four three";const d=diff(source,candidate);assert.equal(d.segments.filter(x=>x.type!=="insert").map(x=>x.text).join(""),source);assert.equal(d.segments.filter(x=>x.type!=="delete").map(x=>x.text).join(""),candidate);assert.equal(d.fallback,false);assert.equal(diff("x ".repeat(2000),"y ".repeat(2000)).fallback,true);});
test("diff reconstructs insert, delete and replace boundaries",()=>{for(const [source,candidate] of [["abc","x abc"],["abc","abc x"],["a b","a x b"],["x abc","abc"],["abc x","abc"],["a x b","a b"],["old middle end","new middle end"],["start old end","start new end"],["start old","start new"],["Price £10.","Price changed."],["😀 alpha","😀 beta"],["","text"],["text",""],["",""]]){const value=diff(source,candidate);assert.equal(value.segments.filter(item=>item.type!=="insert").map(item=>item.text).join(""),source,`source: ${source} -> ${candidate}`);assert.equal(value.segments.filter(item=>item.type!=="delete").map(item=>item.text).join(""),candidate,`candidate: ${source} -> ${candidate}`);for(const segment of value.segments)assert.equal(typeof segment.text,"string");}});
test("large fallback reconstructs empty and changed sides without empty segments",()=>{for(const [source,candidate] of [["x".repeat(80001),""],["","y".repeat(80001)],["x".repeat(40001),"y".repeat(40000)]]){const value=diff(source,candidate);assert.equal(value.fallback,true);assert.equal(value.segments.filter(item=>item.type!=="insert").map(item=>item.text).join(""),source);assert.equal(value.segments.filter(item=>item.type!=="delete").map(item=>item.text).join(""),candidate);assert.ok(value.segments.every(item=>item.text.length>0));}});
