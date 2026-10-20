import { describe, it, expect } from 'vitest';
import { sqlite } from './db';
import { submitFeedback, listFeedback, setFeedbackResolved, openFeedbackCount } from './feedback';

describe('feedback', () => {
	it('stores the message with only the allowed technical facts, and can be triaged', () => {
		sqlite.prepare(`insert into user (id, name, email) values ('u','U','u@x.test')`).run();
		submitFeedback('u', '  The preview did not refresh  ', '/edit/jobs/1', {
			route: '/edit/jobs/1', appVersion: 'abc123', viewport: '1600x1000', userAgent: 'UA', cvText: 'SECRET CONTENT'
		});
		const [fb] = listFeedback();
		expect(fb.message).toBe('The preview did not refresh');
		expect(fb.screenState).toEqual({ route: '/edit/jobs/1', appVersion: 'abc123', viewport: '1600x1000', userAgent: 'UA' });
		expect(JSON.stringify(fb)).not.toContain('SECRET');
		expect(openFeedbackCount()).toBe(1);
		setFeedbackResolved(fb.id, true);
		expect(listFeedback()).toHaveLength(0);
		expect(listFeedback({ show: 'done' })).toHaveLength(1);
		expect(openFeedbackCount()).toBe(0);
	});
	it('ignores malformed screen state instead of failing', () => {
		submitFeedback('u', 'hi', null, { viewport: 'x'.repeat(500) });
		expect(listFeedback({ show: 'all' }).find((f) => f.message === 'hi')?.screenState).toBeNull();
	});
});
