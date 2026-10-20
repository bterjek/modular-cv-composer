import { describe, it, expect, beforeEach } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';
import { NotFoundError, InvalidError } from './errors';

const A = 'user-a';
const B = 'user-b';
const recipe = { version: 1, modules: [{ module: 'experience' }] };
const job = (over: object = {}) => ({ organization: 'Org', title: 'Lead', start: '2022-01', end: null, ...over });

beforeEach(() => {
	sqlite.prepare('delete from user').run(); // cascades to all content
	sqlite.prepare(`insert into user (id, name, email) values (?, 'A', 'a@x.test'), (?, 'B', 'b@x.test')`).run(A, B);
});

function seedA() {
	const entry = repo.createEntry(A, { module: 'experience', label: 'Org', data: job() });
	const item = repo.createItem(A, entry);
	const variant = repo.createVariant(A, { itemId: item, text: 'Did a thing', isDefault: true });
	const category = repo.createCategory(A, { name: 'Gov', recipe });
	const target = repo.createJobTarget(A, { categoryId: category, company: 'Acme', roleTitle: 'Head of IT' });
	return { entry, item, variant, category, target };
}

describe('content', () => {
	it('validates module data and derives the sort key', () => {
		expect(() => repo.createEntry(A, { module: 'experience', label: 'X', data: { organization: 'O' } })).toThrow(InvalidError);
		const id = repo.createEntry(A, { module: 'credentials', label: 'Cert', data: { name: 'N', issuer: 'I', kind: 'course', issued: '2023-05' } });
		expect(repo.loadContent(A).entries.find((e) => e.id === id)?.sortKey).toBe('2023-05');
	});

	it('keeps at most one default wording per target', () => {
		const { item, variant } = seedA();
		const second = repo.createVariant(A, { itemId: item, text: 'Another', isDefault: true });
		const vs = repo.loadContent(A).entries[0].items[0].variants;
		expect(vs.filter((v) => v.isDefault).map((v) => v.id)).toEqual([second]);
		repo.updateVariant(A, variant, { isDefault: true });
		expect(repo.loadContent(A).entries[0].items[0].variants.filter((v) => v.isDefault).map((v) => v.id)).toEqual([variant]);
	});

	it('tags are case-insensitive and replaced as a set', () => {
		const { item } = seedA();
		repo.setTags(A, { itemId: item }, ['Governance', ' governance ', 'NIS2']);
		expect(repo.loadContent(A).entries[0].items[0].tags).toEqual(['governance', 'nis2']);
		repo.setTags(A, { itemId: item }, ['delivery']);
		expect(repo.loadContent(A).entries[0].items[0].tags).toEqual(['delivery']);
		expect(repo.listTags(A).map((t) => t.name)).toEqual(['delivery', 'governance', 'nis2']);
	});

	it('updates never reset fields that were not sent', () => {
		const { item, category, target } = seedA();
		repo.updateItem(A, item, { position: 7 });
		repo.updateItem(A, item, { note: 'n' });
		expect(repo.loadContent(A).entries[0].items[0].position).toBe(7);

		repo.updateCategory(A, category, { designKey: 'fancy' });
		repo.updateCategory(A, category, { name: 'Renamed' });
		expect(repo.getCategory(A, category).designKey).toBe('fancy');

		repo.updateJobTarget(A, target, { status: 'sent', overrides: { excludeItems: [item] } });
		repo.updateJobTarget(A, target, { company: 'Acme Ltd' });
		const t = repo.getJobTarget(A, target);
		expect([t.status, t.overrides]).toEqual(['sent', { excludeItems: [item] }]);
	});

	it('a category with job targets cannot be deleted', () => {
		const { category } = seedA();
		expect(() => repo.deleteCategory(A, category)).toThrow(InvalidError);
	});
});

describe('isolation: user B can never reach user A’s rows', () => {
	it('reads', () => {
		const a = seedA();
		expect(repo.loadContent(B).entries).toEqual([]);
		expect(repo.listCategories(B)).toEqual([]);
		expect(repo.listJobTargets(B)).toEqual([]);
		expect(() => repo.getCategory(B, a.category)).toThrow(NotFoundError);
		expect(() => repo.getJobTarget(B, a.target)).toThrow(NotFoundError);
		expect(() => repo.resolveJobTarget(B, a.target)).toThrow(NotFoundError);
		expect(() => repo.resolveCategory(B, a.category)).toThrow(NotFoundError);
	});

	it('updates and deletes', () => {
		const a = seedA();
		const attempts: [string, () => void][] = [
			['updateEntry', () => repo.updateEntry(B, a.entry, { label: 'x' })],
			['setEntryArchived', () => repo.setEntryArchived(B, a.entry, true)],
			['deleteEntry', () => repo.deleteEntry(B, a.entry)],
			['updateItem', () => repo.updateItem(B, a.item, { position: 1 })],
			['setItemArchived', () => repo.setItemArchived(B, a.item, true)],
			['deleteItem', () => repo.deleteItem(B, a.item)],
			['updateVariant', () => repo.updateVariant(B, a.variant, { text: 'x' })],
			['deleteVariant', () => repo.deleteVariant(B, a.variant)],
			['updateCategory', () => repo.updateCategory(B, a.category, { name: 'x' })],
			['deleteCategory', () => repo.deleteCategory(B, a.category)],
			['updateJobTarget', () => repo.updateJobTarget(B, a.target, { company: 'x' })],
			['deleteJobTarget', () => repo.deleteJobTarget(B, a.target)]
		];
		for (const [name, fn] of attempts) expect(fn, name).toThrow(NotFoundError);
		const c = repo.loadContent(A);
		expect(c.entries[0].label).toBe('Org');
		expect(c.entries[0].items[0].variants[0].text).toBe('Did a thing');
	});

	it('attaching to someone else’s rows', () => {
		const a = seedA();
		const bCategory = repo.createCategory(B, { name: 'B', recipe });
		const bTarget = repo.createJobTarget(B, { categoryId: bCategory, company: 'B', roleTitle: 'B' });
		const attempts: [string, () => void][] = [
			['createItem on A entry', () => repo.createItem(B, a.entry)],
			['createVariant on A entry', () => repo.createVariant(B, { entryId: a.entry, text: 'x' })],
			['createVariant on A item', () => repo.createVariant(B, { itemId: a.item, text: 'x' })],
			['tag A entry', () => repo.setTags(B, { entryId: a.entry }, ['x'])],
			['tag A item', () => repo.setTags(B, { itemId: a.item }, ['x'])],
			['tag A variant', () => repo.setTags(B, { variantId: a.variant }, ['x'])],
			['job target on A category', () => repo.createJobTarget(B, { categoryId: a.category, company: 'x', roleTitle: 'x' })],
			['move B target to A category', () => repo.updateJobTarget(B, bTarget, { categoryId: a.category })]
		];
		for (const [name, fn] of attempts) expect(fn, name).toThrow(NotFoundError);
		// the failed tagging rolled back: B got no stray tags
		expect(repo.listTags(B)).toEqual([]);
	});
});

