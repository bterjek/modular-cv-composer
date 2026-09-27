// PDF export: one shared headless Chromium, at most two renders at a time.
// The page gets our own escaped HTML, runs no scripts (the document's CSP forbids them),
// and every network request is blocked, so rendering cannot be used to reach other hosts.
import { chromium, type Browser } from 'playwright-core';

const CHROMIUM_PATH = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
const MAX_PARALLEL = 2;
const TIMEOUT_MS = 20_000;

let browser: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
	browser ??= chromium
		.launch({
			executablePath: CHROMIUM_PATH,
			// The container runs as an unprivileged user without the namespaces Chromium's
			// sandbox needs. Acceptable here: content is escaped, scripts are forbidden by CSP,
			// and all network access is blocked (see renderPdf).
			args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none']
		})
		.then((b) => {
			b.on('disconnected', () => (browser = null)); // relaunch on next use after a crash
			return b;
		})
		.catch((e) => {
			browser = null;
			throw e;
		});
	return browser;
}

// ── simple semaphore
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
	if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
	running++;
	try {
		return await fn();
	} finally {
		running--;
		waiting.shift()?.();
	}
}

/** The PDF's title metadata comes from the document's <title>. */
export async function renderPdf(html: string): Promise<Buffer> {
	return slot(async () => {
		const b = await getBrowser();
		const context = await b.newContext({ offline: true });
		try {
			await context.route('**/*', (route) => route.abort());
			const page = await context.newPage();
			page.setDefaultTimeout(TIMEOUT_MS);
			await page.setContent(html, { waitUntil: 'load' });
			await page.evaluate(() => document.fonts.ready); // CDP evaluation is not subject to the page's CSP
			await page.emulateMedia({ media: 'print' });
			return await page.pdf({
				format: 'A4',
				printBackground: true,
				preferCSSPageSize: true,
				tagged: true, // accessible PDF structure (headings, lists)
				outline: true
			});
		} finally {
			await context.close();
		}
	});
}

export async function closePdfBrowser() {
	const b = browser;
	browser = null;
	if (b) await (await b).close().catch(() => {});
}
