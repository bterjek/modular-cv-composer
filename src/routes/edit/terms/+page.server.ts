import * as repo from '$lib/server/repo';
import { latestExperienceId, str } from '$lib/server/editor';

export function load({ locals }) {
	return { log: repo.gapLog(locals.user!.id), writeTarget: latestExperienceId(locals.user!.id) };
}

export const actions = {
	ignoreTerm: async ({ request, locals }) => {
		const f = await request.formData();
		repo.setTermIgnored(locals.user!.id, str(f, 'key'), str(f, 'ignored') === 'true');
		return { saved: 'Term updated.' };
	}
};
