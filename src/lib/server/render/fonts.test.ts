import { describe, it, expect } from 'vitest';
import { embeddedFontCss, linkedFontCss } from './fonts';

describe('fonts', () => {
	it('embeds six Inter faces as data URLs and links them for preview', () => {
		expect(embeddedFontCss.match(/@font-face/g)).toHaveLength(6);
		expect(embeddedFontCss).toContain('url(data:font/woff2;base64,');
		expect(linkedFontCss).not.toContain('data:');
		expect(linkedFontCss.match(/\.woff2\)/g)).toHaveLength(6);
	});
});
