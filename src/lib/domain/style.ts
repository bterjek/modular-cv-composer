// Style options per category. Every option is a choice from a fixed list (never free CSS),
// so any combination stays printable and readable by applicant tracking systems.
// Unset = the design's own default.
import { z } from 'zod';

export const ACCENTS = {
	navy: '#1f4e79', blue: '#1f5f8b', teal: '#0f766e', green: '#2f6b3a',
	burgundy: '#7a1f3d', purple: '#5b3a8c', orange: '#b45309', graphite: '#374151', black: '#111111'
} as const;

export const STYLE_CHOICES = {
	accent: Object.keys(ACCENTS) as (keyof typeof ACCENTS)[],
	font: ['inter', 'source-serif'] as const,
	size: ['small', 'normal', 'large'] as const,
	density: ['compact', 'normal', 'airy'] as const,
	align: ['left', 'justify'] as const,
	rules: ['on', 'off'] as const,
	dates: ['right', 'below'] as const,
	bullets: ['dot', 'dash', 'square'] as const,
	margins: ['narrow', 'normal', 'wide'] as const
};

export const STYLE_LABELS: Record<keyof typeof STYLE_CHOICES, string> = {
	accent: 'Accent colour', font: 'Font', size: 'Text size', density: 'Spacing', align: 'Text alignment',
	rules: 'Section lines', dates: 'Dates', bullets: 'Bullets', margins: 'Page margins'
};

export const styleOptions = z
	.object({
		accent: z.enum(STYLE_CHOICES.accent as [string, ...string[]]),
		font: z.enum(STYLE_CHOICES.font),
		size: z.enum(STYLE_CHOICES.size),
		density: z.enum(STYLE_CHOICES.density),
		align: z.enum(STYLE_CHOICES.align),
		rules: z.enum(STYLE_CHOICES.rules),
		dates: z.enum(STYLE_CHOICES.dates),
		bullets: z.enum(STYLE_CHOICES.bullets),
		margins: z.enum(STYLE_CHOICES.margins)
	})
	.partial();
export type StyleOptions = z.infer<typeof styleOptions>;
