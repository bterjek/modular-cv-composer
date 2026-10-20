import { error, fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { templateFromForm } from '$lib/server/template-forms';
import { MAX_CV_BYTES } from '$lib/server/import-extract';
export function load({locals,params,setHeaders}){setHeaders({'Cache-Control':'private, no-store'});try{return {cv:repo.getComposition(locals.user!.id,params.id),templates:repo.listTemplates(locals.user!.id)};}catch(e){if(e instanceof repo.NotFoundError)error(404,'CV not found');throw e;}}
export const actions={
 preview:async({locals,params,request})=>{repo.getComposition(locals.user!.id,params.id);try{return {style:templateFromForm(await request.formData())};}catch{return fail(400,{error:'Choose supported style settings or paste a style JSON object with those choices.'});}},
 save:async({locals,params,request})=>{
  repo.getComposition(locals.user!.id,params.id);const f=await request.formData();
  try{
   const style=templateFromForm(f),file=f.get('reference');
   let reference: {filename:string;bytes:Buffer}|undefined;
   if(file instanceof File&&file.size){if(file.size>MAX_CV_BYTES)throw new Error('Choose a PDF or DOCX up to 4 MB.');reference={filename:file.name,bytes:Buffer.from(await file.arrayBuffer())};}
   repo.createAndApplyTemplate(locals.user!.id,params.id,{name:String(f.get('name')??''),style},reference);
  }catch(e){return fail(400,{error:e instanceof repo.InvalidError?e.message:'Check the template name, file and supported style choices.'});}
  redirect(303,`/edit/cvs/${params.id}`);
 },
 apply:async({locals,params,request})=>{try{const f=await request.formData();repo.applyTemplate(locals.user!.id,params.id,String(f.get('template')??'')||null);}catch(e){if(e instanceof repo.NotFoundError)error(404,'CV or template not found');throw e;}redirect(303,`/edit/cvs/${params.id}`);}
};
