import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../db';
import { cvImports, sourceFiles, sourceDocuments } from '../db/schema';
import type { ImportBlock } from '$lib/domain/import';
import type { EntryIn, ItemIn, VariantIn } from '$lib/domain/content';
import { exactItem, factDifferences, factsFingerprint, itemDecision, numericDifference, targetingFingerprint } from '$lib/domain/reconcile';
import { importDraftSchema } from '$lib/domain/import';
import { entryData, HAS_ITEMS } from '$lib/domain/modules';
import { createEntry, createItem, createVariant, getProfile, upsertProfile, loadContent } from './content';
import { createSourceDocument, addSourceReference, createComposition } from './library';
import { InvalidError, NotFoundError } from './errors';
import { validateUpload } from '../import-extract';
import type { CompositionDocument } from '$lib/domain/library';

export function createCVImport(ownerId: string, input: { filename: string; bytes: Buffer; extractedText: string; draft: unknown }) {
 const draft = importDraftSchema.safeParse(input.draft);
 if (!draft.success) throw new InvalidError('The extracted draft is too large or invalid.');
 const mediaType = validateUpload(input.filename, input.bytes);
 return db.transaction(() => {
  const sourceDocumentId = createSourceDocument(ownerId, {
   filename: input.filename.replace(/[\\/\x00-\x1f]/g, '_').slice(0,255), mediaType,
   sha256: createHash('sha256').update(input.bytes).digest('hex'), extractedText: input.extractedText,
   targeting: draft.data.targeting
  });
  db.insert(sourceFiles).values({ ownerId, sourceDocumentId, bytes: input.bytes }).run();
  const id = uuidv7(), now = Date.now();
  db.insert(cvImports).values({ id, ownerId, sourceDocumentId, draft: draft.data, createdAt: now, updatedAt: now }).run();
  return id;
 });
}
export function getCVImport(ownerId: string, id: string) {
 const row = db.select().from(cvImports).where(and(eq(cvImports.ownerId, ownerId), eq(cvImports.id, id))).get();
 if (!row) throw new NotFoundError('Import not found');
 const source = db.select().from(sourceDocuments).where(and(eq(sourceDocuments.ownerId, ownerId), eq(sourceDocuments.id, row.sourceDocumentId))).get();
 if (!source) throw new NotFoundError('Source not found');
 return { ...row, source };
}
export function listCVImports(ownerId: string) {
 return db.select({ id: cvImports.id, draft: cvImports.draft, acceptedAt: cvImports.acceptedAt, compositionId: cvImports.compositionId, sourceDocumentId: cvImports.sourceDocumentId })
  .from(cvImports).where(eq(cvImports.ownerId, ownerId)).orderBy(cvImports.createdAt, cvImports.id).all();
}
export function updateCVImport(ownerId: string, id: string, input: unknown) {
 const parsed = importDraftSchema.safeParse(input);
 if (!parsed.success) throw new InvalidError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
 db.transaction(() => {
  const previous = getCVImport(ownerId, id);
  if (previous.acceptedAt) throw new InvalidError('This import has already been approved. Edit its library entries instead.');
  db.update(cvImports).set({ draft: parsed.data, updatedAt: Date.now() }).where(and(eq(cvImports.id,id),eq(cvImports.ownerId,ownerId))).run();
 });
}
export function getSourceFile(ownerId: string, sourceDocumentId: string) {
 const row = db.select().from(sourceFiles).where(and(eq(sourceFiles.ownerId,ownerId),eq(sourceFiles.sourceDocumentId,sourceDocumentId))).get();
 const source = db.select().from(sourceDocuments).where(and(eq(sourceDocuments.ownerId,ownerId),eq(sourceDocuments.id,sourceDocumentId))).get();
 if (!row || !source) throw new NotFoundError('Original document not found');
 return { ...source, bytes: row.bytes };
}
export function exportImportData(ownerId: string) {
 return {
  drafts: listCVImports(ownerId),
  originals: db.select().from(sourceFiles).where(eq(sourceFiles.ownerId,ownerId)).all().map(row => ({ sourceDocumentId: row.sourceDocumentId, encoding: 'base64', bytes: row.bytes.toString('base64') }))
 };
}

function reconciliationTarget(block: ImportBlock, library: EntryIn[]) {
 const choice = block.reconciliation;
 if (!choice) return null;
 const entry = library.find(candidate => candidate.id === choice.entryId && candidate.module === block.module);
 if (!entry) throw new NotFoundError('Selected library entry not found');
 if (entry.archived) throw new InvalidError(`${block.label}: restore the archived library entry before reusing it.`);
 if (factsFingerprint(entry.data) !== choice.libraryFacts) throw new InvalidError(`${block.label}: the selected library facts changed. Select the match again and review the differences.`);
 const differences = factDifferences(block.data, entry.data);
 if (differences.length && choice.facts !== 'library') throw new InvalidError(`${block.label}: resolve the conflicting facts (${differences.map(d => d.field).join(', ')}), or keep this as a separate entry.`);
 return entry;
}

