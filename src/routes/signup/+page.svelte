<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Sign up · Modular CV Composer</title></svelte:head>

<section class="window narrow">
	<h1>Sign up with an invite code</h1>
	{#if form?.error}<p class="msg error" role="alert">{form.error}</p>{/if}
	<form method="POST">
		<label for="code">Invite code</label>
		<input id="code" name="code" required autocomplete="off" spellcheck="false" value={form?.code ?? data.code}
			aria-invalid={form?.field === 'code'} />
		<label for="name">Name</label>
		<input id="name" name="name" required autocomplete="name" value={form?.name ?? ''} aria-invalid={form?.field === 'name'} />
		<label for="email">E-mail</label>
		<input id="email" name="email" type="email" required autocomplete="email" value={form?.email ?? ''}
			aria-invalid={form?.field === 'email'} />
		<label for="password">Password <span class="hint">(at least {data.minPassword} characters; a short sentence works well)</span></label>
		<input id="password" name="password" type="password" required minlength={data.minPassword} autocomplete="new-password"
			aria-invalid={form?.field === 'password'} />
		<label for="confirm">Repeat password</label>
		<input id="confirm" name="confirm" type="password" required autocomplete="new-password" aria-invalid={form?.field === 'confirm'} />
		<button class="primary">Create account</button>
	</form>
	<p class="hint">Already have an account? <a href="/login">Log in</a>.</p>
</section>
