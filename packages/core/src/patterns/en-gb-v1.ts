import type { PatternFinding } from "@opacedev/ai-content-checker-contracts";
import { alignUtf16Range, rangeFromUtf16 } from "../source/offsets.js";
import { prefixedSha256 } from "../source/utf8.js";
import { inspectSignalsV2 } from "./en-signals-v2.js";

export { inspectSignalsV2, computeEditorialSignals, EN_SIGNALS_PATTERN_VERSION, type EditorialSignalsResult, type SignalsClassification } from "./en-signals-v2.js";

export const EN_GB_PATTERN_VERSION = "en-gb:2026.08.1";
const PHRASES = ["in today's rapidly evolving landscape","game-changer","in conclusion","it is important to note","delve into"];

// A rule's match length is measured on a lower-cased or trimmed copy of the
// line, so the end boundary can land inside a surrogate pair when the match
// runs up to an emoji (arena texts open list lines with one). Align the span
// outward to whole code points BEFORE slicing, so the recorded offsets, the
// evidence text and `matched_text_hash` all describe the same characters.
const finding=(text:string,start:number,rule:string,severity:PatternFinding["severity"],message:string,suggestion:string,evidence:Record<string,unknown>):PatternFinding=>{
  const raw=evidence.matched===undefined?text.slice(start,start+1):String(evidence.matched);
  const [alignedStart,alignedEnd]=alignUtf16Range(text,start,start+raw.length);
  const matched=evidence.matched===undefined?undefined:text.slice(alignedStart,alignedEnd);
  return {rule_id:rule,rule_version:EN_GB_PATTERN_VERSION,severity,message,suggestion,span:rangeFromUtf16(text,alignedStart,alignedEnd),matched_text_hash:prefixedSha256(matched??""),evidence:matched===undefined?evidence:{...evidence,matched}};
};

// Combined entry point: en-gb v1 rules plus the en-signals v2 pack adapted
// from the MIT `avoid-ai-writing` engine (see en-signals-v2.ts). A v2 finding
// whose span exactly duplicates a v1 finding's span is dropped so the same
// phrase is not reported twice.
export function inspectPatterns(text:string):PatternFinding[]{
  const v1=inspectPatternsV1(text);
  const v1Spans=new Set(v1.map(f=>`${f.span.start_utf16}:${f.span.end_utf16}`));
  const v2=inspectSignalsV2(text).filter(f=>!v1Spans.has(`${f.span.start_utf16}:${f.span.end_utf16}`));
  return [...v1,...v2].sort((a,b)=>a.span.start_utf16-b.span.start_utf16||a.rule_id.localeCompare(b.rule_id));
}

function inspectPatternsV1(text:string):PatternFinding[]{
  const findings:PatternFinding[]=[];const lower=text.toLocaleLowerCase("en-GB");
  for(const phrase of PHRASES){let at=0,count=0;while((at=lower.indexOf(phrase,at))>=0){count++;at+=phrase.length;}if(count>=1){const start=lower.indexOf(phrase);findings.push(finding(text,start,"style.overused_phrase",count>1?"medium":"low","A stock phrase may make the passage feel generic.","Review whether a more specific statement would be clearer.",{matched:text.slice(start,start+phrase.length),count,threshold:1}));}}
  const sentences=text.split(/(?<=[.!?])\s+/).filter(Boolean);const openings=new Map<string,number[]>();let cursor=0;
  for(const sentence of sentences){const start=text.indexOf(sentence,cursor);cursor=start+sentence.length;const opening=sentence.trim().split(/\s+/).slice(0,3).join(" ").toLocaleLowerCase("en-GB");if(opening.split(" ").length>=2)(openings.get(opening)??(openings.set(opening,[]),openings.get(opening)!)).push(start);}
  for(const [opening,starts] of openings)if(starts.length>=3)findings.push(finding(text,starts[0]!,"style.repeated_opening","medium","Several sentences begin the same way.","Vary only the openings that genuinely benefit from it.",{matched:text.slice(starts[0]!,starts[0]!+opening.length),count:starts.length,threshold:3}));
  const transitions=(lower.match(/\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b/g)??[]).length;const wordCount=text.trim()?text.trim().split(/\s+/).length:0;
  if(wordCount>=40&&transitions/wordCount>0.04){const m=/\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b/i.exec(text)!;findings.push(finding(text,m.index,"style.transition_density","low","Transition words are unusually dense.","Remove transitions that do not clarify the relationship between sentences.",{matched:m[0],count:transitions,word_count:wordCount,threshold_ratio:0.04}));}
  return findings.sort((a,b)=>a.span.start_utf16-b.span.start_utf16||a.rule_id.localeCompare(b.rule_id));
}

export interface PatternPack {id:string;version:string;rules:readonly string[];inspect(text:string):PatternFinding[]}
const packs=new Map<string,PatternPack>();
export function registerPatternPack(pack:PatternPack):()=>void {if(!/^[a-z][a-z0-9.-]+$/.test(pack.id)||!pack.version||!pack.rules.length)throw new Error("invalid_pattern_pack");if(packs.has(pack.id))throw new Error("duplicate_pattern_pack");const frozen=Object.freeze({...pack,rules:Object.freeze([...pack.rules])});packs.set(pack.id,frozen);return()=>{if(packs.get(pack.id)===frozen)packs.delete(pack.id);};}
export const runRegisteredPacks=(text:string)=>[...packs.values()].flatMap(pack=>pack.inspect(text));
