// Remembers which category or job the preview pane shows, then returns to the page.
import { redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/server/auth/cookies';
import { setPreview } from '$lib/server/editor';

export function GET({ url, cookies }) {
	setPreview(cookies, url.searchParams.get('sel') ?? '');
	redirect(303, safeNext(url.searchParams.get('back')));
}
