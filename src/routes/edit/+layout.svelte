<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { handleHotkey, saveCurrentForm, type KeyAction } from '$lib/ui/keys';
	import { onMount } from 'svelte';
	import { arrowNav } from '$lib/ui/arrowNav';
	import { MODULES } from '$lib/domain/modules';
	import { MODULE_LABELS } from '$lib/editor/fields';

	let { data, children } = $props();
	let help = $state(false);
	let helpEl: HTMLElement | undefined = $state();

	const actions: KeyAction[] = [
		{ key: 'F1', label: 'Help', run: () => (help = !help) },
		{ key: 'F2', label: 'Save', run: saveCurrentForm },
		{ key: 'Ctrl+S', label: 'Save', run: saveCurrentForm },
		{ key: 'F3', label: 'Content', run: () => goto('/edit/content') },
		{ key: 'F4', label: 'Categories', run: () => goto('/edit/categories') },
		{ key: 'F8', label: 'Jobs', run: () => goto('/edit/jobs') },
		{ key: 'F9', label: 'Profile', run: () => goto('/edit/profile') },
		{ key: 'Escape', label: 'Close', run: () => (help = false) }
	];
	const bar = actions.filter((a) => !['Ctrl+S', 'Escape'].includes(a.key));

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && !help) return; // let Escape reach inputs/dialogs when help is closed
		handleHotkey(e, actions);
	}
	$effect(() => {
		if (help) helpEl?.focus();
	});

	const here = (p: string) => (page.url.pathname === p || page.url.pathname.startsWith(p + '/') ? 'page' : undefined);
	const previewSrc = $derived(
		data.preview ? `/cv/render?${data.preview.kind}=${encodeURIComponent(data.preview.id)}&format=preview&click=1&rev=${encodeURIComponent(data.revision)}` : null
	);
	const selValue = $derived(data.preview ? `${data.preview.kind}:${data.preview.id}` : '');
	let previewForm: HTMLFormElement | undefined = $state();
	let frame: HTMLIFrameElement | undefined = $state();

	// Click-to-edit: the preview posts which piece was clicked; only messages from our own iframe count.
	onMount(() => {
		const onMessage = (e: MessageEvent) => {
			if (!frame || e.source !== frame.contentWindow || e.data?.type !== 'cv-click') return;
			const m = /^(entry|item|profile)(?::([\w-]+))?(?::([\w-]+))?$/.exec(String(e.data.src ?? ''));
			if (!m) return;
			if (m[1] === 'profile') goto('/edit/profile');
			else if (m[1] === 'entry') goto(`/edit/content/entry/${m[2]}#top`);
			else goto(`/edit/content/entry/${m[2]}#item-${m[3]}`);
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});
</script>

<svelte:window onkeydown={onKey} />

<div class="editor">
	<nav class="side" aria-label="Editor" use:arrowNav>
		<p class="menu-title">CONTENT</p>
		<a data-nav href="/edit/profile" aria-current={here('/edit/profile')}>Profile</a>
		{#each MODULES as m}
			<a data-nav href="/edit/content/{m}" aria-current={here(`/edit/content/${m}`)}>
				{MODULE_LABELS[m]}<span class="count">{data.counts[m] || ''}</span>
			</a>
		{/each}
		<p class="menu-title">ASSEMBLY</p>
		<a data-nav href="/edit/categories" aria-current={here('/edit/categories')}>Job categories</a>
		<a data-nav href="/edit/jobs" aria-current={here('/edit/jobs')}>Jobs</a>
		<a data-nav href="/edit/terms" aria-current={here('/edit/terms')}>Terms &amp; gaps</a>
		<a data-nav href="/edit/snapshots" aria-current={here('/edit/snapshots')}>Snapshots</a>
	</nav>

	<div class="work">{@render children()}</div>

	<aside class="preview" aria-label="Live preview">
		<form method="GET" action="/edit/preview" class="pick" bind:this={previewForm} data-sveltekit-reload>
			<input type="hidden" name="back" value={page.url.pathname + page.url.search} />
			<label for="preview-sel">Preview</label>
			<select id="preview-sel" name="sel" value={selValue} onchange={() => previewForm?.requestSubmit()}>
				{#if !data.preview}<option value="">— create a category first —</option>{/if}
				{#if data.targets.length}<optgroup label="Jobs">{#each data.targets as t}<option value="target:{t.id}">{t.name}</option>{/each}</optgroup>{/if}
				{#if data.categories.length}<optgroup label="Categories">{#each data.categories as c}<option value="category:{c.id}">{c.name}</option>{/each}</optgroup>{/if}
			</select>
			<noscript><button class="small">Show</button></noscript>
			{#if data.preview}<a class="why" href="/assemble?{data.preview.kind}={data.preview.id}">Why?</a>{/if}
		</form>
		{#if previewSrc}
			<!-- allow-scripts WITHOUT allow-same-origin: only the hashed click script runs, and it can do nothing but post
			     "this was clicked". The rev parameter reloads the preview after every change. -->
			<iframe sandbox="allow-scripts" title="Live CV preview — click any part to edit it" src={previewSrc} bind:this={frame}></iframe>
			<p class="hint pad small">Click any part of the CV to edit it.</p>
		{:else}
			<p class="muted pad">The preview appears once you have a job category. Add content first, then create a category under <a href="/edit/categories">Job categories</a>.</p>
		{/if}
	</aside>
</div>

<footer class="fkeys" aria-label="Function keys">
	{#each bar as a}
		<button type="button" onclick={a.run}><b>{a.key}</b> {a.label}</button>
	{/each}
</footer>

{#if help}
	<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex="-1" bind:this={helpEl}>
		<section class="window">
			<h2 id="help-title">Help — keys</h2>
			<table>
				<tbody>
					<tr><td><b>F1</b></td><td>Show / hide this help</td></tr>
					<tr><td><b>F2</b> or <b>Ctrl+S</b></td><td>Save the form you are in</td></tr>
					<tr><td><b>F3</b> · <b>F4</b> · <b>F8</b> · <b>F9</b></td><td>Content · Job categories · Jobs · Profile</td></tr>
					<tr><td><b>↑ ↓ Home End</b></td><td>Move through menus and lists</td></tr>
					<tr><td><b>Tab</b> / <b>Shift+Tab</b></td><td>Next / previous field</td></tr>
					<tr><td><b>Enter</b></td><td>Open the highlighted item</td></tr>
					<tr><td><b>Shift+F1</b></td><td>Send feedback (works on every page)</td></tr>
					<tr><td><b>Esc</b></td><td>Close this help</td></tr>
				</tbody>
			</table>
			<p class="hint">How it fits together: write facts once under Content, give their wordings tags,
				then a Job category decides which sections, tags and lengths to use. A Job adds changes for one application.
				The preview on the right updates after every save.</p>
			<p class="hint">Version {page.data.appVersion}</p>
			<button onclick={() => (help = false)}>Close</button>
		</section>
	</div>
{/if}

<style>
	.editor {
		display: grid;
		grid-template-columns: 26ch minmax(0, 1fr) minmax(0, 1fr);
		gap: 0 2ch;
		align-items: start;
		padding-bottom: 2.5rem;
	}
	.side { display: flex; flex-direction: column; border: 3px double var(--fg); padding: 0.5rem 0; position: sticky; top: 0.5rem; }
	.side a { color: var(--fg); text-decoration: none; padding: 0 1ch; display: flex; justify-content: space-between; }
	.side a:focus-visible, .side a:hover { background: var(--hi-bg); color: var(--hi-fg); outline: none; }
	.side a[aria-current='page'] { background: var(--fg); color: var(--bg); }
	.count { color: inherit; opacity: 0.7; }
	.menu-title { margin: 0.5rem 1ch 0.25rem; color: var(--accent); }
	.menu-title:first-child { margin-top: 0; }
	.preview { position: sticky; top: 0.5rem; border: 3px double var(--fg); background: #e9ecf0; }
	.pick { display: flex; gap: 1ch; align-items: center; background: var(--bg); padding: 0.25rem 1ch; }
	.pick label { margin: 0; color: var(--fg); }
	.pick select { flex: 1; }
	.why { white-space: nowrap; }
	.preview iframe { width: 100%; height: calc(100vh - 7rem); border: 0; display: block; }
	.pad { padding: 1rem 2ch; background: var(--bg); margin: 0; }
	.small { padding: 0.25rem 1ch; font-size: 0.85em; }
	.fkeys button { background: none; color: var(--dim); border: 0; box-shadow: none; margin: 0; padding: 0; font: inherit; cursor: pointer; }
	.fkeys button:hover, .fkeys button:focus-visible { color: var(--fg); }
	.overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.6); display: grid; place-items: center; z-index: 20; }
	.overlay .window { background: var(--bg); max-width: 72ch; }
	@media (max-width: 1200px) {
		.editor { grid-template-columns: 24ch minmax(0, 1fr); }
		.preview { grid-column: 1 / -1; position: static; margin-top: 1.5rem; }
		.preview iframe { height: 1180px; }
	}
	@media (max-width: 760px) {
		.editor { grid-template-columns: 1fr; }
		.side { position: static; margin-bottom: 1rem; }
	}
</style>
