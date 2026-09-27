// The engine's input and output shapes. Pure data: no database, no framework.
import type { Module, VariantLength } from './modules';

export type VariantIn = {
	id: string;
	text: string;
	length: VariantLength;
	isDefault: boolean;
	position: number;
	tags: string[];
};

export type ItemIn = {
	id: string;
	position: number;
	archived: boolean;
	tags: string[];
	variants: VariantIn[];
};

export type EntryIn = {
	id: string;
	module: Module;
	label: string;
	data: Record<string, unknown>;
	sortKey: string | null;
	position: number;
	archived: boolean;
	tags: string[];
	variants: VariantIn[];
	items: ItemIn[];
};

export type ProfileIn = {
	fullName: string;
	email: string;
	phone: string | null;
	location: string | null;
	links: { label: string; url: string }[];
};

export type Content = { profile: ProfileIn | null; entries: EntryIn[] };

// ── Output: what templates receive and snapshots store
export type ResolvedItem = { id: string; variantId: string; text: string };
export type ResolvedEntry = {
	id: string;
	module: Module;
	data: Record<string, unknown>;
	variantId: string | null;
	text: string | null;
	items: ResolvedItem[];
};
export type ResolvedSection = { module: Module; title: string | null; entries: ResolvedEntry[] };

export type TraceEvent = {
	kind: 'section' | 'entry' | 'item' | 'variant';
	id: string; // module name for sections, otherwise the row id
	outcome: 'kept' | 'dropped' | 'chosen';
	reason: string;
};

export type ResolvedCV = {
	engineVersion: string;
	profile: ProfileIn | null;
	sections: ResolvedSection[];
	trace: TraceEvent[];
	/** Problems with the overrides, e.g. a pinned variant that no longer exists. */
	warnings: string[];
};
