// Web fonts for CV designs (all SIL Open Font License 1.1, via @fontsource), latin + latin-ext
// so names like "Őrs" or "Łukasz" render properly. Each design lists the families it needs.
import { getDesign } from '$lib/render';
import type { FontFamily } from '$lib/render/designs/types';

import i400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?inline';
import i600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?inline';
import i700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?inline';
import ie400 from '@fontsource/inter/files/inter-latin-ext-400-normal.woff2?inline';
import ie600 from '@fontsource/inter/files/inter-latin-ext-600-normal.woff2?inline';
import ie700 from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?inline';
import iu400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import iu600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
import iu700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import iue400 from '@fontsource/inter/files/inter-latin-ext-400-normal.woff2?url';
import iue600 from '@fontsource/inter/files/inter-latin-ext-600-normal.woff2?url';
import iue700 from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?url';

import s400 from '@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?inline';
import s600 from '@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2?inline';
import s400i from '@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff2?inline';
import se400 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-normal.woff2?inline';
import se600 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-600-normal.woff2?inline';
import se400i from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-italic.woff2?inline';
import su400 from '@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?url';
import su600 from '@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2?url';
import su400i from '@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff2?url';
import sue400 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-normal.woff2?url';
import sue600 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-600-normal.woff2?url';
import sue400i from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-italic.woff2?url';

// unicode-range values copied from @fontsource's own CSS
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

type Face = { weight: number; style: 'normal' | 'italic'; range: string; inline: string; url: string };
const f = (weight: number, style: Face['style'], range: string, inline: string, url: string): Face => ({ weight, style, range, inline, url });

const FAMILIES: Record<FontFamily, { name: string; faces: Face[] }> = {
	inter: {
		name: 'Inter',
		faces: [
			f(400, 'normal', LATIN, i400, iu400), f(600, 'normal', LATIN, i600, iu600), f(700, 'normal', LATIN, i700, iu700),
			f(400, 'normal', LATIN_EXT, ie400, iue400), f(600, 'normal', LATIN_EXT, ie600, iue600), f(700, 'normal', LATIN_EXT, ie700, iue700)
		]
	},
	'source-serif': {
		name: 'Source Serif 4',
		faces: [
			f(400, 'normal', LATIN, s400, su400), f(600, 'normal', LATIN, s600, su600), f(400, 'italic', LATIN, s400i, su400i),
			f(400, 'normal', LATIN_EXT, se400, sue400), f(600, 'normal', LATIN_EXT, se600, sue600), f(400, 'italic', LATIN_EXT, se400i, sue400i)
		]
	}
};

export type FontMode = 'embedded' | 'linked';

/** @font-face rules for a design: data: URLs (standalone, PDF, snapshots) or same-origin files (live preview). */
export function fontsFor(designKey: string | null | undefined, mode: FontMode) {
	const css = getDesign(designKey)
		.fonts.flatMap((fam) =>
			FAMILIES[fam].faces.map(
				(x) =>
					`@font-face{font-family:'${FAMILIES[fam].name}';font-style:${x.style};font-display:block;font-weight:${x.weight};src:url(${mode === 'embedded' ? x.inline : x.url}) format('woff2');unicode-range:${x.range};}`
			)
		)
		.join('');
	return { fontCss: css, fontSrc: mode === 'embedded' ? ('data:' as const) : ("'self'" as const) };
}
