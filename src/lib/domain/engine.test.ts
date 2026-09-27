import { describe, it, expect } from 'vitest';
import { resolve } from './engine';
import { recipe as recipeSchema, type Overrides } from './recipe';
import type { Content, EntryIn, ItemIn, VariantIn } from './content';

// ── tiny builders
let n = 0;
const v = (text: string, o: Partial<VariantIn> = {}): VariantIn => ({
	id: o.id ?? `v${++n}`, text, length: 'standard', isDefault: false, position: 0, tags: [], ...o
});
const item = (id: string, variants: VariantIn[], o: Partial<ItemIn> = {}): ItemIn => ({
	id, position: 0, archived: false, tags: [], variants, ...o
});
const entry = (id: string, module: EntryIn['module'], items: ItemIn[] = [], o: Partial<EntryIn> = {}): EntryIn => ({
	id, module, label: id, data: {}, sortKey: null, position: 0, archived: false, tags: [], variants: [], items, ...o
});
const recipe = (r: unknown) => recipeSchema.parse(r);
const texts = (cv: ReturnType<typeof resolve>, module: string) =>
	cv.sections.find((s) => s.module === module)?.entries.flatMap((e) => e.items.map((i) => i.text)) ?? [];
const why = (cv: ReturnType<typeof resolve>, id: string) => cv.trace.filter((t) => t.id === id).map((t) => `${t.outcome}: ${t.reason}`);

const content: Content = {
	profile: { fullName: 'Alex Example', email: 'alex@example.test', phone: null, location: 'Budapest', links: [] },
	entries: [
		entry('headline', 'headline', [], {
			variants: [
				v('IT governance lead', { id: 'h-gov', tags: ['governance'], isDefault: true }),
				v('Delivery manager', { id: 'h-del', tags: ['delivery'] })
			]
		}),
		entry('job-new', 'experience', [
			item('a1', [v('Built audit-ready controls', { tags: ['governance'] })], { tags: ['governance'], position: 1 }),
			item('a2', [v('Cut incident backlog by half', { tags: ['delivery'] })], { tags: ['delivery'], position: 2 }),
			item('a3', [v('Ran the vendor review')], { tags: ['governance', 'vendors'], position: 3 }),
			item('a4', [], { tags: ['governance'], position: 4 }),
			item('a5', [v('Old thing')], { archived: true, tags: ['governance'], position: 5 }),
			item('a6', [v('Wrote the policy handbook')], { tags: ['governance'], position: 6 })
		], { sortKey: '2024-09' }),
		entry('job-old', 'experience', [item('b1', [v('Migrated the ticketing tool')], { tags: ['delivery'] })], { sortKey: '2019-01' }),
		entry('job-legacy', 'experience', [item('c1', [v('Fax machines')], { tags: ['governance'] })], { sortKey: '2010-01', tags: ['legacy'] }),
		entry('lang-hu', 'languages', [], { data: { language: 'Hungarian', level: 'native' } })
	]
};

