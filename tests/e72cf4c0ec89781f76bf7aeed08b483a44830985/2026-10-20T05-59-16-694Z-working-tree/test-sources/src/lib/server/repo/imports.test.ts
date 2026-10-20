import { beforeEach, describe, expect, it } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';
import { parseCVText } from '$lib/domain/import';
const A='import-a', B='import-b';
const bytes=Buffer.from('%PDF-original document retained');
beforeEach(() => {
 sqlite.prepare('delete from user').run();
 sqlite.prepare("insert into user (id,name,email) values (?, 'A','a@test.example'), (?, 'B','b@test.example')").run(A,B);
});
function seed() {
 const draft=parseCVText('Summary\nCompliance leader\nSkills\nITIL; Vendor management', 'cv.pdf');
 return repo.createCVImport(A,{filename:'cv.pdf',bytes,extractedText:'Original source text',draft});
}
describe('review and approval', () => {
 it('keeps uploads out of the library until approval, retaining exact bytes and user ownership', () => {
  const id=seed(), saved=repo.getCVImport(A,id);
  expect(repo.loadContent(A).entries).toEqual([]);
  expect(repo.getSourceFile(A,saved.sourceDocumentId).bytes).toEqual(bytes);
  expect(() => repo.getCVImport(B,id)).toThrow(repo.NotFoundError);
  expect(() => repo.getSourceFile(B,saved.sourceDocumentId)).toThrow(repo.NotFoundError);
  expect(() => repo.updateCVImport(B,id,saved.draft)).toThrow(repo.NotFoundError);
  expect(() => repo.approveCVImport(B,id)).toThrow(repo.NotFoundError);
  expect(repo.listCVImports(B)).toEqual([]);
 });
 it('approves atomically and only once, preserving selection, wording, targeting and provenance', () => {
  const id=seed(), saved=repo.getCVImport(A,id);
  saved.draft.targeting={roleFamilies:['Compliance'],competencies:[],keywords:['ITIL'],basis:'confirmed',notes:''};
  repo.updateCVImport(A,id,saved.draft);
  const compositionId=repo.approveCVImport(A,id)!;
  expect(repo.approveCVImport(A,id)).toBe(compositionId);
  expect(repo.loadContent(A).entries).toHaveLength(2);
  expect(repo.listSourceReferences(A).length).toBeGreaterThan(2);
  expect(repo.getComposition(A,compositionId).document.sections.map(s=>s.module)).toEqual(['summary','skills']);
  expect(repo.loadContent(A).entries.find(e=>e.module==='summary')?.variants[0].targeting?.basis).toBe('confirmed');
  repo.deleteComposition(A,compositionId);
  expect(repo.approveCVImport(A,id)).toBeNull();
  expect(repo.loadContent(A).entries).toHaveLength(2);
 });
 it('rolls back approval on invalid content and keeps excluded material only in the original/draft', () => {
  const id=seed(), saved=repo.getCVImport(A,id);
  saved.draft.blocks[1].included=false;
  saved.draft.blocks.push({...saved.draft.blocks[0],module:'experience',data:{},label:'Incomplete role'});
  repo.updateCVImport(A,id,saved.draft);
  expect(() => repo.approveCVImport(A,id)).toThrow(repo.InvalidError);
  expect(repo.loadContent(A).entries).toEqual([]);
  expect(repo.listCompositions(A)).toEqual([]);
  saved.draft.blocks.pop();
  repo.updateCVImport(A,id,saved.draft);
  repo.approveCVImport(A,id);
  expect(repo.loadContent(A).entries.map(e=>e.module)).toEqual(['summary']);
 });
 it('does not overwrite an existing profile or library, and preserves approved content when removing a source', () => {
  repo.upsertProfile(A,{fullName:'Original',email:'original@test.example'});
  const id=seed(), saved=repo.getCVImport(A,id);
  saved.draft.profile={fullName:'Imported',email:'new@test.example',phone:'',location:''};
  saved.draft.applyProfile=true;
  repo.updateCVImport(A,id,saved.draft);
  expect(() => repo.approveCVImport(A,id)).toThrow(repo.InvalidError);
  expect(repo.getProfile(A)?.fullName).toBe('Original');
  saved.draft.applyProfile=false;
  repo.updateCVImport(A,id,saved.draft);
  const compositionId=repo.approveCVImport(A,id)!;
  repo.deleteSourceDocument(A,saved.sourceDocumentId);
  expect(repo.listCVImports(A)).toEqual([]);
  expect(repo.getComposition(A,compositionId).sourceDocumentId).toBeNull();
  expect(repo.loadContent(A).entries).toHaveLength(2);
 });
 it('exports originals and drafts and deletes them with the account', () => {
  const id=seed(), saved=repo.getCVImport(A,id);
  expect(repo.exportAccount(A).imports.originals[0].bytes).toBe(bytes.toString('base64'));
  expect(repo.exportAccount(B).imports.originals).toEqual([]);
  repo.deleteAccount(A);
  expect(repo.listCVImports(A)).toEqual([]);
  expect(() => repo.getSourceFile(A,saved.sourceDocumentId)).toThrow(repo.NotFoundError);
 });
});
