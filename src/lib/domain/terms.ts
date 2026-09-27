// Job-ad terms: rule-based extraction, alias-aware matching, coverage against your content.
// Pure functions, no database. Tuned for IT operations / service management / governance ads;
// the vocabulary grows with real ads (see docs/TERMS.md).

export type Term = { key: string; label: string; count: number; source: 'vocab' | 'acronym' | 'phrase' };

/** label → aliases (all matched case-insensitively, as whole words). The label itself is always an alias. */
const VOCAB: Record<string, string[]> = {
	ITIL: ['itil 4', 'itil v4', 'itil4', 'itil v3'],
	'ITSM': ['it service management'],
	'ISO 27001': ['iso/iec 27001', 'iso27001', 'iso 27k'],
	'ISO 20000': ['iso/iec 20000', 'iso20000'],
	'ISO 9001': ['iso9001'],
	'SOC 2': ['soc2', 'soc ii', 'soc 2 type ii'],
	'SOC 1': ['soc1'],
	NIS2: ['nis 2', 'nis-2', 'nis2 directive'],
	DORA: ['digital operational resilience act'],
	GDPR: ['general data protection regulation'],
	'AI Act': ['eu ai act'],
	COBIT: ['cobit 2019', 'cobit 5'],
	'C5': ['bsi c5'],
	'incident management': ['incident handling', 'major incident management', 'incident response'],
	'problem management': ['root cause analysis', 'rca'],
	'change management': ['change enablement', 'change control', 'cab', 'change advisory board'],
	'release management': ['release and deployment management'],
	'service level management': ['sla management', 'slas', 'sla', 'service level agreements', 'service levels'],
	'capacity management': [],
	'availability management': [],
	'configuration management': ['cmdb', 'configuration management database'],
	'asset management': ['it asset management', 'itam'],
	'knowledge management': [],
	'service desk': ['help desk', 'helpdesk', 'first line support', '1st line'],
	'continual improvement': ['continuous improvement', 'csi'],
	'risk management': ['it risk', 'risk assessment', 'risk assessments'],
	'vendor management': ['supplier management', 'third-party management', 'third party risk', 'outsourcing management'],
	'stakeholder management': ['stakeholder engagement', 'stakeholders'],
	'budget management': ['budget ownership', 'budgeting', 'cost management', 'p&l'],
	'team leadership': ['people management', 'line management', 'people leadership', 'leading teams', 'team lead'],
	'business continuity': ['bcm', 'business continuity management', 'bcp'],
	'disaster recovery': ['drp'],
	'information security': ['infosec', 'cybersecurity', 'cyber security', 'it security'],
	'vulnerability management': ['patch management', 'patching'],
	'identity and access management': ['iam', 'access management'],
	SIEM: ['security information and event management'],
	'security operations': ['soc operations', 'security operations center'],
	'network operations': ['noc', 'network operations center'],
	'IT governance': ['it-governance'],
	'internal audit': ['audit', 'audits', 'audit readiness', 'external audit'],
	compliance: ['regulatory compliance', 'compliance management'],
	'KPI': ['kpis', 'key performance indicators'],
	'OKR': ['okrs'],
	'transformation': ['digital transformation', 'it transformation', 'operational transformation'],
	'transition management': ['service transition'],
	'outsourcing': ['managed service provider', 'msp'],
	Agile: ['agile methodologies'],
	Scrum: [],
	SAFe: ['scaled agile'],
	PRINCE2: ['prince 2'],
	PMP: [],
	'Lean': ['lean six sigma'],
	'Six Sigma': [],
	DevOps: [],
	SRE: ['site reliability engineering'],
	'cloud': ['cloud services', 'cloud infrastructure'],
	'cloud migration': [],
	Azure: ['microsoft azure'],
	AWS: ['amazon web services'],
	GCP: ['google cloud'],
	Kubernetes: ['k8s'],
	Docker: [],
	Terraform: [],
	Ansible: [],
	Linux: [],
	'Windows Server': [],
	'VMware': ['vsphere'],
	ServiceNow: [],
	Jira: ['jira service management', 'jsm'],
	Confluence: [],
	Splunk: [],
	Python: [],
	PowerShell: [],
	SQL: [],
	'networking': ['network infrastructure', 'lan', 'wan'],
	'SD-WAN': ['sdwan'],
	Cisco: [],
	'firewall': ['firewalls'],
	'monitoring': ['observability', 'event management'],
	'automation': ['process automation', 'rpa'],
	'reporting': ['management reporting', 'dashboards'],
	'English': ['fluent english'],
	'German': ['fluent german'],
	'Hungarian': []
};

