<script lang="ts">
	import { enhance } from '$app/forms';
	import { keep } from '$lib/ui/enhance';
	import Status from '$lib/ui/Status.svelte';
	import EntryFields from '$lib/editor/EntryFields.svelte';
	import Wordings from '$lib/editor/Wordings.svelte';
	import { MODULE_LABELS, MODULE_FIELDS, ENTRY_WORDINGS, HAS_ITEMS } from '$lib/editor/fields';
	let { data, form } = $props();
	const e = $derived(data.entry);
	const itemWord = $derived(e.module === 'skills' ? 'skill' : 'bullet');
</script>

<svelte:head><title>{e.label} · Editor</title></svelte:head>

<Status {form} />

<p class="crumbs"><a href="/edit/content/{e.module}">← {MODULE_LABELS[e.module]}</a>{#if e.archived} · <b>ARCHIVED</b>{/if}</p>

<section class="window">
	<h1>{e.label}</h1>
	<form method="POST" action="?/saveFields" use:enhance={keep} data-primary>
		{#if MODULE_FIELDS[e.module].length}<EntryFields module={e.module} data={e.data} idPrefix="ef" />{/if}
		<div class="row">
			<div><label for="ef-label">Internal name <span class="hint">(only you see it)</span></label><input id="ef-label" name="label" value={e.label} /></div>
			<div><label for="ef-tags">Tags <span class="hint">(comma separated)</span></label><input id="ef-tags" name="tags" value={e.tags.join(', ')} /></div>
		</div>
		{#if data.knownTags.length}<p class="hint">Your tags: {data.knownTags.join(', ')}</p>{/if}
		<button class="primary">Save <span class="hint">(F2)</span></button>
	</form>
</section>

{#if ENTRY_WORDINGS[e.module] !== 'none'}
	<section class="window">
		<h2>{e.module === 'headline' || e.module === 'summary' ? 'Wordings' : 'Description wordings'}</h2>
		<p class="hint">Categories pick the wording whose tags match best, then the preferred length, then the default.</p>
		<Wordings variants={e.variants} entryId={e.id} idPrefix="ew" />
	</section>
{/if}

{#if HAS_ITEMS[e.module]}
	<section class="window">
		<h2>{e.module === 'skills' ? 'Skills' : 'Bullets'}</h2>
		{#each e.items as item, i (item.id)}
			<div class="item" class:archived={item.archived}>
				<div class="item-head">
					<b>{i + 1}.</b>
					<form method="POST" action="?/itemTags" use:enhance={keep} class="row tagform">
						<input type="hidden" name="itemId" value={item.id} />
						<div><label for="it-{i}">{itemWord === 'skill' ? 'Skill' : 'Bullet'} {i + 1} tags <span class="hint">(use it or not)</span></label><input id="it-{i}" name="tags" value={item.tags.join(', ')} /></div>
						<div class="auto"><button class="small">Save tags</button></div>
					</form>
					<form method="POST" use:enhance class="item-tools">
						<input type="hidden" name="itemId" value={item.id} />
						<button class="small" formaction="?/moveItem" name="dir" value="up" disabled={i === 0} aria-label="Move {itemWord} {i + 1} up">↑</button>
						<button class="small" formaction="?/moveItem" name="dir" value="down" disabled={i === e.items.length - 1} aria-label="Move {itemWord} {i + 1} down">↓</button>
						<button class="small" formaction="?/archiveItem" name="archived" value={item.archived ? 'false' : 'true'}>{item.archived ? 'Restore' : 'Archive'}</button>
						<button class="small danger" formaction="?/deleteItem" aria-label="Delete {itemWord} {i + 1}">Del</button>
					</form>
				</div>
				<Wordings variants={item.variants} itemId={item.id} idPrefix="iw{i}" compact />
			</div>
		{/each}

		<form method="POST" action="?/addItem" use:enhance class="add-item">
			<label for="new-item">New {itemWord}</label>
			<textarea id="new-item" name="text" rows="2" required></textarea>
			<div class="row">
				<div><label for="new-item-tags">{itemWord === 'skill' ? 'Skill' : 'Bullet'} tags <span class="hint">(use it or not)</span></label><input id="new-item-tags" name="tags" /></div>
				<div class="auto"><button class="primary">Add {itemWord}</button></div>
			</div>
		</form>
	</section>
{/if}

<section class="window">
	<h2>Keep or remove</h2>
	<form method="POST" action="?/archiveEntry" use:enhance class="inline">
		<button name="archived" value={e.archived ? 'false' : 'true'}>{e.archived ? 'Restore' : 'Archive'}</button>
		<span class="hint">Archived content stays here but is never used on a CV.</span>
	</form>
	<details>
		<summary>Delete permanently…</summary>
		<form method="POST" action="?/deleteEntry" use:enhance>
			<p>This deletes “{e.label}” with all its wordings{HAS_ITEMS[e.module] ? ' and items' : ''}. Saved snapshots are not affected.</p>
			<button class="danger">Delete for good</button>
		</form>
	</details>
</section>


<style>
	.crumbs { margin: 0 0 1rem; }
	.item { border-top: 1px dotted var(--dim); padding: 0.5rem 0; }
	.item.archived { opacity: 0.55; }
	.item-head { display: flex; gap: 1.5ch; align-items: end; flex-wrap: wrap; }
	.tagform { flex: 1; margin: 0; }
	.item-tools { display: flex; gap: 0.5ch; }
	.item-tools button { margin: 0; }
	.add-item { border-top: 1px solid var(--dim); margin-top: 0.5rem; }
	.inline { display: flex; gap: 2ch; align-items: center; }
	details { margin-top: 0.75rem; }
	summary { cursor: pointer; color: var(--error); }
	button:disabled { opacity: 0.35; cursor: default; }
</style>
