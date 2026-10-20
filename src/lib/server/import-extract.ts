import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { InvalidError } from './repo/errors';
export const MAX_CV_BYTES = 4 * 1024 * 1024;
let active = 0;

export function validateUpload(filename: string, bytes: Uint8Array) {
 if (!bytes.length || bytes.length > MAX_CV_BYTES) throw new InvalidError('Choose a non-empty PDF or DOCX file up to 4 MB.');
 const ext = filename.toLowerCase().split('.').at(-1);
 if (ext === 'pdf' && Buffer.from(bytes.subarray(0, 5)).toString() === '%PDF-') return 'application/pdf' as const;
 if (ext === 'docx' && bytes[0] === 0x50 && bytes[1] === 0x4b) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const;
 throw new InvalidError('Choose a PDF or Word .docx file. The file contents must match its extension.');
}

export async function extractCV(filename: string, bytes: Buffer) {
 const mediaType = validateUpload(filename, bytes);
 if (active >= 2) throw new InvalidError('Two documents are already being read. Try again shortly.');
 active++;
 try {
  return await new Promise<{ text: string; warnings: string[]; mediaType: typeof mediaType }>((resolvePromise, reject) => {
   const child = spawn(process.execPath, ['--max-old-space-size=256', resolve('scripts/extract-cv.mjs'), mediaType === 'application/pdf' ? 'pdf' : 'docx'], { stdio: ['pipe', 'pipe', 'pipe'] });
   let stdout = '', oversized = false;
   const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
   child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 1500000) { oversized = true; child.kill('SIGKILL'); } });
   child.stderr.resume(); // Drain extractor diagnostics without retaining document content.
   child.on('error', () => { clearTimeout(timer); reject(new InvalidError('Could not start document extraction.')); });
   child.on('close', code => {
    clearTimeout(timer);
    if (code !== 0 || oversized) return reject(new InvalidError('Could not read this document. It may be damaged, password-protected, too complex or over the time limit. Try an unprotected text-based copy.'));
    try {
     // PDF.js can emit warning lines before our final JSON payload.
     const result = JSON.parse(stdout.slice(stdout.lastIndexOf('\n') + 1));
     resolvePromise({ ...result, mediaType });
    } catch { reject(new InvalidError('Could not extract document text.')); }
   });
   child.stdin.on('error', () => {});
   child.stdin.end(bytes);
  });
 } finally { active--; }
}
