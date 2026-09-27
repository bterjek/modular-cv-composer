// The one definition of display order, shared by the engine and the editor.
type Ordered = { id: string; position: number; sortKey?: string | null };
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Entries: manual position first, then newest first (sort key = start/issued date). */
export const entryOrder = (a: Ordered, b: Ordered) =>
	a.position - b.position || (b.sortKey ?? '').localeCompare(a.sortKey ?? '') || byId(a, b);

/** Items and wordings: manual position, then creation order (ids are time-sortable UUIDv7). */
export const itemOrder = (a: Ordered, b: Ordered) => a.position - b.position || byId(a, b);
