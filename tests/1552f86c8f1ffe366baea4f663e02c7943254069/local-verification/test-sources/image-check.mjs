// Run through stdin in the built image: docker exec -i cv-composer node --input-type=module
import assert from 'node:assert/strict';
import {pdfPageText} from './scripts/pdf-reading-order.mjs';
const token=(str,x,y,width=90)=>({str,transform:[10,0,0,10,x,y],height:10,width});
const text=pdfPageText([token('PROFILE',50,700),token('Synthetic summary',50,680),token('EXPERIENCE',50,620),token('JORDAN EXAMPLE',50,800),token('IT MANAGER',50,780),token('Operations Manager | Example Co',150,600)]);
assert(text.indexOf('JORDAN EXAMPLE')<text.indexOf('PROFILE'));
assert(text.indexOf('PROFILE')<text.indexOf('EXPERIENCE'));
console.log('PASS running image restores visual header/summary/experience order');
const columns=pdfPageText([token('CERTIFICATIONS',50,300),token('EDUCATION',350,300),token('LANGUAGES',350,200),token('English',350,180),token('Synthetic certificate',50,280),token('Synthetic degree',350,280)]);
assert.equal(columns,'CERTIFICATIONS\nSynthetic certificate\nEDUCATION\nSynthetic degree\nLANGUAGES\nEnglish');
console.log('PASS running image keeps independent section columns separate');
for(const [path,status]of[['/healthz',200],['/login',200],['/edit/cvs',303]]){const response=await fetch('http://127.0.0.1:3000'+path,{redirect:'manual'});assert.equal(response.status,status);console.log('PASS '+path+' responds '+status);await response.arrayBuffer();}
assert.equal(process.env.APP_VERSION,'1552f86c8f1f');console.log('PASS app version matches the import-fix checkpoint');
