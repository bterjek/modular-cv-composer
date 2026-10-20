import { beforeEach, describe, expect, it } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';

const A = 'library-a', B = 'library-b';
const source = { filename: 'compliance.pdf', mediaType: 'application/pdf', sha256: 'a'.repeat(64) };
beforeEach(() => {
 sqlite.prepare('delete from user').run();
 sqlite.prepare("insert into user (id,name,email) values (?, 'A', 'a@test.example'), (?, 'B', 'b@test.example')").run(A, B);
});
function seed() {
 const entry = repo.createEntry(A, { module: 'experience', label: 'Role', data: { organization: 'Org', title: 'Manager', start: '2020-01', end: null } });
 const item = repo.createItem(A, entry, { facts: 'Managed external service providers.' });
 const variant = repo.createVariant(A, { itemId: item, text: 'Oversaw supplier controls.', targeting: { roleFamilies: ['Compliance'], keywords: ['vendor management'], basis: 'confirmed' } });
 const category = repo.createCategory(A, { name: 'Compliance', recipe: { version: 1, modules: [{ module: 'experience' }] } });
 const document = repo.compositionDocumentFromCV(repo.resolveCategory(A, category));
 const src = repo.createSourceDocument(A, source);
 return { entry, item, variant, document, src };
}

describe('library foundation', () => {
 it('keeps neutral facts separate from wording and targeting without resetting omitted metadata', () => {
  const a = seed();
  repo.updateVariant(A, a.variant, { text: 'Updated compliance wording' });
  repo.updateItem(A, a.item, { note: 'Internal' });
  const item = repo.loadContent(A).entries[0].items[0];
  expect(item.facts).toBe('Managed external service providers.');
  expect(item.variants[0].targeting).toMatchObject({ basis: 'confirmed', keywords: ['vendor management'] });
  expect(() => repo.updateVariant(A, a.variant, { targeting: { basis: 'guaranteed ATS' } })).toThrow(repo.InvalidError);
 });
 it('retains provenance and rejects wrong-owner or ambiguous references', () => {
  const a = seed();
  repo.addSourceReference(A, { sourceDocumentId: a.src, variantId: a.variant, location: 'Page 1', excerpt: 'Original wording' });
  const b = repo.createSourceDocument(B, { ...source, filename: 'b.pdf' });
  expect(() => repo.addSourceReference(B, { sourceDocumentId: b, variantId: a.variant })).toThrow(repo.NotFoundError);
  expect(() => repo.addSourceReference(B, { sourceDocumentId: a.src, variantId: a.variant })).toThrow(repo.NotFoundError);
  expect(() => repo.addSourceReference(A, { sourceDocumentId: a.src, itemId: a.item, variantId: a.variant })).toThrow(repo.InvalidError);
  expect(repo.listSourceDocuments(B).map(s => s.id)).toEqual([b]);
  expect(repo.listSourceReferences(B)).toEqual([]);
  expect(() => repo.deleteSourceDocument(B, a.src)).toThrow(repo.NotFoundError);
 });
 it('isolates compositions from library edits, document edits and library deletion', () => {
  const a = seed();
  const id = repo.createComposition(A, { name: 'First', document: a.document, sourceDocumentId: a.src, designKey: 'modern', style: { align: 'justify' } });
  const second = repo.createComposition(A, { name: 'Second', document: a.document });
  repo.updateVariant(A, a.variant, { text: 'Library edit' });
  expect(repo.getComposition(A, id).document.sections[0].entries[0].items[0].text).toBe('Oversaw supplier controls.');
  const document = repo.getComposition(A, id).document;
  document.sections[0].entries[0].items[0].text = 'Local edit';
  repo.updateComposition(A, id, { document });
  expect(repo.getComposition(A, second).document).toEqual(a.document);
  expect(repo.loadContent(A).entries[0].items[0].variants[0].text).toBe('Library edit');
  repo.deleteEntry(A, a.entry);
  repo.updateComposition(A, id, { name: 'Renamed' });
  repo.updateComposition(A, id, { document });
  expect(repo.getComposition(A, id)).toMatchObject({ name: 'Renamed', sourceDocumentId: a.src, designKey: 'modern', style: { align: 'justify' } });
  repo.deleteSourceDocument(A, a.src);
  expect(repo.getComposition(A, id).sourceDocumentId).toBeNull();
 });
 it('validates composition lineage and ownership on reads, writes and attachments', () => {
  const a = seed();
  expect(() => repo.createComposition(B, { name: 'Stolen', document: a.document })).toThrow(repo.NotFoundError);
  const blank = { version: 1, profile: null, sections: [] };
  expect(() => repo.createComposition(B, { name: 'Stolen source', document: blank, sourceDocumentId: a.src })).toThrow(repo.NotFoundError);
  const id = repo.createComposition(A, { name: 'Own', document: a.document });
  expect(() => repo.getComposition(B, id)).toThrow(repo.NotFoundError);
  expect(() => repo.updateComposition(B, id, { name: 'Other' })).toThrow(repo.NotFoundError);
  expect(() => repo.deleteComposition(B, id)).toThrow(repo.NotFoundError);
  expect(repo.listCompositions(B)).toEqual([]);
  const other = repo.createItem(A, a.entry);
  const otherVariant = repo.createVariant(A, { itemId: other, text: 'Different fact' });
  const forged = structuredClone(a.document);
  forged.sections[0].entries[0].items[0].variantId = otherVariant;
  expect(() => repo.updateComposition(A, id, { document: forged })).toThrow(repo.InvalidError);
 });
 it('exports the new library data and removes it with the account', () => {
  const a = seed();
  repo.addSourceReference(A, { sourceDocumentId: a.src, entryId: a.entry });
  repo.createComposition(A, { name: 'Saved', document: a.document });
  const data = repo.exportAccount(A);
  expect(data.library.sources).toHaveLength(1);
  expect(data.library.references).toHaveLength(1);
  expect(data.library.compositions).toHaveLength(1);
  expect(repo.exportAccount(B).library).toEqual({ sources: [], references: [], compositions: [] });
  repo.deleteAccount(A);
  expect(repo.listSourceDocuments(A)).toEqual([]);
  expect(repo.listSourceReferences(A)).toEqual([]);
  expect(repo.listCompositions(A)).toEqual([]);
 });
});
