import type { SubmitFunction } from '@sveltejs/kit';

/** For edit forms: keep what is in the fields after saving (the reloaded data matches it). */
export const keep: SubmitFunction = () => async ({ update }) => update({ reset: false });
