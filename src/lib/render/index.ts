// Turns a ResolvedCV into one standalone HTML document. No scripts, no external
// requests except the fonts the caller passes in; the document carries its own CSP.
import type { ResolvedCV } from '$lib/domain/content';
import { h, raw } from './html';
import { modern } from './designs/modern';
import { classic } from './designs/classic';
import { business, executive, bold } from './designs/extra';
import type { Design } from './designs/types';
import { CLICK_CSS, CLICK_SCRIPT, stripSourceMarkers } from './clickable';
import { styleCss } from './style';
import type { StyleOptions } from '$lib/domain/style';

export const DESIGNS: Record<string, Design> = { modern, classic, business, executive, bold };
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
	/** Editor preview only: keep source markers and add the click script (allowed by its sha256). */
	clickable?: { scriptHash: string };
	/** Category style choices, applied on top of the design. */
	style?: StyleOptions;
};

export function renderDocument(cv: ResolvedCV, opts: RenderOptions): string {
	const design = getDesign(opts.designKey);
	const title = cv.profile?.fullName ? `${cv.profile.fullName} — CV` : 'CV';
	const scriptSrc = opts.clickable ? `'sha256-${opts.clickable.scriptHash}'` : "'none'";
	const csp = `default-src 'none'; style-src 'unsafe-inline'; font-src ${opts.fontSrc}; img-src data:; script-src ${scriptSrc}; base-uri 'none'; form-action 'none'`;
	return (
		'<!doctype html>\n' +
		h`<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="generator" content="Modular CV Composer (${design.key}, engine ${cv.engineVersion})" />
<title>${title}</title>
<style>${raw(opts.fontCss)}${raw(design.css)}${raw(styleCss(opts.style ?? {}))}${opts.clickable ? raw(CLICK_CSS) : ''}</style>
</head>
<body>
${opts.clickable ? design.render(cv) : raw(stripSourceMarkers(design.render(cv).value))}
${opts.clickable ? raw(`<script>${CLICK_SCRIPT}</script>`) : ''}
</body>
</html>
`.value
	);
}
