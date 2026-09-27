<script lang="ts">
	import { MODULES } from '$lib/domain/modules';
	import { MODULE_LABELS, MODULE_HELP } from '$lib/editor/fields';
	import { arrowNav } from '$lib/ui/arrowNav';
	let { data } = $props();
</script>

<svelte:head><title>Content · Editor</title></svelte:head>

<section class="window">
	<h1>Content</h1>
	<p class="hint">Write each fact once. Pick a section (↑ ↓ and Enter work here too).</p>
	<ul class="list" use:arrowNav>
		{#each MODULES as m}
			<li><a data-nav href="/edit/content/{m}"><b>{MODULE_LABELS[m]}</b> <span class="muted">({data.counts[m]})</span></a>
				<div class="hint">{MODULE_HELP[m]}</div></li>
		{/each}
	</ul>
</section>

<style>
	.list { list-style: none; padding: 0; margin: 0; }
	.list li { margin: 0 0 0.6rem; }
	.list a { color: var(--fg); text-decoration: none; }
	.list a:focus-visible, .list a:hover { background: var(--hi-bg); color: var(--hi-fg); }
</style>
