import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { sqlite } from './db';
import * as repo from './repo';
import { seedDemo, hasContent } from './demo';

describe('demo content', () => {
	it('one pool of facts, two different CVs, plus a tailored one', () => {
		sqlite.prepare(`insert into user (id, name, email) values ('demo','Demo','demo@x.test')`).run();
		expect(hasContent('demo')).toBe(false);
		seedDemo('demo');
		expect(hasContent('demo')).toBe(true);

		const byName = (n: string) => repo.listCategories('demo').find((c) => c.name.startsWith(n))!;
		const gov = byName('IT governance');
		const delivery = byName('Service delivery');
		const govCv = repo.resolveCategory('demo', gov.id);
		const delCv = repo.resolveCategory('demo', delivery.id);
		const target = repo.listJobTargets('demo')[0];
		const tailored = repo.resolveJobTarget('demo', target.id);

		const text = (cv: typeof govCv, m: string) => cv.sections.find((s) => s.module === m)?.entries.flatMap((e) => [e.text, ...e.items.map((i) => i.text)].filter(Boolean));
		expect(text(govCv, 'headline')?.[0]).toMatch(/governance/);
		expect(text(delCv, 'headline')?.[0]).toMatch(/delivery/);
		expect(govCv.sections.find((s) => s.module === 'experience')!.entries).toHaveLength(2); // early career dropped
		expect(delCv.sections.find((s) => s.module === 'experience')!.entries).toHaveLength(3);
		expect(text(delCv, 'skills')).toEqual(['Incident and problem management', 'Vendor management']);
		// the job target puts credentials before experience and its 'nis2' tag picks another summary
		expect(tailored.sections.map((s) => s.module).slice(0, 4)).toEqual(['headline', 'summary', 'credentials', 'experience']);
		expect(text(govCv, 'summary')![0]).not.toMatch(/NIS2/);
		expect(text(tailored, 'summary')![0]).toMatch(/NIS2/);
		expect(tailored.trace.some((t) => t.reason === 'matches job tags: nis2')).toBe(true);
		// a course is never shown as a certification: kind travels with the data
		const creds = govCv.sections.find((s) => s.module === 'credentials')!.entries.map((e) => e.data.kind);
		expect(creds).toEqual(['course', 'certification']);
		expect(tailored.warnings).toEqual([]);

		if (process.env.WRITE_EXAMPLES) {
			mkdirSync('docs/examples', { recursive: true });
			const out = (name: string, cv: unknown) => writeFileSync(`docs/examples/${name}.json`, JSON.stringify(cv, null, '\t') + '\n');
			out('resolved-governance', govCv);
			out('resolved-delivery', delCv);
			out('resolved-job-target', tailored);
		}
	});
});
