// Small factory for single-column designs that differ only in CSS and header layout.
import type { ResolvedCV } from '$lib/domain/content';
import { h, type SafeHtml } from '../html';
import type { Design, FontFamily } from './types';
import { bodySections, bullets, contactParts, headlineOf, sectionBody, src, type EntryBlock } from './shared';

const entryBlock: EntryBlock = (what, where, when, e) =>
	h`<div class="entry"${src('entry', e.id)}>
		<div class="row"><div><span class="what">${what}</span>${where ? h`<span class="where"> · ${where}</span>` : ''}</div>${when ? h`<div class="when">${when}</div>` : ''}</div>
		${e.text ? h`<p class="desc">${e.text}</p>` : ''}${bullets(e)}
	</div>`;

export function makeDesign(d: { key: string; name: string; description: string; fonts: FontFamily[]; css: string }): Design {
	const render = (cv: ResolvedCV): SafeHtml => {
		const p = cv.profile;
		const contact = contactParts(p);
		return h`<main class="page">
	<header>
		<div class="band">
			<h1${src('profile')}>${p?.fullName ?? 'Your name'}</h1>
			${headlineOf(cv.sections)}
		</div>
		${contact.length ? h`<div class="contact"${src('profile')}>${contact.map((c) => h`<span>${c}</span>`)}</div>` : ''}
	</header>
	${bodySections(cv.sections).map((s) => h`<section class="${s.module}">${s.title ? h`<h2>${s.title}</h2>` : ''}${sectionBody(s, entryBlock)}</section>`)}
</main>`;
	};
	return { ...d, render };
}

/** Shared base CSS: page, rows, bullets, print rules. Designs add their look on top. */
export const BASE_CSS = `
* { box-sizing: border-box; }
html { background: #e9ecf0; }
body { margin: 0; color: var(--ink); -webkit-font-smoothing: antialiased; font-feature-settings: 'tnum' 1; }
.page { width: 210mm; min-height: 297mm; margin: 24px auto; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / .08), 0 8px 24px rgb(0 0 0 / .08); }
h1, h2, p { margin: 0; }
section { margin-top: 5mm; }
.entry { margin: 0 0 3.2mm; break-inside: avoid-page; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.what { font-weight: 600; } .where, .when { color: var(--muted); } .when { white-space: nowrap; font-size: .92em; }
.desc { margin-top: .8mm; }
ul { margin: 1mm 0 0; padding: 0; list-style: none; }
li { position: relative; padding-left: 4mm; margin: .6mm 0 0; }
li::before { content: ''; position: absolute; left: .6mm; top: .55em; width: 1.5mm; height: 1.5mm; border-radius: 50%; background: var(--accent); opacity: .6; }
.kind { font-size: .8em; color: var(--muted); margin-left: 1.5mm; } .kind::before { content: '('; } .kind::after { content: ')'; }
.inline .group { font-weight: 600; } .sep { color: #9aa3ae; margin: 0 .6mm; } .nowrap { white-space: nowrap; }
.compact .entry { margin-bottom: 1.4mm; }
.contact a { color: inherit; text-decoration: none; }
h2 { break-after: avoid; }
@page { size: A4; margin: 0; }
@media print { html { background: none; } .page { margin: 0; box-shadow: none; width: auto; min-height: auto; } }
@media screen and (max-width: 840px) { .page { width: auto; min-height: auto; margin: 0; box-shadow: none; } .row { flex-direction: column; gap: 0; } }
`;
