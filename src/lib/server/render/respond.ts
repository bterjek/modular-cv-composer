// HTTP responses for rendered CVs, shared by the owner endpoints and public share links.
import { asciiFileName } from '$lib/render/filename';

const base = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const csp = (fontSrc: string, frameAncestors: string) =>
	`default-src 'none'; style-src 'unsafe-inline'; font-src ${fontSrc}; img-src data:; script-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${frameAncestors}`;

export function htmlResponse(html: string, opts: { fontSrc: "'self'" | 'data:'; download?: string; public?: boolean }) {
	return new Response(html, {
		headers: {
			...base,
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy': csp(opts.fontSrc, opts.public ? "'none'" : "'self'"),
			...(opts.download && { 'Content-Disposition': `attachment; filename="${asciiFileName(opts.download)}"` }),
			...(opts.public && { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' })
		}
	});
}

export function pdfResponse(pdf: Buffer, name: string, opts: { public?: boolean } = {}) {
	return new Response(new Uint8Array(pdf), {
		headers: {
			...base,
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${asciiFileName(name)}"`,
			...(opts.public && { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' })
		}
	});
}
