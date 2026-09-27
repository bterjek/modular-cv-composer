// Svelte action: Up/Down arrows move focus between the links/buttons marked data-nav in a list,
// like a DOS menu. Home/End jump to the first/last. Tab keeps working as usual.
export function arrowNav(node: HTMLElement) {
	function onKey(e: KeyboardEvent) {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
		const items = [...node.querySelectorAll<HTMLElement>('[data-nav]')];
		const i = items.indexOf(document.activeElement as HTMLElement);
		if (i === -1) return;
		e.preventDefault();
		const next =
			e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0);
		items[next].focus();
	}
	node.addEventListener('keydown', onKey);
	return { destroy: () => node.removeEventListener('keydown', onKey) };
}