/** Acronyms that are too generic to be useful as job terms. */
const ACRONYM_STOP = new Set(['IT', 'EU', 'US', 'UK', 'CV', 'HR', 'OR', 'AND', 'THE', 'WE', 'YOU', 'OUR', 'ALL', 'NEW', 'ETC', 'EG', 'IE', 'VS', 'ASAP', 'FAQ', 'PDF', 'CEO', 'CTO', 'CIO', 'CFO', 'COO', 'HQ', 'IN', 'ON', 'AT', 'TO', 'OF', 'A', 'I', 'AM', 'PM', 'HU', 'DE', 'EN', 'FTE', 'KFT', 'ZRT', 'LTD', 'GMBH', 'INC', 'PLC', 'EUR', 'USD', 'HUF', 'GBP', 'CHF', 'ISO', 'IEC', 'ISO/IEC', 'MFD', 'M/F/D', 'M/W/D']);
const PHRASE_HEADS = ['management', 'governance', 'compliance', 'operations', 'security', 'architecture', 'automation', 'monitoring', 'delivery', 'strategy', 'planning', 'reporting', 'framework', 'frameworks', 'processes'];
const PHRASE_STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'our', 'your', 'their', 'its', 'on', 'strong', 'excellent', 'good', 'proven', 'solid', 'hands', 'deep', 'daily', 'overall', 'senior', 'junior', 'key', 'relevant', 'related', 'effective', 'efficient', 'end', 'strategic', 'operational', 'experience', 'knowledge', 'understanding', 'you', 'we', 'will', 'be', 'is', 'are', 'from', 'as', 'by', 'this', 'that', 'other', 'all', 'any', 'high', 'level', 'within', 'across', 'including', 'such', 'e.g', 'etc', 'plus']);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
export const normalize = (s: string) =>
	' ' + s.toLowerCase().replace(/[‐-―]/g, '-').replace(/[’`´]/g, "'").replace(/\s+/g, ' ') + ' ';

/** Whole-word, case-insensitive matcher for a term and its aliases. */
function matcher(words: string[]) {
	const parts = [...new Set(words.map((w) => w.toLowerCase()))].sort((a, b) => b.length - a.length).map(esc);
	return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

const VOCAB_KEYS = Object.keys(VOCAB).map((label) => ({ label, key: label.toLowerCase(), re: matcher([label, ...VOCAB[label]]) }));
const aliasOf = new Map<string, string>(); // any alias → canonical key
for (const [label, aliases] of Object.entries(VOCAB)) for (const a of [label, ...aliases]) aliasOf.set(a.toLowerCase(), label.toLowerCase());

export function termKey(raw: string): string {
	const k = raw.trim().toLowerCase().replace(/\s+/g, ' ');
	return aliasOf.get(k) ?? k;
}

/** Terms in one job ad, most frequent first. */
export function extractTerms(ad: string): Term[] {
	const text = expandLists(normalize(ad));
	const found = new Map<string, Term>();
	const add = (key: string, label: string, n: number, source: Term['source']) => {
		const t = found.get(key);
		if (t) t.count = Math.max(t.count, n);
		else found.set(key, { key, label, count: n, source });
	};
	for (const v of VOCAB_KEYS) {
		const n = text.match(v.re)?.length ?? 0;
		if (n) add(v.key, v.label, n, 'vocab');
	}
	// Acronyms (as written in the original text): 2–8 capitals/digits, e.g. CMDB, BGP, ISO
	for (const m of ad.matchAll(/(?<![\p{L}\p{N}])([A-Z][A-Z0-9&+/-]{1,7})(?![\p{L}\p{N}])/gu)) {
		const a = m[1].replace(/[-/+&]+$/, '');
		if (a.length < 2 || ACRONYM_STOP.has(a) || /^\d/.test(a)) continue;
		const key = termKey(a);
		if (found.has(key)) continue;
		add(key, a, text.match(matcher([a]))?.length ?? 1, 'acronym');
	}
	// "<modifier> <modifier>? <head>" phrases, e.g. "capacity planning", "cloud cost management"
	const headRe = new RegExp(`(?:^|[^\\p{L}])((?:[\\p{L}][\\p{L}-]+ ){1,2})(${PHRASE_HEADS.join('|')})(?![\\p{L}])`, 'giu');
	for (const m of text.matchAll(headRe)) {
		const mods = m[1].trim().split(' ').filter((w) => !PHRASE_STOP.has(w));
		if (!mods.length) continue;
		const phrase = `${mods.join(' ')} ${m[2]}`;
		const key = termKey(phrase);
		if ([...found.keys()].some((k) => k === key || k.endsWith(' ' + key) || key.endsWith(' ' + k))) continue;
		add(key, phrase, text.match(matcher([phrase]))?.length ?? 1, 'phrase');
	}
	return [...found.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** "incident, problem and change management" → also "incident management problem management". */
function expandLists(text: string): string {
	const heads = PHRASE_HEADS.join('|');
	const re = new RegExp(`((?:[\\p{L}-]+, )+(?:[\\p{L}-]+,? )?(?:and|or|&) )([\\p{L}-]+) (${heads})(?![\\p{L}])`, 'giu');
	const extra: string[] = [];
	for (const m of text.matchAll(re)) {
		for (const w of m[1].split(/,|\band\b|\bor\b|&/).map((x) => x.trim()).filter(Boolean)) extra.push(`${w} ${m[3]}`);
	}
	return extra.length ? `${text} ${extra.join(' . ')} ` : text;
}

/** Does this text mention the term (or any alias)? */
export function mentions(text: string, key: string): boolean {
	const label = Object.keys(VOCAB).find((l) => l.toLowerCase() === key);
	const re = matcher(label ? [label, ...VOCAB[label]] : [key]);
	return re.test(normalize(text));
}

// ── coverage against your content
import type { Content } from './content';

export type Source = { entryId: string; itemId: string | null; variantId: string | null; module: string; text: string; archived: boolean };

/** Every piece of text in your content that could contain a term. */
export function contentSources(content: Content): Source[] {
	const out: Source[] = [];
	for (const e of content.entries) {
		const dataText = Object.values(e.data).filter((v) => typeof v === 'string').join(' · ');
		if (dataText) out.push({ entryId: e.id, itemId: null, variantId: null, module: e.module, text: dataText, archived: e.archived });
		for (const v of e.variants) out.push({ entryId: e.id, itemId: null, variantId: v.id, module: e.module, text: v.text, archived: e.archived });
		for (const i of e.items)
			for (const v of i.variants) out.push({ entryId: e.id, itemId: i.id, variantId: v.id, module: e.module, text: v.text, archived: e.archived || i.archived });
	}
	return out;
}

/** Which of your texts mention each term. Archived content does not count as coverage. */
export function coverage(terms: { key: string }[], sources: Source[]) {
	return new Map(terms.map((t) => [t.key, sources.filter((s) => !s.archived && mentions(s.text, t.key))]));
}