describe('resolving through the database', () => {
	it('job target overrides apply', () => {
		const a = seedA();
		expect(repo.resolveJobTarget(A, a.target).sections[0].entries[0].items).toHaveLength(1);
		repo.updateJobTarget(A, a.target, { overrides: { excludeItems: [a.item] } });
		const cv = repo.resolveJobTarget(A, a.target);
		// the role itself stays (title, dates); only its bullet is gone
		expect(cv.sections[0].entries[0].items).toEqual([]);
		expect(cv.trace.find((t) => t.id === a.item)?.reason).toBe('excluded for this job');
	});
});

describe('editor support', () => {
	it('new items and wordings are appended at the end', () => {
		const { entry, item } = seedA();
		const second = repo.createItem(A, entry);
		repo.createVariant(A, { itemId: second, text: 'Second' });
		const v2 = repo.createVariant(A, { itemId: item, text: 'Alt wording' });
		const e = repo.loadContent(A).entries[0];
		expect(e.items.find((i) => i.id === second)!.position).toBeGreaterThan(e.items.find((i) => i.id === item)!.position);
		expect(e.items.find((i) => i.id === item)!.variants.find((v) => v.id === v2)!.position).toBe(1);
	});

	it('moves entries and items, and ignores moves past the ends', () => {
		const e1 = repo.createEntry(A, { module: 'experience', label: 'Old', data: job({ start: '2010-01' }) });
		const e2 = repo.createEntry(A, { module: 'experience', label: 'New', data: job({ start: '2020-01' }) });
		const order = () => repo.loadContent(A).entries.sort((a, b) => a.position - b.position || (b.sortKey ?? '').localeCompare(a.sortKey ?? '')).map((e) => e.label);
		expect(order()).toEqual(['New', 'Old']);
		repo.moveEntry(A, e1, 'up');
		expect(order()).toEqual(['Old', 'New']);
		repo.moveEntry(A, e1, 'up');
		expect(order()).toEqual(['Old', 'New']);
		repo.moveEntry(A, e2, 'up');
		expect(order()).toEqual(['New', 'Old']);

		const i1 = repo.createItem(A, e1);
		const i2 = repo.createItem(A, e1);
		repo.moveItem(A, i2, 'up');
		const items = repo.loadContent(A).entries.find((e) => e.id === e1)!.items.sort((a, b) => a.position - b.position);
		expect(items.map((i) => i.id)).toEqual([i2, i1]);
		expect(() => repo.moveItem(B, i1, 'down')).toThrow(NotFoundError);
		expect(() => repo.moveEntry(B, e1, 'down')).toThrow(NotFoundError);
	});

	it('the revision changes on every kind of change', async () => {
		const a = seedA();
		const steps: [string, () => void][] = [
			['tag', () => repo.setTags(A, { itemId: a.item }, ['x'])],
			['wording', () => repo.updateVariant(A, a.variant, { text: 'Changed' })],
			['recipe', () => repo.updateCategory(A, a.category, { name: 'Other' })],
			['job', () => repo.updateJobTarget(A, a.target, { company: 'Other' })],
			['profile', () => repo.upsertProfile(A, { fullName: 'A', email: 'a@x.test' })],
			['delete', () => repo.deleteVariant(A, a.variant)]
		];
		let before = repo.contentRevision(A);
		for (const [name, fn] of steps) {
			await new Promise((r) => setTimeout(r, 2)); // distinct millisecond timestamps
			fn();
			const after = repo.contentRevision(A);
			expect(after, name).not.toBe(before);
			before = after;
		}
		expect(repo.contentRevision(B)).not.toBe(before);
	});

	it('rejects non-web links everywhere', () => {
		expect(() => repo.upsertProfile(A, { fullName: 'A', email: 'a@x.test', links: [{ label: 'x', url: 'javascript:alert(1)' }] })).toThrow(InvalidError);
		expect(() => repo.createEntry(A, { module: 'projects', label: 'p', data: { name: 'p', url: 'javascript:alert(1)' } })).toThrow(InvalidError);
		const { category } = seedA();
		expect(() => repo.createJobTarget(A, { categoryId: category, company: 'c', roleTitle: 'r', jobUrl: 'data:text/html,x' })).toThrow(InvalidError);
	});
});
