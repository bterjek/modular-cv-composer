// Manual review helper: VISUAL_OUT=<dir> CHROMIUM_PATH=<chromium> npx vitest run src/lib/server/render/visual.test.ts
// Writes the example CV as PDF in every design (+ one styled variant). Skipped otherwise.
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { sqlite } from '../db';
import * as repo from '../repo';
import { seedDemo } from '../demo';
import { DESIGNS, renderDocument } from '$lib/render';
import { fontsFor } from './fonts';
import { renderPdf, closePdfBrowser } from './pdf';
import type { StyleOptions } from '$lib/domain/style';

describe.skipIf(!process.env.VISUAL_OUT)('visual review', () => {
	it('renders every design', async () => {
		const out = process.env.VISUAL_OUT!;
		mkdirSync(out, { recursive: true });
		sqlite.prepare(`insert into user (id, name, email) values ('v','V','v@x.test')`).run();
		seedDemo('v');
		const cv = repo.resolveJobTarget('v', repo.listJobTargets('v')[0].id);
		const variants: [string, string, StyleOptions][] = Object.keys(DESIGNS).map((k) => [k, k, {}]);
		variants.push(['modern-styled', 'modern', { accent: 'burgundy', align: 'justify', dates: 'below', bullets: 'dash', density: 'compact', font: 'source-serif' }]);
		for (const [name, key, style] of variants) {
			const html = renderDocument(cv, { designKey: key, style, ...fontsFor(key, 'embedded', style.font) });
			writeFileSync(`${out}/${name}.pdf`, await renderPdf(html));
		}
		await closePdfBrowser();
	}, 120_000);
});
