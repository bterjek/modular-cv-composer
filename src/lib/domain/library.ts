import { z } from 'zod';
import { MODULES, entryData, webUrl } from './modules';
import { styleOptions } from './style';

const labels = z.array(z.string().trim().min(1).max(120)).max(100);
export const targetingSchema = z.object({
 roleFamilies: labels.default([]), competencies: labels.default([]), keywords: labels.default([]),
 basis: z.enum(['unspecified', 'inferred', 'confirmed']).default('unspecified'),
 notes: z.string().max(4000).default('')
});
export type Targeting = z.infer<typeof targetingSchema>;
export const sourceDocumentSchema = z.object({
 filename: z.string().trim().min(1).max(255),
 mediaType: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']),
 sha256: z.string().regex(/^[a-f0-9]{64}$/),
 extractedText: z.string().max(1000000).nullable().default(null),
 targeting: targetingSchema.default(() => targetingSchema.parse({}))
});
export const sourceReferenceSchema = z.object({
 sourceDocumentId: z.string().min(1), entryId: z.string().min(1).optional(),
 itemId: z.string().min(1).optional(), variantId: z.string().min(1).optional(),
 location: z.string().max(500).default(''), excerpt: z.string().max(20000).default('')
}).refine(v => [v.entryId, v.itemId, v.variantId].filter(Boolean).length === 1, 'Choose exactly one library target');
const wording = { variantId: z.string().nullable(), text: z.string().max(20000) };
export const compositionDocumentSchema = z.object({
 version: z.literal(1),
 profile: z.object({ fullName: z.string(), email: z.email(), phone: z.string().nullable(), location: z.string().nullable(), links: z.array(z.object({label: z.string(), url: webUrl})) }).nullable(),
 sections: z.array(z.object({
  module: z.enum(MODULES), title: z.string().nullable(),
  entries: z.array(z.object({
   libraryEntryId: z.string().nullable(), data: z.record(z.string(), z.unknown()),
   variantId: z.string().nullable(), text: z.string().max(20000).nullable(),
   items: z.array(z.object({ libraryItemId: z.string().nullable(), ...wording }))
  }))
 }))
}).superRefine((document, ctx) => {
 document.sections.forEach((section, s) => section.entries.forEach((entry, e) => {
  const result = entryData[section.module].safeParse(entry.data);
  if (!result.success) ctx.addIssue({ code: 'custom', path: ['sections', s, 'entries', e, 'data'], message: 'Invalid structured facts for ' + section.module });
 }));
});
export type CompositionDocument = z.infer<typeof compositionDocumentSchema>;
export const compositionSchema = z.object({
 name: z.string().trim().min(1).max(200), sourceDocumentId: z.string().nullable().default(null),
 designKey: z.string().trim().min(1).max(100).default('classic'), style: styleOptions.default({}),
 document: compositionDocumentSchema
});
