import { ZodError } from 'zod';
import type { RequestEvent } from '@sveltejs/kit';
import { error, fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { parseCVText } from '$lib/domain/import';
import { draftFromForm } from '$lib/server/import-forms';

export function load({ locals, params, setHeaders }) {
 setHeaders({ 'Cache-Control': 'private, no-store' });
 try { return { review: repo.getCVImport(locals.user!.id, params.id!), hasProfile: Boolean(repo.getProfile(locals.user!.id)), library: repo.loadContent(locals.user!.id).entries }; }
 catch (e) { if (e instanceof repo.NotFoundError) error(404, 'Import not found'); throw e; }
}
async function save({ locals, params, request }: RequestEvent, approve: boolean) {
 let draft;
 try {
  const previous = repo.getCVImport(locals.user!.id, params.id!);
  if (previous.acceptedAt) return { saved: 'Already added to the library.' };
  const form = await request.formData();
  draft = draftFromForm(form, previous.draft);
  repo.updateCVImport(locals.user!.id, params.id!, draft);
  if (approve) repo.approveCVImport(locals.user!.id, params.id!);
 } catch (e) {
  if (e instanceof repo.NotFoundError) error(404, 'Import not found');
  if (e instanceof repo.InvalidError) return fail(400, { error: e.message, draft });
  throw e;
 }
 redirect(303, `/edit/imports/${params.id}`);
}
export const actions = {
 save: event => save(event, false),
 approve: event => save(event, true),
 reparse: async ({ locals, params, request }) => {
  try {
   const previous = repo.getCVImport(locals.user!.id, params.id!);
   const text = String((await request.formData()).get('rawText') ?? '');
   if (text.length > 200000) return fail(400, { error: 'Use at most 200,000 characters.' });
   const draft = parseCVText(text, previous.source.filename);
   draft.name = previous.draft.name;
   draft.targeting = previous.draft.targeting;
   repo.updateCVImport(locals.user!.id, params.id!, draft);
  } catch (e) {
   if (e instanceof repo.NotFoundError) error(404, 'Import not found');
   if (e instanceof ZodError) return fail(400, { error: 'The text is too long or complex. Use shorter blocks.' });
   if (e instanceof repo.InvalidError) return fail(400, { error: e.message });
   throw e;
  }
  redirect(303, `/edit/imports/${params.id}`);
 },
 discard: async ({ locals, params }) => {
  try { const row = repo.getCVImport(locals.user!.id, params.id!); repo.deleteSourceDocument(locals.user!.id, row.sourceDocumentId); }
  catch (e) { if (e instanceof repo.NotFoundError) error(404, 'Import not found'); throw e; }
  redirect(303, '/edit/imports');
 }
};
