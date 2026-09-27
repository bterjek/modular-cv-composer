// Inter (SIL Open Font License 1.1), latin + latin-ext so names like "Őrs" or "Łukasz" render properly.
import l400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?inline';
import l600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?inline';
import l700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?inline';
import e400 from '@fontsource/inter/files/inter-latin-ext-400-normal.woff2?inline';
import e600 from '@fontsource/inter/files/inter-latin-ext-600-normal.woff2?inline';
import e700 from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?inline';
import u400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import u600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
import u700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import x400 from '@fontsource/inter/files/inter-latin-ext-400-normal.woff2?url';
import x600 from '@fontsource/inter/files/inter-latin-ext-600-normal.woff2?url';
import x700 from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?url';

// unicode-range values copied from @fontsource/inter's own CSS
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const face = (src: string, weight: number, range: string) =>
	`@font-face{font-family:Inter;font-style:normal;font-display:block;font-weight:${weight};src:url(${src}) format('woff2');unicode-range:${range};}`;

const build = (f: string[]) =>
	[face(f[0], 400, LATIN), face(f[1], 600, LATIN), face(f[2], 700, LATIN), face(f[3], 400, LATIN_EXT), face(f[4], 600, LATIN_EXT), face(f[5], 700, LATIN_EXT)].join('');

/** Self-contained: for PDF, downloads and snapshots. */
export const embeddedFontCss = build([l400, l600, l700, e400, e600, e700]);
/** Cacheable same-origin files: for the live preview. */
export const linkedFontCss = build([u400, u600, u700, x400, x600, x700]);
