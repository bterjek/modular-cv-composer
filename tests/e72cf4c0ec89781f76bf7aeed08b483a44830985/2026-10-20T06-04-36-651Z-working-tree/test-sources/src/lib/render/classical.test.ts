import { describe, expect, it } from 'vitest';
import { renderClassicalSource } from './classical';
import type { CompositionDocument } from '$lib/domain/library';
const document:CompositionDocument={version:1,profile:{fullName:'Őrs Łukasz Tester',email:'tester@example.com',phone:null,location:'Győr',links:[]},sections:[
 {module:'headline',title:null,entries:[{libraryEntryId:null,data:{},variantId:null,text:'First headline',items:[]},{libraryEntryId:null,data:{},variantId:null,text:'Second headline',items:[]}]},
 {module:'skills',title:'Skills',entries:[{libraryEntryId:null,data:{group:'Core'},variantId:null,text:'Skills context preserved',items:[{libraryItemId:null,variantId:null,text:'ITIL'}]}]},
 {module:'credentials',title:null,entries:[{libraryEntryId:null,data:{name:'Security programme',issuer:'Example',kind:'course',credentialUrl:'https://example.com/verify'},variantId:null,text:'Credential context preserved',items:[]}]},
 {module:'languages',title:null,entries:[{libraryEntryId:null,data:{language:'Hungarian',level:'native'},variantId:null,text:'Language context preserved',items:[]}]}
]};
describe('Classical A4 source',()=>{
 it('preserves all saved wording and facts, including content the old category renderer did not display',()=>{
  const html=renderClassicalSource(document,'');
  for(const text of ['Őrs Łukasz Tester','First headline','Second headline','Skills context preserved','Credential context preserved','Language context preserved','ITIL','Course','https://example.com/verify'])expect(html).toContain(text);
  expect(html.indexOf('First headline')).toBeLessThan(html.indexOf('Second headline'));
  expect(html.indexOf('Second headline')).toBeLessThan(html.indexOf('Skills context preserved'));
  expect(html).toContain('font-size:11pt');expect(html).toContain('18mm 19mm');
 });
 it('escapes source text and contains no executable preview script',()=>{
  const bad=structuredClone(document);bad.sections[0].entries[0].text='<script>alert(1)</script>';
  const html=renderClassicalSource(bad,'');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');
  expect(html).toContain("script-src 'none'");
 });
 it('retains a present end date even when an optional start date is absent',()=>{
  const html=renderClassicalSource({version:1,profile:null,sections:[{module:'projects',title:null,entries:[{libraryEntryId:null,data:{name:'Current project',end:null},variantId:null,text:null,items:[]}]}]},'');
  expect(html).toContain('Current project');expect(html).toContain('Present');
 });
 it('does not mutate the saved composition or insert user-specific editor markers',()=>{
  const before=structuredClone(document);const html=renderClassicalSource(document,'');expect(document).toEqual(before);expect(html).not.toContain('data-src=');
 });
});