export function approveCVImport(ownerId: string, id: string) {
 return db.transaction(() => {
  const saved = getCVImport(ownerId, id);
  if (saved.acceptedAt) return saved.compositionId;
  const draft = importDraftSchema.parse(saved.draft);
  const selected = draft.blocks.filter(block => block.included);
  if (!selected.length) throw new InvalidError('Choose at least one block to import.');
  const library = loadContent(ownerId).entries;
  const targets = selected.map(block => reconciliationTarget(block, library));
  for (const [i, block] of selected.entries()) {
   const result = entryData[block.module].safeParse(targets[i]?.data ?? block.data);
   if (!result.success) throw new InvalidError(`${block.label || `Block ${i + 1}`}: ${result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
   if (!block.text.trim() && !block.items.length && ['headline','summary','skills','custom'].includes(block.module)) throw new InvalidError(`${block.label}: add some content or exclude this block.`);
   if (!HAS_ITEMS[block.module] && block.items.length) throw new InvalidError(`${block.label}: this section does not support bullets; move them into its wording or change the section.`);
  }
  // Profile import is explicit and never replaces an established library profile.
  const profile = draft.profile.fullName && draft.profile.email ? { ...draft.profile, phone: draft.profile.phone || null, location: draft.profile.location || null, links: [] } : null;
  if (draft.applyProfile) {
   if (getProfile(ownerId)) throw new InvalidError('A profile already exists. Import without replacing it, then edit Profile separately.');
   if (!profile) throw new InvalidError('Enter a name and valid email before saving the profile.');
   upsertProfile(ownerId, profile);
  }
  const document: CompositionDocument = { version: 1, profile, sections: [] };
  const provenance = (block: ImportBlock, target: { entryId: string } | { itemId: string } | { variantId: string }) =>
   addSourceReference(ownerId, { sourceDocumentId: saved.sourceDocumentId, ...target, location: block.location, excerpt: block.sourceExcerpt });
  const wording = (target: { entryId: string } | { itemId: string }, text: string, known: VariantIn[]) => {
   const exact = known.find(v => v.text.trim() === text.trim() && targetingFingerprint(v.targeting) === targetingFingerprint(draft.targeting));
   if (exact) return exact.id;
   const isDefault = known.length === 0;
   const variantId = createVariant(ownerId, { ...target, text, isDefault, targeting: draft.targeting });
   known.push({ id: variantId, text: text.trim(), targeting: draft.targeting, isDefault, position: known.length, length: 'standard', tags: [] });
   return variantId;
  };
  for (const [position, block] of selected.entries()) {
   const existing = targets[position];
   const data = entryData[block.module].parse(existing?.data ?? block.data);
   const entryId = existing?.id ?? createEntry(ownerId, { module: block.module, label: block.label || block.module, data, position });
   provenance(block, { entryId });
   const knownVariants = existing?.variants ?? [];
   const variantId = block.text.trim() ? wording({ entryId }, block.text, knownVariants) : null;
   if (variantId) provenance(block, { variantId });
   const entry: CompositionDocument['sections'][number]['entries'][number] = { libraryEntryId: entryId, data, variantId, text: block.text.trim() || null, items: [] };
   for (const [itemPosition, text] of block.items.entries()) {
    const decision = itemDecision(block.reconciliation, itemPosition, text);
    let item: ItemIn | null = null;
    if (existing) {
     if (decision?.itemId) {
      item = existing.items.find(candidate => candidate.id === decision.itemId && !candidate.archived) ?? null;
      if (!item) throw new NotFoundError('Achievement not found in the selected entry');
      if (numericDifference(text, item) && !decision.confirmNumericDifference) throw new InvalidError(`${block.label}: numerical claims differ for bullet ${itemPosition + 1}. Confirm it describes the same achievement, or keep it separate.`);
     } else if (!decision) item = exactItem(text, existing.items);
    }
    if (!item) {
     const itemId = createItem(ownerId, entryId, existing ? {} : { position: itemPosition });
     item = { id: itemId, position: itemPosition, archived: false, facts: '', tags: [], variants: [] };
     existing?.items.push(item);
    }
    const itemVariant = wording({ itemId: item.id }, text, item.variants);
    provenance(block, { itemId: item.id });
    provenance(block, { variantId: itemVariant });
    entry.items.push({ libraryItemId: item.id, variantId: itemVariant, text });
   }
   const last = document.sections.at(-1);
   if (last?.module === block.module) last.entries.push(entry);
   else document.sections.push({ module: block.module, title: null, entries: [entry] });
  }
  const compositionId = createComposition(ownerId, { name: draft.name, sourceDocumentId: saved.sourceDocumentId, designKey: 'classic', document });
  db.update(sourceDocuments).set({ targeting: draft.targeting }).where(and(eq(sourceDocuments.ownerId,ownerId),eq(sourceDocuments.id,saved.sourceDocumentId))).run();
  db.update(cvImports).set({ compositionId, acceptedAt: Date.now(), updatedAt: Date.now() }).where(and(eq(cvImports.id,id),eq(cvImports.ownerId,ownerId))).run();
  return compositionId;
 });
}
