<script lang="ts">
	import { enhance } from '$app/forms';
	import Status from '$lib/ui/Status.svelte';
	import { arrowNav } from '$lib/ui/arrowNav';
	let { data, form } = $props();
</script>

<svelte:head><title>Jobs · Editor</title></svelte:head>

<Status {form} />

<section class="window">
	<h1>Jobs</h1>
	<p class="hint">One entry per application. A job starts from a category and adds changes just for this job.</p>
	{#if data.list.length}
		<ul class="list" use:arrowNav>
			{#each data.list as j (j.id)}
				<li><a data-nav href="/edit/jobs/{j.id}"><b>{j.company}</b> — {j.roleTitle}
					<span class="muted"> · {j.category} · {j.status}</span></a></li>
			{/each}
		</ul>
	{:else}<p class="muted">No jobs yet.</p>{/if}
</section>

<section class="window">
	<h2>New job</h2>
	{#if data.categories.length}
		<form method="POST" action="?/create" use:enhance data-primary>
			<div class="row">
				<div><label for="j-company">Company *</label><input id="j-company" name="company" required /></div>
				<div><label for="j-role">Role *</label><input id="j-role" name="roleTitle" required /></div>
			</div>
			<label for="j-cat">Start from category *</label>
			<select id="j-cat" name="categoryId" required>{#each data.categories as c}<option value={c.id}>{c.name}</option>{/each}</select>
			<button class="primary">Create <span class="hint">(F2)</span></button>
		</form>
	{:else}
		<p>Create a <a href="/edit/categories">job category</a> first.</p>
	{/if}
</section>

<style>
	.list { list-style: none; padding: 0; margin: 0; }
	.list li { padding: 0.3rem 0; border-bottom: 1px dotted var(--dim); }
	.list a { color: var(--fg); text-decoration: none; display: block; }
	.list a:focus-visible, .list a:hover { background: var(--hi-bg); color: var(--hi-fg); outline: none; }
</style>
