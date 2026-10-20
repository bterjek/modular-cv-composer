import { error } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { asciiFileName } from '$lib/render/filename';
export function GET({ locals, params }) {
 try {
  const review = repo.getCVImport(locals.user!.id, params.id);
  const original = repo.getSourceFile(locals.user!.id, review.sourceDocumentId);
  return new Response(new Uint8Array(original.bytes), { headers: {
   'Content-Type': original.mediaType, 'Content-Disposition': `attachment; filename="${asciiFileName(original.filename)}"`,
   'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'
  } });
 } catch (e) { if (e instanceof repo.NotFoundError) error(404, 'Original not found'); throw e; }
}
