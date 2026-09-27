<script lang="ts">
	import { enhance } from '$app/forms';
	import { keep } from '$lib/ui/enhance';
	import Status from '$lib/ui/Status.svelte';
	let { data, form } = $props();
	const p = $derived(data.profile);
	const links = $derived([0, 1, 2, 3, 4].map((i) => p?.links[i] ?? { label: '', url: '' }));
</script>

<svelte:head><title>Profile · Editor</title></svelte:head>

<Status {form} />

<section class="window">
	<h1>Profile</h1>
	<p class="hint">Shown at the top of every CV. The headline under your name is under Content → Headline, so it can change per job.</p>
	<form method="POST" use:enhance={keep} data-primary>
		<div class="row">
			<div><label for="fullName">Full name *</label><input id="fullName" name="fullName" required autocomplete="name" value={p?.fullName ?? data.account.name} /></div>
			<div><label for="email">E-mail on the CV *</label><input id="email" name="email" type="email" required value={p?.email ?? data.account.email} /></div>
		</div>
		<div class="row">
			<div><label for="phone">Phone</label><input id="phone" name="phone" type="tel" autocomplete="tel" value={p?.phone ?? ''} /></div>
			<div><label for="location">Location</label><input id="location" name="location" placeholder="City, Country" value={p?.location ?? ''} /></div>
		</div>
		<fieldset>
			<legend>Links <span class="hint">(LinkedIn, portfolio… https only)</span></legend>
			{#each links as l, i}
				<div class="row">
					<div><label for="ll{i}">Label</label><input id="ll{i}" name="linkLabel{i}" value={l.label} /></div>
					<div class="wide"><label for="lu{i}">Link</label><input id="lu{i}" name="linkUrl{i}" type="url" placeholder="https://" value={l.url} /></div>
				</div>
			{/each}
		</fieldset>
		<button class="primary">Save <span class="hint">(F2)</span></button>
	</form>
</section>

<style>
	fieldset { border: 1px solid var(--dim); margin: 1rem 0 0; padding: 0.25rem 1.5ch 0.75rem; }
	legend { padding: 0 1ch; }
	.wide { flex: 3 1 24ch; }
</style>
