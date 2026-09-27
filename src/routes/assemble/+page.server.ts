// Read-only view of the assembly engine: pick a category or job target, see the
// resolved CV as text and why each piece is in or out. Replaced by the editor + preview in steps 4–5.
import { error, fail } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { hasContent, seedDemo } from '$lib/server/demo';

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
		cv,
		labels
	};
}

export const actions = {
	loadDemo: async ({ locals }) => {
		if (hasContent(locals.user!.id)) return fail(400, { error: 'Example content can only be loaded into an empty account.' });
		seedDemo(locals.user!.id);
		return { ok: true };
	}
};
