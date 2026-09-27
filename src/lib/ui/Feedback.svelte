<script lang="ts">
	// Feedback dialog, opened with Shift+F1 or the Feedback button. Sends the message plus a few
	// technical facts (page, app version, window size, browser) — never any CV content.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { appVersion }: { appVersion: string } = $props();
	let open = $state(false);
	let sent = $state(false);
	let error = $state('');
	let box: HTMLTextAreaElement | undefined = $state();

	export function show() {
		open = true;
		sent = false;
		error = '';
		queueMicrotask(() => box?.focus());
	}
	const screenState = () =>
		JSON.stringify({
			route: page.url.pathname,
			appVersion,
			viewport: `${window.innerWidth}x${window.innerHeight}`,
			userAgent: navigator.userAgent.slice(0, 300),
			lastStatus: document.querySelector('.status .msg')?.textContent?.trim().slice(0, 300)
		});
	function onKey(e: KeyboardEvent) {
		if (e.key === 'F1' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
			e.preventDefault();
			e.stopPropagation();
			if (open) open = false;
			else show();
		} else if (e.key === 'Escape' && open) {
			open = false;
		}
	}
</script>

<svelte:window onkeydowncapture={onKey} />

<button type="button" class="fb-button" onclick={show} title="Send feedback (Shift+F1)">Feedback</button>

{#if open}
	<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="fb-title">
		<section class="window">
			<h2 id="fb-title">Feedback</h2>
			{#if sent}
				<p class="msg ok" role="status">Thank you — sent to the admin.</p>
				<button onclick={() => (open = false)}>Close</button>
			{:else}
				<form method="POST" action="/feedback" use:enhance={({ formData }) => {
					formData.set('state', screenState());
					formData.set('route', page.url.pathname);
					return async ({ result }) => {
						if (result.type === 'success') sent = true;
						else if (result.type === 'failure') error = String(result.data?.feedbackError ?? 'Could not send.');
						else error = 'Could not send.';
					};
				}}>
					<label for="fb-message">What happened, or what would help? <span class="hint">(page and app version are added; your CV content is not)</span></label>
					<textarea id="fb-message" name="message" rows="6" required bind:this={box}></textarea>
					{#if error}<p class="msg error" role="alert">{error}</p>{/if}
					<button class="primary">Send</button>
					<button type="button" onclick={() => (open = false)}>Cancel</button>
				</form>
			{/if}
		</section>
	</div>
{/if}

<style>
	.fb-button { position: fixed; right: 1ch; bottom: 2.2rem; z-index: 15; background: var(--warn-bg); color: #fff; box-shadow: 0.6ch 0.3em 0 #000; margin: 0; }
	.overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.6); display: grid; place-items: center; z-index: 30; }
	.overlay .window { background: var(--bg); width: min(70ch, 92vw); }
</style>
