// GET /cv/snapshot/<id>?format=preview|html|pdf — the owner's frozen CV, exactly as saved.
import { error } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { renderPdf } from '$lib/server/render/pdf';
import { htmlResponse, pdfResponse } from '$lib/server/render/respond';
import { isEnabled } from '$lib/server/flags';
import { hit } from '$lib/server/auth/rate-limit';

export async function GET({ locals, params, url }) {
	const ownerId = locals.user!.id;
	let snap;
	try {
		snap = repo.getSnapshot(ownerId, params.id);
	} catch (e) {
		if (e instanceof repo.NotFoundError) error(404, 'Not found');
		throw e;
	}
	const format = url.searchParams.get('format') ?? 'preview';
	const name = `${(snap.resolved as { profile?: { fullName?: string } }).profile?.fullName ?? 'CV'} - CV (${snap.label})`;
	if (format === 'preview') return htmlResponse(snap.html, { fontSrc: 'data:' });
	if (format === 'html') return htmlResponse(snap.html, { fontSrc: 'data:', download: `${name}.html` });
	if (format === 'pdf') {
		if (!isEnabled('render.pdf', ownerId)) error(403, 'PDF export is not switched on for your account yet.');
		if (!hit(`pdf:${ownerId}`, 30, 10 * 60_000).allowed) error(429, 'Too many PDF exports. Wait a few minutes.');
		return pdfResponse(await renderPdf(snap.html), `${name}.pdf`);
	}
	error(400, 'Unknown format');
}
