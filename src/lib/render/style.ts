// Turns style options into CSS appended after the design's own CSS (later rules win).
import { ACCENTS, type StyleOptions } from '$lib/domain/style';

const FONT_STACK = {
	inter: "Inter, 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif",
	'source-serif': "'Source Serif 4', 'Liberation Serif', 'DejaVu Serif', Georgia, serif"
} as const;

export function styleCss(o: StyleOptions): string {
	const css: string[] = [];
	if (o.accent) css.push(`:root{--accent:${ACCENTS[o.accent as keyof typeof ACCENTS]}}`);
	if (o.font) css.push(`body{font-family:${FONT_STACK[o.font]}}`);
	if (o.size === 'small') css.push('body{font-size:8.9pt}');
	if (o.size === 'large') css.push('body{font-size:10.8pt}');
	if (o.density === 'compact') css.push('section{margin-top:3.5mm}.entry{margin-bottom:2mm}li{margin-top:0.2mm}h2{margin-bottom:1.5mm}');
	if (o.density === 'airy') css.push('section{margin-top:7.5mm}.entry{margin-bottom:5mm}li{margin-top:1.1mm}h2{margin-bottom:3mm}');
	if (o.align === 'justify') css.push('.lead,.desc,li{text-align:justify;hyphens:auto}');
	if (o.rules === 'off') css.push('h2{border-bottom:none!important;padding-bottom:0}');
	if (o.rules === 'on') css.push('h2{border-bottom:1px solid currentColor;padding-bottom:1mm}');
	if (o.dates === 'below') css.push('.row{flex-direction:column;gap:0}.when{font-size:0.92em}');
	if (o.bullets === 'dash') css.push("li::before{content:'–';background:none;width:auto;height:auto;top:0;border-radius:0;opacity:1;color:var(--accent,currentColor)}");
	if (o.bullets === 'square') css.push("li::before{content:'';width:1.4mm;height:1.4mm;border-radius:0;background:var(--accent,currentColor);opacity:.8;top:.55em}");
	if (o.bullets === 'dot') css.push("li::before{content:'';width:1.5mm;height:1.5mm;border-radius:50%;background:var(--accent,currentColor);opacity:.6;top:.55em}");
	if (o.margins === 'narrow') css.push('.page{padding:11mm 12mm}');
	if (o.margins === 'wide') css.push('.page{padding:22mm 24mm}');
	return css.join('');
}
