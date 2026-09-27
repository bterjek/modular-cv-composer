<script lang="ts">
	// Edit the alternative wordings of one entry or item.
	import { enhance } from '$app/forms';
	import { keep } from '$lib/ui/enhance';
	import { VARIANT_LENGTHS } from '$lib/domain/modules';
	import type { VariantIn } from '$lib/domain/content';

	let { variants, entryId = null, itemId = null, idPrefix, compact = false }: {
		variants: VariantIn[]; entryId?: string | null; itemId?: string | null; idPrefix: string; compact?: boolean;
	} = $props();
	let adding = $state(false);
</script>

{#each variants as v, i (v.id)}
	<form method="POST" action="?/saveWording" use:enhance={keep} class="wording" class:default={v.isDefault}>
		<input type="hidden" name="id" value={v.id} />
		<label for="{idPrefix}-t{i}" class="sr">Wording {i + 1}</label>
		<textarea id="{idPrefix}-t{i}" name="text" rows={compact ? 2 : 3} required>{v.text}</textarea>
		<div class="row tools">
			<div><label for="{idPrefix}-l{i}">Length</label>
				<select id="{idPrefix}-l{i}" name="length">{#each VARIANT_LENGTHS as l}<option selected={l === v.length}>{l}</option>{/each}</select></div>
			<div class="grow"><label for="{idPrefix}-g{i}">Wording tags <span class="hint">(pick this wording)</span></label><input id="{idPrefix}-g{i}" name="tags" value={v.tags.join(', ')} placeholder="e.g. governance, audit" /></div>
			<div class="auto">
				{#if v.isDefault}<span class="badge">DEFAULT</span>{:else}
					<button class="small" formaction="?/makeDefault">Make default</button>{/if}
				<button class="small primary">Save</button>
				{#if variants.length > 1 || !itemId}
					<button class="small danger" formaction="?/deleteWording" aria-label="Delete wording {i + 1}">Del</button>
				{/if}
			</div>
		</div>
	</form>
{/each}

{#if adding}
	<form method="POST" action="?/addWording" use:enhance={() => async ({ update }) => { await update(); adding = false; }} class="wording new">
		{#if entryId}<input type="hidden" name="entryId" value={entryId} />{/if}
		{#if itemId}<input type="hidden" name="itemId" value={itemId} />{/if}
		<label for="{idPrefix}-new">New wording</label>
		<!-- svelte-ignore a11y_autofocus -->
		<textarea id="{idPrefix}-new" name="text" rows="2" required autofocus></textarea>
		<div class="row tools">
			<div><label for="{idPrefix}-newl">Length</label>
				<select id="{idPrefix}-newl" name="length">{#each VARIANT_LENGTHS as l}<option selected={l === 'standard'}>{l}</option>{/each}</select></div>
			<div class="grow"><label for="{idPrefix}-newg">Wording tags</label><input id="{idPrefix}-newg" name="tags" /></div>
			<div class="auto">
				<label class="check"><input type="checkbox" name="isDefault" checked={variants.length === 0} /> default</label>
				<button class="small primary">Add</button>
				<button type="button" class="small" onclick={() => (adding = false)}>Cancel</button>
			</div>
		</div>
	</form>
{:else}
	<button type="button" class="small" onclick={() => (adding = true)}>+ Another wording</button>
{/if}

<style>
	.wording { border-left: 2px solid var(--dim); padding: 0.25rem 0 0.25rem 1.5ch; margin: 0.5rem 0; }
	.wording.default { border-left-color: var(--accent); }
	.wording.new { border-left-color: var(--ok); }
	.tools { align-items: end; gap: 1.5ch; }
	.tools label { margin-top: 0.25rem; }
	.grow { flex: 3 1 20ch; }
	.auto { display: flex; gap: 1ch; align-items: center; flex-wrap: wrap; }
	.auto button { margin: 0; }
	.badge { color: var(--accent); border: 1px solid var(--accent); padding: 0 0.5ch; }
	.check { display: inline-flex; gap: 0.5ch; margin: 0; color: var(--fg); }
	.sr { position: absolute; left: -9999px; }
</style>
