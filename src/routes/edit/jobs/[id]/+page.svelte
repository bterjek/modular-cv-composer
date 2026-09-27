<script lang="ts">
	import { enhance } from '$app/forms';
	import { keep } from '$lib/ui/enhance';
	import Status from '$lib/ui/Status.svelte';
	import { VARIANT_LENGTHS } from '$lib/domain/modules';
	import { page } from '$app/state';
	let { data, form } = $props();
	const j = $derived(data.job);
	const previewing = $derived(page.data.preview?.kind === 'target' && page.data.preview?.id === j.id);
</script>

<svelte:head><title>{j.company} · Editor</title></svelte:head>

<Status {form} />

<p class="crumbs"><a href="/edit/jobs">← Jobs</a>
	{#if !previewing} · <a data-sveltekit-reload href="/edit/preview?sel=target:{j.id}&back=/edit/jobs/{j.id}">Show this job in the preview</a>{/if}
	· <a href="/assemble?target={j.id}">Why is each part in or out?</a></p>

{#if data.warnings.length}
	<section class="window"><h2>Needs attention</h2>
		{#each data.warnings as w}<p class="msg error">{w}</p>{/each}
		<p class="hint">Something this job refers to was deleted or moved. Save the tailoring below to clean it up.</p>
	</section>
{/if}

<section class="window">
	<h1>{j.company} — {j.roleTitle}</h1>
	<form method="POST" action="?/details" use:enhance={keep}>
		<div class="row">
			<div><label for="company">Company *</label><input id="company" name="company" required value={j.company} /></div>
			<div><label for="roleTitle">Role *</label><input id="roleTitle" name="roleTitle" required value={j.roleTitle} /></div>
		</div>
		<div class="row">
			<div><label for="categoryId">Category</label>
				<select id="categoryId" name="categoryId">{#each data.categories as c}<option value={c.id} selected={c.id === j.categoryId}>{c.name}</option>{/each}</select></div>
			<div><label for="status">Status</label>
				<select id="status" name="status">{#each ['draft', 'sent', 'archived'] as s}<option selected={s === j.status}>{s}</option>{/each}</select></div>
		</div>
		<label for="jobUrl">Job ad link</label><input id="jobUrl" name="jobUrl" type="url" placeholder="https://" value={j.jobUrl ?? ''} />
		<label for="jobAdText">Job ad text <span class="hint">(for your reference; later for AI tailoring)</span></label>
		<textarea id="jobAdText" name="jobAdText" rows="4">{j.jobAdText ?? ''}</textarea>
		<button>Save details</button>
	</form>
</section>

<form method="POST" action="?/tailor" use:enhance={keep} data-primary>
	<section class="window">
		<h2>Tailoring for this job</h2>
		<p class="hint">Everything here is optional. Empty means “as the category <b>{data.categoryName}</b> says”.</p>
		<div class="row">
			<div class="grow"><label for="preferTags">Extra preferred tags <span class="hint">(win over the category’s: {data.categoryDefaults.preferTags || 'none'})</span></label>
				<input id="preferTags" name="preferTags" value={data.overrides.preferTags} /></div>
			<div><label for="length">Wording length</label>
				<select id="length" name="length"><option value="">as category ({data.categoryDefaults.length})</option>
					{#each VARIANT_LENGTHS as l}<option selected={l === data.overrides.length}>{l}</option>{/each}</select></div>
		</div>
		<button class="primary">Save tailoring <span class="hint">(F2)</span></button>
	</section>

	{#each data.sections as s (s.module)}
		<section class="window">
			<h2>{s.label}</h2>
			<label class="order">Position for this job <input class="num" name="order_{s.module}" inputmode="numeric" value={s.orderOverride} placeholder="—" aria-label="Position of {s.label} for this job" /></label>
			{#each s.entries as e (e.id)}
				<div class="entry" class:out={e.state.outcome !== 'kept'}>
					<div class="line">
						<span class="state" title={e.state.reason}>{e.state.outcome === 'kept' ? 'IN ' : 'OUT'}</span>
						<b>{e.label}</b>
						<label class="check"><input type="checkbox" name="entry_{e.id}" value="exclude" checked={e.excluded} /> leave out</label>
					</div>
					{#if e.state.outcome !== 'kept'}<div class="why">{e.state.reason}</div>{/if}
					{#if e.variants.length}
						<label class="pin">Wording
							<select name="pin_{e.id}"><option value="">best match (automatic)</option>
								{#each e.variants as v}<option value={v.id} selected={v.id === e.pin}>{v.chosen ? '▶ ' : ''}{v.text}</option>{/each}</select></label>
					{/if}
					{#each e.items as it (it.id)}
						<div class="item" class:out={it.state.outcome !== 'kept'}>
							<span class="state" title={it.state.reason}>{it.state.outcome === 'kept' ? 'IN ' : 'OUT'}</span>
							<select name="item_{it.id}" aria-label="Bullet: {it.text}">
								<option value="auto" selected={it.mode === 'auto'}>auto</option>
								<option value="include" selected={it.mode === 'include'}>always</option>
								<option value="exclude" selected={it.mode === 'exclude'}>never</option>
							</select>
							<span class="txt">{it.text}{#if it.state.outcome !== 'kept'}<span class="why"> — {it.state.reason}</span>{/if}</span>
							{#if it.variants.length}
								<select name="pin_{it.id}" class="itempin" aria-label="Wording for: {it.text}"><option value="">best wording</option>
									{#each it.variants as v}<option value={v.id} selected={v.id === it.pin}>{v.chosen ? '▶ ' : ''}{v.text}</option>{/each}</select>
							{/if}
						</div>
					{/each}
				</div>
			{:else}<p class="muted">No content in this section.</p>{/each}
		</section>
	{/each}
</form>

<section class="window">
	<h2>More</h2>
	<form method="POST" action="?/reset" use:enhance class="inline"><button>Remove all tailoring</button><span class="hint">Back to exactly what the category produces.</span></form>
	<details>
		<summary>Delete job…</summary>
		<form method="POST" action="?/delete" use:enhance><p>Deletes this job and its tailoring. Your content is not touched.</p><button class="danger">Delete job</button></form>
	</details>
</section>

<style>
	.crumbs { margin: 0 0 1rem; }
	.grow { flex: 3 1 24ch; }
	.num { width: 5ch; }
	.order { display: flex; gap: 1ch; align-items: center; margin: 0 0 0.5rem; }
	.entry { border-top: 1px dotted var(--dim); padding: 0.4rem 0; }
	.line { display: flex; gap: 1.5ch; align-items: center; flex-wrap: wrap; }
	.state { background: var(--ok); color: #000; padding: 0 0.5ch; font-weight: bold; }
	.out > .line .state, .item.out .state { background: var(--dim); }
	.out > .line b { color: var(--dim); }
	.why { color: var(--dim); font-size: 0.9em; }
	.check { display: inline-flex; gap: 0.5ch; margin: 0; color: var(--fg); }
	.pin { display: flex; gap: 1ch; align-items: center; margin: 0.3rem 0 0 5ch; color: var(--fg); }
	.pin select { flex: 1; }
	.item { display: grid; grid-template-columns: auto 9ch 1fr; gap: 0 1ch; align-items: start; margin: 0.3rem 0 0 2ch; }
	.item select { padding: 0; }
	.item.out .txt { color: var(--dim); }
	.itempin { grid-column: 3; margin-top: 0.2rem; }
	.inline { display: flex; gap: 2ch; align-items: center; }
	summary { cursor: pointer; color: var(--error); margin-top: 0.75rem; }
</style>
