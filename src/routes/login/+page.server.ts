import { fail, redirect } from '@sveltejs/kit';
import { logIn } from '$lib/server/auth/users';
import { setSessionCookie, safeNext } from '$lib/server/auth/cookies';
import { hit } from '$lib/server/auth/rate-limit';

export function load({ locals, url }) {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
}

export const actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '');
		const password = String(f.get('password') ?? '');
		const ip = getClientAddress();
		const limited = [hit(`login:ip:${ip}`, 30, 15 * 60_000), hit(`login:email:${email.toLowerCase()}`, 10, 15 * 60_000)];
		if (limited.some((l) => !l.allowed)) {
			return fail(429, { email, error: 'Too many attempts. Wait 15 minutes and try again.' });
		}
		const r = await logIn(email, password);
		if (!r.ok) return fail(400, { email, error: r.error });
		setSessionCookie(cookies, r.value.token, r.value.expiresAt);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
