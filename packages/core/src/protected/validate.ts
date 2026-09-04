import type { GateResult, ProtectedSpan } from "@opacedev/ai-content-checker-contracts";

export function validateProtected(source:string,candidate:string,spans:ProtectedSpan[]):GateResult {
  const failures:Array<Record<string,unknown>>=[];
  for(const span of spans){const count=(candidate.split(span.text).length-1);if(count===0)failures.push({protected_span_id:span.id,expected_hash:span.content_hash,observed:"missing"});else if(count>source.split(span.text).length-1)failures.push({protected_span_id:span.id,expected_hash:span.content_hash,observed:"duplicated"});}
  return {id:"protected_spans.exact",version:"1.0.0",status:failures.length?"fail":"pass",hard:true,summary:failures.length?`${failures.length} protected item(s) changed`:"Protected items remain present",failures,limitations:[]};
}

export function validateAdditions(source:string,candidate:string):GateResult {
  const pattern=/https?:\/\/[^\s<>)\]]+|```[\s\S]*?```|`[^`\n]+`|\[[0-9]+\]|[“"][^”"\n]+[”"]/g;
  const original=new Set(source.match(pattern)??[]);const added=(candidate.match(pattern)??[]).filter(x=>!original.has(x));
  return {id:"unsupported_additions",version:"1.0.0",status:added.length?"fail":"pass",hard:true,summary:added.length?`${added.length} unsupported reference(s) added`:"No unsupported URLs, citations, quotations or code added",failures:added.map(observed=>({observed})),limitations:[]};
}
