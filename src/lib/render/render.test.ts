import { describe, it, expect } from 'vitest';
import { renderDocument, getDesign } from './index';
import { range, month } from './format';
import { escape, safeHref } from './html';
import type { ResolvedCV } from '$lib/domain/content';

const cv = (over: Partial<ResolvedCV> = {}): ResolvedCV => ({
	engineVersion: 'test',
	profile: { fullName: 'Ádám <Tester>', email: 'a@x.test', phone: null, location: 'Győr', links: [
		{ label: 'Site', url: 'https://example.com' },
		{ label: 'Evil', url: 'javascript:alert(1)' }
	] },
	sections: [
		{ module: 'headline', title: null, entries: [{ id: 'h', module: 'headline', data: {}, variantId: 'v', text: 'Head <b>line</b>', items: [] }] },
		{ module: 'experience', title: 'Experience', entries: [{
			id: 'e', module: 'experience', data: { organization: 'Org & Co', title: 'Lead', start: '2023-03', end: null }, variantId: null, text: null,
			items: [{ id: 'i', variantId: 'v2', text: '<script>alert(1)</script> did "things"' }]
		}] },
		{ module: 'credentials', title: 'Certifications & training', entries: [
			{ id: 'c1', module: 'credentials', data: { name: 'Security', issuer: 'Academy', kind: 'course', issued: '2024-02' }, variantId: null, text: null, items: [] },
			{ id: 'c2', module: 'credentials', data: { name: 'ITIL 4', issuer: 'PeopleCert', kind: 'certification', issued: '2022-11' }, variantId: null, text: null, items: [] }
		] },
		{ module: 'languages', title: 'Languages', entries: [
			{ id: 'l1', module: 'languages', data: { language: 'Hungarian', level: 'native' }, variantId: null, text: null, items: [] },
			{ id: 'l2', module: 'languages', data: { language: 'English', level: 'C1' }, variantId: null, text: null, items: [] }
		] }
	],
	trace: [],
	warnings: [],
	...over
});

const render = (c = cv()) => renderDocument(c, { fontCss: '', fontSrc: 'data:' });

describe('renderDocument', () => {
	it('escapes every piece of user text', () => {
		const html = render();
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; did &quot;things&quot;');
		expect(html).toContain('Ádám &lt;Tester&gt;');
		expect(html).toContain('Head &lt;b&gt;line&lt;/b&gt;');
		expect(html).toContain('Org &amp; Co');
	});
	it('never renders non-http links', () => {
		const html = render();
		expect(html).toContain('href="https://example.com/"');
		expect(html).not.toContain('javascript:');
		expect(html).not.toContain('>Evil<');
	});
	it('carries a script-free CSP and no script tags at all', () => {
		const html = render().replace(/&#39;/g, "'"); // attribute entities are decoded by the browser
		expect(html).toMatch(/Content-Security-Policy" content="default-src 'none';[^"]*script-src 'none'/);
		expect(html).not.toMatch(/<script/i);
	});
	it('labels credentials by kind, never by guessing', () => {
		const html = render();
		expect(html).toMatch(/Security<span class="kind">Course<\/span>/);
		expect(html).toMatch(/ITIL 4<span class="kind">Certification<\/span>/);
	});
	it('formats dates and languages', () => {
		const html = render();
		expect(html).toContain('Mar 2023 – present');
		expect(html).toContain('Hungarian (native)');
		expect(html).toContain('English (C1 · advanced)');
		expect(range('2019-06', '2023-02')).toBe('Jun 2019 – Feb 2023');
		expect(range('2020-01', undefined)).toBe('Jan 2020');
		expect(month('bad')).toBe('');
	});
	it('puts the headline under the name, not as a section', () => {
		const html = render();
		expect(html).toContain('<p class="headline">');
		expect(html).not.toContain('class="headline"><h2>');
	});
	it('falls back to the default design for unknown keys', () => {
		expect(getDesign('default').key).toBe('modern');
		expect(getDesign(undefined).key).toBe('modern');
	});
	it('helpers', () => {
		expect(escape(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
		expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c');
		expect(safeHref('data:text/html,hi')).toBeNull();
		expect(safeHref('not a url')).toBeNull();
	});
});

import { asciiFileName } from './filename';
describe('download file names', () => {
	it('are ASCII-only and safe', () => {
		expect(asciiFileName('Ádám Tester — CV (Acme).pdf')).toBe('Adam Tester - CV (Acme).pdf');
		expect(asciiFileName('Őrs Łukasz Øster — CV.html')).toBe('Ors Lukasz Oster - CV.html');
		expect(asciiFileName('a/b\\c:"d".pdf')).toBe('abcd.pdf');
		expect(asciiFileName('日本')).toBe('CV');
	});
});
