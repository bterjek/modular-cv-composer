import { redirect } from '@sveltejs/kit';
import { invalidateSession } from '$lib/server/auth/session';
import { clearSessionCookie } from '$lib/server/auth/cookies';

export function POST({ locals, cookies }) {
	if (locals.sessionToken) invalidateSession(locals.sessionToken);
	clearSessionCookie(cookies);
	redirect(303, '/login');
}
