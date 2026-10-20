import { redirect } from '@sveltejs/kit';
import { env } from '$lib/server/env';
export async function POST({request,cookies}){
 const form=await request.formData();const value=form.get('appearance')==='dos'?'dos':'plain';
 cookies.set('cv_appearance',value,{path:'/',httpOnly:true,sameSite:'lax',secure:env.secureCookies,maxAge:31536000});
 const back=String(form.get('back')??'/');redirect(303,back.startsWith('/')&&!back.startsWith('//')&&!back.includes('\\')?back:'/');
}
