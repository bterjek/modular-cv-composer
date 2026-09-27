import { fail } from '@sveltejs/kit';
import { usePasswordReset } from '$lib/server/auth/users';
import { hit } from '$lib/server/auth/rate-limit';
import { MIN_PASSWORD } from '$lib/server/auth/password';

export const load = () => ({ minPassword: MIN_PASSWORD });

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '');
		const code = String(f.get('code') ?? '');
		const password = String(f.get('password') ?? '');
		if (!hit(`reset:ip:${getClientAddress()}`, 10, 60 * 60_000).allowed) {
			return fail(429, { email, error: 'Too many attempts. Try again in an hour.' });
		}
		if (password !== String(f.get('confirm') ?? '')) return fail(400, { email, error: 'The two passwords do not match.' });
		const r = await usePasswordReset(email, code, password);
		if (!r.ok) return fail(400, { email, error: r.error });
		return { done: true };
	}
};
