<script lang="ts">
	import '$lib/ui/dos.css';
	import { page } from '$app/state';
	import Feedback from '$lib/ui/Feedback.svelte';
	let { data, children } = $props();
	const here = (p: string) => (page.url.pathname === p ? 'page' : undefined);
</script>

<div class="app-shell" class:plain={data.appearance==='plain'}>
<a href="#main" class="skip">Skip to content</a>

{#if data.appEnv !== 'production'}
	<div class="env" role="status">{data.appEnv.toUpperCase()} — test environment</div>
{/if}

<nav class="bar" aria-label="Main">
	<strong>MODULAR CV COMPOSER</strong>
	{#if data.user}
		<a href="/" aria-current={here('/')}>Home</a>
		<a href="/edit/cvs" aria-current={page.url.pathname.startsWith('/edit') ? 'page' : undefined}>My CVs</a>
		<a href="/assemble" aria-current={here('/assemble')}>Earlier tools</a>
		<a href="/account" aria-current={here('/account')}>Account</a>
		{#if data.user.role === 'admin'}<a href="/admin" aria-current={here('/admin')}>Admin{data.openFeedback ? ` (${data.openFeedback})` : ''}</a>{/if}
		<span class="grow"></span>
        <form method="POST" action="/appearance"><input type="hidden" name="appearance" value={data.appearance==='plain'?'dos':'plain'}/><input type="hidden" name="back" value={page.url.pathname}/><button>{data.appearance==='plain'?'DOS appearance':'Simple appearance'}</button></form>
		<span>{data.user.email}</span>
		<form method="POST" action="/logout"><button>Log out</button></form>
	{/if}
</nav>

<main id="main" class:wide={page.url.pathname.startsWith('/edit')}>{@render children()}</main>

{#if !page.url.pathname.startsWith('/edit')}<p class="legal"><a href="/privacy">Privacy</a> · version {data.appVersion}</p>{/if}

{#if data.user}<Feedback appVersion={data.appVersion} />{/if}

</div>
<style>
 .app-shell { min-height:100vh; background:var(--bg); color:var(--fg); }
 .plain { --bg:#f7f8fa;--fg:#202630;--dim:#56616f;--accent:#135c91;--hi-bg:#dcecf7;--hi-fg:#142d42;--field-bg:#fff;--error:#ffc6c6;--ok:#ccebd5;--focus:#1769a1;--warn-bg:#755000;font-family:system-ui,sans-serif;color-scheme:light; }
 :global(.plain .window){border:1px solid #bdc6d0;border-radius:6px;background:#fff;}
 :global(.plain .window>h1),:global(.plain .window>h2){position:static;background:transparent;padding:0;margin:0 0 1rem;font-size:1.2rem;}
 :global(.plain button),:global(.plain .btn){box-shadow:none;border:1px solid #aab6c4;border-radius:4px;background:#e4e9ee;color:#142d42;}
 :global(.plain button.primary){background:#dcecf7;}
 :global(.plain tr:nth-child(even) td){background:#eef2f6;}
 :global(.plain .fkeys){background:#e4e9ee;color:#202630;border-top:1px solid #bdc6d0;}
 :global(.plain .fkeys button){color:#33465c;background:transparent;border:0;}
 :global(.plain .side){border:1px solid #bdc6d0;}
	.skip { position: absolute; left: -999px; }
	.skip:focus { left: 1ch; top: 0.25rem; background: #ffff55; color: #000; padding: 0 1ch; z-index: 10; }
	nav form { display: contents; }
	main.wide { max-width: none; padding: 1rem 1.5ch 0; }
	.legal { text-align: center; margin: 0 0 1.5rem; font-size: 0.9em; }
</style>
