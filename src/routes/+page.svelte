<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Home · Modular CV Composer</title></svelte:head>

<section class="window">
	<h1>Welcome</h1>
	<p>Logged in as <strong>{data.user?.name}</strong> ({data.user?.role}).</p>
	{#if data.flags.includes('editor.dos-shell')}
		<p><a href="/edit">Open the editor</a> — write your content, set up job categories and tailor CVs per job, with a live preview.</p>
	{:else}
		<p class="muted">The editor is not switched on for your account yet.</p>
	{/if}
	<p class="muted"><a href="/assemble">Assemble</a> shows how a CV is put together and why — with example content if your account is empty.</p>
	{#if data.flags.length}
		<p>Features switched on for you: {data.flags.join(', ')}</p>
	{/if}
</section>
