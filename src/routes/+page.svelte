<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Home · Modular CV Composer</title></svelte:head>

<section class="window">
	<h1>Welcome</h1>
	<p>Logged in as <strong>{data.user?.name}</strong> ({data.user?.role}).</p>
	<p class="muted">The content editor arrives in build step 5. Meanwhile, <a href="/assemble">Assemble</a> shows how CVs are put together — with example content if your account is empty.</p>
	{#if data.flags.length}
		<p>Features switched on for you: {data.flags.join(', ')}</p>
	{/if}
</section>
