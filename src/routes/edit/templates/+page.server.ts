import { error, fail } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
export function load({locals,setHeaders}){setHeaders({'Cache-Control':'private, no-store'});return {templates:repo.listTemplates(locals.user!.id)};}
export const actions={delete:async({locals,request})=>{const f=await request.formData();if(f.get('confirm')!=='DELETE')return fail(400,{error:'Type DELETE to delete this template.'});try{repo.deleteTemplate(locals.user!.id,String(f.get('id')??''));return {saved:true};}catch(e){if(e instanceof repo.NotFoundError)error(404,'Template not found');throw e;}}};
