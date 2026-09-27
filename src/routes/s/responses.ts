// Plain pages for share-link visitors (no app chrome, nothing that reveals whether a link ever existed).
const page = (status: number, title: string, text: string) =>
	new Response(
		`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
			`<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#1b2330"><h1 style="font-size:1.4rem">${title}</h1><p>${text}</p></body></html>`,
		{
			status,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'no-store',
				'X-Robots-Tag': 'noindex, nofollow',
				'Referrer-Policy': 'no-referrer',
				'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"
			}
		}
	);

export const notAvailable = () =>
	page(404, 'This CV is not available', 'The link may have expired or been withdrawn by its owner. Ask them for a new one.');
export const tooMany = () => page(429, 'Too many requests', 'Please wait a few minutes and try again.');
