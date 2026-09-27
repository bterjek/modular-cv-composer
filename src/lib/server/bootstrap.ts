// Runs once when the server starts: flags in sync, and a way in for the first admin.
import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { inviteCodes } from './db/schema';
import { createInvite } from './auth/invites';
import { countAdmins } from './auth/users';
import { purgeExpiredSessions } from './auth/session';
import { syncFlags } from './flags';

export const BOOTSTRAP_NOTE = 'bootstrap: first admin';

export function bootstrap(opts: { adminEmail: string | null; origin: string; log?: (m: string) => void }) {
	const log = opts.log ?? console.log;
	syncFlags();
	purgeExpiredSessions();
	if (countAdmins() > 0) return { adminInvite: null };

	if (!opts.adminEmail) {
		log('[bootstrap] No admin exists and ADMIN_EMAIL is not set — set it and restart to get an admin sign-up link.');
		return { adminInvite: null };
	}
	// The plain code cannot be recovered from its hash, so each start without an admin
	// revokes earlier bootstrap codes and prints a fresh one.
	db.update(inviteCodes)
		.set({ revokedAt: Date.now() })
		.where(and(eq(inviteCodes.note, BOOTSTRAP_NOTE), isNull(inviteCodes.revokedAt)))
		.run();
	const { code } = createInvite({
		createdBy: null,
		role: 'admin',
		email: opts.adminEmail,
		note: BOOTSTRAP_NOTE,
		maxUses: 1,
		expiresInDays: 1
	});
	const url = `${opts.origin.replace(/\/$/, '')}/signup?code=${encodeURIComponent(code)}`;
	log(`[bootstrap] No admin yet. Sign up as ${opts.adminEmail} within 24 hours: ${url}`);
	return { adminInvite: { code, url } };
}
