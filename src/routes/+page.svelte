<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Home · Modular CV Composer</title></svelte:head>

<section class="window">
	<h1>Welcome, {data.user?.name}</h1>
	{#if data.flags.includes('editor.dos-shell')}
		<p>Write your career facts once, then let each job category pick the right ones. Getting started:</p>
		<ol>
			<li><a href="/edit/profile">Profile</a> — name and contact details.</li>
			<li><a href="/edit/content">Content</a> — roles with bullets, headline and summary wordings, certificates, skills. Tag things (e.g. <i>governance</i>, <i>delivery</i>).</li>
			<li><a href="/edit/categories">Job categories</a> — which sections, which tags, how long. Watch the preview on the right.</li>
			<li><a href="/edit/jobs">Jobs</a> — one per application: adjust, then <b>Freeze this version</b> when you send it.</li>
		</ol>
		<p class="hint">Want to see it working first? <a href="/assemble">Assemble</a> can load a fictional example into an empty account.
			In the editor, F1 shows the keys. Anything odd or missing: <b>Shift+F1</b> sends feedback from any page.</p>
	{:else}
		<p class="muted">The editor is not switched on for your account yet.</p>
		<p class="muted"><a href="/assemble">Assemble</a> shows how a CV is put together and why — with example content if your account is empty.</p>
	{/if}
</section>

<style>
	ol { padding-left: 3ch; }
	li { margin: 0.3rem 0; }
</style>
