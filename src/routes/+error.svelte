<script lang="ts">
	import { page } from '$app/state';
	const titles: Record<number, string> = { 403: 'Not available to you', 404: 'Not found', 429: 'Slow down' };
</script>

<svelte:head><title>{page.status} · Modular CV Composer</title></svelte:head>

<section class="window narrow">
	<h1>{titles[page.status] ?? 'Something went wrong'}</h1>
	<p class="code">ERROR {page.status}</p>
	<p>{page.status >= 500 ? 'The app hit a problem. Please try again; if it keeps happening, send feedback (Shift+F1) and say what you were doing.' : page.error?.message}</p>
	<p><a href="/">Home</a></p>
</section>
