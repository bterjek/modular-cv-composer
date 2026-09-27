<script lang="ts">
	// One status line per editor page: the latest save or error, announced to screen readers.
	let { form }: { form: { error?: string; saved?: string } | null | undefined } = $props();
</script>

<div class="status" aria-live="polite">
	{#if form?.error}<p class="msg error" role="alert">{form.error}</p>
	{:else if form?.saved}<p class="msg ok">{form.saved}</p>{/if}
</div>

<style>
	.status { position: sticky; top: 0; z-index: 5; }
	.status p { margin: 0 0 0.75rem; }
</style>
