import { describe, it, expect, beforeEach } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';
import { NotFoundError, InvalidError } from './errors';
import { seedDemo } from '../demo';

const A = 'user-a';
const B = 'user-b';

beforeEach(() => {
	sqlite.prepare('delete from user').run();
	sqlite.prepare(`insert into user (id, name, email) values (?, 'A', 'a@x.test'), (?, 'B', 'b@x.test')`).run(A, B);
	seedDemo(A);
});
const job = () => repo.listJobTargets(A)[0];

describe('snapshots', () => {
	it('freezes the CV: later edits do not change it', () => {
		const id = repo.createSnapshot(A, { jobTargetId: job().id }, { markSent: true });
		const before = repo.getSnapshot(A, id);
		expect(before.label).toMatch(/^Example Insurance plc — Head of IT Risk & Compliance, \d{4}-\d{2}-\d{2}$/);
		expect(before.html).toContain('Alex Example');
		expect(repo.getJobTarget(A, job().id).status).toBe('sent');

		repo.upsertProfile(A, { fullName: 'Changed Name', email: 'alex@example.com' });
		const after = repo.getSnapshot(A, id);
		expect(after.html).toBe(before.html);
		expect(after.html).not.toContain('Changed Name');
		expect(repo.resolveJobTarget(A, job().id).profile?.fullName).toBe('Changed Name');
	});

	it('keeps the snapshot when its job is deleted', () => {
		const id = repo.createSnapshot(A, { jobTargetId: job().id });
		repo.deleteJobTarget(A, job().id);
		expect(repo.getSnapshot(A, id).jobTargetId).toBeNull();
	});

	it('refuses to freeze an empty CV', () => {
		const c = repo.createCategory(B, { name: 'Empty', recipe: { version: 1, modules: [{ module: 'experience' }] } });
		expect(() => repo.createSnapshot(B, { categoryId: c })).toThrow(InvalidError);
	});

	it('is invisible to other users', () => {
		const id = repo.createSnapshot(A, { jobTargetId: job().id });
		expect(repo.listSnapshots(B)).toEqual([]);
		expect(() => repo.getSnapshot(B, id)).toThrow(NotFoundError);
		expect(() => repo.deleteSnapshot(B, id)).toThrow(NotFoundError);
		expect(() => repo.createSnapshot(B, { jobTargetId: job().id })).toThrow(NotFoundError);
		expect(() => repo.createShareLink(B, id)).toThrow(NotFoundError);
		expect(() => repo.listShareLinks(B, id)).toThrow(NotFoundError);
	});
});

describe('share links', () => {
	it('open with the token, count views, and stop working when revoked', () => {
		const snap = repo.createSnapshot(A, { jobTargetId: job().id });
		const { id, token } = repo.createShareLink(A, snap);
		expect(repo.openShareLink(token)?.html).toContain('Alex Example');
		repo.openShareLink(token);
		expect(repo.listShareLinks(A, snap)[0]).toMatchObject({ viewCount: 2 });
		expect(() => repo.revokeShareLink(B, id)).toThrow(NotFoundError);
		repo.revokeShareLink(A, id);
		expect(repo.openShareLink(token)).toBeNull();
	});

	it('expire', () => {
		const snap = repo.createSnapshot(A, { jobTargetId: job().id });
		const { token } = repo.createShareLink(A, snap, { expiresInDays: 7 });
		expect(repo.openShareLink(token, {}, Date.now() + 6 * 86_400_000)).not.toBeNull();
		expect(repo.openShareLink(token, {}, Date.now() + 8 * 86_400_000)).toBeNull();
		expect(() => repo.createShareLink(A, snap, { expiresInDays: 0 })).toThrow(InvalidError);
	});

	it('stop working when the owner is disabled or the snapshot deleted', () => {
		const snap = repo.createSnapshot(A, { jobTargetId: job().id });
		const { token } = repo.createShareLink(A, snap);
		sqlite.prepare('update user set disabled_at = 1 where id = ?').run(A);
		expect(repo.openShareLink(token)).toBeNull();
		sqlite.prepare('update user set disabled_at = null where id = ?').run(A);
		repo.deleteSnapshot(A, snap);
		expect(repo.openShareLink(token)).toBeNull();
	});

	it('only the hash is stored; junk tokens are rejected early', () => {
		const snap = repo.createSnapshot(A, { jobTargetId: job().id });
		const { token } = repo.createShareLink(A, snap);
		const stored = sqlite.prepare('select token_hash from share_links').get() as { token_hash: string };
		expect(stored.token_hash).not.toContain(token);
		expect(repo.openShareLink("x' or 1=1 --")).toBeNull();
	});
});
