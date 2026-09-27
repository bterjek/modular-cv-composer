// How each module's structured fields appear in the editor. Validation lives in domain/modules.ts.
import type { Module } from '$lib/domain/modules';
import { CREDENTIAL_KINDS } from '$lib/domain/modules';

export type Field =
	| { name: string; label: string; kind: 'text' | 'url'; required?: boolean; hint?: string }
	| { name: string; label: string; kind: 'month'; required?: boolean }
	| { name: string; label: string; kind: 'end' } // YYYY-MM or "present"
	| { name: string; label: string; kind: 'select'; options: readonly string[]; required?: boolean };

export const MODULE_LABELS: Record<Module, string> = {
	headline: 'Headline',
	summary: 'Summary',
	experience: 'Experience',
	education: 'Education',
	credentials: 'Certifications & training',
	skills: 'Skills',
	languages: 'Languages',
	projects: 'Projects',
	custom: 'Other sections'
};

export const MODULE_HELP: Record<Module, string> = {
	headline: 'One line under your name. Add a version per kind of job and tag it (e.g. compliance, operations) — each CV shows only the one that fits best.',
	summary: 'A short profile paragraph. Add a version per kind of job and tag it — each CV shows only the one that fits best.',
	experience: 'One entry per role. Bullets are items; each bullet can have several wordings.',
	education: 'Degrees and schools.',
	credentials: 'Certificates, courses, licences and memberships — the kind decides the label on the CV.',
	skills: 'One entry per skill group (e.g. "Core"); each skill is an item.',
	languages: 'One entry per language with its level.',
	projects: 'Side projects or notable work with an optional link.',
	custom: 'Anything else: volunteering, publications, awards. The heading is shown on the CV.'
};

export const MODULE_FIELDS: Record<Module, Field[]> = {
	headline: [],
	summary: [],
	experience: [
		{ name: 'title', label: 'Job title', kind: 'text', required: true },
		{ name: 'organization', label: 'Organisation', kind: 'text', required: true },
		{ name: 'location', label: 'Location', kind: 'text' },
		{ name: 'start', label: 'Start', kind: 'month', required: true },
		{ name: 'end', label: 'End', kind: 'end' }
	],
	education: [
		{ name: 'degree', label: 'Degree', kind: 'text', required: true },
		{ name: 'field', label: 'Field', kind: 'text' },
		{ name: 'institution', label: 'Institution', kind: 'text', required: true },
		{ name: 'start', label: 'Start', kind: 'month' },
		{ name: 'end', label: 'End', kind: 'end' }
	],
	credentials: [
		{ name: 'name', label: 'Name', kind: 'text', required: true },
		{ name: 'issuer', label: 'Issued by', kind: 'text', required: true },
		{ name: 'kind', label: 'Kind', kind: 'select', options: CREDENTIAL_KINDS, required: true },
		{ name: 'issued', label: 'Issued', kind: 'month' },
		{ name: 'expires', label: 'Expires', kind: 'month' },
		{ name: 'credentialUrl', label: 'Verification link', kind: 'url' }
	],
	skills: [{ name: 'group', label: 'Group name', kind: 'text', required: true, hint: 'e.g. Core, Tools, Frameworks' }],
	languages: [
		{ name: 'language', label: 'Language', kind: 'text', required: true },
		{ name: 'level', label: 'Level', kind: 'select', options: ['native', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'], required: true }
	],
	projects: [
		{ name: 'name', label: 'Name', kind: 'text', required: true },
		{ name: 'url', label: 'Link', kind: 'url' },
		{ name: 'start', label: 'Start', kind: 'month' },
		{ name: 'end', label: 'End', kind: 'end' }
	],
	custom: [{ name: 'heading', label: 'Heading', kind: 'text', required: true }]
};

/** Modules whose entries carry prose wordings of their own (not just bullets). */
export const ENTRY_WORDINGS: Record<Module, 'required' | 'optional' | 'none'> = {
	headline: 'required',
	summary: 'required',
	experience: 'optional',
	education: 'optional',
	credentials: 'none',
	skills: 'none',
	languages: 'none',
	projects: 'optional',
	custom: 'optional'
};

/** Modules whose entries have items (bullets / skills). */
export const HAS_ITEMS: Record<Module, boolean> = {
	headline: false,
	summary: false,
	experience: true,
	education: true,
	credentials: false,
	skills: true,
	languages: false,
	projects: true,
	custom: true
};

/** Turns submitted form fields into the module's data object (empty → omitted, end "present" → null). */
export function dataFromForm(module: Module, form: FormData): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const f of MODULE_FIELDS[module]) {
		const v = String(form.get(f.name) ?? '').trim();
		if (f.kind === 'end') {
			if (form.get(`${f.name}_present`) === 'on') out[f.name] = null;
			else if (v) out[f.name] = v;
		} else if (v) out[f.name] = v;
	}
	return out;
}

/** Internal label for a new entry, derived from its data. */
export function labelFor(module: Module, data: Record<string, unknown>): string {
	const s = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
	return (
		s('organization') || s('institution') || s('name') || s('group') || s('language') || s('heading') || MODULE_LABELS[module]
	).slice(0, 120);
}
