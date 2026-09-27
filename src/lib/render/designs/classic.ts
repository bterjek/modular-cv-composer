// "Classic" — serif, centred header, ruled title-case section heads, no colour. For conservative
// fields (law, finance, public sector, academia). Same ATS rules as "modern": one column, real text.
import type { ResolvedCV } from '$lib/domain/content';
import { h, type SafeHtml } from '../html';
import type { Design } from './types';
import { bodySections, bullets, contactParts, headlineOf, sectionBody, src, type EntryBlock } from './shared';

const css = /* css */ `
:root { --ink: #1a1a1a; --muted: #555; --rule: #1a1a1a; --paper: #fff; }
* { box-sizing: border-box; }
html { background: #ecebe8; }
body {
	margin: 0;
	font-family: 'Source Serif 4', 'Liberation Serif', 'DejaVu Serif', Georgia, serif;
	font-size: 10.2pt;
	line-height: 1.42;
	color: var(--ink);
	font-feature-settings: 'onum' 0, 'lnum' 1, 'kern' 1;
	-webkit-font-smoothing: antialiased;
}
.page {
	width: 210mm; min-height: 297mm; margin: 24px auto; padding: 17mm 19mm;
	background: var(--paper); box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.08);
}
header { text-align: center; margin-bottom: 6mm; }
h1 { font-size: 21pt; font-weight: 600; letter-spacing: 0.01em; margin: 0; }
.headline { font-style: italic; font-size: 11pt; margin: 1.2mm 0 0; }
.contact { margin: 2mm 0 0; font-size: 9.4pt; color: var(--muted); }
.contact a { color: inherit; text-decoration: none; }

section { margin-top: 5mm; }
h2 {
	color: var(--accent, var(--ink));
	font-size: 11pt; font-weight: 600; letter-spacing: 0.01em;
	margin: 0 0 2mm; padding-bottom: 0.8mm; border-bottom: 0.6pt solid var(--rule); break-after: avoid;
}
.lead { margin: 0; }
.entry { margin: 0 0 3.2mm; break-inside: avoid-page; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.what { font-weight: 600; }
.where { font-style: italic; }
.when { white-space: nowrap; font-size: 9.6pt; }
.desc { margin: 0.6mm 0 0; }
ul { margin: 0.8mm 0 0; padding: 0; list-style: none; }
li { position: relative; padding-left: 4.5mm; margin: 0.5mm 0 0; }
li::before { content: '–'; position: absolute; left: 0.5mm; }
.kind { font-size: 8.8pt; font-style: italic; color: var(--muted); margin-left: 1.5mm; }
.kind::before { content: '('; } .kind::after { content: ')'; }
.inline { margin: 0; }
.inline .group { font-weight: 600; }
.sep { color: var(--muted); margin: 0 0.4mm; }
.nowrap { white-space: nowrap; }
.compact .entry { margin-bottom: 1.4mm; }

@page { size: A4; margin: 0; }
@media print { html { background: none; } .page { margin: 0; box-shadow: none; width: auto; min-height: auto; } }
@media screen and (max-width: 840px) {
	.page { width: auto; min-height: auto; margin: 0; padding: 20px 18px; box-shadow: none; }
	.row { flex-direction: column; gap: 0; }
}
`;

const entryBlock: EntryBlock = (what, where, when, e) =>
	h`<div class="entry"${src('entry', e.id)}>
		<div class="row"><div><span class="what">${what}</span>${where ? h`, <span class="where">${where}</span>` : ''}</div>${when ? h`<div class="when">${when}</div>` : ''}</div>
		${e.text ? h`<p class="desc">${e.text}</p>` : ''}${bullets(e)}
	</div>`;

function render(cv: ResolvedCV): SafeHtml {
	const p = cv.profile;
	const headline = headlineOf(cv.sections);
	const contact = contactParts(p);
	return h`<main class="page">
	<header>
		<h1${src('profile')}>${p?.fullName ?? 'Your name'}</h1>
		${headline}
		${contact.length ? h`<p class="contact"${src('profile')}>${contact.map((c, i) => (i ? h` <span class="sep" aria-hidden="true">·</span> ${c}` : c))}</p>` : ''}
	</header>
	${bodySections(cv.sections).map((s) => h`<section class="${s.module}">${s.title ? h`<h2>${s.title}</h2>` : ''}${sectionBody(s, entryBlock)}</section>`)}
</main>`;
}

export const classic: Design = {
	key: 'classic',
	name: 'Classic',
	description: 'Serif, centred, no colour — for conservative fields.',
	fonts: ['source-serif'],
	css,
	render
};
