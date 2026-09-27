<script lang="ts">
	let { data, form } = $props();
	const fmtData = (d: Record<string, unknown>) => {
		const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
		const dates = (a: string, b: unknown) => (a ? `${a} – ${b === null ? 'present' : (b ?? '')}` : '');
		if ('organization' in d) return `${s('title')}, ${s('organization')}  ${dates(s('start'), d.end)}`;
		if ('institution' in d) return `${s('degree')} ${s('field')}, ${s('institution')}  ${dates(s('start'), d.end)}`;
		if ('issuer' in d) return `${s('name')} — ${s('issuer')} (${s('kind')}${s('issued') ? ', ' + s('issued') : ''})`;
		if ('language' in d) return `${s('language')} — ${s('level')}`;
		if ('group' in d) return s('group');
		return '';
	};
	const shown = $derived(data.cv ? data.cv.trace.filter((t) => t.kind !== 'variant' || t.outcome === 'chosen') : []);
</script>

<svelte:head><title>Assemble · Modular CV Composer</title></svelte:head>

<section class="window">
	<h1>Assemble a CV</h1>
	{#if form?.error}<p class="msg error" role="alert">{form.error}</p>{/if}
	{#if data.empty}
		<p>Your account has no content yet. The editor arrives in step 5; until then you can load a fictional example
			(Alex Example: 3 roles, credentials, skills, two job categories, one tailored job target) to see how assembly works.</p>
		<form method="POST" action="?/loadDemo"><button class="primary">Load example content</button></form>
	{:else}
		<form method="GET" class="row">
			<div><label for="category">Job category</label>
				<select id="category" name="category">
					<option value="">—</option>
					{#each data.categories as c}<option value={c.id} selected={c.id === data.selected.categoryId}>{c.name}</option>{/each}
				</select></div>
			<div class="auto"><button>Assemble</button></div>
		</form>
		<form method="GET" class="row">
			<div><label for="target">…or a specific job</label>
				<select id="target" name="target">
					<option value="">—</option>
					{#each data.targets as t}<option value={t.id} selected={t.id === data.selected.targetId}>{t.name}</option>{/each}
				</select></div>
			<div class="auto"><button>Assemble</button></div>
		</form>
	{/if}
</section>

{#if data.cv}
	{#if data.cv.warnings.length}
		<section class="window"><h2>Warnings</h2>{#each data.cv.warnings as w}<p class="msg error">{w}</p>{/each}</section>
	{/if}

	<section class="window">
		<h2>Result (plain text — the designed version arrives in step 4)</h2>
		{#if data.cv.profile}<p><strong>{data.cv.profile.fullName}</strong> · {data.cv.profile.email} · {data.cv.profile.location ?? ''}</p>{/if}
		{#each data.cv.sections as s}
			{#if s.title}<h3 class="sec">{s.title.toUpperCase()}</h3>{/if}
			{#each s.entries as e}
				{@const head = fmtData(e.data)}
				{#if head}<p class="head">{head}</p>{/if}
				{#if e.text}<p>{e.text}</p>{/if}
				{#if e.items.length}<ul>{#each e.items as i}<li>{i.text}</li>{/each}</ul>{/if}
			{/each}
		{/each}
	</section>

	<section class="window">
		<h2>Why — every decision the engine made</h2>
		<div class="scroll">
			<table>
				<thead><tr><th>What</th><th>Which</th><th>Outcome</th><th>Reason</th></tr></thead>
				<tbody>
					{#each shown as t}
						<tr class={t.outcome}>
							<td>{t.kind}</td><td>{data.labels[t.id] ?? t.id}</td><td>{t.outcome}</td><td>{t.reason}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<style>
	.sec { color: var(--accent); font-size: 1em; margin: 1.25rem 0 0.25rem; border-bottom: 1px solid var(--dim); }
	.head { color: var(--fg); font-weight: bold; margin: 0.5rem 0 0; }
	ul { margin: 0.25rem 0; padding-left: 3ch; }
	tr.dropped td { color: var(--dim); }
</style>
