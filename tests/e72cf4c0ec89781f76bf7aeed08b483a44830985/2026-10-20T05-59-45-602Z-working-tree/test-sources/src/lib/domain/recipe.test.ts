import { describe, it, expect } from 'vitest';
import { recipe, overrides } from './recipe';
import { parseEntryData } from './modules';

describe('recipe schema', () => {
	it('accepts the example from docs/SCHEMA.md and fills defaults', () => {
		const r = recipe.parse({
			version: 1,
			modules: [
				{ module: 'headline' },
				{ module: 'experience', maxEntries: 5, maxItemsPerEntry: 4, includeTags: ['governance'] }
			],
			preferTags: ['governance'],
			length: 'short'
		});
		expect(r.modules[0].includeTags).toEqual([]);
		expect(r.modules[1].maxEntries).toBe(5);
	});
	it('rejects unknown modules and versions', () => {
		expect(() => recipe.parse({ version: 2, modules: [{ module: 'headline' }] })).toThrow();
		expect(() => recipe.parse({ version: 1, modules: [{ module: 'hobbies' }] })).toThrow();
	});
	it('accepts empty overrides', () => {
		expect(overrides.parse({})).toEqual({});
	});
});

describe('entry data', () => {
	it('requires credential kind, so a course cannot pass as a certification', () => {
		expect(() => parseEntryData('credentials', { name: 'X', issuer: 'Y' })).toThrow();
		expect(parseEntryData('credentials', { name: 'X', issuer: 'Y', kind: 'course' }).kind).toBe('course');
	});
	it('validates YYYY-MM dates and null end = present', () => {
		expect(() =>
			parseEntryData('experience', { organization: 'A', title: 'B', start: '2024-13', end: null })
		).toThrow();
		expect(
			parseEntryData('experience', { organization: 'A', title: 'B', start: '2024-09', end: null }).end
		).toBeNull();
	});
});
