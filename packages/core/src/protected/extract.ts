import type { ProtectedSpan } from "@opace/content-integrity-contracts";
import { rangeFromUtf16 } from "../source/offsets.js";
import { prefixedSha256 } from "../source/utf8.js";

type Source = {content:string;content_hash?:string};
type Policy = {configured_terms?:Array<{text:string;kind?:"name"|"organisation"}>;user_spans?:Array<{start_utf16:number;end_utf16:number}>};
const RULES:Array<[ProtectedSpan["kind"],RegExp]> = [
  ["code",/```[\s\S]*?```|`[^`\n]+`/g], ["url",/https?:\/\/[^\s<>)\]]+/g], ["email",/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["citation",/\[[0-9]+\]|\((?:[A-Z][A-Za-z-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z-]+)*(?:\s+et al\.)?),?\s+\d{4}[a-z]?\)|\b[A-Z][A-Za-z-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z-]+)*\s+et al\.,?\s*\(?\d{4}[a-z]?\)?/g], ["quote",/[“"][^”"\n]+[”"]/g],
  ["currency",/(?:£|\$|€)\s?\d[\d,]*(?:\.\d+)?/g], ["date",/\b(?:\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g],
  ["time",/\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/gi], ["unit",/\b\d+(?:\.\d+)?\s?(?:kg|g|km|m|cm|mm|GB|MB|%|°C)\b/g], ["number",/\b\d[\d,]*(?:\.\d+)?%?\b/g]
];

// Deterministic, precision-first entity rules. It is acceptable to miss a name; it is not acceptable to flag ordinary sentence-start words.
const HONORIFIC_NAME=/\b(?:Dr|Mr|Mrs|Ms|Prof|Sir|Dame)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}/g;
const NAME_RUN=/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;
const ORG_SUFFIXED=/\b(?:[A-Z][A-Za-z&.'-]*\s+){1,5}(?:Ltd\.?|Limited|LLC|Inc\.?|plc|GmbH|&\s?Co\.?|Agency|Council|University)(?!\w)/g;
const ORG_ACRONYM=/\b[A-Z]{2,6}(?:\.[A-Z]{2,6})*\b/g;
const NAME_STOPLIST=new Set("The A An This That These Those It He She They We You I In On At For To From With By Of And But Or Nor If As Is Are Was Were Be Been Not No Yes See Run New Our Your Their His Her Its My Do Does Did Will Would Can Could Should May Might Must Have Has Had So Then There Here What Which Who Whose When Where Why How All Any Each Per Both More Most Some Such Other Also Just Only Now Today Yesterday Tomorrow Please Note".split(" "));
const ACRONYM_STOPLIST=new Set(["AM","PM","GMT","UTC","BST","CET","CEST","EST","EDT","PST","PDT","EUR","USD","GBP","JPY","CHF","AI","IT","TV","OK","PS","NB","ID","IP","FAQ","API","URL","URI","HTML","CSS","SQL","PDF","HTTP","HTTPS","VAT","ASAP","DIY","CEO","CTO","CFO","COO","UK","EU","US","USA","RSVP","ETA","FYI","QA","DNA","GPS","SMS"]);
function atSentenceStart(content:string,index:number):boolean{const before=content.slice(0,index).replace(/[\s"“”'‘’(\[]+$/,"");return before===""||/[.!?:;…]$/.test(before);}
function extractEntitySpans(content:string):Array<{kind:"name"|"organisation";text:string;start:number}>{
  const found:Array<{kind:"name"|"organisation";text:string;start:number}>=[];
  const overlaps=(start:number,end:number)=>found.some(x=>start<x.start+x.text.length&&x.start<end);
  for(const m of content.matchAll(ORG_SUFFIXED)){
    let text=m[0],start=m.index!;
    for(;;){const lead=/^([A-Z][A-Za-z&.'-]*)\s+/.exec(text);if(lead&&NAME_STOPLIST.has(lead[1]!)){start+=lead[0].length;text=text.slice(lead[0].length);}else break;}
    if(/\s/.test(text))found.push({kind:"organisation",text,start});
  }
  for(const m of content.matchAll(ORG_ACRONYM)){if(!ACRONYM_STOPLIST.has(m[0])&&!overlaps(m.index!,m.index!+m[0].length))found.push({kind:"organisation",text:m[0],start:m.index!});}
  for(const m of content.matchAll(HONORIFIC_NAME)){if(!overlaps(m.index!,m.index!+m[0].length))found.push({kind:"name",text:m[0],start:m.index!});}
  for(const m of content.matchAll(NAME_RUN)){
    if(atSentenceStart(content,m.index!)||overlaps(m.index!,m.index!+m[0].length))continue;
    if(m[0].split(/\s+/).some(token=>NAME_STOPLIST.has(token)))continue;
    found.push({kind:"name",text:m[0],start:m.index!});
  }
  return found;
}

export function extractProtectedSpans(source:Source,policy:Policy={}):ProtectedSpan[]{
  const hash=source.content_hash ?? prefixedSha256(source.content); const spans:ProtectedSpan[]=[];
  const add=(text:string,start:number,kind:ProtectedSpan["kind"],origin:ProtectedSpan["source"],protection:ProtectedSpan["policy"]="exact")=>{const r=rangeFromUtf16(source.content,start,start+text.length);spans.push({id:`ps_${kind}_${start}_${prefixedSha256(text).slice(7,15)}`,kind,text,...r,normalised_value:text,policy:protection,source:origin,confidence:null,content_hash:hash});};
  for(const [kind,regex] of RULES){regex.lastIndex=0;for(const m of source.content.matchAll(regex))add(m[0],m.index!,kind,"deterministic",kind==="date"||kind==="number"?"equivalent_format":"exact");}
  for(const entity of extractEntitySpans(source.content))add(entity.text,entity.start,entity.kind,"deterministic");
  for(const term of policy.configured_terms??[]){let at=0;while((at=source.content.indexOf(term.text,at))>=0){add(term.text,at,term.kind??"name","user");at+=term.text.length;}}
  for(const selected of policy.user_spans??[])add(source.content.slice(selected.start_utf16,selected.end_utf16),selected.start_utf16,"user_selected","user");
  const unique=new Map<string,ProtectedSpan>();for(const span of spans)unique.set(`${span.start_utf16}:${span.end_utf16}:${span.kind}:${span.policy}`,span);
  return [...unique.values()].sort((a,b)=>a.start_utf16-b.start_utf16||(b.end_utf16-b.start_utf16)-(a.end_utf16-a.start_utf16)||a.id.localeCompare(b.id));
}
