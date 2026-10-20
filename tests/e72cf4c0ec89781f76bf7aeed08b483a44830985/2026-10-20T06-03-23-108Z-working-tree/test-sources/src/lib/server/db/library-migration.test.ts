import { expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

it.each([6, 7, 8])('migration %i preserves every pre-existing column value', (version) => {
 const database = new Database(':memory:');
 database.pragma('foreign_keys = ON');
 try {
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
  const migrations = (journal.entries.map((e: { tag: string }) => e.tag) as string[]).filter(tag => Number(tag.slice(0,4)) <= version);
  const apply = (name: string) => database.exec(readFileSync(`drizzle/${name}.sql`, 'utf8'));
  migrations.slice(0, -1).forEach(apply);
  database.exec(`
   INSERT INTO user (id,name,email) VALUES ('u','Test','test@example.com');
   INSERT INTO profiles (owner_id,full_name,email) VALUES ('u','Ádám','test@example.com');
   INSERT INTO entries (id,owner_id,module,label,data) VALUES ('e','u','experience','Original role','{"organization":"Org","title":"Lead","start":"2020-01","end":null}');
   INSERT INTO items (id,owner_id,entry_id,note) VALUES ('i','u','e','Original note');
   INSERT INTO variants (id,owner_id,item_id,text,is_default) VALUES ('v','u','i','Original achievement',1);
   INSERT INTO tags (id,owner_id,name) VALUES ('t','u','compliance');
   INSERT INTO variant_tags (variant_id,tag_id) VALUES ('v','t');
   INSERT INTO categories (id,owner_id,name,recipe,design_key,style) VALUES ('c','u','Compliance','{"version":1,"modules":[{"module":"experience"}]}','classic','{"align":"justify"}');
   INSERT INTO job_targets (id,owner_id,category_id,company,role_title,overrides) VALUES ('j','u','c','Acme','Lead','{"pinVariants":{"i":"v"}}');
   INSERT INTO snapshots (id,owner_id,job_target_id,design_key,engine_version,resolved,html,label) VALUES ('s','u','j','classic','1','{}','<p>Frozen</p>','Sent CV');
  `);
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[];
  const baseline = tables.map(({ name }) => ({
   name, columns: (database.prepare(`PRAGMA table_info("${name}")`).all() as {name: string}[]).map(c => c.name),
   rows: database.prepare(`SELECT * FROM "${name}"`).all()
  }));
  database.transaction(() => apply(migrations.at(-1)!))();
  for (const table of baseline) {
   expect(database.prepare(`SELECT ${table.columns.map(c => `"${c}"`).join(',')} FROM "${table.name}"`).all(), table.name).toEqual(table.rows);
  }
  expect(database.prepare('SELECT facts FROM items').get()).toEqual({ facts: '' });
  const targeting = (database.prepare('SELECT targeting FROM variants').get() as {targeting: string}).targeting;
  expect(JSON.parse(targeting)).toEqual({ roleFamilies: [], competencies: [], keywords: [], basis: 'unspecified', notes: '' });
  for (const table of ['source_documents', 'source_references', 'compositions']) {
   expect(database.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({n: 0});
  }
  expect(database.pragma('foreign_key_check')).toEqual([]);
 } finally { database.close(); }
});
