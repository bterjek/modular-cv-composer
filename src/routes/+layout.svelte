<script lang="ts">
	import '$lib/ui/dos.css';
	import { page } from '$app/state';
	let { data, children } = $props();
	const here = (p: string) => (page.url.pathname === p ? 'page' : undefined);
</script>

<a href="#main" class="skip">Skip to content</a>

{#if data.appEnv !== 'production'}
	<div class="env" role="status">{data.appEnv.toUpperCase()} — test environment</div>
{/if}

<nav class="bar" aria-label="Main">
	<strong>MODULAR CV COMPOSER</strong>
	{#if data.user}
		<a href="/" aria-current={here('/')}>Home</a>
		{#if data.flags.includes('editor.dos-shell')}<a href="/edit" aria-current={page.url.pathname.startsWith('/edit') ? 'page' : undefined}>Editor</a>{/if}
		<a href="/assemble" aria-current={here('/assemble')}>Assemble</a>
		<a href="/account" aria-current={here('/account')}>Account</a>
		{#if data.user.role === 'admin'}<a href="/admin" aria-current={here('/admin')}>Admin</a>{/if}
		<span class="grow"></span>
		<span>{data.user.email}</span>
		<form method="POST" action="/logout"><button>Log out</button></form>
	{/if}
</nav>

<main id="main" class:wide={page.url.pathname.startsWith('/edit')}>{@render children()}</main>

<style>
	.skip { position: absolute; left: -999px; }
	.skip:focus { left: 1ch; top: 0.25rem; background: #ffff55; color: #000; padding: 0 1ch; z-index: 10; }
	nav form { display: contents; }
	main.wide { max-width: none; padding: 1rem 1.5ch 0; }
</style>
