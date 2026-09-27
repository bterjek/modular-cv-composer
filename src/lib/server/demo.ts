// Fictional example content, used by tests and by "Load example content" for new accounts.
// Everything here is invented; it shows how one pool of facts yields two different CVs.
import * as repo from './repo';

type Bullet = { tags: string[]; wordings: { text: string; tags?: string[]; length?: 'short' | 'standard' | 'long'; isDefault?: boolean }[] };

export function hasContent(ownerId: string) {
	return repo.loadContent(ownerId).entries.length > 0;
}

export function seedDemo(ownerId: string) {
	repo.upsertProfile(ownerId, {
		fullName: 'Alex Example',
		email: 'alex@example.com',
		location: 'Budapest, Hungary',
		links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/example' }]
	});

	const withWordings = (target: { entryId: string } | { itemId: string }, ws: Bullet['wordings']) =>
		ws.forEach((w, position) => {
			const id = repo.createVariant(ownerId, { ...target, text: w.text, length: w.length ?? 'standard', isDefault: w.isDefault ?? position === 0, position });
			if (w.tags?.length) repo.setTags(ownerId, { variantId: id }, w.tags);
		});

	const entry = (module: string, label: string, data: object, opts: { tags?: string[]; wordings?: Bullet['wordings']; bullets?: Bullet[] } = {}) => {
		const id = repo.createEntry(ownerId, { module, label, data });
		if (opts.tags) repo.setTags(ownerId, { entryId: id }, opts.tags);
		if (opts.wordings) withWordings({ entryId: id }, opts.wordings);
		opts.bullets?.forEach((b, position) => {
			const itemId = repo.createItem(ownerId, id, { position });
			repo.setTags(ownerId, { itemId }, b.tags);
			withWordings({ itemId }, b.wordings);
		});
		return id;
	};

	entry('headline', 'Headline', {}, {
		wordings: [
			{ text: 'IT operations leader — governance, audit readiness and service stability', tags: ['governance'] },
			{ text: 'IT service delivery manager — turning around failing operations', tags: ['delivery'] }
		]
	});
	entry('summary', 'Summary', {}, {
		wordings: [
			{ text: 'Ten years running regulated IT services. I make controls part of daily work, so audits stop being events.', tags: ['governance'], length: 'short' },
			{ text: 'Ten years in IT operations. I take over struggling service teams, stabilise them, and hand back something that runs without heroics.', tags: ['delivery'], length: 'short' },
			{ text: 'Ten years running regulated IT services, most recently taking a network operation through NIS2 readiness. Controls live in daily work, not in audit week.', tags: ['governance', 'nis2'], length: 'short' },
			{ text: 'Ten years leading IT operations in regulated environments, across four countries and three employers. Known for rebuilding failing service teams, embedding controls into everyday processes and keeping audits uneventful.', length: 'long' }
		]
	});
	entry('experience', 'Northwind Bank', { organization: 'Northwind Bank (via Contoso Services)', title: 'Head of Network Operations', location: 'Frankfurt, remote', start: '2023-03', end: null }, {
		bullets: [
			{ tags: ['governance', 'audit'], wordings: [{ text: 'Closed the annual SOC 2 audit with zero findings, from 11 the year before.' }] },
			{ tags: ['delivery'], wordings: [{ text: 'Cut the incident backlog from 400 to under 50 in five months.' }] },
			{ tags: ['leadership'], wordings: [{ text: 'Lead 28 engineers in four teams across four countries.' }] },
			{ tags: ['governance', 'nis2'], wordings: [{ text: 'Mapped network operations to NIS2 requirements and closed the gaps before the deadline.' }] }
		]
	});
	entry('experience', 'Fabrikam Telecom', { organization: 'Fabrikam Telecom', title: 'IT Service Manager', start: '2019-06', end: '2023-02' }, {
		bullets: [
			{ tags: ['delivery', 'itsm'], wordings: [{ text: 'Moved 3 service desks onto one ITSM platform without a missed SLA month.' }] },
			{ tags: ['governance'], wordings: [{ text: 'Introduced change advisory reviews; failed changes dropped by 60 %.' }] },
			{ tags: ['leadership'], wordings: [{ text: 'Rebuilt a team of 12 after mass resignations; attrition fell to single digits.' }] }
		]
	});
	entry('experience', 'Tailspin Toys', { organization: 'Tailspin Toys', title: 'Service Desk Team Lead', start: '2015-01', end: '2019-05' }, {
		tags: ['early-career'],
		bullets: [{ tags: ['delivery'], wordings: [{ text: 'Ran a 10-person first-line desk for 2,000 users.' }] }]
	});
	entry('credentials', 'ITIL', { name: 'ITIL 4 Strategic Leader', issuer: 'PeopleCert', kind: 'certification', issued: '2022-11' }, { tags: ['governance', 'delivery'] });
	entry('credentials', 'Security course', { name: 'Information Security Management (online course)', issuer: 'Example Academy', kind: 'course', issued: '2024-02' }, { tags: ['governance'] });
	entry('education', 'University', { institution: 'Example University', degree: 'BA', field: 'Philosophy', start: '2011-09', end: '2014-06' });
	const skills = entry('skills', 'Skills', { group: 'Core' });
	for (const [position, [text, tags]] of ([
		['IT governance frameworks (ITIL, COBIT)', ['governance']],
		['Audit preparation (SOC 2, ISO 27001)', ['governance', 'audit']],
		['Incident and problem management', ['delivery']],
		['Vendor management', ['delivery', 'governance']]
	] as const).entries()) {
		const itemId = repo.createItem(ownerId, skills, { position });
		repo.setTags(ownerId, { itemId }, [...tags]);
		repo.createVariant(ownerId, { itemId, text, isDefault: true });
	}
	entry('languages', 'Hungarian', { language: 'Hungarian', level: 'native' });
	entry('languages', 'English', { language: 'English', level: 'C1' });

	const gov = repo.createCategory(ownerId, {
		name: 'IT governance roles',
		description: 'Governance, audit and compliance-heavy positions',
		recipe: {
			version: 1,
			modules: [
				{ module: 'headline' },
				{ module: 'summary' },
				{ module: 'experience', includeTags: ['governance', 'audit', 'leadership'], excludeTags: ['early-career'], maxItemsPerEntry: 3 },
				{ module: 'credentials' },
				{ module: 'skills', includeTags: ['governance'] },
				{ module: 'education' },
				{ module: 'languages' }
			],
			preferTags: ['governance', 'audit'],
			length: 'short'
		}
	});
	repo.createCategory(ownerId, {
		name: 'Service delivery roles',
		description: 'Operations and turnaround positions',
		recipe: {
			version: 1,
			modules: [
				{ module: 'headline' },
				{ module: 'summary' },
				{ module: 'experience', maxEntries: 3, maxItemsPerEntry: 2 },
				{ module: 'skills', includeTags: ['delivery'] },
				{ module: 'credentials', title: 'Certifications' },
				{ module: 'languages' }
			],
			preferTags: ['delivery', 'itsm'],
			length: 'short'
		}
	});
	repo.createJobTarget(ownerId, {
		categoryId: gov,
		company: 'Example Insurance plc',
		roleTitle: 'Head of IT Risk & Compliance',
		overrides: { preferTags: ['nis2'], moduleOrder: ['headline', 'summary', 'credentials', 'experience'] }
	});
}
