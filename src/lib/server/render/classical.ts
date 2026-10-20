import { templateStyleSchema, type TemplateStyle } from '$lib/domain/style';
import { createHash } from 'node:crypto';
import { compositionDocumentSchema, type CompositionDocument } from '$lib/domain/library';
import { CLASSICAL_PAGE_LIMIT, CLASSICAL_VERSION, renderClassicalSource } from '$lib/render/classical';
import { fontsFor } from './fonts';
import { renderPdf, withPrintPage } from './pdf';
import { paginateClassicalDocument } from './paginate';

export class PageLimitError extends Error {}
export async function buildClassicalLayout(document: CompositionDocument, style: TemplateStyle = {}) {
 const validated=compositionDocumentSchema.parse(document);
 if(JSON.stringify(validated).length>500000)throw new Error('This CV is too large to preview. Shorten its content.');
 const source=renderClassicalSource(validated,fontsFor('classic','embedded',style.font).fontCss,style);
 return withPrintPage(source,async page=>{
  const analysis=await page.evaluate(paginateClassicalDocument, CLASSICAL_PAGE_LIMIT);
  return {analysis,html:await page.content()};
 });
}
type Layout=Awaited<ReturnType<typeof buildClassicalLayout>> & {revision:string};
const cache=new Map<string,{until:number;result:Promise<Layout>}>();
export function compositionLayout(ownerId:string,document:CompositionDocument, input: TemplateStyle = {}):Promise<Layout>{
 const style=templateStyleSchema.parse(input);
 const revision=createHash('sha256').update(CLASSICAL_VERSION+JSON.stringify([document,style])).digest('hex');
 const key=`${ownerId}:${revision}`,now=Date.now();
 for(const [key,value] of cache)if(value.until<=now)cache.delete(key);
 const existing=cache.get(key);if(existing)return existing.result;
 if(cache.size>=10)cache.delete(cache.keys().next().value!);
 const result=buildClassicalLayout(document,style).then(layout=>({...layout,revision})).catch(error=>{cache.delete(key);throw error;});
 cache.set(key,{until:now+60000,result});return result;
}
export function requireTwoPages(layout:Awaited<ReturnType<typeof buildClassicalLayout>>) {
 if(!layout.analysis.withinLimit)throw new PageLimitError(layout.analysis.pageCount>CLASSICAL_PAGE_LIMIT?`This CV is ${layout.analysis.pageCount} pages. Shorten it to two pages before exporting.`:'Some content exceeds the page width. Correct the layout before exporting.');
}
export async function classicalPDF(layout:Awaited<ReturnType<typeof buildClassicalLayout>>){requireTwoPages(layout);return renderPdf(layout.html);}
