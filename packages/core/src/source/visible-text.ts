export interface SourceMapRun { visible_start_utf16: number; visible_end_utf16: number; source_start_utf16: number; source_end_utf16: number }
export interface VisibleTextProjection { text: string; runs: SourceMapRun[]; limitations: string[] }

const ENTITIES: Record<string,string> = {amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:"\u00a0"};
const decodeEntity = (raw: string) => {if(raw[1]!=="#")return ENTITIES[raw.slice(1,-1)]??raw;const value=raw[2]?.toLowerCase()==="x"?Number.parseInt(raw.slice(3,-1),16):Number.parseInt(raw.slice(2,-1),10);return Number.isInteger(value)&&value>=0&&value<=0x10ffff&&!(value>=0xd800&&value<=0xdfff)?String.fromCodePoint(value):raw;};

export function projectVisibleText(source: string, contentType: "plain_text"|"html"|"markdown"): VisibleTextProjection {
  if (contentType === "plain_text") return {text:source,runs:source ? [{visible_start_utf16:0,visible_end_utf16:source.length,source_start_utf16:0,source_end_utf16:source.length}] : [],limitations:[]};
  if (contentType === "markdown") {
    const text = source.replace(/```[\s\S]*?```/g, m=>m).replace(/!?(\[([^\]]*)\])\(([^)]+)\)/g, (_m,_a,label)=>label).replace(/(^|\s)[*_]{1,3}([^*_]+)[*_]{1,3}/g,"$1$2");
    return {text,runs:text ? [{visible_start_utf16:0,visible_end_utf16:text.length,source_start_utf16:0,source_end_utf16:source.length}] : [],limitations:["Markdown mapping is projection-level; protected extractors retain exact source ranges."]};
  }
  let text="", cursor=0; const runs:SourceMapRun[]=[]; const excluded=/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->/gi;
  const safe=source.replace(excluded,m=>" ".repeat(m.length)); const token=/<[^>]*>|&(?:#x?[0-9a-f]+|[a-z]+);/gi; let match:RegExpExecArray|null;
  const append=(value:string,start:number,end:number)=>{if(!value)return;const v=text.length;text+=value;runs.push({visible_start_utf16:v,visible_end_utf16:text.length,source_start_utf16:start,source_end_utf16:end});};
  while((match=token.exec(safe))){append(safe.slice(cursor,match.index),cursor,match.index);const raw=match[0];if(/^<(br|\/?(?:p|div|section|article|li|h[1-6]|blockquote|tr))\b/i.test(raw))append("\n",match.index,token.lastIndex);else if(raw[0]==="&")append(decodeEntity(raw),match.index,token.lastIndex);cursor=token.lastIndex;} append(safe.slice(cursor),cursor,safe.length);
  return {text,runs,limitations:["HTML projection is deterministic text extraction, not sanitisation."]};
}
