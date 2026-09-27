// Section logic shared by all designs: what goes into each section and in which order.
// A design supplies only its look: CSS and how one entry block is laid out.
import type { ProfileIn, ResolvedEntry, ResolvedSection } from '$lib/domain/content';
import { h, safeHref, type SafeHtml } from '../html';
import { CREDENTIAL_KIND_LABEL, LANGUAGE_LEVEL_LABEL, range, str, month } from '../format';

/** Lays out one entry: headline part, secondary part ("where"), date text, the entry itself. */
export type EntryBlock = (what: SafeHtml | string, where: string, when: string, e: ResolvedEntry) => SafeHtml;

/** Each part stays on one line; the separator is where lines may break. */
export const joinWithSep = (parts: (SafeHtml | string)[]) =>
	parts.map((p, i) => (i === 0 ? h`<span class="nowrap">${p}</span>` : h` <span class="sep" aria-hidden="true">·</span> <span class="nowrap">${p}</span>`));

export const bullets = (e: ResolvedEntry) => (e.items.length ? h`<ul>${e.items.map((i) => h`<li>${i.text}</li>`)}</ul>` : '');

export function contactParts(p: ProfileIn | null): SafeHtml[] {
	if (!p) return [];
	return [
		h`<a href="mailto:${p.email}">${p.email}</a>`,
		...(p.phone ? [h`${p.phone}`] : []),
		...(p.location ? [h`${p.location}`] : []),
		...p.links.flatMap((l) => {
			const href = safeHref(l.url);
			return href ? [h`<a href="${href}">${l.label}</a>`] : [];
		})
	];
}

export function sectionBody(s: ResolvedSection, block: EntryBlock): SafeHtml {
	switch (s.module) {
		case 'summary':
			return h`${s.entries.map((e) => h`<p class="lead">${e.text}</p>${bullets(e)}`)}`;
		case 'experience':
			return h`${s.entries.map((e) => {
				const where = [str(e.data, 'organization'), str(e.data, 'location')].filter(Boolean).join(', ');
				return block(str(e.data, 'title'), where, range(e.data.start, e.data.end), e);
			})}`;
		case 'education':
			return h`${s.entries.map((e) => {
				const what = [str(e.data, 'degree'), str(e.data, 'field')].filter(Boolean).join(', ');
				return block(what, str(e.data, 'institution'), range(e.data.start, e.data.end), e);
			})}`;
		case 'projects':
			return h`${s.entries.map((e) => {
				const href = safeHref(str(e.data, 'url'));
				const name = href ? h`<a href="${href}">${str(e.data, 'name')}</a>` : str(e.data, 'name');
				return block(name, '', range(e.data.start, e.data.end), e);
			})}`;
		case 'credentials':
			return h`<div class="compact">${s.entries.map((e) => {
				const href = safeHref(str(e.data, 'credentialUrl'));
				const name = str(e.data, 'name');
				const label = CREDENTIAL_KIND_LABEL[str(e.data, 'kind')] ?? '';
				const what = h`${href ? h`<a href="${href}">${name}</a>` : name}<span class="kind">${label}</span>`;
				const expires = str(e.data, 'expires') ? ` (valid until ${month(e.data.expires)})` : '';
				return block(what, str(e.data, 'issuer'), month(e.data.issued) + expires, e);
			})}</div>`;
		case 'skills':
			return h`${s.entries.map((e) => {
				const group = str(e.data, 'group');
				return h`<p class="inline">${group ? h`<span class="group">${group}:</span> ` : ''}${joinWithSep(e.items.map((i) => i.text))}</p>`;
			})}`;
		case 'languages':
			return h`<p class="inline">${joinWithSep(
				s.entries.map((e) => `${str(e.data, 'language')} (${LANGUAGE_LEVEL_LABEL[str(e.data, 'level')] ?? str(e.data, 'level')})`)
			)}</p>`;
		case 'custom':
			return h`${s.entries.map((e) => block(str(e.data, 'heading'), '', '', e))}`;
		default:
			return h``;
	}
}

export const headlineOf = (sections: ResolvedSection[]) => sections.find((s) => s.module === 'headline')?.entries[0]?.text;
export const bodySections = (sections: ResolvedSection[]) => sections.filter((s) => s.module !== 'headline');
