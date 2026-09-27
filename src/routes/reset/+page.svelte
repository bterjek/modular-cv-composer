<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Reset password · Modular CV Composer</title></svelte:head>

<section class="window narrow">
	<h1>Reset password</h1>
	{#if form?.done}
		<p class="msg ok" role="status">Password changed. You were logged out everywhere.</p>
		<p><a href="/login">Log in</a> with the new password.</p>
	{:else}
		<p class="hint">Use the one-time reset code the admin gave you. It is valid for 24 hours.</p>
		{#if form?.error}<p class="msg error" role="alert">{form.error}</p>{/if}
		<form method="POST">
			<label for="email">E-mail</label>
			<input id="email" name="email" type="email" required autocomplete="username" value={form?.email ?? ''} />
			<label for="code">Reset code</label>
			<input id="code" name="code" required autocomplete="off" spellcheck="false" />
			<label for="password">New password <span class="hint">(at least {data.minPassword} characters)</span></label>
			<input id="password" name="password" type="password" required minlength={data.minPassword} autocomplete="new-password" />
			<label for="confirm">Repeat new password</label>
			<input id="confirm" name="confirm" type="password" required autocomplete="new-password" />
			<button class="primary">Set new password</button>
		</form>
	{/if}
</section>
