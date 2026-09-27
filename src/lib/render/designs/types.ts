import type { ResolvedCV } from '$lib/domain/content';
import type { SafeHtml } from '../html';

export type Design = {
	key: string;
	name: string;
	/** Author-controlled CSS; never contains user input. */
	css: string;
	render: (cv: ResolvedCV) => SafeHtml;
};
