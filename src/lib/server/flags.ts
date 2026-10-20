// Feature flags. The registry below is the source of truth for which flags exist;
// the database only stores their on/off state. Per-user overrides win over the global value.
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { featureFlagOverrides, featureFlags } from './db/schema';

export const FLAGS = {
	'editor.dos-shell': 'Default DOS appearance (optional; editor access is always available)',
	'render.pdf': 'PDF export via Chromium (step 4)',
	'snapshots.share-links': 'Public share links for snapshots (step 6)'
} as const;
export type FlagKey = keyof typeof FLAGS;

/** Inserts flags that are in the registry but not yet in the database (off by default). */
export function syncFlags() {
	for (const [key, description] of Object.entries(FLAGS)) {
		db.insert(featureFlags)
			.values({ key, description, enabled: false })
			.onConflictDoUpdate({ target: featureFlags.key, set: { description } })
			.run();
	}
}

export function isEnabled(key: FlagKey, userId?: string | null): boolean {
	if (userId) {
		const o = db
			.select({ enabled: featureFlagOverrides.enabled })
			.from(featureFlagOverrides)
			.where(and(eq(featureFlagOverrides.flagKey, key), eq(featureFlagOverrides.userId, userId)))
			.get();
		if (o) return o.enabled;
	}
	return db.select({ enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.key, key)).get()?.enabled ?? false;
}

export function enabledFlags(userId: string | null): FlagKey[] {
	return (Object.keys(FLAGS) as FlagKey[]).filter((k) => isEnabled(k, userId));
}

export function setGlobal(key: FlagKey, enabled: boolean) {
	db.update(featureFlags).set({ enabled }).where(eq(featureFlags.key, key)).run();
}

/** enabled = null removes the override, so the user follows the global value again. */
export function setOverride(key: FlagKey, userId: string, enabled: boolean | null) {
	if (enabled === null) {
		db.delete(featureFlagOverrides)
			.where(and(eq(featureFlagOverrides.flagKey, key), eq(featureFlagOverrides.userId, userId)))
			.run();
		return;
	}
	db.insert(featureFlagOverrides)
		.values({ flagKey: key, userId, enabled })
		.onConflictDoUpdate({ target: [featureFlagOverrides.flagKey, featureFlagOverrides.userId], set: { enabled } })
		.run();
}

export function listFlags() {
	const flags = db.select().from(featureFlags).all();
	const overrides = db.select().from(featureFlagOverrides).all();
	return flags
		.filter((f) => f.key in FLAGS)
		.map((f) => ({ ...f, overrides: overrides.filter((o) => o.flagKey === f.key) }));
}

export const isFlagKey = (k: string): k is FlagKey => k in FLAGS;
