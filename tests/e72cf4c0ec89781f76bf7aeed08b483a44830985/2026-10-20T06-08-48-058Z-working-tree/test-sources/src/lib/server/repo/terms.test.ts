import { describe, it, expect, beforeEach } from 'vitest';
import { sqlite } from '../db';
import * as repo from './index';
import { seedDemo } from '../demo';

const A = 'user-a';
const B = 'user-b';
const AD1 = 'We need NIS2 and SOC 2 experience, change management, ServiceNow, and SIEM tooling. NIS2 readiness is key.';
const AD2 = 'Lead incident management with ServiceNow; SIEM experience required; ITIL 4 certified.';

beforeEach(() => {
	sqlite.prepare('delete from user').run();
	sqlite.prepare(`insert into user (id, name, email) values (?, 'A', 'a@x.test'), (?, 'B', 'b@x.test')`).run(A, B);
	seedDemo(A);
});
const job = () => repo.listJobTargets(A)[0];

describe('job terms', () => {
	it('classifies each term: in the CV, available but left out, gap, or ignored', () => {
		repo.updateJobTarget(A, job().id, { jobAdText: AD1 });
		const { terms } = repo.jobTerms(A, job().id);
		const st = Object.fromEntries(terms.map((t) => [t.key, t.status]));
		expect(st['nis2']).toBe('in-cv'); // the NIS2 bullet and NIS2 summary are in this job's CV
		expect(st['soc 2']).toBe('in-cv');
		expect(st['servicenow']).toBe('gap');
		expect(st['siem']).toBe('gap');
		repo.setTermIgnored(A, 'SIEM', true);
		expect(repo.jobTerms(A, job().id).terms.find((t) => t.key === 'siem')!.status).toBe('ignored');
	});

	it('suggestions bring in bullets that cover missing terms, and applying them changes the CV', () => {
		repo.updateJobTarget(A, job().id, { jobAdText: 'Strong incident backlog reduction and ITSM platform migration experience.' });
		const before = repo.jobTerms(A, job().id);
		expect(before.terms.find((t) => t.key === 'itsm')!.status).toBe('available'); // "Moved 3 service desks onto one ITSM platform" is out
		expect(before.suggestion?.includeItems.length).toBeGreaterThan(0);
		expect(repo.applyTermSuggestion(A, job().id)).toBeGreaterThan(0);
		expect(repo.jobTerms(A, job().id).terms.find((t) => t.key === 'itsm')!.status).toBe('in-cv');
		expect(repo.jobTerms(A, job().id).suggestion).toBeNull();
	});

	it('is owner-scoped', () => {
		expect(() => repo.jobTerms(B, job().id)).toThrow(repo.NotFoundError);
		expect(() => repo.applyTermSuggestion(B, job().id)).toThrow(repo.NotFoundError);
	});
});

describe('gap log across ads', () => {
	it('counts ads per term and ranks gaps by demand', () => {
		repo.updateJobTarget(A, job().id, { jobAdText: AD1 });
		const cat = repo.listCategories(A)[0].id;
		repo.createJobTarget(A, { categoryId: cat, company: 'Other', roleTitle: 'Ops lead', jobAdText: AD2 });
		const log = repo.gapLog(A);
		expect(log.totalAds).toBe(2);
		const siem = log.rows.find((r) => r.key === 'siem')!;
		expect([siem.ads, siem.status]).toEqual([2, 'gap']);
		expect(log.rows[0].status).toBe('gap');
		expect(log.rows.findIndex((r) => r.key === 'siem')).toBeLessThan(log.rows.findIndex((r) => r.key === 'nis2'));
		expect(log.rows.find((r) => r.key === 'itil')!.status).toBe('covered'); // ITIL certificate + skills
		expect(repo.gapLog(B)).toEqual({ totalAds: 0, rows: [] });
	});
});
