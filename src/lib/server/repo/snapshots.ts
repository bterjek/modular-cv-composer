// Snapshots: a CV frozen exactly as generated (resolved data + standalone HTML).
// There is deliberately no update function. PDFs are printed from the frozen HTML on demand,
// so they match the snapshot byte-for-byte in content without storing files.
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../db';
import { shareLinks, snapshots, user } from '../db/schema';
import { renderDocument, getDesign } from '$lib/render';
import { fontsFor } from '../render/fonts';
import { newToken, sha256 } from '../auth/tokens';
import { getCategory, getJobTarget, resolveCategory, resolveJobTarget, updateJobTarget } from './assembly';
import { InvalidError, NotFoundError } from './errors';
import type { ResolvedCV } from '$lib/domain/content';

export type SnapshotSource = { jobTargetId: string } | { categoryId: string };

export function createSnapshot(ownerId: string, source: SnapshotSource, opts: { label?: string | null; markSent?: boolean } = {}) {
	let cv: ResolvedCV, categoryId: string, jobTargetId: string | null, defaultLabel: string;
	if ('jobTargetId' in source) {
		const job = getJobTarget(ownerId, source.jobTargetId);
		cv = resolveJobTarget(ownerId, job.id);
		categoryId = job.categoryId;
		jobTargetId = job.id;
		defaultLabel = `${job.company} — ${job.roleTitle}`;
	} else {
		const c = getCategory(ownerId, source.categoryId);
		cv = resolveCategory(ownerId, c.id);
		categoryId = c.id;
		jobTargetId = null;
		defaultLabel = c.name;
	}
	if (cv.sections.length === 0) throw new InvalidError('Nothing to freeze yet — this CV has no content.');
	const designKey = getDesign(getCategory(ownerId, categoryId).designKey).key;
	const html = renderDocument(cv, { designKey, ...fontsFor(designKey, 'embedded') });
	const id = uuidv7();
	const now = Date.now();
	const label = (opts.label?.trim() || `${defaultLabel}, ${new Date(now).toISOString().slice(0, 10)}`).slice(0, 160);
	db.insert(snapshots)
		.values({ id, ownerId, jobTargetId, categoryId, designKey, engineVersion: cv.engineVersion, resolved: cv, html, label, createdAt: now })
		.run();
	if (jobTargetId && opts.markSent) updateJobTarget(ownerId, jobTargetId, { status: 'sent' });
	return id;
}

const listColumns = {
	id: snapshots.id,
	label: snapshots.label,
	jobTargetId: snapshots.jobTargetId,
	categoryId: snapshots.categoryId,
	designKey: snapshots.designKey,
	engineVersion: snapshots.engineVersion,
	createdAt: snapshots.createdAt
};

export function listSnapshots(ownerId: string, filter: { jobTargetId?: string } = {}) {
	const where = filter.jobTargetId
		? and(eq(snapshots.ownerId, ownerId), eq(snapshots.jobTargetId, filter.jobTargetId))
		: eq(snapshots.ownerId, ownerId);
	return db.select(listColumns).from(snapshots).where(where).orderBy(desc(snapshots.createdAt)).all();
}

export function getSnapshot(ownerId: string, id: string) {
	const row = db.select().from(snapshots).where(and(eq(snapshots.id, id), eq(snapshots.ownerId, ownerId))).get();
	if (!row) throw new NotFoundError('Snapshot not found');
	return row;
}

export function deleteSnapshot(ownerId: string, id: string) {
	const r = db.delete(snapshots).where(and(eq(snapshots.id, id), eq(snapshots.ownerId, ownerId))).run();
	if (r.changes !== 1) throw new NotFoundError('Snapshot not found');
}

// ── share links
export function createShareLink(ownerId: string, snapshotId: string, opts: { expiresInDays?: number | null } = {}, now = Date.now()) {
	getSnapshot(ownerId, snapshotId);
	const days = opts.expiresInDays;
	if (days !== null && days !== undefined && (!Number.isInteger(days) || days < 1 || days > 365))
		throw new InvalidError('Expiry must be between 1 and 365 days, or none.');
	const token = newToken();
	const id = uuidv7();
	db.insert(shareLinks)
		.values({ id, ownerId, snapshotId, tokenHash: sha256(token), createdAt: now, expiresAt: days ? now + days * 86_400_000 : null })
		.run();
	return { id, token };
}

export function listShareLinks(ownerId: string, snapshotId: string) {
	getSnapshot(ownerId, snapshotId);
	return db
		.select({
			id: shareLinks.id,
			createdAt: shareLinks.createdAt,
			expiresAt: shareLinks.expiresAt,
			revokedAt: shareLinks.revokedAt,
			viewCount: shareLinks.viewCount,
			lastViewedAt: shareLinks.lastViewedAt
		})
		.from(shareLinks)
		.where(and(eq(shareLinks.ownerId, ownerId), eq(shareLinks.snapshotId, snapshotId)))
		.orderBy(desc(shareLinks.createdAt))
		.all();
}

export function revokeShareLink(ownerId: string, id: string, now = Date.now()) {
	const r = db
		.update(shareLinks)
		.set({ revokedAt: now })
		.where(and(eq(shareLinks.id, id), eq(shareLinks.ownerId, ownerId), isNull(shareLinks.revokedAt)))
		.run();
	if (r.changes !== 1) throw new NotFoundError('Share link not found');
}

/**
 * Public lookup by token. Returns null for unknown, revoked or expired links and for
 * disabled owners — all indistinguishable to the visitor. Counts the view.
 */
export function openShareLink(token: string, opts: { countView?: boolean } = {}, now = Date.now()) {
	if (!/^[\w-]{20,100}$/.test(token)) return null;
	const row = db
		.select({ linkId: shareLinks.id, html: snapshots.html, label: snapshots.label, resolved: snapshots.resolved })
		.from(shareLinks)
		.innerJoin(snapshots, eq(shareLinks.snapshotId, snapshots.id))
		.innerJoin(user, eq(shareLinks.ownerId, user.id))
		.where(
			and(
				eq(shareLinks.tokenHash, sha256(token)),
				isNull(shareLinks.revokedAt),
				or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
				isNull(user.disabledAt)
			)
		)
		.get();
	if (!row) return null;
	if (opts.countView !== false) {
		db.update(shareLinks)
			.set({ viewCount: sql`${shareLinks.viewCount} + 1`, lastViewedAt: now })
			.where(eq(shareLinks.id, row.linkId))
			.run();
	}
	return { html: row.html, label: row.label, fullName: (row.resolved as ResolvedCV).profile?.fullName ?? null };
}
