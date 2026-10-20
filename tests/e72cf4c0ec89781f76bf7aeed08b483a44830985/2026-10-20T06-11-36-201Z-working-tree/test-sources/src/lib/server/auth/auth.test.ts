import { describe, it, expect, beforeEach } from 'vitest';
import { sqlite } from '../db';
import { createInvite, revokeInvite, checkInvite } from './invites';
import { signUp, logIn, changePassword, issuePasswordReset, usePasswordReset, setRole, setDisabled } from './users';
import { validateSession, invalidateSession, SESSION_TTL } from './session';
import { hashPassword, verifyPassword } from './password';
import { newCode, normalizeCode } from './tokens';
import { bootstrap } from '../bootstrap';

const PW = 'correct horse battery';

beforeEach(() => {
	for (const t of ['session', 'password_resets', 'feature_flag_overrides', 'invite_codes', 'user']) {
		sqlite.prepare(`delete from ${t}`).run();
	}
});

async function makeUser(email = 'a@x.test', role: 'admin' | 'tester' = 'tester') {
	const { code } = createInvite({ createdBy: null, role });
	const r = await signUp({ code, name: 'A', email, password: PW });
	if (!r.ok) throw new Error(r.error);
	return r.value;
}

describe('passwords and codes', () => {
	it('hashes and verifies', async () => {
		const h = await hashPassword(PW);
		expect(h.startsWith('scrypt$131072$8$1$')).toBe(true);
		expect(await verifyPassword(h, PW)).toBe(true);
		expect(await verifyPassword(h, PW + 'x')).toBe(false);
	});
	it('normalizes typed codes', () => {
		const c = newCode();
		expect(c).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
		expect(normalizeCode(c.toLowerCase().replace(/-/g, ' '))).toBe(c);
		expect(normalizeCode('abcd-efgh-ijkl-mnop'.replace(/i/g, 'I'))).toContain('1');
	});
});

describe('invites and sign-up', () => {
	it('signs up with a valid code and grants its role', async () => {
		const u = await makeUser('boss@x.test', 'admin');
		expect(u.role).toBe('admin');
		expect(validateSession(u.token)?.user.email).toBe('boss@x.test');
	});
	it('rejects a used-up, revoked or expired code', async () => {
		const { code, id } = createInvite({ createdBy: null, maxUses: 1 });
		expect((await signUp({ code, name: 'A', email: 'a@x.test', password: PW })).ok).toBe(true);
		expect((await signUp({ code, name: 'B', email: 'b@x.test', password: PW })).ok).toBe(false);

		const r = createInvite({ createdBy: null });
		revokeInvite(r.id);
		expect(checkInvite(r.code, 'c@x.test').ok).toBe(false);

		const e = createInvite({ createdBy: null, expiresInDays: 1 }, Date.now() - 2 * 86_400_000);
		expect(checkInvite(e.code, 'd@x.test').ok).toBe(false);
		expect(id).toBeTruthy();
	});
	it('enforces an e-mail-bound code', async () => {
		const { code } = createInvite({ createdBy: null, email: 'Only@X.test' });
		const wrong = await signUp({ code, name: 'A', email: 'other@x.test', password: PW });
		expect(wrong.ok || wrong.field).toBe('email');
		expect((await signUp({ code, name: 'A', email: ' only@x.TEST ', password: PW })).ok).toBe(true);
	});
	it('does not use up the code when the e-mail already exists', async () => {
		await makeUser('a@x.test');
		const { code } = createInvite({ createdBy: null });
		const dup = await signUp({ code, name: 'A', email: 'A@x.test', password: PW });
		expect(dup.ok).toBe(false);
		expect(checkInvite(code, 'new@x.test').ok).toBe(true);
	});
	it('rejects short passwords', async () => {
		const { code } = createInvite({ createdBy: null });
		const r = await signUp({ code, name: 'A', email: 'a@x.test', password: 'short' });
		expect(r.ok || r.field).toBe('password');
	});
});

