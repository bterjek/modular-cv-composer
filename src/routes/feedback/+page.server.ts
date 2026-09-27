// POST /feedback — receives the in-app feedback dialog (Shift+F1 or the Feedback button).
import { fail } from '@sveltejs/kit';
import { submitFeedback } from '$lib/server/feedback';
import { hit } from '$lib/server/auth/rate-limit';

export const load = () => ({});

export const actions = {
	default: async ({ request, locals }) => {
		const f = await request.formData();
		const message = String(f.get('message') ?? '').trim();
		if (!message) return fail(400, { feedbackError: 'Write something first.' });
		if (!hit(`feedback:${locals.user!.id}`, 20, 60 * 60_000).allowed) return fail(429, { feedbackError: 'That’s a lot of feedback — thank you! Try again in a while.' });
		let state: unknown = null;
		try {
			state = JSON.parse(String(f.get('state') ?? 'null'));
		} catch {
			state = null;
		}
		submitFeedback(locals.user!.id, message, String(f.get('route') ?? '') || null, state);
		return { feedbackSent: true };
	}
};
