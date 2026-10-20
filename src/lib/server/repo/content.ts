// Owner-scoped access to CV content. Every function takes ownerId first and
// every query filters on it (docs/SCHEMA.md §6). Nothing else may import the db client for content.
import { and, eq, inArray, max, ne, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import { db } from '../db';
import { entries, entryTags, items, itemTags, profiles, tags, variantTags, variants } from '../db/schema';
import { MODULES, VARIANT_LENGTHS, entryData, webUrl, type Module, type VariantLength } from '$lib/domain/modules';
import { targetingSchema } from '$lib/domain/library';
import { tagName } from '$lib/domain/recipe';
import type { Content, EntryIn, ItemIn, VariantIn } from '$lib/domain/content';
import { entryOrder, itemOrder } from '$lib/domain/order';
import { categories, jobTargets } from '../db/schema';
import { InvalidError, NotFoundError } from './errors';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
	const r = schema.safeParse(input);
	if (!r.success) throw new InvalidError(r.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; '));
	return r.data;
};

/** Sort key for date-ordered modules, so the newest appears first. */
function sortKeyFor(module: Module, data: Record<string, unknown>): string | null {
	const pick = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : null);
	if (module === 'credentials') return pick('issued');
	if (module === 'experience' || module === 'education' || module === 'projects') return pick('start');
	return null;
}

// ── ownership guards
function ownedEntry(tx: Db, ownerId: string, id: string) {
	const row = tx.select().from(entries).where(and(eq(entries.id, id), eq(entries.ownerId, ownerId))).get();
	if (!row) throw new NotFoundError('Entry not found');
	return row;
}
function ownedItem(tx: Db, ownerId: string, id: string) {
	const row = tx.select().from(items).where(and(eq(items.id, id), eq(items.ownerId, ownerId))).get();
	if (!row) throw new NotFoundError('Item not found');
	return row;
}
function ownedVariant(tx: Db, ownerId: string, id: string) {
	const row = tx.select().from(variants).where(and(eq(variants.id, id), eq(variants.ownerId, ownerId))).get();
	if (!row) throw new NotFoundError('Variant not found');
	return row;
}

function nextPosition(tx: Db, table: typeof items | typeof variants, where: ReturnType<typeof eq>) {
	const r = tx.select({ m: max(table.position) }).from(table).where(where).get();
	return r?.m === null || r?.m === undefined ? 0 : r.m + 1;
}

// ── profile
const profileInput = z.object({
	fullName: z.string().trim().min(1).max(200),
	email: z.email(),
	phone: z.string().trim().max(50).nullish(),
	location: z.string().trim().max(200).nullish(),
	links: z.array(z.object({ label: z.string().trim().min(1).max(60), url: webUrl })).max(10).default([])
});

export function getProfile(ownerId: string) {
	return db.select().from(profiles).where(eq(profiles.ownerId, ownerId)).get() ?? null;
}

export function upsertProfile(ownerId: string, input: unknown) {
	const p = parse(profileInput, input);
	const values = { fullName: p.fullName, email: p.email, phone: p.phone ?? null, location: p.location ?? null, links: p.links, updatedAt: Date.now() };
	db.insert(profiles).values({ ownerId, ...values }).onConflictDoUpdate({ target: profiles.ownerId, set: values }).run();
}

// ── entries
const entryCreate = z.object({
	module: z.enum(MODULES),
	label: z.string().trim().min(1).max(120),
	data: z.record(z.string(), z.unknown()).default({}),
	position: z.number().int().default(0)
});

export function createEntry(ownerId: string, input: unknown): string {
	const e = parse(entryCreate, input);
	const data = parse(entryData[e.module] as z.ZodType<Record<string, unknown>>, e.data) as Record<string, unknown>;
	const id = uuidv7();
	const now = Date.now();
	db.insert(entries)
		.values({ id, ownerId, module: e.module, label: e.label, data, sortKey: sortKeyFor(e.module, data), position: e.position, createdAt: now, updatedAt: now })
		.run();
	return id;
}

const entryPatch = z.object({
	label: z.string().trim().min(1).max(120).optional(),
	data: z.record(z.string(), z.unknown()).optional(),
	position: z.number().int().optional()
});

