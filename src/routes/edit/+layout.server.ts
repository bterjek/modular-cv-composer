import { error } from '@sveltejs/kit';
import * as repo from '$lib/server/repo';
import { isEnabled } from '$lib/server/flags';
import { MODULES } from '$lib/domain/modules';

const PREVIEW_COOKIE = 'cvc_preview';

export function load({ locals, cookies }) {
	const ownerId = locals.user!.id;
	if (!isEnabled('editor.dos-shell', ownerId)) {
		error(403, 'The editor is not switched on for your account yet (feature flag editor.dos-shell).');
	}
	const categories = repo.listCategories(ownerId).map((c) => ({ id: c.id, name: c.name }));
	const targets = repo.listJobTargets(ownerId).map((t) => ({ id: t.id, name: `${t.company} — ${t.roleTitle}` }));

	// What the preview pane shows: the saved choice if it still exists, else the first job or category.
	const saved = cookies.get(PREVIEW_COOKIE) ?? '';
	const [kind, id] = saved.split(':');
	let preview: { kind: 'category' | 'target'; id: string; name: string } | null = null;
	if (kind === 'target') {
		const t = targets.find((x) => x.id === id);
		if (t) preview = { kind, id, name: t.name };
	} else if (kind === 'category') {
		const c = categories.find((x) => x.id === id);
		if (c) preview = { kind, id, name: c.name };
	}
	preview ??= targets[0] ? { kind: 'target', ...targets[0] } : categories[0] ? { kind: 'category', ...categories[0] } : null;

	const content = repo.loadContent(ownerId);
	const counts = Object.fromEntries(MODULES.map((m) => [m, content.entries.filter((e) => e.module === m && !e.archived).length]));

	return { categories, targets, preview, revision: repo.contentRevision(ownerId), counts };
}
