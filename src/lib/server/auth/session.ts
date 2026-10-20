// Sessions: random token in an httpOnly cookie, sha256(token) in the database.
import { and, eq, lt, ne } from 'drizzle-orm';
import { db } from '../db';
import { session, user, type Role } from '../db/schema';
import { newToken, sha256 } from './tokens';

export const SESSION_COOKIE = 'cvc_session';
const DAY = 24 * 60 * 60 * 1000;
export const SESSION_TTL = 30 * DAY;
const RENEW_BEFORE = 15 * DAY;

export type SessionUser = { id: string; name: string; email: string; role: Role };

export function createSession(userId: string, now = Date.now()) {
	const token = newToken();
	const expiresAt = now + SESSION_TTL;
	db.insert(session).values({ id: sha256(token), userId, expiresAt, createdAt: now }).run();
	return { token, expiresAt };
}

/** Returns the user for a valid token, extending the session when it is past half-life. */
export function validateSession(token: string, now = Date.now()) {
	const id = sha256(token);
	const row = db
		.select({
			expiresAt: session.expiresAt,
			user: { id: user.id, name: user.name, email: user.email, role: user.role },
			disabledAt: user.disabledAt
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, id))
		.get();
	if (!row) return null;
	if (row.expiresAt <= now || row.disabledAt) {
		db.delete(session).where(eq(session.id, id)).run();
		return null;
	}
	let expiresAt = row.expiresAt;
	if (expiresAt - now < RENEW_BEFORE) {
		expiresAt = now + SESSION_TTL;
		db.update(session).set({ expiresAt }).where(eq(session.id, id)).run();
	}
	return { user: row.user as SessionUser, expiresAt };
}

export function invalidateSession(token: string) {
	db.delete(session).where(eq(session.id, sha256(token))).run();
}

/** Logs a user out everywhere, optionally keeping the current session. */
export function invalidateUserSessions(userId: string, exceptToken?: string) {
	const where = exceptToken
		? and(eq(session.userId, userId), ne(session.id, sha256(exceptToken)))
		: eq(session.userId, userId);
	db.delete(session).where(where).run();
}

export function purgeExpiredSessions(now = Date.now()) {
	return db.delete(session).where(lt(session.expiresAt, now)).run().changes;
}
