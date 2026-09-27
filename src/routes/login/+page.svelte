<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Log in · Modular CV Composer</title></svelte:head>

<section class="window narrow">
	<h1>Log in</h1>
	{#if data.deleted}<p class="msg ok" role="status">Your account and all its data have been deleted.</p>{/if}
	{#if form?.error}<p class="msg error" role="alert">{form.error}</p>{/if}
	<form method="POST">
		<label for="email">E-mail</label>
		<input id="email" name="email" type="email" autocomplete="username" required value={form?.email ?? ''} />
		<label for="password">Password</label>
		<input id="password" name="password" type="password" autocomplete="current-password" required />
		<button class="primary">Log in</button>
	</form>
	<p class="hint">Invite-only while in test mode. Have an invite code? <a href="/signup">Sign up</a>.
		Got a reset code from the admin? <a href="/reset">Reset your password</a>.</p>
</section>
