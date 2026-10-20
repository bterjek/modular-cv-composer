import type { ImportDraft } from '../../domain/import';
// Database schema — mirrors docs/SCHEMA.md. Change the spec first, then this file,
// then run `npm run db:generate` to create a migration.
import type { Targeting, CompositionDocument } from '../../domain/library';
import { sql } from 'drizzle-orm';
import {
	sqliteTable,
	text,
	integer,
	primaryKey,
	index,
	uniqueIndex,
	check,
	blob
} from 'drizzle-orm/sqlite-core';
import { MODULES, VARIANT_LENGTHS } from '../../domain/modules';
import type { Recipe, Overrides } from '../../domain/recipe';
import { ROLES, type Role } from '../../domain/roles';
import type { StyleOptions } from '../../domain/style';

const id = () => text('id').primaryKey();
const ms = (name: string) => integer(name, { mode: 'number' });
const createdAt = () => ms('created_at').notNull().default(sql`(unixepoch('subsec') * 1000)`);
const updatedAt = () => ms('updated_at').notNull().default(sql`(unixepoch('subsec') * 1000)`);
const ownerId = () =>
	text('owner_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' });

// Timestamps are always set explicitly from application code (Date.now()); the SQL
// defaults are only a fallback for manual inserts.

// ── Auth (own implementation, see docs/SCHEMA.md §3 "Auth")
export { ROLES, type Role };

export const user = sqliteTable('user', {
	id: id(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(), // stored lower-cased
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	role: text('role', { enum: ROLES }).notNull().default('tester'),
	passwordHash: text('password_hash').notNull(),
	lastLoginAt: ms('last_login_at'),
	disabledAt: ms('disabled_at'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(), // sha256(token); the token itself only lives in the cookie
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: ms('expires_at').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('session_user').on(t.userId)]
);

export const passwordResets = sqliteTable('password_resets', {
	id: id(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	codeHash: text('code_hash').notNull().unique(),
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
	expiresAt: ms('expires_at').notNull(),
	usedAt: ms('used_at'),
	createdAt: createdAt()
});

// ── Admin / test mode
export const inviteCodes = sqliteTable('invite_codes', {
	id: id(),
	codeHash: text('code_hash').notNull().unique(),
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
	role: text('role', { enum: ROLES }).notNull().default('tester'),
	email: text('email'), // if set, only this address can use the code
	note: text('note'),
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
	resolvedAt: ms('resolved_at'),
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
		facts: text('facts').notNull().default(''),
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
		targeting: text('targeting', { mode: 'json' }).$type<Targeting>().notNull().default({ roleFamilies: [], competencies: [], keywords: [], basis: 'unspecified', notes: '' }),
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
	style: text('style', { mode: 'json' }).$type<StyleOptions>().notNull().default({}),
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
	revokedAt: ms('revoked_at'),
	viewCount: integer('view_count').notNull().default(0), // counts only; no IPs or visitor data are stored
	lastViewedAt: ms('last_viewed_at')
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


// ── Job-ad terms: only the user's "not applicable" marks are stored; terms themselves come from ad texts.
export const termStatus = sqliteTable(
	'term_status',
	{
		ownerId: ownerId(),
		termKey: text('term_key').notNull(),
		status: text('status', { enum: ['ignored'] }).notNull(),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.ownerId, t.termKey] })]
);

// ── Source provenance and independently editable CV compositions
export const sourceDocuments = sqliteTable('source_documents', {
 id: id(), ownerId: ownerId(), filename: text('filename').notNull(),
 mediaType: text('media_type').notNull(), sha256: text('sha256').notNull(),
 extractedText: text('extracted_text'),
 targeting: text('targeting', { mode: 'json' }).$type<Targeting>().notNull(),
 createdAt: createdAt()
}, t => [index('source_documents_owner').on(t.ownerId)]);

export const sourceReferences = sqliteTable('source_references', {
 id: id(), ownerId: ownerId(),
 sourceDocumentId: text('source_document_id').notNull().references(() => sourceDocuments.id, { onDelete: 'cascade' }),
 entryId: text('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
 itemId: text('item_id').references(() => items.id, { onDelete: 'cascade' }),
 variantId: text('variant_id').references(() => variants.id, { onDelete: 'cascade' }),
 location: text('location').notNull().default(''), excerpt: text('excerpt').notNull().default(''), createdAt: createdAt()
}, t => [
 index('source_references_owner').on(t.ownerId),
 check('source_references_one_target', sql`((${t.entryId} IS NOT NULL) + (${t.itemId} IS NOT NULL) + (${t.variantId} IS NOT NULL)) = 1`)
]);

export const compositions = sqliteTable('compositions', {
 id: id(), ownerId: ownerId(), name: text('name').notNull(),
 sourceDocumentId: text('source_document_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
 designKey: text('design_key').notNull(),
 style: text('style', { mode: 'json' }).$type<StyleOptions>().notNull().default({}),
 document: text('document', { mode: 'json' }).$type<CompositionDocument>().notNull(),
 createdAt: createdAt(), updatedAt: updatedAt()
}, t => [index('compositions_owner').on(t.ownerId)]);

export const sourceFiles = sqliteTable('source_files', {
 sourceDocumentId: text('source_document_id').primaryKey().references(() => sourceDocuments.id, { onDelete: 'cascade' }),
 ownerId: ownerId(), bytes: blob('bytes', { mode: 'buffer' }).notNull()
});
export const cvImports = sqliteTable('cv_imports', {
 id: id(), ownerId: ownerId(),
 sourceDocumentId: text('source_document_id').notNull().unique().references(() => sourceDocuments.id, { onDelete: 'cascade' }),
 draft: text('draft', { mode: 'json' }).$type<ImportDraft>().notNull(),
 compositionId: text('composition_id').references(() => compositions.id, { onDelete: 'set null' }),
 acceptedAt: ms('accepted_at'), createdAt: createdAt(), updatedAt: updatedAt()
}, t => [index('cv_imports_owner').on(t.ownerId)]);

export const cvTemplates = sqliteTable('cv_templates', {
 id: id(), ownerId: ownerId(), name: text('name').notNull(),
 referenceSourceId: text('reference_source_id').references(() => sourceDocuments.id, { onDelete: 'set null' }),
 style: text('style', { mode: 'json' }).$type<StyleOptions>().notNull(),
 createdAt: createdAt()
}, t => [index('cv_templates_owner').on(t.ownerId)]);
