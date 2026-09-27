<!-- Fallback page for the feedback form when JavaScript is off. -->
<script lang="ts">
	let { form } = $props();
</script>

<section class="window narrow">
	<h1>Feedback</h1>
	{#if form?.feedbackSent}<p class="msg ok">Thank you — sent.</p><p><a href="/">Back</a></p>
	{:else}
		{#if form?.feedbackError}<p class="msg error">{form.feedbackError}</p>{/if}
		<form method="POST"><label for="m">What happened, or what would help?</label><textarea id="m" name="message" rows="6" required></textarea><button class="primary">Send</button></form>
	{/if}
</section>
