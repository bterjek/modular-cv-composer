import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import * as repo from '$lib/server/repo';
import { parseChatResponse } from '$lib/domain/exchange';
export function load({locals,params,setHeaders}){setHeaders({'Cache-Control':'private, no-store'});try{return {cv:repo.getComposition(locals.user!.id,params.id)};}catch(e){if(e instanceof repo.NotFoundError)error(404,'CV not found');throw e;}}
async function read(request:Request){const f=await request.formData();return String(f.get('response')??'');}
export const actions={
 review:async({locals,params,request})=>{repo.getComposition(locals.user!.id,params.id);const response=await read(request);try{return {candidate:parseChatResponse(response),response};}catch(e){return fail(400,{error:e instanceof ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):'Paste a valid CV response JSON using the downloaded format.',response:response.slice(0,500000)});}},
 accept:async({locals,params,request})=>{const original=repo.getComposition(locals.user!.id,params.id);const response=await read(request);let id:string;try{const candidate=parseChatResponse(response);id=repo.createComposition(locals.user!.id,{name:candidate.name,document:candidate.document,designKey:original.designKey,style:original.style});}catch{return fail(400,{error:'The returned CV is invalid. Review its fields before accepting.',response});}redirect(303,`/edit/cvs/${id}`);}
};
