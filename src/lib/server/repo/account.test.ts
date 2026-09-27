import { describe, it, expect, beforeEach } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';
import { seedDemo } from '../demo';
import { submitFeedback } from '../feedback';

const A = 'user-a';
const B = 'user-b';
const count = (sql: string, ...p: unknown[]) => (sqlite.prepare(sql).get(...p) as { n: number }).n;

beforeEach(() => {
	sqlite.prepare('delete from user').run();
	sqlite.prepare('delete from feedback').run();
	sqlite.prepare(`insert into user (id, name, email, role) values (?, 'A', 'a@x.test', 'tester'), (?, 'B', 'b@x.test', 'admin')`).run(A, B);
	seedDemo(A);
	seedDemo(B);
});

describe('export', () => {
	it('contains all of the user’s data and nobody else’s', () => {
		const j = repo.listJobTargets(A)[0];
		const s = repo.createSnapshot(A, { jobTargetId: j.id });
		repo.createShareLink(A, s);
		submitFeedback(A, 'Nice tool', '/edit', null);
		const e = repo.exportAccount(A);
		expect(e.format).toBe('modular-cv-composer/export@1');
		expect(e.account.email).toBe('a@x.test');
		expect(e.content.length).toBe(repo.loadContent(A).entries.length);
		expect(e.categories).toHaveLength(2);
		expect(e.jobs).toHaveLength(1);
		expect(e.snapshots[0].shareLinks).toHaveLength(1);
		expect(e.feedback[0].message).toBe('Nice tool');
		const json = JSON.stringify(e);
		expect(json).not.toContain('b@x.test');
		expect(json).not.toContain('password');
		expect(json).not.toContain('token_hash');
	});
});

describe('account deletion', () => {
	it('removes every row the user owns, and nothing of anyone else', () => {
		const s = repo.createSnapshot(A, { jobTargetId: repo.listJobTargets(A)[0].id });
		repo.createShareLink(A, s);
		submitFeedback(A, 'bye', null, null);
		const bBefore = repo.exportAccount(B);
		repo.deleteAccount(A);
		for (const t of ['entries', 'items', 'variants', 'tags', 'categories', 'job_targets', 'snapshots', 'share_links', 'profiles', 'session']) {
			const col = t === 'session' || t === 'profiles' ? (t === 'session' ? 'user_id' : 'owner_id') : 'owner_id';
			expect(count(`select count(*) n from ${t} where ${col} = ?`, A), t).toBe(0);
		}
		expect(count(`select count(*) n from feedback`)).toBe(0);
		const bAfter = repo.exportAccount(B);
		expect({ ...bAfter, exportedAt: '' }).toEqual({ ...bBefore, exportedAt: '' });
	});

	it('the last active admin cannot delete themselves', () => {
		expect(() => repo.deleteAccount(B)).toThrow(repo.InvalidError);
		sqlite.prepare(`update user set role = 'admin' where id = ?`).run(A);
		repo.deleteAccount(B);
		expect(count('select count(*) n from user where id = ?', B)).toBe(0);
	});
});
