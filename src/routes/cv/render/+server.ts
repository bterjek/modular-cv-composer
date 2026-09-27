// GET /cv/render?category=…|target=…&format=preview|html|pdf
//   preview — HTML for the sandboxed preview iframe (fonts from this server, cacheable)
//   html    — standalone HTML download (fonts embedded, works offline)
//   pdf     — A4 PDF download (behind the render.pdf feature flag while testing)
import { error } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { renderDocument } from '$lib/render';
import { fontsFor } from '$lib/server/render/fonts';
import { CLICK_SCRIPT_HASH } from '$lib/server/render/clickable';
import { renderPdf } from '$lib/server/render/pdf';
import { isEnabled } from '$lib/server/flags';
import { hit } from '$lib/server/auth/rate-limit';
import { asciiFileName } from '$lib/render/filename';
import { styleOptions } from '$lib/domain/style';

const FORMATS = ['preview', 'html', 'pdf'] as const;

const disposition = (name: string) => `attachment; filename="${asciiFileName(name)}"`;

export async function GET({ locals, url }) {
	const ownerId = locals.user!.id;
	const format = (url.searchParams.get('format') ?? 'preview') as (typeof FORMATS)[number];
	if (!FORMATS.includes(format)) error(400, 'Unknown format');
	const categoryId = url.searchParams.get('category');
	const targetId = url.searchParams.get('target');

	let cv, designKey: string, suffix: string, rawStyle: unknown;
	try {
		if (targetId) {
			const t = repo.getJobTarget(ownerId, targetId);
			cv = repo.resolveJobTarget(ownerId, targetId);
			const cat = repo.getCategory(ownerId, t.categoryId);
			designKey = cat.designKey;
			rawStyle = cat.style;
			suffix = t.company;
		} else if (categoryId) {
			const c = repo.getCategory(ownerId, categoryId);
			cv = repo.resolveCategory(ownerId, categoryId);
			designKey = c.designKey;
			rawStyle = c.style;
			suffix = c.name;
		} else error(400, 'Pass category or target');
	} catch (e) {
		if (e instanceof repo.NotFoundError) error(404, 'Not found');
		throw e;
	}

	const style = styleOptions.parse(rawStyle ?? {});
	const baseName = `${cv.profile?.fullName ?? 'CV'} — CV (${suffix})`;
	const common = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

	if (format === 'preview') {
		const clickable = url.searchParams.get('click') === '1';
		// A script-enabled sandbox has an opaque origin and cannot load same-origin fonts, so the clickable preview embeds them.
		const fonts = fontsFor(designKey, clickable ? 'embedded' : 'linked', style.font);
		const html = renderDocument(cv, { designKey, style, ...fonts, ...(clickable && { clickable: { scriptHash: CLICK_SCRIPT_HASH } }) });
		return new Response(html, {
			headers: {
				...common,
				'Content-Type': 'text/html; charset=utf-8',
				'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; font-src ${fonts.fontSrc}; img-src data:; script-src ${clickable ? `'sha256-${CLICK_SCRIPT_HASH}'` : "'none'"}; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`
			}
		});
	}

	const standalone = renderDocument(cv, { designKey, style, ...fontsFor(designKey, 'embedded', style.font) });
	if (format === 'html') {
		return new Response(standalone, {
			headers: { ...common, 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': disposition(`${baseName}.html`) }
		});
	}

	if (!isEnabled('render.pdf', ownerId)) error(403, 'PDF export is not switched on for your account yet.');
	if (!hit(`pdf:${ownerId}`, 30, 10 * 60_000).allowed) error(429, 'Too many PDF exports. Wait a few minutes.');
	const pdf = await renderPdf(standalone);
	return new Response(new Uint8Array(pdf), {
		headers: { ...common, 'Content-Type': 'application/pdf', 'Content-Disposition': disposition(`${baseName}.pdf`) }
	});
}
