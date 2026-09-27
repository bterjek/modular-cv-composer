// Tester feedback. The screen state is a small, fixed set of technical facts — never CV content.
import { desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import { db } from './db';
import { feedback, user } from './db/schema';

export const screenStateSchema = z
	.object({
		route: z.string().max(300),
		appVersion: z.string().max(60),
		viewport: z.string().max(20),
		userAgent: z.string().max(300),
		lastStatus: z.string().max(300).optional()
	})
	.partial();
export type ScreenState = z.infer<typeof screenStateSchema>;

export function submitFeedback(userId: string, message: string, route: string | null, screenState: unknown) {
	const text = message.trim();
	if (!text) throw new Error('empty feedback');
	const state = screenStateSchema.safeParse(screenState ?? {});
	db.insert(feedback)
		.values({
			id: uuidv7(),
			userId,
			message: text.slice(0, 5000),
			route: route?.slice(0, 300) ?? null,
			screenState: state.success ? state.data : null,
			createdAt: Date.now()
		})
		.run();
}

export function listFeedback(opts: { show?: 'open' | 'done' | 'all' } = {}, limit = 300) {
	const where = opts.show === 'done' ? isNotNull(feedback.resolvedAt) : opts.show === 'all' ? undefined : isNull(feedback.resolvedAt);
	return db
		.select({
			id: feedback.id,
			message: feedback.message,
			route: feedback.route,
			screenState: feedback.screenState,
			createdAt: feedback.createdAt,
			resolvedAt: feedback.resolvedAt,
			email: user.email
		})
		.from(feedback)
		.leftJoin(user, eq(feedback.userId, user.id))
		.where(where)
		.orderBy(desc(feedback.createdAt))
		.limit(limit)
		.all();
}

export function setFeedbackResolved(id: string, resolved: boolean) {
	db.update(feedback).set({ resolvedAt: resolved ? Date.now() : null }).where(eq(feedback.id, id)).run();
}

export function openFeedbackCount() {
	return db.select({ n: sql<number>`count(*)` }).from(feedback).where(isNull(feedback.resolvedAt)).get()?.n ?? 0;
}
