import { ZodError } from 'zod';
import { fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { extractCV, MAX_CV_BYTES } from '$lib/server/import-extract';
import { parseCVText } from '$lib/domain/import';

export function load({ locals, setHeaders }) {
 setHeaders({ 'Cache-Control': 'private, no-store' });
 return { imports: repo.listCVImports(locals.user!.id) };
}
export const actions = {
 upload: async ({ request, locals }) => {
  const form = await request.formData();
  const file = form.get('cv');
  if (!(file instanceof File) || !file.size || file.size > MAX_CV_BYTES) return fail(400, { error: 'Choose a PDF or DOCX up to 4 MB.' });
  let id: string;
  try {
   const bytes = Buffer.from(await file.arrayBuffer());
   const { text, warnings } = await extractCV(file.name, bytes);
   const draft = parseCVText(text, file.name, warnings);
   id = repo.createCVImport(locals.user!.id, { filename: file.name, bytes, extractedText: text, draft });
  } catch (e) {
   if (e instanceof ZodError) return fail(400, { error: 'This document contains more text or longer blocks than the importer supports. Try a shorter CV.' });
   if (e instanceof repo.InvalidError) return fail(400, { error: e.message });
   throw e;
  }
  redirect(303, `/edit/imports/${id}`);
 }
};
