import * as repo from '$lib/server/repo';
import { attempt, str, optStr } from '$lib/server/editor';

export function load({ locals }) {
	return { profile: repo.getProfile(locals.user!.id), account: locals.user! };
}

export const actions = {
	default: async ({ request, locals }) => {
		const f = await request.formData();
		const links = [0, 1, 2, 3, 4]
			.map((i) => ({ label: str(f, `linkLabel${i}`), url: str(f, `linkUrl${i}`) }))
			.filter((l) => l.label || l.url);
		const r = attempt(() =>
			repo.upsertProfile(locals.user!.id, {
				fullName: str(f, 'fullName'),
				email: str(f, 'email'),
				phone: optStr(f, 'phone'),
				location: optStr(f, 'location'),
				links
			})
		);
		return r.ok ? { saved: 'Profile saved.' } : r.failure;
	}
};
