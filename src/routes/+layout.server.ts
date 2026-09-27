import { env } from '$lib/server/env';
import { enabledFlags } from '$lib/server/flags';

export function load({ locals }) {
	return {
		user: locals.user,
		appEnv: env.appEnv,
		flags: locals.user ? enabledFlags(locals.user.id) : []
	};
}
