import { describe, it, expect } from 'vitest';
import { mkdtempSync, readdirSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { sqlite } from './db';
import { runBackup } from './backup';

describe('backups', () => {
	it('write a consistent copy and delete ones past retention', async () => {
		sqlite.prepare(`insert into user (id, name, email) values ('bk','B','bk@x.test')`).run();
		const dir = mkdtempSync(join(tmpdir(), 'cvc-backup-'));
		const old = join(dir, 'composer-20200101-000000.sqlite');
		writeFileSync(old, 'x');
		utimesSync(old, new Date('2020-01-01'), new Date('2020-01-01'));
		writeFileSync(join(dir, 'unrelated.txt'), 'keep me');

		const r = await runBackup({ dir, retentionDays: 30 });
		expect(r.removed).toEqual(['composer-20200101-000000.sqlite']);
		expect(readdirSync(dir).sort()).toEqual([r.file.split('/').pop(), 'unrelated.txt'].sort());
		const copy = new Database(r.file, { readonly: true });
		expect((copy.prepare(`select email from user where id = 'bk'`).get() as { email: string }).email).toBe('bk@x.test');
		copy.close();
	});
});
