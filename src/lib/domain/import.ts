import { z } from 'zod';
import { MODULES, type Module } from './modules';
import { headingOf } from '../../../scripts/cv-headings.mjs';
import { targetingSchema } from './library';

export const reconciliationSchema = z.object({
 entryId: z.string().min(1), libraryFacts: z.string().max(20000),
 facts: z.enum(['unresolved', 'library']).default('unresolved'),
 items: z.array(z.object({
  index: z.number().int().min(0).max(199), text: z.string().max(2000),
  itemId: z.string().min(1).nullable(), confirmNumericDifference: z.boolean().default(false)
 })).max(200).default([])
});
export type Reconciliation = z.infer<typeof reconciliationSchema>;

export const importBlockSchema = z.object({
 reconciliation: reconciliationSchema.nullable().optional(),
 module: z.enum(MODULES), label: z.string().max(120), included: z.boolean(),
 data: z.record(z.string(), z.unknown()), text: z.string().max(20000),
 items: z.array(z.string().trim().min(1).max(2000)).max(200),
 sourceExcerpt: z.string().max(20000), location: z.string().max(500),
 warnings: z.array(z.string().max(500)).max(30)
});
export const importDraftSchema = z.object({
 version: z.literal(1), name: z.string().trim().min(1).max(200),
 profile: z.object({ fullName: z.string().max(200), email: z.string().max(320), phone: z.string().max(50), location: z.string().max(200) }),
 applyProfile: z.boolean(), targeting: targetingSchema,
 blocks: z.array(importBlockSchema).max(200), warnings: z.array(z.string().max(500)).max(50)
});
export type ImportDraft = z.infer<typeof importDraftSchema>;
export type ImportBlock = z.infer<typeof importBlockSchema>;

const cleanLine = (s: string) => s.trim().replace(/^[•●▪◦\-*]\s+/, '').trim();
const dateToken = '(?:[A-Za-zÀ-ž]+\\.? \\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4}(?:[-/.](?:0?[1-9]|1[0-2]))?)';
const dateRange = new RegExp(`(${dateToken})\\s*[–—-]\\s*(${dateToken}|present|current|jelenleg)`, 'i');
const roleIdentity = (line:string) => line.replace(dateRange,'').trim().match(/^(.{1,140}?)\s+\|\s+(.{1,140})$/);
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function exactMonth(value: string) {
 if (/^\d{4}[-/.]\d{1,2}$/.test(value)) return value.slice(0,4) + '-' + value.slice(5).padStart(2,'0');
 const numeric = /^(\d{1,2})[/.](\d{4})$/.exec(value);
 if (numeric && +numeric[1] >= 1 && +numeric[1] <= 12) return numeric[2] + '-' + numeric[1].padStart(2,'0');
 const named = /^([A-Za-z]+)\.? (\d{4})$/.exec(value);
 if (named) {
  const month = MONTHS.indexOf(named[1].slice(0,3).toLowerCase());
  if (month >= 0) return named[2] + '-' + String(month+1).padStart(2,'0');
 }
 return '';
}

