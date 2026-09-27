import type { Cookies } from '@sveltejs/kit';
import { env } from '../env';
import { SESSION_COOKIE } from './session';

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: number) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env.secureCookies,
		expires: new Date(expiresAt)
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/', secure: env.secureCookies });
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
