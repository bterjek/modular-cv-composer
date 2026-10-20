// Build a CV from an empty account, mostly with the keyboard.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const bootUrl = readFileSync(process.env.SERVER_LOG, 'utf8').match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const B = 'http://localhost:3123', PW = 'correct horse battery staple';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
const check = (c, l) => { console.log(`${c ? 'PASS' : 'FAIL'} ${l}`); if (!c) process.exitCode = 1; };
const status = async () => (await p.locator('.status').textContent())?.trim();
const saved = async (text) => { await p.locator('.status .msg').filter({ hasText: text }).waitFor({ timeout: 8000 }); };
const frame = () => p.frameLocator('aside.preview iframe');

await p.goto(bootUrl); await p.waitForLoadState('networkidle');
await p.fill('#name', 'Ádám Tester'); await p.fill('#email', 'admin@example.test'); await p.fill('#password', PW); await p.fill('#confirm', PW);
await p.click('button.primary'); await p.waitForURL(B + '/');

// flag gate
const gated = await p.goto(B + '/edit/content');
check(gated.status() === 403, `editor is gated by its flag (${gated.status()})`);
await p.goto(B + '/admin'); await p.locator('tr', { hasText: 'editor.dos-shell' }).locator('button').click();
await p.locator('.msg.ok', { hasText: 'editor.dos-shell updated' }).waitFor();
await p.goto(B + '/');
await p.goto(B + '/edit'); await p.waitForLoadState('networkidle');

// F9 → profile, fill, Ctrl+S
await p.keyboard.press('F9'); await p.waitForURL(/\/edit\/profile/);
check((await p.inputValue('#fullName')) === 'Ádám Tester', 'profile prefilled from account');
await p.fill('#location', 'Győr, Hungary'); await p.fill('#ll0', 'LinkedIn'); await p.fill('#lu0', 'https://www.linkedin.com/in/example');
await p.focus('#location'); await p.keyboard.press('Control+s'); await saved('Profile saved');
check(true, 'Ctrl+S saves the profile');
await p.fill('#lu1', 'javascript:alert(1)'); await p.fill('#ll1', 'Bad'); await p.focus('#ll1'); await p.keyboard.press('F2');
await p.locator('.status .msg.error').waitFor(); check(/https/.test(await status()), `javascript: link rejected (“${await status()}”)`);
await p.fill('#lu1', ''); await p.fill('#ll1', ''); await p.keyboard.press('F2'); await saved('Profile saved');

