<script lang="ts">
	import { enhance } from '$app/forms';
	import Status from '$lib/ui/Status.svelte';
	import TermStatus from '$lib/editor/TermStatus.svelte';
	let { data, form } = $props();
	let show = $state<'all' | 'gap' | 'covered' | 'ignored'>('gap');
	const rows = $derived(show === 'all' ? data.log.rows : data.log.rows.filter((r) => r.status === show));
	const count = (s: string) => data.log.rows.filter((r) => r.status === s).length;
</script>

<svelte:head><title>Terms &amp; gaps · Editor</title></svelte:head>

<Status {form} />

<section class="window">
	<h1>Terms &amp; gaps</h1>
	{#if !data.log.totalAds}
		<p>No job ads yet. Paste the ad text into a job (Jobs → a job → “Job ad text”) and its terms show up here.</p>
	{:else}
		<p class="hint">Every term from your {data.log.totalAds} job ad{data.log.totalAds === 1 ? '' : 's'}, ranked by how many ads ask for it.
			Gaps at the top are where a new bullet (or a new skill) pays off most.</p>
		<p class="filter">Show:
			{#each [['gap', `gaps (${count('gap')})`], ['covered', `covered (${count('covered')})`], ['ignored', `N/A (${count('ignored')})`], ['all', 'all']] as [k, l]}
				<button class="small" class:on={show === k} onclick={() => (show = k as typeof show)}>{l}</button>
			{/each}</p>
		<div class="scroll"><table>
			<thead><tr><th>Term</th><th>Ads</th><th>Status</th><th>Covered by / action</th><th></th></tr></thead>
			<tbody>
				{#each rows as r (r.key)}
					<tr>
						<td>{r.label}</td>
						<td title={r.jobs.map((j) => j.name).join('\n')}>{r.ads} of {data.log.totalAds}</td>
						<td><TermStatus status={r.status} /></td>
						<td class="small">
							{#if r.status === 'covered'}
								{#each r.coveredBy.slice(0, 2) as w}<div><a href="/edit/content/entry/{w.entryId}{w.itemId ? `#item-${w.itemId}` : '#top'}">{w.text.slice(0, 70)}{w.text.length > 70 ? '…' : ''}</a></div>{/each}
								{#if r.covered > 2}<span class="muted">+{r.covered - 2} more</span>{/if}
							{:else if r.status === 'gap' && data.writeTarget}
								<a href="/edit/content/entry/{data.writeTarget}?add={encodeURIComponent(r.label)}#add-item">write a bullet →</a>
							{/if}
						</td>
						<td><form method="POST" action="?/ignoreTerm" use:enhance>
							<input type="hidden" name="key" value={r.key} /><input type="hidden" name="ignored" value={r.status === 'ignored' ? 'false' : 'true'} />
							<button class="small">{r.status === 'ignored' ? 'Undo N/A' : 'N/A'}</button></form></td>
					</tr>
				{:else}<tr><td colspan="5" class="muted">Nothing in this view.</td></tr>{/each}
			</tbody>
		</table></div>
	{/if}
</section>

<style>
	.filter button { margin-right: 1ch; }
	.filter button.on { background: var(--hi-bg); }
	td.small { font-size: 0.9em; }
</style>
