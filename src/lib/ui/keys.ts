// Editor keyboard shortcuts. Every shortcut also exists as a clickable button in the key bar.
export type KeyAction = { key: string; label: string; run: () => void };

/** Submits the form that has focus, or the page's primary form (marked data-primary). */
export function saveCurrentForm() {
	const active = document.activeElement as HTMLElement | null;
	const form = (active?.closest('form') as HTMLFormElement | null) ?? (document.querySelector('form[data-primary]') as HTMLFormElement | null);
	form?.requestSubmit();
}

export function handleHotkey(e: KeyboardEvent, actions: KeyAction[]): boolean {
	if (e.altKey || e.metaKey) return false;
	const combo = (e.ctrlKey ? 'Ctrl+' : '') + e.key.toUpperCase().replace(/^([A-Z])$/, '$1');
	const hit = actions.find((a) => a.key.toUpperCase() === combo.toUpperCase());
	if (!hit) return false;
	e.preventDefault();
	hit.run();
	return true;
}
