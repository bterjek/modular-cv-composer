<script lang="ts">
	import type { Module } from '$lib/domain/modules';
	import { MODULE_FIELDS } from './fields';
	let { module, data = {}, idPrefix = 'f' }: { module: Module; data?: Record<string, unknown>; idPrefix?: string } = $props();
	const val = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
</script>

<div class="row">
	{#each MODULE_FIELDS[module] as f}
		<div>
			<label for="{idPrefix}-{f.name}">{f.label}{'required' in f && f.required ? ' *' : ''}</label>
			{#if f.kind === 'select'}
				<select id="{idPrefix}-{f.name}" name={f.name} required={f.required}>
					{#if !f.required}<option value="">—</option>{/if}
					{#each f.options as o}<option selected={val(f.name) === o}>{o}</option>{/each}
				</select>
			{:else if f.kind === 'month'}
				<input id="{idPrefix}-{f.name}" name={f.name} type="month" value={val(f.name)} required={f.required} placeholder="YYYY-MM" />
			{:else if f.kind === 'end'}
				<input id="{idPrefix}-{f.name}" name={f.name} type="month" value={val(f.name)} placeholder="YYYY-MM" />
				<label class="check"><input type="checkbox" name="{f.name}_present" checked={data[f.name] === null} /> present</label>
			{:else}
				<input id="{idPrefix}-{f.name}" name={f.name} type={f.kind === 'url' ? 'url' : 'text'} value={val(f.name)} required={f.required}
					placeholder={f.kind === 'url' ? 'https://' : ''} />
				{#if 'hint' in f && f.hint}<span class="hint">{f.hint}</span>{/if}
			{/if}
		</div>
	{/each}
</div>

<style>
	.check { display: inline-flex; gap: 1ch; align-items: center; margin: 0.25rem 0 0; color: var(--fg); }
</style>
