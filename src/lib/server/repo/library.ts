// All source and composition operations are owner-scoped. No filesystem paths are accepted.
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import { db } from '../db';
import { compositions, entries, items, sourceDocuments, sourceReferences, variants } from '../db/schema';
import { compositionSchema, sourceDocumentSchema, sourceReferenceSchema, type CompositionDocument } from '$lib/domain/library';
import type { ResolvedCV } from '$lib/domain/content';
import { InvalidError, NotFoundError } from './errors';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
 const result = schema.safeParse(input);
 if (!result.success) throw new InvalidError(result.error.issues.map(i => i.message).join('; '));
 return result.data;
}

function owned(ownerId: string, table: typeof entries | typeof items | typeof variants | typeof sourceDocuments | typeof compositions, id: string) {
 const row = db.select({ id: table.id }).from(table).where(and(eq(table.ownerId, ownerId), eq(table.id, id))).get();
 if (!row) throw new NotFoundError('Library record not found');
}

export function createSourceDocument(ownerId: string, input: unknown) {
 const value = parse(sourceDocumentSchema, input);
 const id = uuidv7();
 db.insert(sourceDocuments).values({ id, ownerId, ...value, createdAt: Date.now() }).run();
 return id;
}
export function listSourceDocuments(ownerId: string) {
 return db.select().from(sourceDocuments).where(eq(sourceDocuments.ownerId, ownerId)).orderBy(sourceDocuments.createdAt, sourceDocuments.id).all();
}
export function deleteSourceDocument(ownerId: string, id: string) {
 const result = db.delete(sourceDocuments).where(and(eq(sourceDocuments.ownerId, ownerId), eq(sourceDocuments.id, id))).run();
 if (!result.changes) throw new NotFoundError('Source document not found');
}
export function addSourceReference(ownerId: string, input: unknown) {
 const value = parse(sourceReferenceSchema, input);
 const id = uuidv7();
 db.transaction(() => {
  owned(ownerId, sourceDocuments, value.sourceDocumentId);
  if (value.entryId) owned(ownerId, entries, value.entryId);
  if (value.itemId) owned(ownerId, items, value.itemId);
  if (value.variantId) owned(ownerId, variants, value.variantId);
  db.insert(sourceReferences).values({ id, ownerId, ...value, createdAt: Date.now() }).run();
 });
 return id;
}
export function listSourceReferences(ownerId: string) {
 return db.select().from(sourceReferences).where(eq(sourceReferences.ownerId, ownerId)).all();
}

// Existing links may be stale after a library deletion; preserved links remain historical lineage.
// New links must resolve to this owner's content and agree with their parent.
function validateLinks(ownerId: string, document: CompositionDocument, previous?: CompositionDocument) {
 const oldEntries = previous?.sections.flatMap(s => s.entries) ?? [];
 for (const section of document.sections) for (const entry of section.entries) {
  const oldEntry = oldEntries.find(e => e.libraryEntryId !== null && e.libraryEntryId === entry.libraryEntryId);
  const row = entry.libraryEntryId ? db.select().from(entries).where(and(eq(entries.ownerId, ownerId), eq(entries.id, entry.libraryEntryId))).get() : null;
  if (entry.libraryEntryId && !row && !oldEntry) throw new NotFoundError('Entry not found');
  if (row && row.module !== section.module) throw new InvalidError('Entry belongs to another section');
  const validateVariant = (id: string | null, target: 'entryId' | 'itemId', targetId: string | null, oldId?: string | null) => {
   if (!id) return;
   const v = db.select().from(variants).where(and(eq(variants.ownerId, ownerId), eq(variants.id, id))).get();
   if (!v && id === oldId) return;
   if (!v) throw new NotFoundError('Wording not found');
   if (!targetId || v[target] !== targetId) throw new InvalidError('Wording belongs to another fact');
  };
  validateVariant(entry.variantId, 'entryId', entry.libraryEntryId, oldEntry?.variantId);
  for (const item of entry.items) {
   const oldItem = oldEntry?.items.find(i => i.libraryItemId !== null && i.libraryItemId === item.libraryItemId);
   const i = item.libraryItemId ? db.select().from(items).where(and(eq(items.ownerId, ownerId), eq(items.id, item.libraryItemId))).get() : null;
   if (item.libraryItemId && !i && !oldItem) throw new NotFoundError('Item not found');
   if (i && (!entry.libraryEntryId || i.entryId !== entry.libraryEntryId)) throw new InvalidError('Item belongs to another entry');
   validateVariant(item.variantId, 'itemId', item.libraryItemId, oldItem?.variantId);
  }
 }
}
export function createComposition(ownerId: string, input: unknown) {
 const value = parse(compositionSchema, input);
 const id = uuidv7();
 db.transaction(() => {
  if (value.sourceDocumentId) owned(ownerId, sourceDocuments, value.sourceDocumentId);
  validateLinks(ownerId, value.document);
  const now = Date.now();
  db.insert(compositions).values({ id, ownerId, ...value, createdAt: now, updatedAt: now }).run();
 });
 return id;
}
export function getComposition(ownerId: string, id: string) {
 const row = db.select().from(compositions).where(and(eq(compositions.ownerId, ownerId), eq(compositions.id, id))).get();
 if (!row) throw new NotFoundError('Composition not found');
 return row;
}
export function listCompositions(ownerId: string) {
 return db.select().from(compositions).where(eq(compositions.ownerId, ownerId)).orderBy(compositions.createdAt, compositions.id).all();
}
export function updateComposition(ownerId: string, id: string, input: unknown) {
 // Partial updates never apply create defaults to omitted fields.
 const patchSchema = z.object({
  name: compositionSchema.shape.name.optional(),
  sourceDocumentId: z.string().min(1).nullable().optional(),
  designKey: z.string().trim().min(1).max(100).optional(),
  style: compositionSchema.shape.style.unwrap().optional(),
  document: compositionSchema.shape.document.optional()
 });
 const value = parse(patchSchema, input);
 db.transaction(() => {
  const previous = getComposition(ownerId, id);
  if (value.sourceDocumentId) owned(ownerId, sourceDocuments, value.sourceDocumentId);
  if (value.document) validateLinks(ownerId, value.document, previous.document);
  db.update(compositions).set({ ...value, updatedAt: Date.now() }).where(and(eq(compositions.ownerId, ownerId), eq(compositions.id, id))).run();
 });
}
export function deleteComposition(ownerId: string, id: string) {
 const result = db.delete(compositions).where(and(eq(compositions.ownerId, ownerId), eq(compositions.id, id))).run();
 if (!result.changes) throw new NotFoundError('Composition not found');
}

/** Copy selected content, preserving order and lineage without live bindings. */
export function compositionDocumentFromCV(cv: ResolvedCV): CompositionDocument {
 return structuredClone({ version: 1 as const, profile: cv.profile, sections: cv.sections.map(section => ({
  module: section.module, title: section.title, entries: section.entries.map(entry => ({
   libraryEntryId: entry.id, data: entry.data, variantId: entry.variantId, text: entry.text,
   items: entry.items.map(item => ({ libraryItemId: item.id, variantId: item.variantId, text: item.text }))
  }))
 })) });
}
