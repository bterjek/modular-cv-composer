<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Account · Modular CV Composer</title></svelte:head>

<section class="window narrow">
	<h1>Change password</h1>
	{#if form?.done}<p class="msg ok" role="status">Password changed. Other devices were logged out.</p>{/if}
	{#if form?.error}<p class="msg error" role="alert">{form.error}</p>{/if}
	<form method="POST" action="?/password">
		<label for="current">Current password</label>
		<input id="current" name="current" type="password" required autocomplete="current-password" />
		<label for="password">New password <span class="hint">(at least {data.minPassword} characters)</span></label>
		<input id="password" name="password" type="password" required minlength={data.minPassword} autocomplete="new-password" />
		<label for="confirm">Repeat new password</label>
		<input id="confirm" name="confirm" type="password" required autocomplete="new-password" />
		<button class="primary">Change password</button>
	</form>
	<p class="hint">Data export and account deletion arrive in build step 6.</p>
</section>
