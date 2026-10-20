import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { extractCV, validateUpload, MAX_CV_BYTES } from './import-extract';
import { parseCVText } from '$lib/domain/import';
import { pdfPageText } from '../../../scripts/pdf-reading-order.mjs';
import { InvalidError } from './repo/errors';

export function textPDF(text: string, positions?: {text:string;x:number;y:number}[]) {
 const escape=(value:string)=>value.replace(/[()\\]/g, '\\$&');
 const stream = positions?positions.map(line=>`BT /F1 12 Tf ${line.x} ${line.y} Td (${escape(line.text)}) Tj ET`).join('\n'):`BT /F1 12 Tf 50 750 Td (${escape(text)}) Tj ET`;
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
 it('recovers visual PDF order and maps an inline role header without treating the identity header as experience',async()=>{
  const positions=[
   {text:'PROFILE',x:50,y:700},{text:'Operations leader with governance experience.',x:50,y:680},
   {text:'PROFESSIONAL EXPERIENCE',x:50,y:620},
   {text:'JORDAN EXAMPLE',x:50,y:800},{text:'IT MANAGER',x:50,y:780},{text:'jordan@example.test',x:50,y:760},
   {text:'Sep 2024 - Present',x:50,y:600},{text:'IT Manager | Example Systems',x:200,y:600},
   {text:'Example City',x:50,y:580},{text:'Client: Example Bank',x:200,y:580},{text:'Responsible for reliable services.',x:200,y:560}
  ];
  const result=await extractCV('positioned.pdf',textPDF('',positions));
  expect(result.text.indexOf('JORDAN EXAMPLE')).toBeLessThan(result.text.indexOf('PROFILE'));
  const draft=parseCVText(result.text,'positioned.pdf');
  expect(draft.profile.fullName).toBe('JORDAN EXAMPLE');
  expect(draft.blocks.find(b=>b.module==='summary')?.text).toBe('Operations leader with governance experience.');
  const roles=draft.blocks.filter(b=>b.module==='experience');expect(roles).toHaveLength(1);
  expect(roles[0].data).toMatchObject({title:'IT Manager',organization:'Example Systems',start:'2024-09',end:null});
  expect(roles[0].sourceExcerpt).not.toContain('JORDAN EXAMPLE');
  expect(roles[0].text).toContain('Client: Example Bank');
 });
 it('keeps side-by-side certificates, education and languages in their respective sections',()=>{
  const token=(str:string,x:number,y:number,width=90)=>({str,transform:[10,0,0,10,x,y],height:10,width});
  const text=pdfPageText([token('CERTIFICATIONS',50,300),token(' ',140,300,200),token('EDUCATION',350,300),token('LANGUAGES',350,200),token('English',350,180),token('Certificate One',50,280),token('Certificate Two',50,260),token('BA Humanities',350,280),token('Example University',350,260)]);
  expect(text).toBe('CERTIFICATIONS\nCertificate One\nCertificate Two\nEDUCATION\nBA Humanities\nExample University\nLANGUAGES\nEnglish');
  expect(parseCVText(text,'columns.pdf').blocks.map(b=>b.module)).toEqual(['credentials','credentials','education','languages']);
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
