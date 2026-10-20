import { describe, it, expect } from 'vitest';
import { recipeFromForm, recipeRows, overridesFromForm } from './forms';
import { recipe as recipeSchema } from '$lib/domain/recipe';

const fd = (o: Record<string, string>) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(o)) f.append(k, v);
	return f;
};

describe('recipe form', () => {
	it('builds a valid recipe in the numbered order and round-trips', () => {
		const raw = recipeFromForm(fd({
			use_experience: 'on', order_experience: '2', maxItems_experience: '3', include_experience: 'Governance, audit',
			use_headline: 'on', order_headline: '1',
			use_skills: 'on', order_skills: '', exclude_skills: 'old',
			title_skills: 'Toolbox', maxEntries_skills: '0',
			preferTags: 'governance', length: 'short'
		}));
		const r = recipeSchema.parse(raw);
		expect(r.modules.map((m) => m.module)).toEqual(['headline', 'experience', 'skills']);
		expect(r.modules[1]).toMatchObject({ maxItemsPerEntry: 3, includeTags: ['governance', 'audit'] });
		expect(r.modules[2]).toMatchObject({ title: 'Toolbox', excludeTags: ['old'] });
		expect(r.modules[2].maxEntries).toBeUndefined(); // 0 means "no limit"
		const rows = recipeRows(r);
		expect(rows.find((x) => x.module === 'experience')).toMatchObject({ used: true, order: 2, maxItems: 3, include: 'governance, audit' });
		expect(rows.find((x) => x.module === 'education')!.used).toBe(false);
	});
	it('an empty selection fails validation instead of saving an empty CV', () => {
		expect(recipeSchema.safeParse(recipeFromForm(fd({}))).success).toBe(false);
	});
});

describe('job overrides form', () => {
	it('collects only what differs from the category', () => {
		expect(overridesFromForm(fd({ preferTags: '', length: '', item_a: 'auto', pin_x: '' }), ['headline', 'experience'])).toEqual({});
	});
	it('maps every control', () => {
		const o = overridesFromForm(
			fd({ preferTags: 'NIS2', length: 'long', order_experience: '1', entry_e1: 'exclude', item_i1: 'include', item_i2: 'exclude', pin_h: 'v9' }),
			['headline', 'summary', 'experience']
		);
		expect(o).toEqual({
			preferTags: ['NIS2'],
			length: 'long',
			moduleOrder: ['experience', 'headline', 'summary'],
			excludeEntries: ['e1'],
			includeItems: ['i1'],
			excludeItems: ['i2'],
			pinVariants: { h: 'v9' }
		});
	});
});
