// Job-ad terms per job, the gap log across all ads, and suggestions — all owner-scoped.
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { termStatus } from '../db/schema';
import { extractTerms, contentSources, coverage, termKey, type Source, type Term } from '$lib/domain/terms';
import { overrides as overridesSchema } from '$lib/domain/recipe';
import { loadContent } from './content';
import { getJobTarget, listJobTargets, resolveJobTarget, updateJobTarget } from './assembly';

const ignoredKeys = (ownerId: string) =>
	new Set(db.select({ k: termStatus.termKey }).from(termStatus).where(eq(termStatus.ownerId, ownerId)).all().map((r) => r.k));

export function setTermIgnored(ownerId: string, key: string, ignored: boolean) {
	const k = termKey(key).slice(0, 80);
	if (ignored) db.insert(termStatus).values({ ownerId, termKey: k, status: 'ignored', createdAt: Date.now() }).onConflictDoNothing().run();
	else db.delete(termStatus).where(and(eq(termStatus.ownerId, ownerId), eq(termStatus.termKey, k))).run();
}

type Where = { entryId: string; itemId: string | null; variantId: string | null; module: string; text: string; inCv: boolean };
export type JobTermRow = Term & { status: 'ignored' | 'in-cv' | 'available' | 'gap'; where: Where[] };

/** Terms of one job's ad, with where your content covers them and whether that part is in the CV now. */
export function jobTerms(ownerId: string, jobId: string) {
	const job = getJobTarget(ownerId, jobId);
	const terms = extractTerms(job.jobAdText ?? '', { exclude: [job.company] });
	if (!terms.length) return { terms: [] as JobTermRow[], suggestion: null };
	const cv = resolveJobTarget(ownerId, jobId);
	const inCvEntries = new Set(cv.sections.flatMap((s) => s.entries.map((e) => e.id)));
	const inCvItems = new Set(cv.sections.flatMap((s) => s.entries.flatMap((e) => e.items.map((i) => i.id))));
	const chosen = new Set(cv.trace.filter((t) => t.kind === 'variant' && t.outcome === 'chosen').map((t) => t.id));
	const inCv = (s: Source) =>
		s.itemId ? inCvItems.has(s.itemId) && (!s.variantId || chosen.has(s.variantId)) : inCvEntries.has(s.entryId) && (!s.variantId || chosen.has(s.variantId));
	const cov = coverage(terms, contentSources(loadContent(ownerId)));
	const ignored = ignoredKeys(ownerId);
	const rows: JobTermRow[] = terms.map((t) => {
		const where: Where[] = (cov.get(t.key) ?? []).map((s) => ({ ...s, inCv: inCv(s) }));
		const status: JobTermRow['status'] = ignored.has(t.key) ? 'ignored' : where.some((w) => w.inCv) ? 'in-cv' : where.length ? 'available' : 'gap';
		return { ...t, status, where };
	});
	return { terms: rows, suggestion: suggest(rows, overridesSchema.parse(job.overrides)) };
}

/**
 * Suggestion: bring in bullets that cover a term the CV is missing, and pin the wording that
 * mentions the most ad terms where the automatic choice mentions fewer.
 */
function suggest(rows: JobTermRow[], current: ReturnType<typeof overridesSchema.parse>) {
	const includeItems = new Set<string>();
	const hits = new Map<string, { target: string; count: number; inCv: boolean }>(); // variantId → info
	for (const r of rows) {
		if (r.status === 'ignored') continue;
		for (const w of r.where) {
			if (r.status === 'available' && w.itemId && !current.excludeItems?.includes(w.itemId) && !w.inCv) includeItems.add(w.itemId);
			if (w.variantId) {
				const h = hits.get(w.variantId) ?? { target: w.itemId ?? w.entryId, count: 0, inCv: w.inCv };
				h.count++;
				hits.set(w.variantId, h);
			}
		}
	}
	const pins: Record<string, string> = {};
	const byTarget = new Map<string, { variantId: string; count: number; inCv: boolean }[]>();
	for (const [variantId, h] of hits) byTarget.set(h.target, [...(byTarget.get(h.target) ?? []), { variantId, ...h }]);
	for (const [target, vs] of byTarget) {
		const best = vs.sort((a, b) => b.count - a.count)[0];
		const shown = vs.find((v) => v.inCv);
		if (!best.inCv && (!shown || best.count > shown.count) && current.pinVariants?.[target] !== best.variantId) pins[target] = best.variantId;
	}
	const items = [...includeItems].filter((id) => !current.includeItems?.includes(id));
	return items.length || Object.keys(pins).length ? { includeItems: items, pinVariants: pins } : null;
}

export function applyTermSuggestion(ownerId: string, jobId: string) {
	const { suggestion } = jobTerms(ownerId, jobId);
	if (!suggestion) return 0;
	const o = overridesSchema.parse(getJobTarget(ownerId, jobId).overrides);
	updateJobTarget(ownerId, jobId, {
		overrides: {
			...o,
			includeItems: [...new Set([...(o.includeItems ?? []), ...suggestion.includeItems])],
			excludeItems: (o.excludeItems ?? []).filter((id) => !suggestion.includeItems.includes(id)),
			pinVariants: { ...(o.pinVariants ?? {}), ...suggestion.pinVariants }
		}
	});
	return suggestion.includeItems.length + Object.keys(suggestion.pinVariants).length;
}

/** All terms across all your job ads: how often asked for, and whether you have content for them. */
export function gapLog(ownerId: string) {
	const jobs = listJobTargets(ownerId).filter((j) => j.jobAdText?.trim());
	const sources = contentSources(loadContent(ownerId));
	const ignored = ignoredKeys(ownerId);
	const agg = new Map<string, { term: Term; jobs: { id: string; name: string }[] }>();
	for (const j of jobs) {
		for (const t of extractTerms(j.jobAdText!, { exclude: [j.company] })) {
			const a = agg.get(t.key) ?? { term: t, jobs: [] };
			a.jobs.push({ id: j.id, name: `${j.company} — ${j.roleTitle}` });
			agg.set(t.key, a);
		}
	}
	const cov = coverage([...agg.values()].map((a) => a.term), sources);
	const rows = [...agg.values()].map((a) => {
		const where = cov.get(a.term.key) ?? [];
		return {
			key: a.term.key,
			label: a.term.label,
			ads: a.jobs.length,
			jobs: a.jobs,
			covered: where.length,
			coveredBy: where.slice(0, 5).map((w) => ({ entryId: w.entryId, itemId: w.itemId, text: w.text })),
			status: ignored.has(a.term.key) ? 'ignored' : where.length ? 'covered' : 'gap'
		};
	});
	rows.sort((a, b) => Number(a.status === 'ignored') - Number(b.status === 'ignored') || Number(b.status === 'gap') - Number(a.status === 'gap') || b.ads - a.ads || a.label.localeCompare(b.label));
	return { totalAds: jobs.length, rows };
}
