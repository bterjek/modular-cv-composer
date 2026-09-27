import { fail } from '@sveltejs/kit';
import { changePassword } from '$lib/server/auth/users';
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
	}
};
