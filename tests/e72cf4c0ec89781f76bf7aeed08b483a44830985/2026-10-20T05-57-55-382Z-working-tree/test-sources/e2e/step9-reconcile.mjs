import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
const B='http://localhost:3123';
const boot=readFileSync(process.env.SERVER_LOG,'utf8').match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
const context=await browser.newContext({viewport:{width:1600,height:1100}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(ok,label)=>{console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)process.exitCode=1;};
async function word(lines) {
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml',`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(line=>`<w:p><w:r><w:t>${line.replaceAll('&','&amp;').replaceAll('<','&lt;')}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
 return zip.generateAsync({type:'nodebuffer'});
}
async function upload(name,lines) {
 await page.goto(B+'/edit/imports');await page.waitForLoadState('networkidle');
 await page.locator('#cv').setInputFiles({name,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await word(lines)});
 await page.getByRole('button',{name:'Upload and review'}).click();await page.waitForURL(/\/edit\/imports\/[\w-]+$/);await page.waitForLoadState('networkidle');
}
const exported=async()=> (await context.request.get(B+'/account/export')).json();
try {
 await page.goto(boot);await page.waitForLoadState('networkidle');await page.fill('#name','Reconcile Tester');await page.fill('#email','admin@example.test');await page.fill('#password','correct horse battery staple');await page.fill('#confirm','correct horse battery staple');await page.click('button.primary');await page.waitForURL(B+'/');
 await page.goto(B+'/admin');await page.locator('tr',{hasText:'editor.dos-shell'}).locator('button').click();await page.waitForLoadState('networkidle');
 const lines=['Experience','2020-01 – Present','Operations Manager','Acme','• Managed 10 suppliers','• Reduced incidents by 20%'];
 await upload('operations.docx',lines);
 await page.getByRole('button',{name:'Approve and add to library',exact:true}).click();await page.getByRole('status').filter({hasText:'This CV was added'}).waitFor();
 const first=await exported();const entry=first.content[0];const firstCV=first.library.compositions[0];
 check(first.content.length===1&&entry.items.length===2,'first CV establishes one shared role and two achievements');
 await upload('compliance.docx',[...lines.slice(0,1),'2021-01 – Present',...lines.slice(2,4),'• Oversaw controls for 20 suppliers','• Reduced incidents by 20%']);
 check((await page.locator('.reconcile').textContent()).includes('Same organization'),'second CV gets an explained role suggestion');
 check(await page.inputValue('#reuse-0')==='','suggested matches are not applied automatically');
 await page.fill('#text-0','Supplier assurance responsibilities.');
 await page.selectOption('#reuse-0',entry.id);
 check((await page.locator('.reconcile table').textContent()).includes('2021-01')&&(await page.locator('.reconcile table').textContent()).includes('2020-01'),'conflicting imported and library dates are shown side by side');
 await page.selectOption('#itemReuse-0-0',entry.items[0].id);
 check((await page.locator('.reconcile').textContent()).includes('Numerical claims differ'),'changed numerical claims are flagged');
 await page.getByRole('button',{name:'Approve and add to library',exact:true}).click();await page.locator('[role=alert]').waitFor();
 check((await page.locator('[role=alert]').textContent()).includes('conflicting facts'),'approval blocks unresolved factual differences');
 check((await exported()).library.compositions.length===1,'failed approval creates no second composition');
 await page.check('[name="useLibraryFacts-0"]');
 await page.getByRole('button',{name:'Approve and add to library',exact:true}).click();await page.locator('[role=alert]').waitFor();
 check((await page.locator('[role=alert]').textContent()).includes('numerical claims'),'numerical differences still require confirmation after dates are resolved');
 check((await exported()).content[0].items[0].variants.length===1,'failed approval does not alter existing wordings');
 await page.screenshot({path:`${process.env.OUT}/shot-reconcile-review.png`,fullPage:true});
 await page.check('[name="confirmNumeric-0-0"]');
 await page.getByRole('button',{name:'Approve and add to library',exact:true}).click();await page.getByRole('status').filter({hasText:'This CV was added'}).waitFor();
 const second=await exported();
 check(second.content.length===1&&second.content[0].items.length===2,'approved reconciliation reuses the role and achievements');
 check(second.content[0].items[0].variants.length===2,'incoming achievement wording becomes an alternative');
 check(second.content[0].items[0].variants.find(v=>v.isDefault).id===entry.items[0].variants[0].id,'existing default wording is kept');
 check(JSON.stringify(second.library.compositions.find(cv=>cv.id===firstCV.id))===JSON.stringify(firstCV),'first CV remains exactly unchanged');
 check(second.library.sources.length===2&&second.library.compositions.length===2,'each CV keeps its source and composition');
 const reviewURL=page.url();
 await page.getByRole('link',{name:'Open this saved CV'}).click();await page.waitForURL(/\/edit\/cvs\/[\w-]+$/);
 const text=await page.locator('.saved-cv').textContent();
 check(text.includes('2020-01')&&text.includes('Oversaw controls for 20 suppliers'),'saved CV shows explicitly chosen facts and its own wording');
 await page.goto(B+'/edit/cvs');
 check(await page.locator('.window li a').count()===2,'saved CV list contains both compositions');
 const anon=await browser.newContext();const response=await anon.request.get(reviewURL,{maxRedirects:0});check(response.status()===303,'reconciliation review requires authentication');await anon.close();
 check(errors.length===0,`no browser errors ${errors.join(' | ')}`);
} finally {await browser.close();}
