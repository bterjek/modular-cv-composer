import { error, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { recipe as recipeSchema, overrides as overridesSchema } from '$lib/domain/recipe';
import { entryOrder, itemOrder } from '$lib/domain/order';
import { overridesFromForm } from '$lib/editor/forms';
import { MODULE_LABELS } from '$lib/editor/fields';
import { attempt, str, optStr, latestExperienceId } from '$lib/server/editor';

function get(ownerId: string, id: string) {
	try {
		return repo.getJobTarget(ownerId, id);
	} catch (e) {
		if (e instanceof repo.NotFoundError) error(404, 'Not found');
		throw e;
	}
}

const short = (s: string | undefined, n = 80) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : '');

export function load({ locals, params }) {
	const ownerId = locals.user!.id;
	const job = get(ownerId, params.id);
	const category = repo.getCategory(ownerId, job.categoryId);
	const recipe = recipeSchema.parse(category.recipe);
	const o = overridesSchema.parse(job.overrides);
	const cv = repo.resolveJobTarget(ownerId, job.id);

	// Latest decision per id from the trace, so the page can say "in" or "out: reason".
	const decision = new Map<string, { outcome: string; reason: string }>();
	for (const t of cv.trace) if (t.kind !== 'variant') decision.set(t.id, t);
	const chosen = new Set(cv.trace.filter((t) => t.kind === 'variant').map((t) => t.id));

	const content = repo.loadContent(ownerId);
	const order = o.moduleOrder?.length ? o.moduleOrder : recipe.modules.map((m) => m.module);
	const sections = recipe.modules.map((rule) => ({
		module: rule.module,
		label: MODULE_LABELS[rule.module],
		orderOverride: o.moduleOrder?.length ? order.indexOf(rule.module) + 1 : '',
		entries: content.entries
			.filter((e) => e.module === rule.module && !e.archived)
			.sort(entryOrder)
			.map((e) => ({
				id: e.id,
				label: e.label,
				excluded: o.excludeEntries?.includes(e.id) ?? false,
				state: decision.get(e.id) ?? { outcome: 'dropped', reason: '—' },
				pin: o.pinVariants?.[e.id] ?? '',
				variants: e.variants.length > 1 ? [...e.variants].sort(itemOrder).map((v) => ({ id: v.id, text: short(v.text), chosen: chosen.has(v.id) })) : [],
				items: e.items
					.filter((i) => !i.archived && i.variants.length)
					.sort(itemOrder)
					.map((i) => ({
						id: i.id,
						text: short((i.variants.find((v) => v.isDefault) ?? i.variants[0]).text, 110),
						mode: o.includeItems?.includes(i.id) ? 'include' : o.excludeItems?.includes(i.id) ? 'exclude' : 'auto',
						state: decision.get(i.id) ?? { outcome: 'dropped', reason: 'entry not used' },
						pin: o.pinVariants?.[i.id] ?? '',
						variants: i.variants.length > 1 ? [...i.variants].sort(itemOrder).map((v) => ({ id: v.id, text: short(v.text), chosen: chosen.has(v.id) })) : []
					}))
			}))
	}));

	return {
		job: { id: job.id, company: job.company, roleTitle: job.roleTitle, jobUrl: job.jobUrl, jobAdText: job.jobAdText, status: job.status, categoryId: job.categoryId },
		categoryName: category.name,
		categories: repo.listCategories(ownerId).map((c) => ({ id: c.id, name: c.name })),
		overrides: { preferTags: o.preferTags?.join(', ') ?? '', length: o.length ?? '' },
		categoryDefaults: { preferTags: recipe.preferTags.join(', '), length: recipe.length },
		sections,
		warnings: cv.warnings,
		adTerms: repo.jobTerms(ownerId, job.id),
		writeTarget: latestExperienceId(ownerId),
		snapshots: repo.listSnapshots(ownerId, { jobTargetId: job.id }).map((x) => ({ id: x.id, label: x.label, createdAt: x.createdAt }))
	};
}

export const actions = {
	details: async ({ request, locals, params }) => {
		const f = await request.formData();
		const r = attempt(() =>
			repo.updateJobTarget(locals.user!.id, params.id, {
				company: str(f, 'company'),
				roleTitle: str(f, 'roleTitle'),
				categoryId: str(f, 'categoryId'),
				jobUrl: optStr(f, 'jobUrl'),
				jobAdText: optStr(f, 'jobAdText'),
				status: str(f, 'status')
			})
		);
		return r.ok ? { saved: 'Job saved.' } : r.failure;
	},
	tailor: async ({ request, locals, params }) => {
		const ownerId = locals.user!.id;
		const job = get(ownerId, params.id);
		const recipe = recipeSchema.parse(repo.getCategory(ownerId, job.categoryId).recipe);
		const overrides = overridesFromForm(await request.formData(), recipe.modules.map((m) => m.module));
		const r = attempt(() => repo.updateJobTarget(ownerId, params.id, { overrides }));
		return r.ok ? { saved: 'Tailoring saved.' } : r.failure;
	},
	applyTerms: async ({ locals, params }) => {
		const r = attempt(() => repo.applyTermSuggestion(locals.user!.id, params.id));
		return r.ok ? { saved: r.value ? `Applied ${r.value} suggested change${r.value === 1 ? '' : 's'}.` : 'Nothing to apply.' } : r.failure;
	},
	ignoreTerm: async ({ request, locals }) => {
		const f = await request.formData();
		repo.setTermIgnored(locals.user!.id, str(f, 'key'), str(f, 'ignored') === 'true');
		return { saved: 'Term updated.' };
	},
	freeze: async ({ request, locals, params }) => {
		const f = await request.formData();
		const r = attempt(() =>
			repo.createSnapshot(locals.user!.id, { jobTargetId: params.id }, { label: optStr(f, 'label'), markSent: f.get('markSent') === 'on' })
		);
		if (!r.ok) return r.failure;
		redirect(303, `/edit/snapshots/${r.value}`);
	},
	reset: async ({ locals, params }) => {
		const r = attempt(() => repo.updateJobTarget(locals.user!.id, params.id, { overrides: {} }));
		return r.ok ? { saved: 'All job changes removed — the CV now follows its category.' } : r.failure;
	},
	delete: async ({ locals, params }) => {
		const r = attempt(() => repo.deleteJobTarget(locals.user!.id, params.id));
		if (!r.ok) return r.failure;
		redirect(303, '/edit/jobs');
	}
};
