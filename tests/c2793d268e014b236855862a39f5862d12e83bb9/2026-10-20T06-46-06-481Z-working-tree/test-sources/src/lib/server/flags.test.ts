import { describe, it, expect } from 'vitest';
import { sqlite } from './db';
import { syncFlags, isEnabled, setGlobal, setOverride, enabledFlags } from './flags';

describe('feature flags', () => {
	it('are off by default; overrides beat the global value', () => {
		sqlite.prepare(`insert into user (id, name, email) values ('u1','A','a@x.test'), ('u2','B','b@x.test')`).run();
		syncFlags();
		expect(isEnabled('render.pdf', 'u1')).toBe(false);
		setOverride('render.pdf', 'u1', true);
		expect(isEnabled('render.pdf', 'u1')).toBe(true);
		expect(isEnabled('render.pdf', 'u2')).toBe(false);
		setGlobal('render.pdf', true);
		setOverride('render.pdf', 'u2', false);
		expect(isEnabled('render.pdf', 'u2')).toBe(false);
		setOverride('render.pdf', 'u2', null);
		expect(isEnabled('render.pdf', 'u2')).toBe(true);
		expect(enabledFlags(null)).toEqual(['render.pdf']);
	});
});
