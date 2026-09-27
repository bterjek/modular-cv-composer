// Owner-scoped categories (recipes) and job targets (overrides), and resolving them.
import { and, desc, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import { db } from '../db';
import { categories, jobTargets } from '../db/schema';
import { overrides as overridesSchema, recipe as recipeSchema, type Overrides } from '$lib/domain/recipe';
import { resolve } from '$lib/domain/engine';
import { loadContent } from './content';
import { InvalidError, NotFoundError } from './errors';

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
	const r = schema.safeParse(input);
	if (!r.success) throw new InvalidError(r.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; '));
	return r.data;
};

// ── categories
// Update schemas never carry .default() (see repo/content.ts).
const categoryFields = z.object({
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().max(500).nullish(),
	recipe: recipeSchema,
	designKey: z.string().trim().min(1).max(40)
});
const categoryInput = categoryFields.extend({ designKey: categoryFields.shape.designKey.default('default') });
const categoryPatch = categoryFields.partial();

export function createCategory(ownerId: string, input: unknown): string {
	const c = parse(categoryInput, input);
	const id = uuidv7();
	const now = Date.now();
	db.insert(categories)
		.values({ id, ownerId, name: c.name, description: c.description ?? null, recipe: c.recipe, designKey: c.designKey, createdAt: now, updatedAt: now })
		.run();
	return id;
}

export function updateCategory(ownerId: string, id: string, input: unknown) {
	const c = parse(categoryPatch, input);
	const r = db
		.update(categories)
		.set({ ...c, description: c.description === undefined ? undefined : (c.description ?? null), updatedAt: Date.now() })
		.where(and(eq(categories.id, id), eq(categories.ownerId, ownerId)))
		.run();
	if (r.changes !== 1) throw new NotFoundError('Category not found');
}

export function getCategory(ownerId: string, id: string) {
	const row = db.select().from(categories).where(and(eq(categories.id, id), eq(categories.ownerId, ownerId))).get();
	if (!row) throw new NotFoundError('Category not found');
	return row;
}

export function listCategories(ownerId: string) {
	return db.select().from(categories).where(eq(categories.ownerId, ownerId)).orderBy(categories.name).all();
}

export function deleteCategory(ownerId: string, id: string) {
	getCategory(ownerId, id);
	const used = db.select({ id: jobTargets.id }).from(jobTargets).where(eq(jobTargets.categoryId, id)).get();
	if (used) throw new InvalidError('This category still has job targets. Move or delete them first.');
	db.delete(categories).where(and(eq(categories.id, id), eq(categories.ownerId, ownerId))).run();
}

// ── job targets
const jobTargetFields = z.object({
	categoryId: z.string(),
	company: z.string().trim().min(1).max(120),
	roleTitle: z.string().trim().min(1).max(160),
	jobUrl: z.url().nullish(),
	jobAdText: z.string().max(50_000).nullish(),
	overrides: overridesSchema,
	status: z.enum(['draft', 'sent', 'archived'])
});
const jobTargetInput = jobTargetFields.extend({
	overrides: overridesSchema.default({}),
	status: jobTargetFields.shape.status.default('draft')
});
const jobTargetPatch = jobTargetFields.partial();

export function createJobTarget(ownerId: string, input: unknown): string {
	const j = parse(jobTargetInput, input);
	getCategory(ownerId, j.categoryId); // must be the caller's own category
	const id = uuidv7();
	const now = Date.now();
	db.insert(jobTargets)
		.values({ id, ownerId, ...j, jobUrl: j.jobUrl ?? null, jobAdText: j.jobAdText ?? null, createdAt: now, updatedAt: now })
		.run();
	return id;
}

export function updateJobTarget(ownerId: string, id: string, input: unknown) {
	const j = parse(jobTargetPatch, input);
	if (j.categoryId) getCategory(ownerId, j.categoryId);
	const r = db
		.update(jobTargets)
		.set({ ...j, updatedAt: Date.now() })
		.where(and(eq(jobTargets.id, id), eq(jobTargets.ownerId, ownerId)))
		.run();
	if (r.changes !== 1) throw new NotFoundError('Job target not found');
}

export function getJobTarget(ownerId: string, id: string) {
	const row = db.select().from(jobTargets).where(and(eq(jobTargets.id, id), eq(jobTargets.ownerId, ownerId))).get();
	if (!row) throw new NotFoundError('Job target not found');
	return row;
}

export function listJobTargets(ownerId: string) {
	return db.select().from(jobTargets).where(eq(jobTargets.ownerId, ownerId)).orderBy(desc(jobTargets.updatedAt)).all();
}

export function deleteJobTarget(ownerId: string, id: string) {
	const r = db.delete(jobTargets).where(and(eq(jobTargets.id, id), eq(jobTargets.ownerId, ownerId))).run();
	if (r.changes !== 1) throw new NotFoundError('Job target not found');
}

// ── resolving
/** A category on its own, optionally with ad-hoc overrides (e.g. a live preview while editing). */
export function resolveCategory(ownerId: string, categoryId: string, overrides: Overrides = {}) {
	const c = getCategory(ownerId, categoryId);
	return resolve(loadContent(ownerId), recipeSchema.parse(c.recipe), overridesSchema.parse(overrides));
}

export function resolveJobTarget(ownerId: string, jobTargetId: string) {
	const j = getJobTarget(ownerId, jobTargetId);
	return resolveCategory(ownerId, j.categoryId, j.overrides);
}
