import { expect, it } from 'vitest';
import { parseCVText } from '$lib/domain/import';
import { draftFromForm } from './import-forms';
it('keeps source provenance correct when a reviewed block is split and inserts shift later blocks', () => {
 const previous=parseCVText('Summary\nFirst paragraph\nSecond paragraph\nSkills\nITIL', 'cv.pdf');
 const form=new FormData();
 form.set('name','Reviewed');form.set('basis','unspecified');form.set('blockCount','3');
 for(const [i,origin] of [0,0,1].entries()) {
  form.set(`origin-${i}`,String(origin));form.set(`module-${i}`,i===2?'skills':'summary');
  form.set(`included-${i}`,'on');form.set(`label-${i}`,`Block ${i}`);
  form.set(`text-${i}`,i===0?'First paragraph':i===1?'Second paragraph':'');
 }
 form.set('b2-group','Skills');form.set('items-2','ITIL');
 const draft=draftFromForm(form,previous);
 expect(draft.blocks[0].sourceExcerpt).toBe(previous.blocks[0].sourceExcerpt);
 expect(draft.blocks[1].sourceExcerpt).toBe(previous.blocks[0].sourceExcerpt);
 expect(draft.blocks[2].sourceExcerpt).toBe(previous.blocks[1].sourceExcerpt);
 expect(draft.blocks[2].data).toEqual({group:'Skills'});
});
it('persists explicit reconciliation choices but drops a bullet match if its reviewed text changed', () => {
 const previous=parseCVText('Skills\nITIL', 'cv.pdf');const form=new FormData();
 for(const [key,value] of Object.entries({name:'Reviewed',basis:'confirmed',blockCount:'1','module-0':'skills','label-0':'Skills','included-0':'on','origin-0':'0','b0-group':'Skills','items-0':'Updated ITIL','reuse-0':'entry','libraryFacts-0':'{}','useLibraryFacts-0':'on','itemReuse-0-0':'item','itemReviewedText-0-0':'Old ITIL','confirmNumeric-0-0':'on'})) form.set(key,value);
 let draft=draftFromForm(form,previous);
 expect(draft.blocks[0].reconciliation).toEqual({entryId:'entry',libraryFacts:'{}',facts:'library',items:[]});
 form.set('itemReviewedText-0-0','Updated ITIL');draft=draftFromForm(form,previous);
 expect(draft.blocks[0].reconciliation?.items[0]).toEqual({index:0,text:'Updated ITIL',itemId:'item',confirmNumericDifference:true});
});
