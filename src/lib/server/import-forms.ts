import { importDraftSchema, type ImportDraft } from '$lib/domain/import';
import { MODULES } from '$lib/domain/modules';
import { MODULE_FIELDS, dataFromForm } from '$lib/editor/fields';
import { InvalidError } from './repo/errors';

export function draftFromForm(form: FormData, previous: ImportDraft) {
 const text = (key: string) => String(form.get(key) ?? '').trim();
 const list = (key: string) => text(key).split(',').map(s => s.trim()).filter(Boolean);
 const count = Number(text('blockCount'));
 if (!Number.isInteger(count) || count < 0 || count > 200) throw new InvalidError('Invalid block count.');
 const blocks = Array.from({ length: count }, (_, i) => {
  const module = text(`module-${i}`);
  if (!MODULES.includes(module as typeof MODULES[number])) throw new InvalidError('Choose a valid section.');
  const typed = module as typeof MODULES[number];
  const origin = Number(text(`origin-${i}`));
  const original = Number.isInteger(origin) && origin >= 0 ? previous.blocks[origin] : undefined;
  const fields = new FormData();
  for (const field of MODULE_FIELDS[typed]) {
   fields.set(field.name, text(`b${i}-${field.name}`));
   if (form.get(`b${i}-${field.name}_present`) === 'on') fields.set(`${field.name}_present`, 'on');
  }
  return {
   reconciliation: text(`reuse-${i}`) ? {
    entryId: text(`reuse-${i}`), libraryFacts: text(`libraryFacts-${i}`),
    facts: form.get(`useLibraryFacts-${i}`) === 'on' ? 'library' : 'unresolved',
    items: text(`items-${i}`).split('\n').map(s => s.trim()).filter(Boolean).flatMap((itemText, index) => {
     const selection = text(`itemReuse-${i}-${index}`);
     if (!selection || selection === 'auto') return [];
     // Browser review choices are bound to the exact incoming text. Changed/reordered bullets must be reviewed again.
     if (text(`itemReviewedText-${i}-${index}`) !== itemText) return [];
     return [{ index, text: itemText, itemId: selection === 'new' ? null : selection, confirmNumericDifference: form.get(`confirmNumeric-${i}-${index}`) === 'on' }];
    })
   } : null,
   module: typed, included: form.get(`included-${i}`) === 'on', label: text(`label-${i}`),
   data: dataFromForm(typed, fields), text: text(`text-${i}`),
   items: text(`items-${i}`).split('\n').map(s => s.trim()).filter(Boolean),
   // Preserve original provenance server-side. New/split blocks refer to reviewed source text, never arbitrary IDs.
   sourceExcerpt: original?.sourceExcerpt ?? '', location: original?.location ?? 'Added during review',
   warnings: original?.warnings ?? []
  };
 });
 const result = importDraftSchema.safeParse({ ...previous, name: text('name'), applyProfile: form.get('applyProfile') === 'on',
  profile: { fullName: text('fullName'), email: text('email'), phone: text('phone'), location: text('location') },
  targeting: { roleFamilies: list('roleFamilies'), competencies: list('competencies'), keywords: list('keywords'), basis: text('basis'), notes: text('notes') }, blocks });
 if (!result.success) throw new InvalidError(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
 return result.data;
}
