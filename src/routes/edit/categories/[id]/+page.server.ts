import { error, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { recipe as recipeSchema } from '$lib/domain/recipe';
import { recipeFromForm, recipeRows } from '$lib/editor/forms';
import { designList } from '$lib/render';
import { attempt, str, optStr } from '$lib/server/editor';

function get(ownerId: string, id: string) {
	try {
		return repo.getCategory(ownerId, id);
	} catch (e) {
		if (e instanceof repo.NotFoundError) error(404, 'Not found');
		throw e;
	}
}

export function load({ locals, params }) {
	const c = get(locals.user!.id, params.id);
	const recipe = recipeSchema.parse(c.recipe);
	return {
		category: { id: c.id, name: c.name, description: c.description, designKey: c.designKey },
		recipe: { preferTags: recipe.preferTags.join(', '), length: recipe.length },
		rows: recipeRows(recipe),
		designs: designList(),
		knownTags: repo.listTags(locals.user!.id).map((t) => t.name),
		jobs: repo.listJobTargets(locals.user!.id).filter((j) => j.categoryId === c.id).length
	};
}

export const actions = {
	save: async ({ request, locals, params }) => {
		const f = await request.formData();
		const r = attempt(() =>
			repo.updateCategory(locals.user!.id, params.id, {
				name: str(f, 'name'),
				description: optStr(f, 'description'),
				designKey: str(f, 'designKey'),
				recipe: recipeFromForm(f)
			})
		);
		return r.ok ? { saved: 'Category saved.' } : r.failure;
	},
	duplicate: async ({ locals, params }) => {
		const c = get(locals.user!.id, params.id);
		const r = attempt(() =>
			repo.createCategory(locals.user!.id, { name: `${c.name} (copy)`, description: c.description, recipe: c.recipe, designKey: c.designKey })
		);
		if (!r.ok) return r.failure;
		redirect(303, `/edit/categories/${r.value}`);
	},
	delete: async ({ locals, params }) => {
		const r = attempt(() => repo.deleteCategory(locals.user!.id, params.id));
		if (!r.ok) return r.failure;
		redirect(303, '/edit/categories');
	}
};
