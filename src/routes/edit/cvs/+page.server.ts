import { fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
export function load({ locals, setHeaders }) {
 setHeaders({ 'Cache-Control': 'private, no-store' });
 return { cvs: repo.listCompositions(locals.user!.id).map(cv => ({ id: cv.id, name: cv.name, createdAt: cv.createdAt, sections: cv.document.sections.length })) };
}

export const actions={create:async({locals,request})=>{try{const id=repo.newComposition(locals.user!.id,String((await request.formData()).get('name')??''));redirect(303,`/edit/cvs/${id}`);}catch(e){if(e instanceof repo.InvalidError)return fail(400,{error:e.message});throw e;}}};
