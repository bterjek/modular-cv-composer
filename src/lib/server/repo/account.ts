// GDPR: data export (Art. 15/20) and account deletion (Art. 17).
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { feedback, inviteCodes, user } from '../db/schema';
import { getProfile, listTags, loadContent } from './content';
import { listCategories, listJobTargets } from './assembly';
import { listSnapshots, getSnapshot, listShareLinks } from './snapshots';
import { InvalidError, NotFoundError } from './errors';

export const EXPORT_FORMAT = 'modular-cv-composer/export@1';

/** Everything stored about and by this user, as one JSON-serialisable document. */
export function exportAccount(ownerId: string) {
	const account = db
		.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt })
		.from(user)
		.where(eq(user.id, ownerId))
		.get();
	if (!account) throw new NotFoundError('User not found');
	const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);
	return {
		format: EXPORT_FORMAT,
		exportedAt: new Date().toISOString(),
		account: { ...account, createdAt: iso(account.createdAt), lastLoginAt: iso(account.lastLoginAt) },
		profile: getProfile(ownerId),
		content: loadContent(ownerId).entries,
		tags: listTags(ownerId).map((t) => t.name),
		categories: listCategories(ownerId).map((c) => ({ id: c.id, name: c.name, description: c.description, designKey: c.designKey, recipe: c.recipe })),
		jobs: listJobTargets(ownerId).map((j) => ({
			id: j.id, categoryId: j.categoryId, company: j.company, roleTitle: j.roleTitle, jobUrl: j.jobUrl, jobAdText: j.jobAdText,
			status: j.status, overrides: j.overrides, createdAt: iso(j.createdAt)
		})),
		snapshots: listSnapshots(ownerId).map((s) => ({
			...s,
			createdAt: iso(s.createdAt),
			resolved: getSnapshot(ownerId, s.id).resolved,
			shareLinks: listShareLinks(ownerId, s.id).map((l) => ({ ...l, createdAt: iso(l.createdAt), expiresAt: iso(l.expiresAt), revokedAt: iso(l.revokedAt), lastViewedAt: iso(l.lastViewedAt) }))
		})),
		feedback: db
			.select({ message: feedback.message, route: feedback.route, createdAt: feedback.createdAt })
			.from(feedback)
			.where(eq(feedback.userId, ownerId))
			.all()
			.map((f) => ({ ...f, createdAt: iso(f.createdAt) }))
	};
}

/**
 * Deletes the account and everything it owns. Content, sessions, snapshots, share links and
 * flag overrides go by foreign-key cascade; feedback is deleted explicitly (it would otherwise
 * only lose its user link). The last active admin cannot delete their account.
 */
export function deleteAccount(userId: string) {
	db.transaction((tx) => {
		const row = tx.select({ role: user.role }).from(user).where(eq(user.id, userId)).get();
		if (!row) throw new NotFoundError('User not found');
		if (row.role === 'admin') {
			const admins = tx
				.select({ n: sql<number>`count(*)` })
				.from(user)
				.where(and(eq(user.role, 'admin'), isNull(user.disabledAt)))
				.get()!.n;
			if (admins <= 1) throw new InvalidError('You are the only admin. Make someone else admin before deleting your account.');
		}
		tx.delete(feedback).where(eq(feedback.userId, userId)).run();
		// Invites this user created stay valid for the people they were sent to; only the link to the creator goes.
		tx.update(inviteCodes).set({ createdBy: null }).where(eq(inviteCodes.createdBy, userId)).run();
		tx.delete(user).where(eq(user.id, userId)).run();
	});
}