describe('login and sessions', () => {
	it('logs in, with the same message for unknown e-mail and wrong password', async () => {
		await makeUser('a@x.test');
		const good = await logIn('A@X.test', PW);
		expect(good.ok).toBe(true);
		const wrongPw = await logIn('a@x.test', 'nope nope nope');
		const unknown = await logIn('zz@x.test', PW);
		expect(!wrongPw.ok && !unknown.ok && wrongPw.error === unknown.error).toBe(true);
	});
	it('expires, renews and invalidates sessions', async () => {
		const u = await makeUser();
		const now = Date.now();
		const renewed = validateSession(u.token, now + SESSION_TTL - 60_000);
		expect(renewed && renewed.expiresAt > u.expiresAt).toBe(true);
		expect(validateSession(u.token, now + 3 * SESSION_TTL)).toBeNull();

		const v = await makeUser('b@x.test');
		invalidateSession(v.token);
		expect(validateSession(v.token)).toBeNull();
	});
	it('password change logs out other sessions only', async () => {
		const u = await makeUser();
		const other = await logIn('a@x.test', PW);
		if (!other.ok) throw new Error();
		expect((await changePassword(u.userId, PW, PW + '!', u.token)).ok).toBe(true);
		expect(validateSession(u.token)).not.toBeNull();
		expect(validateSession(other.value.token)).toBeNull();
		expect((await logIn('a@x.test', PW + '!')).ok).toBe(true);
	});
	it('disabled users cannot log in and lose their sessions', async () => {
		await makeUser('boss@x.test', 'admin');
		const u = await makeUser('t@x.test');
		expect(setDisabled(u.userId, true).ok).toBe(true);
		expect(validateSession(u.token)).toBeNull();
		expect((await logIn('t@x.test', PW)).ok).toBe(false);
	});
});

describe('admin-issued resets', () => {
	it('works once, only for the right e-mail, and logs out everywhere', async () => {
		const admin = await makeUser('boss@x.test', 'admin');
		const u = await makeUser('t@x.test');
		const { code } = issuePasswordReset(u.userId, admin.userId);
		expect((await usePasswordReset('boss@x.test', code, 'a brand new password')).ok).toBe(false);
		expect((await usePasswordReset('t@x.test', code, 'a brand new password')).ok).toBe(true);
		expect((await usePasswordReset('t@x.test', code, 'another new password')).ok).toBe(false);
		expect(validateSession(u.token)).toBeNull();
		expect((await logIn('t@x.test', 'a brand new password')).ok).toBe(true);
	});
	it('a newer reset code cancels the older one', async () => {
		const admin = await makeUser('boss@x.test', 'admin');
		const u = await makeUser('t@x.test');
		const first = issuePasswordReset(u.userId, admin.userId);
		issuePasswordReset(u.userId, admin.userId);
		expect((await usePasswordReset('t@x.test', first.code, 'a brand new password')).ok).toBe(false);
	});
});

describe('last admin protection', () => {
	it('cannot demote or disable the only active admin', async () => {
		const a = await makeUser('boss@x.test', 'admin');
		expect(setRole(a.userId, 'tester').ok).toBe(false);
		expect(setDisabled(a.userId, true).ok).toBe(false);
		await makeUser('boss2@x.test', 'admin');
		expect(setRole(a.userId, 'tester').ok).toBe(true);
	});
});

describe('bootstrap', () => {
	it('prints a one-time admin link only while no admin exists', async () => {
		const logs: string[] = [];
		const first = bootstrap({ adminEmail: 'boss@x.test', origin: 'https://cv.test', log: (m) => logs.push(m) });
		const second = bootstrap({ adminEmail: 'boss@x.test', origin: 'https://cv.test', log: (m) => logs.push(m) });
		expect(first.adminInvite && second.adminInvite).toBeTruthy();
		// the earlier link is revoked by the restart
		expect(checkInvite(first.adminInvite!.code, 'boss@x.test').ok).toBe(false);
		const r = await signUp({ code: second.adminInvite!.code, name: 'Boss', email: 'boss@x.test', password: PW });
		expect(r.ok && r.value.role).toBe('admin');
		expect(bootstrap({ adminEmail: 'boss@x.test', origin: 'https://cv.test', log: () => {} }).adminInvite).toBeNull();
		expect(logs[1]).toContain('https://cv.test/signup?code=');
	});
});
