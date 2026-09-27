import { env } from '$lib/server/env';
import { enabledFlags } from '$lib/server/flags';
import { openFeedbackCount } from '$lib/server/feedback';

export function load({ locals }) {
	return {
		user: locals.user,
		appEnv: env.appEnv,
		flags: locals.user ? enabledFlags(locals.user.id) : [],
		appVersion: env.appVersion,
		openFeedback: locals.user?.role === 'admin' ? openFeedbackCount() : 0
	};
}
