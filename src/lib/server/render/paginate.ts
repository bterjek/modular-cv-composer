// Runs via CDP after fonts load. No scripts are inserted into previews/downloads.
export function paginateClassicalDocument(pageLimit: number) {
 const source=document.getElementById('cv-source');
 if(!source)throw new Error('Missing CV content');
 const original=Array.from(source.children) as HTMLElement[];
 const main=document.createElement('main');main.id='cv-pages';
 source.after(main);
 const sheets: HTMLElement[]=[];
 let content: HTMLElement;
 function newPage(){
  if(sheets.length>=50)throw new Error('This CV exceeds the 50-page preview limit. Shorten its content.');
  const sheet=document.createElement('section');sheet.className='cv-sheet';sheet.dataset.page=String(sheets.length+1);
  sheet.setAttribute('aria-label',`Page ${sheets.length+1}`);
  if(sheets.length>=pageLimit)sheet.dataset.overLimit='true';
  content=document.createElement('div');content.className='cv-content';sheet.append(content);
  const number=document.createElement('div');number.className='sheet-number';number.setAttribute('aria-hidden','true');sheet.append(number);
  main.append(sheet);sheets.push(sheet);
 }
 function fits(){return content.scrollHeight<=content.clientHeight+0.5;}
 function pageBreak(){
  const carry:HTMLElement[]=[];
  while(content.lastElementChild?.getAttribute('data-keep-next')==='true'){
   const last=content.lastElementChild as HTMLElement;carry.unshift(last);last.remove();
  }
  if(content.childElementCount>0)newPage();
  for(const node of carry)content.append(node);
 }
 function append(node:HTMLElement){
  content.append(node);
  if(fits())return;
  node.remove();
  if(content.childElementCount>0)pageBreak();
  content.append(node);
  if(fits())return;
  node.remove();
  const leaf=node.querySelector<HTMLElement>('[data-text]');
  if(node.dataset.splittable!=='true'||!leaf)throw new Error('A content block cannot be fitted at the fixed text size.');
  let remaining=leaf.textContent??'';
  while(remaining.length){
   const fragment=node.cloneNode(true) as HTMLElement;
   const target=fragment.querySelector<HTMLElement>('[data-text]')!;
   content.append(fragment);
   let low=0,high=remaining.length;
   while(low<high){const mid=Math.ceil((low+high)/2);target.textContent=remaining.slice(0,mid);if(fits())low=mid;else high=mid-1;}
   if(low===0){fragment.remove();throw new Error('There is no room for content after the heading. Shorten the heading.');}
   let cut=low;
   if(cut<remaining.length){
    const whitespace=remaining.slice(0,cut).search(/\s+\S*$/);
    if(whitespace>cut/2)cut=whitespace+1;
    // Never divide a UTF-16 surrogate pair across pages.
    if(cut>0&&/[\uD800-\uDBFF]/.test(remaining[cut-1])&&/[\uDC00-\uDFFF]/.test(remaining[cut]??''))cut--;
   }
   if(!cut){fragment.remove();throw new Error('Unable to split this content safely.');}
   target.textContent=remaining.slice(0,cut);
   remaining=remaining.slice(cut);
   if(remaining.length){fragment.dataset.keepNext='false';newPage();}
  }
 }
 newPage();
 for(const node of original)append(node.cloneNode(true) as HTMLElement);
 source.remove();
 const overflow: {id:string;label:string;kind:string;page:number;excerpt:string}[]=[];
 const horizontal: {id:string;label:string;page:number}[]=[];
 for(const [index,sheet] of sheets.entries()){
  sheet.querySelector('.sheet-number')!.textContent=`${index+1} / ${sheets.length}`;
  const body=sheet.querySelector<HTMLElement>('.cv-content')!;
  for(const unit of Array.from(body.children) as HTMLElement[]){
   if(index>=pageLimit)overflow.push({id:unit.dataset.unitId??'',label:unit.dataset.label??'',kind:unit.dataset.kind??'',page:index+1,excerpt:(unit.textContent??'').slice(0,160)});
   if(unit.scrollWidth>unit.clientWidth+1){unit.dataset.horizontalOverflow='true';horizontal.push({id:unit.dataset.unitId??'',label:unit.dataset.label??'',page:index+1});}
  }
 }
 return {pageCount:sheets.length,withinLimit:sheets.length<=pageLimit&&horizontal.length===0,overflow,horizontal};
}
export type ClassicalAnalysis = Awaited<ReturnType<typeof paginateClassicalDocument>>;
