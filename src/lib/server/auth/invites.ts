// Invite codes: the only way to create an account while in test mode.
import { and, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../db';
import { inviteCodes, type Role } from '../db/schema';
import { hashCode, newCode } from './tokens';

export type NewInvite = {
	createdBy: string | null;
	role?: Role;
	email?: string | null;
	note?: string | null;
	maxUses?: number;
	expiresInDays?: number | null;
};

/** Returns the plain code. It is shown once and never stored. */
export function createInvite(opts: NewInvite, now = Date.now()) {
	const code = newCode();
	const id = uuidv7();
	db.insert(inviteCodes)
		.values({
			id,
			codeHash: hashCode(code),
			createdBy: opts.createdBy,
			role: opts.role ?? 'tester',
			email: opts.email?.trim().toLowerCase() || null,
			note: opts.note?.trim() || null,
			maxUses: Math.max(1, opts.maxUses ?? 1),
			expiresAt: opts.expiresInDays ? now + opts.expiresInDays * 86_400_000 : null,
			createdAt: now
		})
		.run();
	return { id, code };
}

const usable = (now: number) =>
	and(
		isNull(inviteCodes.revokedAt),
		lt(inviteCodes.uses, inviteCodes.maxUses),
		or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now))
	);

export type InviteCheck =
	| { ok: true; id: string; role: Role; email: string | null }
	| { ok: false; reason: 'invalid' | 'wrong-email' };

/** Checks a code without using it up. Unknown, revoked, expired and used-up all look the same. */
export function checkInvite(code: string, email: string, now = Date.now()): InviteCheck {
	const row = db
		.select()
		.from(inviteCodes)
		.where(and(eq(inviteCodes.codeHash, hashCode(code)), usable(now)))
		.get();
	if (!row) return { ok: false, reason: 'invalid' };
	if (row.email && row.email !== email.trim().toLowerCase()) return { ok: false, reason: 'wrong-email' };
	return { ok: true, id: row.id, role: row.role, email: row.email };
}

/** Atomically uses one slot. Must run inside the sign-up transaction. */
export function consumeInvite(tx: Pick<typeof db, 'update'>, id: string, now = Date.now()) {
	const res = tx
		.update(inviteCodes)
		.set({ uses: sql`${inviteCodes.uses} + 1` })
		.where(and(eq(inviteCodes.id, id), usable(now)))
		.run();
	return res.changes === 1;
}

export function revokeInvite(id: string, now = Date.now()) {
	db.update(inviteCodes).set({ revokedAt: now }).where(eq(inviteCodes.id, id)).run();
}

export function listInvites() {
	return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt)).all();
}