describe('resolve', () => {
	const gov = recipe({
		version: 1,
		modules: [
			{ module: 'headline' },
			{ module: 'experience', includeTags: ['governance'], excludeTags: ['legacy'], maxItemsPerEntry: 2 },
			{ module: 'languages' },
			{ module: 'skills' }
		],
		preferTags: ['governance']
	});

	it('follows recipe order and drops empty sections', () => {
		const cv = resolve(content, gov);
		expect(cv.sections.map((s) => s.module)).toEqual(['headline', 'experience', 'languages']);
		expect(why(cv, 'skills')).toEqual(['dropped: no entries left']);
	});

	it('picks the headline wording by category tags', () => {
		const cv = resolve(content, gov);
		expect(cv.sections[0].entries[0].text).toBe('IT governance lead');
	});

	it('filters entries by include/exclude tags, newest first', () => {
		const cv = resolve(content, gov);
		expect(cv.sections[1].entries.map((e) => e.id)).toEqual(['job-new']);
		expect(why(cv, 'job-legacy')).toEqual(['dropped: has excluded tag: legacy']);
		expect(why(cv, 'job-old')[0]).toMatch(/no tag from: governance/);
	});

	it('ranks items by preferred tags, caps them, shows them in author order', () => {
		const cv = resolve(content, gov);
		expect(texts(cv, 'experience')).toEqual(['Built audit-ready controls', 'Ran the vendor review']);
		expect(why(cv, 'a2')).toEqual(['dropped: no matching tag (entry itself does not match)']);
		expect(why(cv, 'a6')[0]).toMatch(/over the limit of 2/);
		expect(why(cv, 'a4')).toEqual(['dropped: no wording yet']);
		expect(why(cv, 'a5')).toEqual(['dropped: archived']);
	});

	it('keeps entries without variants (structured data only)', () => {
		const cv = resolve(content, gov);
		const lang = cv.sections.find((s) => s.module === 'languages')!.entries[0];
		expect(lang).toMatchObject({ text: null, variantId: null, data: { language: 'Hungarian' } });
	});

	it('a delivery recipe gives a different CV from the same content', () => {
		const del = recipe({ version: 1, modules: [{ module: 'headline' }, { module: 'experience' }], preferTags: ['delivery'] });
		const cv = resolve(content, del);
		expect(cv.sections[0].entries[0].text).toBe('Delivery manager');
		expect(cv.sections[1].entries.map((e) => e.id)).toEqual(['job-new', 'job-old', 'job-legacy']);
	});

	describe('overrides', () => {
		it('force an item in over the limit and one out', () => {
			const o: Overrides = { includeItems: ['a2'], excludeItems: ['a3'] };
			const cv = resolve(content, gov, o);
			// a3 out frees a slot for a6; a2 is forced in on top of the cap of 2
			expect(texts(cv, 'experience')).toEqual(['Built audit-ready controls', 'Cut incident backlog by half', 'Wrote the policy handbook']);
			expect(why(cv, 'a2')).toContain('kept: forced in for this job');
			expect(why(cv, 'a3')).toEqual(['dropped: excluded for this job']);
		});
		it('job tags outrank category tags', () => {
			const cv = resolve(content, gov, { preferTags: ['delivery'] });
			expect(cv.sections[0].entries[0].text).toBe('Delivery manager');
		});
		it('pin a wording', () => {
			const cv = resolve(content, gov, { pinVariants: { headline: 'h-del' } });
			expect(cv.sections[0].entries[0].text).toBe('Delivery manager');
			expect(why(cv, 'h-del')).toEqual(['chosen: pinned for this job']);
		});
		it('reorder sections; unknown ids become warnings, not errors', () => {
			const cv = resolve(content, gov, {
				moduleOrder: ['languages', 'projects'],
				excludeEntries: ['gone'],
				pinVariants: { headline: 'not-mine' }
			});
			expect(cv.sections.map((s) => s.module)).toEqual(['languages', 'headline', 'experience']);
			expect(cv.warnings).toHaveLength(3);
		});
		it('exclude a whole entry', () => {
			const cv = resolve(content, gov, { excludeEntries: ['job-new'] });
			expect(cv.sections.map((s) => s.module)).not.toContain('experience');
		});
	});

	it('prefers the requested length, then the default', () => {
		const c: Content = {
			profile: null,
			entries: [entry('s', 'summary', [], {
				variants: [v('Long one', { length: 'long', isDefault: true }), v('Short one', { length: 'short' })]
			})]
		};
		const r = (length: string) => recipe({ version: 1, modules: [{ module: 'summary' }], length });
		expect(resolve(c, r('short')).sections[0].entries[0].text).toBe('Short one');
		expect(resolve(c, r('standard')).sections[0].entries[0].text).toBe('Long one');
	});

	it('is deterministic', () => {
		expect(JSON.stringify(resolve(content, gov))).toBe(JSON.stringify(resolve(content, gov)));
	});

	it('rejects a recipe listing a module twice', () => {
		expect(() => recipe({ version: 1, modules: [{ module: 'skills' }, { module: 'skills' }] })).toThrow();
	});
});
