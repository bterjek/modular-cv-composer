// "Modern" — single column, A4, Inter, one accent colour. Built to read well
// on screen, print cleanly, and stay parseable by applicant tracking systems
// (real text, one column, standard section names, no tables for layout).
import type { ResolvedCV } from '$lib/domain/content';
import { h, type SafeHtml } from '../html';
import type { Design } from './types';
import { bodySections, bullets, contactParts, headlineOf, sectionBody, type EntryBlock } from './shared';

const css = /* css */ `
:root {
	--ink: #1b2330;
	--muted: #5b6573;
	--rule: #d9dee5;
	--accent: #1f5f8b;
	--paper: #ffffff;
}
* { box-sizing: border-box; }
html { background: #e9ecf0; }
body {
	margin: 0;
	font-family: Inter, 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif;
	font-size: 9.6pt;
	line-height: 1.45;
	color: var(--ink);
	font-feature-settings: 'tnum' 1, 'cv11' 1;
	-webkit-font-smoothing: antialiased;
}
.page {
	width: 210mm;
	min-height: 297mm;
	margin: 24px auto;
	padding: 16mm 17mm 16mm;
	background: var(--paper);
	box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.08);
}
header { padding-bottom: 5mm; margin-bottom: 5mm; border-bottom: 2px solid var(--ink); }
h1 { font-size: 24pt; line-height: 1.1; letter-spacing: -0.02em; margin: 0; font-weight: 700; }
.headline { font-size: 11.5pt; color: var(--accent); font-weight: 600; margin: 1.5mm 0 0; }
.contact { margin: 2.5mm 0 0; color: var(--muted); display: flex; flex-wrap: wrap; gap: 0 4mm; font-size: 9pt; }
.contact a { color: inherit; text-decoration: none; }

section { margin-top: 5.5mm; }
h2 {
	font-size: 8.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
	color: var(--accent); margin: 0 0 2.5mm; padding-bottom: 1.2mm; border-bottom: 1px solid var(--rule);
	break-after: avoid;
}
.lead { margin: 0; font-size: 10pt; }
.entry { margin: 0 0 3.5mm; break-inside: avoid-page; }
.entry:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.what { font-weight: 600; }
.where { color: var(--muted); }
.when { color: var(--muted); white-space: nowrap; font-size: 8.8pt; }
.desc { margin: 0.8mm 0 0; }
ul { margin: 1.2mm 0 0; padding: 0; list-style: none; }
li { position: relative; padding-left: 4mm; margin: 0.7mm 0 0; }
li::before { content: ''; position: absolute; left: 0.6mm; top: 0.5em; width: 1.6mm; height: 1.6mm; border-radius: 50%; background: var(--accent); opacity: 0.55; }
.kind { font-size: 7.6pt; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted);
	border: 1px solid var(--rule); border-radius: 3px; padding: 0 1.2mm; margin-left: 1.5mm; white-space: nowrap; }
.inline { margin: 0; }
.inline .group { font-weight: 600; }
.sep { color: #9aa3ae; margin: 0 0.6mm; }
.nowrap { white-space: nowrap; }
.compact .entry { margin-bottom: 1.6mm; }

@page { size: A4; margin: 0; }
@media print {
	html { background: none; }
	.page { margin: 0; box-shadow: none; width: auto; min-height: auto; }
}
@media screen and (max-width: 840px) {
	.page { width: auto; min-height: auto; margin: 0; padding: 20px 18px; box-shadow: none; }
	.row { flex-direction: column; gap: 0; }
}
`;

const entryBlock: EntryBlock = (what, where, when, e) =>
	h`<div class="entry">
		<div class="row"><div><span class="what">${what}</span>${where ? h`<span class="where"> · ${where}</span>` : ''}</div>${when ? h`<div class="when">${when}</div>` : ''}</div>
		${e.text ? h`<p class="desc">${e.text}</p>` : ''}${bullets(e)}
	</div>`;

function render(cv: ResolvedCV): SafeHtml {
	const p = cv.profile;
	const headline = headlineOf(cv.sections);
	const contact = contactParts(p);
	return h`<main class="page">
	<header>
		<h1>${p?.fullName ?? 'Your name'}</h1>
		${headline ? h`<p class="headline">${headline}</p>` : ''}
		${contact.length ? h`<div class="contact">${contact.map((c) => h`<span>${c}</span>`)}</div>` : ''}
	</header>
	${bodySections(cv.sections).map((s) => h`<section class="${s.module}">${s.title ? h`<h2>${s.title}</h2>` : ''}${sectionBody(s, entryBlock)}</section>`)}
</main>`;
}

export const modern: Design = {
	key: 'modern',
	name: 'Modern',
	description: 'Sans-serif, one accent colour, crisp section rules.',
	fonts: ['inter'],
	css,
	render
};
