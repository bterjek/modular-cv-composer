// Public share link: the frozen CV, no login. Not indexed, no referrer, cannot be framed elsewhere.
import * as repo from '$lib/server/repo';
import { htmlResponse } from '$lib/server/render/respond';
import { hit } from '$lib/server/auth/rate-limit';
import { notAvailable, tooMany } from '../responses';

export function GET({ params, getClientAddress }) {
	if (!hit(`share:${getClientAddress()}`, 60, 10 * 60_000).allowed) return tooMany();
	const s = repo.openShareLink(params.token);
	if (!s) return notAvailable();
	return htmlResponse(s.html, { fontSrc: 'data:', public: true });
}
