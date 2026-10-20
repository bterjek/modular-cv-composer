// Checks the database-level rules from docs/SCHEMA.md against a fresh in-memory DB.
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

let db: Database.Database;
const run = (sql: string, ...p: unknown[]) => db.prepare(sql).run(...p);

beforeEach(() => {
	db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrate(drizzle(db), { migrationsFolder: './drizzle' });
	run(`insert into user (id, name, email) values ('u1','A','a@x.test')`);
	run(`insert into entries (id, owner_id, module, label, data) values ('e1','u1','experience','Role','{}')`);
	run(`insert into items (id, owner_id, entry_id) values ('i1','u1','e1')`);
});

describe('variants', () => {
	it('must attach to exactly one of entry or item', () => {
		expect(() => run(`insert into variants (id, owner_id, text) values ('v0','u1','x')`)).toThrow(/CHECK/);
		expect(() =>
			run(`insert into variants (id, owner_id, entry_id, item_id, text) values ('v0','u1','e1','i1','x')`)
		).toThrow(/CHECK/);
	});
	it('allows only one default per target', () => {
		run(`insert into variants (id, owner_id, item_id, text, is_default) values ('v1','u1','i1','a',1)`);
		run(`insert into variants (id, owner_id, item_id, text, is_default) values ('v2','u1','i1','b',0)`);
		expect(() =>
			run(`insert into variants (id, owner_id, item_id, text, is_default) values ('v3','u1','i1','c',1)`)
		).toThrow(/UNIQUE/);
	});
});

describe('account deletion', () => {
	it('cascades to all owned content', () => {
		run(`insert into variants (id, owner_id, item_id, text) values ('v1','u1','i1','a')`);
		run(`insert into tags (id, owner_id, name) values ('t1','u1','governance')`);
		run(`insert into item_tags (item_id, tag_id) values ('i1','t1')`);
		run(`delete from user where id = 'u1'`);
		for (const t of ['entries', 'items', 'variants', 'tags', 'item_tags']) {
			expect((db.prepare(`select count(*) c from ${t}`).get() as { c: number }).c, t).toBe(0);
		}
	});
});
