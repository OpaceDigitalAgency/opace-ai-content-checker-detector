import type { ProtectedSpan } from "@opace/content-integrity-contracts";
import type { UnicodeFinding } from "../unicode/inspect.js";
import { diff, type ContentDiff } from "../diff/diff.js";
import { prefixedSha256 } from "../source/utf8.js";
export interface FixPreview {source_hash:string;candidate_hash:string;candidate:string;applied_finding_ids:string[];skipped:Array<{id:string;reason:string}>;diff:ContentDiff}
export function previewSafeFixes(source:string,findings:UnicodeFinding[],selectedFindingIds:string[],protectedSpans:ProtectedSpan[]=[]):FixPreview{
  const selected=new Set(selectedFindingIds),edits:Array<{start:number;end:number,value:string,id:string}>=[],skipped:FixPreview["skipped"]=[];
  for(const f of findings){if(!selected.has(f.id))continue;const raw=source.slice(f.span.start_utf16,f.span.end_utf16);if(!f.id.startsWith("unicode_")||f.span.end_utf16<=f.span.start_utf16||f.matched_text_hash!==prefixedSha256(raw)){skipped.push({id:f.id,reason:"invalid_finding_provenance"});continue;}if(f.code_point==="U+FEFF"&&f.span.start_utf16!==0){skipped.push({id:f.id,reason:"invalid_bom_position"});continue;}if(f.fix==="review"){skipped.push({id:f.id,reason:"user_review"});continue;}if(protectedSpans.some(p=>f.span.start_utf16<p.end_utf16&&f.span.end_utf16>p.start_utf16)){skipped.push({id:f.id,reason:"protected_span"});continue;}if(edits.some(e=>f.span.start_utf16<e.end&&f.span.end_utf16>e.start)){skipped.push({id:f.id,reason:"overlapping_edit"});continue;}edits.push({start:f.span.start_utf16,end:f.span.end_utf16,value:f.fix==="space"?" ":"",id:f.id});}
  edits.sort((a,b)=>b.start-a.start);let candidate=source;for(const e of edits)candidate=candidate.slice(0,e.start)+e.value+candidate.slice(e.end);
  return deepFreeze({source_hash:prefixedSha256(source),candidate_hash:prefixedSha256(candidate),candidate,applied_finding_ids:edits.map(e=>e.id).reverse(),skipped,diff:diff(source,candidate)});
}
function deepFreeze<T>(value:T):T{if(value&&typeof value==="object"&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value as any))deepFreeze(child);}return value;}
