import { compositionDocumentSchema, type CompositionDocument } from './library';
import type { EntryIn, VariantIn } from './content';
import type { Module } from './modules';

export type CVEntry = CompositionDocument['sections'][number]['entries'][number];
export function copyLibraryEntry(entry: EntryIn): CVEntry {
 const chosen = (variants: VariantIn[]) => variants.find(v => v.isDefault) ?? variants[0];
 const wording = chosen(entry.variants);
 return structuredClone({ libraryEntryId: entry.id, data: entry.data, variantId: wording?.id ?? null, text: wording?.text ?? null,
  items: entry.items.filter(i => !i.archived).map(item => { const v = chosen(item.variants); return { libraryItemId: item.id, variantId: v?.id ?? null, text: v?.text ?? item.facts ?? '' }; }) });
}
export function newCVEntry(module: Module): CVEntry {
 const defaults: Record<Module, Record<string, unknown>> = {headline:{},summary:{},experience:{title:'',organization:'',start:'',end:null},education:{degree:'',institution:''},credentials:{name:'',issuer:'',kind:'course'},skills:{group:''},languages:{language:'',level:'C1'},projects:{name:''},custom:{heading:''}};
 return {libraryEntryId:null,data:defaults[module],variantId:null,text:null,items:[]};
}
/** External chat supplies content only. Drop all claimed database relationships. */
export function chatDocument(input: unknown): CompositionDocument {
 const doc = compositionDocumentSchema.parse(input);
 for (const section of doc.sections) for (const entry of section.entries) {
  entry.libraryEntryId = null; entry.variantId = null;
  for (const item of entry.items) { item.libraryItemId = null; item.variantId = null; }
 }
 return doc;
}
