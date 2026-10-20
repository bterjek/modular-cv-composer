import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { extractCV, validateUpload, MAX_CV_BYTES } from './import-extract';
import { InvalidError } from './repo/errors';

export function textPDF(text: string) {
 const stream = `BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
 const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf = '%PDF-1.4\n', offsets = [0];
 objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${object}\nendobj\n`; });
 const start = Buffer.byteLength(pdf);
 pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o => String(o).padStart(10,'0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return Buffer.from(pdf);
}
async function wordFile() {
 const zip = new JSZip();
 zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Ádám Example</w:t></w:r></w:p><w:p><w:r><w:t>Summary</w:t></w:r></w:p><w:p><w:r><w:t>Operations and compliance leader.</w:t></w:r></w:p></w:body></w:document>');
 return zip.generateAsync({ type: 'nodebuffer' });
}
describe('document extraction', () => {
 it('extracts text from a real PDF binary', async () => {
  const result = await extractCV('cv.pdf', textPDF('Operations manager'));
  expect(result.text).toContain('Operations manager');
 });
 it('extracts paragraphs and accents from a DOCX binary', async () => {
  const result = await extractCV('cv.docx', await wordFile());
  expect(result.text).toContain('Ádám Example');
  expect(result.text).toContain('Operations and compliance leader.');
 });
 it('rejects empty, oversized, mismatched and malformed files', async () => {
  expect(() => validateUpload('cv.pdf', Buffer.alloc(0))).toThrow(InvalidError);
  expect(() => validateUpload('cv.pdf', Buffer.alloc(MAX_CV_BYTES + 1))).toThrow(InvalidError);
  expect(() => validateUpload('cv.docx', textPDF('test'))).toThrow(InvalidError);
  await expect(extractCV('bad.pdf', Buffer.from('%PDF-broken'))).rejects.toThrow(InvalidError);
 });
 it('rejects ZIP files that are not Word documents', async () => {
  const zip = new JSZip(); zip.file('fake.txt','Not a Word file');
  await expect(extractCV('fake.docx', await zip.generateAsync({type:'nodebuffer'}))).rejects.toThrow(InvalidError);
 });
});
