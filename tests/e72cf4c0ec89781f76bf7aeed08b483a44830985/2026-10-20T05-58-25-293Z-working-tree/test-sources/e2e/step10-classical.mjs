import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
const B='http://localhost:3123';
const boot=readFileSync(process.env.SERVER_LOG,'utf8').match(/(http:\/\/localhost:3123\/signup\?code=[\w-]+)/)[1];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
const context=await browser.newContext({viewport:{width:1600,height:1100}});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.stack ?? e.message));
const check=(ok,label)=>{console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)process.exitCode=1;};
async function uploadCV(name,roles,bullets){
 const lines=['Experience'];
 for(let role=1;role<=roles;role++){
  lines.push('2020-01 – Present',`Role ${role}`,'Example Company');
  for(let bullet=1;bullet<=bullets;bullet++)lines.push(`• Role ${role} achievement ${bullet}: Improved service delivery through clear ownership, measurable controls and effective collaboration across technical teams.`);
 }
 const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml',`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(line=>`<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
 await page.goto(B+'/edit/imports');await page.waitForLoadState('networkidle');await page.locator('#cv').setInputFiles({name,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await zip.generateAsync({type:'nodebuffer'})});
 await page.getByRole('button',{name:'Upload and review'}).click();await page.waitForURL(/\/edit\/imports\/[\w-]+$/);await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'Approve and add to library',exact:true}).click();await page.getByRole('status').filter({hasText:'This CV was added'}).waitFor();
 const href=await page.getByRole('link',{name:'Open this saved CV'}).getAttribute('href');return href.split('/').at(-1);
}
try{
 await page.goto(boot);await page.waitForLoadState('networkidle');await page.fill('#name','Layout Tester');await page.fill('#email','admin@example.test');await page.fill('#password','correct horse battery staple');await page.fill('#confirm','correct horse battery staple');await page.click('button.primary');await page.waitForURL(B+'/');
 await page.goto(B+'/admin');await page.locator('tr',{hasText:'editor.dos-shell'}).locator('button').click();await page.waitForLoadState('networkidle');
 const id=await uploadCV('classical.docx',3,4);const exportBefore=await(await context.request.get(B+'/account/export')).json();const cvBefore=exportBefore.library.compositions.find(cv=>cv.id===id);
 await page.goto(B+'/edit/cvs/'+id);await page.frameLocator('.paper-preview').locator('.cv-sheet').first().waitFor();
 const analysis=await(await context.request.get(B+`/cv/composition/${id}?format=analysis`)).json();
 check(analysis.withinLimit&&analysis.pageCount<=2,'typical imported CV fits the two-page target');
 check((await page.locator('.layout-status').textContent()).includes('ready to export'),'page status reports readiness');
 check(await page.frameLocator('.paper-preview').locator('.cv-sheet').count()===analysis.pageCount,'preview displays real page boundaries');
 const frame=page.frames().find(frame=>frame.url().includes('/cv/composition/'));
 const metrics=await frame.evaluate(()=>({width:document.querySelector('.cv-sheet').getBoundingClientRect().width,height:document.querySelector('.cv-sheet').getBoundingClientRect().height,font:getComputedStyle(document.body).fontSize,overflow:Array.from(document.querySelectorAll('.cv-content')).some(body=>body.scrollHeight>body.clientHeight+1)}));
 check(Math.abs(metrics.width-793.7)<1&&Math.abs(metrics.height-1122.5)<1,'preview sheets use A4 physical dimensions');
 check(Math.abs(parseFloat(metrics.font)-14.667)<.1&&!metrics.overflow,'body text stays at 11 pt without clipped content');
 const disabled=await context.request.get(B+`/cv/composition/${id}?format=pdf`);check(disabled.status()===403,'PDF export respects the existing feature flag');
 await page.goto(B+'/admin');await page.locator('tr',{hasText:'render.pdf'}).locator('button').click();await page.waitForLoadState('networkidle');
 await page.goto(B+'/edit/cvs/'+id);await page.frameLocator('.paper-preview').locator('.cv-sheet').first().waitFor();
 await page.screenshot({path:`${process.env.OUT}/shot-classical-preview.png`,fullPage:true});const paper=await context.newPage();await paper.goto(B+`/cv/composition/${id}?format=preview`);await paper.screenshot({path:`${process.env.OUT}/shot-classical-sheets.png`,fullPage:true});await paper.close();
 const html=await context.request.get(B+`/cv/composition/${id}?format=html`);const htmlText=await html.text();check(html.status()===200&&html.headers()['content-disposition'].includes('attachment'),'standalone HTML download is available');
 check(!htmlText.includes('<script')&&htmlText.includes('data:font'),'HTML is script-free and carries its own fonts');
 const pdf=await context.request.get(B+`/cv/composition/${id}?format=pdf`);const pdfBytes=await pdf.body();check(pdf.status()===200&&pdfBytes.subarray(0,5).toString()==='%PDF-','PDF download works');
 check((pdfBytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g)??[]).length===analysis.pageCount,'PDF and preview page counts match');
 const longId=await uploadCV('too-long.docx',4,16);await page.goto(B+'/edit/cvs/'+longId);await page.frameLocator('.paper-preview').locator('.cv-sheet').first().waitFor();
 const longAnalysis=await(await context.request.get(B+`/cv/composition/${longId}?format=analysis`)).json();
 check(longAnalysis.pageCount>2&&!longAnalysis.withinLimit,'overlong content is measured beyond two pages');
 check(longAnalysis.overflow.length>0&&longAnalysis.overflow.every(item=>item.page>2),'overflow feedback identifies content on later pages');
 check(await page.getByRole('link',{name:'Download PDF',exact:true}).count()===0&&await page.getByRole('link',{name:'Download HTML',exact:true}).count()===0,'normal export links are withheld for overflow');
 check((await page.frameLocator('.paper-preview').locator('main').textContent()).includes('Role 4 achievement 16'),'last bullet remains visible in the overflow preview');
 for(const format of ['html','pdf']){const response=await context.request.get(B+`/cv/composition/${longId}?format=${format}`);check(response.status()===422,`${format.toUpperCase()} export refuses an overlong CV`);}
 const after=await(await context.request.get(B+'/account/export')).json();check(JSON.stringify(after.library.compositions.find(cv=>cv.id===id))===JSON.stringify(cvBefore),'layout and export do not modify saved composition content');
 await page.screenshot({path:`${process.env.OUT}/shot-classical-overflow.png`,fullPage:true});
 const missing=await context.request.get(B+'/cv/composition/does-not-exist?format=preview');check(missing.status()===404,'unknown or unowned composition is not exposed');
 const anon=await browser.newContext();const privateResponse=await anon.request.get(B+`/cv/composition/${id}?format=preview`,{maxRedirects:0});check(privateResponse.status()===303,'rendered CVs require authentication');await anon.close();
 check(errors.length===0,`no browser errors ${errors.join(' | ')}`);
}finally{await browser.close();}
