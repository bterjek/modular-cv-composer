import { error } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { asciiFileName } from '$lib/render/filename';
export function GET({locals,params}){try{const template=repo.getTemplate(locals.user!.id,params.id);if(!template.referenceSourceId)error(404,'No reference file');const file=repo.getSourceFile(locals.user!.id,template.referenceSourceId);return new Response(new Uint8Array(file.bytes),{headers:{'Content-Type':file.mediaType,'Content-Disposition':`attachment; filename="${asciiFileName(file.filename)}"`,'Cache-Control':'private, no-store'}});}catch(e){if(e instanceof repo.NotFoundError)error(404,'Reference not found');throw e;}}
