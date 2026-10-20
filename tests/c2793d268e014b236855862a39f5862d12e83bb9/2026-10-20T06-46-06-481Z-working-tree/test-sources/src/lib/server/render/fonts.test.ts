import { describe, it, expect } from 'vitest';
import { fontsFor } from './fonts';
import { DESIGNS } from '$lib/render';

describe('fonts', () => {
	it('embed or link exactly the families a design declares', () => {
		const e = fontsFor('modern', 'embedded');
		expect(e.fontCss.match(/@font-face/g)).toHaveLength(6);
		expect(e.fontCss).toContain('url(data:font/woff2;base64,');
		expect(e.fontCss).not.toContain('Source Serif');
		const l = fontsFor('modern', 'linked');
		expect(l.fontCss).not.toContain('data:');
		expect(l.fontSrc).toBe("'self'");
	});
	it('every design has its fonts available', () => {
		for (const d of Object.values(DESIGNS)) expect(fontsFor(d.key, 'embedded').fontCss.length, d.key).toBeGreaterThan(1000);
	});
});
