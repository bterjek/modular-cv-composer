import { describe, it, expect } from 'vitest';
import { extractTerms, mentions, termKey, contentSources, coverage } from './terms';
import type { Content } from './content';

const AD = `Head of IT Service Operations (m/f/d)
We are looking for an experienced leader to own IT service management across our EU entities.
Your responsibilities: run incident, problem and change management according to ITIL v4; own SLAs and KPIs;
lead a team of 25 engineers (line management); manage outsourcing partners and vendor management;
prepare for ISO/IEC 27001 and NIS2 audits; drive continuous improvement and automation.
Requirements: 8+ years in IT operations, ITIL 4 certification, experience with ServiceNow and a CMDB,
knowledge of SIEM tooling, fluent English; German is a plus. Budget ownership of 5M EUR.`;

describe('extractTerms', () => {
	const terms = extractTerms(AD);
	const keys = terms.map((t) => t.key);
	it('finds vocabulary terms through their aliases and merges variants', () => {
		for (const k of ['itil', 'itsm', 'iso 27001', 'nis2', 'service level management', 'kpi', 'team leadership', 'vendor management',
			'continual improvement', 'automation', 'servicenow', 'configuration management', 'siem', 'english', 'german', 'budget management', 'outsourcing'])
			expect(keys, k).toContain(k);
		expect(terms.find((t) => t.key === 'itil')!.count).toBe(2); // "ITIL v4" and "ITIL 4"
	});
	it('drops generic acronyms and keeps no duplicates', () => {
		expect(keys).not.toContain('it');
		expect(keys).not.toContain('eu');
		expect(new Set(keys).size).toBe(keys.length);
	});
	it('picks up unknown "… operations/management" phrases', () => {
		expect(keys).toContain('it service operations');
	});
	it('the phrase "incident, problem and change management" still yields change management', () => {
		expect(keys).toContain('change management');
		expect(keys).toContain('incident management');
		expect(keys).toContain('problem management');
	});
	it('ignores currencies and the ISO/IEC prefix', () => {
		expect(keys).not.toContain('eur');
		expect(keys).not.toContain('iso/iec');
	});
});

describe('matching and coverage', () => {
	it('matches whole words and aliases only', () => {
		expect(mentions('Passed the ISO/IEC 27001 audit', 'iso 27001')).toBe(true);
		expect(mentions('Ran the CAB every week', 'change management')).toBe(true);
		expect(mentions('Improved SLAMs', 'service level management')).toBe(false);
		expect(termKey('ITIL v4')).toBe('itil');
	});
	it('reports which texts cover a term, ignoring archived content', () => {
		const c: Content = {
			profile: null,
			entries: [
				{ id: 'e', module: 'experience', label: 'X', data: { title: 'Service Desk Lead', organization: 'Acme' }, sortKey: null, position: 0, archived: false, tags: [], variants: [],
					items: [
						{ id: 'i1', position: 0, archived: false, tags: [], variants: [{ id: 'v1', text: 'Introduced ITIL 4 change enablement', length: 'standard', isDefault: true, position: 0, tags: [] }] },
						{ id: 'i2', position: 1, archived: true, tags: [], variants: [{ id: 'v2', text: 'Ran ServiceNow', length: 'standard', isDefault: true, position: 0, tags: [] }] }
					] }
			]
		};
		const cov = coverage([{ key: 'itil' }, { key: 'change management' }, { key: 'servicenow' }, { key: 'service desk' }], contentSources(c));
		expect(cov.get('itil')!.map((s) => s.itemId)).toEqual(['i1']);
		expect(cov.get('change management')!.length).toBe(1);
		expect(cov.get('servicenow')).toEqual([]); // only in an archived bullet
		expect(cov.get('service desk')![0].itemId).toBeNull(); // found in the role title
	});
});

import { NILFISK_SEC_COMPLIANCE, LIFERAY_SECOPS } from './fixtures/ads';
describe('real ads (tuning fixtures)', () => {
	const keys = (ad: string) => extractTerms(ad).map((t) => t.key);
	const NOISE = /^(ensure|oversee|direct|enhance|handling|aligning|improve|response) |r&d|security framework|operations delivery/;
	it('Nilfisk — IT Security and Compliance Manager', () => {
		const k = keys(NILFISK_SEC_COMPLIANCE);
		for (const t of ['information security', 'risk management', 'vendor management', 'internal audit', 'security policies',
			'security awareness', 'stakeholder management', 'team leadership', 'reporting', 'compliance']) expect(k, t).toContain(t);
		expect(k.filter((x) => NOISE.test(x))).toEqual([]);
	});
	it('Liferay — Security Operations Manager', () => {
		const k = keys(LIFERAY_SECOPS);
		for (const t of ['security operations', 'incident response', 'incident management', 'vulnerability management', 'team leadership',
			'budget management', 'kpi', 'strategic planning', 'security playbooks', 'continual improvement', 'cloud', 'ai'])
			expect(k, t).toContain(t);
		expect(k.filter((x) => NOISE.test(x))).toEqual([]);
	});
});

import { MOL_EP_IT_OPS } from './fixtures/ads';
describe('real ads — MOL E&P IT Operations Manager', () => {
	const k = extractTerms(MOL_EP_IT_OPS, { exclude: ['MOL Group'] }).map((t) => t.key);
	it('finds the operations terms', () => {
		for (const t of ['it operations', 'application operations', 'data operations', 'data governance', 'service level management',
			'vendor management', 'budget management', 'internal audit', 'compliance', 'escalation management', 'incident management',
			'business continuity', 'kpi', 'team leadership', 'stakeholder management', 'automation', 'monitoring']) expect(k, t).toContain(t);
	});
	it('ignores the company name, heading words, E&P, benefits and cross-line phrases', () => {
		for (const t of ['mol', 'e&p', 'position', 'purpose', 'responsibilities- people management', 'balance operations', 'infrastructure architecture'])
			expect(k, t).not.toContain(t);
		expect(k.some((x) => /fitness|insurance|flexi|bonus/.test(x))).toBe(false);
	});
});
