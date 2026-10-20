// docs/SCHEMA.md §6: routes must not talk to the database directly.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
	return readdirSync(dir).flatMap((f) => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? files(p) : [p];
	});
}

describe('module boundaries', () => {
	it('no route or hook imports the database client', () => {
		const offenders = [...files('src/routes'), 'src/hooks.server.ts']
			.filter((f) => /\.(ts|svelte|js)$/.test(f))
			.filter((f) => /\$lib\/server\/db(\/|['"])/.test(readFileSync(f, 'utf8')))
			.filter((f) => !f.endsWith('healthz/+server.ts')); // health check pings SQLite only
		expect(offenders).toEqual([]);
	});
});
