<script lang="ts">
	import type { Module } from '$lib/domain/modules';
	import { MODULE_FIELDS } from './fields';
	let { module, data = {}, idPrefix = 'f', namePrefix = '', onChange }: { module: Module; data?: Record<string, unknown>; idPrefix?: string; namePrefix?: string; onChange?: (name: string, value: string | null) => void } = $props();
	const val = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
</script>

<div class="row">
	{#each MODULE_FIELDS[module] as f}
		<div>
			<label for="{idPrefix}-{f.name}">{f.label}{'required' in f && f.required ? ' *' : ''}</label>
			{#if f.kind === 'select'}
				<select id="{idPrefix}-{f.name}" name={namePrefix + f.name} required={f.required} onchange={event => onChange?.(f.name, event.currentTarget.value)}>
					<option value="" selected={!val(f.name)}>— choose —</option>
					{#each f.options as o}<option selected={val(f.name) === o}>{o}</option>{/each}
				</select>
			{:else if f.kind === 'month'}
				<input id="{idPrefix}-{f.name}" name={namePrefix + f.name} type="month" value={val(f.name)} required={f.required} oninput={event => onChange?.(f.name, event.currentTarget.value)} placeholder="YYYY-MM" />
			{:else if f.kind === 'end'}
				<input id="{idPrefix}-{f.name}" name={namePrefix + f.name} type="month" value={val(f.name)} oninput={event => onChange?.(f.name, event.currentTarget.value)} placeholder="YYYY-MM" />
				<label class="check"><input type="checkbox" name="{namePrefix}{f.name}_present" checked={data[f.name] === null} onchange={event => onChange?.(f.name, event.currentTarget.checked ? null : '')} /> present</label>
			{:else}
				<input id="{idPrefix}-{f.name}" name={namePrefix + f.name} type={f.kind === 'url' ? 'url' : 'text'} value={val(f.name)} required={f.required} oninput={event => onChange?.(f.name, event.currentTarget.value)}
					placeholder={f.kind === 'url' ? 'https://' : ''} />
				{#if 'hint' in f && f.hint}<span class="hint">{f.hint}</span>{/if}
			{/if}
		</div>
	{/each}
</div>

<style>
	.check { display: inline-flex; gap: 1ch; align-items: center; margin: 0.25rem 0 0; color: var(--fg); }
</style>
