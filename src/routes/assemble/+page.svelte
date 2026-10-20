<script lang="ts">
	let { data, form } = $props();
	const q = $derived(
		data.selected.targetId
			? `target=${encodeURIComponent(data.selected.targetId)}`
			: `category=${encodeURIComponent(data.selected.categoryId ?? '')}`
	);
	const shown = $derived(data.cv ? data.cv.trace.filter((t) => t.kind !== 'variant' || t.outcome === 'chosen') : []);
</script>

<svelte:head><title>Assemble · Modular CV Composer</title></svelte:head>

<section class="window">
	<h1>Legacy CV assembly</h1>
 <p>For the new workflow, open <a href="/edit/cvs">Saved CVs</a> or <a href="/edit/imports">import an existing CV</a>. You can copy an assembled CV into Saved CVs below.</p>
	{#if form?.error}<p class="msg error" role="alert">{form.error}</p>{/if}
	{#if data.empty}
		<p>Your account has no content yet. You can import your own CV or load a fictional example
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
		<h2>Preview</h2>
  <form method="POST" action="?/saveCopy">
   <input type="hidden" name="target" value={data.selected.targetId ?? ''} />
   <input type="hidden" name="category" value={data.selected.categoryId ?? ''} />
   <button class="primary">Copy to Saved CVs</button>
   <p class="hint">Creates an independent copy using the Classical A4 template. Existing categories, jobs and snapshots stay available.</p>
  </form>
		<p class="row">
			<a class="btn" data-sveltekit-reload href="/cv/render?{q}&format=html">Download HTML</a>
			{#if data.pdfEnabled}
				<a class="btn primary" data-sveltekit-reload href="/cv/render?{q}&format=pdf">Download PDF</a>
			{:else}
				<span class="hint">PDF export is behind the <code>render.pdf</code> feature flag while testing.</span>
			{/if}
		</p>
		<!-- allow-same-origin without allow-scripts: fonts load from this server, nothing can run -->
		<iframe class="preview" sandbox="allow-same-origin" title="CV preview" src="/cv/render?{q}&format=preview"></iframe>
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
	.preview { width: 100%; height: 1180px; border: 0; background: #e9ecf0; display: block; }
	.btn { display: inline-block; text-decoration: none; flex: 0 0 auto; }
	.btn.primary { background: var(--hi-bg); }
	.row { align-items: center; }
	tr.dropped td { color: var(--dim); }
</style>
