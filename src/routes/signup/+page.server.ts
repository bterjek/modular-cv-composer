import { fail, redirect } from '@sveltejs/kit';
import { signUp } from '$lib/server/auth/users';
import { setSessionCookie } from '$lib/server/auth/cookies';
import { hit } from '$lib/server/auth/rate-limit';
import { MIN_PASSWORD } from '$lib/server/auth/password';

export function load({ locals, url }) {
	if (locals.user) redirect(303, '/');
	return { code: url.searchParams.get('code') ?? '', minPassword: MIN_PASSWORD };
}

export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const f = await request.formData();
		const values = {
			code: String(f.get('code') ?? ''),
			name: String(f.get('name') ?? ''),
			email: String(f.get('email') ?? '')
		};
		const password = String(f.get('password') ?? '');
		if (!hit(`signup:ip:${getClientAddress()}`, 10, 60 * 60_000).allowed) {
			return fail(429, { ...values, error: 'Too many attempts. Try again in an hour.', field: undefined });
		}
		if (password !== String(f.get('confirm') ?? '')) {
			return fail(400, { ...values, error: 'The two passwords do not match.', field: 'confirm' });
		}
		const r = await signUp({ ...values, password });
		if (!r.ok) return fail(400, { ...values, error: r.error, field: r.field });
		setSessionCookie(cookies, r.value.token, r.value.expiresAt);
		redirect(303, '/');
	}
};
