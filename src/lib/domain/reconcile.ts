// Explainable suggestions only. Similarity is never proof that two facts are identical.
import type { EntryIn, ItemIn } from './content';
import type { ImportBlock, Reconciliation } from './import';
import { targetingSchema, type Targeting } from './library';

export const normalise = (value: unknown): string =>
 String(value ?? '').normalize('NFKC').toLocaleLowerCase('en').replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const canonicalValue = (value: unknown) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
export function overlap(a: string, b: string): number {
 const left = new Set(normalise(a).split(' ').filter(Boolean));
 const right = new Set(normalise(b).split(' ').filter(Boolean));
 if (!left.size || !right.size) return 0;
 return [...left].filter(word => right.has(word)).length / new Set([...left, ...right]).size;
}
export const factsFingerprint = (data: Record<string, unknown>) => JSON.stringify(Object.fromEntries(Object.entries(data).sort(([a],[b]) => a.localeCompare(b))));
export type FactDifference = { field: string; imported: unknown; library: unknown };
export function factDifferences(imported: Record<string, unknown>, library: Record<string, unknown>): FactDifference[] {
 return [...new Set([...Object.keys(imported), ...Object.keys(library)])].sort().filter(key => {
  const a = imported[key], b = library[key];
  // An omitted optional value and an empty input are equivalent; null (present) remains distinct.
  if (a === null || b === null) return a !== b;
  return canonicalValue(a) !== canonicalValue(b);
 }).map(field => ({ field, imported: imported[field], library: library[field] }));
}

export function suggestEntryMatches(block: Pick<ImportBlock, 'module' | 'data' | 'text'>, entries: EntryIn[]) {
 const identity: Partial<Record<ImportBlock['module'], [string, string?]>> = {
  experience: ['organization','title'], education: ['institution','degree'], credentials: ['name','issuer'],
  skills: ['group'], languages: ['language'], projects: ['name'], custom: ['heading']
 };
 return entries.filter(entry => entry.module === block.module && !entry.archived).map(entry => {
  let score = 0;
  const reasons: string[] = [];
  const keys = identity[block.module];
  if (keys) {
   const key = keys[0], a = canonicalValue(block.data[key]), b = canonicalValue(entry.data[key]);
   if (a && b && a === b) { score += 65; reasons.push(`Same ${key}`); }
   else if (a && b && overlap(a,b) >= 0.6) { score += 40; reasons.push(`Similar ${key}`); }
   if (keys[1] && score) {
    const key2 = keys[1];
    if (canonicalValue(block.data[key2]) && canonicalValue(block.data[key2]) === canonicalValue(entry.data[key2])) { score += 20; reasons.push(`Same ${key2}`); }
   }
   if (score && block.data.start && block.data.start === entry.data.start) { score += 10; reasons.push('Same start date'); }
  } else {
   const wordingScore = Math.max(0, ...entry.variants.map(v => overlap(block.text,v.text)));
   if (wordingScore >= 0.25) { score = Math.round(wordingScore * 90); reasons.push('Wording overlap'); }
  }
  return { entryId: entry.id, label: entry.label, score: Math.min(100,score), reasons, differences: factDifferences(block.data,entry.data) };
 }).filter(match => match.score >= 20).sort((a,b) => b.score-a.score || a.entryId.localeCompare(b.entryId)).slice(0,5);
}

const numericClaims = (text: string) => [...new Set(text.normalize('NFKC').match(/[+-]?\d+(?:[.,]\d+)?\s*(?:%|[kKmM]\b)?/g) ?? [])].map(s => s.replace(/\s/g,'').toLowerCase()).sort().join('|');
export function numericDifference(text: string, item: ItemIn): boolean {
 const activeText = [...item.variants].sort((a,b) => overlap(text,b.text)-overlap(text,a.text) || a.id.localeCompare(b.id))[0]?.text ?? item.facts ?? '';
 return numericClaims(text) !== numericClaims(activeText);
}
export function suggestItemMatches(text: string, items: ItemIn[]) {
 return items.filter(item => !item.archived).map(item => ({
  itemId: item.id,
  text: item.facts || item.variants[0]?.text || 'Achievement without wording',
  score: Math.max(0, ...item.variants.map(v => overlap(text,v.text)), overlap(text,item.facts ?? '')),
  numericDifference: numericDifference(text,item)
 })).filter(match => match.score >= 0.2).sort((a,b) => b.score-a.score || a.itemId.localeCompare(b.itemId)).slice(0,3);
}
export function exactItem(text: string, items: ItemIn[]) {
 const matches = items.filter(item => !item.archived && item.variants.some(v => v.text.trim() === text.trim()));
 return matches.length === 1 ? matches[0] : null;
}
export function itemDecision(choice: Reconciliation | null | undefined, index: number, text: string) {
 return choice?.items.find(item => item.index === index && item.text === text);
}
export function targetingFingerprint(input?: Targeting) {
 const value = targetingSchema.parse(input ?? {});
 return JSON.stringify({ ...value,
  roleFamilies: [...new Set(value.roleFamilies.map(canonicalValue))].sort(),
  competencies: [...new Set(value.competencies.map(canonicalValue))].sort(),
  keywords: [...new Set(value.keywords.map(canonicalValue))].sort()
 });
}
