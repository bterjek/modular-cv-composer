import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const bootUrl = readFileSync(process.env.SERVER_LOG, 'utf8').match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const B = 'http://localhost:3123', PW = 'correct horse battery staple';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const check = (c, l) => { console.log(`${c ? 'PASS' : 'FAIL'} ${l}`); if (!c) process.exitCode = 1; };

await p.goto(bootUrl); await p.waitForLoadState('networkidle');
await p.fill('#name', 'Admin'); await p.fill('#email', 'admin@example.test'); await p.fill('#password', PW); await p.fill('#confirm', PW);
await p.click('button.primary'); await p.waitForURL(B + '/');
await p.goto(B + '/assemble'); await p.click('text=Load example content');
await p.selectOption('#target', { index: 1 }); await p.locator('form:has(#target) button').click(); await p.waitForURL(/target=/);
const targetUrl = p.url();

const frame = p.frameLocator('iframe.preview');
await frame.locator('h1').waitFor();
check((await frame.locator('h1').textContent()) === 'Alex Example', 'preview iframe shows the designed CV');
const fontFamily = await p.frames()[1].evaluate(() => document.fonts.check('600 12px Inter')).catch((e) => 'eval-blocked');
check(fontFamily === true, `Inter loaded inside the sandboxed preview (${fontFamily})`);
check(await p.locator('text=behind the').isVisible(), 'PDF button hidden while flag is off');
const blocked = await p.request.get(targetUrl.replace('/assemble?', '/cv/render?') + '&format=pdf');
check(blocked.status() === 403, `PDF refused while flag is off (${blocked.status()})`);
await p.screenshot({ path: `${process.env.OUT}/shot-5-preview.png`, fullPage: false });

const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download HTML')]);
const htmlPath = `${process.env.OUT}/dl.html`; await dl.saveAs(htmlPath);
const html = readFileSync(htmlPath, 'utf8');
check(dl.suggestedFilename() === 'Alex Example - CV (Example Insurance plc).html', `HTML filename (${dl.suggestedFilename()})`);
check(html.includes('data:font/woff2;base64,') && !/<script/i.test(html), 'standalone HTML embeds fonts, has no scripts');

await p.goto(B + '/admin');
await p.locator('tr', { hasText: 'render.pdf' }).locator('button').click();
await p.goto(targetUrl);
const [pdfDl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download PDF')]);
await pdfDl.saveAs(`${process.env.OUT}/dl.pdf`);
const pdf = readFileSync(`${process.env.OUT}/dl.pdf`);
check(pdf.subarray(0, 5).toString() === '%PDF-', `PDF downloaded (${pdf.length} bytes, ${pdfDl.suggestedFilename()})`);

// another user cannot render this user's CV
await p.goto(B + '/admin'); await p.click('text=Create invite');
const code = (await p.locator('code.code').first().textContent()).trim();
const other = await (await browser.newContext()).newPage();
await other.goto(B + '/signup?code=' + code);
await other.fill('#name', 'T'); await other.fill('#email', 't@example.test'); await other.fill('#password', PW); await other.fill('#confirm', PW);
await other.click('button.primary'); await other.waitForURL(B + '/');
const tid = new URL(targetUrl).searchParams.get('target');
for (const f of ['preview', 'html', 'pdf']) {
	const r = await other.request.get(`${B}/cv/render?target=${tid}&format=${f}`);
	check(r.status() === 404, `other user gets 404 for ${f} (${r.status()})`);
}
const anon = await (await browser.newContext()).request.get(`${B}/cv/render?target=${tid}&format=preview`, { maxRedirects: 0 });
check(anon.status() === 303, `anonymous is redirected to login (${anon.status()})`);
check(errs.length === 0, 'no console errors ' + errs.join(' | '));
await browser.close();
