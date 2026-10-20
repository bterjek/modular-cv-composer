// Isolated extraction subprocess: bounded by the caller's heap, output and timeout limits.
import { extractRawText } from 'mammoth';
import { getDocumentProxy } from 'unpdf';
import { pdfPageText } from './pdf-reading-order.mjs';
let input = [];
for await (const chunk of process.stdin) input.push(chunk);
const bytes = Buffer.concat(input);
try {
 let text = '', warnings = [];
 if (process.argv[2] === 'pdf') {
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { isEvalSupported: false, useSystemFonts: false });
  try {
   if (pdf.numPages > 30) throw new Error('Use a CV with at most 30 pages.');
   const pages=[];
   for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();pages.push(pdfPageText(content.items));}
   text = pages.join('\n\n');
   warnings.push('PDF text was ordered by position. Review columns, repeated headers and wrapped paragraphs against the original.');
   if (pages.some(page => page.trim().length < 10)) warnings.push('Some PDF pages have little or no readable text. Check the original for scanned or missing content.');
  } finally { await pdf.loadingTask.destroy(); }
 } else {
  // Check ZIP central-directory limits before Mammoth expands DOCX content.
  const start = Math.max(0, bytes.length - 65557);
  let end = -1;
  for (let i = bytes.length - 22; i >= start; i--) if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('This is not a readable Word document.');
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16), total = 0, hasDocument = false;
  if (count > 1000 || count === 65535) throw new Error('This Word document is too complex.');
  for (let i = 0; i < count; i++) {
   if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid Word archive.');
   total += bytes.readUInt32LE(offset + 24);
   const length = bytes.readUInt16LE(offset + 28);
   const name = bytes.subarray(offset + 46, offset + 46 + length).toString();
   if (name === 'word/document.xml') hasDocument = true;
   if (total > 20000000) throw new Error('The expanded Word document exceeds 20 MB.');
   offset += 46 + length + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  if (!hasDocument) throw new Error('The file is not a DOCX document.');
  const result = await extractRawText({ buffer: bytes });
  text = result.value;
  warnings = result.messages.map(m => m.message).slice(0, 10);
 }
 if (text.length > 200000) throw new Error('The extracted text is too long for a CV (200,000 characters maximum).');
 process.stdout.write(JSON.stringify({ text, warnings }));
} catch (error) {
 process.stderr.write(error.message || 'Extraction failed.');
 process.exitCode = 1;
}
