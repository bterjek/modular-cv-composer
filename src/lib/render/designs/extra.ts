// Business, Executive and Bold. All single column with real text headings (ATS-safe).
import { BASE_CSS, makeDesign } from './make';

export const business = makeDesign({
	key: 'business',
	name: 'Business',
	description: 'Compact and dense, left accent bars — fits more on one page.',
	fonts: ['inter'],
	css: `${BASE_CSS}
:root { --ink: #1c2430; --muted: #5c6672; --accent: #1f4e79; }
body { font-family: Inter, 'Liberation Sans', Arial, sans-serif; font-size: 9.1pt; line-height: 1.38; }
.page { padding: 13mm 14mm; }
header { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; border-bottom: 1px solid #c9d0d8; padding-bottom: 3mm; }
h1 { font-size: 18pt; font-weight: 700; letter-spacing: -.01em; }
.headline { font-size: 10pt; font-weight: 600; color: var(--accent); margin-top: .8mm; }
.contact { display: flex; flex-direction: column; align-items: flex-end; font-size: 8.4pt; color: var(--muted); gap: .3mm; }
section { margin-top: 4mm; }
h2 { font-size: 9.2pt; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink);
	border-left: 3px solid var(--accent); padding-left: 2mm; margin-bottom: 1.8mm; }
.entry { margin-bottom: 2.4mm; }
`
});

export const executive = makeDesign({
	key: 'executive',
	name: 'Executive',
	description: 'Strong dark header band with a large name; calm, senior feel.',
	fonts: ['inter', 'source-serif'],
	css: `${BASE_CSS}
:root { --ink: #1f2328; --muted: #5a6068; --accent: #1f4e79; }
body { font-family: Inter, 'Liberation Sans', Arial, sans-serif; font-size: 9.7pt; line-height: 1.45; }
.page { padding: 0 0 16mm; }
.band { background: #1f2328; color: #fff; padding: 13mm 18mm 8mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-family: 'Source Serif 4', Georgia, serif; font-size: 26pt; font-weight: 600; letter-spacing: .005em; }
.headline { font-size: 11pt; color: #d6dbe1; margin-top: 1.5mm; }
.contact { display: flex; flex-wrap: wrap; gap: 0 5mm; padding: 3mm 18mm; background: #eef0f3; color: var(--muted); font-size: 8.8pt;
	-webkit-print-color-adjust: exact; print-color-adjust: exact; }
section { margin: 5.5mm 18mm 0; }
h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: 12.5pt; font-weight: 600; color: var(--accent); margin-bottom: 2mm;
	border-bottom: 1px solid #d5d9de; padding-bottom: 1mm; }
@media screen and (max-width: 840px) { .band, .contact { padding-left: 18px; padding-right: 18px; } section { margin: 20px 18px 0; } }
`
});

export const bold = makeDesign({
	key: 'bold',
	name: 'Bold',
	description: 'Colour header and accents — eye-catching, still one column for ATS.',
	fonts: ['inter'],
	css: `${BASE_CSS}
:root { --ink: #16181d; --muted: #5a616c; --accent: #0f766e; }
body { font-family: Inter, 'Liberation Sans', Arial, sans-serif; font-size: 9.6pt; line-height: 1.45; }
.page { padding: 0 0 16mm; border-top: 0; }
.band { background: var(--accent); color: #fff; padding: 14mm 17mm 9mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-size: 27pt; font-weight: 700; letter-spacing: -.02em; line-height: 1.05; }
.headline { font-size: 11.5pt; font-weight: 600; opacity: .92; margin-top: 2mm; }
.contact { display: flex; flex-wrap: wrap; gap: 0 5mm; padding: 3.5mm 17mm 0; color: var(--muted); font-size: 8.9pt; }
section { margin: 5.5mm 17mm 0; }
h2 { display: inline-block; font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #fff;
	background: var(--accent); padding: .6mm 2.4mm; border-radius: 1mm; margin-bottom: 2.2mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
li::before { border-radius: 0; width: 1.4mm; height: 1.4mm; opacity: .85; }
@media screen and (max-width: 840px) { .band, .contact { padding-left: 18px; padding-right: 18px; } section { margin: 20px 18px 0; } }
`
});