/** Conservative local suggestions: preserve every non-empty line, leave uncertain facts editable. */
export function parseCVText(raw: string, filename: string, extractionWarnings: string[] = []): ImportDraft {
 const lines = raw.replace(/\r\n?/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);
 const draft: ImportDraft = {
  version: 1, name: filename.replace(/\.[^.]+$/, '').slice(0, 200) || 'Imported CV',
  profile: { fullName: '', email: '', phone: '', location: '' }, applyProfile: false,
  targeting: { roleFamilies: [], competencies: [], keywords: [], basis: 'unspecified', notes: '' },
  blocks: [], warnings: [...extractionWarnings, 'Check extracted reading order, especially for columns, tables and page breaks.']
 };
 if (!lines.length) {
  draft.warnings.push('No readable text was found. This may be a scanned document. Paste its text below to continue; OCR is not included.');
  return draft;
 }
 const email = raw.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
 if (email) draft.profile.email = email;
 const first = lines[0];
 if (!headingOf(first) && !/@|\d/.test(first) && first.length < 100) draft.profile.fullName = first;
 const sections: {module: Module; title: string; lines: string[]; start: number}[] = [];
 let current = { module: 'custom' as Module, title: 'Opening details', lines: [] as string[], start: 1 };
 sections.push(current);
 lines.forEach((line, i) => {
  const module = headingOf(line);
  if (module && line.length < 70) {
   current = { module, title: line, lines: [], start: i + 2 };
   sections.push(current);
  } else current.lines.push(line);
 });
 for (const section of sections) {
  if (!section.lines.length) continue;
  // Date lines often mark role boundaries. If ambiguous, keep the group together for review.
  const chunks: string[][] = [];
  let chunk: string[] = [];
  for (const line of section.lines) {
   if (section.module === 'experience' && ((dateRange.test(line) && chunk.some(l => dateRange.test(l))) || (roleIdentity(line) && chunk.some(l=>roleIdentity(l))))) {
    chunks.push(chunk); chunk = [];
   }
   chunk.push(line);
  }
  if (chunk.length) chunks.push(chunk);
  if (['credentials', 'languages'].includes(section.module)) {
   chunks.splice(0, chunks.length, ...section.lines.map(line => [line]));
  }
  for (const group of chunks) {
   const module = section.module;
   const excerpt = group.join('\n');
   const data: Record<string, unknown> = {};
   const warnings: string[] = [];
   let identityHeader: string | undefined;
   let text = excerpt;
   let items: string[] = [];
   const bulletLines = group.filter(l => /^[•●▪◦\-*]\s+/.test(l));
   if (module === 'experience') {
    const range = excerpt.match(dateRange);
    const header = group.filter(l => !/^[•●▪◦\-*]\s+/.test(l)).map(l => l.replace(dateRange, '').replace(/^[|,;–—\-\s]+|[|,;–—\-\s]+$/g, '')).filter(Boolean);
    identityHeader=header.slice(0,4).find(line=>roleIdentity(line));
    const identity=identityHeader?roleIdentity(identityHeader):null;
    data.title = identity?.[1]?.trim() ?? header[0] ?? '';
    data.organization = identity?.[2]?.trim() ?? header[1] ?? '';
    if (range) {
     const month = exactMonth;
     data.start = month(range[1]);
     data.end = /present|current|jelenleg/i.test(range[2]) ? null : month(range[2]);
    }
    warnings.push('Confirm role boundaries, organisation, title and full dates. Year-only dates need a month.');
    // Keep all prose available; no line is silently removed during parsing.
    items = bulletLines.map(cleanLine);
    text = group.filter(l => !bulletLines.includes(l)).join('\n');
   } else if (module === 'education') {
    data.degree = group[0] ?? ''; data.institution = group[1] ?? '';
    warnings.push('Confirm degree, institution and dates.');
   } else if (module === 'credentials') {
    data.name = group[0]; data.issuer = ''; data.kind = '';
    warnings.push('Specify the issuer and whether this is a certification, course, licence or membership.');
   } else if (module === 'languages') {
    data.language = group[0]; data.level = '';
    warnings.push('Confirm the language and select its level.');
   } else if (module === 'skills') {
    data.group = section.title;
    items = group.flatMap(l => cleanLine(l).split(/\s*[;|]\s*/)).filter(Boolean);
    text = '';
   } else if (module === 'projects') {
    data.name = group[0]; items = bulletLines.map(cleanLine);
    text = group.filter(l => !bulletLines.includes(l)).join('\n');
   } else if (module === 'custom') {
    data.heading = section.title;
    warnings.push('Unclassified text is retained here. Choose a section or split it before approval.');
   }
   // Structured headers are displayed separately. Keep their exact source in the
   // excerpt, but do not suggest printing the same line again as description.
   const headerKeys: Partial<Record<Module, string[]>> = {
    experience: ['title', 'organization'], education: ['degree', 'institution'],
    credentials: ['name'], languages: ['language'], projects: ['name']
   };
   const represented = (headerKeys[module] ?? []).map(key => data[key]).filter(value => typeof value === 'string' && value);
   const descriptionLines = text.split('\n').filter(line => {
    if (represented.includes(line) || line === identityHeader) return false;
    if (module !== 'experience') return true;
    const match = line.match(dateRange);
    // Keep imprecise or uncertain dates in the wording until they are reviewed.
    if (!match || !data.start || data.end === '') return true;
    const rest = line.replace(dateRange, '').replace(/^[|,;–—\-\s]+|[|,;–—\-\s]+$/g, '');
    return Boolean(rest) && !represented.includes(rest) && rest !== identityHeader;
   });
   text = descriptionLines.join('\n');
   draft.blocks.push({ module, label: String(data.title || data.name || section.title).slice(0,120), included: true, data, text, items,
    sourceExcerpt: excerpt, location: `${section.title}, extracted line ${section.start}`, warnings });
  }
 }
 return importDraftSchema.parse(draft);
}
