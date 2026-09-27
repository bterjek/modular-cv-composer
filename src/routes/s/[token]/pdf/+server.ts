// Public share link as PDF. Rate-limited per visitor: PDF rendering is the expensive part of the app.
import * as repo from '$lib/server/repo';
import { renderPdf } from '$lib/server/render/pdf';
import { pdfResponse } from '$lib/server/render/respond';
import { hit } from '$lib/server/auth/rate-limit';
import { notAvailable, tooMany } from '../../responses';

export async function GET({ params, getClientAddress }) {
	if (!hit(`share-pdf:${getClientAddress()}`, 10, 10 * 60_000).allowed) return tooMany();
	const s = repo.openShareLink(params.token);
	if (!s) return notAvailable();
	return pdfResponse(await renderPdf(s.html), `${s.fullName ?? 'CV'} - CV.pdf`, { public: true });
}
