// Recipe (on a category) and overrides (on a job target). See docs/SCHEMA.md §4.
import { z } from 'zod';
import { MODULES, VARIANT_LENGTHS } from './modules';

const tagList = z.array(z.string().min(1)).default([]);

export const moduleRule = z.object({
	module: z.enum(MODULES),
	title: z.string().optional(),
	maxEntries: z.number().int().positive().optional(),
	maxItemsPerEntry: z.number().int().positive().optional(),
	includeTags: tagList,
	excludeTags: tagList
});

export const recipe = z.object({
	version: z.literal(1),
	modules: z.array(moduleRule).min(1),
	preferTags: tagList,
	length: z.enum(VARIANT_LENGTHS).default('standard')
});
export type Recipe = z.infer<typeof recipe>;

export const overrides = z.object({
	moduleOrder: z.array(z.enum(MODULES)).optional(),
	includeItems: z.array(z.string()).optional(),
	excludeItems: z.array(z.string()).optional(),
	excludeEntries: z.array(z.string()).optional(),
	pinVariants: z.record(z.string(), z.string()).optional(),
	preferTags: z.array(z.string()).optional(),
	length: z.enum(VARIANT_LENGTHS).optional()
});
export type Overrides = z.infer<typeof overrides>;
