// Pure conversions between editor forms and the recipe / overrides JSON. Tested in forms.test.ts.
import { MODULES, VARIANT_LENGTHS, type Module } from '$lib/domain/modules';
import type { Overrides, Recipe } from '$lib/domain/recipe';

type Get = (k: string) => string;
const getter = (f: FormData): Get => (k) => String(f.get(k) ?? '').trim();
const tags = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);
const posInt = (s: string) => (/^\d+$/.test(s) && Number(s) > 0 ? Number(s) : undefined);

/** Sections a new category starts with. */
export const DEFAULT_RECIPE_MODULES: Module[] = ['headline', 'summary', 'experience', 'credentials', 'skills', 'education', 'languages'];

/** Form fields per module: use_<m>, order_<m>, title_<m>, maxEntries_<m>, maxItems_<m>, include_<m>, exclude_<m>. */
export function recipeFromForm(form: FormData): unknown {
	const g = getter(form);
	const used = MODULES.filter((m) => form.get(`use_${m}`) === 'on')
		.map((m, i) => ({ m, order: Number(g(`order_${m}`)) || 100 + i }))
		.sort((a, b) => a.order - b.order);
	return {
		version: 1,
		modules: used.map(({ m }) => ({
			module: m,
			...(g(`title_${m}`) && { title: g(`title_${m}`) }),
			...(posInt(g(`maxEntries_${m}`)) && { maxEntries: posInt(g(`maxEntries_${m}`)) }),
			...(posInt(g(`maxItems_${m}`)) && { maxItemsPerEntry: posInt(g(`maxItems_${m}`)) }),
			includeTags: tags(g(`include_${m}`)),
			excludeTags: tags(g(`exclude_${m}`))
		})),
		preferTags: tags(g('preferTags')),
		length: (VARIANT_LENGTHS as readonly string[]).includes(g('length')) ? g('length') : 'standard'
	};
}

/** Rows for the recipe editor: every module, with its settings if the recipe uses it. */
export function recipeRows(recipe: Recipe) {
	return MODULES.map((m) => {
		const i = recipe.modules.findIndex((r) => r.module === m);
		const r = recipe.modules[i];
		return {
			module: m,
			used: i >= 0,
			order: i >= 0 ? i + 1 : '',
			title: r?.title ?? '',
			maxEntries: r?.maxEntries ?? '',
			maxItems: r?.maxItemsPerEntry ?? '',
			include: r?.includeTags.join(', ') ?? '',
			exclude: r?.excludeTags.join(', ') ?? ''
		};
	});
}

/**
 * Job overrides. Fields: preferTags, length ('' = category's), order_<m> (blank = category order),
 * entry_<id> = 'exclude', item_<id> = 'auto'|'include'|'exclude', pin_<id> = variantId|''.
 */
export function overridesFromForm(form: FormData, recipeOrder: Module[]): Overrides {
	const g = getter(form);
	const out: Overrides = {};
	const prefer = tags(g('preferTags'));
	if (prefer.length) out.preferTags = prefer;
	if ((VARIANT_LENGTHS as readonly string[]).includes(g('length'))) out.length = g('length') as Overrides['length'];

	const ordered = recipeOrder.map((m, i) => ({ m, n: Number(g(`order_${m}`)) || 0, i }));
	if (ordered.some((o) => o.n > 0)) {
		// Numbered sections first in number order, the rest keep the category order after them.
		out.moduleOrder = ordered.sort((a, b) => (a.n || Infinity) - (b.n || Infinity) || a.i - b.i).map((o) => o.m);
	}
	const excludeEntries: string[] = [];
	const includeItems: string[] = [];
	const excludeItems: string[] = [];
	const pins: Record<string, string> = {};
	for (const [k, v] of form.entries()) {
		const val = String(v);
		if (k.startsWith('entry_') && val === 'exclude') excludeEntries.push(k.slice(6));
		else if (k.startsWith('item_') && val === 'include') includeItems.push(k.slice(5));
		else if (k.startsWith('item_') && val === 'exclude') excludeItems.push(k.slice(5));
		else if (k.startsWith('pin_') && val) pins[k.slice(4)] = val;
	}
	if (excludeEntries.length) out.excludeEntries = excludeEntries;
	if (includeItems.length) out.includeItems = includeItems;
	if (excludeItems.length) out.excludeItems = excludeItems;
	if (Object.keys(pins).length) out.pinVariants = pins;
	return out;
}
