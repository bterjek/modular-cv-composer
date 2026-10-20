// Legacy assembly view, with an explicit copy into independent saved CVs.
import { error, fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { hasContent, seedDemo } from '$lib/server/demo';
import { isEnabled } from '$lib/server/flags';

export function load({ locals, url }) {
	const ownerId = locals.user!.id;
	const categoryId = url.searchParams.get('category');
	const targetId = url.searchParams.get('target');
	let cv = null;
	try {
		if (targetId) cv = repo.resolveJobTarget(ownerId, targetId);
		else if (categoryId) cv = repo.resolveCategory(ownerId, categoryId);
	} catch (e) {
		if (e instanceof repo.NotFoundError) error(404, 'Not found');
		throw e;
	}

	// Human-readable names for the trace
	const labels: Record<string, string> = {};
	const content = repo.loadContent(ownerId);
	for (const e of content.entries) {
		labels[e.id] = `${e.module}: ${e.label}`;
		for (const v of e.variants) labels[v.id] = v.text;
		for (const i of e.items) {
			labels[i.id] = i.variants.find((v) => v.isDefault)?.text ?? i.variants[0]?.text ?? '(item without wording)';
			for (const v of i.variants) labels[v.id] = v.text;
		}
	}

	return {
		empty: content.entries.length === 0,
		categories: repo.listCategories(ownerId).map((c) => ({ id: c.id, name: c.name })),
		targets: repo.listJobTargets(ownerId).map((t) => ({ id: t.id, name: `${t.company} — ${t.roleTitle}` })),
		selected: { categoryId, targetId },
		pdfEnabled: isEnabled('render.pdf', ownerId),
		cv,
		labels
	};
}

export const actions = {
 saveCopy: async ({ locals, request }) => {
  const ownerId = locals.user!.id;
  const form = await request.formData();
  const targetId = String(form.get('target') ?? '').trim();
  const categoryId = String(form.get('category') ?? '').trim();
  if (!targetId && !categoryId) return fail(400, { error: 'Choose a category or job first.' });
  let id: string;
  try {
   const cv = targetId ? repo.resolveJobTarget(ownerId, targetId) : repo.resolveCategory(ownerId, categoryId);
   const target = targetId ? repo.getJobTarget(ownerId, targetId) : null;
   const name = target ? `${target.company} — ${target.roleTitle}` : repo.getCategory(ownerId, categoryId).name;
   id = repo.createComposition(ownerId, { name: name.slice(0, 200), document: repo.compositionDocumentFromCV(cv) });
  } catch (e) {
   if (e instanceof repo.NotFoundError) error(404, 'Not found');
   if (e instanceof repo.InvalidError) return fail(400, { error: e.message });
   throw e;
  }
  redirect(303, `/edit/cvs/${id}`);
 },
	loadDemo: async ({ locals }) => {
		if (hasContent(locals.user!.id)) return fail(400, { error: 'Example content can only be loaded into an empty account.' });
		seedDemo(locals.user!.id);
		return { ok: true };
	}
};
