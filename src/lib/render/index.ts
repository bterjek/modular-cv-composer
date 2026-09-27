// Turns a ResolvedCV into one standalone HTML document. No scripts, no external
// requests except the fonts the caller passes in; the document carries its own CSP.
import type { ResolvedCV } from '$lib/domain/content';
import { h, raw } from './html';
import { modern } from './designs/modern';
import { classic } from './designs/classic';
import type { Design } from './designs/types';

export const DESIGNS: Record<string, Design> = { modern, classic };
export const DEFAULT_DESIGN = 'modern';
export const designList = () => Object.values(DESIGNS).map((d) => ({ key: d.key, name: d.name, description: d.description }));

/** Unknown keys (e.g. the placeholder 'default' from step 3) fall back to the default design. */
export const getDesign = (key: string | null | undefined) => DESIGNS[key ?? ''] ?? DESIGNS[DEFAULT_DESIGN];

export type RenderOptions = {
	designKey?: string | null;
	/** @font-face rules: data: URLs for standalone/PDF output, same-origin URLs for the preview. */
	fontCss: string;
	/** Value for the CSP font-src directive matching fontCss. */
	fontSrc: "data:" | "'self'";
};

export function renderDocument(cv: ResolvedCV, opts: RenderOptions): string {
	const design = getDesign(opts.designKey);
	const title = cv.profile?.fullName ? `${cv.profile.fullName} — CV` : 'CV';
	const csp = `default-src 'none'; style-src 'unsafe-inline'; font-src ${opts.fontSrc}; img-src data:; script-src 'none'; base-uri 'none'; form-action 'none'`;
	return (
		'<!doctype html>\n' +
		h`<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="generator" content="Modular CV Composer (${design.key}, engine ${cv.engineVersion})" />
<title>${title}</title>
<style>${raw(opts.fontCss)}${raw(design.css)}</style>
</head>
<body>
${design.render(cv)}
</body>
</html>
`.value
	);
}
