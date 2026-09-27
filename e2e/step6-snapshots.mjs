import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const bootUrl = readFileSync(process.env.SERVER_LOG, 'utf8').match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const B = 'http://localhost:3123', PW = 'correct horse battery staple';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
const check = (c, l) => { console.log(`${c ? 'PASS' : 'FAIL'} ${l}`); if (!c) process.exitCode = 1; };
const saved = (t) => p.locator('.status .msg').filter({ hasText: t }).waitFor({ timeout: 8000 });
const anon = await (await browser.newContext()).newPage();

// privacy page is public and filled from env
await anon.goto(B + '/privacy');
check((await anon.textContent('main')).includes('Test Operator') && (await anon.textContent('main')).includes('privacy@example.test'), 'privacy notice public, operator from env');

// admin: sign up, flags on, example content
await p.goto(bootUrl); await p.fill('#name', 'Admin'); await p.fill('#email', 'admin@example.test'); await p.fill('#password', PW); await p.fill('#confirm', PW);
await p.click('button.primary'); await p.waitForURL(B + '/');
await p.goto(B + '/admin');
for (const f of ['editor.dos-shell', 'render.pdf', 'snapshots.share-links']) {
	await p.locator('tr', { hasText: f }).locator('button').click(); await p.waitForLoadState('networkidle');
}
await p.goto(B + '/assemble'); await p.click('text=Load example content');

// freeze from job page
await p.goto(B + '/edit/jobs'); await p.locator('.list a').first().click(); await p.waitForURL(/\/edit\/jobs\/[\w-]+$/);
const jobUrl = p.url();
await p.fill('#snap-label', 'Sent to Example Insurance'); await p.click('text=Freeze this version');
await p.waitForURL(/\/edit\/snapshots\/[\w-]+$/);
const snapUrl = p.url();
await p.frameLocator('.work iframe').locator('h1').waitFor();
check((await p.frameLocator('.work iframe').locator('h1').textContent()) === 'Alex Example', 'snapshot shows the frozen CV');

// change content → live changes, snapshot does not
await p.goto(B + '/edit/profile'); await p.fill('#fullName', 'Alex Renamed'); await p.keyboard.press('F2'); await saved('Profile saved');
await p.goto(snapUrl); await p.frameLocator('.work iframe').locator('h1').waitFor();
check((await p.frameLocator('.work iframe').locator('h1').textContent()) === 'Alex Example', 'snapshot unchanged after editing the profile');
await p.goto(jobUrl);
check((await p.inputValue('#status')) === 'sent', 'job marked as sent');

// share link
await p.goto(snapUrl); await p.selectOption('#days', '7'); await p.click('text=Create link'); await saved('Share link created');
const shareUrl = (await p.locator('code.code').textContent()).trim();
check(/^http:\/\/localhost:3123\/s\/[\w-]{40,}$/.test(shareUrl), 'share URL shown once');
const r = await anon.goto(shareUrl);
check(r.status() === 200 && (await anon.textContent('h1')) === 'Alex Example', 'anonymous visitor sees the frozen CV');
check(r.headers()['x-robots-tag']?.includes('noindex') && r.headers()['referrer-policy'] === 'no-referrer', 'share page: noindex + no-referrer');
check(/frame-ancestors 'none'/.test(r.headers()['content-security-policy']), 'share page cannot be framed elsewhere');
const pdf = await anon.request.get(shareUrl + '/pdf');
check(pdf.status() === 200 && (await pdf.body()).subarray(0, 5).toString() === '%PDF-', 'visitor can download the PDF');
await p.reload();
check((await p.locator('table td').nth(2).textContent()).trim() === '2', 'view count shows 2 (page + PDF)');
await p.click('button:has-text("Withdraw")'); await saved('Link withdrawn');
const gone = await anon.goto(shareUrl);
check(gone.status() === 404 && (await anon.textContent('h1')).includes('not available'), 'withdrawn link shows “not available”');
const junk = await anon.goto(B + '/s/not-a-real-token-123456789012345');
check(junk.status() === 404, 'unknown token looks the same (404)');

// other user cannot reach the snapshot
await p.goto(B + '/admin'); await p.click('text=Create invite'); const code = (await p.locator('code.code').first().textContent()).trim();
const t = await (await browser.newContext({ acceptDownloads: true })).newPage();
await t.goto(B + '/signup?code=' + code); await t.fill('#name', 'Tess'); await t.fill('#email', 'tess@example.test'); await t.fill('#password', PW); await t.fill('#confirm', PW);
await t.click('button.primary'); await t.waitForURL(B + '/', { timeout: 8000 }).catch(async () => { console.log('SIGNUP-ALERT', t.url(), (await t.textContent('main')).slice(0, 300)); throw new Error('signup failed'); });
const sid = snapUrl.split('/').pop();
for (const u of [`/edit/snapshots/${sid}`, `/cv/snapshot/${sid}?format=html`]) {
	const x = await t.goto(B + u); check(x.status() === 404, `other user: ${u.split('?')[0]} → 404`);
}

// tester: export, then delete account
await t.goto(B + '/assemble'); await t.click('text=Load example content');
await t.goto(B + '/account');
const [dl] = await Promise.all([t.waitForEvent('download'), t.click('text=Download my data')]);
await dl.saveAs(`${process.env.OUT}/export.json`);
const ex = JSON.parse(readFileSync(`${process.env.OUT}/export.json`, 'utf8'));
check(ex.account.email === 'tess@example.test' && ex.content.length > 5 && !JSON.stringify(ex).includes('admin@example.test'), `export has own data only (${ex.content.length} entries)`);
await t.fill('#del-password', 'wrong password here'); await t.fill('#del-confirm', 'DELETE'); await t.click('text=Delete my account and all data');
check((await t.textContent('[role=alert]')).includes('Password is wrong'), 'wrong password refuses deletion');
await t.fill('#del-password', PW); await t.fill('#del-confirm', 'DELETE'); await t.click('text=Delete my account and all data');
await t.waitForURL(/\/login\?deleted=1/);
check((await t.textContent('main')).includes('have been deleted'), 'account deleted, confirmation shown');
await t.fill('#email', 'tess@example.test'); await t.fill('#password', PW); await t.click('button.primary');
check((await t.textContent('[role=alert]')).includes('wrong'), 'deleted account cannot log in');
await p.goto(B + '/admin');
check(!(await p.textContent('#users')).includes('tess@example.test'), 'admin no longer sees the deleted user');

// last admin can't delete themselves
await p.goto(B + '/account'); await p.fill('#del-password', PW); await p.fill('#del-confirm', 'DELETE'); await p.click('text=Delete my account and all data');
check((await p.textContent('[role=alert]')).includes('only admin'), 'last admin cannot delete their account');
await p.goto(snapUrl); await p.screenshot({ path: `${process.env.OUT}/shot-9-snapshot.png`, fullPage: true });
const unexpected = errs.filter((e) => !e.includes('status of 400')); // 400s = intentional refusals (wrong password, last admin)
check(unexpected.length === 0, 'no unexpected console errors ' + unexpected.join(' | '));
await browser.close();
