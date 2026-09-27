import { desc, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from './db';
import { feedback, user } from './db/schema';

export function submitFeedback(userId: string, message: string, route: string | null, screenState: unknown) {
	db.insert(feedback)
		.values({ id: uuidv7(), userId, message: message.slice(0, 5000), route, screenState, createdAt: Date.now() })
		.run();
}

export function listFeedback(limit = 200) {
	return db
		.select({ id: feedback.id, message: feedback.message, route: feedback.route, createdAt: feedback.createdAt, email: user.email })
		.from(feedback)
		.leftJoin(user, eq(feedback.userId, user.id))
		.orderBy(desc(feedback.createdAt))
		.limit(limit)
		.all();
}