export function updateEntry(ownerId: string, id: string, input: unknown) {
	const p = parse(entryPatch, input);
	db.transaction((tx) => {
		const row = ownedEntry(tx, ownerId, id);
		const data = p.data ? (parse(entryData[row.module] as z.ZodType<Record<string, unknown>>, p.data) as Record<string, unknown>) : undefined;
		tx.update(entries)
			.set({
				...(p.label !== undefined && { label: p.label }),
				...(p.position !== undefined && { position: p.position }),
				...(data && { data, sortKey: sortKeyFor(row.module, data) }),
				updatedAt: Date.now()
			})
			.where(and(eq(entries.id, id), eq(entries.ownerId, ownerId)))
			.run();
	});
}

export function setEntryArchived(ownerId: string, id: string, archived: boolean) {
	const r = db
		.update(entries)
		.set({ archivedAt: archived ? Date.now() : null, updatedAt: Date.now() })
		.where(and(eq(entries.id, id), eq(entries.ownerId, ownerId)))
		.run();
	if (r.changes !== 1) throw new NotFoundError('Entry not found');
}

export function deleteEntry(ownerId: string, id: string) {
	const r = db.delete(entries).where(and(eq(entries.id, id), eq(entries.ownerId, ownerId))).run();
	if (r.changes !== 1) throw new NotFoundError('Entry not found');
}

// ── items
// Update schemas never carry .default(): with Zod 4, defaults also fill fields left out of a
// .partial() parse, which would silently reset them on every update.
const itemFields = z.object({ position: z.number().int(), note: z.string().max(500).nullish(), facts: z.string().trim().max(10000).optional() });
const itemCreate = itemFields.partial({ position: true });
const itemPatch = itemFields.partial();

export function createItem(ownerId: string, entryId: string, input: unknown = {}): string {
	const i = parse(itemCreate, input);
	const id = uuidv7();
	db.transaction((tx) => {
		ownedEntry(tx, ownerId, entryId);
		const now = Date.now();
		const position = i.position ?? nextPosition(tx, items, eq(items.entryId, entryId));
		tx.insert(items).values({ id, ownerId, entryId, position, note: i.note ?? null, facts: i.facts ?? '', createdAt: now, updatedAt: now }).run();
	});
	return id;
}

export function updateItem(ownerId: string, id: string, input: unknown) {
	const p = parse(itemPatch, input);
	const r = db
		.update(items)
		.set({ ...(p.position !== undefined && { position: p.position }), ...(p.note !== undefined && { note: p.note ?? null }), ...(p.facts !== undefined && { facts: p.facts }), updatedAt: Date.now() })
		.where(and(eq(items.id, id), eq(items.ownerId, ownerId)))
		.run();
	if (r.changes !== 1) throw new NotFoundError('Item not found');
}

export function setItemArchived(ownerId: string, id: string, archived: boolean) {
	const r = db
		.update(items)
		.set({ archivedAt: archived ? Date.now() : null, updatedAt: Date.now() })
		.where(and(eq(items.id, id), eq(items.ownerId, ownerId)))
		.run();
	if (r.changes !== 1) throw new NotFoundError('Item not found');
}

export function deleteItem(ownerId: string, id: string) {
	const r = db.delete(items).where(and(eq(items.id, id), eq(items.ownerId, ownerId))).run();
	if (r.changes !== 1) throw new NotFoundError('Item not found');
}

// ── variants
const variantCreate = z
	.object({
		entryId: z.string().optional(),
		itemId: z.string().optional(),
		text: z.string().trim().min(1).max(2000),
		targeting: targetingSchema.default(() => targetingSchema.parse({})),
		length: z.enum(VARIANT_LENGTHS).default('standard'),
		isDefault: z.boolean().default(false),
		position: z.number().int().optional()
	})
	.refine((v) => Boolean(v.entryId) !== Boolean(v.itemId), 'Attach the wording to either an entry or an item');

function clearDefault(tx: Db, ownerId: string, target: { entryId: string | null; itemId: string | null }, exceptId?: string) {
	const where = [
		eq(variants.ownerId, ownerId),
		target.entryId ? eq(variants.entryId, target.entryId) : eq(variants.itemId, target.itemId!),
		...(exceptId ? [ne(variants.id, exceptId)] : [])
	];
	tx.update(variants).set({ isDefault: false }).where(and(...where)).run();
}

