// Database schema — mirrors docs/SCHEMA.md. Change the spec first, then this file,
// then run `npm run db:generate` to create a migration.
import { sql } from 'drizzle-orm';
import {
	sqliteTable,
	text,
	integer,
	primaryKey,
	index,
	uniqueIndex,
	check
} from 'drizzle-orm/sqlite-core';
import { MODULES, VARIANT_LENGTHS } from '../../domain/modules';
import type { Recipe, Overrides } from '../../domain/recipe';

const id = () => text('id').primaryKey();
const ms = (name: string) => integer(name, { mode: 'number' });
const createdAt = () => ms('created_at').notNull().default(sql`(unixepoch('subsec') * 1000)`);
const updatedAt = () => ms('updated_at').notNull().default(sql`(unixepoch('subsec') * 1000)`);
const ownerId = () =>
	text('owner_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' });

// ── Auth (core user row; session/account/verification arrive with the auth library in step 2)
export const user = sqliteTable('user', {
	id: id(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	role: text('role', { enum: ['admin', 'tester', 'user'] }).notNull().default('tester'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

// ── Admin / test mode
export const inviteCodes = sqliteTable('invite_codes', {
	id: id(),
	codeHash: text('code_hash').notNull().unique(),
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
	maxUses: integer('max_uses').notNull().default(1),
	uses: integer('uses').notNull().default(0),
	expiresAt: ms('expires_at'),
	revokedAt: ms('revoked_at'),
	createdAt: createdAt()
});

export const featureFlags = sqliteTable('feature_flags', {
	key: text('key').primaryKey(),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
	description: text('description')
});

export const featureFlagOverrides = sqliteTable(
	'feature_flag_overrides',
	{
		flagKey: text('flag_key')
			.notNull()
			.references(() => featureFlags.key, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		enabled: integer('enabled', { mode: 'boolean' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.flagKey, t.userId] })]
);

export const feedback = sqliteTable('feedback', {
	id: id(),
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	message: text('message').notNull(),
	route: text('route'),
	screenState: text('screen_state', { mode: 'json' }),
	createdAt: createdAt()
});

// ── Content
export const profiles = sqliteTable('profiles', {
	ownerId: text('owner_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	fullName: text('full_name').notNull(),
	email: text('email').notNull(),
	phone: text('phone'),
	location: text('location'),
	links: text('links', { mode: 'json' }).$type<{ label: string; url: string }[]>().notNull().default([]),
	updatedAt: updatedAt()
});

export const entries = sqliteTable(
	'entries',
	{
		id: id(),
		ownerId: ownerId(),
		module: text('module', { enum: MODULES }).notNull(),
		label: text('label').notNull(),
		data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
		dataVersion: integer('data_version').notNull().default(1),
		sortKey: text('sort_key'),
		position: integer('position').notNull().default(0),
		archivedAt: ms('archived_at'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('entries_owner_module').on(t.ownerId, t.module)]
);

export const items = sqliteTable(
	'items',
	{
		id: id(),
		ownerId: ownerId(),
		entryId: text('entry_id')
			.notNull()
			.references(() => entries.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		note: text('note'),
		archivedAt: ms('archived_at'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('items_owner_entry').on(t.ownerId, t.entryId)]
);

export const variants = sqliteTable(
	'variants',
	{
		id: id(),
		ownerId: ownerId(),
		entryId: text('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
		itemId: text('item_id').references(() => items.id, { onDelete: 'cascade' }),
		text: text('text').notNull(),
		length: text('length', { enum: VARIANT_LENGTHS }).notNull().default('standard'),
		isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
		position: integer('position').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		check(
			'variants_one_target',
			sql`(${t.entryId} IS NOT NULL AND ${t.itemId} IS NULL) OR (${t.entryId} IS NULL AND ${t.itemId} IS NOT NULL)`
		),
		uniqueIndex('variants_one_default_entry')
			.on(t.entryId)
			.where(sql`${t.isDefault} = 1 AND ${t.entryId} IS NOT NULL`),
		uniqueIndex('variants_one_default_item')
			.on(t.itemId)
			.where(sql`${t.isDefault} = 1 AND ${t.itemId} IS NOT NULL`),
		index('variants_owner').on(t.ownerId)
	]
);

export const tags = sqliteTable(
	'tags',
	{
		id: id(),
		ownerId: ownerId(),
		name: text('name').notNull(),
		color: text('color')
	},
	(t) => [uniqueIndex('tags_owner_name').on(t.ownerId, t.name)]
);

const tagLink = (name: string, targetCol: string, target: () => any) =>
	sqliteTable(
		name,
		{
			targetId: text(targetCol)
				.notNull()
				.references(target, { onDelete: 'cascade' }),
			tagId: text('tag_id')
				.notNull()
				.references(() => tags.id, { onDelete: 'cascade' })
		},
		(t) => [primaryKey({ columns: [t.targetId, t.tagId] })]
	);

export const entryTags = tagLink('entry_tags', 'entry_id', () => entries.id);
export const itemTags = tagLink('item_tags', 'item_id', () => items.id);
export const variantTags = tagLink('variant_tags', 'variant_id', () => variants.id);

// ── Assembly
export const categories = sqliteTable('categories', {
	id: id(),
	ownerId: ownerId(),
	name: text('name').notNull(),
	description: text('description'),
	recipe: text('recipe', { mode: 'json' }).$type<Recipe>().notNull(),
	designKey: text('design_key').notNull(),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const jobTargets = sqliteTable('job_targets', {
	id: id(),
	ownerId: ownerId(),
	categoryId: text('category_id')
		.notNull()
		.references(() => categories.id, { onDelete: 'restrict' }),
	company: text('company').notNull(),
	roleTitle: text('role_title').notNull(),
	jobUrl: text('job_url'),
	jobAdText: text('job_ad_text'),
	overrides: text('overrides', { mode: 'json' }).$type<Overrides>().notNull().default({}),
	status: text('status', { enum: ['draft', 'sent', 'archived'] }).notNull().default('draft'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

// ── Output (snapshots are immutable: no updated_at, repo exposes no update)
export const snapshots = sqliteTable('snapshots', {
	id: id(),
	ownerId: ownerId(),
	jobTargetId: text('job_target_id').references(() => jobTargets.id, { onDelete: 'set null' }),
	categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
	designKey: text('design_key').notNull(),
	engineVersion: text('engine_version').notNull(),
	resolved: text('resolved', { mode: 'json' }).notNull(),
	html: text('html').notNull(),
	pdfKey: text('pdf_key'),
	label: text('label').notNull(),
	createdAt: createdAt()
});

export const shareLinks = sqliteTable('share_links', {
	id: id(),
	ownerId: ownerId(),
	snapshotId: text('snapshot_id')
		.notNull()
		.references(() => snapshots.id, { onDelete: 'cascade' }),
	tokenHash: text('token_hash').notNull().unique(),
	createdAt: createdAt(),
	expiresAt: ms('expires_at'),
	revokedAt: ms('revoked_at')
});

// ── Reserved for AI tailoring (unused in v1)
export const aiRuns = sqliteTable('ai_runs', {
	id: id(),
	ownerId: ownerId(),
	jobTargetId: text('job_target_id').references(() => jobTargets.id, { onDelete: 'set null' }),
	kind: text('kind').notNull(),
	model: text('model').notNull(),
	inputTokens: integer('input_tokens').notNull().default(0),
	outputTokens: integer('output_tokens').notNull().default(0),
	result: text('result', { mode: 'json' }),
	createdAt: createdAt()
});