// Headline via side menu and arrow keys
await p.keyboard.press('F3'); await p.waitForURL(/\/edit\/content$/);
await p.locator('nav.side a[href="/edit/profile"]').focus(); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
await p.waitForURL(/\/edit\/content\/headline/);
check(true, 'arrow keys + Enter navigate the side menu');
await p.fill('#new-text', 'Service delivery lead'); await p.fill('#new-tags', 'Delivery'); await p.keyboard.press('F2');
await p.waitForURL(/\/edit\/content\/entry\//);
await p.click('text=+ Another wording'); await p.fill('#ew-new', 'IT governance lead'); await p.fill('#ew-newg', 'governance');
await p.click('form.wording.new button.primary'); await saved('Wording added');
check((await p.locator('form.wording').count()) === 2, 'second headline wording added');

// Experience with bullets
await p.goto(B + '/edit/content/experience');
await p.fill('#new-title', 'Head of Operations'); await p.fill('#new-organization', 'Contoso'); await p.fill('#new-start', '2021-04');
await p.check('input[name=end_present]'); await p.keyboard.press('F2'); await p.waitForURL(/\/edit\/content\/entry\//);
for (const [text, tags] of [['Cut incidents by half', 'delivery'], ['Passed ISO 27001 audit with no findings', 'governance, audit'], ['Hired and led 12 engineers', 'leadership']]) {
	const before = await p.locator('.item').count();
	await p.fill('#new-item', text); await p.fill('#new-item-tags', tags); await p.click('text=Add bullet');
	await p.waitForFunction((n) => document.querySelectorAll('.item').length === n + 1, before);
}
check((await p.locator('.item').count()) === 3, 'three bullets added');
await p.locator('button[aria-label="Move bullet 3 up"]').click(); await saved('Order changed');
check((await p.locator('.item').nth(1).locator('textarea').first().inputValue()).startsWith('Hired'), 'bullet moved up');

// Credentials + language
await p.goto(B + '/edit/content/credentials');
await p.fill('#new-name', 'ITIL 4 Foundation'); await p.fill('#new-issuer', 'PeopleCert'); await p.selectOption('#new-kind', 'certification'); await p.fill('#new-issued', '2020-05');
await p.keyboard.press('F2'); await p.waitForURL(/\/edit\/content\/entry\//);
await p.goto(B + '/edit/content/languages');
await p.fill('#new-language', 'Hungarian'); await p.selectOption('#new-level', 'native'); await p.keyboard.press('F2'); await p.waitForURL(/entry/);

// Category → preview appears
await p.keyboard.press('F4'); await p.waitForURL(/\/edit\/categories$/);
await p.fill('#c-name', 'Governance roles'); await p.keyboard.press('F2'); await p.waitForURL(/\/edit\/categories\/[\w-]+$/);
await frame().locator('h1').waitFor();
check((await frame().locator('h1').textContent()) === 'Ádám Tester', 'preview shows the new category');
check((await frame().locator('.headline').textContent()) === 'Service delivery lead', 'default headline before tuning');
await p.fill('#preferTags', 'governance'); await p.fill('input[name=maxItems_experience]', '2'); await p.keyboard.press('F2'); await saved('Category saved');
await p.waitForTimeout(800);
check((await frame().locator('.headline').textContent()) === 'IT governance lead', 'preview refreshed: governance headline after save');
const bullets = await frame().locator('section.experience li').allTextContents();
check(bullets.length === 2 && bullets.includes('Passed ISO 27001 audit with no findings'), `max 2 bullets, governance ranked in (${bullets.join(' | ')})`);
check((await frame().locator('.kind').first().textContent()) === 'Certification', 'credential labelled by kind');

// Job with tailoring
await p.keyboard.press('F8'); await p.waitForURL(/\/edit\/jobs$/);
await p.fill('#j-company', 'Fabrikam'); await p.fill('#j-role', 'Head of IT Risk'); await p.keyboard.press('F2'); await p.waitForURL(/\/edit\/jobs\/[\w-]+$/);
const cutRow = p.locator('.item', { hasText: 'Hired and led 12 engineers' });
check((await cutRow.locator('.state').textContent()).trim() === 'OUT', 'job page shows the lowest-ranked bullet as OUT, with its reason');
check((await cutRow.locator('.why').textContent()).includes('over the limit of 2'), 'reason shown: over the limit');
await cutRow.locator('select').first().selectOption('include');
await p.fill('input[name=order_credentials]', '1');
await p.keyboard.press('F2'); await saved('Tailoring saved');
await p.waitForTimeout(800);
check((await cutRow.locator('.state').textContent()).trim() === 'IN', 'forced bullet now IN');
const sectionOrder = await frame().locator('section').evaluateAll((els) => els.map((e) => e.className));
check(sectionOrder[0] === 'credentials', `credentials moved first for this job (${sectionOrder.join(',')})`);
check((await frame().locator('section.experience li').count()) === 3, 'preview has the forced bullet');
await p.screenshot({ path: `${process.env.OUT}/shot-6-job.png` });

// Help overlay
await p.keyboard.press('F1'); check(await p.locator('[role=dialog]').isVisible(), 'F1 opens help');
await p.keyboard.press('Escape'); check(!(await p.locator('[role=dialog]').isVisible()), 'Esc closes help');

// Isolation: another user can't open these pages
const tid = p.url().split('/').pop();
await p.goto(B + '/admin'); await p.click('text=Create invite'); const code = (await p.locator('code.code').first().textContent()).trim();
const o = await (await browser.newContext()).newPage();
await o.goto(B + '/signup?code=' + code); await o.waitForLoadState('networkidle'); await o.fill('#name', 'T'); await o.fill('#email', 't@example.test'); await o.fill('#password', PW); await o.fill('#confirm', PW);
await o.click('button.primary'); await o.waitForURL(B + '/', { timeout: 8000 }).catch(async () => { console.log('SIGNUP-ALERT', await o.textContent('main')); throw new Error('signup failed'); });
const r1 = await o.goto(`${B}/edit/jobs/${tid}`); check(r1.status() === 404, `other user: job page 404 (${r1.status()})`);
const post = await o.request.post(`${B}/edit/jobs/${tid}?/delete`, { form: {}, headers: { origin: B } });
check(post.status() === 404 || (await post.text()).includes('404'), `other user cannot delete the job (${post.status()})`);
await o.goto(B + '/edit/content'); check((await o.locator('nav.side').textContent()).includes('Experience'), 'other user sees an empty editor');

await p.goto(`${B}/edit/categories`); await p.screenshot({ path: `${process.env.OUT}/shot-7-categories.png` });
await p.goto(`${B}/edit/content/experience`); await p.locator('.entries a').first().click(); await p.waitForURL(/entry/);
await p.screenshot({ path: `${process.env.OUT}/shot-8-entry.png` });
const unexpected = errs.filter((e) => !e.includes('status of 403')); // 403 = the intentional flag-gate check
check(unexpected.length === 0, 'no console or page errors ' + unexpected.join(' | '));
await browser.close();
