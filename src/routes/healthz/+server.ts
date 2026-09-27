import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/db';

export function GET() {
	const ok = sqlite.prepare('select 1 as ok').get() as { ok: number };
	return json({ status: ok.ok === 1 ? 'ok' : 'degraded' });
}
