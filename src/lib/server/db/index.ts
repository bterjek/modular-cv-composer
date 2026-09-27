// Database client. Only src/lib/server/repo/ may import this (docs/SCHEMA.md §6).
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';

const path = process.env.DATABASE_PATH ?? './data/dev.sqlite';
mkdirSync(dirname(path), { recursive: true });

export const sqlite = new Database(path);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });
