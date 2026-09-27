// The assembly engine: recipe + overrides + content → one concrete CV.
// Pure and deterministic (same input → same output). Rules: docs/SCHEMA.md §5.
import type { Module, VariantLength } from './modules';
import type { Overrides, Recipe } from './recipe';
import type {
	Content,
	EntryIn,
	ItemIn,
	ResolvedCV,
	ResolvedEntry,
	ResolvedItem,
	ResolvedSection,
	TraceEvent,
	VariantIn
} from './content';

export const ENGINE_VERSION = '1.0.0';

export const DEFAULT_TITLES: Record<Module, string | null> = {
	headline: null,
	summary: 'Profile',
	experience: 'Experience',
	education: 'Education',
	credentials: 'Certifications & training',
	skills: 'Skills',
	languages: 'Languages',
	projects: 'Projects',
	custom: 'Additional information'
};

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const hasAny = (tags: string[], wanted: Set<string>) => tags.some((t) => wanted.has(t));
const count = (tags: string[], wanted: Set<string>) => tags.filter((t) => wanted.has(t)).length;

export function resolve(content: Content, recipe: Recipe, overrides: Overrides = {}): ResolvedCV {
	const trace: TraceEvent[] = [];
	const warnings: string[] = [];
	const note = (e: TraceEvent) => trace.push(e);

	const excludeEntries = new Set(overrides.excludeEntries ?? []);
	const excludeItems = new Set(overrides.excludeItems ?? []);
	const includeItems = new Set(overrides.includeItems ?? []);
	const pins = overrides.pinVariants ?? {};
	const overrideTags = new Set(overrides.preferTags ?? []);
	const recipeTags = new Set(recipe.preferTags);
	const allPreferred = new Set([...overrideTags, ...recipeTags]);
	const length: VariantLength = overrides.length ?? recipe.length;

	// Warn about override ids that do not exist, so stale overrides are visible in the UI.
	const entryIds = new Set(content.entries.map((e) => e.id));
	const itemIds = new Set(content.entries.flatMap((e) => e.items.map((i) => i.id)));
	for (const id of excludeEntries) if (!entryIds.has(id)) warnings.push(`excludeEntries: unknown entry ${id}`);
	for (const id of [...excludeItems, ...includeItems])
		if (!itemIds.has(id)) warnings.push(`include/excludeItems: unknown item ${id}`);
	for (const [target, v] of Object.entries(pins)) {
		if (!entryIds.has(target) && !itemIds.has(target)) warnings.push(`pinVariants: unknown target ${target}`);
		else if (!variantsOf(content, target).some((x) => x.id === v))
			warnings.push(`pinVariants: variant ${v} does not belong to ${target}`);
	}

	/** Rule 4: pin > tag score (override tags first) > preferred length > default > position > id. */
	function chooseVariant(targetId: string, variants: VariantIn[]): VariantIn | null {
		if (variants.length === 0) return null;
		const pinned = variants.find((v) => v.id === pins[targetId]);
		if (pinned) {
			note({ kind: 'variant', id: pinned.id, outcome: 'chosen', reason: 'pinned for this job' });
			return pinned;
		}
		const ranked = [...variants].sort(
			(a, b) =>
				count(b.tags, overrideTags) - count(a.tags, overrideTags) ||
				count(b.tags, recipeTags) - count(a.tags, recipeTags) ||
				Number(b.length === length) - Number(a.length === length) ||
				Number(b.isDefault) - Number(a.isDefault) ||
				a.position - b.position ||
				byId(a, b)
		);
		const v = ranked[0];
		const o = count(v.tags, overrideTags);
		const r = count(v.tags, recipeTags);
		const reason =
			o > 0
				? `matches job tags: ${v.tags.filter((t) => overrideTags.has(t)).join(', ')}`
				: r > 0
					? `matches category tags: ${v.tags.filter((t) => recipeTags.has(t)).join(', ')}`
					: variants.length === 1
						? 'only wording'
						: v.length === length && variants.some((x) => x.length !== length)
							? `preferred length (${length})`
							: v.isDefault
								? 'default wording'
								: 'first wording';
		note({ kind: 'variant', id: v.id, outcome: 'chosen', reason });
		return v;
	}

	// Rule 1: module order.
	const rules = new Map(recipe.modules.map((m) => [m.module, m]));
	let order = recipe.modules.map((m) => m.module);
	if (overrides.moduleOrder?.length) {
		const fromOverride = overrides.moduleOrder.filter((m) => rules.has(m));
		for (const m of overrides.moduleOrder)
			if (!rules.has(m)) warnings.push(`moduleOrder: ${m} is not in this category's recipe`);
		order = [...new Set([...fromOverride, ...order])];
	}

	const sections: ResolvedSection[] = [];
	for (const module of order) {
		const rule = rules.get(module)!;
		const include = new Set(rule.includeTags);
		const exclude = new Set(rule.excludeTags);

		// Rule 2: entries.
		const candidates = content.entries
			.filter((e) => e.module === module)
			.sort((a, b) => a.position - b.position || (b.sortKey ?? '').localeCompare(a.sortKey ?? '') || byId(a, b));

		const kept: EntryIn[] = [];
		for (const e of candidates) {
			const drop = (reason: string) => note({ kind: 'entry', id: e.id, outcome: 'dropped', reason });
			if (e.archived) drop('archived');
			else if (excludeEntries.has(e.id)) drop('excluded for this job');
			else if (hasAny(e.tags, exclude)) drop(`has excluded tag: ${e.tags.filter((t) => exclude.has(t)).join(', ')}`);
			else if (include.size && !hasAny(e.tags, include) && !e.items.some((i) => !i.archived && hasAny(i.tags, include)))
				drop(`no tag from: ${rule.includeTags.join(', ')}`);
			else if (rule.maxEntries !== undefined && kept.length >= rule.maxEntries) drop(`over the limit of ${rule.maxEntries} entries`);
			else kept.push(e);
		}

		const resolvedEntries: ResolvedEntry[] = [];
		for (const e of kept) {
			const reason = !include.size
				? 'in section'
				: hasAny(e.tags, include)
					? `tagged ${e.tags.filter((t) => include.has(t)).join(', ')}`
					: 'some of its items match the section tags';
			note({ kind: 'entry', id: e.id, outcome: 'kept', reason });
			const v = chooseVariant(e.id, e.variants);
			const items = resolveItems(e, include, exclude, rule.maxItemsPerEntry);
			resolvedEntries.push({ id: e.id, module, data: e.data, variantId: v?.id ?? null, text: v?.text ?? null, items });
		}

		if (resolvedEntries.length === 0) {
			note({ kind: 'section', id: module, outcome: 'dropped', reason: 'no entries left' });
			continue;
		}
		note({ kind: 'section', id: module, outcome: 'kept', reason: `${resolvedEntries.length} entries` });
		sections.push({ module, title: rule.title ?? DEFAULT_TITLES[module], entries: resolvedEntries });
	}

	/** Rule 3: select by rank, display in the author's order. */
	function resolveItems(e: EntryIn, include: Set<string>, exclude: Set<string>, max?: number): ResolvedItem[] {
		const entryMatches = include.size === 0 || hasAny(e.tags, include);
		const eligible: ItemIn[] = [];
		const forced: ItemIn[] = [];
		for (const i of e.items) {
			const drop = (reason: string) => note({ kind: 'item', id: i.id, outcome: 'dropped', reason });
			if (i.archived) drop('archived');
			else if (includeItems.has(i.id)) forced.push(i);
			else if (excludeItems.has(i.id)) drop('excluded for this job');
			else if (hasAny(i.tags, exclude)) drop(`has excluded tag: ${i.tags.filter((t) => exclude.has(t)).join(', ')}`);
			else if (!entryMatches && !hasAny(i.tags, include)) drop('no matching tag (entry itself does not match)');
			else if (i.variants.length === 0) drop('no wording yet');
			else eligible.push(i);
		}
		const ranked = eligible.sort(
			(a, b) =>
				count(b.tags, overrideTags) - count(a.tags, overrideTags) ||
				count(b.tags, allPreferred) - count(a.tags, allPreferred) ||
				a.position - b.position ||
				byId(a, b)
		);
		const chosen = max === undefined ? ranked : ranked.slice(0, max);
		for (const i of ranked.slice(chosen.length))
			note({ kind: 'item', id: i.id, outcome: 'dropped', reason: `over the limit of ${max} per entry (lower tag match)` });

		const selected = [...chosen, ...forced.filter((f) => f.variants.length > 0)];
		for (const f of forced.filter((f) => f.variants.length === 0)) {
			note({ kind: 'item', id: f.id, outcome: 'dropped', reason: 'forced in, but has no wording yet' });
		}
		return selected
			.sort((a, b) => a.position - b.position || byId(a, b))
			.map((i) => {
				note({
					kind: 'item',
					id: i.id,
					outcome: 'kept',
					reason: includeItems.has(i.id) ? 'forced in for this job' : count(i.tags, allPreferred) ? 'matches preferred tags' : 'in entry'
				});
				const v = chooseVariant(i.id, i.variants)!;
				return { id: i.id, variantId: v.id, text: v.text };
			});
	}

	return { engineVersion: ENGINE_VERSION, profile: content.profile, sections, trace, warnings };
}

function variantsOf(content: Content, targetId: string): VariantIn[] {
	for (const e of content.entries) {
		if (e.id === targetId) return e.variants;
		const i = e.items.find((x) => x.id === targetId);
		if (i) return i.variants;
	}
	return [];
}
