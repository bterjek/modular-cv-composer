// Account operations: sign-up (invite only), log-in, password change and admin-issued resets.
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../db';
import { passwordResets, user, type Role } from '../db/schema';
import { checkInvite, consumeInvite } from './invites';
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from './password';
import { createSession, invalidateUserSessions } from './session';
import { hashCode, newCode } from './tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };
const fail = (error: string, field?: string) => ({ ok: false as const, error, field });

export async function signUp(input: {
	code: string;
	name: string;
	email: string;
	password: string;
}): Promise<Result<{ userId: string; role: Role; token: string; expiresAt: number }>> {
	const email = normalizeEmail(input.email);
	const name = input.name.trim();
	if (!name) return fail('Enter your name.', 'name');
	if (!EMAIL.test(email)) return fail('Enter a valid e-mail address.', 'email');
	const pw = passwordProblem(input.password);
	if (pw) return fail(pw, 'password');

	const invite = checkInvite(input.code, email);
	if (!invite.ok) {
		return invite.reason === 'wrong-email'
			? fail('This invite code is for a different e-mail address.', 'email')
			: fail('This invite code is not valid.', 'code');
	}
	const passwordHash = await hashPassword(input.password);
	const now = Date.now();
	const userId = uuidv7();

	const created = db.transaction((tx) => {
		const exists = tx.select({ id: user.id }).from(user).where(eq(user.email, email)).get();
		if (exists) return 'exists' as const;
		if (!consumeInvite(tx, invite.id, now)) return 'invite' as const;
		tx.insert(user)
			.values({ id: userId, name, email, role: invite.role, passwordHash, createdAt: now, updatedAt: now, lastLoginAt: now })
			.run();
		return 'ok' as const;
	});
	if (created === 'exists') return fail('An account with this e-mail already exists. Log in instead.', 'email');
	if (created === 'invite') return fail('This invite code is not valid.', 'code');

	const { token, expiresAt } = createSession(userId, now);
	return { ok: true, value: { userId, role: invite.role, token, expiresAt } };
}

const BAD_LOGIN = 'E-mail or password is wrong.';

export async function logIn(emailInput: string, password: string): Promise<Result<{ token: string; expiresAt: number }>> {
	const email = normalizeEmail(emailInput);
	const row = db.select().from(user).where(eq(user.email, email)).get();
	if (!row) {
		await burnPasswordCheck(password);
		return fail(BAD_LOGIN);
	}
	if (!(await verifyPassword(row.passwordHash, password))) return fail(BAD_LOGIN);
	if (row.disabledAt) return fail('This account is disabled.');
	const now = Date.now();
	db.update(user).set({ lastLoginAt: now }).where(eq(user.id, row.id)).run();
	return { ok: true, value: createSession(row.id, now) };
}

export async function changePassword(
	userId: string,
	current: string,
	next: string,
	keepToken: string
): Promise<Result<null>> {
	const row = db.select().from(user).where(eq(user.id, userId)).get();
	if (!row || !(await verifyPassword(row.passwordHash, current))) return fail('Current password is wrong.', 'current');
	const pw = passwordProblem(next);
	if (pw) return fail(pw, 'password');
	const passwordHash = await hashPassword(next);
	db.update(user).set({ passwordHash, updatedAt: Date.now() }).where(eq(user.id, userId)).run();
	invalidateUserSessions(userId, keepToken);
	return { ok: true, value: null };
}

// ── Admin-issued password resets (no e-mail yet)
const RESET_TTL = 24 * 60 * 60 * 1000;

export function issuePasswordReset(userId: string, adminId: string, now = Date.now()) {
	const code = newCode();
	db.transaction((tx) => {
		// Only the newest reset code for a user is valid.
		tx.update(passwordResets)
			.set({ usedAt: now })
			.where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)))
			.run();
		tx.insert(passwordResets)
			.values({ id: uuidv7(), userId, codeHash: hashCode(code), createdBy: adminId, expiresAt: now + RESET_TTL, createdAt: now })
			.run();
	});
	return { code, expiresAt: now + RESET_TTL };
}

export async function usePasswordReset(emailInput: string, code: string, next: string): Promise<Result<null>> {
	const pw = passwordProblem(next);
	if (pw) return fail(pw, 'password');
	const email = normalizeEmail(emailInput);
	const now = Date.now();
	const row = db
		.select({ resetId: passwordResets.id, userId: user.id })
		.from(passwordResets)
		.innerJoin(user, eq(passwordResets.userId, user.id))
		.where(
			and(
				eq(passwordResets.codeHash, hashCode(code)),
				eq(user.email, email),
				isNull(passwordResets.usedAt),
				gt(passwordResets.expiresAt, now)
			)
		)
		.get();
	if (!row) return fail('This reset code is not valid.', 'code');
	const passwordHash = await hashPassword(next);
	const done = db.transaction((tx) => {
		const used = tx
			.update(passwordResets)
			.set({ usedAt: now })
			.where(and(eq(passwordResets.id, row.resetId), isNull(passwordResets.usedAt)))
			.run();
		if (used.changes !== 1) return false;
		tx.update(user).set({ passwordHash, updatedAt: now }).where(eq(user.id, row.userId)).run();
		return true;
	});
	if (!done) return fail('This reset code is not valid.', 'code');
	invalidateUserSessions(row.userId);
	return { ok: true, value: null };
}

// ── Admin account management (never touches CV content)
export function listUsers() {
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt,
			lastLoginAt: user.lastLoginAt,
			disabledAt: user.disabledAt
		})
		.from(user)
		.orderBy(asc(user.createdAt))
		.all();
}

export function countAdmins() {
	const r = db
		.select({ n: sql<number>`count(*)` })
		.from(user)
		.where(and(eq(user.role, 'admin'), isNull(user.disabledAt)))
		.get();
	return r?.n ?? 0;
}

/** Refuses changes that would leave no active admin. */
export function setRole(userId: string, role: Role): Result<null> {
	const row = db.select({ role: user.role, disabledAt: user.disabledAt }).from(user).where(eq(user.id, userId)).get();
	if (!row) return fail('User not found.');
	if (row.role === 'admin' && role !== 'admin' && !row.disabledAt && countAdmins() <= 1)
		return fail('There must be at least one active admin.');
	db.update(user).set({ role, updatedAt: Date.now() }).where(eq(user.id, userId)).run();
	return { ok: true, value: null };
}

export function setDisabled(userId: string, disabled: boolean): Result<null> {
	const row = db.select({ role: user.role, disabledAt: user.disabledAt }).from(user).where(eq(user.id, userId)).get();
	if (!row) return fail('User not found.');
	if (disabled && row.role === 'admin' && !row.disabledAt && countAdmins() <= 1)
		return fail('There must be at least one active admin.');
	db.update(user).set({ disabledAt: disabled ? Date.now() : null, updatedAt: Date.now() }).where(eq(user.id, userId)).run();
	if (disabled) invalidateUserSessions(userId);
	return { ok: true, value: null };
}

/** Re-checks the password before sensitive actions such as deleting the account. */
export async function checkPassword(userId: string, password: string) {
	const row = db.select({ passwordHash: user.passwordHash }).from(user).where(eq(user.id, userId)).get();
	return row ? verifyPassword(row.passwordHash, password) : false;
}
