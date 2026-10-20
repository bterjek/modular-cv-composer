import { templateStyleSchema } from '$lib/domain/style';
import { error, json, isHttpError } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { compositionLayout, classicalPDF, requireTwoPages, PageLimitError } from '$lib/server/render/classical';
import { htmlResponse, pdfResponse } from '$lib/server/render/respond';
import { isEnabled } from '$lib/server/flags';
import { hit } from '$lib/server/auth/rate-limit';

export async function GET({ locals, params, url }) {
 const ownerId=locals.user!.id;
 const format=url.searchParams.get('format')??'preview';
 if(!['preview','analysis','html','pdf'].includes(format))error(400,'Unknown format');
 let cv;
 try{cv=repo.getComposition(ownerId,params.id);}catch(e){if(e instanceof repo.NotFoundError)error(404,'Saved CV not found');throw e;}
 if(format==='pdf'&&!isEnabled('render.pdf',ownerId))error(403,'PDF export is not switched on for your account yet.');
 if(!hit(`composition-layout:${ownerId}`,90,10*60_000).allowed)error(429,'Too many previews. Wait a few minutes.');
 if(format==='pdf'&&!hit(`pdf:${ownerId}`,30,10*60_000).allowed)error(429,'Too many PDF exports. Wait a few minutes.');
 try{
  let style=cv.designKey==='reference'?cv.style:{};
  if(url.searchParams.has('stylePreview')){
   if(!['preview','analysis'].includes(format))error(400,'Save the template before exporting.');
   try{style=templateStyleSchema.parse(JSON.parse(url.searchParams.get('stylePreview')!));}catch{error(400,'Unsupported style choices.');}
  }
  const layout=await compositionLayout(ownerId,cv.document,style);
  if(format==='analysis')return json({...layout.analysis,revision:layout.revision},{headers:{'Cache-Control':'private, no-store'}});
  if(format==='preview')return htmlResponse(layout.html,{fontSrc:'data:'});
  if(format==='html')requireTwoPages(layout);
  const name=`${cv.document.profile?.fullName??'CV'} - ${cv.name}`;
  if(format==='html')return htmlResponse(layout.html,{fontSrc:'data:',download:`${name}.html`});
  return pdfResponse(await classicalPDF(layout),`${name}.pdf`);
 }catch(e){
  if(isHttpError(e))throw e;
  if(e instanceof PageLimitError)error(422,e.message);
  console.error('[composition-layout] Preview/export failed',e instanceof Error?e.message:'Unknown error');
  error(503,'The preview could not be generated. Your saved content is still available.');
 }
}
