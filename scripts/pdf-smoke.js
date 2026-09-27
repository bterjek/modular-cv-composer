// Run inside the built image by CI: proves Chromium + playwright-core can produce a PDF there.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
	args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
});
const page = await browser.newPage();
await page.setContent('<!doctype html><title>smoke</title><h1>Árvíztűrő tükörfúrógép</h1>');
const pdf = await page.pdf({ format: 'A4' });
await browser.close();
if (pdf.subarray(0, 5).toString() !== '%PDF-') {
	console.error('pdf-smoke: output is not a PDF');
	process.exit(1);
}
console.log(`pdf-smoke: ok (${pdf.length} bytes, Chromium ${browser.version()})`);
