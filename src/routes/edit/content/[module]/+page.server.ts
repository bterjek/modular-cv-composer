import { error, fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { MODULES, type Module } from '$lib/domain/modules';
import { entryOrder } from '$lib/domain/order';
import { ENTRY_WORDINGS, dataFromForm, labelFor } from '$lib/editor/fields';
import { attempt, str, tagList } from '$lib/server/editor';

const isModule = (m: string): m is Module => (MODULES as readonly string[]).includes(m);

export function load({ locals, params }) {
	if (!isModule(params.module)) error(404, 'Unknown section');
	const entries = repo
		.loadContent(locals.user!.id)
		.entries.filter((e) => e.module === params.module)
		.sort(entryOrder)
		.map((e) => ({
			id: e.id,
			label: e.label,
			data: e.data,
			archived: e.archived,
			tags: e.tags,
			wordings: e.variants.length,
			items: e.items.filter((i) => !i.archived).length,
			preview: e.variants.find((v) => v.isDefault)?.text ?? e.variants[0]?.text ?? null
		}));
	return { module: params.module, entries };
}

export const actions = {
	create: async ({ request, locals, params }) => {
		if (!isModule(params.module)) error(404);
		const module = params.module;
		const f = await request.formData();
		const data = dataFromForm(module, f);
		const text = str(f, 'text');
		if (ENTRY_WORDINGS[module] === 'required' && !text) return fail(400, { error: 'Write the first wording.' });
		const r = attempt(() => {
			const id = repo.createEntry(locals.user!.id, { module, label: str(f, 'label') || labelFor(module, data), data });
			const tags = tagList(f, 'tags');
			if (tags.length) repo.setTags(locals.user!.id, { entryId: id }, tags);
			if (text) repo.createVariant(locals.user!.id, { entryId: id, text, isDefault: true, length: str(f, 'length') || 'standard' });
			return id;
		});
		if (!r.ok) return r.failure;
		redirect(303, `/edit/content/entry/${r.value}`);
	},
	move: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => repo.moveEntry(locals.user!.id, str(f, 'id'), str(f, 'dir') === 'up' ? 'up' : 'down'));
		return r.ok ? { saved: 'Order changed.' } : r.failure;
	}
};
