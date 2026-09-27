import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const log = readFileSync(process.env.SERVER_LOG, 'utf8');
const bootUrl = log.match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const B = 'http://localhost:3123';
const PW = 'correct horse battery staple';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const check = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`); if (!cond) process.exitCode = 1; };
const errors = [];

const admin = await (await browser.newContext()).newPage();
admin.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await admin.goto(B + '/admin');
check(admin.url().startsWith(B + '/login'), 'anonymous /admin redirects to login');
await admin.screenshot({ path: `${process.env.OUT}/shot-1-login.png` });

await admin.goto(bootUrl);
check((await admin.inputValue('#code')).length > 0, 'bootstrap code prefilled from link');
await admin.fill('#name', 'Admin'); await admin.fill('#email', 'admin@example.test');
await admin.fill('#password', PW); await admin.fill('#confirm', PW);
await admin.click('button.primary');
await admin.waitForURL(B + '/');
check((await admin.locator('nav.bar a', { hasText: 'Admin' }).count()) === 1, 'first admin signed up (has Admin menu)');

await admin.goto(B + '/admin');
await admin.fill('#inv-note', 'first tester'); await admin.fill('#inv-email', 'tester@example.test');
await admin.click('text=Create invite');
const code = (await admin.locator('code.code').first().textContent()).trim();
check(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/.test(code), `tester invite created (${code})`);
await admin.screenshot({ path: `${process.env.OUT}/shot-2-admin.png`, fullPage: true });

const t = await (await browser.newContext()).newPage();
await t.goto(B + '/signup');
await t.fill('#code', code.toLowerCase().replace(/-/g, ' '));
await t.fill('#name', 'Tess'); await t.fill('#email', 'someone.else@example.test');
await t.fill('#password', PW); await t.fill('#confirm', PW);
await t.click('button.primary');
check((await t.textContent('[role=alert]')).includes('different e-mail'), 'email-bound invite rejects other address');
await t.fill('#email', 'tester@example.test');
await t.fill('#password', PW); await t.fill('#confirm', PW);
await t.click('button.primary');
await t.waitForURL(B + '/');
check((await t.textContent('main')).includes('Welcome, Tess') && (await t.locator('nav.bar a', { hasText: 'Admin' }).count()) === 0, 'tester signed up with lower-case, spaced code (no Admin menu)');
await t.goto(B + '/admin');
check(t.url() === B + '/', 'tester cannot open /admin');
const direct = await t.request.post(B + '/admin?/createInvite', { form: { role: 'admin' }, headers: { origin: B } });
check(!(await direct.text()).includes('"code"'), 'tester cannot call admin actions directly');

await admin.goto(B + '/admin');
await admin.locator('tr', { hasText: 'tester@example.test' }).locator('text=Reset code').click();
const reset = (await admin.locator('code.code').first().textContent()).trim();
check(reset.length === 19, 'admin issued reset code');

await t.reload();
check(t.url().startsWith(B + '/login') === false, 'tester still logged in before reset');
await t.goto(B + '/reset');
await t.fill('#email', 'tester@example.test'); await t.fill('#code', reset);
await t.fill('#password', 'a completely new password'); await t.fill('#confirm', 'a completely new password');
await t.click('button.primary');
check((await t.textContent('main')).includes('Password changed'), 'tester reset password');
await t.goto(B + '/');
check(t.url().startsWith(B + '/login'), 'reset logged tester out everywhere');
await t.fill('#email', 'tester@example.test'); await t.fill('#password', 'a completely new password');
await t.click('button.primary'); await t.waitForURL(B + '/');
check(true, 'tester logs in with new password');

await t.click('text=Log out'); await t.waitForURL(/\/login/);
await t.goto(B + '/account');
check(t.url().startsWith(B + '/login'), 'logout ends the session');

const cross = await fetch(B + '/login', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a&password=b' });
check(cross.status === 403, `cross-site form post blocked (${cross.status})`);
const res = await fetch(B + '/login');
check(/script-src 'self'/.test(res.headers.get('content-security-policy') ?? ''), 'CSP header present');

await admin.goto(B + '/admin');
await admin.locator('tr', { hasText: 'admin@example.test' }).locator('select').selectOption('tester');
await admin.locator('tr', { hasText: 'admin@example.test' }).locator('text=Save').click();
check((await admin.textContent('[role=alert]')).includes('at least one active admin'), 'last admin cannot demote self');
await admin.screenshot({ path: `${process.env.OUT}/shot-3-admin-after.png`, fullPage: true });

const unexpected = errors.filter((e) => !e.includes('status of 400')); // 400 = the intentional last-admin refusal
check(unexpected.length === 0, `no unexpected console errors ${unexpected.join(' | ')}`);
await browser.close();
