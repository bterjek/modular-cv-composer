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
</section>

<section class="window narrow">
	<h2>Your data</h2>
	<p>Download everything stored about you — account, profile, content, categories, jobs, snapshots, share-link counts and feedback — as one JSON file.</p>
	<a class="btn" data-sveltekit-reload href="/account/export">Download my data</a>
	<p class="hint">See the <a href="/privacy">privacy notice</a> for what is stored and why.</p>
</section>

<section class="window narrow">
	<h2>Delete account</h2>
	<p>Deletes your account and <b>everything</b> in it immediately: content, categories, jobs, snapshots and their share links. This cannot be undone.
		Download your data first if you want to keep it.</p>
	{#if form?.deleteError}<p class="msg error" role="alert">{form.deleteError}</p>{/if}
	<form method="POST" action="?/deleteAccount">
		<label for="del-password">Your password</label>
		<input id="del-password" name="password" type="password" required autocomplete="current-password" />
		<label for="del-confirm">Type <b>DELETE</b> to confirm</label>
		<input id="del-confirm" name="confirm" required autocomplete="off" />
		<button class="danger">Delete my account and all data</button>
	</form>
</section>

<style>
	.btn { display: inline-block; text-decoration: none; }
</style>
