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
