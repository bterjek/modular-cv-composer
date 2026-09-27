<script lang="ts">
	import { enhance } from '$app/forms';
	import Status from '$lib/ui/Status.svelte';
	import { arrowNav } from '$lib/ui/arrowNav';
	let { data, form } = $props();
</script>

<svelte:head><title>Job categories · Editor</title></svelte:head>

<Status {form} />

<section class="window">
	<h1>Job categories</h1>
	<p class="hint">A category is a recipe: which sections, in what order, which tags to include or prefer, and how long the wordings should be.</p>
	{#if data.list.length}
		<ul class="list" use:arrowNav>
			{#each data.list as c (c.id)}
				<li><a data-nav href="/edit/categories/{c.id}"><b>{c.name}</b>
					<span class="muted"> · {c.sections} sections · {c.jobs} job{c.jobs === 1 ? '' : 's'}</span>
					{#if c.description}<br /><span class="muted">{c.description}</span>{/if}</a></li>
			{/each}
		</ul>
	{:else}<p class="muted">No categories yet.</p>{/if}
</section>

<section class="window">
	<h2>New category</h2>
	<form method="POST" action="?/create" use:enhance data-primary>
		<label for="c-name">Name *</label><input id="c-name" name="name" required placeholder="e.g. IT governance roles" />
		<label for="c-desc">Description</label><input id="c-desc" name="description" />
		<p class="hint">Starts with the usual sections and no filters; you tune it on the next screen.</p>
		<button class="primary">Create <span class="hint">(F2)</span></button>
	</form>
</section>

<style>
	.list { list-style: none; padding: 0; margin: 0; }
	.list li { padding: 0.3rem 0; border-bottom: 1px dotted var(--dim); }
	.list a { color: var(--fg); text-decoration: none; display: block; }
	.list a:focus-visible, .list a:hover { background: var(--hi-bg); color: var(--hi-fg); outline: none; }
</style>
