import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const bootUrl = readFileSync(process.env.SERVER_LOG, 'utf8').match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const B = 'http://localhost:3123', PW = 'correct horse battery staple';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
const check = (c, l) => { console.log(`${c ? 'PASS' : 'FAIL'} ${l}`); if (!c) process.exitCode = 1; };

await p.goto(bootUrl); await p.fill('#name', 'Admin'); await p.fill('#email', 'admin@example.test'); await p.fill('#password', PW); await p.fill('#confirm', PW);
await p.click('button.primary'); await p.waitForURL(B + '/');
check((await p.textContent('.legal')).includes('version e2e-test'), 'version shown in footer');
await p.goto(B + '/admin'); await p.locator('tr', { hasText: 'editor.dos-shell' }).locator('button').click(); await p.waitForLoadState('networkidle');
await p.goto(B + '/');
check((await p.textContent('main')).includes('Getting started') || (await p.textContent('main')).includes('Freeze this version'), 'home shows getting-started steps');
await p.goto(B + '/assemble'); await p.click('text=Load example content');

// Classic design via the category editor, preview switches font
await p.goto(B + '/edit/categories'); await p.locator('.list a', { hasText: 'IT governance roles' }).click(); await p.waitForURL(/categories\/[\w-]+$/);
const catUrl = p.url();
if (await p.locator('text=Show this category in the preview').count()) { await p.click('text=Show this category in the preview'); await p.waitForURL(catUrl); }
await p.selectOption('#design', 'classic'); await p.keyboard.press('F2');
await p.locator('.status .msg', { hasText: 'Category saved' }).waitFor();
await p.waitForTimeout(800);
const fam = await p.frames().find((f) => f.url().includes('/cv/render'))?.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily);
check(/Source Serif 4/.test(fam ?? ''), `preview uses the Classic design (${fam})`);
const serifLoaded = await p.frames().find((f) => f.url().includes('/cv/render'))?.evaluate(() => document.fonts.check("600 20px 'Source Serif 4'"));
check(serifLoaded === true, 'serif font loaded in preview');

// Feedback with Shift+F1 from the editor (help must NOT open)
await p.keyboard.press('Shift+F1');
check(await p.locator('#fb-title').isVisible(), 'Shift+F1 opens feedback');
check(!(await p.locator('#help-title').isVisible()), 'Shift+F1 does not open help');
await p.fill('#fb-message', 'Preview took a second to switch fonts.');
await p.click('[role=dialog] button.primary');
await p.locator('text=Thank you — sent').waitFor();
check(true, 'feedback sent');
await p.keyboard.press('Escape');
await p.keyboard.press('F1'); check(await p.locator('#help-title').isVisible(), 'F1 still opens help'); await p.keyboard.press('Escape');

// Admin triage
await p.goto(B + '/admin');
check((await p.locator('nav.bar a', { hasText: 'Admin' }).textContent()).includes('(1)'), 'admin menu shows 1 open feedback');
const fb = p.locator('.fb').first();
const meta = await fb.textContent();
check(meta.includes('Preview took a second') && meta.includes('/edit/categories/') && meta.includes('ve2e-test') && meta.includes('1600x1000'), 'feedback shows message, page, version and window size');
check(!meta.includes('Alex Example'), 'feedback carries no CV content');
await fb.locator('button', { hasText: 'Mark done' }).click(); await p.waitForLoadState('networkidle');
await p.goto(B + '/admin');
check(!(await p.locator('nav.bar a', { hasText: 'Admin' }).textContent()).includes('('), 'open count cleared after marking done');
await p.goto(B + '/admin?feedback=done#feedback');
check((await p.locator('.fb').count()) === 1, 'done feedback listed under "done"');

// Freeze with classic, snapshot keeps the design
await p.goto(B + '/edit/jobs'); await p.locator('.list a').first().click(); await p.waitForURL(/jobs\/[\w-]+$/);
await p.click('text=Freeze this version'); await p.waitForURL(/snapshots\/[\w-]+$/);
check((await p.textContent('.window')).includes('design classic'), 'snapshot records the Classic design');

// Error page
const r = await p.goto(B + '/edit/content/nonsense');
check(r.status() === 404 && (await p.textContent('main')).includes('ERROR 404'), 'styled 404 page');
await p.screenshot({ path: `${process.env.OUT}/shot-10-classic.png` });
check(errs.filter((e) => !e.includes('404')).length === 0, 'no console errors ' + errs.join(' | '));
await browser.close();
