import { env } from '$lib/server/env';
import { enabledFlags } from '$lib/server/flags';
import { openFeedbackCount } from '$lib/server/feedback';

export function load({ locals, cookies }) {
	const flags=locals.user?enabledFlags(locals.user.id):[];
	const saved=cookies.get('cv_appearance');
	return {
        appearance: saved==='dos'||saved==='plain'?saved:flags.includes('editor.dos-shell')?'dos':'plain',
		user: locals.user,
		appEnv: env.appEnv,
		flags,
		appVersion: env.appVersion,
		openFeedback: locals.user?.role === 'admin' ? openFeedbackCount() : 0
	};
}