export function createVariant(ownerId: string, input: unknown): string {
	const v = parse(variantCreate, input);
	const id = uuidv7();
	db.transaction((tx) => {
		if (v.entryId) ownedEntry(tx, ownerId, v.entryId);
		if (v.itemId) ownedItem(tx, ownerId, v.itemId);
		const target = { entryId: v.entryId ?? null, itemId: v.itemId ?? null };
		if (v.isDefault) clearDefault(tx, ownerId, target);
		const now = Date.now();
		const position = v.position ?? nextPosition(tx, variants, target.entryId ? eq(variants.entryId, target.entryId) : eq(variants.itemId, target.itemId!));
		tx.insert(variants)
			.values({ id, ownerId, ...target, text: v.text, targeting: v.targeting, length: v.length, isDefault: v.isDefault, position, createdAt: now, updatedAt: now })
			.run();
	});
	return id;
}

const variantPatch = z.object({
	targeting: targetingSchema.optional(),
	text: z.string().trim().min(1).max(2000).optional(),
	length: z.enum(VARIANT_LENGTHS).optional(),
	isDefault: z.boolean().optional(),
	position: z.number().int().optional()
});

export function updateVariant(ownerId: string, id: string, input: unknown) {
	const p = parse(variantPatch, input);
	db.transaction((tx) => {
		const row = ownedVariant(tx, ownerId, id);
		if (p.isDefault) clearDefault(tx, ownerId, row, id);
		tx.update(variants)
			.set({ ...p, updatedAt: Date.now() })
			.where(and(eq(variants.id, id), eq(variants.ownerId, ownerId)))
			.run();
	});
}

export function deleteVariant(ownerId: string, id: string) {
	const r = db.delete(variants).where(and(eq(variants.id, id), eq(variants.ownerId, ownerId))).run();
	if (r.changes !== 1) throw new NotFoundError('Variant not found');
}

// ── tags
export type TagTarget = { entryId: string } | { itemId: string } | { variantId: string };

function ensureTags(tx: Db, ownerId: string, names: string[]): string[] {
	const clean = [...new Set(names.map((n) => parse(tagName, n)))];
	if (clean.length === 0) return [];
	for (const name of clean) tx.insert(tags).values({ id: uuidv7(), ownerId, name }).onConflictDoNothing().run();
	return tx
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.ownerId, ownerId), inArray(tags.name, clean)))
		.all()
		.map((t) => t.id);
}

/** Replaces the tags on one entry, item or variant. */
export function setTags(ownerId: string, target: TagTarget, names: string[]) {
	db.transaction((tx) => {
		const ids = ensureTags(tx, ownerId, names);
		if ('entryId' in target) {
			ownedEntry(tx, ownerId, target.entryId);
			tx.update(entries).set({ updatedAt: Date.now() }).where(eq(entries.id, target.entryId)).run();
			tx.delete(entryTags).where(eq(entryTags.targetId, target.entryId)).run();
			for (const tagId of ids) tx.insert(entryTags).values({ targetId: target.entryId, tagId }).run();
		} else if ('itemId' in target) {
			ownedItem(tx, ownerId, target.itemId);
			tx.update(items).set({ updatedAt: Date.now() }).where(eq(items.id, target.itemId)).run();
			tx.delete(itemTags).where(eq(itemTags.targetId, target.itemId)).run();
			for (const tagId of ids) tx.insert(itemTags).values({ targetId: target.itemId, tagId }).run();
		} else {
			ownedVariant(tx, ownerId, target.variantId);
			tx.update(variants).set({ updatedAt: Date.now() }).where(eq(variants.id, target.variantId)).run();
			tx.delete(variantTags).where(eq(variantTags.targetId, target.variantId)).run();
			for (const tagId of ids) tx.insert(variantTags).values({ targetId: target.variantId, tagId }).run();
		}
	});
}

export function listTags(ownerId: string) {
	return db.select({ id: tags.id, name: tags.name, color: tags.color }).from(tags).where(eq(tags.ownerId, ownerId)).orderBy(tags.name).all();
}

