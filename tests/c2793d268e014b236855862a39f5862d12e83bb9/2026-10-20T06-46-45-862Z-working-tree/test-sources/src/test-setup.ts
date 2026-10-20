// Every test file gets its own fresh in-memory database (vitest isolates files).
process.env.DATABASE_PATH = ':memory:';
const { sqlite } = await import('$lib/server/db');
const { drizzle } = await import('drizzle-orm/better-sqlite3');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
migrate(drizzle(sqlite), { migrationsFolder: './drizzle' });
export {};
