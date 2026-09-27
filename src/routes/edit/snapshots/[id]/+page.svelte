<script lang="ts">
	import { enhance } from '$app/forms';
	import Status from '$lib/ui/Status.svelte';
	let { data, form } = $props();
	const s = $derived(data.snapshot);
	const fmt = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
	const now = Date.now();
	const state = (l: { revokedAt: number | null; expiresAt: number | null }) =>
		l.revokedAt ? 'withdrawn' : l.expiresAt && l.expiresAt <= now ? 'expired' : 'active';
</script>

<svelte:head><title>{s.label} · Snapshot</title></svelte:head>

<Status {form} />

<p class="crumbs"><a href="/edit/snapshots">← Snapshots</a>{#if s.jobTargetId} · <a href="/edit/jobs/{s.jobTargetId}">Job</a>{/if}</p>

<section class="window">
	<h1>{s.label}</h1>
	<p class="hint">Frozen {fmt(s.createdAt)} · design {s.designKey} · engine {s.engineVersion}. This is exactly what was generated then.</p>
	<p class="row">
		<a class="btn" data-sveltekit-reload href="/cv/snapshot/{s.id}?format=html">Download HTML</a>
		{#if data.pdfEnabled}<a class="btn primary" data-sveltekit-reload href="/cv/snapshot/{s.id}?format=pdf">Download PDF</a>{/if}
	</p>
	<iframe sandbox="" title="Snapshot" src="/cv/snapshot/{s.id}?format=preview"></iframe>
</section>

<section class="window">
	<h2>Share links</h2>
	{#if !data.sharing}
		<p class="hint">Share links are behind the <code>snapshots.share-links</code> feature flag while testing.</p>
	{:else}
		<p class="hint">Anyone with the link can view this snapshot — no login. Links are not indexed by search engines and can be withdrawn at any time.
			Views are counted (only the number, nothing about the visitor); chat apps that preview links also count as a view.</p>
		{#if form && 'url' in form && form.url}
			<code class="code">{form.url}</code>
		{/if}
		<form method="POST" action="?/share" use:enhance class="row">
			<div><label for="days">Valid for</label>
				<select id="days" name="days"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option><option value="">until withdrawn</option></select></div>
			<div class="auto"><button class="primary">Create link</button></div>
		</form>
		{#if data.links.length}
			<table>
				<thead><tr><th>Created</th><th>Expires</th><th>Views</th><th>Last view</th><th>Status</th><th></th></tr></thead>
				<tbody>
					{#each data.links as l (l.id)}
						<tr>
							<td>{fmt(l.createdAt)}</td><td>{l.expiresAt ? fmt(l.expiresAt) : 'never'}</td><td>{l.viewCount}</td><td>{fmt(l.lastViewedAt)}</td><td>{state(l)}</td>
							<td>{#if state(l) === 'active'}<form method="POST" action="?/revoke" use:enhance><input type="hidden" name="id" value={l.id} /><button class="small danger">Withdraw</button></form>{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}
</section>

<section class="window">
	<h2>Delete</h2>
	<details>
		<summary>Delete this snapshot…</summary>
		<form method="POST" action="?/delete" use:enhance><p>Its share links stop working too.</p><button class="danger">Delete snapshot</button></form>
	</details>
</section>

<style>
	.crumbs { margin: 0 0 1rem; }
	iframe { width: 100%; height: 1180px; border: 0; background: #e9ecf0; display: block; margin-top: 0.5rem; }
	.btn { display: inline-block; text-decoration: none; flex: 0 0 auto; }
	.btn.primary { background: var(--hi-bg); }
	summary { cursor: pointer; color: var(--error); }
</style>
