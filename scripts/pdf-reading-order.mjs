import {headingOf} from './cv-headings.mjs';
/**
 * Restore visual order, not PDF drawing order. Side-by-side recognised section
 * headings start column regions; later headings stay within their own column.
 * Every non-whitespace text item is retained. No source text is treated as code.
 * @param {Array<{str?:string;transform?:number[];width?:number;height?:number}>} items
 */
export function pdfPageText(items){
 const tokens=items.flatMap(item=>{if(!item.str?.trim()||!item.transform||item.transform.length!==6)return [];return [{text:item.str.trim(),x:item.transform[4],y:item.transform[5],width:item.width??0,height:Math.abs(item.height??item.transform[3])}];});
 /** @type {Array<{y:number;tokens:typeof tokens}>} */
 const rows=[];
 for(const token of tokens.sort((a,b)=>b.y-a.y||a.x-b.x)){
  const last=rows.at(-1);
  if(last&&Math.abs(last.y-token.y)<=Math.min(2,Math.max(1,token.height*.2)))last.tokens.push(token);
  else rows.push({y:token.y,tokens:[token]});
 }
 const lines=rows.map(row=>{
  /** @type {Array<{text:string;x:number;end:number;height:number}>} */
  const spans=[];
  for(const token of row.tokens.sort((a,b)=>a.x-b.x)){
   const last=spans.at(-1),gap=last?token.x-last.end:Infinity;
   if(last&&gap<=Math.max(18,token.height*2)){
    last.text+=(gap>Math.max(.8,token.height*.12)?' ':'')+token.text;last.end=Math.max(last.end,token.x+token.width);
   }else spans.push({text:token.text,x:token.x,end:token.x+token.width,height:token.height});
  }
  return {...row,spans};
 });
 const output=[];
 for(let index=0;index<lines.length;index++){
  const line=lines[index];const headers=line.spans.filter(span=>headingOf(span.text));
  if(headers.length<2){output.push(line.spans.map(span=>span.text).join(' '));continue;}
  // Do not flatten independent sections (e.g. certificates left, education and
  // languages right) into one stream of alternating rows.
  const columns=headers.map(header=>({header,lines:[header.text]}));
  const boundary=(headers[0].end+headers[1].x)/2;
  const other=line.spans.filter(span=>!headers.includes(span));
  for(const span of other)columns[span.x<boundary?0:columns.length-1].lines.push(span.text);
  for(index++;index<lines.length;index++){
   const next=lines[index];
   // A heading spanning the gutter ends the column region.
   if(next.spans.some(span=>headingOf(span.text)&&span.x<boundary&&span.end>boundary)){index--;break;}
   for(const span of next.spans){
    const column=columns.reduce((best,current)=>Math.abs(current.header.x-span.x)<Math.abs(best.header.x-span.x)?current:best);
    column.lines.push(span.text);
   }
  }
  output.push(...columns.flatMap(column=>column.lines));
 }
 return output.join('\n');
}
