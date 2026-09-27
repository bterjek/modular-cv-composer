// Minimal safe HTML builder: every interpolated value is escaped unless it is
// already SafeHtml. There is no way to insert raw user text.
export class SafeHtml {
	constructor(readonly value: string) {}
	toString() {
		return this.value;
	}
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

type Value = SafeHtml | string | number | null | undefined | false | Value[];

function part(v: Value): string {
	if (v === null || v === undefined || v === false) return '';
	if (Array.isArray(v)) return v.map(part).join('');
	if (v instanceof SafeHtml) return v.value;
	return escape(String(v));
}

export function h(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
	let out = strings[0];
	values.forEach((v, i) => (out += part(v) + strings[i + 1]));
	return new SafeHtml(out);
}

/** Trusted, author-controlled strings only (our own CSS). */
export const raw = (s: string) => new SafeHtml(s);

/** Only http(s) and mailto links are ever rendered as links. */
export function safeHref(url: string): string | null {
	try {
		const u = new URL(url);
		return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : null;
	} catch {
		return null;
	}
}
