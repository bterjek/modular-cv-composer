<script lang="ts">
	import { enhance } from '$app/forms';
	import { keep } from '$lib/ui/enhance';
	import Status from '$lib/ui/Status.svelte';
	import { MODULE_LABELS } from '$lib/editor/fields';
	import { VARIANT_LENGTHS } from '$lib/domain/modules';
	import { page } from '$app/state';
	let { data, form } = $props();
	const c = $derived(data.category);
	const previewing = $derived(page.data.preview?.kind === 'category' && page.data.preview?.id === c.id);
</script>

<svelte:head><title>{c.name} · Editor</title></svelte:head>

<Status {form} />

<p class="crumbs"><a href="/edit/categories">← Job categories</a>
	{#if !previewing} · <a data-sveltekit-reload href="/edit/preview?sel=category:{c.id}&back=/edit/categories/{c.id}">Show this category in the preview</a>{/if}</p>

<form method="POST" action="?/save" use:enhance={keep} data-primary>
	<section class="window">
		<h1>{c.name}</h1>
		<div class="row">
			<div><label for="name">Name *</label><input id="name" name="name" required value={c.name} /></div>
			<div><label for="design">Design</label>
				<select id="design" name="designKey">{#each data.designs as d}<option value={d.key} selected={d.key === c.designKey}>{d.name}</option>{/each}</select></div>
		</div>
		<label for="description">Description</label><input id="description" name="description" value={c.description ?? ''} />
		<div class="row">
			<div class="grow"><label for="preferTags">Preferred tags <span class="hint">(pick wordings and rank bullets)</span></label>
				<input id="preferTags" name="preferTags" value={data.recipe.preferTags} /></div>
			<div><label for="length">Wording length</label>
				<select id="length" name="length">{#each VARIANT_LENGTHS as l}<option selected={l === data.recipe.length}>{l}</option>{/each}</select></div>
		</div>
		{#if data.knownTags.length}<p class="hint">Your tags: {data.knownTags.join(', ')}</p>{/if}
	</section>

	<section class="window">
		<h2>Sections</h2>
		<p class="hint">Tick the sections to show and number them. Limits and tags are optional: “only tags” keeps entries or bullets carrying one of them; “never tags” drops them.</p>
		<div class="scroll">
			<table>
				<thead><tr><th>Use</th><th>#</th><th>Section</th><th>Title on CV</th><th>Max entries</th><th>Max bullets</th><th>Only tags</th><th>Never tags</th></tr></thead>
				<tbody>
					{#each data.rows as r (r.module)}
						<tr class:off={!r.used}>
							<td><input type="checkbox" name="use_{r.module}" checked={r.used} aria-label="Use {MODULE_LABELS[r.module]}" /></td>
							<td><input class="num" name="order_{r.module}" inputmode="numeric" value={r.order} aria-label="Position of {MODULE_LABELS[r.module]}" /></td>
							<td>{MODULE_LABELS[r.module]}</td>
							<td><input name="title_{r.module}" value={r.title} placeholder="default" aria-label="Title for {MODULE_LABELS[r.module]}" /></td>
							<td><input class="num" name="maxEntries_{r.module}" inputmode="numeric" value={r.maxEntries} aria-label="Max entries in {MODULE_LABELS[r.module]}" /></td>
							<td><input class="num" name="maxItems_{r.module}" inputmode="numeric" value={r.maxItems} aria-label="Max bullets per entry in {MODULE_LABELS[r.module]}" /></td>
							<td><input name="include_{r.module}" value={r.include} aria-label="Only tags for {MODULE_LABELS[r.module]}" /></td>
							<td><input name="exclude_{r.module}" value={r.exclude} aria-label="Never tags for {MODULE_LABELS[r.module]}" /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<button class="primary">Save category <span class="hint">(F2)</span></button>
	</section>
</form>

<section class="window">
	<h2>More</h2>
	<form method="POST" action="?/duplicate" use:enhance class="inline"><button>Duplicate</button><span class="hint">Start a similar category from this one.</span></form>
	<details>
		<summary>Delete…</summary>
		<form method="POST" action="?/delete" use:enhance>
			{#if data.jobs}<p>{data.jobs} job{data.jobs === 1 ? ' uses' : 's use'} this category. Move {data.jobs === 1 ? 'it' : 'them'} to another category first.</p>
			{:else}<p>Deletes the recipe only; your content is not touched.</p><button class="danger">Delete category</button>{/if}
		</form>
	</details>
</section>

<style>
	.crumbs { margin: 0 0 1rem; }
	.grow { flex: 3 1 24ch; }
	td input { padding: 0.1rem 0.5ch; }
	.num { width: 5ch; }
	tr.off td { color: var(--dim); }
	.inline { display: flex; gap: 2ch; align-items: center; }
	summary { cursor: pointer; color: var(--error); margin-top: 0.75rem; }
</style>
