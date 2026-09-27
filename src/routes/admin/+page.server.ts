// Admin screen. The /admin guard lives in hooks.server.ts; admins see accounts,
// invites, flags and feedback — never anyone's CV content.
import { fail } from '@sveltejs/kit';
import { ROLES, isRole } from '$lib/domain/roles';
import { createInvite, listInvites, revokeInvite } from '$lib/server/auth/invites';
import { issuePasswordReset, listUsers, setDisabled, setRole } from '$lib/server/auth/users';
import { isFlagKey, listFlags, setGlobal, setOverride } from '$lib/server/flags';
import { listFeedback } from '$lib/server/feedback';
import { env } from '$lib/server/env';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export function load() {
	const now = Date.now();
	return {
		users: listUsers(),
		invites: listInvites().map((i) => ({
			...i,
			status: i.revokedAt ? 'revoked' : i.expiresAt && i.expiresAt <= now ? 'expired' : i.uses >= i.maxUses ? 'used up' : 'active'
		})),
		flags: listFlags(),
		feedback: listFeedback(),
		roles: ROLES
	};
}

export const actions = {
	createInvite: async ({ request, locals }) => {
		const f = await request.formData();
		const role = str(f, 'role');
		if (!isRole(role)) return fail(400, { section: 'invites', error: 'Unknown role.' });
		const maxUses = Number(str(f, 'maxUses') || 1);
		const days = str(f, 'expiresInDays');
		if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000)
			return fail(400, { section: 'invites', error: 'Max uses must be between 1 and 1000.' });
		const { code } = createInvite({
			createdBy: locals.user!.id,
			role,
			email: str(f, 'email') || null,
			note: str(f, 'note') || null,
			maxUses,
			expiresInDays: days ? Number(days) : null
		});
		return { section: 'invites', code, url: `${env.origin.replace(/\/$/, '')}/signup?code=${encodeURIComponent(code)}` };
	},
	revokeInvite: async ({ request }) => {
		revokeInvite(str(await request.formData(), 'id'));
		return { section: 'invites', ok: 'Invite revoked.' };
	},
	setRole: async ({ request }) => {
		const f = await request.formData();
		const role = str(f, 'role');
		if (!isRole(role)) return fail(400, { section: 'users', error: 'Unknown role.' });
		const r = setRole(str(f, 'id'), role);
		return r.ok ? { section: 'users', ok: 'Role updated.' } : fail(400, { section: 'users', error: r.error });
	},
	setDisabled: async ({ request, locals }) => {
		const f = await request.formData();
		const id = str(f, 'id');
		const disabled = str(f, 'disabled') === 'true';
		if (disabled && id === locals.user!.id) return fail(400, { section: 'users', error: 'You cannot disable your own account.' });
		const r = setDisabled(id, disabled);
		return r.ok ? { section: 'users', ok: disabled ? 'Account disabled.' : 'Account enabled.' } : fail(400, { section: 'users', error: r.error });
	},
	issueReset: async ({ request, locals }) => {
		const f = await request.formData();
		const { code } = issuePasswordReset(str(f, 'id'), locals.user!.id);
		return { section: 'users', resetFor: str(f, 'email'), code };
	},
	setFlag: async ({ request }) => {
		const f = await request.formData();
		const key = str(f, 'key');
		if (!isFlagKey(key)) return fail(400, { section: 'flags', error: 'Unknown flag.' });
		setGlobal(key, str(f, 'enabled') === 'true');
		return { section: 'flags', ok: `${key} updated.` };
	},
	setOverride: async ({ request }) => {
		const f = await request.formData();
		const key = str(f, 'key');
		const userId = str(f, 'userId');
		const value = str(f, 'value');
		if (!isFlagKey(key) || !userId) return fail(400, { section: 'flags', error: 'Pick a flag and a user.' });
		setOverride(key, userId, value === 'on' ? true : value === 'off' ? false : null);
		return { section: 'flags', ok: `${key} override saved.` };
	}
};
