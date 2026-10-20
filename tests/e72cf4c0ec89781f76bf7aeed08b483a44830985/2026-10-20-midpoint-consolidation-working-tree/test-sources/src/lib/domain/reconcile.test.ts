import { describe, expect, it } from 'vitest';
import { exactItem, factDifferences, factsFingerprint, itemDecision, numericDifference, suggestEntryMatches, suggestItemMatches, targetingFingerprint } from './reconcile';
import type { EntryIn, ItemIn } from './content';
const variant = (text: string) => ({id:text,text,length:'standard' as const,isDefault:true,position:0,tags:[]});
const item = (id: string, text: string): ItemIn => ({id,position:0,archived:false,tags:[],variants:[variant(text)]});
const role: EntryIn = {id:'role',module:'experience',label:'Acme role',data:{organization:'Acme',title:'Manager',start:'2020-01',end:null},position:0,sortKey:null,archived:false,tags:[],variants:[],items:[]};
describe('reconciliation suggestions', () => {
 it('explains same-role identity and exposes conflicting dates without applying a merge', () => {
  const matches=suggestEntryMatches({module:'experience',data:{...role.data,start:'2021-01'},text:''},[role,{...role,id:'other',module:'education'}]);
  expect(matches).toHaveLength(1);
  expect(matches[0].reasons).toContain('Same organization');
  expect(matches[0].differences).toEqual([{field:'start',imported:'2021-01',library:'2020-01'}]);
  expect(suggestEntryMatches({module:'experience',data:{organization:'Unrelated',title:'Manager'},text:''},[role])).toEqual([]);
 });
 it('distinguishes present from missing and ignores harmless optional whitespace', () => {
  expect(factDifferences({end:undefined,title:' Manager '},{end:null,title:'manager'})).toEqual([{field:'end',imported:undefined,library:null}]);
  expect(factDifferences({title:'C++ Developer'},{title:'C# Developer'})).toHaveLength(1);
  expect(factsFingerprint({b:2,a:1})).toBe(factsFingerprint({a:1,b:2}));
 });
 it('suggests achievement overlap, flags numerical differences, and only auto-reuses an unambiguous exact wording', () => {
  const first=item('one','Managed 10 suppliers');
  expect(numericDifference('Managed 20 suppliers',first)).toBe(true);
  expect(suggestItemMatches('Managed 20 suppliers',[first])[0].itemId).toBe('one');
  expect(exactItem('Managed 10 suppliers',[first])?.id).toBe('one');
  expect(exactItem('Managed 10 suppliers',[first,item('two','Managed 10 suppliers')])).toBeNull();
  expect(exactItem('Managed 10 suppliers',[{...first,archived:true}])).toBeNull();
 });
 it('invalidates a reused bullet decision when text or position changes', () => {
  const choice={entryId:'role',libraryFacts:'{}',facts:'unresolved' as const,items:[{index:0,text:'Original',itemId:'one',confirmNumericDifference:true}]};
  expect(itemDecision(choice,0,'Changed')).toBeUndefined();
  expect(itemDecision(choice,1,'Original')).toBeUndefined();
  expect(itemDecision(choice,0,'Original')?.itemId).toBe('one');
 });
 it('treats equivalent targeting lists consistently while preserving distinct emphases', () => {
  expect(targetingFingerprint({roleFamilies:['Compliance'],competencies:[],keywords:['ITIL','Risk'],basis:'confirmed',notes:''})).toBe(targetingFingerprint({roleFamilies:['compliance'],competencies:[],keywords:['Risk','ITIL'],basis:'confirmed',notes:''}));
  expect(targetingFingerprint({roleFamilies:[],competencies:[],keywords:['C++'],basis:'confirmed',notes:''})).not.toBe(targetingFingerprint({roleFamilies:[],competencies:[],keywords:['C#'],basis:'confirmed',notes:''}));
  expect(targetingFingerprint()).not.toBe(targetingFingerprint({roleFamilies:['Operations'],competencies:[],keywords:[],basis:'confirmed',notes:''}));
 });
});
