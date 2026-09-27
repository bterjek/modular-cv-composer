import type { ResolvedCV } from '$lib/domain/content';
import type { SafeHtml } from '../html';

export type FontFamily = 'inter' | 'source-serif';

export type Design = {
	key: string;
	name: string;
	/** One line for the design picker. */
	description: string;
	/** Web fonts the CSS uses; the server embeds or links exactly these. */
	fonts: FontFamily[];
	/** Author-controlled CSS; never contains user input. */
	css: string;
	render: (cv: ResolvedCV) => SafeHtml;
};