// ── everything, shaped for the engine
export function loadContent(ownerId: string): Content {
	const profile = getProfile(ownerId);
	const tagMap = (link: typeof entryTags | typeof itemTags | typeof variantTags) => {
		const rows = db
			.select({ targetId: link.targetId, name: tags.name })
			.from(link)
			.innerJoin(tags, eq(link.tagId, tags.id))
			.where(eq(tags.ownerId, ownerId))
			.all();
		const m = new Map<string, string[]>();
		for (const r of rows) m.set(r.targetId, [...(m.get(r.targetId) ?? []), r.name].sort());
		return m;
	};
	const eTags = tagMap(entryTags);
	const iTags = tagMap(itemTags);
	const vTags = tagMap(variantTags);

	const vRows = db.select().from(variants).where(eq(variants.ownerId, ownerId)).all();
	const toVariant = (v: (typeof vRows)[number]): VariantIn => ({
		id: v.id,
		text: v.text,
		targeting: v.targeting,
		length: v.length as VariantLength,
		isDefault: v.isDefault,
		position: v.position,
		tags: vTags.get(v.id) ?? []
	});
	const byEntry = new Map<string, VariantIn[]>();
	const byItem = new Map<string, VariantIn[]>();
	for (const v of vRows) {
		if (v.entryId) byEntry.set(v.entryId, [...(byEntry.get(v.entryId) ?? []), toVariant(v)]);
		if (v.itemId) byItem.set(v.itemId, [...(byItem.get(v.itemId) ?? []), toVariant(v)]);
	}

	const itemsByEntry = new Map<string, ItemIn[]>();
	for (const i of db.select().from(items).where(eq(items.ownerId, ownerId)).all()) {
		const it: ItemIn = { id: i.id, facts: i.facts, position: i.position, archived: i.archivedAt !== null, tags: iTags.get(i.id) ?? [], variants: byItem.get(i.id) ?? [] };
		itemsByEntry.set(i.entryId, [...(itemsByEntry.get(i.entryId) ?? []), it]);
	}

	const entryList: EntryIn[] = db
		.select()
		.from(entries)
		.where(eq(entries.ownerId, ownerId))
		.all()
		.map((e) => ({
			id: e.id,
			module: e.module,
			label: e.label,
			data: e.data,
			sortKey: e.sortKey,
			position: e.position,
			archived: e.archivedAt !== null,
			tags: eTags.get(e.id) ?? [],
			variants: byEntry.get(e.id) ?? [],
			items: itemsByEntry.get(e.id) ?? []
		}));

	return {
		profile: profile && { fullName: profile.fullName, email: profile.email, phone: profile.phone, location: profile.location, links: profile.links },
		entries: entryList
	};
}

// ── ordering (editor "move up / move down")
/** Moves an entry one place within its section. Moving fixes a manual order for that section. */
export function moveEntry(ownerId: string, id: string, direction: 'up' | 'down') {
	db.transaction((tx) => {
		const row = ownedEntry(tx, ownerId, id);
		const list = tx
			.select({ id: entries.id, position: entries.position, sortKey: entries.sortKey })
			.from(entries)
			.where(and(eq(entries.ownerId, ownerId), eq(entries.module, row.module)))
			.all()
			.sort(entryOrder);
		reorder(list, id, direction).forEach((e, position) =>
			tx.update(entries).set({ position }).where(eq(entries.id, e.id)).run()
		);
	});
}

export function moveItem(ownerId: string, id: string, direction: 'up' | 'down') {
	db.transaction((tx) => {
		const row = ownedItem(tx, ownerId, id);
		const list = tx
			.select({ id: items.id, position: items.position })
			.from(items)
			.where(and(eq(items.ownerId, ownerId), eq(items.entryId, row.entryId)))
			.all()
			.sort(itemOrder);
		reorder(list, id, direction).forEach((i, position) =>
			tx.update(items).set({ position, updatedAt: Date.now() }).where(eq(items.id, i.id)).run()
		);
	});
}

function reorder<T extends { id: string }>(list: T[], id: string, direction: 'up' | 'down'): T[] {
	const i = list.findIndex((x) => x.id === id);
	const j = direction === 'up' ? i - 1 : i + 1;
	if (i < 0 || j < 0 || j >= list.length) return list;
	const out = [...list];
	[out[i], out[j]] = [out[j], out[i]];
	return out;
}

// ── change detection for the live preview
/** Changes whenever anything that affects a rendered CV changes (edits, deletes, tags, recipes, jobs). */
export function contentRevision(ownerId: string): string {
	const parts = [entries, items, variants, categories, jobTargets].map((t) => {
		const r = db
			.select({ n: sql<number>`count(*)`, m: max(t.updatedAt) })
			.from(t)
			.where(eq(t.ownerId, ownerId))
			.get();
		return `${r?.n ?? 0}.${r?.m ?? 0}`;
	});
	const p = db.select({ u: profiles.updatedAt }).from(profiles).where(eq(profiles.ownerId, ownerId)).get();
	return [...parts, p?.u ?? 0].join('-');
}
