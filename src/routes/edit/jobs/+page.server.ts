import { redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { attempt, str, setPreview } from '$lib/server/editor';

export function load({ locals }) {
	const ownerId = locals.user!.id;
	const cats = repo.listCategories(ownerId);
	return {
		list: repo.listJobTargets(ownerId).map((j) => ({
			id: j.id,
			company: j.company,
			roleTitle: j.roleTitle,
			status: j.status,
			category: cats.find((c) => c.id === j.categoryId)?.name ?? ''
		})),
		categories: cats.map((c) => ({ id: c.id, name: c.name }))
	};
}

export const actions = {
	create: async ({ request, locals, cookies }) => {
		const f = await request.formData();
		const r = attempt(() =>
			repo.createJobTarget(locals.user!.id, { categoryId: str(f, 'categoryId'), company: str(f, 'company'), roleTitle: str(f, 'roleTitle') })
		);
		if (!r.ok) return r.failure;
		setPreview(cookies, `target:${r.value}`);
		redirect(303, `/edit/jobs/${r.value}`);
	}
};
