<script lang="ts">
	import { enhance } from '$app/forms';
	import { MODULE_LABELS, MODULE_HELP, ENTRY_WORDINGS } from '$lib/editor/fields';
	import EntryFields from '$lib/editor/EntryFields.svelte';
	import Status from '$lib/ui/Status.svelte';
	import { arrowNav } from '$lib/ui/arrowNav';
	import { range } from '$lib/render/format';
	import { VARIANT_LENGTHS } from '$lib/domain/modules';
	let { data, form } = $props();
	const m = $derived(data.module);
	const when = (d: Record<string, unknown>) => range(d.start ?? d.issued, d.end);
</script>

<svelte:head><title>{MODULE_LABELS[m]} · Editor</title></svelte:head>

<Status {form} />

<section class="window">
	<h1>{MODULE_LABELS[m]}</h1>
	<p class="hint">{MODULE_HELP[m]}</p>
	{#if data.entries.length}
		<ul class="entries" use:arrowNav>
			{#each data.entries as e, i (e.id)}
				<li class:archived={e.archived}>
					<a data-nav href="/edit/content/entry/{e.id}">
						<b>{e.label}</b>
						{#if when(e.data)}<span class="muted"> · {when(e.data)}</span>{/if}
						{#if e.archived}<span class="muted"> · archived</span>{/if}
						<br /><span class="muted small">
							{#if e.preview}{e.preview.slice(0, 90)}{e.preview.length > 90 ? '…' : ''}{/if}
							{#if e.items}{e.items} item{e.items === 1 ? '' : 's'}{/if}
							{#if e.tags.length} · tags: {e.tags.join(', ')}{/if}
						</span>
					</a>
					<form method="POST" action="?/move" use:enhance class="moves">
						<input type="hidden" name="id" value={e.id} />
						<button class="small" name="dir" value="up" disabled={i === 0} aria-label="Move {e.label} up">↑</button>
						<button class="small" name="dir" value="down" disabled={i === data.entries.length - 1} aria-label="Move {e.label} down">↓</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Nothing here yet.</p>
	{/if}
</section>

<section class="window">
	<h2>Add to {MODULE_LABELS[m]}</h2>
	<form method="POST" action="?/create" use:enhance data-primary>
		<EntryFields module={m} idPrefix="new" />
		{#if ENTRY_WORDINGS[m] !== 'none'}
			<label for="new-text">{ENTRY_WORDINGS[m] === 'required' ? 'First wording *' : 'Description (optional)'}</label>
			<textarea id="new-text" name="text" rows="3" required={ENTRY_WORDINGS[m] === 'required'}></textarea>
			<div class="row">
				<div><label for="new-length">Length</label>
					<select id="new-length" name="length">{#each VARIANT_LENGTHS as l}<option selected={l === 'standard'}>{l}</option>{/each}</select></div>
				<div><label for="new-tags">Tags <span class="hint">(comma separated)</span></label><input id="new-tags" name="tags" /></div>
			</div>
		{:else}
			<label for="new-tags">Tags <span class="hint">(comma separated)</span></label><input id="new-tags" name="tags" />
		{/if}
		{#if m === 'headline' || m === 'summary'}
			<label for="new-label">Internal name <span class="hint">(only you see it)</span></label>
			<input id="new-label" name="label" placeholder={MODULE_LABELS[m]} />
		{/if}
		<button class="primary">Add <span class="hint">(F2)</span></button>
	</form>
</section>

<style>
	.entries { list-style: none; margin: 0; padding: 0; }
	.entries li { display: flex; justify-content: space-between; gap: 1ch; padding: 0.3rem 0; border-bottom: 1px dotted var(--dim); }
	.entries a { color: var(--fg); text-decoration: none; flex: 1; }
	.entries a:focus-visible, .entries a:hover { background: var(--hi-bg); color: var(--hi-fg); outline: none; }
	.entries a:focus-visible .muted, .entries a:hover .muted { color: var(--hi-fg); }
	.archived { opacity: 0.6; }
	.small { font-size: 0.9em; }
	.moves { display: flex; gap: 0.5ch; align-items: start; }
	.moves button { padding: 0 0.8ch; }
	button:disabled { opacity: 0.35; cursor: default; }
</style>
