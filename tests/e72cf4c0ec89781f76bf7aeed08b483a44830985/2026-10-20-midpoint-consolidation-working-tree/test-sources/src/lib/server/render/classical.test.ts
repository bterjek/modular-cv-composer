import { afterAll, describe, expect, it } from 'vitest';
import { extractText, getDocumentProxy } from 'unpdf';
import { existsSync } from 'node:fs';
import { buildClassicalLayout, classicalPDF, requireTwoPages, PageLimitError } from './classical';
import { closePdfBrowser, withPrintPage } from './pdf';
import type { CompositionDocument } from '$lib/domain/library';
const hasChromium=existsSync(process.env.CHROMIUM_PATH??'/usr/bin/chromium');
afterAll(()=>closePdfBrowser());
function cv(bullets:number):CompositionDocument {
 return {version:1,profile:{fullName:'Őrs Łukasz Tester',email:'tester@example.com',phone:'+36 20 123 4567',location:'Győr, Hungary',links:[]},sections:[
  {module:'summary',title:'Profile',entries:[{libraryEntryId:null,data:{},variantId:null,text:'Operations and compliance leader with experience in service delivery and governance.',items:[]}]},
  {module:'experience',title:'Experience',entries:Array.from({length:4},(_,role)=>({libraryEntryId:null,data:{title:`Role ${role+1}`,organization:'Example Company',start:'2020-01',end:null},variantId:null,text:'Accountable for reliable service delivery and practical operational governance.',items:Array.from({length:bullets},(_,index)=>({libraryItemId:null,variantId:null,text:`Role ${role+1} achievement ${index+1}: Improved service delivery through clear ownership, measurable controls and effective collaboration across technical teams.`}))}))}
 ]};
}
describe.skipIf(!hasChromium)('measured Classical A4 pagination',()=>{
 it('produces matching two-page HTML and PDF at fixed size with embedded accented text',async()=>{
  const result=await buildClassicalLayout(cv(4));
  expect(result.analysis.pageCount).toBe(2);expect(result.analysis.withinLimit).toBe(true);
  const pdf=await classicalPDF(result);
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)).toHaveLength(2);
  expect(pdf.toString('latin1')).toMatch(/\/MediaBox\s*\[\s*0 0 59[45]\.\d+ 84[12]\.\d+\s*\]/);
  const parsed=await getDocumentProxy(new Uint8Array(pdf));
  try { const extracted=await extractText(parsed,{mergePages:true}); expect(extracted.text).toContain('Őrs Łukasz Tester'); expect(extracted.text).toContain('Experience'); expect(extracted.text).toContain('Role 4 achievement 4'); } finally { await parsed.loadingTask.destroy(); }
  expect(result.html).toContain('Őrs Łukasz Tester');expect(result.html).toContain('Role 4 achievement 4');
  const metrics=await withPrintPage(result.html,page=>page.evaluate(()=>Array.from(document.querySelectorAll<HTMLElement>('.cv-content')).map(body=>({height:body.clientHeight,scroll:body.scrollHeight,width:body.clientWidth,scrollWidth:body.scrollWidth}))));
  expect(metrics.every(page=>page.scroll<=page.height+1&&page.scrollWidth<=page.width+1)).toBe(true);
 });
 it('shows content beyond page two and refuses export rather than shrinking or removing text',async()=>{
  const result=await buildClassicalLayout(cv(16));
  expect(result.analysis.pageCount).toBeGreaterThan(2);expect(result.analysis.withinLimit).toBe(false);
  expect(result.analysis.overflow.length).toBeGreaterThan(0);expect(result.analysis.overflow.every(item=>item.page>2)).toBe(true);
  expect(result.html).toContain('Role 4 achievement 16');
  expect(()=>requireTwoPages(result)).toThrow(PageLimitError);await expect(classicalPDF(result)).rejects.toThrow(PageLimitError);
 });
 it('splits an oversized paragraph without losing any characters, and leaves no orphan section heading',async()=>{
  const longDocument:CompositionDocument={version:1,profile:null,sections:[{module:'summary',title:'Profile',entries:[{libraryEntryId:null,data:{},variantId:null,text:('Árvíztűrő tükörfúrógép. '.repeat(700))+'FINAL_END',items:[]}]}]};
  const result=await buildClassicalLayout(longDocument);
  expect(result.analysis.pageCount).toBeGreaterThan(2);
  const text=await withPrintPage(result.html,page=>page.evaluate(()=>Array.from(document.querySelectorAll('.kind-wording [data-text]')).map(node=>node.textContent).join('')));
  expect(text).toBe(longDocument.sections[0].entries[0].text);
  const lonely=await withPrintPage(result.html,page=>page.evaluate(()=>Array.from(document.querySelectorAll('.cv-content')).some(body=>body.lastElementChild?.getAttribute('data-keep-next')==='true')));
  expect(lonely).toBe(false);
 });
});
