export interface DomSourceRun {text:string;node_path:number[];start_utf16:number;end_utf16:number;visible_start_utf16:number;visible_end_utf16:number}
export interface DomVisibleTextProjection {text:string;runs:DomSourceRun[];limitations:string[]}
const EXCLUDED=new Set(["SCRIPT","STYLE","TEMPLATE","NOSCRIPT"]);
const BLOCKS=new Set(["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DIV","DL","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","TABLE","TR","UL"]);
export function projectDomVisibleText(root:Node):DomVisibleTextProjection{
  let text="";const runs:DomSourceRun[]=[];const pathOf=(node:Node)=>{const path:number[]=[];let current:Node|null=node;while(current&&current!==root){const p:Node|null=current.parentNode;if(!p)break;path.unshift(Array.prototype.indexOf.call(p.childNodes,current));current=p;}return path;};
  const append=(value:string,node:Node,startUtf16:number,endUtf16:number)=>{if(!value)return;const start=text.length;text+=value;runs.push({text:value,node_path:pathOf(node),start_utf16:startUtf16,end_utf16:endUtf16,visible_start_utf16:start,visible_end_utf16:text.length});};
  const separator=(node:Node)=>{if(text&&!text.endsWith("\n"))append("\n",node,0,0);};
  const visit=(node:Node,hidden:boolean)=>{if(node.nodeType===1){const element=node as Element;const excluded=hidden||EXCLUDED.has(element.tagName)||(element as HTMLElement).hidden||element.getAttribute("aria-hidden")==="true";if(excluded)return;if(element.tagName==="BR"){separator(node);return;}const block=BLOCKS.has(element.tagName);if(block)separator(node);for(const child of Array.from(node.childNodes))visit(child,false);if(block)separator(node);return;}if(node.nodeType===3){const value=node.nodeValue??"";append(value,node,0,value.length);return;}for(const child of Array.from(node.childNodes))visit(child,hidden);};
  visit(root,false);text=text.replace(/\n+$/g,"");while(runs.length&&runs.at(-1)!.visible_start_utf16>=text.length)runs.pop();if(runs.length)runs.at(-1)!.visible_end_utf16=Math.min(runs.at(-1)!.visible_end_utf16,text.length);
  return {text,runs,limitations:["Visibility uses hidden and aria-hidden markers; computed CSS visibility is host-dependent."]};
}
