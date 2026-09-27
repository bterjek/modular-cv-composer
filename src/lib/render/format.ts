// Formatting shared by designs. English only for now.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2023-03' → 'Mar 2023' */
export function month(ym: unknown): string {
	if (typeof ym !== 'string') return '';
	const m = /^(\d{4})-(\d{2})$/.exec(ym);
	return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

/** start + end (null = present). Omitted end (undefined) shows the start only. */
export function range(start: unknown, end: unknown): string {
	const s = month(start);
	if (!s) return end ? month(end) : '';
	if (end === null) return `${s} – present`;
	const e = month(end);
	return e && e !== s ? `${s} – ${e}` : s;
}

export const CREDENTIAL_KIND_LABEL: Record<string, string> = {
	certification: 'Certification',
	course: 'Course',
	license: 'Licence',
	membership: 'Membership'
};

export const LANGUAGE_LEVEL_LABEL: Record<string, string> = {
	native: 'native',
	A1: 'A1 · beginner',
	A2: 'A2 · elementary',
	B1: 'B1 · intermediate',
	B2: 'B2 · upper intermediate',
	C1: 'C1 · advanced',
	C2: 'C2 · proficient'
};

export const str = (d: Record<string, unknown>, k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
