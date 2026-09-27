import { error, redirect } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { isEnabled } from '$lib/server/flags';
import { env } from '$lib/server/env';
import { attempt, str } from '$lib/server/editor';

function get(ownerId: string, id: string) {
	try {
		return repo.getSnapshot(ownerId, id);
	} catch (e) {
		if (e instanceof repo.NotFoundError) error(404, 'Not found');
		throw e;
	}
}

export function load({ locals, params }) {
	const ownerId = locals.user!.id;
	const s = get(ownerId, params.id);
	const sharing = isEnabled('snapshots.share-links', ownerId);
	return {
		snapshot: { id: s.id, label: s.label, createdAt: s.createdAt, jobTargetId: s.jobTargetId, designKey: s.designKey, engineVersion: s.engineVersion },
		pdfEnabled: isEnabled('render.pdf', ownerId),
		sharing,
		links: sharing ? repo.listShareLinks(ownerId, s.id) : []
	};
}

export const actions = {
	share: async ({ request, locals, params }) => {
		if (!isEnabled('snapshots.share-links', locals.user!.id)) error(403, 'Share links are not switched on for your account yet.');
		const f = await request.formData();
		const days = str(f, 'days');
		const r = attempt(() => repo.createShareLink(locals.user!.id, params.id, { expiresInDays: days ? Number(days) : null }));
		if (!r.ok) return r.failure;
		return { saved: 'Share link created — copy it now, it is shown only once.', url: `${env.origin.replace(/\/$/, '')}/s/${r.value.token}` };
	},
	revoke: async ({ request, locals }) => {
		const id = str(await request.formData(), 'id');
		const r = attempt(() => repo.revokeShareLink(locals.user!.id, id));
		return r.ok ? { saved: 'Link withdrawn. Anyone opening it now sees “not available”.' } : r.failure;
	},
	delete: async ({ locals, params }) => {
		const r = attempt(() => repo.deleteSnapshot(locals.user!.id, params.id));
		if (!r.ok) return r.failure;
		redirect(303, '/edit/snapshots');
	}
};
