// Module types and the structured-data schema for each module's entries.
// See docs/SCHEMA.md §2.
import { z } from 'zod';

export const MODULES = [
	'headline',
	'summary',
	'experience',
	'education',
	'credentials',
	'skills',
	'languages',
	'projects',
	'custom'
] as const;
export type Module = (typeof MODULES)[number];

export const VARIANT_LENGTHS = ['short', 'standard', 'long'] as const;
export type VariantLength = (typeof VARIANT_LENGTHS)[number];

export const CREDENTIAL_KINDS = ['certification', 'course', 'license', 'membership'] as const;

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
/** Only web links can be stored (plain z.url() accepts javascript: URLs). */
export const webUrl = z.url({ protocol: /^https?$/, message: 'Use a full https:// link' });
const url = webUrl;

/** Structured fields per module. Prose lives in variants, never here. */
export const entryData = {
	headline: z.object({}),
	summary: z.object({}),
	experience: z.object({
		organization: z.string().min(1),
		title: z.string().min(1),
		location: z.string().optional(),
		start: yearMonth,
		end: yearMonth.nullable() // null = present
	}),
	education: z.object({
		institution: z.string().min(1),
		degree: z.string().min(1),
		field: z.string().optional(),
		start: yearMonth.optional(),
		end: yearMonth.nullable().optional()
	}),
	credentials: z.object({
		name: z.string().min(1),
		issuer: z.string().min(1),
		kind: z.enum(CREDENTIAL_KINDS),
		issued: yearMonth.optional(),
		expires: yearMonth.optional(),
		credentialUrl: url.optional()
	}),
	skills: z.object({ group: z.string().min(1) }),
	languages: z.object({
		language: z.string().min(1),
		level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'])
	}),
	projects: z.object({
		name: z.string().min(1),
		url: url.optional(),
		start: yearMonth.optional(),
		end: yearMonth.nullable().optional()
	}),
	custom: z.object({ heading: z.string().min(1) })
} satisfies Record<Module, z.ZodType>;

export type EntryData<M extends Module> = z.infer<(typeof entryData)[M]>;

export function parseEntryData<M extends Module>(module: M, data: unknown): EntryData<M> {
	return entryData[module].parse(data) as EntryData<M>;
}

/** Modules whose entries carry prose wordings of their own (not just bullets). */
export const ENTRY_WORDINGS: Record<Module, 'required' | 'optional' | 'none'> = {
	headline: 'required',
	summary: 'required',
	experience: 'optional',
	education: 'optional',
	credentials: 'optional',
	skills: 'optional',
	languages: 'optional',
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
