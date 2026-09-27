<script lang="ts">
	import { arrowNav } from '$lib/ui/arrowNav';
	let { data } = $props();
	const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
</script>

<svelte:head><title>Snapshots · Editor</title></svelte:head>

<section class="window">
	<h1>Snapshots</h1>
	<p class="hint">A snapshot is a CV frozen exactly as it was — what you sent. Later edits never change it.
		Freeze one from a job’s page (“Freeze this version”).</p>
	{#if data.list.length}
		<ul class="list" use:arrowNav>
			{#each data.list as s (s.id)}
				<li><a data-nav href="/edit/snapshots/{s.id}"><b>{s.label}</b><span class="muted"> · {fmt(s.createdAt)}{s.job ? '' : ' · job deleted or none'}</span></a></li>
			{/each}
		</ul>
	{:else}<p class="muted">No snapshots yet.</p>{/if}
</section>

<style>
	.list { list-style: none; padding: 0; margin: 0; }
	.list li { padding: 0.3rem 0; border-bottom: 1px dotted var(--dim); }
	.list a { color: var(--fg); text-decoration: none; display: block; }
	.list a:focus-visible, .list a:hover { background: var(--hi-bg); color: var(--hi-fg); outline: none; }
</style>
