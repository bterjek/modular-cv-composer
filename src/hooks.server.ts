import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { env } from '$lib/server/env';
import { bootstrap } from '$lib/server/bootstrap';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';
import { setSessionCookie, clearSessionCookie } from '$lib/server/auth/cookies';

export const init: ServerInit = () => {
	console.log(`[startup] APP_ENV=${env.appEnv} ORIGIN=${env.origin}`);
	bootstrap({ adminEmail: env.adminEmail, origin: env.origin });
};

const PUBLIC = ['/login', '/signup', '/reset', '/healthz'];
const isPublic = (path: string) => PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.user = null;
	event.locals.sessionToken = null;
	if (token) {
		const s = validateSession(token);
		if (s) {
			event.locals.user = s.user;
			event.locals.sessionToken = token;
			setSessionCookie(event.cookies, token, s.expiresAt);
		} else {
			clearSessionCookie(event.cookies);
		}
	}

	const path = event.url.pathname;
	if (!event.locals.user && !isPublic(path)) {
		const next = path === '/' ? '' : `?next=${encodeURIComponent(path + event.url.search)}`;
		redirect(303, `/login${next}`);
	}
	if ((path === '/admin' || path.startsWith('/admin/')) && event.locals.user?.role !== 'admin') {
		redirect(303, '/');
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (env.secureCookies) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	return response;
};
