import { beforeEach, describe, expect, it } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';
import { parseCVText } from '$lib/domain/import';
import { factsFingerprint } from '$lib/domain/reconcile';
import type { ImportDraft } from '$lib/domain/import';
const A='reconcile-a',B='reconcile-b';
const original='Experience\n2020-01 – Present\nOperations Manager\nAcme\nResponsible for operational service delivery\n• Managed 10 suppliers\n• Reduced incidents by 20%';
beforeEach(()=>{
 sqlite.prepare('delete from user').run();
 sqlite.prepare("insert into user (id,name,email) values (?, 'A','a@test.example'), (?, 'B','b@test.example')").run(A,B);
});
const upload=(draft:ImportDraft,owner=A)=>repo.createCVImport(owner,{filename:'role.pdf',bytes:Buffer.from('%PDF-retained'),extractedText:original,draft});
const counts=()=>['entries','items','variants','source_references','compositions'].map(table=>(sqlite.prepare(`select count(*) as n from ${table}`).get() as {n:number}).n);
function seed(){
 const first=upload(parseCVText(original,'operations.pdf'));
 const firstCV=repo.approveCVImport(A,first)!;
 const entry=repo.loadContent(A).entries[0];
 const draft=parseCVText(original,'compliance.pdf');
 draft.blocks[0].reconciliation={entryId:entry.id,libraryFacts:factsFingerprint(entry.data),facts:'unresolved',items:[]};
 return {first,firstCV,entry,draft};
}
describe('reconciling imports',()=>{
 it('reuses exact facts, achievements and wordings across two imports while keeping two compositions and sources',()=>{
  const a=seed(), id=upload(a.draft);
  const second=repo.approveCVImport(A,id)!;
  const content=repo.loadContent(A);
  expect(content.entries).toHaveLength(1);
  expect(content.entries[0].items).toHaveLength(2);
  expect(content.entries[0].variants).toHaveLength(1);
  expect(content.entries[0].items.every(item=>item.variants.length===1)).toBe(true);
  expect(repo.listCompositions(A)).toHaveLength(2);
  expect(repo.getComposition(A,second).document).toEqual(repo.getComposition(A,a.firstCV).document);
  expect(repo.listSourceReferences(A).filter(ref=>ref.entryId===a.entry.id).map(ref=>ref.sourceDocumentId)).toHaveLength(2);
  const before=counts();expect(repo.approveCVImport(A,id)).toBe(second);expect(counts()).toEqual(before);
 });
 it('adds chosen alternative wordings and emphasis without modifying defaults, existing facts, tags or saved CVs',()=>{
  const a=seed(), before=repo.getComposition(A,a.firstCV);
  a.draft.targeting={roleFamilies:['Compliance'],competencies:['Assurance'],keywords:['vendor management'],basis:'confirmed',notes:''};
  a.draft.blocks[0].text='Accountable for supplier assurance.';
  a.draft.blocks[0].items=['Oversaw controls for 10 suppliers','Reduced incidents by 20%'];
  a.draft.blocks[0].reconciliation!.items=[{index:0,text:a.draft.blocks[0].items[0],itemId:a.entry.items[0].id,confirmNumericDifference:false}];
  const second=repo.approveCVImport(A,upload(a.draft))!;
  const entry=repo.loadContent(A).entries[0];
  expect(entry.items).toHaveLength(2);
  expect(entry.data).toEqual(a.entry.data);
  expect(entry.tags).toEqual(a.entry.tags);
  expect(entry.variants.find(v=>v.isDefault)?.id).toBe(a.entry.variants[0].id);
  expect(entry.items[0].variants.find(v=>v.isDefault)?.id).toBe(a.entry.items[0].variants[0].id);
  expect(entry.items[0].variants).toHaveLength(2);
  expect(entry.items[0].variants.at(-1)?.targeting?.roleFamilies).toEqual(['Compliance']);
  expect(repo.getComposition(A,a.firstCV)).toEqual(before);
  expect(repo.getComposition(A,second).document.sections[0].entries[0].items[0].text).toContain('controls');
 });
 it('requires an explicit decision about conflicting facts and keeps disputed input in provenance',()=>{
  const a=seed();a.draft.blocks[0].data.start='2021-01';
  const id=upload(a.draft), before=counts();
  expect(()=>repo.approveCVImport(A,id)).toThrow(/conflicting facts/);
  expect(counts()).toEqual(before);
  a.draft.blocks[0].reconciliation!.facts='library';repo.updateCVImport(A,id,a.draft);
  const cv=repo.approveCVImport(A,id)!;
  expect(repo.getComposition(A,cv).document.sections[0].entries[0].data.start).toBe('2020-01');
  expect(repo.getCVImport(A,id).draft.blocks[0].data.start).toBe('2021-01');
  expect(repo.loadContent(A).entries[0].data.start).toBe('2020-01');
 });
 it('keeps a separate role when requested even if a match exists',()=>{
  const a=seed();a.draft.blocks[0].data.start='2021-01';a.draft.blocks[0].reconciliation=null;
  repo.approveCVImport(A,upload(a.draft));
  expect(repo.loadContent(A).entries).toHaveLength(2);
 });
 it('blocks a stale selection after the library facts have changed',()=>{
  const a=seed(),id=upload(a.draft);
  repo.updateEntry(A,a.entry.id,{data:{...a.entry.data,title:'Director'}});
  const before=counts();expect(()=>repo.approveCVImport(A,id)).toThrow(/facts changed/);expect(counts()).toEqual(before);
 });
 it('requires confirmation for changed numerical claims on an existing achievement and rolls back all writes',()=>{
  const a=seed();const text='Managed 20 suppliers';a.draft.blocks[0].items=[text];
  a.draft.blocks[0].reconciliation!.items=[{index:0,text,itemId:a.entry.items[0].id,confirmNumericDifference:false}];
  const id=upload(a.draft),before=counts();expect(()=>repo.approveCVImport(A,id)).toThrow(/numerical claims/);expect(counts()).toEqual(before);
  a.draft.blocks[0].reconciliation!.items[0].confirmNumericDifference=true;repo.updateCVImport(A,id,a.draft);repo.approveCVImport(A,id);
  expect(repo.loadContent(A).entries[0].items).toHaveLength(2);
  expect(repo.loadContent(A).entries[0].items[0].variants).toHaveLength(2);
 });
 it('resets a stale bullet choice instead of attaching edited text to the wrong achievement',()=>{
  const a=seed();a.draft.blocks[0].reconciliation!.items=[{index:0,text:'Old incoming text',itemId:a.entry.items[0].id,confirmNumericDifference:true}];
  a.draft.blocks[0].items=['An unrelated achievement'];repo.approveCVImport(A,upload(a.draft));
  const items=repo.loadContent(A).entries[0].items;
  expect(items).toHaveLength(3);expect(items.find(item=>item.id===a.entry.items[0].id)?.variants).toHaveLength(1);
 });
 it('honours an explicit new achievement even for identical text',()=>{
  const a=seed();a.draft.blocks[0].reconciliation!.items=[{index:0,text:a.draft.blocks[0].items[0],itemId:null,confirmNumericDifference:false}];
  repo.approveCVImport(A,upload(a.draft));expect(repo.loadContent(A).entries[0].items).toHaveLength(3);
 });
 it('rejects another owner’s entry, an item from another role, and archived or deleted targets',()=>{
  const a=seed();const id=upload(a.draft,B);expect(()=>repo.approveCVImport(B,id)).toThrow(repo.NotFoundError);
  const other=repo.createEntry(A,{module:'experience',label:'Other role',data:a.entry.data});
  const item=repo.createItem(A,other);repo.createVariant(A,{itemId:item,text:'Other achievement'});
  a.draft.blocks[0].reconciliation!.items=[{index:0,text:a.draft.blocks[0].items[0],itemId:item,confirmNumericDifference:true}];
  const own=upload(a.draft), before=counts();expect(()=>repo.approveCVImport(A,own)).toThrow(repo.NotFoundError);expect(counts()).toEqual(before);
  a.draft.blocks[0].reconciliation!.items=[];repo.updateCVImport(A,own,a.draft);repo.setEntryArchived(A,a.entry.id,true);
  expect(()=>repo.approveCVImport(A,own)).toThrow(/archived/);
  repo.deleteEntry(A,a.entry.id);expect(()=>repo.approveCVImport(A,own)).toThrow(repo.NotFoundError);
 });
 it('preserves each CV’s own bullet selection and order when sharing library content',()=>{
  const a=seed();a.draft.blocks[0].items.reverse();
  const second=repo.approveCVImport(A,upload(a.draft))!;
  const firstItems=repo.getComposition(A,a.firstCV).document.sections[0].entries[0].items;
  const secondItems=repo.getComposition(A,second).document.sections[0].entries[0].items;
  expect(secondItems.map(i=>i.libraryItemId)).toEqual(firstItems.map(i=>i.libraryItemId).reverse());
  expect(repo.loadContent(A).entries[0].items.map(i=>i.id)).toEqual(a.entry.items.map(i=>i.id));
 });
});
