// GET /account/export — all of the user's data as one JSON file (GDPR Art. 15 and 20).
import * as repo from '$lib/server/repo';
import { asciiFileName } from '$lib/render/filename';

export function GET({ locals }) {
	const data = repo.exportAccount(locals.user!.id);
	const date = new Date().toISOString().slice(0, 10);
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="${asciiFileName(`cv-composer-export-${date}.json`)}"`,
			'Cache-Control': 'private, no-store'
		}
	});
}
