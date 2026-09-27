import { fail, redirect } from '@sveltejs/kit';
import { changePassword, checkPassword } from '$lib/server/auth/users';
import { clearSessionCookie } from '$lib/server/auth/cookies';
import { hit } from '$lib/server/auth/rate-limit';
import * as repo from '$lib/server/repo';
import { MIN_PASSWORD } from '$lib/server/auth/password';

export const load = () => ({ minPassword: MIN_PASSWORD });

export const actions = {
	password: async ({ request, locals }) => {
		const f = await request.formData();
		const next = String(f.get('password') ?? '');
		if (next !== String(f.get('confirm') ?? '')) return fail(400, { error: 'The two new passwords do not match.' });
		const r = await changePassword(locals.user!.id, String(f.get('current') ?? ''), next, locals.sessionToken!);
		if (!r.ok) return fail(400, { error: r.error });
		return { done: true };
	},
	deleteAccount: async ({ request, locals, cookies }) => {
		const f = await request.formData();
		if (!hit(`delete:${locals.user!.id}`, 5, 15 * 60_000).allowed) return fail(429, { deleteError: 'Too many attempts. Wait 15 minutes.' });
		if (String(f.get('confirm') ?? '').trim() !== 'DELETE') return fail(400, { deleteError: 'Type DELETE in capitals to confirm.' });
		if (!(await checkPassword(locals.user!.id, String(f.get('password') ?? '')))) return fail(400, { deleteError: 'Password is wrong.' });
		try {
			repo.deleteAccount(locals.user!.id);
		} catch (e) {
			if (e instanceof repo.InvalidError) return fail(400, { deleteError: e.message });
			throw e;
		}
		clearSessionCookie(cookies);
		redirect(303, '/login?deleted=1');
	}
};
