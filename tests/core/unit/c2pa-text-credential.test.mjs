import test from "node:test";import assert from "node:assert/strict";
import {inspectUnicode,previewSafeFixes,detectC2paTextCredentials} from "../../../packages/core/dist/index.js";

// C2PA 2.4 §A.8.3.1 byteToVariationSelector, written from the specification rather than from the engine.
const byteToVariationSelector=byte=>String.fromCodePoint(byte<=15?0xfe00+byte:0xe0100+(byte-16));
// §A.8.2.2 wrapper: 8-byte magic "C2PATXT\0", 1-byte version, 4-byte big-endian manifestLength, then the store.
// §A.8.4.1 — a single U+FEFF sentinel prefixes the wrapper.
function encodeCredential(manifestBytes,version=1){
  const header=[0x43,0x32,0x50,0x41,0x54,0x58,0x54,0x00,version,
    (manifestBytes.length>>>24)&0xff,(manifestBytes.length>>>16)&0xff,(manifestBytes.length>>>8)&0xff,manifestBytes.length&0xff];
  return "﻿"+[...header,...manifestBytes].map(byteToVariationSelector).join("");
}
// A JUMBF-shaped payload: box length, "jumb" type, then bytes spanning both carrier ranges.
const manifest=[0x00,0x00,0x00,0x25,0x6a,0x75,0x6d,0x62,...Array.from({length:29},(_,i)=>(i*7+3)&0xff)];
const credential=encodeCredential(manifest);
const draft="Opace published this draft on 29 August 2026 and signed it.";
const atEnd=draft+credential;
const atStart=credential+draft;
// The selection the Chrome extension, the WordPress plugin and the Astro toolbar make by default.
const select=findings=>findings.filter(item=>item.fix!=="review").map(item=>item.id);
const carrierCodePoints=Array.from(credential).length;

test("a real C2PA text credential round-trips through the default safe fix, at either end of the draft",()=>{
  for(const [where,text] of [["end",atEnd],["start",atStart]]){
    const before=detectC2paTextCredentials(text);
    assert.equal(before.length,1,where);
    assert.equal(before[0].version,1);
    assert.equal(before[0].manifest_length,manifest.length);
    assert.equal(before[0].status,"ok");
    const findings=inspectUnicode(text);
    const removable=select(findings);
    assert.ok(removable.length>0,`${where}: the credential's low bytes must still be flagged as removable`);
    const preview=previewSafeFixes(text,findings,removable);
    // The credential still parses afterwards. That, not character survival, is the test that matters.
    assert.deepEqual(detectC2paTextCredentials(preview.candidate),before,`${where}: the credential must still read back as valid`);
    assert.equal(preview.candidate,text,`${where}: the credentialled draft must survive byte for byte`);
    assert.equal(preview.applied_finding_ids.length,0,`${where}: nothing may be edited`);
    assert.ok(preview.skipped.some(item=>item.reason==="c2pa_text_credential"),`${where}: the skip must be reported`);
    // Every removable finding is accounted for, and only the sentinel may be held for another reason.
    const held=new Set(preview.skipped.filter(item=>item.reason==="c2pa_text_credential").map(item=>item.id));
    const bom=preview.skipped.filter(item=>item.reason==="invalid_bom_position");
    assert.equal(held.size+bom.length,removable.length,`${where}: every removable finding must be held back`);
    assert.equal(bom.length,where==="end"?1:0,`${where}: the pre-existing BOM-position guard only fires off index 0`);
  }
});

test("detection is unchanged: every carrier code point is still found, counted and reported",()=>{
  const findings=inspectUnicode(atStart);
  const carriers=findings.filter(item=>item.span.start_utf16<credential.length);
  assert.equal(carriers.length,carrierCodePoints,"one finding per carrier code point, sentinel included");
  assert.equal(carrierCodePoints,1+13+manifest.length);
  assert.ok(carriers.some(item=>item.code_point==="U+FEFF"));
  assert.ok(carriers.some(item=>item.fix==="remove"),"low bytes are still flagged as removable");
  assert.ok(carriers.some(item=>item.fix==="review"),"supplementary selectors are still flagged for review");
});

test("with allow_c2pa_credential_removal the removal happens and is reported",()=>{
  const findings=inspectUnicode(atStart);
  const removable=select(findings);
  const preview=previewSafeFixes(atStart,findings,removable,[],{allow_c2pa_credential_removal:true});
  assert.equal(preview.applied_finding_ids.length,removable.length,"every selected finding is applied when removal is allowed");
  assert.notEqual(preview.candidate,atStart);
  assert.equal(preview.skipped.filter(item=>item.reason==="c2pa_text_credential").length,0);
  assert.deepEqual(detectC2paTextCredentials(preview.candidate),[],"the deliberate path still destroys the credential");
});

test("an ordinary draft with no credential cleans exactly as before",()=>{
  const text="Opace​ quoted a fee.‍ Done. Sent.";
  const findings=inspectUnicode(text);
  const removable=select(findings);
  const preview=previewSafeFixes(text,findings,removable);
  assert.deepEqual(detectC2paTextCredentials(text),[]);
  assert.equal(preview.candidate,"Opace quoted a fee. Done. Sent.");
  assert.equal(preview.applied_finding_ids.length,removable.length);
  assert.equal(preview.skipped.filter(item=>item.reason==="c2pa_text_credential").length,0);
});

test("hostile carriers adjacent to a credential are removed while the credential is held back",()=>{
  // A zero-width space and tag characters immediately before and after the wrapper.
  const before="​\u{e0041}\u{e0042}",after="\u{e0043}​";
  const text=draft+before+credential+after;
  const findings=inspectUnicode(text);
  const removable=select(findings);
  const preview=previewSafeFixes(text,findings,removable);
  assert.equal(preview.candidate,draft+credential,"the hostile carriers go, the credential stays");
  assert.equal(preview.applied_finding_ids.length,5,"two zero-width spaces and three tag characters");
  const credentials=detectC2paTextCredentials(preview.candidate);
  assert.equal(credentials.length,1);
  assert.equal(credentials[0].status,"ok");
  assert.equal(credentials[0].manifest_length,manifest.length);
  const held=preview.skipped.filter(item=>item.reason==="c2pa_text_credential").length;
  const bom=preview.skipped.filter(item=>item.reason==="invalid_bom_position").length;
  assert.equal(held+bom+5,removable.length,"nothing removable is unaccounted for");
  assert.ok(held>0);
});
