import { error, fail, redirect } from '@sveltejs/kit';
import { compositionLayout } from '$lib/server/render/classical';
import { isEnabled } from '$lib/server/flags';
import * as repo from '$lib/server/repo';
export async function load({ locals, params, setHeaders }) {
 setHeaders({ 'Cache-Control': 'private, no-store' });
 try {
  const cv = repo.getComposition(locals.user!.id, params.id);
  const origin = repo.listCVImports(locals.user!.id).find(item => item.sourceDocumentId === cv.sourceDocumentId);
  const library = repo.loadContent(locals.user!.id).entries;
  const entryIds = library.map(entry => entry.id);
  let layout: { analysis: Awaited<ReturnType<typeof compositionLayout>>['analysis']; revision: string } | null = null;
  try { const measured = await compositionLayout(locals.user!.id, cv.document, cv.designKey==='reference'?cv.style:{}); layout = { analysis: measured.analysis, revision: measured.revision }; }
  catch (e) { console.error('[composition-layout] Preview unavailable', e instanceof Error ? e.message : 'Unknown error'); }
  return { cv, revision: repo.compositionRevision(cv), library, importId: origin?.id ?? null, entryIds, layout, pdfEnabled: isEnabled('render.pdf', locals.user!.id) };
 } catch (e) { if (e instanceof repo.NotFoundError) error(404,'Saved CV not found'); throw e; }
}

export const actions = {
 save: async ({locals,params,request}) => {
  const f=await request.formData();const name=String(f.get('name')??'');let draft;
  try {
   const raw=String(f.get('document')??'');if(raw.length>500000)throw new repo.InvalidError('This CV is too large.');
   draft=JSON.parse(raw);
   repo.saveComposition(locals.user!.id,params.id,String(f.get('revision')??''),{name,document:draft});
   return {saved:'CV saved.'};
  }catch(e){if(e instanceof repo.NotFoundError)error(404,'CV not found');if(e instanceof repo.InvalidError||e instanceof SyntaxError)return fail(400,{error:e.message,draft,name});throw e;}
 },
 duplicate: ({locals,params})=>{const id=repo.duplicateComposition(locals.user!.id,params.id);redirect(303,`/edit/cvs/${id}`);},
 delete: async ({locals,params,request})=>{const f=await request.formData();if(f.get('confirm')!=='DELETE')return fail(400,{error:'Type DELETE to delete this saved CV.'});repo.deleteComposition(locals.user!.id,params.id);redirect(303,'/edit/cvs');},
 publish: async ({locals,params,request})=>{const f=await request.formData();try{const id=repo.publishCompositionEntry(locals.user!.id,params.id,String(f.get('revision')??''),Number(f.get('section')),Number(f.get('entry')));return {saved:'A new library entry was created.',libraryId:id};}catch(e){if(e instanceof repo.InvalidError)return fail(400,{error:e.message});if(e instanceof repo.NotFoundError)error(404,'CV not found');throw e;}}
};
