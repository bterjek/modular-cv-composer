import * as repo from '$lib/server/repo';

export function load({ locals }) {
	const ownerId = locals.user!.id;
	const jobs = new Map(repo.listJobTargets(ownerId).map((j) => [j.id, `${j.company} — ${j.roleTitle}`]));
	return {
		list: repo.listSnapshots(ownerId).map((s) => ({
			id: s.id,
			label: s.label,
			createdAt: s.createdAt,
			job: s.jobTargetId ? (jobs.get(s.jobTargetId) ?? null) : null
		}))
	};
}
