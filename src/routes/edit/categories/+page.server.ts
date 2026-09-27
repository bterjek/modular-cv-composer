import { redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { DEFAULT_RECIPE_MODULES } from '$lib/editor/forms';
import { attempt, str, optStr, setPreview } from '$lib/server/editor';

export function load({ locals }) {
	const ownerId = locals.user!.id;
	const jobs = repo.listJobTargets(ownerId);
	return {
		list: repo.listCategories(ownerId).map((c) => ({
			id: c.id,
			name: c.name,
			description: c.description,
			sections: c.recipe.modules.length,
			jobs: jobs.filter((j) => j.categoryId === c.id).length
		}))
	};
}

export const actions = {
	create: async ({ request, locals, cookies }) => {
		const f = await request.formData();
		const r = attempt(() =>
			repo.createCategory(locals.user!.id, {
				name: str(f, 'name'),
				description: optStr(f, 'description'),
				designKey: 'modern',
				recipe: { version: 1, modules: DEFAULT_RECIPE_MODULES.map((module) => ({ module })), preferTags: [], length: 'standard' }
			})
		);
		if (!r.ok) return r.failure;
		setPreview(cookies, `category:${r.value}`);
		redirect(303, `/edit/categories/${r.value}`);
	}
};
