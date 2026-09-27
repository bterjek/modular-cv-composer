import { error, fail, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { itemOrder } from '$lib/domain/order';
import { dataFromForm, labelFor } from '$lib/editor/fields';
import { attempt, str, tagList } from '$lib/server/editor';

function findEntry(ownerId: string, id: string) {
	const entry = repo.loadContent(ownerId).entries.find((e) => e.id === id);
	if (!entry) error(404, 'Not found');
	return entry;
}

export function load({ locals, params }) {
	const e = findEntry(locals.user!.id, params.id);
	return {
		entry: {
			...e,
			variants: [...e.variants].sort(itemOrder),
			items: [...e.items].sort(itemOrder).map((i) => ({ ...i, variants: [...i.variants].sort(itemOrder) }))
		},
		knownTags: repo.listTags(locals.user!.id).map((t) => t.name)
	};
}

/** Target of a wording form: exactly one of entryId / itemId. */
const target = (f: FormData) => (str(f, 'itemId') ? { itemId: str(f, 'itemId') } : { entryId: str(f, 'entryId') });

export const actions = {
	saveFields: async ({ request, locals, params }) => {
		const e = findEntry(locals.user!.id, params.id);
		const f = await request.formData();
		const data = dataFromForm(e.module, f);
		const r = attempt(() => {
			repo.updateEntry(locals.user!.id, e.id, { data, label: str(f, 'label') || labelFor(e.module, data) });
			repo.setTags(locals.user!.id, { entryId: e.id }, tagList(f, 'tags'));
		});
		return r.ok ? { saved: 'Saved.' } : r.failure;
	},
	addWording: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => {
			const id = repo.createVariant(locals.user!.id, { ...target(f), text: str(f, 'text'), length: str(f, 'length') || 'standard', isDefault: f.get('isDefault') === 'on' });
			const tags = tagList(f, 'tags');
			if (tags.length) repo.setTags(locals.user!.id, { variantId: id }, tags);
		});
		return r.ok ? { saved: 'Wording added.' } : r.failure;
	},
	saveWording: async ({ request, locals }) => {
		const f = await request.formData();
		const id = str(f, 'id');
		const r = attempt(() => {
			repo.updateVariant(locals.user!.id, id, {
				text: str(f, 'text'),
				length: str(f, 'length'),
				...(f.get('isDefault') === 'on' ? { isDefault: true } : {})
			});
			repo.setTags(locals.user!.id, { variantId: id }, tagList(f, 'tags'));
		});
		return r.ok ? { saved: 'Wording saved.' } : r.failure;
	},
	makeDefault: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => repo.updateVariant(locals.user!.id, str(f, 'id'), { isDefault: true }));
		return r.ok ? { saved: 'Default wording changed.' } : r.failure;
	},
	deleteWording: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => repo.deleteVariant(locals.user!.id, str(f, 'id')));
		return r.ok ? { saved: 'Wording deleted.' } : r.failure;
	},
	addItem: async ({ request, locals, params }) => {
		const f = await request.formData();
		const text = str(f, 'text');
		if (!text) return fail(400, { error: 'Write the item text.' });
		const r = attempt(() => {
			const itemId = repo.createItem(locals.user!.id, params.id);
			repo.createVariant(locals.user!.id, { itemId, text, isDefault: true });
			const tags = tagList(f, 'tags');
			if (tags.length) repo.setTags(locals.user!.id, { itemId }, tags);
		});
		return r.ok ? { saved: 'Item added.' } : r.failure;
	},
	itemTags: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => repo.setTags(locals.user!.id, { itemId: str(f, 'itemId') }, tagList(f, 'tags')));
		return r.ok ? { saved: 'Item tags saved.' } : r.failure;
	},
	moveItem: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => repo.moveItem(locals.user!.id, str(f, 'itemId'), str(f, 'dir') === 'up' ? 'up' : 'down'));
		return r.ok ? { saved: 'Order changed.' } : r.failure;
	},
	archiveItem: async ({ request, locals }) => {
		const f = await request.formData();
		const archived = str(f, 'archived') === 'true';
		const r = attempt(() => repo.setItemArchived(locals.user!.id, str(f, 'itemId'), archived));
		return r.ok ? { saved: archived ? 'Item archived — kept, but never used.' : 'Item restored.' } : r.failure;
	},
	deleteItem: async ({ request, locals }) => {
		const f = await request.formData();
		const r = attempt(() => repo.deleteItem(locals.user!.id, str(f, 'itemId')));
		return r.ok ? { saved: 'Item deleted.' } : r.failure;
	},
	archiveEntry: async ({ request, locals, params }) => {
		const archived = str(await request.formData(), 'archived') === 'true';
		const r = attempt(() => repo.setEntryArchived(locals.user!.id, params.id, archived));
		return r.ok ? { saved: archived ? 'Archived — kept, but never used on a CV.' : 'Restored.' } : r.failure;
	},
	deleteEntry: async ({ locals, params }) => {
		const e = findEntry(locals.user!.id, params.id);
		const r = attempt(() => repo.deleteEntry(locals.user!.id, e.id));
		if (!r.ok) return r.failure;
		redirect(303, `/edit/content/${e.module}`);
	}
};
