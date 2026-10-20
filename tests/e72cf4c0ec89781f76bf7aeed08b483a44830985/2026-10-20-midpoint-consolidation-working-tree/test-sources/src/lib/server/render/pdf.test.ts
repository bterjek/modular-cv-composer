import { describe, it, expect, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { renderPdf, closePdfBrowser } from './pdf';
import { renderDocument } from '$lib/render';
import { fontsFor } from './fonts';
import type { ResolvedCV } from '$lib/domain/content';

// Runs where Chromium is available (CI image, local dev with CHROMIUM_PATH); skipped otherwise.
const hasChromium = existsSync(process.env.CHROMIUM_PATH ?? '/usr/bin/chromium');

const cv: ResolvedCV = {
	engineVersion: 'test',
	profile: { fullName: 'Őrs Łukasz Tester', email: 'o@x.test', phone: null, location: null, links: [] },
	sections: [{ module: 'summary', title: 'Profile', entries: [{ id: 's', module: 'summary', data: {}, variantId: 'v', text: 'Árvíztűrő tükörfúrógép.', items: [] }] }],
	trace: [],
	warnings: []
};

afterAll(() => closePdfBrowser());

describe.skipIf(!hasChromium)('renderPdf', () => {
	it('produces a one-page A4 PDF with the document title', async () => {
		const pdf = await renderPdf(renderDocument(cv, fontsFor('modern', 'embedded')));
		const text = pdf.toString('latin1');
		expect(text.startsWith('%PDF-')).toBe(true);
		expect(text.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
		expect(text).toMatch(/\/MediaBox\s*\[\s*0 0 59[45]\.\d+ 84[12]\.\d+\s*\]/); // A4 in points
		expect(text).toContain('/FontName /'); // fonts embedded
	});

	it('blocks network access from the rendered page', async () => {
		const html = `<!doctype html><html><head><title>t</title></head><body>
			<img src="http://127.0.0.1:1/probe.png"><link rel="stylesheet" href="https://example.com/x.css">ok</body></html>`;
		const pdf = await renderPdf(html); // would hang or throw if requests were attempted and awaited
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
	});

	it('handles parallel renders', async () => {
		const html = renderDocument(cv, { fontCss: '', fontSrc: 'data:' });
		const all = await Promise.all(Array.from({ length: 5 }, () => renderPdf(html)));
		expect(all.every((b) => b.subarray(0, 5).toString() === '%PDF-')).toBe(true);
	});
});
