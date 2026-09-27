// Shared helpers for editor form actions: consistent error handling and input parsing.
import { error, fail } from '@sveltejs/kit';
import { InvalidError, NotFoundError } from './repo';

/** Runs a repo call; validation problems become a 400 with a message, foreign/missing rows a 404. */
export function attempt<T>(fn: () => T, context: Record<string, unknown> = {}) {
	try {
		return { ok: true as const, value: fn() };
	} catch (e) {
		if (e instanceof InvalidError) return { ok: false as const, failure: fail(400, { ...context, error: e.message }) };
		if (e instanceof NotFoundError) error(404, 'Not found');
		throw e;
	}
}

export const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
export const optStr = (f: FormData, k: string) => str(f, k) || null;
export const intOrUndefined = (f: FormData, k: string) => {
	const v = str(f, k);
	return v === '' ? undefined : Number.isInteger(Number(v)) ? Number(v) : NaN;
};
/** "Governance, audit ,  nis2" → ["governance","audit","nis2"] (validation lower-cases). */
export const tagList = (f: FormData, k: string) =>
	str(f, k)
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

import type { Cookies } from '@sveltejs/kit';
import { env } from './env';

/** Remembers what the editor's preview pane shows ("category:<id>" or "target:<id>"). */
export function setPreview(cookies: Cookies, sel: string) {
	if (!/^(category|target):[\w-]{1,64}$/.test(sel)) return;
	cookies.set('cvc_preview', sel, { path: '/edit', httpOnly: true, sameSite: 'lax', secure: env.secureCookies, maxAge: 60 * 60 * 24 * 365 });
}
