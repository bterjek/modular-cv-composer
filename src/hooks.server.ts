import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { env } from '$lib/server/env';
import { bootstrap } from '$lib/server/bootstrap';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';
import { setSessionCookie, clearSessionCookie } from '$lib/server/auth/cookies';
import { closePdfBrowser } from '$lib/server/render/pdf';

export const init: ServerInit = () => {
	console.log(`[startup] APP_ENV=${env.appEnv} ORIGIN=${env.origin}`);
	if (env.appEnv !== 'development' && (!env.operator.name || !env.operator.contact)) {
		console.warn('[startup] OPERATOR_NAME / OPERATOR_CONTACT are not set — the privacy notice shows placeholders. Set them before inviting testers.');
	}
	bootstrap({ adminEmail: env.adminEmail, origin: env.origin });
	// adapter-node emits this on SIGTERM/SIGINT after in-flight requests finish
	process.on('sveltekit:shutdown', () => void closePdfBrowser());
};

const PUBLIC = ['/login', '/signup', '/reset', '/healthz', '/privacy', '/s'];
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
	// Defaults only: routes with stricter needs (public share links) set their own.
	const setDefault = (k: string, v: string) => response.headers.has(k) || response.headers.set(k, v);
	setDefault('X-Content-Type-Options', 'nosniff');
	setDefault('Referrer-Policy', 'same-origin');
	setDefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (env.secureCookies) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	return response;
};
